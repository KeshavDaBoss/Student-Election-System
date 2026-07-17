"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  const router = useRouter();
  const [denied, setDenied] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    try {
      const flag = window.sessionStorage.getItem("admin_access_denied");
      if (flag === "true") {
        setDenied(true);
      }
    } catch {
      // ignore storage errors
    } finally {
      setChecking(false);
    }
  }, []);

  if (checking) {
    return (
      <div className="page-wrapper">
        <div className="spinner spinner--lg" />
      </div>
    );
  }

  if (denied) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
        <div className="center-card glass-card" style={{ textAlign: "center", maxWidth: 420 }}>
          <h2 style={{ marginBottom: "var(--space-sm)" }}>Access Blocked</h2>
          <p style={{ color: "var(--gray-500)", marginBottom: "var(--space-lg)" }}>
            This login is not authorised to access the admin dashboard. This restriction applies to this browser session.
          </p>
          <button
            className="btn btn-secondary"
            onClick={() => {
              try {
                window.sessionStorage.removeItem("admin_access_denied");
              } catch {
                // ignore
              }
              setDenied(false);
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
      <SignIn
        appearance={{
          elements: {
            footer: { display: "none" },
            footerAction: { display: "none" },
            poweredByFooter: { display: "none" },
            devModeBanner: { display: "none" },
          },
        }}
      />
    </div>
  );
}
