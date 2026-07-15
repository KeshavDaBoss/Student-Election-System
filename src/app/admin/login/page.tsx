"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export default function AdminLoginPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".admin-logo", { y: -20, opacity: 0, duration: 0.7 })
        .from(".admin-title", { y: 15, opacity: 0, duration: 0.5 }, "-=0.3")
        .from(".form-group", { y: 20, opacity: 0, duration: 0.5, stagger: 0.1 }, "-=0.2")
        .from(".admin-submit", { y: 15, opacity: 0, duration: 0.4 }, "-=0.1");
    },
    { scope: containerRef }
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");

      if (!email || !email.includes("@")) {
        setError("Please enter a valid email address.");
        gsap.to(formRef.current, {
          x: [-8, 8, -6, 6, -3, 3, 0],
          duration: 0.4,
        });
        return;
      }

      setLoading(true);

      try {
        const res = await fetch("/api/auth/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Access denied.");
          gsap.to(formRef.current, {
            x: [-8, 8, -6, 6, -3, 3, 0],
            duration: 0.4,
          });
          return;
        }

        // Store admin token
        document.cookie = `ses_admin_token=${data.token}; path=/; max-age=28800; SameSite=Strict`;

        gsap.to(containerRef.current, {
          opacity: 0,
          y: -10,
          duration: 0.3,
          onComplete: () => router.push("/admin"),
        });
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [email, router]
  );

  return (
    <div className="page-wrapper" ref={containerRef}>
      <div className="center-card">
        <div
          className="admin-logo"
          style={{ textAlign: "center", marginBottom: "var(--space-xl)" }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "var(--radius-lg)",
              background: "linear-gradient(135deg, var(--gray-800), var(--gray-900))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto",
              boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>

        <div className="glass-card">
          <h1
            className="admin-title"
            style={{ textAlign: "center", fontSize: "1.5rem", marginBottom: "var(--space-xs)" }}
          >
            Admin Access
          </h1>
          <p
            style={{
              textAlign: "center",
              fontSize: "0.875rem",
              color: "var(--gray-500)",
              marginBottom: "var(--space-2xl)",
            }}
          >
            Enter your authorized admin email
          </p>

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

          <form ref={formRef} onSubmit={handleSubmit}>
            <div className="form-group mb-xl">
              <label className="form-label" htmlFor="admin-email">
                Email Address
              </label>
              <input
                id="admin-email"
                type="email"
                className="form-input"
                placeholder="admin@school.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full admin-submit"
              disabled={loading}
              style={{ background: "linear-gradient(135deg, var(--gray-800), var(--gray-900))" }}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ borderTopColor: "white", borderColor: "rgba(255,255,255,0.3)" }} />
                  Verifying...
                </>
              ) : (
                "Access Dashboard"
              )}
            </button>
          </form>
        </div>

        <div style={{ textAlign: "center", marginTop: "var(--space-xl)" }}>
          <a
            href="/"
            style={{ fontSize: "0.8125rem", color: "var(--gray-400)" }}
          >
            ← Back to Voter Login
          </a>
        </div>
      </div>
    </div>
  );
}
