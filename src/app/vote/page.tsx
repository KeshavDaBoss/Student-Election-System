"use client";

import { memo, useState, useEffect, useRef, useCallback } from "react";
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
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

gsap.registerPlugin(useGSAP);

interface CandidateData {
  id: number;
  name: string;
  class?: string;
  section?: string;
  campaignVideoUrl?: string | null;
}

interface PositionData {
  id: number;
  title: string;
  description?: string;
  numWinners: number;
  isVotable: boolean;
  isSuggestable: boolean;
  candidates: CandidateData[];
}

interface VoterInfo {
  name: string;
  class: string;
  section: string;
}

// --- Candidate Card (used both for sortable items and drag overlay) ---
const CandidateCardContent = memo(function CandidateCardContent({
  candidate,
  rank,
  isDragging = false,
  isOverlay = false,
  isReordering = false,
}: {
  candidate: CandidateData;
  rank: number;
  isDragging?: boolean;
  isOverlay?: boolean;
  isReordering?: boolean;
}) {
  const getRankClass = (r: number) => {
    if (r === 1) return "rank-badge rank-badge--1";
    if (r === 2) return "rank-badge rank-badge--2";
    if (r === 3) return "rank-badge rank-badge--3";
    return "rank-badge rank-badge--default";
  };

  return (
    <div
      className={`candidate-card ${isDragging ? "dragging" : ""} ${isOverlay ? "drag-overlay" : ""} ${isReordering ? "reordering" : ""}`}
      style={isOverlay ? { boxShadow: "0 20px 60px rgba(0,0,0,0.25)", cursor: "grabbing" } : undefined}
    >
      <div className="candidate-card__rank-col">{getRankClass(rank) && <div className={getRankClass(rank)}>{rank}</div>}</div>
      <div className="candidate-card__info">
        <div className="candidate-card__name">{candidate.name}</div>
        {candidate.class && (
          <div className="candidate-card__detail">
            Class {candidate.class}
            {candidate.section ? ` – Section ${candidate.section}` : ""}
          </div>
        )}
        {candidate.campaignVideoUrl && (
          <a
            href={candidate.campaignVideoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="candidate-card__video-link"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            Watch campaign video
          </a>
        )}
      </div>
      {!isOverlay && (
        <div className="candidate-card__rank-hint">
          <span className="rank-badge rank-badge--default">{rank}</span>
        </div>
      )}
    </div>
  );
});

// --- Sortable Candidate Card with Reorder Mode feedback ---
const SortableCandidateReorder = memo(function SortableCandidateReorder({
  candidate,
  rank,
  isReordering,
}: {
  candidate: CandidateData;
  rank: number;
  isReordering: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: candidate.id });

  // Manually construct translate3d to prevent any scaling/offset issues
  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)` : undefined,
    transition: isDragging ? undefined : transition,
    opacity: 1,
    willChange: "transform",
    position: "relative",
    zIndex: isDragging ? 999 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
    >
      {/* The drag handle wraps the whole card */}
      <div
        {...attributes}
        {...listeners}
        style={{ touchAction: "none", cursor: isDragging ? "grabbing" : "grab" }}
      >
        <CandidateCardContent
          candidate={candidate}
          rank={rank}
          isDragging={isDragging}
          isReordering={isReordering}
        />
      </div>
    </div>
  );
});

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
    useSensor(PointerSensor, {
        activationConstraint: {
          delay: 250,
          tolerance: 10,
        },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const orderedCandidates = rankings
    .map((id) => position.candidates.find((c) => c.id === id))
    .filter(Boolean) as CandidateData[];

  // Reorder Mode state: activated by a long-press (hold > 0.25s) and locks scrolling
  const [reorderMode, setReorderMode] = useState(false);
  const [reorderingId, setReorderingId] = useState<number | null>(null);

  // Interaction Lock: prevent page scrolling while in Reorder Mode so the user
  // can drag without the list scrolling underneath.
  useEffect(() => {
    if (reorderMode) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [reorderMode]);

  function handleDragStart(event: DragStartEvent) {
    // Long-press satisfied — enter Reorder Mode, mark the held card, lock scroll
    const id = event.active.id as number;
    setReorderingId(id);
    setReorderMode(true);
  }

  function deactivateReorderMode() {
    setReorderMode(false);
    setReorderingId(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = rankings.indexOf(active.id as number);
      const newIndex = rankings.indexOf(over.id as number);
      const newRankings = arrayMove(rankings, oldIndex, newIndex);
      onRankingsChange(position.id, newRankings);
    }
    deactivateReorderMode();
  }

  function handleDragCancel() {
    deactivateReorderMode();
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
        {reorderMode
          ? "Reordering — drag to reorder, then release to finish. Top = 1st choice."
          : "Press and hold a card for 0.25s, then drag to reorder. Top = 1st choice."}
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={rankings} strategy={verticalListSortingStrategy}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-sm)",
              touchAction: reorderMode ? "none" : "auto",
            }}
          >
            {orderedCandidates.map((candidate, index) => (
              <SortableCandidateReorder
                key={candidate.id}
                candidate={candidate}
                rank={index + 1}
                isReordering={reorderMode && reorderingId === candidate.id}
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
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  // No greeting popup — go straight to voting

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

  // Content entrance animation
  useGSAP(
    () => {
      if (loading) return;

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
    { scope: containerRef, dependencies: [loading] }
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

      const filteredRankings = Object.fromEntries(
        Object.entries(rankings).filter(([, r]) => Array.isArray(r) && r.length > 0)
      );

      const res = await fetch("/api/vote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rankings: filteredRankings, suggestions }),
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

  const votablePositions = positions.filter((p) => p.isVotable && p.candidates.length > 0);
  const suggestablePositions = positions.filter((p) => p.isSuggestable);

  // Deduplicate candidates for suggestions (same name, class, section)
  const allCandidates = positions.flatMap((p) => p.candidates);
  const uniqueCandidates = allCandidates.filter(
    (c, i, arr) => arr.findIndex((t) => t.name === c.name && t.class === c.class && t.section === c.section) === i
  );

  if (votablePositions.length === 0) {
    return (
      <div className="page-wrapper" ref={containerRef}>
        <div className="center-card glass-card" style={{ textAlign: "center" }}>
          <h2>No Positions Available</h2>
          <p>There are no positions available for voting right now.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper" ref={containerRef} style={{ justifyContent: "flex-start", paddingTop: "var(--space-3xl)" }}>
      <div className="content-wrapper" style={{ maxWidth: 640 }}>
        {/* Voting Content — shown immediately, no greeting popup */}
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
                Drag or use the arrow buttons to rank candidates by preference. Your 1st choice matters most.
              </p>
            </div>

            {error && (
              <div className="alert alert--error mb-lg" role="alert" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Position Rankings */}
            {votablePositions.map((position) => (
              <PositionRanking
                key={position.id}
                position={position}
                rankings={rankings[position.id] || []}
                onRankingsChange={handleRankingsChange}
              />
            ))}

            {/* Suggestions Section */}
            {suggestablePositions.length > 0 && (
              <div className="position-section mb-2xl">
              <h3 style={{ marginBottom: "var(--space-sm)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                  Suggestions{" "}
                </span>
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

              {uniqueCandidates.map((candidate) => (
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
                      {suggestablePositions.map((p) => (
                        <option key={p.id} value={p.title}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  </div>
                ))
              }
            </div>
            )}

            {/* Submit Area */}
            <div className="vote-submit-area" style={{ textAlign: "center", paddingBottom: "var(--space-3xl)" }}>
              <button
                className="btn btn-primary btn-full"
                style={{ fontSize: "1.15rem", padding: "18px 36px" }}
                onClick={() => setShowConfirm(true)}
                disabled={submitting}
              >
                Submit My Vote
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </button>
              <p
                className="mt-md"
                style={{ fontSize: "0.8125rem", color: "var(--gray-400)" }}
              >
                You can only vote once. Make sure your rankings are final.
              </p>
            </div>
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
