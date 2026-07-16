"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

// Class options for APS Bolarum
const CLASS_OPTIONS = ["6", "7", "8", "9", "10", "11", "12"];
const SECTION_OPTIONS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"];

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

  // Fetch initial rate limit status on mount
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/auth/login/status");
        if (res.ok) {
          const data = await res.json();
          if (data.isLocked) {
            setLockedUntil(data.lockedUntil);
            setError(`Too many failed attempts. Try again in ${data.lockedUntil}`); // timer will update this immediately
          }
          setAttemptsLeft(data.attemptsLeft);
        }
      } catch (err) {
        console.error("Failed to fetch rate limit status", err);
      }
    };
    fetchStatus();
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");

      // Client-side validation
      if (!electionNumber || !selectedClass || !selectedSection) {
        setError("Please fill in all fields.");
        return;
      }

      if (!/^[0-9A-Za-z]{6}$/.test(electionNumber)) {
        setError("Invalid Election Number format (must be 6 alphanumeric characters).");
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

        if (res.status === 401) {
          setError(data.error || "Invalid credentials.");
          if (data.attemptsLeft !== undefined) {
            setAttemptsLeft(data.attemptsLeft);
          }
        } else if (res.status === 429) {
          setError(data.error || "Too many attempts.");
          if (data.lockedUntil) {
            setLockedUntil(data.lockedUntil);
            setAttemptsLeft(0);
          }
        } else if (!res.ok) {
          setError(data.error || "An error occurred during login.");
        } else {
          // Success — store token and redirect
          document.cookie = `ses_token=${data.token}; path=/; max-age=3600; SameSite=Strict`;

          router.push("/vote");
        }

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
            <div className="alert alert--error mb-lg" role="alert" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Rate Limit Warning */}
          {isLocked && (
            <div className="countdown mb-lg" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
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
                      {c}
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
                      {s}
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

      </div>
    </div>
  );
}
