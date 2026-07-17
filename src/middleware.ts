import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "./lib/auth";

const isVoterRoute = createRouteMatcher(["/vote/:path*"]);
const isAdminRoute = createRouteMatcher(["/admin/:path*"]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { pathname } = req.nextUrl;

  // Protect /vote routes with custom JWT
  if (isVoterRoute(req)) {
    if (pathname === "/vote/success") {
      return NextResponse.next();
    }

    const token = req.cookies.get("ses_token")?.value;

    if (!token) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    const payload = await verifyToken(token);
    if (!payload || payload.type !== "voter") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    if (payload.hasVoted && pathname === "/vote") {
      return NextResponse.redirect(new URL("/vote/success", req.url));
    }
  }

  // Protect /admin routes with Clerk (except login, which redirects to sign-in)
  if (isAdminRoute(req)) {
    if (pathname === "/admin/login") {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/vote/:path*",
    "/admin/:path*",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
