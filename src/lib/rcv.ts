/**
 * Ranked-Choice Voting (Instant Runoff) Engine
 *
 * Implements the IRV algorithm:
 * 1. Count first-choice votes
 * 2. If a candidate has majority → winner
 * 3. If not, eliminate candidate with fewest first-choice votes
 * 4. Redistribute eliminated candidate's votes to next choices
 * 5. Repeat until numWinners are found
 *
 * Tie-breaking: Uses next-choice vote counts (2nd choice, 3rd, etc.)
 */

export interface Ballot {
  studentId: number;
  rankings: number[]; // Candidate IDs in ranked order
}

export interface RCVCandidate {
  id: number;
  name: string;
}

export interface RoundResult {
  round: number;
  tally: Map<number, number>; // candidateId → vote count
  eliminated: number | null; // candidateId eliminated this round
  winner: number | null; // candidateId that won this round (if any)
  totalActiveBallots: number;
}

export interface RCVResult {
  winners: number[]; // Winner candidate IDs in order of winning
  rounds: RoundResult[];
  exhaustedBallots: number;
}

/**
 * Run the full Ranked-Choice Voting algorithm.
 *
 * @param ballots - Array of all ranked ballots
 * @param candidateIds - Array of all candidate IDs in this race
 * @param numWinners - How many winners to select (default: 1)
 * @returns RCVResult with winners and detailed round-by-round results
 */
export function runRCV(
  ballots: Ballot[],
  candidateIds: number[],
  numWinners: number = 1
): RCVResult {
  const winners: number[] = [];
  const rounds: RoundResult[] = [];
  const activeCandidates = new Set(candidateIds);
  let exhaustedBallots = 0;
  let roundNumber = 0;

  while (winners.length < numWinners && activeCandidates.size > 0) {
    roundNumber++;

    // Count first-choice votes for active candidates
    const tally = new Map<number, number>();
    for (const cId of activeCandidates) {
      tally.set(cId, 0);
    }

    let activeBallotCount = 0;

    for (const ballot of ballots) {
      const topChoice = getTopChoice(ballot.rankings, activeCandidates);
      if (topChoice !== null) {
        tally.set(topChoice, (tally.get(topChoice) || 0) + 1);
        activeBallotCount++;
      }
    }

    // Check if any candidate has a majority
    const majorityThreshold = Math.floor(activeBallotCount / 2) + 1;

    // Find the candidate with most votes
    let maxVotes = 0;
    let maxCandidateId: number | null = null;
    for (const [candidateId, voteCount] of tally) {
      if (voteCount > maxVotes) {
        maxVotes = voteCount;
        maxCandidateId = candidateId;
      }
    }

    if (maxCandidateId !== null && maxVotes >= majorityThreshold) {
      // We have a winner!
      winners.push(maxCandidateId);
      activeCandidates.delete(maxCandidateId);

      rounds.push({
        round: roundNumber,
        tally: new Map(tally),
        eliminated: null,
        winner: maxCandidateId,
        totalActiveBallots: activeBallotCount,
      });

      continue;
    }

    // No majority — eliminate the candidate with the fewest votes
    const candidateToEliminate = findLowestCandidate(
      tally,
      ballots,
      activeCandidates
    );

    if (candidateToEliminate === null) {
      // Edge case: no more candidates can be eliminated
      break;
    }

    activeCandidates.delete(candidateToEliminate);

    rounds.push({
      round: roundNumber,
      tally: new Map(tally),
      eliminated: candidateToEliminate,
      winner: null,
      totalActiveBallots: activeBallotCount,
    });

    // If only the required number of candidates remain, they all win
    if (activeCandidates.size <= numWinners - winners.length) {
      for (const remainingId of activeCandidates) {
        winners.push(remainingId);
      }
      break;
    }
  }

  // Count exhausted ballots
  exhaustedBallots = ballots.filter(
    (b) => getTopChoice(b.rankings, activeCandidates) === null
  ).length;

  return { winners, rounds, exhaustedBallots };
}

/**
 * Get the top-ranked candidate from a ballot that is still active.
 */
function getTopChoice(
  rankings: number[],
  activeCandidates: Set<number>
): number | null {
  for (const candidateId of rankings) {
    if (activeCandidates.has(candidateId)) {
      return candidateId;
    }
  }
  return null; // Ballot is exhausted
}

/**
 * Find the candidate with the lowest vote count.
 * Tie-breaking: if tied, compare by 2nd choice votes, then 3rd, etc.
 */
function findLowestCandidate(
  tally: Map<number, number>,
  ballots: Ballot[],
  activeCandidates: Set<number>
): number | null {
  // Find the minimum vote count
  let minVotes = Infinity;
  for (const [, voteCount] of tally) {
    if (voteCount < minVotes) {
      minVotes = voteCount;
    }
  }

  // Find all candidates with that minimum
  const tiedCandidates: number[] = [];
  for (const [candidateId, voteCount] of tally) {
    if (voteCount === minVotes) {
      tiedCandidates.push(candidateId);
    }
  }

  if (tiedCandidates.length === 1) {
    return tiedCandidates[0];
  }

  // Tie-breaking: use number of 2nd choice votes, then 3rd, etc.
  return breakTie(tiedCandidates, ballots, activeCandidates);
}

/**
 * Break a tie by comparing next-choice vote counts.
 * The candidate with the fewest votes across all choice levels gets eliminated.
 */
function breakTie(
  tiedCandidates: number[],
  ballots: Ballot[],
  activeCandidates: Set<number>
): number {
  // For each rank level (2nd choice, 3rd choice, etc.), count votes
  const maxRankings = Math.max(...ballots.map((b) => b.rankings.length));

  for (let rank = 1; rank < maxRankings; rank++) {
    const rankTally = new Map<number, number>();
    for (const cId of tiedCandidates) {
      rankTally.set(cId, 0);
    }

    for (const ballot of ballots) {
      // Get the Nth active candidate in this ballot
      let activeRank = 0;
      for (const candidateId of ballot.rankings) {
        if (activeCandidates.has(candidateId)) {
          if (activeRank === rank && tiedCandidates.includes(candidateId)) {
            rankTally.set(candidateId, (rankTally.get(candidateId) || 0) + 1);
          }
          activeRank++;
        }
      }
    }

    // Find the candidate with the fewest votes at this rank level
    let minVotes = Infinity;
    let minCandidate: number | null = null;
    let isTied = false;

    for (const [candidateId, voteCount] of rankTally) {
      if (voteCount < minVotes) {
        minVotes = voteCount;
        minCandidate = candidateId;
        isTied = false;
      } else if (voteCount === minVotes) {
        isTied = true;
      }
    }

    if (!isTied && minCandidate !== null) {
      return minCandidate;
    }
  }

  // If still tied after all ranks, just pick the first one
  return tiedCandidates[0];
}

// --- Analytics Helpers ---

/**
 * Calculate the average ranking position for each candidate.
 * Lower average = better (1.0 = everyone ranked them 1st).
 */
export function calculateAveragePositions(
  ballots: Ballot[],
  candidateIds: number[]
): Map<number, number> {
  const totals = new Map<number, { sum: number; count: number }>();

  for (const cId of candidateIds) {
    totals.set(cId, { sum: 0, count: 0 });
  }

  for (const ballot of ballots) {
    for (let i = 0; i < ballot.rankings.length; i++) {
      const candidateId = ballot.rankings[i];
      const entry = totals.get(candidateId);
      if (entry) {
        entry.sum += i + 1; // 1-indexed rank
        entry.count += 1;
      }
    }
  }

  const averages = new Map<number, number>();
  for (const [candidateId, { sum, count }] of totals) {
    averages.set(candidateId, count > 0 ? sum / count : 0);
  }

  return averages;
}

/**
 * Count votes at each rank level for each candidate.
 * Returns: candidateId → [1st choice count, 2nd choice count, ...]
 */
export function countVotesByRank(
  ballots: Ballot[],
  candidateIds: number[]
): Map<number, number[]> {
  const maxRank = Math.max(...ballots.map((b) => b.rankings.length), 0);
  const result = new Map<number, number[]>();

  for (const cId of candidateIds) {
    result.set(cId, new Array(maxRank).fill(0));
  }

  for (const ballot of ballots) {
    for (let rank = 0; rank < ballot.rankings.length; rank++) {
      const candidateId = ballot.rankings[rank];
      const counts = result.get(candidateId);
      if (counts && rank < counts.length) {
        counts[rank]++;
      }
    }
  }

  return result;
}
