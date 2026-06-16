import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BOT_AGENTS = [
  "facebookexternalhit",
  "twitterbot",
  "googlebot",
  "bingbot",
  "skypeuripreview",
  "telegrambot",
  "discordbot",
  "vkshare",
  "slackbot",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const userAgent = request.headers.get("user-agent")?.toLowerCase() || "";

  // 1. Logic bọc link (Cloaking) cho Bot
  const isBot = BOT_AGENTS.some((bot) => userAgent.includes(bot));
  if (isBot && (pathname === "/" || pathname === "/live")) {
    return NextResponse.rewrite(new URL("/bot-cloak", request.url));
  }

  // 2. Logic bảo vệ trang Admin
  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login" || pathname.startsWith("/api/admin/")) {
      return NextResponse.next();
    }

    const token = request.cookies.get("admin_token")?.value;
    if (!token || token.length !== 64) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/", "/live"],
};
