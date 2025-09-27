import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, decimal, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("hr_manager"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const jobs = pgTable("jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  department: text("department").notNull(),
  location: text("location").notNull(),
  type: text("type").notNull(), // full-time, part-time, contract
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  requirements: jsonb("requirements"), // array of strings
  description: text("description").notNull(),
  status: text("status").notNull().default("active"), // active, paused, closed
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const candidates = pgTable("candidates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  position: text("position"),
  experience: integer("experience"), // years
  education: text("education"),
  location: text("location"),
  salaryExpectation: integer("salary_expectation"),
  resumeUrl: text("resume_url"),
  resumeText: text("resume_text"),
  skills: jsonb("skills"), // array of strings
  status: text("status").notNull().default("applied"), // applied, screening, interview, offer, hired, rejected
  matchScore: decimal("match_score", { precision: 5, scale: 2 }),
  aiSummary: text("ai_summary"),
  notes: text("notes"),
  source: text("source").default("manual"), // manual, linkedin, job_board, referral
  tags: jsonb("tags"), // array of strings for categorization
  lastContactedAt: timestamp("last_contacted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const interviews = pgTable("interviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").references(() => candidates.id).notNull(),
  jobId: varchar("job_id").references(() => jobs.id).notNull(),
  interviewerId: varchar("interviewer_id").references(() => users.id),
  scheduledDate: timestamp("scheduled_date").notNull(),
  duration: integer("duration").notNull(), // minutes
  type: text("type").notNull(), // phone, video, in-person
  status: text("status").notNull().default("scheduled"), // scheduled, completed, cancelled, no-show
  meetingLink: text("meeting_link"),
  location: text("location"),
  round: integer("round").notNull().default(1),
  feedback: text("feedback"),
  rating: integer("rating"), // 1-5
  recommendation: text("recommendation"), // hire, reject, next-round
  interviewerNotes: text("interviewer_notes"),
  candidateNotes: text("candidate_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const aiConversations = pgTable("ai_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  sessionId: varchar("session_id").notNull(),
  message: text("message").notNull(),
  response: text("response").notNull(),
  modelUsed: text("model_used").notNull(),
  tokensUsed: integer("tokens_used"),
  templateId: varchar("template_id"), // reference to prompt template used
  context: text("context"), // additional context provided
  createdAt: timestamp("created_at").defaultNow(),
});

export const jobMatches = pgTable("job_matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").references(() => candidates.id).notNull(),
  jobId: varchar("job_id").references(() => jobs.id).notNull(),
  matchScore: decimal("match_score", { precision: 5, scale: 2 }).notNull(),
  matchReasons: jsonb("match_reasons"), // array of strings
  aiAnalysis: text("ai_analysis"),
  basicMatchScore: decimal("basic_match_score", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const promptTemplates = pgTable("prompt_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // resume_analysis, job_matching, interview_questions, candidate_screening, general
  template: text("template").notNull(),
  variables: jsonb("variables").notNull(), // array of variable names
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const candidateStatusHistory = pgTable("candidate_status_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").references(() => candidates.id).notNull(),
  oldStatus: text("old_status"),
  newStatus: text("new_status").notNull(),
  reason: text("reason"),
  notes: text("notes"),
  changedBy: varchar("changed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCandidateSchema = createInsertSchema(candidates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInterviewSchema = createInsertSchema(interviews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAiConversationSchema = createInsertSchema(aiConversations).omit({
  id: true,
  createdAt: true,
});

export const insertJobMatchSchema = createInsertSchema(jobMatches).omit({
  id: true,
  createdAt: true,
});

export const insertPromptTemplateSchema = createInsertSchema(promptTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCandidateStatusHistorySchema = createInsertSchema(candidateStatusHistory).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;

export type Candidate = typeof candidates.$inferSelect;
export type InsertCandidate = z.infer<typeof insertCandidateSchema>;

export type Interview = typeof interviews.$inferSelect;
export type InsertInterview = z.infer<typeof insertInterviewSchema>;

export type AiConversation = typeof aiConversations.$inferSelect;
export type InsertAiConversation = z.infer<typeof insertAiConversationSchema>;

export type JobMatch = typeof jobMatches.$inferSelect;
export type InsertJobMatch = z.infer<typeof insertJobMatchSchema>;

export type PromptTemplate = typeof promptTemplates.$inferSelect;
export type InsertPromptTemplate = z.infer<typeof insertPromptTemplateSchema>;

export type CandidateStatusHistory = typeof candidateStatusHistory.$inferSelect;
export type InsertCandidateStatusHistory = z.infer<typeof insertCandidateStatusHistorySchema>;
