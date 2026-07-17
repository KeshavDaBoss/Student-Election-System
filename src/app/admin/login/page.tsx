"use client";

import { SignInButton } from "@clerk/nextjs";
import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/admin");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <div className="page-wrapper">
        <div className="spinner spinner--lg" />
      </div>
    );
  }

  if (isSignedIn) {
    return (
      <div className="page-wrapper">
        <div className="center-card glass-card" style={{ textAlign: "center" }}>
          <h2>Redirecting...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
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
            Sign in with your account to access the dashboard
          </p>

          <SignInButton mode="modal">
            <button
              type="button"
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
              }}
            >
              Sign in to continue
            </button>
          </SignInButton>
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
