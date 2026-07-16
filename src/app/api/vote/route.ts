import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { students, positions, candidates, votes, suggestions } from "@/db/schema";
import { requireVoter } from "@/lib/auth";
import { eq } from "drizzle-orm";

/**
 * GET /api/vote — Load positions, candidates, and voter info for voting
 */
export async function GET(request: NextRequest) {
  const voter = await requireVoter(request);
  if (!voter) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if already voted
  const studentResults = await db
    .select()
    .from(students)
    .where(eq(students.id, voter.studentId))
    .limit(1);

  const student = studentResults[0];
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  if (student.hasVoted) {
    return NextResponse.json(
      { error: "You have already voted." },
      { status: 403 }
    );
  }

  // Get positions that are either votable or suggestable
  const allPositions = await db
    .select()
    .from(positions)
    // Wait, Drizzle doesn't have an easy OR without importing `or`.
    // Let's just fetch all positions and filter them. Or import `or`.
    // Let's just import `or` from "drizzle-orm" at the top or just fetch all.
    .orderBy(positions.displayOrder);

  const positionsWithCandidates = [];

  for (const position of allPositions) {
    if (!position.isVotable && !position.isSuggestable) continue;

    const positionCandidates = await db
      .select()
      .from(candidates)
      .where(eq(candidates.positionId, position.id));

    positionsWithCandidates.push({
      id: position.id,
      title: position.title,
      description: position.description,
      numWinners: position.numWinners,
      isVotable: position.isVotable,
      isSuggestable: position.isSuggestable,
      candidates: positionCandidates.map((c) => ({
        id: c.id,
        name: c.name,
        class: c.class,
        section: c.section,
      })),
    });
  }

  return NextResponse.json({
    voter: {
      name: student.name,
      class: student.class,
      section: student.section,
    },
    positions: positionsWithCandidates,
  });
}

/**
 * POST /api/vote — Submit ranked votes
 */
export async function POST(request: NextRequest) {
  const voter = await requireVoter(request);
  if (!voter) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Double-check they haven't voted
  const studentResults = await db
    .select()
    .from(students)
    .where(eq(students.id, voter.studentId))
    .limit(1);

  const student = studentResults[0];
  if (!student || student.hasVoted) {
    return NextResponse.json(
      { error: "You have already voted." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const {
      rankings: voteRankings,
      suggestions: voteSuggestions,
    }: {
      rankings: Record<string, number[]>;
      suggestions?: { candidateId: number; suggestedPosition: string }[];
    } = body;

    if (!voteRankings || Object.keys(voteRankings).length === 0) {
      return NextResponse.json(
        { error: "Rankings are required." },
        { status: 400 }
      );
    }

    // Validate and insert votes for each position
    for (const [positionIdStr, candidateRankings] of Object.entries(
      voteRankings
    )) {
      const positionId = parseInt(positionIdStr, 10);

      if (!Array.isArray(candidateRankings) || candidateRankings.length === 0) {
        return NextResponse.json(
          { error: `Invalid rankings for position ${positionId}` },
          { status: 400 }
        );
      }

      // Verify position exists
      const positionResults = await db
        .select()
        .from(positions)
        .where(eq(positions.id, positionId))
        .limit(1);

      if (!positionResults[0]) {
        return NextResponse.json(
          { error: `Position ${positionId} not found` },
          { status: 400 }
        );
      }

      // Insert vote
      await db.insert(votes).values({
        studentId: voter.studentId,
        positionId,
        rankings: candidateRankings,
      });
    }

    // Insert suggestions if any
    if (voteSuggestions && voteSuggestions.length > 0) {
      for (const suggestion of voteSuggestions) {
        if (suggestion.candidateId && suggestion.suggestedPosition) {
          await db.insert(suggestions).values({
            studentId: voter.studentId,
            candidateId: suggestion.candidateId,
            suggestedPosition: suggestion.suggestedPosition,
          });
        }
      }
    }

    // Mark student as voted
    await db
      .update(students)
      .set({ hasVoted: true, votedAt: new Date() })
      .where(eq(students.id, voter.studentId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Vote submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit vote." },
      { status: 500 }
    );
  }
}
