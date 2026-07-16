"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: "Authorization code missing. Please try again.",
  oauth_failed: "Google authentication failed. Please try again.",
  no_id_token: "Invalid response from Google. Please try again.",
  invalid_google_token: "Google token verification failed. Please try again.",
  not_authorized: "This email is not authorized for admin access.",
  server_error: "Server error during authentication. Please try again.",
};

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const oauthError = searchParams.get("error");
    if (oauthError && ERROR_MESSAGES[oauthError]) {
      setError(ERROR_MESSAGES[oauthError]);
    }
  }, [searchParams]);

  const handleGoogleLogin = useCallback(() => {
    setLoading(true);
    setError("");
    window.location.href = "/api/auth/admin/oauth";
  }, []);

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
            Sign in with your Google account to access the dashboard
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

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="btn btn-full"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              border: "1px solid var(--gray-700)",
              background: "transparent",
              color: "#ffffff",
              fontWeight: 500,
              fontSize: "1rem",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ borderTopColor: "white", borderColor: "rgba(255,255,255,0.3)" }} />
                Redirecting to Google...
              </>
            ) : (
              "Sign in with Google"
            )}
          </button>
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