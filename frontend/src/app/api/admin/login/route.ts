import { hashAdminToken } from "@/lib/admin-auth";

export async function POST(request: Request) {
  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { password } = body;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error("[admin/login] ADMIN_PASSWORD not configured in environment");
    return Response.json({ error: "Server misconfigured" }, { status: 500 });
  }

  if (!password || password !== adminPassword) {
    return Response.json({ error: "Incorrect password" }, { status: 401 });
  }

  const token = hashAdminToken(password);

  const response = Response.json({ ok: true });
  response.headers.set(
    "Set-Cookie",
    `admin_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
  );
  return response;
}
