"use client";

import { useState, useRef, useEffect } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

interface RoundData {
  round: number;
  tally: Record<string, number>;
  eliminated: string | null;
  winner: string | null;
  totalActiveBallots: number;
}

interface AnalyticsData {
  positionId: number;
  positionTitle: string;
  numWinners: number;
  totalVotes: number;
  winners: string[];
  exhaustedBallots: number;
  averagePositions: Record<string, number>;
  firstChoiceVotes: Record<string, number>;
  rounds: RoundData[];
  suggestions: { candidate: string; position: string; count: number }[];
}

export default function AdminAnalyticsPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/analytics");

        if (res.ok) {
          setAnalytics(await res.json());
        }
      } catch (err) {
        console.error(err);
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
        ".analytics-card",
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: "power3.out", clearProps: "opacity" }
      );
    },
    { scope: containerRef, dependencies: [loading] }
  );

  if (loading) {
    return <div className="spinner spinner--lg" style={{ display: "block", margin: "40px auto" }} />;
  }

  return (
    <div ref={containerRef}>
      <div className="section-header">
        <div>
          <h1 className="section-title">Election Analytics</h1>
          <p className="section-subtitle">Real-time ranked-choice voting results</p>
        </div>
      </div>

      {analytics.map((race) => (
        <div key={race.positionId} className="glass-card analytics-card mb-2xl">
          <div className="section-header">
            <div>
              <h2 style={{ fontSize: "1.25rem", marginBottom: "2px" }}>{race.positionTitle}</h2>
              <p style={{ color: "var(--gray-500)", fontSize: "0.8125rem" }}>
                Requires {race.numWinners} winner{race.numWinners > 1 ? "s" : ""}
              </p>
            </div>
            <div className="badge badge--orange">{race.totalVotes} Total</div>
          </div>

          {race.winners.length > 0 && (
            <div className="analytics-winners">
              <div className="analytics-winners__label">
                Projected Winner{race.numWinners > 1 ? "s" : ""}
              </div>
              <div className="analytics-winners__names">{race.winners.join(", ")}</div>
            </div>
          )}

          <div className="analytics-grid">
            <div style={{ minWidth: 0 }}>
              <h3 className="analytics-section__title">First-Choice Votes</h3>
              <div className="bar-chart">
                {Object.entries(race.firstChoiceVotes)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, count]) => {
                    const percent = race.totalVotes > 0 ? (count / race.totalVotes) * 100 : 0;
                    return (
                      <div key={name} className="bar-chart__item">
                        <div className="bar-chart__label" title={name}>{name}</div>
                        <div className="bar-chart__track">
                          <div
                            className="bar-chart__fill"
                            style={{ width: `${Math.max(percent, count > 0 ? 5 : 0)}%` }}
                          >
                            {percent > 0 && (
                              <span className="bar-chart__value">{Math.round(percent)}%</span>
                            )}
                          </div>
                        </div>
                        <div className="bar-chart__count">{count}</div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div style={{ minWidth: 0 }}>
              <h3 className="analytics-section__title">Average Rank Position</h3>
              <p className="analytics-section__hint">Lower is better (1.0 = ranked 1st by everyone)</p>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th style={{ textAlign: "right" }}>Avg.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(race.averagePositions)
                      .sort((a, b) => a[1] - b[1])
                      .map(([name, avg]) => (
                        <tr key={name}>
                          <td style={{ fontWeight: 500 }}>{name}</td>
                          <td style={{ textAlign: "right", fontFamily: "monospace" }}>
                            {avg.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {race.rounds && race.rounds.length > 0 && (
            <div style={{ marginTop: "var(--space-lg)", paddingTop: "var(--space-lg)", borderTop: "1px solid var(--gray-200)" }}>
              <h3 className="analytics-section__title" style={{ marginBottom: "var(--space-md)" }}>
                Round-by-Round Breakdown
              </h3>

              <div className="analytics-rounds">
                {race.rounds.map((round) => (
                  <div key={round.round} className="analytics-round">
                    <h4 style={{ fontSize: "0.9375rem", marginBottom: "var(--space-sm)", borderBottom: "1px solid var(--gray-300)", paddingBottom: "4px" }}>
                      Round {round.round}
                    </h4>
                    <p style={{ fontSize: "0.75rem", color: "var(--gray-500)", marginBottom: "var(--space-sm)" }}>
                      Active Ballots: {round.totalActiveBallots}
                    </p>

                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "var(--space-sm)" }}>
                      {Object.entries(round.tally)
                        .sort((a, b) => b[1] - a[1])
                        .map(([name, count]) => (
                          <div key={name} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem" }}>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: "8px" }}>{name}</span>
                            <span style={{ fontWeight: 600, flexShrink: 0 }}>{count}</span>
                          </div>
                        ))}
                    </div>

                    {round.eliminated && (
                      <div className="alert alert--error" style={{ padding: "6px 8px", fontSize: "0.75rem" }}>
                        Eliminated: <strong>{round.eliminated}</strong>
                      </div>
                    )}
                    {round.winner && (
                      <div className="alert alert--success" style={{ padding: "6px 8px", fontSize: "0.75rem" }}>
                        Winner: <strong>{round.winner}</strong>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p style={{ fontSize: "0.75rem", color: "var(--gray-500)", marginTop: "var(--space-sm)" }}>
                Exhausted ballots: {race.exhaustedBallots}
              </p>
            </div>
          )}

          {race.suggestions && race.suggestions.length > 0 && (
            <div style={{ marginTop: "var(--space-lg)", paddingTop: "var(--space-lg)", borderTop: "1px solid var(--gray-200)" }}>
              <h3 className="analytics-section__title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                Student Suggestions
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)", marginTop: "var(--space-sm)" }}>
                {race.suggestions.map((sug, i) => (
                  <span key={i} className="badge badge--info" style={{ padding: "4px 10px", textTransform: "none" }}>
                    {sug.candidate} → {sug.position} ({sug.count})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
