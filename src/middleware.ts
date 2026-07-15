import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "./lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /vote routes
  if (pathname.startsWith("/vote")) {
    const token = request.cookies.get("ses_token")?.value;
    
    if (!token) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    const payload = await verifyToken(token);
    if (!payload || payload.type !== "voter") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    
    // If they already voted, keep them out of /vote unless it's /vote/success
    if (payload.hasVoted && pathname === "/vote") {
      return NextResponse.redirect(new URL("/vote/success", request.url));
    }
  }

  // Protect /admin routes (except login)
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const token = request.cookies.get("ses_admin_token")?.value;
    
    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    const payload = await verifyToken(token);
    if (!payload || payload.type !== "admin") {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/vote/:path*",
    "/admin/:path*",
  ],
};
