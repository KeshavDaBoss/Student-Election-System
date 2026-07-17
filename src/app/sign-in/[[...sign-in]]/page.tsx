"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showUnauthorized, setShowUnauthorized] = useState(false);

  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "unauthorized") {
      setShowUnauthorized(true);
    }
  }, [searchParams]);

  const dismissUnauthorized = () => {
    setShowUnauthorized(false);
    router.replace("/sign-in", { scroll: false });
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 420, padding: "0 16px" }}>
        {showUnauthorized && (
          <div
            className="alert alert--error mb-lg"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              marginBottom: "var(--space-lg)",
              textAlign: "left",
            }}
            role="alert"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0, marginTop: "2px" }}
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, margin: 0, fontSize: "0.9rem" }}>
                This email isn&apos;t authorized to access the Admin Dashboard.
              </p>
              <button
                type="button"
                onClick={dismissUnauthorized}
                style={{
                  background: "none",
                  border: "none",
                  color: "inherit",
                  textDecoration: "underline",
                  cursor: "pointer",
                  padding: 0,
                  marginTop: "6px",
                  fontSize: "0.8rem",
                  opacity: 0.9,
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

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
    </div>
  );
}
