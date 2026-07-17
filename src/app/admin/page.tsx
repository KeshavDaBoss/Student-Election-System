"use client";

import { useEffect, useState, useRef, Fragment } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

interface BallotEntry {
  position: string;
  choices: string[];
}

interface RecentVote {
  name: string;
  class: string;
  votedAt: string;
  ballots: BallotEntry[];
}

interface OverviewData {
  totalVoters: number;
  totalVoted: number;
  turnoutRate: number;
  totalCandidates: number;
  totalPositions: number;
  electionStatus: string;
  recentVotes: RecentVote[];
}

export default function AdminOverviewPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedVote, setExpandedVote] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/overview");

        if (res.ok) {
          setData(await res.json());
        }
      } catch (err) {
        console.error("Failed to load overview:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useGSAP(
    () => {
      if (loading) return;
      gsap.fromTo(
        ".stat-card",
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: "power3.out", clearProps: "opacity" }
      );
      gsap.from(".overview-section", {
        y: 25,
        opacity: 0,
        duration: 0.6,
        delay: 0.3,
        stagger: 0.15,
        ease: "power3.out",
      });
    },
    { scope: containerRef, dependencies: [loading] }
  );

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", paddingTop: "var(--space-4xl)" }}>
        <div className="spinner spinner--lg" />
      </div>
    );
  }

  const turnoutPercent = data ? Math.round(data.turnoutRate * 100) : 0;

  return (
    <div ref={containerRef}>
      <div className="section-header">
        <div>
          <h1 className="section-title">Dashboard</h1>
          <p className="section-subtitle">Student Cabinet Elections Overview</p>
        </div>
        <div className={`badge ${data?.electionStatus === "live" ? "badge--success" : data?.electionStatus === "scheduled" ? "badge--warning" : "badge--info"}`}>
          {data?.electionStatus === "live" ? "Live" : data?.electionStatus === "scheduled" ? "Scheduled" : "Not Started"}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid mb-2xl">
        <div className="stat-card">
          <div className="stat-card__label">Total Voters</div>
          <div className="stat-card__value">{data?.totalVoters || 0}</div>
          <div className="stat-card__change" style={{ color: "var(--gray-500)", fontSize: "0.8rem" }}>
            Registered students
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__label">Votes Cast</div>
          <div className="stat-card__value">{data?.totalVoted || 0}</div>
          <div className="stat-card__change" style={{ color: "var(--gray-500)", fontSize: "0.8rem" }}>
            {turnoutPercent}% turnout
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__label">Candidates</div>
          <div className="stat-card__value">{data?.totalCandidates || 0}</div>
          <div className="stat-card__change" style={{ color: "var(--gray-500)", fontSize: "0.8rem" }}>
            Across {data?.totalPositions || 0} positions
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__label">Turnout</div>
          <div className="stat-card__value">{turnoutPercent}%</div>
          <div style={{ marginTop: "var(--space-sm)" }}>
            <div style={{ width: "100%", height: 6, background: "var(--gray-200)", borderRadius: "var(--radius-full)" }}>
              <div
                style={{
                  width: `${turnoutPercent}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, var(--orange-400), var(--orange-600))",
                  borderRadius: "var(--radius-full)",
                  transition: "width 1s ease",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="overview-section">
        <h3 className="mb-lg">Recent Votes</h3>
        {data?.recentVotes && data.recentVotes.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Class</th>
                  <th>Time</th>
                  <th>Ballot</th>
                </tr>
              </thead>
              <tbody>
                {data.recentVotes.map((vote, i) => (
                  <Fragment key={i}>
                    <tr>
                      <td style={{ fontWeight: 500 }}>{vote.name}</td>
                      <td>{vote.class}</td>
                      <td style={{ color: "var(--gray-500)" }}>
                        {new Date(vote.votedAt).toLocaleString()}
                      </td>
                      <td>
                        {vote.ballots.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setExpandedVote(expandedVote === i ? null : i)}
                            style={{
                              background: "none",
                              border: "1px solid var(--gray-200)",
                              borderRadius: "var(--radius-sm)",
                              padding: "4px 10px",
                              fontSize: "0.8125rem",
                              color: "var(--gray-700)",
                              cursor: "pointer",
                              fontFamily: "var(--font-heading)",
                              fontWeight: 500,
                            }}
                          >
                            {expandedVote === i ? "Hide" : "View votes"}
                          </button>
                        ) : (
                          <span style={{ color: "var(--gray-400)", fontSize: "0.8125rem" }}>—</span>
                        )}
                      </td>
                    </tr>
                    {expandedVote === i && vote.ballots.length > 0 && (
                      <tr>
                        <td colSpan={4} style={{ padding: 0 }}>
                          <div
                            style={{
                              padding: "var(--space-md) var(--space-lg)",
                              background: "var(--gray-50)",
                              borderTop: "1px solid var(--gray-100)",
                            }}
                          >
                            {vote.ballots.map((ballot, j) => (
                              <div
                                key={j}
                                style={{
                                  marginBottom: j < vote.ballots.length - 1 ? "var(--space-sm)" : 0,
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                    color: "var(--gray-500)",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                    marginBottom: "4px",
                                  }}
                                >
                                  {ballot.position}
                                </div>
                                <div style={{ fontSize: "0.875rem", color: "var(--gray-800)" }}>
                                  {ballot.choices.map((choice, k) => (
                                    <span key={k}>
                                      {k > 0 && (
                                        <span style={{ color: "var(--gray-400)", margin: "0 6px" }}>→</span>
                                      )}
                                      <span style={{ fontWeight: k === 0 ? 600 : 400 }}>{choice}</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: "var(--space-3xl)",
              color: "var(--gray-400)",
              background: "var(--white)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--gray-200)",
            }}
          >
            <div style={{ marginBottom: "var(--space-sm)", display: "flex", justifyContent: "center" }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
                <path d="M2 4l10 8 10-8"></path>
              </svg>
            </div>
            <p>No votes cast yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
