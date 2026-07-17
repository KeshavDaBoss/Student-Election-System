"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { parseStudentCSV } from "@/lib/csv";

gsap.registerPlugin(useGSAP);

interface Voter {
  id: number;
  name: string;
  electionNumber: string;
  class: string;
  section: string;
  hasVoted: boolean;
  votedAt: string | null;
}

const CLASS_OPTIONS = ["6", "7", "8", "9", "10", "11", "12"];
const SECTION_OPTIONS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"];

export default function AdminVotersPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [voters, setVoters] = useState<Voter[]>([]);
  const [loading, setLoading] = useState(true);
  
  // CSV Upload State
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Manual CRUD Modals
  const [showModal, setShowModal] = useState(false);
  const [editingVoter, setEditingVoter] = useState<Partial<Voter> | null>(null);

  const fetchVoters = useCallback(async (p = page, s = search) => {
    setLoading(true);
    try {
      const url = new URL("/api/admin/voters", window.location.origin);
      url.searchParams.set("page", p.toString());
      if (s) url.searchParams.set("search", s);

      const res = await fetch(url.toString());

      if (res.ok) {
        const data = await res.json();
        setVoters(data.voters);
        setTotalPages(data.totalPages);
        setTotalCount(data.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  const exportCsv = useCallback(() => {
    try {
      const url = new URL("/api/admin/voters", window.location.origin);
      url.searchParams.set("format", "csv");
      if (search) url.searchParams.set("search", search);
      window.location.href = url.toString();
    } catch (err) {
      console.error(err);
    }
  }, [search]);

  useEffect(() => {
    fetchVoters(page, search);
  }, [page, fetchVoters, search]);

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

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    setUploadError("");
    setUploadSuccess("");
    
    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      setUploadError("Please upload a valid CSV file.");
      return;
    }

    const text = await file.text();
    const result = parseStudentCSV(text);

    if (!result.success) {
      setUploadError(`Failed to parse CSV. Found ${result.errors.length} errors. First error: ${result.errors[0]}`);
      return;
    }

    setUploading(true);

    try {
      const res = await fetch("/api/admin/voters", {
        method: "POST",
        body: JSON.stringify({ students: result.data }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to upload voters.");

      setUploadSuccess(`Successfully uploaded ${data.count} voters.`);
      fetchVoters(1, search);
      setPage(1);
      
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const saveVoter = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingVoter) return;

    const formData = new FormData(e.currentTarget);
    const data = {
      id: editingVoter.id,
      name: formData.get("name"),
      electionNumber: formData.get("electionNumber"),
      class: formData.get("class"),
      section: formData.get("section"),
    };

    try {
      const isEdit = !!data.id;
      
      const res = await fetch("/api/admin/voters", {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify(isEdit ? data : { student: data }),
      });

      const result = await res.json();
      if (!res.ok) {
        alert(result.error || "Failed to save voter");
        return;
      }

      setShowModal(false);
      fetchVoters();
    } catch (err) {
      console.error(err);
      alert("Network error.");
    }
  };

  const deleteVoter = async (id: number) => {
    if (!confirm("Are you sure you want to delete this voter?")) return;
    try {
      await fetch(`/api/admin/voters?id=${id}`, {
        method: "DELETE",
      });
      fetchVoters();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div ref={containerRef}>
      <div className="section-header page-section">
        <div>
          <h1 className="section-title">Voter Management</h1>
          <p className="section-subtitle">Manage registered voters</p>
        </div>
      </div>

      {/* CSV Upload Section */}
      <div className="glass-card page-section mb-2xl">
        <h3 className="mb-md">Import Voters (CSV)</h3>
        <p className="mb-lg" style={{ fontSize: "0.875rem", color: "var(--gray-500)" }}>
          CSV should have columns: <strong>name, number, class, section</strong> (in that order).
          Uploading will add new voters and update existing ones.
        </p>

        {uploadError && (
          <div className="alert alert--error mb-md" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{uploadError}</span>
          </div>
        )}

        {uploadSuccess && (
          <div className="alert alert--success mb-md" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <span>{uploadSuccess}</span>
          </div>
        )}

        <div
          className={`upload-zone ${dragActive ? "upload-zone--active" : ""}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            style={{ display: "none" }}
            onChange={handleChange}
          />
          {uploading ? (
            <div>
              <div className="spinner spinner--lg mb-md" />
              <p className="upload-zone__text">Processing CSV...</p>
            </div>
          ) : (
            <>
              <div className="upload-zone__icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="12" y1="18" x2="12" y2="12"></line>
                  <line x1="9" y1="15" x2="15" y2="15"></line>
                </svg>
              </div>
              <p className="upload-zone__text">Click or drag CSV file to upload</p>
              <p className="upload-zone__hint">.csv files only</p>
            </>
          )}
        </div>
      </div>

      {/* Voters List Section */}
      <div className="glass-card page-section">
        <div className="section-header" style={{ marginBottom: "var(--space-lg)", flexWrap: "wrap", gap: "var(--space-md)" }}>
          <h3 style={{ margin: 0 }}>Voters List ({totalCount})</h3>
          
          <div style={{ display: "flex", gap: "var(--space-md)", alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search by name or EN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "250px", padding: "10px 14px" }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setPage(1);
                  fetchVoters(1, search);
                }
              }}
            />
            <button 
              className="btn btn-secondary" 
              style={{ padding: "10px 16px" }}
              onClick={() => { setPage(1); fetchVoters(1, search); }}
            >
              Search
            </button>
            <button
              className="btn btn-secondary"
              style={{ padding: "10px 16px" }}
              onClick={exportCsv}
            >
              Export CSV
            </button>
            <button 
              className="btn btn-primary" 
              style={{ padding: "10px 16px" }}
              onClick={() => {
                setEditingVoter({ class: "6", section: "A" });
                setShowModal(true);
              }}
            >
              + Add Voter
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "var(--space-2xl)" }}>
            <div className="spinner" />
          </div>
        ) : voters.length > 0 ? (
          <>
            <div className="table-container mb-md">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Election No.</th>
                    <th>Class</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {voters.map((voter) => (
                    <tr key={voter.id}>
                      <td style={{ fontWeight: 500 }}>{voter.name}</td>
                      <td style={{ fontFamily: "monospace", letterSpacing: "1px" }}>{voter.electionNumber}</td>
                      <td>{voter.class}-{voter.section}</td>
                      <td>
                        {voter.hasVoted ? (
                          <span className="badge badge--success">Voted</span>
                        ) : (
                          <span className="badge badge--warning">Pending</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button 
                          className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: "0.875rem" }}
                          onClick={() => { setEditingVoter(voter); setShowModal(true); }}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: "0.875rem", color: "var(--error)" }}
                          onClick={() => deleteVoter(voter.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                className="btn btn-ghost"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                ← Previous
              </button>
              <span style={{ fontSize: "0.875rem", color: "var(--gray-500)" }}>
                Page {page} of {totalPages || 1}
              </span>
              <button
                className="btn btn-ghost"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next →
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "var(--space-2xl)", color: "var(--gray-500)" }}>
            No voters found.
          </div>
        )}
      </div>

      {/* Manual Voter Modal */}
      {showModal && editingVoter && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="mb-lg">{editingVoter.id ? "Edit Voter" : "New Voter"}</h2>
            <form onSubmit={saveVoter}>
              <div className="form-group mb-md" style={{ textAlign: "left" }}>
                <label className="form-label">Full Name</label>
                <input name="name" className="form-input" defaultValue={editingVoter.name || ""} required />
              </div>
              <div className="form-group mb-md" style={{ textAlign: "left" }}>
                <label className="form-label">Election Number</label>
                <input 
                  name="electionNumber" 
                  className="form-input" 
                  defaultValue={editingVoter.electionNumber || ""} 
                  maxLength={6}
                  placeholder="e.g. A3x9Kp"
                  required 
                  style={{ fontFamily: "monospace", letterSpacing: "1px" }}
                />
              </div>
              <div style={{ display: "flex", gap: "var(--space-md)" }} className="mb-xl">
                <div className="form-group" style={{ flex: 1, textAlign: "left" }}>
                  <label className="form-label">Class</label>
                  <select name="class" className="form-input form-select" defaultValue={editingVoter.class || "6"} required>
                    {CLASS_OPTIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1, textAlign: "left" }}>
                  <label className="form-label">Section</label>
                  <select name="section" className="form-input form-select" defaultValue={editingVoter.section || "A"} required>
                    {SECTION_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Voter</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
