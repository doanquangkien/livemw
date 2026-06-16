import crypto from "crypto";

export function hashAdminToken(password: string): string {
  return crypto.createHash("sha256").update(password + ":admin-salt").digest("hex");
}

export function verifyAdminCookie(cookieHeader: string | null): boolean {
  if (!cookieHeader) return false;
  const match = cookieHeader.match(/admin_token=([^;]+)/);
  if (!match) return false;
  const token = match[1];
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  return token === hashAdminToken(adminPassword);
}
