import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { signToken } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required." },
        { status: 400 }
      );
    }

    // Check if the email is in the admins table
    const adminResults = await db
      .select()
      .from(admins)
      .where(eq(admins.email, email.toLowerCase().trim()))
      .limit(1);

    const admin = adminResults[0];

    if (!admin) {
      return NextResponse.json(
        { error: "This email is not authorized for admin access." },
        { status: 403 }
      );
    }

    // Generate admin JWT
    const token = await signToken({
      type: "admin",
      email: admin.email,
      adminId: admin.id,
    });

    return NextResponse.json({ token });
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
