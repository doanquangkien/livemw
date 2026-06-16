import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login" || pathname.startsWith("/api/admin/")) {
    return NextResponse.next();
  }

  const token = request.cookies.get("admin_token")?.value;

  // Token must be a 64-char hex string (SHA256)
  if (!token || token.length !== 64) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // Full verification is done by API routes (Node.js runtime)
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
