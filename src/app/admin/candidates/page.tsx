"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

interface Candidate {
  id: number;
  name: string;
  positionId: number;
  class?: string;
  section?: string;
}

interface Position {
  id: number;
  title: string;
  numWinners: number;
  isActive: boolean;
  displayOrder: number;
  candidates: Candidate[];
}

export default function AdminCandidatesPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modals state
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | { positionId: number } | null>(null);
  const [showCandidateModal, setShowCandidateModal] = useState(false);

  const fetchPositions = useCallback(async () => {
    setLoading(true);
    try {
      const token = document.cookie
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith("ses_admin_token="))
        ?.split("=")[1];

      const res = await fetch("/api/admin/candidates", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setPositions(await res.json());
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load positions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  useGSAP(
    () => {
      gsap.from(".page-section", {
        y: 20,
        opacity: 0,
        duration: 0.5,
        stagger: 0.15,
        ease: "power3.out",
      });
    },
    { scope: containerRef }
  );

  const savePosition = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingPosition) return;
    
    const formData = new FormData(e.currentTarget);
    const data = {
      id: editingPosition.id,
      title: formData.get("title"),
      numWinners: parseInt(formData.get("numWinners") as string, 10),
      isActive: formData.get("isActive") === "true",
      displayOrder: parseInt(formData.get("displayOrder") as string, 10),
    };

    try {
      const token = document.cookie.split(";").map(c => c.trim()).find(c => c.startsWith("ses_admin_token="))?.split("=")[1];
      await fetch("/api/admin/candidates/positions", {
        method: data.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      setShowPositionModal(false);
      fetchPositions();
    } catch (err) {
      console.error(err);
    }
  };

  const saveCandidate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingCandidate) return;

    const formData = new FormData(e.currentTarget);
    const data = {
      id: (editingCandidate as Candidate).id,
      positionId: editingCandidate.positionId,
      name: formData.get("name"),
      class: formData.get("class"),
      section: formData.get("section"),
    };

    try {
      const token = document.cookie.split(";").map(c => c.trim()).find(c => c.startsWith("ses_admin_token="))?.split("=")[1];
      await fetch("/api/admin/candidates", {
        method: data.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      setShowCandidateModal(false);
      fetchPositions();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteCandidate = async (id: number) => {
    if (!confirm("Are you sure you want to delete this candidate?")) return;
    try {
      const token = document.cookie.split(";").map(c => c.trim()).find(c => c.startsWith("ses_admin_token="))?.split("=")[1];
      await fetch(`/api/admin/candidates?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchPositions();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="spinner spinner--lg" style={{ display: 'block', margin: '40px auto' }} />;
  }

  return (
    <div ref={containerRef}>
      <div className="section-header page-section">
        <div>
          <h1 className="section-title">Candidates & Positions</h1>
          <p className="section-subtitle">Manage election positions and nominees</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => {
            setEditingPosition({ id: 0, title: "", numWinners: 1, isActive: true, displayOrder: positions.length + 1, candidates: [] });
            setShowPositionModal(true);
          }}
        >
          + Add Position
        </button>
      </div>

      {error && <div className="alert alert--error mb-md">{error}</div>}

      <div className="page-section">
        {positions.map((position) => (
          <div key={position.id} className="glass-card mb-xl">
            <div className="section-header" style={{ marginBottom: "var(--space-md)" }}>
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {position.title}
                  {!position.isActive && <span className="badge badge--warning">Inactive</span>}
                </h3>
                <p style={{ fontSize: "0.875rem", color: "var(--gray-500)", marginTop: "4px" }}>
                  {position.numWinners} {position.numWinners === 1 ? "Winner" : "Winners"} • {position.candidates.length} Candidates
                </p>
              </div>
              <div style={{ display: "flex", gap: "var(--space-sm)" }}>
                <button 
                  className="btn btn-secondary" style={{ padding: "8px 16px" }}
                  onClick={() => { setEditingPosition(position); setShowPositionModal(true); }}
                >
                  Edit Position
                </button>
                <button 
                  className="btn btn-primary" style={{ padding: "8px 16px" }}
                  onClick={() => { setEditingCandidate({ positionId: position.id }); setShowCandidateModal(true); }}
                >
                  + Add Candidate
                </button>
              </div>
            </div>

            {position.candidates.length > 0 ? (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Class & Section</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {position.candidates.map((c) => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 500 }}>{c.name}</td>
                        <td>{c.class ? `${c.class}-${c.section}` : "-"}</td>
                        <td style={{ textAlign: "right" }}>
                          <button 
                            className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: "0.875rem" }}
                            onClick={() => { setEditingCandidate(c); setShowCandidateModal(true); }}
                          >
                            Edit
                          </button>
                          <button 
                            className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: "0.875rem", color: "var(--error)" }}
                            onClick={() => deleteCandidate(c.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: "var(--space-lg)", textAlign: "center", background: "var(--gray-50)", borderRadius: "var(--radius-md)" }}>
                <p style={{ color: "var(--gray-500)", fontSize: "0.875rem" }}>No candidates added yet.</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Position Modal */}
      {showPositionModal && editingPosition && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="mb-lg">{editingPosition.id ? "Edit Position" : "New Position"}</h2>
            <form onSubmit={savePosition}>
              <div className="form-group mb-md" style={{ textAlign: "left" }}>
                <label className="form-label">Position Title</label>
                <input name="title" className="form-input" defaultValue={editingPosition.title} required />
              </div>
              <div className="form-group mb-md" style={{ textAlign: "left" }}>
                <label className="form-label">Number of Winners (RCV)</label>
                <input name="numWinners" type="number" min="1" className="form-input" defaultValue={editingPosition.numWinners} required />
              </div>
              <div className="form-group mb-md" style={{ textAlign: "left" }}>
                <label className="form-label">Display Order</label>
                <input name="displayOrder" type="number" className="form-input" defaultValue={editingPosition.displayOrder} required />
              </div>
              <div className="form-group mb-xl" style={{ textAlign: "left" }}>
                <label className="form-label">Status</label>
                <select name="isActive" className="form-input form-select" defaultValue={editingPosition.isActive.toString()}>
                  <option value="true">Active (Visible)</option>
                  <option value="false">Inactive (Hidden)</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPositionModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Position</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Candidate Modal */}
      {showCandidateModal && editingCandidate && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="mb-lg">{(editingCandidate as Candidate).id ? "Edit Candidate" : "New Candidate"}</h2>
            <form onSubmit={saveCandidate}>
              <div className="form-group mb-md" style={{ textAlign: "left" }}>
                <label className="form-label">Full Name</label>
                <input name="name" className="form-input" defaultValue={(editingCandidate as Candidate).name || ""} required />
              </div>
              <div style={{ display: "flex", gap: "var(--space-md)" }} className="mb-xl">
                <div className="form-group" style={{ flex: 1, textAlign: "left" }}>
                  <label className="form-label">Class</label>
                  <input name="class" className="form-input" defaultValue={(editingCandidate as Candidate).class || ""} />
                </div>
                <div className="form-group" style={{ flex: 1, textAlign: "left" }}>
                  <label className="form-label">Section</label>
                  <input name="section" className="form-input" defaultValue={(editingCandidate as Candidate).section || ""} />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCandidateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Candidate</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
