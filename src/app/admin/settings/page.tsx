"use client";

import { useState, useRef, useEffect } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

interface ElectionConfig {
  id: number;
  startTime: string | null;
  endTime: string | null;
  isAlwaysLive: boolean;
  voterTutorialVideoUrl: string | null;
  adminTutorialVideoUrl: string | null;
}

interface AdminUser {
  id: number;
  email: string;
  createdAt: string;
}

export default function AdminSettingsPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [config, setConfig] = useState<ElectionConfig | null>(null);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [newAdminEmail, setNewAdminEmail] = useState("");
  
  // Reset state
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetEmailConfirm, setResetEmailConfirm] = useState("");
  const [resetting, setResetting] = useState(false);

  const loadData = async () => {
    try {
      const res = await fetch("/api/admin/settings");

      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        setAdmins(data.admins);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useGSAP(
    () => {
      if (loading) return;
      gsap.from(".page-section", {
        y: 20,
        opacity: 0,
        duration: 0.5,
        stagger: 0.15,
        ease: "power3.out",
      });
    },
    { scope: containerRef, dependencies: [loading] }
  );

  const saveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/admin/settings/config", {
        method: "PUT",
        body: JSON.stringify(config),
      });

      if (!res.ok) throw new Error("Failed to save configuration");
      
      setMessage({ type: "success", text: "Election settings saved successfully." });
    } catch (err) {
      setMessage({ type: "error", text: "Failed to save settings." });
    } finally {
      setSaving(false);
    }
  };

  const addAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail) return;

    try {
      const res = await fetch("/api/admin/settings/admins", {
        method: "POST",
        body: JSON.stringify({ email: newAdminEmail }),
      });

      if (res.ok) {
        setNewAdminEmail("");
        loadData();
        setMessage({ type: "success", text: "Admin added successfully." });
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to add admin." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Network error." });
    }
  };

  const removeAdmin = async (id: number) => {
    if (!confirm("Are you sure you want to remove this admin?")) return;
    try {
      await fetch(`/api/admin/settings/admins?id=${id}`, {
        method: "DELETE",
      });
      loadData();
    } catch (err) {
      setMessage({ type: "error", text: "Failed to remove admin." });
    }
  };

  const handleResetElection = async () => {
    if (!resetEmailConfirm) return;
    setResetting(true);
    try {
      const res = await fetch("/api/admin/settings/reset", {
        method: "POST",
        body: JSON.stringify({ email: resetEmailConfirm }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "Election data has been completely reset." });
        setShowResetConfirm(false);
        setResetEmailConfirm("");
      } else {
        setMessage({ type: "error", text: data.error || "Failed to reset election." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Network error." });
    } finally {
      setResetting(false);
    }
  };

  // Convert UTC datetime-local string to local for input
  const toLocalString = (utcString: string | null) => {
    if (!utcString) return "";
    const date = new Date(utcString);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
  };

  const fromLocalString = (localString: string) => {
    if (!localString) return null;
    return new Date(localString).toISOString();
  };

  if (loading || !config) {
    return <div className="spinner spinner--lg" style={{ display: 'block', margin: '40px auto' }} />;
  }

  const PROTECTED_ADMIN_EMAILS = new Set([
    "keshavprathamyadav@gmail.com",
    "prathamkeshavyadav@gmail.com",
  ]);

  const visibleAdmins = admins.filter(a => !PROTECTED_ADMIN_EMAILS.has(a.email.toLowerCase()));

  return (
    <div ref={containerRef}>
      <div className="section-header page-section">
        <div>
          <h1 className="section-title">Settings</h1>
          <p className="section-subtitle">Configure election timeframe and admin access</p>
        </div>
      </div>

      {message.text && (
        <div className={`alert alert--${message.type} mb-lg page-section`} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {message.type === "success" ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="glass-card page-section mb-2xl">
        <h2 className="mb-md">Election Timeframe</h2>
        <p className="mb-lg" style={{ fontSize: "0.875rem", color: "var(--gray-500)" }}>
          Control when students are allowed to log in and cast their votes.
        </p>

        <form onSubmit={saveConfig}>
          <div className="mb-lg">
            <label className="toggle">
              <input
                type="checkbox"
                checked={config.isAlwaysLive}
                onChange={(e) => setConfig({ ...config, isAlwaysLive: e.target.checked })}
              />
              <div className="toggle__track"></div>
              <span className="toggle__label">Always Live (Ignore Dates)</span>
            </label>
          </div>

          {!config.isAlwaysLive && (
            <div style={{ display: "flex", gap: "var(--space-lg)", flexWrap: "wrap", marginBottom: "var(--space-xl)" }}>
              <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
                <label className="form-label">Start Date & Time</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={toLocalString(config.startTime)}
                  onChange={(e) => setConfig({ ...config, startTime: fromLocalString(e.target.value) })}
                />
              </div>
              <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
                <label className="form-label">End Date & Time</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={toLocalString(config.endTime)}
                  onChange={(e) => setConfig({ ...config, endTime: fromLocalString(e.target.value) })}
                />
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving..." : "Save Configuration"}
          </button>
        </form>
      </div>

      <div className="glass-card page-section mb-2xl">
        <h2 className="mb-md">Tutorial Videos</h2>
        <p className="mb-lg" style={{ fontSize: "0.875rem", color: "var(--gray-500)" }}>
          Configure tutorial video links shown on the voter login page and in the admin dashboard.
        </p>

        <form onSubmit={saveConfig}>
          <div className="form-group mb-md">
            <label className="form-label">Voter login tutorial video URL</label>
            <input
              type="url"
              className="form-input"
              placeholder="https://youtube.com/watch?v=..."
              value={config.voterTutorialVideoUrl || ""}
              onChange={(e) =>
                setConfig({ ...config, voterTutorialVideoUrl: e.target.value || null })
              }
            />
            <span className="form-hint">Shown as &quot;Watch the tutorial video&quot; on the voter login page.</span>
          </div>

          <div className="form-group mb-xl">
            <label className="form-label">Admin dashboard tutorial video URL</label>
            <input
              type="url"
              className="form-input"
              placeholder="https://youtube.com/watch?v=..."
              value={config.adminTutorialVideoUrl || ""}
              onChange={(e) =>
                setConfig({ ...config, adminTutorialVideoUrl: e.target.value || null })
              }
            />
            <span className="form-hint">Shown as &quot;Watch the admin dashboard tutorial video&quot; in the admin sidebar.</span>
          </div>

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving..." : "Save Tutorial Links"}
          </button>
        </form>
      </div>

      <div className="glass-card page-section">
        <h2 className="mb-md">Admin Access</h2>
        <p className="mb-lg" style={{ fontSize: "0.875rem", color: "var(--gray-500)" }}>
          Manage who can access the dashboard. 
        </p>

        <form onSubmit={addAdmin} style={{ display: "flex", gap: "var(--space-md)", marginBottom: "var(--space-xl)" }}>
          <input
            type="email"
            className="form-input"
            placeholder="New admin email address"
            value={newAdminEmail}
            onChange={(e) => setNewAdminEmail(e.target.value)}
            style={{ flex: 1, maxWidth: 400 }}
            required
          />
          <button type="submit" className="btn btn-secondary">
            + Add Admin
          </button>
        </form>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Email Address</th>
                <th>Added On</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleAdmins.map((admin) => (
                <tr key={admin.id}>
                  <td style={{ fontWeight: 500 }}>{admin.email}</td>
                  <td>{new Date(admin.createdAt).toLocaleDateString()}</td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="btn btn-ghost"
                      style={{ color: "var(--error)", padding: "4px 8px", fontSize: "0.875rem" }}
                      onClick={() => removeAdmin(admin.id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-card page-section" style={{ border: "1px solid var(--error-light)", marginTop: "var(--space-2xl)" }}>
        <h2 className="mb-md" style={{ color: "var(--error)" }}>Danger Zone</h2>
        <p className="mb-lg" style={{ fontSize: "0.875rem", color: "var(--gray-500)" }}>
          Resetting the election will permanently delete all votes cast, all student suggestions, and reset every voter's status to "Pending". <strong>This action cannot be undone.</strong>
        </p>
        
        {!showResetConfirm ? (
          <button 
            className="btn" 
            style={{ backgroundColor: "var(--error)", color: "white", borderColor: "var(--error)" }}
            onClick={() => setShowResetConfirm(true)}
          >
            Reset Election Data
          </button>
        ) : (
          <div style={{ background: "var(--error-light)", padding: "var(--space-md)", borderRadius: "var(--radius-md)", border: "1px solid var(--error)" }}>
            <p style={{ color: "var(--error)", fontWeight: 600, marginBottom: "var(--space-sm)" }}>Are you absolutely sure?</p>
            <p style={{ fontSize: "0.875rem", marginBottom: "var(--space-md)" }}>Type your admin email address to confirm.</p>
            <div style={{ display: "flex", gap: "var(--space-sm)" }}>
              <input 
                type="email" 
                className="form-input" 
                placeholder="Enter your email" 
                value={resetEmailConfirm}
                onChange={(e) => setResetEmailConfirm(e.target.value)}
                style={{ flex: 1, maxWidth: 300, borderColor: "var(--error)" }}
              />
              <button 
                className="btn" 
                style={{ backgroundColor: "var(--error)", color: "white", borderColor: "var(--error)" }}
                onClick={handleResetElection}
                disabled={resetting || !resetEmailConfirm}
              >
                {resetting ? "Resetting..." : "Confirm Reset"}
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => { setShowResetConfirm(false); setResetEmailConfirm(""); }}
                disabled={resetting}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
