"use client";

import { useEffect, useState, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

interface OverviewData {
  totalVoters: number;
  totalVoted: number;
  turnoutRate: number;
  totalCandidates: number;
  totalPositions: number;
  electionStatus: string;
  recentVotes: { name: string; class: string; votedAt: string }[];
}

export default function AdminOverviewPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const token = document.cookie
          .split(";")
          .map((c) => c.trim())
          .find((c) => c.startsWith("ses_admin_token="))
          ?.split("=")[1];

        const res = await fetch("/api/admin/overview", {
          headers: { Authorization: `Bearer ${token}` },
        });

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
      gsap.from(".stat-card", {
        y: 20,
        opacity: 0,
        duration: 0.5,
        stagger: 0.1,
        ease: "power3.out",
      });
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
          {data?.electionStatus === "live" ? "● Live" : data?.electionStatus === "scheduled" ? "⏳ Scheduled" : "◼ Not Started"}
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
          <div className={`stat-card__change ${turnoutPercent > 50 ? "stat-card__change--up" : ""}`}>
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
                </tr>
              </thead>
              <tbody>
                {data.recentVotes.map((vote, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{vote.name}</td>
                    <td>{vote.class}</td>
                    <td style={{ color: "var(--gray-500)" }}>
                      {new Date(vote.votedAt).toLocaleString()}
                    </td>
                  </tr>
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
            <p style={{ fontSize: "2rem", marginBottom: "var(--space-sm)" }}>📭</p>
            <p>No votes cast yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
