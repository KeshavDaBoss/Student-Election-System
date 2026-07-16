import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { loginAttempts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";
    const identifier = ip;

    const existingAttempts = await db
      .select()
      .from(loginAttempts)
      .where(eq(loginAttempts.identifier, identifier))
      .limit(1);

    const attempt = existingAttempts[0];

    if (attempt && attempt.lockedUntil && new Date(attempt.lockedUntil) > new Date()) {
      return NextResponse.json({
        isLocked: true,
        lockedUntil: new Date(attempt.lockedUntil).getTime(),
        attemptsLeft: 0,
      });
    }

    // Otherwise, either no record, or not locked, or lockout expired
    let attemptsLeft = 5;
    if (attempt) {
      if (attempt.lockedUntil && new Date(attempt.lockedUntil) <= new Date()) {
        // lockout expired, they get 5 attempts
        attemptsLeft = 5;
      } else {
        // check window
        const timeSinceWindowStart = Date.now() - new Date(attempt.lastAttemptAt).getTime();
        if (timeSinceWindowStart > 5 * 60 * 1000) {
          attemptsLeft = 5;
        } else {
          attemptsLeft = Math.max(0, 5 - (attempt.attemptCount || 0));
        }
      }
    }

    return NextResponse.json({
      isLocked: false,
      lockedUntil: null,
      attemptsLeft,
    });
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json({ error: "Failed to check status" }, { status: 500 });
  }
}
