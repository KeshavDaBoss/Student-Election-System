import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// --- Students (Voter Registry) ---
export const students = sqliteTable(
  "students",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    electionNumber: text("election_number").notNull().unique(),
    class: text("class").notNull(),
    section: text("section").notNull(),
    hasVoted: integer("has_voted", { mode: "boolean" }).notNull().default(false),
    votedAt: integer("voted_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex("election_number_idx").on(table.electionNumber)]
);

// --- Positions (What students vote for) ---
export const positions = sqliteTable("positions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  numWinners: integer("num_winners").notNull().default(1),
  isVotable: integer("is_votable", { mode: "boolean" }).notNull().default(true),
  isSuggestable: integer("is_suggestable", { mode: "boolean" })
    .notNull()
    .default(false),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// --- Candidates ---
export const candidates = sqliteTable("candidates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  positionId: integer("position_id")
    .notNull()
    .references(() => positions.id, { onDelete: "cascade" }),
  class: text("class"),
  section: text("section"),
  photoUrl: text("photo_url"),
  campaignVideoUrl: text("campaign_video_url"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// --- Votes (Ranked Ballots) ---
export const votes = sqliteTable("votes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentId: integer("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  positionId: integer("position_id")
    .notNull()
    .references(() => positions.id, { onDelete: "cascade" }),
  // JSON array of candidate IDs in ranked order: [1st choice, 2nd, 3rd, ...]
  rankings: text("rankings", { mode: "json" }).notNull().$type<number[]>(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// --- Suggestions (optional position recommendations) ---
export const suggestions = sqliteTable("suggestions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentId: integer("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  candidateId: integer("candidate_id")
    .notNull()
    .references(() => candidates.id, { onDelete: "cascade" }),
  suggestedPosition: text("suggested_position").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// --- Admins ---
export const admins = sqliteTable("admins", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  isProtected: integer("is_protected", { mode: "boolean" })
    .notNull()
    .default(false),
  role: text("role").notNull().default("admin"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// --- Election Configuration ---
export const electionConfig = sqliteTable("election_config", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  startTime: integer("start_time", { mode: "timestamp" }),
  endTime: integer("end_time", { mode: "timestamp" }),
  isAlwaysLive: integer("is_always_live", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// --- Login Attempts (Rate Limiting) ---
export const loginAttempts = sqliteTable("login_attempts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  identifier: text("identifier").notNull(), // IP or fingerprint
  attemptCount: integer("attempt_count").notNull().default(0),
  lastAttemptAt: integer("last_attempt_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  lockedUntil: integer("locked_until", { mode: "timestamp" }),
});

// --- Type exports ---
export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
export type Position = typeof positions.$inferSelect;
export type NewPosition = typeof positions.$inferInsert;
export type Candidate = typeof candidates.$inferSelect;
export type NewCandidate = typeof candidates.$inferInsert;
export type Vote = typeof votes.$inferSelect;
export type NewVote = typeof votes.$inferInsert;
export type Suggestion = typeof suggestions.$inferSelect;
export type Admin = typeof admins.$inferSelect;
export type ElectionConfig = typeof electionConfig.$inferSelect;
export type LoginAttempt = typeof loginAttempts.$inferSelect;
