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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const userAgent = request.headers.get("user-agent")?.toLowerCase() || "";

  // 1. Bot cloaking — rewrite bots to meta-rich preview page
  const isBot = BOT_AGENTS.some((bot) => userAgent.includes(bot));
  if (isBot && (pathname === "/" || pathname === "/live")) {
    return NextResponse.rewrite(new URL("/bot-cloak", request.url));
  }

  // 2. Admin route protection — cookie-based auth check
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
