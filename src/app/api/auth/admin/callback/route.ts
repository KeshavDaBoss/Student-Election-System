import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { signToken } from "@/lib/auth";
import { eq } from "drizzle-orm";

async function verifyGoogleToken(idToken: string): Promise<{ email: string } | null> {
  try {
    const { OAuth2Client } = await import("google-auth-library");
    const client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.email) return null;

    return { email: payload.email };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL("/admin/login?error=missing_code", request.url)
    );
  }

  try {
    const vercelUrl = process.env.VERCEL_URL;
    const redirectUri = vercelUrl
      ? `https://${vercelUrl}/api/auth/admin/callback`
      : process.env.OAUTH_REDIRECT_URI || "";

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      return NextResponse.redirect(
        new URL("/admin/login?error=oauth_failed", request.url)
      );
    }

    const tokens = await tokenResponse.json();
    const idToken = tokens.id_token;

    if (!idToken) {
      return NextResponse.redirect(
        new URL("/admin/login?error=no_id_token", request.url)
      );
    }

    const googleUser = await verifyGoogleToken(idToken);
    if (!googleUser) {
      return NextResponse.redirect(
        new URL("/admin/login?error=invalid_google_token", request.url)
      );
    }

    const email = googleUser.email.toLowerCase().trim();

    const existingAdmins = await db
      .select()
      .from(admins)
      .where(eq(admins.email, email))
      .limit(1);

    const admin = existingAdmins[0];

    if (!admin) {
      return NextResponse.redirect(
        new URL("/admin/login?error=not_authorized", request.url)
      );
    }

    const token = await signToken({
      type: "admin",
      email: admin.email,
      adminId: admin.id,
      role: admin.role,
    });

    const response = NextResponse.redirect(new URL("/admin", request.url));
    response.cookies.set("ses_admin_token", token, {
      path: "/",
      maxAge: 60 * 60 * 8,
      httpOnly: true,
      sameSite: "strict",
    });

    return response;
  } catch {
    return NextResponse.redirect(
      new URL("/admin/login?error=server_error", request.url)
    );
  }
}
