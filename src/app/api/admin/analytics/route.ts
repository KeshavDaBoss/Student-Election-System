import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { positions, candidates, votes, suggestions } from "@/db/schema";
import { requireClerkAdmin } from "@/lib/clerk-admin";
import { runRCV, calculateAveragePositions, countVotesByRank } from "@/lib/rcv";
import { eq, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const admin = await requireClerkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const allPositions = await db.select().from(positions).where(eq(positions.isVotable, true));
    const allCandidates = await db.select().from(candidates);
    const allVotes = await db.select().from(votes);
    
    // Aggregate suggestions
    const suggestionRows = await db
      .select({
        candidateId: suggestions.candidateId,
        suggestedPosition: suggestions.suggestedPosition,
        count: sql<number>`count(*)`,
      })
      .from(suggestions)
      .groupBy(suggestions.candidateId, suggestions.suggestedPosition)
      .orderBy(sql`count(*) DESC`);

    const analyticsData = [];

    for (const pos of allPositions) {
      const posCandidates = allCandidates.filter(c => c.positionId === pos.id);
      const posCandidateIds = posCandidates.map(c => c.id);
      
      const posVotes = allVotes
        .filter(v => v.positionId === pos.id)
        .map(v => ({ studentId: v.studentId, rankings: v.rankings }));

      // Run RCV Algorithm
      const rcvResult = runRCV(posVotes, posCandidateIds, pos.numWinners);
      
      // Additional Analytics
      const avgPositions = calculateAveragePositions(posVotes, posCandidateIds);
      const voteCounts = countVotesByRank(posVotes, posCandidateIds);

      // Name mapping utility
      const getName = (id: number) => posCandidates.find(c => c.id === id)?.name || `Unknown(${id})`;

      // Format round data with names instead of IDs
      const formattedRounds = rcvResult.rounds.map(r => {
        const tallyNames: Record<string, number> = {};
        for (const [id, count] of Array.from(r.tally.entries())) {
          tallyNames[getName(id)] = count;
        }
        return {
          round: r.round,
          tally: tallyNames,
          eliminated: r.eliminated ? getName(r.eliminated) : null,
          winner: r.winner ? getName(r.winner) : null,
          totalActiveBallots: r.totalActiveBallots
        };
      });

      // Format average positions with names
      const formattedAvgs: Record<string, number> = {};
      for (const [id, avg] of Array.from(avgPositions.entries())) {
        formattedAvgs[getName(id)] = avg;
      }

      // Format 1st choice votes
      const formattedFirstChoices: Record<string, number> = {};
      for (const [id, counts] of Array.from(voteCounts.entries())) {
        formattedFirstChoices[getName(id)] = counts[0] || 0;
      }
      
      // Get suggestions for candidates in this position
      const posSuggestions = suggestionRows
        .filter(s => posCandidateIds.includes(s.candidateId))
        .map(s => ({
          candidate: getName(s.candidateId),
          position: s.suggestedPosition,
          count: Number(s.count)
        }));

      analyticsData.push({
        positionId: pos.id,
        positionTitle: pos.title,
        numWinners: pos.numWinners,
        totalVotes: posVotes.length,
        winners: rcvResult.winners.map(id => getName(id)),
        exhaustedBallots: rcvResult.exhaustedBallots,
        averagePositions: formattedAvgs,
        firstChoiceVotes: formattedFirstChoices,
        rounds: formattedRounds,
        suggestions: posSuggestions
      });
    }

    return NextResponse.json(analyticsData);
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: "Failed to generate analytics" }, { status: 500 });
  }
}
