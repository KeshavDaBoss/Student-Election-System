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

  const fetchVoters = useCallback(async (p = page, s = search) => {
    setLoading(true);
    try {
      const token = document.cookie
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith("ses_admin_token="))
        ?.split("=")[1];

      const url = new URL("/api/admin/voters", window.location.origin);
      url.searchParams.set("page", p.toString());
      if (s) url.searchParams.set("search", s);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

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

  useEffect(() => {
    fetchVoters(page, search);
  }, [page, fetchVoters, search]);

  // Entrance animation
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
      const token = document.cookie
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith("ses_admin_token="))
        ?.split("=")[1];

      const res = await fetch("/api/admin/voters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ students: result.data }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to upload voters.");
      }

      setUploadSuccess(`Successfully uploaded ${data.count} voters.`);
      fetchVoters(1, search);
      setPage(1);
      
      // Clear input
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div ref={containerRef}>
      <div className="section-header page-section">
        <div>
          <h1 className="section-title">Voter Management</h1>
          <p className="section-subtitle">Upload and manage registered voters</p>
        </div>
      </div>

      {/* CSV Upload Section */}
      <div className="glass-card page-section mb-2xl">
        <h3 className="mb-md">Import Voters (CSV)</h3>
        <p className="mb-lg" style={{ fontSize: "0.875rem", color: "var(--gray-500)" }}>
          CSV should have columns: <strong>Name, Election Number, Class, Section</strong> (in that order).
          Uploading will add new voters and update existing ones (based on Election Number).
        </p>

        {uploadError && (
          <div className="alert alert--error mb-md">
            <span>⚠️</span>
            <span>{uploadError}</span>
          </div>
        )}

        {uploadSuccess && (
          <div className="alert alert--success mb-md">
            <span>✓</span>
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
              <div className="upload-zone__icon">📄</div>
              <p className="upload-zone__text">Click or drag CSV file to upload</p>
              <p className="upload-zone__hint">.csv files only</p>
            </>
          )}
        </div>
      </div>

      {/* Voters List Section */}
      <div className="glass-card page-section">
        <div className="section-header" style={{ marginBottom: "var(--space-lg)" }}>
          <h3 style={{ margin: 0 }}>Voters List ({totalCount})</h3>
          
          <div style={{ display: "flex", gap: "var(--space-md)", alignItems: "center" }}>
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
    </div>
  );
}
