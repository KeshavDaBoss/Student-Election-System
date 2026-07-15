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

  const loadData = async () => {
    try {
      const token = document.cookie
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith("ses_admin_token="))
        ?.split("=")[1];

      const res = await fetch("/api/admin/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });

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
      const token = document.cookie.split(";").map(c => c.trim()).find(c => c.startsWith("ses_admin_token="))?.split("=")[1];
      
      const res = await fetch("/api/admin/settings/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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
      const token = document.cookie.split(";").map(c => c.trim()).find(c => c.startsWith("ses_admin_token="))?.split("=")[1];
      const res = await fetch("/api/admin/settings/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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
      const token = document.cookie.split(";").map(c => c.trim()).find(c => c.startsWith("ses_admin_token="))?.split("=")[1];
      await fetch(`/api/admin/settings/admins?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      loadData();
    } catch (err) {
      setMessage({ type: "error", text: "Failed to remove admin." });
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

  return (
    <div ref={containerRef}>
      <div className="section-header page-section">
        <div>
          <h1 className="section-title">Settings</h1>
          <p className="section-subtitle">Configure election timeframe and admin access</p>
        </div>
      </div>

      {message.text && (
        <div className={`alert alert--${message.type} mb-lg page-section`}>
          <span>{message.type === "success" ? "✓" : "⚠️"}</span>
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
              {admins.map((admin) => (
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
    </div>
  );
}
