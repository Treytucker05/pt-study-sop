import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = sqliteTable("users", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Courses for Study Wheel round-robin
export const courses = sqliteTable("courses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  position: integer("position").notNull().default(0), // Round-robin order position
  totalSessions: integer("total_sessions").notNull().default(0),
  totalMinutes: integer("total_minutes").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const insertCourseSchema = createInsertSchema(courses).omit({
  id: true,
  createdAt: true,
  totalSessions: true,
  totalMinutes: true,
});

export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Course = typeof courses.$inferSelect;

// Schedule events from syllabus (exams, quizzes, assignments)
export const scheduleEvents = sqliteTable("schedule_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  courseId: integer("course_id").notNull(),
  type: text("type").notNull(), // 'chapter' | 'quiz' | 'assignment' | 'exam'
  title: text("title").notNull(),
  date: text("date"), // ISO date string YYYY-MM-DD
  dueDate: text("due_date"), // ISO date string YYYY-MM-DD
  startTime: text("start_time"), // HH:MM
  endTime: text("end_time"), // HH:MM
  linkedModuleId: integer("linked_module_id"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const insertScheduleEventSchema = createInsertSchema(scheduleEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertScheduleEvent = z.infer<typeof insertScheduleEventSchema>;
export type ScheduleEvent = typeof scheduleEvents.$inferSelect;

// Modules (unit of material gathering)
export const modules = sqliteTable("modules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  courseId: integer("course_id").notNull(),
  name: text("name").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
  filesDownloaded: integer("files_downloaded", { mode: "boolean" }).notNull().default(false),
  notebooklmLoaded: integer("notebooklm_loaded", { mode: "boolean" }).notNull().default(false),
  sources: text("sources"), // JSON array of file names
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const insertModuleSchema = createInsertSchema(modules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertModule = z.infer<typeof insertModuleSchema>;
export type Module = typeof modules.$inferSelect;

// Learning objectives (unit of learning progress)
export const learningObjectives = sqliteTable("learning_objectives", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  courseId: integer("course_id").notNull(),
  moduleId: integer("module_id"),
  loCode: text("lo_code"), // e.g., "LO-4.1" or "1a"
  title: text("title").notNull(),
  status: text("status").notNull().default("not_started"), // not_started | in_progress | need_review | solid
  lastSessionId: integer("last_session_id"),
  lastSessionDate: text("last_session_date"), // ISO date string
  nextAction: text("next_action"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const insertLearningObjectiveSchema = createInsertSchema(learningObjectives).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLearningObjective = z.infer<typeof insertLearningObjectiveSchema>;
export type LearningObjective = typeof learningObjectives.$inferSelect;

// LO-Session join table (tracks which LOs were covered in each session)
export const loSessions = sqliteTable("lo_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  loId: integer("lo_id").notNull(),
  sessionId: integer("session_id").notNull(),
  statusBefore: text("status_before"),
  statusAfter: text("status_after"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const insertLoSessionSchema = createInsertSchema(loSessions).omit({
  id: true,
  createdAt: true,
});

export type InsertLoSession = z.infer<typeof insertLoSessionSchema>;
export type LoSession = typeof loSessions.$inferSelect;

// Study sessions with WRAP fields for Brain analytics
// WRAP = Weekly Review And Planning session output
export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: integer("date", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  topic: text("topic").notNull(), // Course name for backward compatibility
  courseId: integer("course_id"), // Links to courses table
  mode: text("mode").notNull(), // WRAP: study mode (Core, Sprint, Drill, etc.)
  duration: text("duration").notNull(), // Keep for backward compatibility
  minutes: integer("minutes").notNull().default(0), // WRAP: actual minutes studied
  errors: integer("errors").notNull().default(0), // Legacy field
  cards: integer("cards").notNull().default(0), // WRAP: cards drafted during session
  notes: text("notes"),
  // WRAP fields for Brain analytics (stored as JSON strings)
  confusions: text("confusions"), // WRAP: concepts that caused confusion (JSON array)
  weakAnchors: text("weak_anchors"), // WRAP: topics needing reinforcement (JSON array)
  concepts: text("concepts"), // WRAP: concepts touched during session (JSON array)
  issues: text("issues"), // WRAP: interruptions, source-lock failures, workflow problems (JSON array)
  sourceLock: text("source_lock"), // JSON array of source labels
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
});

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

// Study Wheel state - tracks current position in round-robin
export const studyWheelState = sqliteTable("study_wheel_state", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  currentCourseId: integer("current_course_id"), // Current course to study
  lastUpdated: integer("last_updated", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// Study streak tracking
export const studyStreak = sqliteTable("study_streak", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastStudyDate: integer("last_study_date", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// Weakness queue - flagged topics for review
export const weaknessQueue = sqliteTable("weakness_queue", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  topic: text("topic").notNull(),
  courseId: integer("course_id"),
  reason: text("reason"),
  flaggedAt: integer("flagged_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const calendarEvents = sqliteTable("calendar_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  date: integer("date", { mode: "timestamp" }).notNull(),
  endDate: integer("end_date", { mode: "timestamp" }),
  allDay: integer("all_day", { mode: "boolean" }).default(false),
  eventType: text("event_type").notNull(),
  course: text("course"),
  weight: text("weight"),
  notes: text("notes"),
  location: text("location"),
  attendees: text("attendees"),
  visibility: text("visibility"),
  transparency: text("transparency"),
  reminders: text("reminders"),
  timeZone: text("time_zone"),
  status: text("status").default("pending"),
  color: text("color").default("#ef4444"),
  recurrence: text("recurrence"),
  calendarId: text("calendar_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({
  id: true,
  createdAt: true,
}).extend({
  attendees: z.array(z.object({
    email: z.string(),
    responseStatus: z.string().optional(),
    self: z.boolean().optional(),
  })).optional(),
  reminders: z.object({
    useDefault: z.boolean().optional(),
    overrides: z.array(z.object({
      method: z.string(),
      minutes: z.number(),
    })).optional(),
  }).optional(),
});

export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type CalendarEvent = typeof calendarEvents.$inferSelect;

export const calendarOrder = sqliteTable("calendar_order", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().default("default"),
  orderJson: text("order_json").notNull(), // JSON array of calendar IDs
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export type CalendarOrder = typeof calendarOrder.$inferSelect;

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

export const proposals = sqliteTable("proposals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  proposalId: text("proposal_id").notNull().unique(),
  summary: text("summary").notNull(),
  status: text("status").notNull().default("DRAFT"),
  priority: text("priority").notNull().default("MED"),
  targetSystem: text("target_system"),
  evidence: text("evidence"), // JSON string
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const insertProposalSchema = createInsertSchema(proposals).omit({
  id: true,
  createdAt: true,
});

export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type Proposal = typeof proposals.$inferSelect;

export const chatMessages = sqliteTable("chat_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: text("session_id").notNull(),
  sender: text("sender").notNull(),
  content: text("content").notNull(),
  metadata: text("metadata"), // JSON string
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

export const googleTokens = sqliteTable("google_tokens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  scope: text("scope"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export type GoogleToken = typeof googleTokens.$inferSelect;

export const notes = sqliteTable("notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  content: text("content").notNull(),
  noteType: text("note_type").notNull().default("notes"),
  position: integer("position").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const insertNoteSchema = createInsertSchema(notes).omit({
  id: true,
  createdAt: true,
});

export type InsertNote = z.infer<typeof insertNoteSchema>;
export type Note = typeof notes.$inferSelect;

// AI Chat conversations for calendar assistant
export const conversations = sqliteTable("conversations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  conversationId: integer("conversation_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
