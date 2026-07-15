"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

gsap.registerPlugin(useGSAP);

interface CandidateData {
  id: number;
  name: string;
  class?: string;
  section?: string;
}

interface PositionData {
  id: number;
  title: string;
  description?: string;
  candidates: CandidateData[];
}

interface VoterInfo {
  name: string;
  class: string;
  section: string;
}

// --- Sortable Candidate Card ---
function SortableCandidate({
  candidate,
  rank,
}: {
  candidate: CandidateData;
  rank: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: candidate.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : "auto" as const,
  };

  const getRankClass = (r: number) => {
    if (r === 1) return "rank-badge rank-badge--1";
    if (r === 2) return "rank-badge rank-badge--2";
    if (r === 3) return "rank-badge rank-badge--3";
    return "rank-badge rank-badge--default";
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`candidate-card ${isDragging ? "dragging" : ""}`}
      {...attributes}
      {...listeners}
    >
      <div className="candidate-card__drag-handle">
        <span />
        <span />
        <span />
      </div>
      <div className={getRankClass(rank)}>{rank}</div>
      <div className="candidate-card__info">
        <div className="candidate-card__name">{candidate.name}</div>
        {candidate.class && (
          <div className="candidate-card__detail">
            Class {candidate.class}
            {candidate.section ? ` – Section ${candidate.section}` : ""}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Position Ranking Section ---
function PositionRanking({
  position,
  rankings,
  onRankingsChange,
}: {
  position: PositionData;
  rankings: number[];
  onRankingsChange: (positionId: number, rankings: number[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const orderedCandidates = rankings
    .map((id) => position.candidates.find((c) => c.id === id))
    .filter(Boolean) as CandidateData[];

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = rankings.indexOf(active.id as number);
      const newIndex = rankings.indexOf(over.id as number);
      const newRankings = arrayMove(rankings, oldIndex, newIndex);
      onRankingsChange(position.id, newRankings);
    }
  }

  return (
    <div className="position-section mb-2xl">
      <h3 style={{ marginBottom: "var(--space-xs)" }}>{position.title}</h3>
      {position.description && (
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--gray-500)",
            marginBottom: "var(--space-lg)",
          }}
        >
          {position.description}
        </p>
      )}
      <p
        style={{
          fontSize: "0.8125rem",
          color: "var(--gray-400)",
          marginBottom: "var(--space-md)",
          fontStyle: "italic",
        }}
      >
        Drag to reorder. Top = 1st choice.
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={rankings} strategy={verticalListSortingStrategy}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
            {orderedCandidates.map((candidate, index) => (
              <SortableCandidate
                key={candidate.id}
                candidate={candidate}
                rank={index + 1}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

// --- Main Voting Page ---
export default function VotePage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const [voterInfo, setVoterInfo] = useState<VoterInfo | null>(null);
  const [positions, setPositions] = useState<PositionData[]>([]);
  const [rankings, setRankings] = useState<Record<number, number[]>>({});
  const [suggestions, setSuggestions] = useState<
    { candidateId: number; suggestedPosition: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showGreeting, setShowGreeting] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");

  // Load voter info and positions
  useEffect(() => {
    async function load() {
      try {
        // Get token from cookie
        const token = document.cookie
          .split(";")
          .map((c) => c.trim())
          .find((c) => c.startsWith("ses_token="))
          ?.split("=")[1];

        if (!token) {
          router.push("/");
          return;
        }

        // Fetch positions and candidates
        const res = await fetch("/api/vote", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            router.push("/");
            return;
          }
          throw new Error("Failed to load data");
        }

        const data = await res.json();
        setVoterInfo(data.voter);
        setPositions(data.positions);

        // Initialize rankings (default order)
        const initialRankings: Record<number, number[]> = {};
        for (const pos of data.positions) {
          initialRankings[pos.id] = pos.candidates.map(
            (c: CandidateData) => c.id
          );
        }
        setRankings(initialRankings);
      } catch {
        setError("Failed to load election data.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  // Greeting animation
  useGSAP(
    () => {
      if (!showGreeting || !voterInfo) return;

      const tl = gsap.timeline();
      tl.from(".greeting__wave", {
        scale: 0,
        rotation: -30,
        duration: 0.6,
        ease: "back.out(1.7)",
      })
        .from(
          ".greeting__text",
          { y: 20, opacity: 0, duration: 0.5 },
          "-=0.2"
        )
        .from(
          ".greeting__sub",
          { y: 15, opacity: 0, duration: 0.4 },
          "-=0.2"
        );

      // Auto-dismiss after 2.5 seconds
      const timeout = setTimeout(() => {
        gsap.to(".greeting", {
          y: -20,
          opacity: 0,
          duration: 0.4,
          onComplete: () => setShowGreeting(false),
        });
      }, 2500);

      return () => clearTimeout(timeout);
    },
    { scope: containerRef, dependencies: [voterInfo, showGreeting] }
  );

  // Content entrance animation
  useGSAP(
    () => {
      if (showGreeting || loading) return;

      gsap.from(".position-section", {
        y: 30,
        opacity: 0,
        duration: 0.6,
        stagger: 0.15,
        ease: "power3.out",
      });

      gsap.from(".vote-submit-area", {
        y: 20,
        opacity: 0,
        duration: 0.5,
        delay: 0.4,
        ease: "power3.out",
      });
    },
    { scope: containerRef, dependencies: [showGreeting, loading] }
  );

  const handleRankingsChange = useCallback(
    (positionId: number, newRankings: number[]) => {
      setRankings((prev) => ({ ...prev, [positionId]: newRankings }));
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setError("");

    try {
      const token = document.cookie
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith("ses_token="))
        ?.split("=")[1];

      const res = await fetch("/api/vote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rankings, suggestions }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit vote");
      }

      // Clear token
      document.cookie = "ses_token=; path=/; max-age=0";

      // Navigate to success
      router.push("/vote/success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit vote");
      setShowConfirm(false);
    } finally {
      setSubmitting(false);
    }
  }, [rankings, suggestions, router]);

  if (loading) {
    return (
      <div className="page-wrapper">
        <div style={{ textAlign: "center" }}>
          <div className="spinner spinner--lg" />
          <p className="mt-md" style={{ color: "var(--gray-500)" }}>
            Loading election data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper" ref={containerRef} style={{ justifyContent: "flex-start", paddingTop: "var(--space-3xl)" }}>
      <div className="content-wrapper" style={{ maxWidth: 640 }}>
        {/* Greeting Popup */}
        {showGreeting && voterInfo && (
          <div className="greeting" style={{ paddingTop: "20vh" }}>
            <div className="greeting__wave">👋</div>
            <h2 className="greeting__text">
              Hey <span className="greeting__name">{voterInfo.name.split(" ")[0]}</span>!
            </h2>
            <p className="greeting__sub">
              Welcome to the Student Cabinet Elections
            </p>
          </div>
        )}

        {/* Voting Content */}
        {!showGreeting && (
          <>
            {/* Header */}
            <div style={{ marginBottom: "var(--space-2xl)" }}>
              <p className="tagline mb-sm">Student Cabinet Elections</p>
              <h2>
                Rank Your Candidates,{" "}
                <span style={{ color: "var(--orange-600)" }}>
                  {voterInfo?.name.split(" ")[0]}
                </span>
              </h2>
              <p className="mt-sm" style={{ fontSize: "0.9rem" }}>
                Drag candidates to rank them by preference. Your 1st choice
                matters most.
              </p>
            </div>

            {error && (
              <div className="alert alert--error mb-xl">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Position Rankings */}
            {positions.map((position) => (
              <PositionRanking
                key={position.id}
                position={position}
                rankings={rankings[position.id] || []}
                onRankingsChange={handleRankingsChange}
              />
            ))}

            {/* Suggestions Section */}
            <div className="position-section mb-2xl">
              <h3 style={{ marginBottom: "var(--space-sm)" }}>
                💡 Suggestions{" "}
                <span
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 400,
                    color: "var(--gray-400)",
                  }}
                >
                  (Optional)
                </span>
              </h3>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "var(--gray-500)",
                  marginBottom: "var(--space-lg)",
                }}
              >
                Recommend specific candidates for specific positions.
              </p>

              {positions.flatMap((pos) =>
                pos.candidates.map((candidate) => (
                  <div
                    key={`sug-${candidate.id}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-md)",
                      marginBottom: "var(--space-sm)",
                      padding: "var(--space-sm) var(--space-md)",
                      background: "var(--white)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--gray-200)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        flex: 1,
                        color: "var(--gray-700)",
                      }}
                    >
                      {candidate.name}
                    </span>
                    <select
                      className="form-input form-select"
                      style={{
                        width: "auto",
                        padding: "8px 36px 8px 12px",
                        fontSize: "0.8125rem",
                      }}
                      value={
                        suggestions.find(
                          (s) => s.candidateId === candidate.id
                        )?.suggestedPosition || ""
                      }
                      onChange={(e) => {
                        const value = e.target.value;
                        setSuggestions((prev) => {
                          const filtered = prev.filter(
                            (s) => s.candidateId !== candidate.id
                          );
                          if (value) {
                            filtered.push({
                              candidateId: candidate.id,
                              suggestedPosition: value,
                            });
                          }
                          return filtered;
                        });
                      }}
                    >
                      <option value="">No suggestion</option>
                      {positions.map((p) => (
                        <option key={p.id} value={p.title}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  </div>
                ))
              )}
            </div>

            {/* Submit Area */}
            <div className="vote-submit-area" style={{ textAlign: "center", paddingBottom: "var(--space-3xl)" }}>
              <button
                className="btn btn-primary btn-full"
                style={{ fontSize: "1.15rem", padding: "18px 36px" }}
                onClick={() => setShowConfirm(true)}
                disabled={submitting}
              >
                Submit My Vote ✓
              </button>
              <p
                className="mt-md"
                style={{ fontSize: "0.8125rem", color: "var(--gray-400)" }}
              >
                You can only vote once. Make sure your rankings are final.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Confirm Your Vote</h2>
            <p>
              Are you sure you want to submit? Once submitted, your vote{" "}
              <strong>cannot be changed</strong>.
            </p>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
              >
                Go Back
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="spinner" style={{ borderTopColor: "white", borderColor: "rgba(255,255,255,0.3)" }} />
                    Submitting...
                  </>
                ) : (
                  "Yes, Submit"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
