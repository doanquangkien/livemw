// scripts/deploy.js — Coolify API deploy script
//
// Usage: node scripts/deploy.js
// Reads .env for COOLIFY_URL + COOLIFY_API_TOKEN

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

  console.log(`  ${method} ${endpoint}`);
  const res = await fetch(url, fetchOpts);
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

async function main() {
  console.log("=== Phase 1: Coolify Deploy ===\n");

  // Step 1: Find "LiveMecwish" project
  console.log("[1/3] Finding project...");
  const projects = await apiRequest("/api/v1/projects");
  let project = projects.find((p) => p.name === "LiveMecwish");

  if (!project) {
    console.log('  Creating new project "LiveMecwish"...');
    project = await apiRequest("/api/v1/projects", {
      method: "POST",
      body: { name: "LiveMecwish", description: "Livestream webapp - RTMP to HLS" },
    });
    console.log(`  Created: ${project.uuid}`);
  } else {
    console.log(`  Found: ${project.uuid}`);
  }

  // Step 2: Find existing nginx-rtmp application in production environment
  console.log("\n[2/3] Finding application...");
  const projDetail = await apiRequest(`/api/v1/projects/${project.uuid}`);
  const envUuid = projDetail.environments[0].uuid;
  console.log(`  Environment: ${envUuid}`);

  const apps = await apiRequest(`/api/v1/applications?project_uuid=${project.uuid}`);
  let app;
  if (Array.isArray(apps)) {
    app = apps.find((a) => a.name === "nginx-rtmp");
  }

  if (app) {
    console.log(`  Found existing app: ${app.uuid}`);
  } else {
    console.log("  No existing app — creating new one...");
    const servers = await apiRequest("/api/v1/servers");
    const serverUuid = servers[0].uuid;
    console.log(`  Server: ${serverUuid}`);

    app = await apiRequest("/api/v1/applications/private-github-app", {
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
        ports_exposes: "1935,8088",
        name: "nginx-rtmp",
        description: "Phase 1 - Nginx-RTMP + FFmpeg HLS (tiangolo/nginx-rtmp)",
        instant_deploy: true,
      },
    });
    console.log(`  Created: ${app.uuid}`);
  }

  // Step 3: Trigger deployment
  console.log("\n[3/3] Triggering deployment (force rebuild)...");
  const deploy = await apiRequest("/api/v1/deploy", {
    method: "POST",
    body: { uuid: app.uuid, force_rebuild: true },
  });
  console.log(`  Result: ${JSON.stringify(deploy)}`);

  console.log(`\nDeploy queued! App UUID: ${app.uuid}`);
  console.log("Check: GET /api/v1/applications/" + app.uuid);
}

main().catch((err) => {
  console.error("Deploy failed:", err.message);
  process.exit(1);
});
