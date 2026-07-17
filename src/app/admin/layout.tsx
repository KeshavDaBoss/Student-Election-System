"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";

const NAV_ITEMS = [
  {
    href: "/admin",
    label: "Overview",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    href: "/admin/candidates",
    label: "Candidates",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    href: "/admin/voters",
    label: "Voters",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      </svg>
    ),
  },
  {
    href: "/admin/analytics",
    label: "Analytics",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l-.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 00.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const [authorized, setAuthorized] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminRole, setAdminRole] = useState("");
  const [checking, setChecking] = useState(true);

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage) {
      setChecking(false);
      setAuthorized(true);
      return;
    }

    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }

    async function checkAdmin() {
      try {
        const res = await fetch("/api/admin/me");

        if (res.ok) {
          const data = await res.json();
          setAdminEmail(data.email);
          setAdminRole(data.role);
          setAuthorized(true);
        } else {
          setAuthorized(false);
        }
      } catch {
        setAuthorized(false);
      } finally {
        setChecking(false);
      }
    }

    checkAdmin();
  }, [isLoginPage, isSignedIn, router]);

  if (checking) {
    return (
      <div className="page-wrapper">
        <div className="spinner spinner--lg" />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="page-wrapper">
        <div className="center-card glass-card" style={{ textAlign: "center" }}>
          <h2>Access Denied</h2>
          <p style={{ color: "var(--gray-500)", marginTop: "var(--space-sm)" }}>
            This login is not authorised to access the admin dashboard.
          </p>
        </div>
      </div>
    );
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  const handleLogout = () => {
    router.push("/sign-in");
  };

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="sidebar__logo">
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "var(--radius-sm)",
              background: "linear-gradient(135deg, var(--orange-400), var(--orange-700))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
          </div>
          SES Admin
        </div>

        <nav className="sidebar__nav">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar__link ${isActive ? "sidebar__link--active" : ""}`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ marginTop: "auto", paddingTop: "var(--space-lg)" }}>
          {adminEmail && (
            <div
              style={{
                padding: "var(--space-sm) var(--space-md)",
                marginBottom: "var(--space-sm)",
                borderRadius: "var(--radius-sm)",
                background: "var(--gray-100)",
                border: "1px solid var(--gray-200)",
              }}
            >
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--gray-500)",
                  marginBottom: "2px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Signed in as
              </div>
              <div
                style={{
                  fontSize: "0.8125rem",
                  color: "var(--gray-900)",
                  fontWeight: 500,
                  wordBreak: "break-all",
                }}
              >
                {adminEmail}
              </div>
              {adminRole === "superadmin" && (
                <div
                  style={{
                    fontSize: "0.6875rem",
                    color: "var(--orange-600)",
                    fontWeight: 600,
                    marginTop: "2px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Super Admin
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleLogout}
            className="sidebar__link"
            style={{
              width: "100%",
              border: "none",
              background: "none",
              cursor: "pointer",
              color: "var(--gray-500)",
              fontFamily: "var(--font-heading)",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Logout
          </button>
        </div>
      </aside>

      <main className="admin-main">{children}</main>
    </div>
  );
}