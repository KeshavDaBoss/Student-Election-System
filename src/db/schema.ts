import {
  pgTable,
  serial,
  text,
  varchar,
  boolean,
  timestamp,
  integer,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// --- Students (Voter Registry) ---
export const students = pgTable(
  "students",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    electionNumber: varchar("election_number", { length: 6 })
      .notNull()
      .unique(),
    class: varchar("class", { length: 10 }).notNull(),
    section: varchar("section", { length: 5 }).notNull(),
    hasVoted: boolean("has_voted").notNull().default(false),
    votedAt: timestamp("voted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("election_number_idx").on(table.electionNumber)]
);

// --- Positions (What students vote for) ---
export const positions = pgTable("positions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  numWinners: integer("num_winners").notNull().default(1),
  isVotable: boolean("is_votable").notNull().default(true),
  isSuggestable: boolean("is_suggestable").notNull().default(false),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// --- Candidates ---
export const candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  positionId: integer("position_id")
    .notNull()
    .references(() => positions.id, { onDelete: "cascade" }),
  class: varchar("class", { length: 10 }),
  section: varchar("section", { length: 5 }),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// --- Votes (Ranked Ballots) ---
export const votes = pgTable("votes", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  positionId: integer("position_id")
    .notNull()
    .references(() => positions.id, { onDelete: "cascade" }),
  // JSONB array of candidate IDs in ranked order: [1st choice, 2nd, 3rd, ...]
  rankings: jsonb("rankings").notNull().$type<number[]>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// --- Suggestions (optional position recommendations) ---
export const suggestions = pgTable("suggestions", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  candidateId: integer("candidate_id")
    .notNull()
    .references(() => candidates.id, { onDelete: "cascade" }),
  suggestedPosition: text("suggested_position").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// --- Admins ---
export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  isProtected: boolean("is_protected").notNull().default(false),
  role: text("role").notNull().default("admin"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// --- Election Configuration ---
export const electionConfig = pgTable("election_config", {
  id: serial("id").primaryKey(),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  isAlwaysLive: boolean("is_always_live").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// --- Login Attempts (Rate Limiting) ---
export const loginAttempts = pgTable("login_attempts", {
  id: serial("id").primaryKey(),
  identifier: varchar("identifier", { length: 255 }).notNull(), // IP or fingerprint
  attemptCount: integer("attempt_count").notNull().default(0),
  lastAttemptAt: timestamp("last_attempt_at").notNull().defaultNow(),
  lockedUntil: timestamp("locked_until"),
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
