"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

// Class options for APS Bolarum
const CLASS_OPTIONS = [
  "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12",
];
const SECTION_OPTIONS = ["A", "B", "C", "D", "E", "F"];

export default function LoginPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);

  const [electionNumber, setElectionNumber] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Rate limiting state
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [countdown, setCountdown] = useState("");

  // Countdown timer
  useEffect(() => {
    if (!lockedUntil) return;

    const interval = setInterval(() => {
      const remaining = lockedUntil - Date.now();
      if (remaining <= 0) {
        setLockedUntil(null);
        setCountdown("");
        setAttemptsLeft(5);
        setError("");
        clearInterval(interval);
      } else {
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        setCountdown(`${mins}:${secs.toString().padStart(2, "0")}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockedUntil]);

  // GSAP entrance animations
  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(logoRef.current, {
        y: -30,
        opacity: 0,
        duration: 0.8,
      })
        .from(
          ".login-title",
          {
            y: 20,
            opacity: 0,
            duration: 0.6,
          },
          "-=0.4"
        )
        .from(
          ".login-tagline",
          {
            y: 15,
            opacity: 0,
            duration: 0.5,
          },
          "-=0.3"
        )
        .from(
          ".form-group",
          {
            y: 25,
            opacity: 0,
            duration: 0.5,
            stagger: 0.1,
          },
          "-=0.2"
        )
        .from(
          ".login-submit",
          {
            y: 20,
            opacity: 0,
            scale: 0.95,
            duration: 0.5,
          },
          "-=0.1"
        )
        .from(
          ".login-footer",
          {
            opacity: 0,
            duration: 0.4,
          },
          "-=0.2"
        );
    },
    { scope: containerRef }
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");

      // Client-side validation
      if (!electionNumber || electionNumber.length !== 6) {
        setError("Election Number must be exactly 6 characters.");
        // Shake animation
        gsap.to(formRef.current, {
          x: [-10, 10, -8, 8, -4, 4, 0],
          duration: 0.5,
          ease: "power2.out",
        });
        return;
      }

      if (!/^[0-9A-Za-z]{6}$/.test(electionNumber)) {
        setError("Election Number must be alphanumeric (letters and numbers only).");
        gsap.to(formRef.current, {
          x: [-10, 10, -8, 8, -4, 4, 0],
          duration: 0.5,
          ease: "power2.out",
        });
        return;
      }

      if (!selectedClass || !selectedSection) {
        setError("Please select your Class and Section.");
        return;
      }

      if (lockedUntil && Date.now() < lockedUntil) {
        return;
      }

      setLoading(true);

      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            electionNumber,
            class: selectedClass,
            section: selectedSection,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Login failed. Please try again.");

          if (data.attemptsLeft !== undefined) {
            setAttemptsLeft(data.attemptsLeft);
          }

          if (data.lockedUntil) {
            setLockedUntil(data.lockedUntil);
          }

          // Shake animation on error
          gsap.to(formRef.current, {
            x: [-10, 10, -8, 8, -4, 4, 0],
            duration: 0.5,
            ease: "power2.out",
          });

          return;
        }

        // Success — store token and redirect
        document.cookie = `ses_token=${data.token}; path=/; max-age=3600; SameSite=Strict`;

        // Success animation before redirect
        gsap.to(formRef.current, {
          scale: 0.98,
          opacity: 0.8,
          duration: 0.3,
          onComplete: () => {
            router.push("/vote");
          },
        });
      } catch {
        setError("Network error. Please check your connection.");
      } finally {
        setLoading(false);
      }
    },
    [electionNumber, selectedClass, selectedSection, lockedUntil, router]
  );

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;

  return (
    <div className="page-wrapper" ref={containerRef}>
      <div className="center-card">
        {/* Logo */}
        <div ref={logoRef} className="login-logo" style={{ textAlign: "center", marginBottom: "var(--space-xl)" }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "var(--radius-xl)",
              background: "linear-gradient(135deg, var(--orange-400), var(--orange-700))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto",
              boxShadow: "var(--shadow-orange)",
            }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </div>
        </div>

        <div className="glass-card">
          {/* Title */}
          <h1
            className="login-title"
            style={{
              textAlign: "center",
              fontSize: "1.75rem",
              marginBottom: "var(--space-xs)",
            }}
          >
            Student Election System
          </h1>
          <p
            className="login-tagline tagline"
            style={{
              textAlign: "center",
              marginBottom: "var(--space-2xl)",
            }}
          >
            By students, for students
          </p>

          {/* Error Alert */}
          {error && (
            <div className="alert alert--error mb-lg" role="alert">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Rate Limit Warning */}
          {isLocked && (
            <div className="countdown mb-lg">
              <span className="countdown__icon">🔒</span>
              <span className="countdown__text">Too many attempts. Try again in</span>
              <span className="countdown__time">{countdown}</span>
            </div>
          )}

          {/* Login Form */}
          <form ref={formRef} onSubmit={handleSubmit} autoComplete="off">
            {/* Election Number */}
            <div className="form-group mb-lg">
              <label className="form-label" htmlFor="election-number">
                Election Number
              </label>
              <input
                id="election-number"
                type="text"
                className={`form-input ${error && !electionNumber ? "form-input--error" : ""}`}
                placeholder="e.g. A3x9Kp"
                maxLength={6}
                value={electionNumber}
                onChange={(e) =>
                  setElectionNumber(e.target.value.replace(/[^0-9A-Za-z]/g, ""))
                }
                disabled={isLocked || loading}
                autoFocus
                style={{ fontFamily: "var(--font-heading)", letterSpacing: "0.15em", fontSize: "1.2rem", textAlign: "center" }}
              />
              <span className="form-hint">
                6-character alphanumeric code provided by your school
              </span>
            </div>

            {/* Class & Section (2FA) */}
            <div
              className="form-group mb-lg"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "var(--space-md)",
              }}
            >
              <div className="form-group">
                <label className="form-label" htmlFor="student-class">
                  Class
                </label>
                <select
                  id="student-class"
                  className="form-input form-select"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  disabled={isLocked || loading}
                >
                  <option value="">Select</option>
                  {CLASS_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      Class {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="student-section">
                  Section
                </label>
                <select
                  id="student-section"
                  className="form-input form-select"
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  disabled={isLocked || loading}
                >
                  <option value="">Select</option>
                  {SECTION_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      Section {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Attempts remaining */}
            {!isLocked && attemptsLeft < 5 && (
              <p
                className="mb-lg"
                style={{
                  fontSize: "0.8125rem",
                  color: attemptsLeft <= 2 ? "var(--error)" : "var(--gray-500)",
                  textAlign: "center",
                  fontWeight: 500,
                }}
              >
                {attemptsLeft} attempt{attemptsLeft !== 1 ? "s" : ""} remaining
              </p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary btn-full login-submit"
              disabled={isLocked || loading}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ borderTopColor: "white", borderColor: "rgba(255,255,255,0.3)" }} />
                  Verifying...
                </>
              ) : (
                <>
                  Cast Your Vote
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div
          className="login-footer"
          style={{
            textAlign: "center",
            marginTop: "var(--space-xl)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-sm)",
          }}
        >
          <p style={{ fontSize: "0.8125rem", color: "var(--gray-500)" }}>
            Army Public School Bolarum
          </p>
          <a
            href="/admin/login"
            style={{
              fontSize: "0.8125rem",
              color: "var(--gray-400)",
              textDecoration: "underline",
              textUnderlineOffset: "3px",
            }}
          >
            Admin Access →
          </a>
        </div>
      </div>
    </div>
  );
}
