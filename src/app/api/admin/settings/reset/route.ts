import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { students, votes, loginAttempts, suggestions } from "@/db/schema";
import { requireClerkAdmin } from "@/lib/clerk-admin";

export async function POST(request: NextRequest) {
  const admin = await requireClerkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { email } = await request.json();
    
    if (email !== admin.email) {
      return NextResponse.json({ error: "Email confirmation does not match your admin email." }, { status: 400 });
    }

    // Perform reset:
    // 1. Delete all votes
    await db.delete(votes);
    
    // 2. Delete all suggestions
    await db.delete(suggestions);

    // 3. Reset all students hasVoted to false
    await db.update(students).set({ hasVoted: false, votedAt: null });

    // 4. Clear rate limiting
    await db.delete(loginAttempts);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset error:", error);
    return NextResponse.json({ error: "Failed to reset election data." }, { status: 500 });
  }
}
