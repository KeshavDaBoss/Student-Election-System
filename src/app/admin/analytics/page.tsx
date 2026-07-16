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
  winners: string[]; // names
  exhaustedBallots: number;
  averagePositions: Record<string, number>; // name -> avg rank
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
        const token = document.cookie
          .split(";")
          .map((c) => c.trim())
          .find((c) => c.startsWith("ses_admin_token="))
          ?.split("=")[1];

        const res = await fetch("/api/admin/analytics", {
          headers: { Authorization: `Bearer ${token}` },
        });

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
      gsap.from(".analytics-card", {
        y: 20,
        opacity: 0,
        duration: 0.6,
        stagger: 0.15,
        ease: "power3.out",
      });
    },
    { scope: containerRef, dependencies: [loading] }
  );

  if (loading) {
    return <div className="spinner spinner--lg" style={{ display: 'block', margin: '40px auto' }} />;
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
          <div className="section-header" style={{ marginBottom: "var(--space-md)" }}>
            <h2 style={{ fontSize: "1.5rem" }}>{race.positionTitle}</h2>
            <div className="badge badge--orange">
              {race.totalVotes} Total Votes
            </div>
          </div>

          <p style={{ color: "var(--gray-500)", fontSize: "0.9rem", marginBottom: "var(--space-xl)" }}>
            Requires {race.numWinners} winner{race.numWinners > 1 ? "s" : ""}
          </p>

          {/* Winners Banner */}
          {race.winners.length > 0 && (
            <div 
              style={{ 
                padding: "var(--space-lg)", 
                background: "linear-gradient(135deg, var(--orange-500), var(--orange-700))", 
                borderRadius: "var(--radius-lg)",
                color: "white",
                marginBottom: "var(--space-2xl)",
                boxShadow: "var(--shadow-orange)"
              }}
            >
              <h3 style={{ fontSize: "1rem", color: "rgba(255,255,255,0.8)", marginBottom: "4px" }}>Projected Winner{race.numWinners > 1 ? "s" : ""}</h3>
              <p style={{ fontSize: "1.75rem", fontWeight: 700, fontFamily: "var(--font-heading)" }}>
                {race.winners.join(", ")}
              </p>
            </div>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2xl)" }}>
            {/* 1st Choice Votes Chart */}
            <div style={{ flex: "1 1 300px", minWidth: 0 }}>
              <h3 className="mb-md" style={{ fontSize: "1.1rem" }}>First-Choice Votes</h3>
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
                            style={{ width: `${Math.max(percent, 5)}%` }} // min 5% for visibility
                          >
                            <span className="bar-chart__value">{Math.round(percent)}%</span>
                          </div>
                        </div>
                        <div className="bar-chart__count">{count}</div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Average Position */}
            <div style={{ flex: "1 1 300px", minWidth: 0 }}>
              <h3 className="mb-md" style={{ fontSize: "1.1rem" }}>Average Rank Position</h3>
              <p style={{ fontSize: "0.8rem", color: "var(--gray-500)", marginBottom: "var(--space-sm)" }}>Lower is better (1.0 = ranked 1st by everyone)</p>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th style={{ textAlign: "right" }}>Avg. Rank</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(race.averagePositions)
                      .sort((a, b) => a[1] - b[1]) // Lowest first
                      .map(([name, avg]) => (
                        <tr key={name}>
                          <td style={{ fontWeight: 500 }}>{name}</td>
                          <td style={{ textAlign: "right", fontFamily: "monospace", fontSize: "1rem" }}>
                            {avg.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* RCV Round Breakdown */}
          {race.rounds && race.rounds.length > 0 && (
            <div style={{ marginTop: "var(--space-2xl)", paddingTop: "var(--space-xl)", borderTop: "1px solid var(--gray-200)" }}>
              <h3 className="mb-lg" style={{ fontSize: "1.1rem" }}>Round-by-Round Breakdown</h3>
              
              <div style={{ display: "flex", gap: "var(--space-md)", overflowX: "auto", paddingBottom: "var(--space-sm)" }}>
                {race.rounds.map((round) => (
                  <div key={round.round} style={{ minWidth: 280, background: "var(--gray-50)", padding: "var(--space-md)", borderRadius: "var(--radius-md)", border: "1px solid var(--gray-200)" }}>
                    <h4 style={{ fontSize: "1rem", marginBottom: "var(--space-sm)", borderBottom: "1px solid var(--gray-300)", paddingBottom: "4px" }}>
                      Round {round.round}
                    </h4>
                    <p style={{ fontSize: "0.8rem", color: "var(--gray-500)", marginBottom: "var(--space-md)" }}>
                      Active Ballots: {round.totalActiveBallots}
                    </p>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "var(--space-md)" }}>
                      {Object.entries(round.tally)
                        .sort((a, b) => b[1] - a[1])
                        .map(([name, count]) => (
                          <div key={name} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
                            <span>{name}</span>
                            <span style={{ fontWeight: 600 }}>{count}</span>
                          </div>
                      ))}
                    </div>

                    {round.eliminated && (
                      <div className="alert alert--error" style={{ padding: "8px", fontSize: "0.8rem" }}>
                        Eliminated: <strong>{round.eliminated}</strong>
                      </div>
                    )}
                    {round.winner && (
                      <div className="alert alert--success" style={{ padding: "8px", fontSize: "0.8rem" }}>
                        Winner: <strong>{round.winner}</strong>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--gray-500)", marginTop: "var(--space-sm)" }}>
                Exhausted ballots: {race.exhaustedBallots}
              </p>
            </div>
          )}
          
          {/* Suggestions */}
          {race.suggestions && race.suggestions.length > 0 && (
             <div style={{ marginTop: "var(--space-2xl)", paddingTop: "var(--space-xl)", borderTop: "1px solid var(--gray-200)" }}>
               <h3 className="mb-md" style={{ fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "8px" }}>
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                   <circle cx="12" cy="12" r="10"></circle>
                   <line x1="12" y1="16" x2="12" y2="12"></line>
                   <line x1="12" y1="8" x2="12.01" y2="8"></line>
                 </svg>
                 Student Suggestions
               </h3>
               <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)" }}>
                 {race.suggestions.map((sug, i) => (
                   <span key={i} className="badge badge--info" style={{ padding: "6px 12px", textTransform: "none" }}>
                     {sug.candidate} → {sug.position} ({sug.count} votes)
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
