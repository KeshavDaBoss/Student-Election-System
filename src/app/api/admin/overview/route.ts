import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { students, candidates, positions, electionConfig, votes } from "@/db/schema";
import { requireClerkAdmin } from "@/lib/clerk-admin";
import { sql, eq, desc, inArray } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const admin = await requireClerkAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Total voters
    const votersResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(students);
    const totalVoters = Number(votersResult[0].count);

    // Total voted
    const votedResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(students)
      .where(eq(students.hasVoted, true));
    const totalVoted = Number(votedResult[0].count);

    // Total candidates & positions
    const candidatesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(candidates);
    const totalCandidates = Number(candidatesResult[0].count);

    const positionsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(positions)
      .where(eq(positions.isVotable, true));
    const totalPositions = Number(positionsResult[0].count);

    // Election status
    const configResults = await db.select().from(electionConfig).limit(1);
    const config = configResults[0];
    let electionStatus = "not-started";

    if (config) {
      if (config.isAlwaysLive) {
        electionStatus = "live";
      } else {
        const now = new Date();
        const start = config.startTime ? new Date(config.startTime) : null;
        const end = config.endTime ? new Date(config.endTime) : null;

        if (start && end) {
          if (now >= start && now <= end) electionStatus = "live";
          else if (now < start) electionStatus = "scheduled";
          else if (now > end) electionStatus = "ended";
        } else if (start && !end) {
          if (now >= start) electionStatus = "live";
          else electionStatus = "scheduled";
        }
      }
    } else {
      // Default live if no config (or maybe not started?)
      electionStatus = "live";
    }

    // Recent votes with ballot details
    const recentVoters = await db
      .select({
        studentId: students.id,
        name: students.name,
        class: students.class,
        votedAt: students.votedAt,
      })
      .from(students)
      .where(eq(students.hasVoted, true))
      .orderBy(desc(students.votedAt))
      .limit(5);

    const studentIds = recentVoters.map((v) => v.studentId);

    const [allPositions, allCandidates, studentVotes] = await Promise.all([
      db.select().from(positions).where(eq(positions.isVotable, true)),
      db.select().from(candidates),
      studentIds.length > 0
        ? db.select().from(votes).where(inArray(votes.studentId, studentIds))
        : Promise.resolve([]),
    ]);

    const candidateMap = new Map(allCandidates.map((c) => [c.id, c.name]));
    const positionMap = new Map(allPositions.map((p) => [p.id, p.title]));

    const recentVotes = recentVoters.map((voter) => {
      const ballots = studentVotes
        .filter((v) => v.studentId === voter.studentId)
        .map((v) => ({
          position: positionMap.get(v.positionId) ?? "Unknown",
          choices: (v.rankings as number[]).map(
            (id) => candidateMap.get(id) ?? `Unknown(${id})`
          ),
        }));

      return {
        name: voter.name,
        class: voter.class,
        votedAt: voter.votedAt,
        ballots,
      };
    });

    return NextResponse.json({
      totalVoters,
      totalVoted,
      turnoutRate: totalVoters > 0 ? totalVoted / totalVoters : 0,
      totalCandidates,
      totalPositions,
      electionStatus,
      recentVotes,
    });
  } catch (error) {
    console.error("Overview error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
