"use client";

import { useRef, useEffect, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export default function VoteSuccessPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [confettiPieces, setConfettiPieces] = useState<
    { id: number; left: string; color: string; delay: number; size: number }[]
  >([]);

  // Generate confetti pieces
  useEffect(() => {
    const colors = [
      "var(--orange-400)",
      "var(--orange-600)",
      "var(--success)",
      "#FFD700",
      "var(--orange-200)",
      "#FF6B6B",
      "#4ECDC4",
    ];
    const pieces = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 2,
      size: 6 + Math.random() * 8,
    }));
    setConfettiPieces(pieces);
  }, []);

  // Entrance animation
  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(".success-check", {
        scale: 0,
        rotation: -180,
        duration: 0.8,
        ease: "back.out(1.7)",
      })
        .from(
          ".success-title",
          { y: 20, opacity: 0, duration: 0.6 },
          "-=0.3"
        )
        .from(
          ".success-message",
          { y: 15, opacity: 0, duration: 0.5 },
          "-=0.2"
        )
        .from(
          ".success-action",
          { y: 15, opacity: 0, duration: 0.4 },
          "-=0.1"
        );

      // Confetti animation
      gsap.utils.toArray<HTMLElement>(".confetti-piece").forEach((piece) => {
        gsap.fromTo(
          piece,
          {
            y: -20,
            opacity: 1,
            rotation: 0,
          },
          {
            y: "100vh",
            opacity: 0,
            rotation: Math.random() * 720 - 360,
            duration: 3 + Math.random() * 2,
            delay: parseFloat(piece.dataset.delay || "0"),
            ease: "power1.in",
            repeat: -1,
          }
        );
      });
    },
    { scope: containerRef }
  );

  return (
    <div className="page-wrapper" ref={containerRef}>
      {/* Confetti */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        {confettiPieces.map((piece) => (
          <div
            key={piece.id}
            className="confetti-piece"
            data-delay={piece.delay}
            style={{
              position: "absolute",
              top: -20,
              left: piece.left,
              width: piece.size,
              height: piece.size,
              background: piece.color,
              borderRadius: piece.size > 10 ? "50%" : "2px",
            }}
          />
        ))}
      </div>

      <div className="center-card" style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
        <div className="glass-card">
          {/* Success Checkmark */}
          <div className="success-check">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>

          <h1
            className="success-title"
            style={{ fontSize: "2rem", marginBottom: "var(--space-md)" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              Vote Recorded!
            </div>
          </h1>

          <p
            className="success-message"
            style={{
              fontSize: "1rem",
              color: "var(--gray-600)",
              marginBottom: "var(--space-xl)",
              lineHeight: 1.7,
            }}
          >
            Your vote has been securely recorded. Thank you for participating
            in the Student Cabinet Elections.
          </p>

          <div className="success-action">
            <div
              style={{
                padding: "var(--space-md) var(--space-lg)",
                background: "var(--success-light)",
                borderRadius: "var(--radius-md)",
                border: "1px solid rgba(76, 175, 80, 0.2)",
                marginBottom: "var(--space-xl)",
              }}
            >
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#2E7D32",
                  fontWeight: 500,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }}>
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Your ballot is anonymous and secure
              </p>
            </div>

            <a href="/" className="btn btn-secondary btn-full">
              Return to Home
            </a>
          </div>
        </div>

        <p
          style={{
            marginTop: "var(--space-xl)",
            fontSize: "0.8125rem",
            color: "var(--gray-400)",
          }}
        >
          Army Public School Bolarum — By students, for students
        </p>
      </div>
    </div>
  );
}
