import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { students, loginAttempts } from "@/db/schema";
import { signToken } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { electionNumber, class: studentClass, section } = body;

    // Basic validation
    if (!electionNumber || !studentClass || !section) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 }
      );
    }

    if (!/^[0-9A-Za-z]{6}$/.test(electionNumber)) {
      return NextResponse.json(
        { error: "Invalid Election Number format." },
        { status: 400 }
      );
    }

    // Get client identifier for rate limiting
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";
    const identifier = `${ip}_${electionNumber}`;

    // Check rate limiting
    const existingAttempts = await db
      .select()
      .from(loginAttempts)
      .where(eq(loginAttempts.identifier, identifier))
      .limit(1);

    const attempt = existingAttempts[0];

    if (attempt) {
      // Check if locked
      if (attempt.lockedUntil && new Date(attempt.lockedUntil) > new Date()) {
        const lockedUntilMs = new Date(attempt.lockedUntil).getTime();
        return NextResponse.json(
          {
            error: "Too many login attempts. Please try again later.",
            lockedUntil: lockedUntilMs,
            attemptsLeft: 0,
          },
          { status: 429 }
        );
      }

      // Check if the lockout has expired → reset
      if (attempt.lockedUntil && new Date(attempt.lockedUntil) <= new Date()) {
        await db
          .update(loginAttempts)
          .set({
            attemptCount: 0,
            lockedUntil: null,
            lastAttemptAt: new Date(),
          })
          .where(eq(loginAttempts.id, attempt.id));
      }

      // Check if window has expired (5 min since first attempt)
      const timeSinceFirst =
        Date.now() - new Date(attempt.lastAttemptAt).getTime();
      if (timeSinceFirst > LOCKOUT_DURATION_MS) {
        // Reset counter
        await db
          .update(loginAttempts)
          .set({
            attemptCount: 0,
            lockedUntil: null,
            lastAttemptAt: new Date(),
          })
          .where(eq(loginAttempts.id, attempt.id));
      }
    }

    // Look up the student
    const studentResults = await db
      .select()
      .from(students)
      .where(eq(students.electionNumber, electionNumber))
      .limit(1);

    const student = studentResults[0];

    // Verify credentials (2FA: EN + Class + Section)
    const isValid =
      student &&
      student.class === studentClass &&
      student.section.toUpperCase() === section.toUpperCase();

    if (!isValid) {
      // Record failed attempt
      if (attempt) {
        const newCount = (attempt.attemptCount || 0) + 1;
        const shouldLock = newCount >= MAX_ATTEMPTS;

        await db
          .update(loginAttempts)
          .set({
            attemptCount: newCount,
            lastAttemptAt: new Date(),
            lockedUntil: shouldLock
              ? new Date(Date.now() + LOCKOUT_DURATION_MS)
              : null,
          })
          .where(eq(loginAttempts.id, attempt.id));

        if (shouldLock) {
          return NextResponse.json(
            {
              error: "Too many failed attempts. Account locked for 5 minutes.",
              lockedUntil: Date.now() + LOCKOUT_DURATION_MS,
              attemptsLeft: 0,
            },
            { status: 429 }
          );
        }

        return NextResponse.json(
          {
            error: "Invalid Election Number, Class, or Section.",
            attemptsLeft: MAX_ATTEMPTS - newCount,
          },
          { status: 401 }
        );
      } else {
        // First attempt — create record
        await db.insert(loginAttempts).values({
          identifier,
          attemptCount: 1,
          lastAttemptAt: new Date(),
        });

        return NextResponse.json(
          {
            error: "Invalid Election Number, Class, or Section.",
            attemptsLeft: MAX_ATTEMPTS - 1,
          },
          { status: 401 }
        );
      }
    }

    // Check if already voted
    if (student.hasVoted) {
      return NextResponse.json(
        { error: "You have already cast your vote." },
        { status: 403 }
      );
    }

    // Check election time (if configured)
    // TODO: Check electionConfig for start/end time

    // Generate JWT token
    const token = await signToken({
      type: "voter",
      studentId: student.id,
      name: student.name,
      hasVoted: student.hasVoted,
    });

    // Reset login attempts on success
    if (attempt) {
      await db
        .update(loginAttempts)
        .set({ attemptCount: 0, lockedUntil: null })
        .where(eq(loginAttempts.id, attempt.id));
    }

    return NextResponse.json({
      token,
      student: {
        name: student.name,
        class: student.class,
        section: student.section,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
