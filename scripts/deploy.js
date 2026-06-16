// scripts/deploy.js — Phase 0: Coolify API deploy script
//
// Usage: node scripts/deploy.js
// Reads .env for COOLIFY_URL + COOLIFY_API_TOKEN
//
// Flow:
// 1. Ensure "LiveMecwish" project exists
// 2. Create/update Docker Compose application linked to GitHub
// 3. Trigger deployment

const fs = require("fs");
const path = require("path");

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  const content = fs.readFileSync(envPath, "utf-8");
  const vars = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    vars[key] = val;
  }
  return vars;
}

async function apiRequest(endpoint, options = {}) {
  const env = loadEnv();
  const base = env.COOLIFY_URL || "http://34.126.84.171:8000";
  const token = env.COOLIFY_API_TOKEN;

  const url = `${base}${endpoint}`;
  const method = options.method || "GET";
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const fetchOpts = { method, headers };
  if (options.body) {
    fetchOpts.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, fetchOpts);
  return res.json();
}

async function main() {
  console.log("=== Phase 0: Coolify Deploy ===\n");

  // Step 1: Find or create "LiveMecwish" project
  console.log("[1/4] Checking projects...");
  const projects = await apiRequest("/api/v1/projects");
  let project = projects.find((p) => p.name === "LiveMecwish");

  if (!project) {
    console.log('  Creating new project "LiveMecwish"...');
    project = await apiRequest("/api/v1/projects", {
      method: "POST",
      body: {
        name: "LiveMecwish",
        description: "Livestream webapp - RTMP to HLS",
      },
    });
    console.log(`  Created: ${project.uuid}`);
  } else {
    console.log(`  Found: ${project.uuid}`);
  }

  // Step 2: Get environment UUID
  const projDetail = await apiRequest(`/api/v1/projects/${project.uuid}`);
  const envUuid = projDetail.environments[0].uuid;
  console.log(`  Environment: ${envUuid}`);

  // Step 3: Get server UUID (localhost)
  const servers = await apiRequest("/api/v1/servers");
  const serverUuid = servers[0].uuid;
  console.log(`  Server: ${serverUuid}`);

  // Step 4: Create Docker Compose application via GitHub App
  console.log("\n[2/4] Creating Docker Compose application...");

  const app = await apiRequest(
    "/api/v1/applications/private-github-app",
    {
      method: "POST",
      body: {
        project_uuid: project.uuid,
        environment_name: "production",
        server_uuid: serverUuid,
        github_app_uuid: "wpem2mjurmjktb39btiujvsv",
        git_repository: "doanquangkien/livemw",
        git_branch: "main",
        build_pack: "dockercompose",
        base_directory: "/",
        docker_compose_location: "/docker-compose.yml",
        ports_exposes: "1935,8080",
        name: "nginx-rtmp",
        description: "Phase 0 - Nginx-RTMP + FFmpeg HLS",
        instant_deploy: true,
      },
    }
  );

  const appUuid = app.uuid;
  console.log(`  Application UUID: ${appUuid}`);

  // Step 5: Trigger deployment
  console.log("\n[3/4] Triggering deployment...");
  const deploy = await apiRequest("/api/v1/deploy", {
    method: "POST",
    body: {
      uuid: appUuid,
      force_rebuild: true,
    },
  });
  console.log(`  Deployment: ${JSON.stringify(deploy)}`);

  console.log("\n[4/4] Deployment queued!");
  console.log(`  App UUID: ${appUuid}`);
  console.log(`  Check status: GET /api/v1/applications/${appUuid}`);
}

main().catch((err) => {
  console.error("Deploy failed:", err.message);
  process.exit(1);
});
