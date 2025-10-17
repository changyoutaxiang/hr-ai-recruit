import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, decimal, boolean, unique, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export interface ResumeAnalysis {
  summary: string;
  skills: string[];
  experience: number;
  education: string;
  strengths: string[];
  weaknesses: string[];
  recommendations?: string[];
  [key: string]: unknown;
}

export type TargetedResumeAnalysis = Record<string, unknown>;

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
  requirements: jsonb("requirements").$type<string[] | null>(), // array of strings
  focusAreas: jsonb("focus_areas").$type<string[] | null>(),
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
  expectedSalary: integer("expected_salary"),
  yearsOfExperience: integer("years_of_experience"),
  resumeUrl: text("resume_url"),
  resumeText: text("resume_text"),
  skills: jsonb("skills").$type<string[] | null>(), // array of strings
  status: text("status").notNull().default("applied"), // applied, screening, interview, offer, hired, rejected
  matchScore: decimal("match_score", { precision: 5, scale: 2 }),
  aiSummary: text("ai_summary"),
  notes: text("notes"),
  source: text("source").default("manual"), // manual, linkedin, job_board, referral
  tags: jsonb("tags").$type<string[] | null>(), // array of strings for categorization
  resumeAnalysis: jsonb("resume_analysis").$type<ResumeAnalysis | null>(),
  targetedAnalysis: jsonb("targeted_analysis").$type<TargetedResumeAnalysis | null>(),
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
  duration: integer("duration").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("scheduled"),
  meetingLink: text("meeting_link"),
  location: text("location"),
  round: integer("round").notNull().default(1),
  feedback: text("feedback"),
  rating: integer("rating"),
  recommendation: text("recommendation"),
  interviewerNotes: text("interviewer_notes"),
  candidateNotes: text("candidate_notes"),
  transcription: text("transcription"),
  recordingUrl: text("recording_url"),
  transcriptionMethod: text("transcription_method"),
  aiKeyFindings: jsonb("ai_key_findings"),
  aiConcernAreas: jsonb("ai_concern_areas"),
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
  status: text("status").notNull().default("pending"),
  analysis: jsonb("analysis").$type<Record<string, unknown> | null>(),
  score: decimal("score", { precision: 5, scale: 2 }),
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

// Real-time collaboration tables
export const activityLog = pgTable("activity_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  action: text("action").notNull(), // candidate_updated, interview_scheduled, job_created, etc.
  entityType: text("entity_type").notNull(), // candidate, job, interview
  entityId: varchar("entity_id").notNull(),
  entityName: text("entity_name").notNull(), // for display
  details: jsonb("details"), // additional context
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(), // candidate_update, interview_reminder, team_activity
  title: text("title").notNull(),
  message: text("message").notNull(),
  entityType: text("entity_type"), // candidate, job, interview
  entityId: varchar("entity_id"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userSessions = pgTable("user_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  isOnline: boolean("is_online").notNull().default(true),
  currentPage: text("current_page"),
  lastActivity: timestamp("last_activity").defaultNow(),
  socketId: text("socket_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: text("entity_type").notNull(),
  entityId: varchar("entity_id").notNull(),
  content: text("content").notNull(),
  authorId: varchar("author_id").references(() => users.id).notNull(),
  isInternal: boolean("is_internal").notNull().default(true),
  mentions: jsonb("mentions"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * 候选人动态画像表
 * 记录候选人在招聘流程中的画像演进，每个阶段生成新版本
 */
export const candidateProfiles = pgTable("candidate_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  /** 关联的候选人 ID，删除候选人时级联删除画像 */
  candidateId: varchar("candidate_id")
    .references(() => candidates.id, { onDelete: "cascade" })
    .notNull(),

  /** 关联的职位 ID（可选），删除职位时设为 NULL */
  jobId: varchar("job_id")
    .references(() => jobs.id, { onDelete: "set null" }),

  /** 画像版本号，从 1 开始递增，同一候选人的版本号唯一 */
  version: integer("version").notNull(),

  /** 画像生成阶段：resume、after_interview_1、after_interview_2 等 */
  stage: text("stage").notNull(),

  /** 画像详细数据（技能、经验、匹配度等） */
  profileData: jsonb("profile_data").notNull(),

  /** AI 评估的总体匹配分数（0-100） */
  overallScore: decimal("overall_score", { precision: 5, scale: 2 }),

  /** 用于生成此版本画像的数据源 */
  dataSources: jsonb("data_sources"),

  /** AI 识别的信息缺口 */
  gaps: jsonb("gaps"),

  /** AI 识别的候选人优势 */
  strengths: jsonb("strengths"),

  /** AI 识别的潜在顾虑 */
  concerns: jsonb("concerns"),

  /** AI 生成的候选人画像总结 */
  aiSummary: text("ai_summary"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // 确保同一候选人的版本号唯一
  uniqueCandidateVersion: unique().on(table.candidateId, table.version),
}));

/**
 * 面试准备表
 * 存储为每次面试生成的AI准备材料，帮助面试官更好地进行面试
 */
export const interviewPreparations = pgTable("interview_preparations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  /** 关联的候选人ID */
  candidateId: varchar("candidate_id")
    .references(() => candidates.id, { onDelete: "cascade" })
    .notNull(),

  /** 关联的职位ID (冗余存储以提高查询性能) */
  jobId: varchar("job_id")
    .references(() => jobs.id, { onDelete: "set null" }),

  /** 关联的面试ID */
  interviewId: varchar("interview_id")
    .references(() => interviews.id, { onDelete: "cascade" })
    .notNull(),

  /** 为哪位面试官生成的准备材料 */
  generatedFor: varchar("generated_for")
    .references(() => users.id, { onDelete: "set null" }),

  /** 准备材料状态 */
  status: text("status").notNull().default("generating"),
  // 可选值: generating, completed, failed

  /** 候选人当前状态摘要 */
  candidateContext: jsonb("candidate_context").notNull(),
  // 包含: summary, currentScore, strengths[], concerns[]

  /** AI建议的面试问题 */
  suggestedQuestions: jsonb("suggested_questions").notNull(),
  // 数组，每个元素包含: question, purpose, probing

  /** 重点考察领域 */
  focusAreas: jsonb("focus_areas").notNull(),
  // 数组，每个元素包含: area, why, signals[]

  /** 前几轮面试未充分覆盖的点 */
  previousGaps: jsonb("previous_gaps"),
  // 字符串数组

  /** 给面试官的提示和建议 */
  interviewerTips: jsonb("interviewer_tips"),
  // 字符串数组

  /** 面试准备材料版本，支持更新 */
  version: integer("version").notNull().default(1),

  /** AI模型生成的置信度 (0-100) */
  confidence: integer("confidence"),

  /** 生成时使用的AI模型 */
  aiModel: text("ai_model"),

  /** 是否已被面试官查看 */
  viewedAt: timestamp("viewed_at"),

  /** 面试官的反馈评分 (1-5分) */
  feedbackRating: integer("feedback_rating"),
  /** 面试官的反馈评论 */
  feedbackComment: text("feedback_comment"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // 索引优化查询性能
  candidateIdx: index("idx_interview_prep_candidate").on(table.candidateId),
  interviewIdx: index("idx_interview_prep_interview").on(table.interviewId),
  generatedForIdx: index("idx_interview_prep_generated_for").on(table.generatedFor),
  createdAtIdx: index("idx_interview_prep_created_at").on(table.createdAt),
  statusIdx: index("idx_interview_prep_status").on(table.status),
  // 确保每个面试只有一份准备材料（通过 interviewId 的唯一性）
  uniqueInterviewPrep: unique("unique_interview_prep").on(table.interviewId),
}));

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

export const insertActivityLogSchema = createInsertSchema(activityLog).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertUserSessionSchema = createInsertSchema(userSessions).omit({
  id: true,
  createdAt: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCandidateProfileSchema = createInsertSchema(candidateProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInterviewPreparationSchema = createInsertSchema(interviewPreparations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Hiring Decisions table for storing AI-generated hiring recommendations
export const hiringDecisions = pgTable("hiring_decisions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id")
    .references(() => candidates.id, { onDelete: "cascade" })
    .notNull(),
  jobId: varchar("job_id")
    .references(() => jobs.id, { onDelete: "cascade" })
    .notNull(),

  // Decision and recommendation
  decision: varchar("decision", { length: 50 }).notNull(), // hire, reject, hold, next-round
  confidence: integer("confidence"), // 0-100 confidence score
  recommendation: text("recommendation").notNull(), // AI generated recommendation text

  // Detailed analysis
  strengths: jsonb("strengths"), // Array of key strengths
  weaknesses: jsonb("weaknesses"), // Array of weaknesses/concerns
  riskAssessment: jsonb("risk_assessment"), // Risk factors and mitigation
  growthPotential: jsonb("growth_potential"), // Growth trajectory analysis
  culturalFit: jsonb("cultural_fit"), // Cultural alignment assessment

  // Comparative analysis
  comparisonWithOthers: jsonb("comparison_with_others"), // How candidate compares to others
  alternativeRoles: jsonb("alternative_roles"), // Other suitable positions

  // Conditions and next steps
  conditions: jsonb("conditions"), // Conditions for hiring (if applicable)
  nextSteps: jsonb("next_steps"), // Recommended next actions
  timelineSuggestion: varchar("timeline_suggestion", { length: 255 }), // Urgency/timeline

  // Compensation insights
  compensationRange: jsonb("compensation_range"), // Suggested compensation
  negotiationPoints: jsonb("negotiation_points"), // Key negotiation considerations

  // Decision metadata
  decidedBy: varchar("decided_by")
    .references(() => users.id, { onDelete: "set null" }),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  status: varchar("status", { length: 50 }).default("draft"), // draft, final, revised

  // Tracking
  viewedAt: timestamp("viewed_at", { withTimezone: true }),
  feedbackRating: integer("feedback_rating"), // 1-5 rating
  feedbackComment: text("feedback_comment"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertHiringDecisionSchema = createInsertSchema(hiringDecisions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

/**
 * AI Token 使用跟踪表
 * 记录所有AI调用的token使用和成本，用于成本控制和分析
 */
export const aiTokenUsage = pgTable("ai_token_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  /** 关联的用户ID（触发AI调用的用户） */
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),

  /** 调用场景/功能模块 */
  operation: varchar("operation", { length: 100 }).notNull(),
  // 例如: resume_analysis, profile_generation, interview_feedback, etc.

  /** 关联的实体类型和ID（可选） */
  entityType: varchar("entity_type", { length: 50 }),
  // candidate, job, interview, etc.
  entityId: varchar("entity_id"),

  /** 使用的AI模型 */
  model: varchar("model", { length: 100 }).notNull(),
  // 例如: gpt-4o, gpt-4-turbo-preview, etc.

  /** Token使用统计 */
  promptTokens: integer("prompt_tokens").notNull(),
  completionTokens: integer("completion_tokens").notNull(),
  totalTokens: integer("total_tokens").notNull(),

  /** 成本计算（美元） */
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 6 }),
  // 根据模型定价计算的成本

  /** 调用是否成功 */
  success: boolean("success").notNull().default(true),

  /** 错误信息（如果失败） */
  errorMessage: text("error_message"),

  /** 调用耗时（毫秒） */
  latencyMs: integer("latency_ms"),

  /** 重试次数 */
  retryCount: integer("retry_count").notNull().default(0),

  /** 额外元数据 */
  metadata: jsonb("metadata"),
  // 可存储: temperature, max_tokens, response_format等配置参数

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // 索引优化查询性能
  userIdx: index("idx_ai_token_usage_user").on(table.userId),
  operationIdx: index("idx_ai_token_usage_operation").on(table.operation),
  entityIdx: index("idx_ai_token_usage_entity").on(table.entityType, table.entityId),
  createdAtIdx: index("idx_ai_token_usage_created_at").on(table.createdAt),
  modelIdx: index("idx_ai_token_usage_model").on(table.model),
}));

export const insertAiTokenUsageSchema = createInsertSchema(aiTokenUsage).omit({
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

export type ActivityLog = typeof activityLog.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;

export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;

export type CandidateProfile = typeof candidateProfiles.$inferSelect;
export type InsertCandidateProfile = z.infer<typeof insertCandidateProfileSchema>;

export type InterviewPreparation = typeof interviewPreparations.$inferSelect;
export type InsertInterviewPreparation = z.infer<typeof insertInterviewPreparationSchema>;

export type HiringDecision = typeof hiringDecisions.$inferSelect;
export type InsertHiringDecision = z.infer<typeof insertHiringDecisionSchema>;

export type AiTokenUsage = typeof aiTokenUsage.$inferSelect;
export type InsertAiTokenUsage = z.infer<typeof insertAiTokenUsageSchema>;

// 面试准备材料的 TypeScript 类型定义
export const candidateContextSchema = z.object({
  /** 候选人总体情况摘要 */
  summary: z.string(),
  /** 当前综合评分 */
  currentScore: z.number().min(0).max(100),
  /** 优势领域 */
  strengths: z.array(z.string()),
  /** 待考察或疑虑点 */
  concerns: z.array(z.string()),
});

export const suggestedQuestionSchema = z.object({
  /** 建议的问题内容 */
  question: z.string(),
  /** 提问目的 */
  purpose: z.string(),
  /** 追问建议 */
  probing: z.array(z.string()).optional(),
  /** 问题类别 */
  category: z.enum(["technical", "behavioral", "situational", "cultural"]).optional(),
});

export const focusAreaSchema = z.object({
  /** 重点考察领域 */
  area: z.string(),
  /** 为什么需要重点考察 */
  why: z.string(),
  /** 关键观察信号 */
  signals: z.array(z.string()),
  /** 优先级 */
  priority: z.enum(["high", "medium", "low"]).optional(),
});

export const interviewPreparationStatusSchema = z.enum(["generating", "completed", "failed"]);

export const proficiencySchema = z.enum(["beginner", "intermediate", "advanced", "expert"]);

export const profileDataSchema = z.object({
  technicalSkills: z.array(z.object({
    skill: z.string(),
    proficiency: proficiencySchema,
    evidenceSource: z.string(),
  })).optional(),
  softSkills: z.array(z.object({
    skill: z.string(),
    examples: z.array(z.string()),
  })).optional(),
  experience: z.object({
    totalYears: z.number().nonnegative(),
    relevantYears: z.number().nonnegative(),
    positions: z.array(z.object({
      title: z.string(),
      duration: z.string(),
      keyAchievements: z.array(z.string()),
    })),
  }).optional(),
  education: z.object({
    level: z.string(),
    field: z.string(),
    institution: z.string().optional(),
  }).optional(),
  culturalFit: z.object({
    workStyle: z.string(),
    motivations: z.array(z.string()),
    preferences: z.array(z.string()),
  }).optional(),
  careerTrajectory: z.object({
    progression: z.string(),
    growthAreas: z.array(z.string()),
    stabilityScore: z.number().min(0).max(100),
  }).optional(),
  organizationalFit: z.object({
    cultureAssessment: z.object({
      overallScore: z.number().min(0).max(100),
      valueAssessments: z.array(z.object({
        valueName: z.string(),
        score: z.number().min(0).max(100),
        confidence: z.string(),
        evidence: z.array(z.string()),
        alignmentLevel: z.enum(["strong", "moderate", "weak"]),
      })),
      culturalStrengths: z.array(z.string()),
      culturalRisks: z.array(z.string()),
    }).optional(),
    leadershipAssessment: z.object({
      overallScore: z.number().min(0).max(100),
      currentLevel: z.string(),
      potentialLevel: z.string(),
      dimensionScores: z.array(z.object({
        dimension: z.string(),
        score: z.number().min(0).max(100),
        examples: z.array(z.string()),
      })),
      strengths: z.array(z.string()),
      developmentAreas: z.array(z.string()),
    }).optional(),
    teamDynamics: z.object({
      preferredTeamSize: z.string(),
      collaborationStyle: z.string(),
      conflictResolution: z.string(),
      communicationPreference: z.string(),
    }).optional(),
    organizationalReadiness: z.object({
      adaptabilityScore: z.number().min(0).max(100),
      changeReadiness: z.string(),
      learningAgility: z.number().min(0).max(100),
      crossFunctionalAbility: z.string(),
    }).optional(),
  }).optional(),
});

export type ProfileData = z.infer<typeof profileDataSchema>;
