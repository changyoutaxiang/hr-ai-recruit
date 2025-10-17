import {
  type User, type InsertUser,
  type Job, type InsertJob,
  type Candidate, type InsertCandidate,
  type Interview, type InsertInterview,
  type AiConversation, type InsertAiConversation,
  type JobMatch, type InsertJobMatch,
  type PromptTemplate, type InsertPromptTemplate,
  type CandidateStatusHistory, type InsertCandidateStatusHistory,
  type ActivityLog, type InsertActivityLog,
  type Notification, type InsertNotification,
  type UserSession, type InsertUserSession,
  type Comment, type InsertComment,
  type CandidateProfile, type InsertCandidateProfile,
  type InterviewPreparation, type InsertInterviewPreparation,
  type HiringDecision, type InsertHiringDecision,
  type AiTokenUsage, type InsertAiTokenUsage,
  type ResumeAnalysis,
  type TargetedResumeAnalysis
} from "@shared/schema";
import { randomUUID } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type NullableJson = Record<string, unknown> | null;

type CreateUserInput = Omit<InsertUser, "password"> & { password?: string; id?: string };

type CreateJobMatchInput = Omit<InsertJobMatch, "matchScore"> & {
  matchScore?: string;
  score?: number | string | null;
  status?: string | null;
  analysis?: unknown;
};

type UpdateJobMatchInput = Partial<JobMatch> & {
  score?: number | string | null;
  analysis?: unknown;
};

const normalizeDecimalString = (value: number | string | null | undefined, fallback = "0"): string => {
  if (typeof value === "number") {
    return value.toFixed(2);
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  return fallback;
};

const parseNullableJson = (value: unknown): NullableJson => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  if (typeof value === "object") {
    return value as Record<string, unknown>;
  }
  return null;
};

const toStringArray = (value: unknown): string[] | null => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  return null;
};

const toResumeAnalysis = (value: unknown): ResumeAnalysis | null => {
  if (value && typeof value === "object") {
    return value as ResumeAnalysis;
  }
  return null;
};

const toTargetedAnalysis = (value: unknown): TargetedResumeAnalysis | null => {
  if (value && typeof value === "object") {
    return value as TargetedResumeAnalysis;
  }
  return null;
};

const toCamelCase = (key: string): string => key.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase());

const toSnakeCase = (key: string): string => key.replace(/[A-Z]/g, (letter: string) => `_${letter.toLowerCase()}`);

const isIsoDateString = (value: string): boolean => /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);

const transformRow = <T>(row: Record<string, any> | null | undefined): T | null => {
  if (!row) {
    return null;
  }

  const result: Record<string, any> = {};

  for (const [rawKey, rawValue] of Object.entries(row)) {
    const key = toCamelCase(rawKey);

    if (rawValue === null || rawValue === undefined) {
      result[key] = rawValue;
      continue;
    }

    if (Array.isArray(rawValue)) {
      result[key] = rawValue.map(item => (typeof item === "object" && item !== null ? transformRow(item as Record<string, any>) : item));
      continue;
    }

    if (typeof rawValue === "object") {
      result[key] = transformRow(rawValue as Record<string, any>);
      continue;
    }

    if (typeof rawValue === "string" && (key.endsWith("At") || key.endsWith("Date")) && isIsoDateString(rawValue)) {
      result[key] = new Date(rawValue);
      continue;
    }

    result[key] = rawValue;
  }

  return result as T;
};

const transformRows = <T>(rows: Array<Record<string, any>> | null | undefined): T[] => {
  if (!rows) {
    return [];
  }
  return rows.map(row => transformRow<T>(row)!).filter(Boolean);
};

// 安全处理Unicode字符串，避免转义序列错误
const sanitizeUnicodeString = (str: string): string => {
  try {
    // 移除或替换可能导致JSON解析错误的字符
    return str
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // 移除控制字符
      .replace(/\\/g, '\\\\') // 转义反斜杠
      .replace(/"/g, '\\"') // 转义双引号
      .replace(/\n/g, '\\n') // 转义换行符
      .replace(/\r/g, '\\r') // 转义回车符
      .replace(/\t/g, '\\t'); // 转义制表符
  } catch (error) {
    console.warn('Unicode string sanitization failed:', error);
    // 如果处理失败，返回安全的替代字符串
    return str.replace(/[^\x20-\x7E\u4e00-\u9fff]/g, '?');
  }
};

const prepareForInsert = (data: Record<string, any>): Record<string, any> => {
  const payload: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      continue;
    }

    const snakeKey = toSnakeCase(key);

    if (value instanceof Date) {
      payload[snakeKey] = value.toISOString();
      continue;
    }

    if (Array.isArray(value)) {
      // 处理数组中的字符串元素
      payload[snakeKey] = value.map(item => 
        typeof item === 'string' ? sanitizeUnicodeString(item) : item
      );
      continue;
    }

    if (typeof value === "object" && value !== null) {
      // 递归处理对象中的字符串值
      const sanitizedObject: Record<string, any> = {};
      for (const [objKey, objValue] of Object.entries(value)) {
        if (typeof objValue === 'string') {
          sanitizedObject[objKey] = sanitizeUnicodeString(objValue);
        } else {
          sanitizedObject[objKey] = objValue;
        }
      }
      payload[snakeKey] = sanitizedObject;
      continue;
    }

    if (typeof value === 'string') {
      payload[snakeKey] = sanitizeUnicodeString(value);
      continue;
    }

    payload[snakeKey] = value;
  }
  return payload;
};

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: CreateUserInput): Promise<User>;

  // Jobs
  getJobs(): Promise<Job[]>;
  getJob(id: string): Promise<Job | undefined>;
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: string, job: Partial<Job>): Promise<Job | undefined>;
  deleteJob(id: string): Promise<boolean>;

  // Candidates
  getCandidates(): Promise<Candidate[]>;
  getCandidate(id: string): Promise<Candidate | undefined>;
  createCandidate(candidate: InsertCandidate): Promise<Candidate>;
  updateCandidate(id: string, candidate: Partial<Candidate>): Promise<Candidate | undefined>;
  deleteCandidate(id: string): Promise<boolean>;
  searchCandidates(query: string): Promise<Candidate[]>;

  // Interviews
  getInterviews(): Promise<Interview[]>;
  getInterview(id: string): Promise<Interview | undefined>;
  getInterviewsByCandidate(candidateId: string): Promise<Interview[]>;
  getInterviewsByJob(jobId: string): Promise<Interview[]>;
  createInterview(interview: InsertInterview): Promise<Interview>;
  updateInterview(id: string, interview: Partial<Interview>): Promise<Interview | undefined>;
  deleteInterview(id: string): Promise<boolean>;

  // AI Conversations
  createAiConversation(conversation: InsertAiConversation): Promise<AiConversation>;
  getAiConversations(): Promise<AiConversation[]>;
  getAiConversationsBySession(sessionId: string): Promise<AiConversation[]>;

  // Job Matches
  createJobMatch(match: CreateJobMatchInput): Promise<JobMatch>;
  getJobMatch(jobId: string, candidateId: string): Promise<JobMatch | undefined>;
  getJobMatchesForCandidate(candidateId: string): Promise<JobMatch[]>;
  getJobMatchesForJob(jobId: string): Promise<JobMatch[]>;
  updateJobMatch(id: string, match: UpdateJobMatchInput): Promise<JobMatch | undefined>;

  // Candidate Status History
  createCandidateStatusHistory(history: InsertCandidateStatusHistory): Promise<CandidateStatusHistory>;
  getCandidateStatusHistory(candidateId: string): Promise<CandidateStatusHistory[]>;

  // Activity Log
  createActivityLog(activity: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogs(): Promise<ActivityLog[]>;
  getActivityLogsByUser(userId: string): Promise<ActivityLog[]>;

  // Notifications
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotifications(userId: string): Promise<Notification[]>;
  markNotificationAsRead(id: string): Promise<boolean>;

  // User Sessions
  createUserSession(session: InsertUserSession): Promise<UserSession>;
  updateUserSession(socketId: string, updates: Partial<UserSession>): Promise<UserSession | undefined>;
  getOnlineUsers(): Promise<User[]>;
  getUserSessions(userId: string): Promise<UserSession[]>;

  // Comments
  createComment(comment: InsertComment): Promise<Comment>;
  getComments(entityType: string, entityId: string): Promise<Comment[]>;

  // Candidate Profiles
  createCandidateProfile(profile: Omit<InsertCandidateProfile, 'version'>): Promise<CandidateProfile>;
  getCandidateProfiles(candidateId: string): Promise<CandidateProfile[]>;
  getLatestCandidateProfile(candidateId: string): Promise<CandidateProfile | undefined>;
  getCandidateProfileByVersion(candidateId: string, version: number): Promise<CandidateProfile | undefined>;
  updateCandidateProfile(id: string, updates: Partial<CandidateProfile>): Promise<CandidateProfile | undefined>;

  // Interview Preparations
  createInterviewPreparation(preparation: InsertInterviewPreparation): Promise<InterviewPreparation>;
  getInterviewPreparation(interviewId: string): Promise<InterviewPreparation | undefined>;
  updateInterviewPreparation(id: string, updates: Partial<InterviewPreparation>): Promise<InterviewPreparation | undefined>;

  // Additional user methods
  getUsers(): Promise<User[]>;

  // AI Token Usage
  createAiTokenUsage(usage: InsertAiTokenUsage): Promise<AiTokenUsage>;
  getAiTokenUsage(startDate?: Date, endDate?: Date): Promise<AiTokenUsage[]>;
  getAiTokenUsageByOperation(operation: string): Promise<AiTokenUsage[]>;
  getAiTokenUsageByUser(userId: string, startDate?: Date, endDate?: Date): Promise<AiTokenUsage[]>;
  getTotalCostByPeriod(startDate: Date, endDate: Date): Promise<number>;

  // Hiring Decisions
  createHiringDecision(decision: InsertHiringDecision): Promise<HiringDecision>;
  getHiringDecision(candidateId: string, jobId: string): Promise<HiringDecision | undefined>;
  getHiringDecisionById(id: string): Promise<HiringDecision | undefined>;
  getHiringDecisionsByJob(jobId: string): Promise<HiringDecision[]>;
  updateHiringDecision(id: string, updates: Partial<HiringDecision>): Promise<HiringDecision | undefined>;
  getCandidatesForJob(jobId: string): Promise<Candidate[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private jobs: Map<string, Job> = new Map();
  private candidates: Map<string, Candidate> = new Map();
  private interviews: Map<string, Interview> = new Map();
  private aiConversations: Map<string, AiConversation> = new Map();
  private jobMatches: Map<string, JobMatch> = new Map();
  private candidateStatusHistory: Map<string, CandidateStatusHistory> = new Map();
  private activityLogs: Map<string, ActivityLog> = new Map();
  private notifications: Map<string, Notification> = new Map();
  private userSessions: Map<string, UserSession> = new Map();
  private comments: Map<string, Comment> = new Map();
  private candidateProfiles: Map<string, CandidateProfile> = new Map();
  private interviewPreparations: Map<string, InterviewPreparation> = new Map();
  private hiringDecisions: Map<string, HiringDecision> = new Map();
  private aiTokenUsages: Map<string, AiTokenUsage> = new Map();

  constructor() {
    // Initialize with some sample data for development
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Create sample HR user
    const hrUser: User = {
      id: randomUUID(),
      email: "sarah.chen@company.com",
      password: "hashedpassword",
      name: "Sarah Chen",
      role: "hr_manager",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(hrUser.id, hrUser);

    // Create sample jobs
    const jobs: Job[] = [
      {
        id: randomUUID(),
        title: "Senior Frontend Developer",
        department: "Engineering",
        location: "San Francisco, CA",
        type: "full-time",
        salaryMin: 120000,
        salaryMax: 160000,
        requirements: ["React", "TypeScript", "5+ years experience", "Node.js", "GraphQL"],
        focusAreas: null,
        description: "We are looking for a senior frontend developer to join our team and lead the development of our next-generation web applications.",
        status: "active",
        createdBy: hrUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
        title: "Data Scientist",
        department: "Data",
        location: "Remote",
        type: "full-time",
        salaryMin: 110000,
        salaryMax: 140000,
        requirements: ["Python", "Machine Learning", "SQL", "3+ years experience", "TensorFlow"],
        focusAreas: null,
        description: "Join our data team to build ML models and analytics that drive business decisions.",
        status: "active",
        createdBy: hrUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
        title: "Product Manager",
        department: "Product",
        location: "New York, NY",
        type: "full-time",
        salaryMin: 130000,
        salaryMax: 170000,
        requirements: ["Product Management", "Agile", "5+ years experience", "Analytics", "User Research"],
        focusAreas: null,
        description: "Lead product strategy and execution for our core platform features.",
        status: "active",
        createdBy: hrUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    jobs.forEach(job => this.jobs.set(job.id, job));

    // Create sample candidates
    const candidates: Candidate[] = [
      {
        id: randomUUID(),
        name: "Alex Rodriguez",
        email: "alex.rodriguez@email.com",
        phone: "+1-555-0123",
        position: "Senior Frontend Developer",
        experience: 6,
        education: "BS Computer Science, Stanford University",
        location: "San Francisco, CA",
        salaryExpectation: 150000,
        expectedSalary: 150000,
        yearsOfExperience: 6,
        resumeUrl: null,
        resumeText: null,
        skills: ["React", "TypeScript", "JavaScript", "Node.js", "GraphQL", "CSS", "HTML"],
        status: "interview",
        matchScore: "92",
        aiSummary: "Highly experienced frontend developer with strong React and TypeScript skills. Perfect match for senior roles.",
        notes: "Excellent technical interview performance",
        source: "linkedin",
        tags: ["frontend", "senior", "high-priority"],
        resumeAnalysis: null,
        targetedAnalysis: null,
        lastContactedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "Jessica Wang",
        email: "j.wang@email.com",
        phone: "+1-555-0124",
        position: "Data Scientist",
        experience: 4,
        education: "MS Data Science, MIT",
        location: "Boston, MA",
        salaryExpectation: 125000,
        expectedSalary: 125000,
        yearsOfExperience: 4,
        resumeUrl: null,
        resumeText: null,
        skills: ["Python", "Machine Learning", "TensorFlow", "SQL", "R", "Statistics", "Deep Learning"],
        status: "screening",
        matchScore: "89",
        aiSummary: "Strong data science background with excellent ML skills and academic credentials.",
        notes: "Great portfolio of projects",
        source: "job_board",
        tags: ["data-science", "ml", "academic"],
        resumeAnalysis: null,
        targetedAnalysis: null,
        lastContactedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "Michael Thompson",
        email: "m.thompson@email.com",
        phone: "+1-555-0125",
        position: "Product Manager",
        experience: 7,
        education: "MBA, Wharton School",
        location: "New York, NY",
        salaryExpectation: 160000,
        expectedSalary: 160000,
        yearsOfExperience: 7,
        resumeUrl: null,
        resumeText: null,
        skills: ["Product Management", "Agile", "Scrum", "Analytics", "User Research", "Strategy"],
        status: "offer",
        matchScore: "95",
        aiSummary: "Experienced product manager with proven track record of successful product launches.",
        notes: "Strong leadership and strategic thinking",
        source: "referral",
        tags: ["product", "senior", "leadership"],
        resumeAnalysis: null,
        targetedAnalysis: null,
        lastContactedAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "Sarah Kim",
        email: "s.kim@email.com",
        phone: "+1-555-0126",
        position: "Full Stack Developer",
        experience: 3,
        education: "BS Software Engineering, UC Berkeley",
        location: "San Francisco, CA",
        salaryExpectation: 110000,
        expectedSalary: 110000,
        yearsOfExperience: 3,
        resumeUrl: null,
        resumeText: null,
        skills: ["React", "Node.js", "JavaScript", "Python", "MongoDB", "Express"],
        status: "applied",
        matchScore: "76",
        aiSummary: "Junior to mid-level developer with full stack capabilities and good growth potential.",
        notes: "Eager to learn and grow",
        source: "manual",
        tags: ["fullstack", "junior", "potential"],
        resumeAnalysis: null,
        targetedAnalysis: null,
        lastContactedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "David Chen",
        email: "d.chen@email.com",
        phone: "+1-555-0127",
        position: "DevOps Engineer",
        experience: 5,
        education: "BS Computer Engineering, Carnegie Mellon",
        location: "Seattle, WA",
        salaryExpectation: 135000,
        expectedSalary: 135000,
        yearsOfExperience: 5,
        resumeUrl: null,
        resumeText: null,
        skills: ["AWS", "Kubernetes", "Docker", "Terraform", "Python", "Linux", "CI/CD"],
        status: "screening",
        matchScore: "82",
        aiSummary: "Solid DevOps experience with cloud infrastructure and automation expertise.",
        notes: "Strong technical background",
        source: "linkedin",
        tags: ["devops", "cloud", "automation"],
        resumeAnalysis: null,
        targetedAnalysis: null,
        lastContactedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    candidates.forEach(candidate => this.candidates.set(candidate.id, candidate));

    // Create sample interviews
    const candidateIds = Array.from(this.candidates.keys());
    const jobIds = Array.from(this.jobs.keys());

    if (candidateIds.length > 0 && jobIds.length > 0) {
      const interviews: Interview[] = [
        {
          id: randomUUID(),
          candidateId: candidateIds[0], // Alex Rodriguez
          jobId: jobIds[0], // Senior Frontend Developer
          interviewerId: hrUser.id,
          scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        duration: 60,
        type: "video",
        status: "scheduled",
        meetingLink: "https://zoom.us/j/1234567890",
        location: null,
        round: 2,
        feedback: null,
        rating: null,
        recommendation: null,
        interviewerNotes: null,
        candidateNotes: null,
        transcription: null,
        recordingUrl: null,
        transcriptionMethod: null,
        aiKeyFindings: null,
        aiConcernAreas: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
        {
          id: randomUUID(),
          candidateId: candidateIds[1], // Jessica Wang
          jobId: jobIds[1], // Data Scientist
          interviewerId: hrUser.id,
          scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
          duration: 45,
          type: "phone",
          status: "scheduled",
          meetingLink: null,
          location: null,
        round: 1,
        feedback: null,
        rating: null,
        recommendation: null,
        interviewerNotes: "Initial phone screening",
        candidateNotes: null,
        transcription: null,
        recordingUrl: null,
        transcriptionMethod: null,
        aiKeyFindings: null,
        aiConcernAreas: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
        {
          id: randomUUID(),
          candidateId: candidateIds[2], // Michael Thompson
          jobId: jobIds[2], // Product Manager
          interviewerId: hrUser.id,
          scheduledDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          duration: 90,
          type: "in-person",
          status: "completed",
          meetingLink: null,
          location: "Office Conference Room A",
        round: 3,
        feedback: "Excellent strategic thinking and communication skills. Strong cultural fit.",
        rating: 5,
        recommendation: "hire",
        interviewerNotes: "Final round interview - recommend for hire",
        candidateNotes: "Very impressed with the team and company culture",
        transcription: null,
        recordingUrl: null,
        transcriptionMethod: null,
        aiKeyFindings: null,
        aiConcernAreas: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      ];

      interviews.forEach(interview => this.interviews.set(interview.id, interview));
    }
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: CreateUserInput): Promise<User> {
    const userId = insertUser.id ?? randomUUID();
    const user: User = {
      ...insertUser,
      id: userId,
      password: insertUser.password ?? "supabase-managed",
      role: insertUser.role || "hr_manager",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  // Jobs
  async getJobs(): Promise<Job[]> {
    return Array.from(this.jobs.values());
  }

  async getJob(id: string): Promise<Job | undefined> {
    return this.jobs.get(id);
  }

  async createJob(insertJob: InsertJob): Promise<Job> {
    const job: Job = {
      ...insertJob,
      id: randomUUID(),
      status: insertJob.status || "active",
      salaryMin: insertJob.salaryMin ?? null,
      salaryMax: insertJob.salaryMax ?? null,
      requirements: toStringArray(insertJob.requirements),
      focusAreas: toStringArray(insertJob.focusAreas),
      createdBy: insertJob.createdBy ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.jobs.set(job.id, job);
    return job;
  }

  async updateJob(id: string, jobUpdate: Partial<Job>): Promise<Job | undefined> {
    const job = this.jobs.get(id);
    if (!job) return undefined;

    const updatedJob: Job = {
      ...job,
      ...jobUpdate,
      updatedAt: new Date(),
    };
    this.jobs.set(id, updatedJob);
    return updatedJob;
  }

  async deleteJob(id: string): Promise<boolean> {
    return this.jobs.delete(id);
  }

  // Candidates
  async getCandidates(): Promise<Candidate[]> {
    return Array.from(this.candidates.values());
  }

  async getCandidate(id: string): Promise<Candidate | undefined> {
    return this.candidates.get(id);
  }

  async createCandidate(insertCandidate: InsertCandidate): Promise<Candidate> {
    const candidate: Candidate = {
      ...insertCandidate,
      id: randomUUID(),
      status: insertCandidate.status || "applied",
      source: insertCandidate.source || "manual",
      phone: insertCandidate.phone ?? null,
      position: insertCandidate.position ?? null,
      location: insertCandidate.location ?? null,
      experience: insertCandidate.experience ?? null,
      education: insertCandidate.education ?? null,
      salaryExpectation: insertCandidate.salaryExpectation ?? null,
      expectedSalary: insertCandidate.expectedSalary ?? null,
      yearsOfExperience: insertCandidate.yearsOfExperience ?? null,
      resumeUrl: insertCandidate.resumeUrl ?? null,
      resumeText: insertCandidate.resumeText ?? null,
      skills: toStringArray(insertCandidate.skills),
      matchScore: insertCandidate.matchScore ?? null,
      aiSummary: insertCandidate.aiSummary ?? null,
      notes: insertCandidate.notes ?? null,
      tags: toStringArray(insertCandidate.tags),
      resumeAnalysis: toResumeAnalysis(insertCandidate.resumeAnalysis),
      targetedAnalysis: toTargetedAnalysis(insertCandidate.targetedAnalysis),
      lastContactedAt: insertCandidate.lastContactedAt ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.candidates.set(candidate.id, candidate);
    return candidate;
  }

  async updateCandidate(id: string, candidateUpdate: Partial<Candidate>): Promise<Candidate | undefined> {
    const candidate = this.candidates.get(id);
    if (!candidate) return undefined;

    // Track status changes
    if (candidateUpdate.status && candidateUpdate.status !== candidate.status) {
      await this.createCandidateStatusHistory({
        candidateId: id,
        oldStatus: candidate.status,
        newStatus: candidateUpdate.status,
        reason: "Status updated",
        notes: null,
        changedBy: null, // TODO: Get from auth context
      });
    }

    const updatedCandidate: Candidate = {
      ...candidate,
      ...candidateUpdate,
      updatedAt: new Date(),
    };
    this.candidates.set(id, updatedCandidate);
    return updatedCandidate;
  }

  async deleteCandidate(id: string): Promise<boolean> {
    return this.candidates.delete(id);
  }

  async searchCandidates(query: string): Promise<Candidate[]> {
    const candidates = Array.from(this.candidates.values());
    const lowerQuery = query.toLowerCase();
    
    return candidates.filter(candidate => 
      candidate.name.toLowerCase().includes(lowerQuery) ||
      candidate.email.toLowerCase().includes(lowerQuery) ||
      candidate.position?.toLowerCase().includes(lowerQuery) ||
      (candidate.skills as string[])?.some(skill => skill.toLowerCase().includes(lowerQuery)) ||
      (candidate.tags as string[])?.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      candidate.location?.toLowerCase().includes(lowerQuery)
    );
  }

  // Interviews
  async getInterviews(): Promise<Interview[]> {
    return Array.from(this.interviews.values());
  }

  async getInterview(id: string): Promise<Interview | undefined> {
    return this.interviews.get(id);
  }

  async getInterviewsByCandidate(candidateId: string): Promise<Interview[]> {
    return Array.from(this.interviews.values()).filter(
      interview => interview.candidateId === candidateId
    );
  }

  async getInterviewsByJob(jobId: string): Promise<Interview[]> {
    return Array.from(this.interviews.values()).filter(
      interview => interview.jobId === jobId
    );
  }

  async createInterview(insertInterview: InsertInterview): Promise<Interview> {
    const interview: Interview = {
      ...insertInterview,
      id: randomUUID(),
      status: insertInterview.status || "scheduled",
      interviewerId: insertInterview.interviewerId ?? null,
      meetingLink: insertInterview.meetingLink ?? null,
      location: insertInterview.location ?? null,
      round: insertInterview.round ?? 1,
      feedback: insertInterview.feedback ?? null,
      rating: insertInterview.rating ?? null,
      recommendation: insertInterview.recommendation ?? null,
      interviewerNotes: insertInterview.interviewerNotes ?? null,
      candidateNotes: insertInterview.candidateNotes ?? null,
      transcription: insertInterview.transcription ?? null,
      recordingUrl: insertInterview.recordingUrl ?? null,
      transcriptionMethod: insertInterview.transcriptionMethod ?? null,
      aiKeyFindings: insertInterview.aiKeyFindings ?? null,
      aiConcernAreas: insertInterview.aiConcernAreas ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.interviews.set(interview.id, interview);
    return interview;
  }

  async updateInterview(id: string, interviewUpdate: Partial<Interview>): Promise<Interview | undefined> {
    const interview = this.interviews.get(id);
    if (!interview) return undefined;

    const updatedInterview: Interview = {
      ...interview,
      ...interviewUpdate,
      updatedAt: new Date(),
    };
    this.interviews.set(id, updatedInterview);
    return updatedInterview;
  }

  async deleteInterview(id: string): Promise<boolean> {
    return this.interviews.delete(id);
  }

  // AI Conversations
  async createAiConversation(insertConversation: InsertAiConversation): Promise<AiConversation> {
    const conversation: AiConversation = {
      ...insertConversation,
      id: randomUUID(),
      tokensUsed: insertConversation.tokensUsed ?? null,
      templateId: insertConversation.templateId ?? null,
      context: insertConversation.context ?? null,
      createdAt: new Date(),
    };
    this.aiConversations.set(conversation.id, conversation);
    return conversation;
  }

  async getAiConversations(): Promise<AiConversation[]> {
    return Array.from(this.aiConversations.values()).sort((a, b) => {
      const timeA = a.createdAt?.getTime() || 0;
      const timeB = b.createdAt?.getTime() || 0;
      return timeB - timeA;
    });
  }

  async getAiConversationsBySession(sessionId: string): Promise<AiConversation[]> {
    return Array.from(this.aiConversations.values()).filter(
      conversation => conversation.sessionId === sessionId
    );
  }

  // Job Matches
  async createJobMatch(matchInput: CreateJobMatchInput): Promise<JobMatch> {
    const id = randomUUID();
    const normalizedScore = normalizeDecimalString(matchInput.score ?? matchInput.matchScore ?? null);
    const analysis = parseNullableJson(matchInput.analysis);
    const aiAnalysis = matchInput.aiAnalysis ?? (analysis ? JSON.stringify(analysis) : null);

    const match: JobMatch = {
      id,
      candidateId: matchInput.candidateId,
      jobId: matchInput.jobId,
      matchScore: matchInput.matchScore ?? normalizedScore,
      matchReasons: matchInput.matchReasons ?? null,
      aiAnalysis,
      basicMatchScore: matchInput.basicMatchScore ?? null,
      status: matchInput.status ?? "pending",
      analysis,
      score: normalizedScore,
      createdAt: new Date(),
    };
    this.jobMatches.set(match.id, match);
    return match;
  }

  async getJobMatch(jobId: string, candidateId: string): Promise<JobMatch | undefined> {
    return Array.from(this.jobMatches.values()).find(
      match => match.jobId === jobId && match.candidateId === candidateId
    );
  }

  async getJobMatchesForCandidate(candidateId: string): Promise<JobMatch[]> {
    return Array.from(this.jobMatches.values()).filter(
      match => match.candidateId === candidateId
    );
  }

  async getJobMatchesForJob(jobId: string): Promise<JobMatch[]> {
    return Array.from(this.jobMatches.values()).filter(
      match => match.jobId === jobId
    );
  }

  async updateJobMatch(id: string, updates: UpdateJobMatchInput): Promise<JobMatch | undefined> {
    const current = this.jobMatches.get(id);
    if (!current) return undefined;

    const normalizedScore = updates.score !== undefined
      ? normalizeDecimalString(updates.score, current.matchScore)
      : (updates.matchScore ?? current.matchScore);

    const analysis = updates.analysis !== undefined
      ? parseNullableJson(updates.analysis)
      : current.analysis ?? null;

    const aiAnalysis = updates.aiAnalysis !== undefined
      ? updates.aiAnalysis ?? null
      : current.aiAnalysis;

    const updatedMatch: JobMatch = {
      ...current,
      ...updates,
      matchScore: updates.matchScore ?? normalizedScore,
      score: normalizeDecimalString(
        updates.score !== undefined ? updates.score : current.score ?? current.matchScore,
        current.matchScore
      ),
      analysis,
      aiAnalysis: aiAnalysis ?? (analysis ? JSON.stringify(analysis) : null),
    };

    this.jobMatches.set(id, updatedMatch);
    return updatedMatch;
  }

  // Candidate Status History
  async createCandidateStatusHistory(insertHistory: InsertCandidateStatusHistory): Promise<CandidateStatusHistory> {
    const history: CandidateStatusHistory = {
      ...insertHistory,
      id: randomUUID(),
      oldStatus: insertHistory.oldStatus ?? null,
      reason: insertHistory.reason ?? null,
      notes: insertHistory.notes ?? null,
      changedBy: insertHistory.changedBy ?? null,
      createdAt: new Date(),
    };
    this.candidateStatusHistory.set(history.id, history);
    return history;
  }

  async getCandidateStatusHistory(candidateId: string): Promise<CandidateStatusHistory[]> {
    return Array.from(this.candidateStatusHistory.values()).filter(
      history => history.candidateId === candidateId
    ).sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  // Activity Log methods
  async createActivityLog(activity: InsertActivityLog): Promise<ActivityLog> {
    const newActivity: ActivityLog = {
      id: randomUUID(),
      userId: activity.userId,
      action: activity.action,
      entityType: activity.entityType,
      entityId: activity.entityId,
      entityName: activity.entityName,
      details: activity.details || null,
      createdAt: new Date(),
    };
    this.activityLogs.set(newActivity.id, newActivity);
    return newActivity;
  }

  async getActivityLogs(): Promise<ActivityLog[]> {
    return Array.from(this.activityLogs.values())
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getActivityLogsByUser(userId: string): Promise<ActivityLog[]> {
    return Array.from(this.activityLogs.values())
      .filter(log => log.userId === userId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  // Notification methods
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const newNotification: Notification = {
      id: randomUUID(),
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      entityType: notification.entityType || null,
      entityId: notification.entityId || null,
      isRead: notification.isRead || false,
      createdAt: new Date(),
    };
    this.notifications.set(newNotification.id, newNotification);
    return newNotification;
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async markNotificationAsRead(id: string): Promise<boolean> {
    const notification = this.notifications.get(id);
    if (notification) {
      notification.isRead = true;
      this.notifications.set(id, notification);
      return true;
    }
    return false;
  }

  // User Session methods
  async createUserSession(session: InsertUserSession): Promise<UserSession> {
    const newSession: UserSession = {
      id: randomUUID(),
      userId: session.userId,
      isOnline: session.isOnline !== undefined ? session.isOnline : true,
      currentPage: session.currentPage || null,
      lastActivity: session.lastActivity || new Date(),
      socketId: session.socketId || null,
      createdAt: new Date(),
    };
    this.userSessions.set(newSession.id, newSession);
    return newSession;
  }

  async updateUserSession(socketId: string, updates: Partial<UserSession>): Promise<UserSession | undefined> {
    for (const [id, session] of this.userSessions) {
      if (session.socketId === socketId) {
        const updatedSession = { ...session, ...updates };
        this.userSessions.set(id, updatedSession);
        return updatedSession;
      }
    }
    return undefined;
  }

  async getOnlineUsers(): Promise<User[]> {
    const onlineSessions = Array.from(this.userSessions.values())
      .filter(session => session.isOnline);
    
    const onlineUserIds = new Set(onlineSessions.map(session => session.userId));
    return Array.from(this.users.values())
      .filter(user => onlineUserIds.has(user.id));
  }

  async getUserSessions(userId: string): Promise<UserSession[]> {
    return Array.from(this.userSessions.values())
      .filter(session => session.userId === userId);
  }

  // Comment methods
  async createComment(comment: InsertComment): Promise<Comment> {
    const newComment: Comment = {
      id: randomUUID(),
      entityType: comment.entityType,
      entityId: comment.entityId,
      content: comment.content,
      authorId: comment.authorId,
      isInternal: comment.isInternal !== undefined ? comment.isInternal : true,
      mentions: comment.mentions || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.comments.set(newComment.id, newComment);
    return newComment;
  }

  async getComments(entityType: string, entityId: string): Promise<Comment[]> {
    return Array.from(this.comments.values())
      .filter(comment => comment.entityType === entityType && comment.entityId === entityId)
      .sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
  }

  async createCandidateProfile(profile: Omit<InsertCandidateProfile, 'version'>): Promise<CandidateProfile> {
    if (!profile.candidateId) {
      throw new Error('candidateId is required');
    }

    if (!profile.stage) {
      throw new Error('stage is required');
    }

    if (!profile.profileData) {
      throw new Error('profileData is required');
    }

    const candidate = await this.getCandidate(profile.candidateId);
    if (!candidate) {
      throw new Error(`Candidate ${profile.candidateId} not found`);
    }

    const existingProfiles = Array.from(this.candidateProfiles.values())
      .filter(p => p.candidateId === profile.candidateId);

    const maxVersion = existingProfiles.length > 0
      ? Math.max(...existingProfiles.map(p => p.version))
      : 0;

    const nextVersion = maxVersion + 1;

    const versionExists = existingProfiles.some(p => p.version === nextVersion);
    if (versionExists) {
      throw new Error(`Version ${nextVersion} already exists for candidate ${profile.candidateId}`);
    }

    const newProfile: CandidateProfile = {
      id: randomUUID(),
      ...profile,
      version: nextVersion,
      aiSummary: profile.aiSummary ?? null,
      jobId: profile.jobId ?? null,
      profileData: profile.profileData ?? {},
      overallScore: profile.overallScore ?? null,
      dataSources: profile.dataSources ?? null,
      gaps: profile.gaps ?? null,
      strengths: profile.strengths ?? null,
      concerns: profile.concerns ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.candidateProfiles.set(newProfile.id, newProfile);
    console.log(`Created candidate profile version ${nextVersion} for candidate ${profile.candidateId}`);
    return newProfile;
  }

  async getCandidateProfiles(candidateId: string): Promise<CandidateProfile[]> {
    if (!candidateId) {
      throw new Error('candidateId is required');
    }

    return Array.from(this.candidateProfiles.values())
      .filter(profile => profile.candidateId === candidateId)
      .sort((a, b) => b.version - a.version);
  }

  async getLatestCandidateProfile(candidateId: string): Promise<CandidateProfile | undefined> {
    if (!candidateId) {
      throw new Error('candidateId is required');
    }

    const profiles = Array.from(this.candidateProfiles.values())
      .filter(profile => profile.candidateId === candidateId);

    if (profiles.length === 0) return undefined;

    return profiles.reduce((latest, current) =>
      current.version > latest.version ? current : latest
    );
  }

  async getCandidateProfileByVersion(candidateId: string, version: number): Promise<CandidateProfile | undefined> {
    if (!candidateId) {
      throw new Error('candidateId is required');
    }

    if (!Number.isInteger(version) || version < 1) {
      throw new Error('version must be a positive integer');
    }

    return Array.from(this.candidateProfiles.values())
      .find(profile => profile.candidateId === candidateId && profile.version === version);
  }

  async updateCandidateProfile(id: string, updates: Partial<CandidateProfile>): Promise<CandidateProfile | undefined> {
    const profile = this.candidateProfiles.get(id);
    if (!profile) return undefined;

    const updatedProfile: CandidateProfile = {
      ...profile,
      ...updates,
      updatedAt: new Date(),
    };
    this.candidateProfiles.set(id, updatedProfile);
    return updatedProfile;
  }

  // Additional user methods
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Interview Preparations
  async createInterviewPreparation(preparation: InsertInterviewPreparation): Promise<InterviewPreparation> {
    const id = randomUUID();
    const now = new Date();
    const newPreparation: InterviewPreparation = {
      id,
      ...preparation,
      version: preparation.version ?? 1,
      status: preparation.status ?? "generating",
      focusAreas: preparation.focusAreas ?? [],
      suggestedQuestions: preparation.suggestedQuestions ?? [],
      candidateContext: preparation.candidateContext ?? {},
      previousGaps: preparation.previousGaps ?? [],
      interviewerTips: preparation.interviewerTips ?? [],
      confidence: preparation.confidence ?? null,
      jobId: preparation.jobId ?? null,
      generatedFor: preparation.generatedFor ?? null,
      aiModel: preparation.aiModel ?? null,
      viewedAt: null,
      feedbackRating: null,
      feedbackComment: null,
      createdAt: now,
      updatedAt: now,
    };

    this.interviewPreparations.set(id, newPreparation);
    return newPreparation;
  }

  async getInterviewPreparation(interviewId: string): Promise<InterviewPreparation | undefined> {
    return Array.from(this.interviewPreparations.values())
      .find(prep => prep.interviewId === interviewId);
  }

  async updateInterviewPreparation(id: string, updates: Partial<InterviewPreparation>): Promise<InterviewPreparation | undefined> {
    const preparation = this.interviewPreparations.get(id);
    if (!preparation) return undefined;

    const updated = {
      ...preparation,
      ...updates,
      status: updates.status ?? preparation.status,
      focusAreas: updates.focusAreas ?? preparation.focusAreas,
      suggestedQuestions: updates.suggestedQuestions ?? preparation.suggestedQuestions,
      candidateContext: updates.candidateContext ?? preparation.candidateContext,
      previousGaps: updates.previousGaps ?? preparation.previousGaps,
      interviewerTips: updates.interviewerTips ?? preparation.interviewerTips,
      confidence: updates.confidence ?? preparation.confidence ?? null,
      jobId: updates.jobId ?? preparation.jobId ?? null,
      generatedFor: updates.generatedFor ?? preparation.generatedFor ?? null,
      aiModel: updates.aiModel ?? preparation.aiModel ?? null,
      updatedAt: new Date(),
    };

    this.interviewPreparations.set(id, updated);
    return updated;
  }

  // Hiring Decision methods
  async createHiringDecision(decision: InsertHiringDecision): Promise<HiringDecision> {
    const id = randomUUID();
    const now = new Date();
    const newDecision: HiringDecision = {
      id,
      ...decision,
      decidedBy: decision.decidedBy ?? null,
      decidedAt: decision.decidedAt ?? null,
      status: decision.status ?? "draft",
      strengths: decision.strengths ?? null,
      weaknesses: decision.weaknesses ?? null,
      recommendation: decision.recommendation ?? "",
      nextSteps: decision.nextSteps ?? null,
      riskAssessment: decision.riskAssessment ?? null,
      growthPotential: decision.growthPotential ?? null,
      culturalFit: decision.culturalFit ?? null,
      comparisonWithOthers: decision.comparisonWithOthers ?? null,
      alternativeRoles: decision.alternativeRoles ?? null,
      conditions: decision.conditions ?? null,
      timelineSuggestion: decision.timelineSuggestion ?? null,
      compensationRange: decision.compensationRange ?? null,
      negotiationPoints: decision.negotiationPoints ?? null,
      confidence: decision.confidence ?? null,
      viewedAt: null,
      feedbackRating: null,
      feedbackComment: null,
      createdAt: now,
      updatedAt: now,
    };
    this.hiringDecisions.set(id, newDecision);
    return newDecision;
  }

  async getHiringDecision(candidateId: string, jobId: string): Promise<HiringDecision | undefined> {
    return Array.from(this.hiringDecisions.values())
      .find(d => d.candidateId === candidateId && d.jobId === jobId);
  }

  async getHiringDecisionById(id: string): Promise<HiringDecision | undefined> {
    return this.hiringDecisions.get(id);
  }

  async getHiringDecisionsByJob(jobId: string): Promise<HiringDecision[]> {
    return Array.from(this.hiringDecisions.values())
      .filter(d => d.jobId === jobId);
  }

  async updateHiringDecision(id: string, updates: Partial<HiringDecision>): Promise<HiringDecision | undefined> {
    const decision = this.hiringDecisions.get(id);
    if (!decision) return undefined;

    const updated = {
      ...decision,
      ...updates,
      strengths: updates.strengths ?? decision.strengths,
      weaknesses: updates.weaknesses ?? decision.weaknesses,
      recommendation: updates.recommendation ?? decision.recommendation,
      nextSteps: updates.nextSteps ?? decision.nextSteps,
      riskAssessment: updates.riskAssessment ?? decision.riskAssessment,
      growthPotential: updates.growthPotential ?? decision.growthPotential,
      culturalFit: updates.culturalFit ?? decision.culturalFit,
      comparisonWithOthers: updates.comparisonWithOthers ?? decision.comparisonWithOthers,
      alternativeRoles: updates.alternativeRoles ?? decision.alternativeRoles,
      conditions: updates.conditions ?? decision.conditions,
      timelineSuggestion: updates.timelineSuggestion ?? decision.timelineSuggestion,
      compensationRange: updates.compensationRange ?? decision.compensationRange,
      negotiationPoints: updates.negotiationPoints ?? decision.negotiationPoints,
      confidence: updates.confidence ?? decision.confidence,
      updatedAt: new Date(),
    };
    this.hiringDecisions.set(id, updated);
    return updated;
  }


  async getCandidatesForJob(jobId: string): Promise<Candidate[]> {
    // Get all candidates that have applied for this job
    const jobMatchesForJob = Array.from(this.jobMatches.values())
      .filter(match => match.jobId === jobId);

    const candidateIds = jobMatchesForJob.map(match => match.candidateId);
    return Array.from(this.candidates.values())
      .filter(c => candidateIds.includes(c.id));
  }

  // AI Token Usage Methods
  async createAiTokenUsage(usage: InsertAiTokenUsage): Promise<AiTokenUsage> {
    const id = randomUUID();
    const aiTokenUsage: AiTokenUsage = {
      id,
      userId: usage.userId || null,
      operation: usage.operation,
      entityType: usage.entityType || null,
      entityId: usage.entityId || null,
      model: usage.model,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      estimatedCost: usage.estimatedCost || null,
      success: usage.success ?? true,
      errorMessage: usage.errorMessage || null,
      latencyMs: usage.latencyMs || null,
      retryCount: usage.retryCount ?? 0,
      metadata: usage.metadata || null,
      createdAt: new Date(),
    };
    this.aiTokenUsages.set(id, aiTokenUsage);
    return aiTokenUsage;
  }

  async getAiTokenUsage(startDate?: Date, endDate?: Date): Promise<AiTokenUsage[]> {
    let usages = Array.from(this.aiTokenUsages.values());

    if (startDate) {
      usages = usages.filter(u => u.createdAt && u.createdAt >= startDate);
    }

    if (endDate) {
      usages = usages.filter(u => u.createdAt && u.createdAt <= endDate);
    }

    return usages.sort((a, b) =>
      (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  }

  async getAiTokenUsageByOperation(operation: string): Promise<AiTokenUsage[]> {
    return Array.from(this.aiTokenUsages.values())
      .filter(u => u.operation === operation)
      .sort((a, b) =>
        (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
      );
  }

  async getAiTokenUsageByUser(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AiTokenUsage[]> {
    let usages = Array.from(this.aiTokenUsages.values())
      .filter(u => u.userId === userId);

    if (startDate) {
      usages = usages.filter(u => u.createdAt && u.createdAt >= startDate);
    }

    if (endDate) {
      usages = usages.filter(u => u.createdAt && u.createdAt <= endDate);
    }

    return usages.sort((a, b) =>
      (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  }

  async getTotalCostByPeriod(startDate: Date, endDate: Date): Promise<number> {
    const usages = await this.getAiTokenUsage(startDate, endDate);

    return usages.reduce((total, usage) => {
      const cost = usage.estimatedCost ? parseFloat(usage.estimatedCost as string) : 0;
      return total + cost;
    }, 0);
  }
}

class SupabaseStorage implements IStorage {
  private client: SupabaseClient;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      throw new Error("Supabase credentials missing: ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set");
    }

    // Custom fetch implementation to handle Node.js v24 network issues
    const customFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      try {
        // Use Node.js built-in fetch with additional options
        const response = await fetch(input, {
          ...init,
          // Add keepalive and other options to improve reliability
          keepalive: true,
          // Set a reasonable timeout
          signal: init?.signal || AbortSignal.timeout(30000),
        });
        return response;
      } catch (error) {
        console.error('Custom fetch error:', error);
        throw error;
      }
    };

    this.client = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        fetch: customFetch,
      },
    });
  }

  private async selectSingle<T>(table: string, filters: Record<string, any>): Promise<T | undefined> {
    let query = this.client.from(table).select("*").limit(1);
    for (const [key, value] of Object.entries(filters)) {
      const column = toSnakeCase(key);
      if (value === null) {
        query = query.is(column, null);
      } else {
        query = query.eq(column, value as never);
      }
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      if (error.code === "PGRST116") {
        return undefined;
      }
      throw new Error(`Supabase query failed on ${table}: ${error.message}`);
    }

    return transformRow<T>(data) ?? undefined;
  }

  private async selectMany<T>(
    table: string,
    filters?: Record<string, any>,
    options?: { orderBy?: string; ascending?: boolean }
  ): Promise<T[]> {
    let query = this.client.from(table).select("*");

    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        const column = toSnakeCase(key);
        if (value === null) {
          query = query.is(column, null);
        } else if (Array.isArray(value)) {
          query = query.in(column, value as never);
        } else {
          query = query.eq(column, value as never);
        }
      }
    }

    if (options?.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending ?? true } as never);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Supabase query failed on ${table}: ${error.message}`);
    }

    return transformRows<T>(data);
  }

  private async insertRow<T>(table: string, payload: Record<string, any>): Promise<T> {
    const prepared = prepareForInsert(payload);
    const { data, error } = await this.client
      .from(table)
      .insert(prepared as never)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Supabase insert failed on ${table}: ${error.message}`);
    }

    const transformed = transformRow<T>(data);
    if (!transformed) {
      throw new Error(`Supabase insert returned no data for ${table}`);
    }
    return transformed;
  }

  private async updateRow<T>(table: string, filters: Record<string, any>, updates: Record<string, any>): Promise<T | undefined> {
    const prepared = prepareForInsert(updates);
    const filterPayload: Record<string, any> = {};
    for (const [key, value] of Object.entries(filters)) {
      filterPayload[toSnakeCase(key)] = value;
    }

    const { data, error } = await this.client
      .from(table)
      .update(prepared as never)
      .match(filterPayload as never)
      .select("*")
      .maybeSingle();
    if (error) {
      if (error.code === "PGRST116") {
        return undefined;
      }
      throw new Error(`Supabase update failed on ${table}: ${error.message}`);
    }

    return transformRow<T>(data) ?? undefined;
  }

  private async deleteRows(table: string, filters: Record<string, any>): Promise<boolean> {
    const filterPayload: Record<string, any> = {};
    for (const [key, value] of Object.entries(filters)) {
      filterPayload[toSnakeCase(key)] = value;
    }

    const { error } = await this.client
      .from(table)
      .delete()
      .match(filterPayload as never);
    if (error) {
      throw new Error(`Supabase delete failed on ${table}: ${error.message}`);
    }
    return true;
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.selectSingle<User>("users", { id });
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.selectSingle<User>("users", { email });
  }

  async createUser(user: CreateUserInput): Promise<User> {
    const payload: CreateUserInput = {
      ...user,
      password: user.password ?? "supabase-managed",
    };
    return this.insertRow<User>("users", payload as Record<string, any>);
  }

  // Jobs
  async getJobs(): Promise<Job[]> {
    return this.selectMany<Job>("jobs", undefined, { orderBy: "created_at", ascending: false });
  }

  async getJob(id: string): Promise<Job | undefined> {
    return this.selectSingle<Job>("jobs", { id });
  }

  async createJob(job: InsertJob): Promise<Job> {
    return this.insertRow<Job>("jobs", job);
  }

  async updateJob(id: string, job: Partial<Job>): Promise<Job | undefined> {
    const payload: Partial<Job> = {
      ...job,
      updatedAt: new Date(),
    };
    return this.updateRow<Job>("jobs", { id }, payload);
  }

  async deleteJob(id: string): Promise<boolean> {
    await this.deleteRows("jobs", { id });
    return true;
  }

  // Candidates
  async getCandidates(): Promise<Candidate[]> {
    return this.selectMany<Candidate>("candidates", undefined, { orderBy: "created_at", ascending: false });
  }

  async getCandidate(id: string): Promise<Candidate | undefined> {
    return this.selectSingle<Candidate>("candidates", { id });
  }

  async createCandidate(candidate: InsertCandidate): Promise<Candidate> {
    return this.insertRow<Candidate>("candidates", candidate);
  }

  async updateCandidate(id: string, candidate: Partial<Candidate>): Promise<Candidate | undefined> {
    const payload: Partial<Candidate> = {
      ...candidate,
      updatedAt: new Date(),
    };
    return this.updateRow<Candidate>("candidates", { id }, payload);
  }

  async deleteCandidate(id: string): Promise<boolean> {
    await this.deleteRows("candidates", { id });
    return true;
  }

  async searchCandidates(query: string): Promise<Candidate[]> {
    const { data, error } = await this.client
      .from("candidates")
      .select("*")
      .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%,position.ilike.%${query}%` as never);

    if (error) {
      throw new Error(`Supabase search failed on candidates: ${error.message}`);
    }

    return transformRows<Candidate>(data);
  }

  // Interviews
  async getInterviews(): Promise<Interview[]> {
    return this.selectMany<Interview>("interviews", undefined, { orderBy: "scheduled_date", ascending: true });
  }

  async getInterview(id: string): Promise<Interview | undefined> {
    return this.selectSingle<Interview>("interviews", { id });
  }

  async getInterviewsByCandidate(candidateId: string): Promise<Interview[]> {
    return this.selectMany<Interview>("interviews", { candidateId }, { orderBy: "scheduled_date", ascending: false });
  }

  async getInterviewsByJob(jobId: string): Promise<Interview[]> {
    return this.selectMany<Interview>("interviews", { jobId }, { orderBy: "scheduled_date", ascending: false });
  }

  async createInterview(interview: InsertInterview): Promise<Interview> {
    return this.insertRow<Interview>("interviews", interview);
  }

  async updateInterview(id: string, interview: Partial<Interview>): Promise<Interview | undefined> {
    const payload: Partial<Interview> = {
      ...interview,
      updatedAt: new Date(),
    };
    return this.updateRow<Interview>("interviews", { id }, payload);
  }

  async deleteInterview(id: string): Promise<boolean> {
    await this.deleteRows("interviews", { id });
    return true;
  }

  // AI Conversations
  async createAiConversation(conversation: InsertAiConversation): Promise<AiConversation> {
    return this.insertRow<AiConversation>("ai_conversations", conversation);
  }

  async getAiConversations(): Promise<AiConversation[]> {
    return this.selectMany<AiConversation>("ai_conversations", undefined, { orderBy: "created_at", ascending: false });
  }

  async getAiConversationsBySession(sessionId: string): Promise<AiConversation[]> {
    return this.selectMany<AiConversation>("ai_conversations", { sessionId }, { orderBy: "created_at", ascending: true });
  }

  // Job Matches
  async createJobMatch(match: CreateJobMatchInput): Promise<JobMatch> {
    const payload = {
      ...match,
      matchScore: normalizeDecimalString(match.matchScore ?? match.score ?? "0"),
      score: normalizeDecimalString(match.score ?? match.matchScore ?? "0"),
    };
    return this.insertRow<JobMatch>("job_matches", payload);
  }

  async getJobMatch(jobId: string, candidateId: string): Promise<JobMatch | undefined> {
    const { data, error } = await this.client
      .from("job_matches")
      .select("*")
      .eq("job_id", jobId)
      .eq("candidate_id", candidateId)
      .limit(1)
      .maybeSingle();

    if (error) {
      if (error.code === "PGRST116") {
        return undefined;
      }
      throw new Error(`Supabase query failed on job_matches: ${error.message}`);
    }

    return transformRow<JobMatch>(data) ?? undefined;
  }

  async getJobMatchesForCandidate(candidateId: string): Promise<JobMatch[]> {
    return this.selectMany<JobMatch>("job_matches", { candidateId }, { orderBy: "created_at", ascending: false });
  }

  async getJobMatchesForJob(jobId: string): Promise<JobMatch[]> {
    return this.selectMany<JobMatch>("job_matches", { jobId }, { orderBy: "created_at", ascending: false });
  }

  async updateJobMatch(id: string, match: UpdateJobMatchInput): Promise<JobMatch | undefined> {
    const payload: Record<string, any> = { ...match };
    if (match.score !== undefined) {
      payload.score = normalizeDecimalString(match.score);
    }
    if (match.matchScore !== undefined) {
      payload.matchScore = normalizeDecimalString(match.matchScore);
    }

    return this.updateRow<JobMatch>("job_matches", { id }, payload);
  }

  // Candidate Status History
  async createCandidateStatusHistory(history: InsertCandidateStatusHistory): Promise<CandidateStatusHistory> {
    return this.insertRow<CandidateStatusHistory>("candidate_status_history", history);
  }

  async getCandidateStatusHistory(candidateId: string): Promise<CandidateStatusHistory[]> {
    return this.selectMany<CandidateStatusHistory>(
      "candidate_status_history",
      { candidateId },
      { orderBy: "created_at", ascending: false }
    );
  }

  // Activity Log
  async createActivityLog(activity: InsertActivityLog): Promise<ActivityLog> {
    return this.insertRow<ActivityLog>("activity_log", activity);
  }

  async getActivityLogs(): Promise<ActivityLog[]> {
    return this.selectMany<ActivityLog>("activity_log", undefined, { orderBy: "created_at", ascending: false });
  }

  async getActivityLogsByUser(userId: string): Promise<ActivityLog[]> {
    return this.selectMany<ActivityLog>("activity_log", { userId }, { orderBy: "created_at", ascending: false });
  }

  // Notifications
  async createNotification(notification: InsertNotification): Promise<Notification> {
    return this.insertRow<Notification>("notifications", notification);
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return this.selectMany<Notification>("notifications", { userId }, { orderBy: "created_at", ascending: false });
  }

  async markNotificationAsRead(id: string): Promise<boolean> {
    await this.updateRow<Notification>("notifications", { id }, { isRead: true });
    return true;
  }

  // User Sessions
  async createUserSession(session: InsertUserSession): Promise<UserSession> {
    return this.insertRow<UserSession>("user_sessions", session);
  }

  async updateUserSession(socketId: string, updates: Partial<UserSession>): Promise<UserSession | undefined> {
    return this.updateRow<UserSession>("user_sessions", { socketId }, updates);
  }

  async getOnlineUsers(): Promise<User[]> {
    const { data, error } = await this.client
      .from("user_sessions")
      .select("user_id")
      .eq("is_online", true);

    if (error) {
      throw new Error(`Supabase query failed on user_sessions: ${error.message}`);
    }

    const ids = (data || []).map(entry => entry.user_id).filter(Boolean);
    if (!ids.length) {
      return [];
    }

    return this.selectMany<User>("users", { id: ids });
  }

  async getUserSessions(userId: string): Promise<UserSession[]> {
    return this.selectMany<UserSession>("user_sessions", { userId }, { orderBy: "last_seen_at", ascending: false });
  }

  // Comments
  async createComment(comment: InsertComment): Promise<Comment> {
    return this.insertRow<Comment>("comments", comment);
  }

  async getComments(entityType: string, entityId: string): Promise<Comment[]> {
    return this.selectMany<Comment>("comments", { entityType, entityId }, { orderBy: "created_at", ascending: true });
  }

  // Candidate Profiles
  async createCandidateProfile(profile: Omit<InsertCandidateProfile, "version">): Promise<CandidateProfile> {
    if (!profile.candidateId) {
      throw new Error("candidateId is required");
    }

    const MAX_RETRIES = 3;
    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // ✨ Call PostgreSQL function to atomically get next version
        // Uses advisory locks to prevent race conditions (even on first insert)
        // Add timeout to prevent indefinite hanging
        const RPC_TIMEOUT_MS = 5000; // 5 seconds

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('RPC call timeout after 5000ms')), RPC_TIMEOUT_MS)
        );

        const rpcPromise = this.client.rpc(
          "get_next_profile_version",
          { candidate_id_param: profile.candidateId }
        );

        const { data: versionData, error: versionError } = await Promise.race([
          rpcPromise,
          timeoutPromise
        ]) as { data: any; error: any };

        if (versionError) {
          throw new Error(`Failed to get next version: ${versionError.message}`);
        }

        // ✨ Strict version validation
        const nextVersion = Number(versionData);
        if (isNaN(nextVersion) || nextVersion < 1 || !Number.isInteger(nextVersion)) {
          throw new Error(
            `Invalid version number from database: ${versionData} (parsed as ${nextVersion})`
          );
        }

        // Prepare payload with atomically-generated version number
        const payload: InsertCandidateProfile = {
          ...profile,
          version: nextVersion,
          aiSummary: profile.aiSummary ?? null,
          dataSources: profile.dataSources ?? null,
          gaps: profile.gaps ?? null,
          strengths: profile.strengths ?? null,
          concerns: profile.concerns ?? null,
          overallScore: profile.overallScore ?? null,
        } as InsertCandidateProfile;

        // Insert the new profile
        const newProfile = await this.insertRow<CandidateProfile>("candidate_profiles", payload);

        // ✅ Success - log metrics
        const duration = Date.now() - startTime;
        console.log(`[createCandidateProfile] Success after ${attempt + 1} attempt(s)`, {
          candidateId: profile.candidateId,
          version: nextVersion,
          durationMs: duration,
          retries: attempt,
        });

        return newProfile;

      } catch (error) {
        lastError = error as Error;

        // ✨ Smart retry: Check if error is retriable
        const isRetriable = this.isRetriableError(lastError);

        // If not retriable or max retries reached, fail immediately
        if (!isRetriable || attempt === MAX_RETRIES - 1) {
          console.error("[createCandidateProfile] Failed", {
            candidateId: profile.candidateId,
            attempts: attempt + 1,
            isRetriable,
            errorType: this.classifyError(lastError),
            error: lastError.message,
          });
          throw new Error(
            `Failed to create candidate profile after ${attempt + 1} attempt(s): ${lastError.message}`
          );
        }

        // ✨ Smart delay: Calculate retry delay based on error type
        const delayMs = this.calculateRetryDelay(lastError, attempt);

        console.warn(`[createCandidateProfile] Retry ${attempt + 1}/${MAX_RETRIES}`, {
          candidateId: profile.candidateId,
          delayMs,
          errorType: this.classifyError(lastError),
          error: lastError.message,
        });

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    // Should never reach here (error thrown in loop)
    throw lastError!;
  }

  /**
   * ✨ Helper: Check if error is retriable
   */
  private isRetriableError(error: Error): boolean {
    const message = error.message.toLowerCase();

    // ❌ Non-retriable errors (should fail immediately)
    const nonRetriablePatterns = [
      'foreign key',
      'check constraint',
      'not null',
      'invalid input',
      'validation',
      'out of range',
      'permission denied',
      'does not exist',
    ];

    // If error is explicitly non-retriable, return false immediately
    if (nonRetriablePatterns.some(pattern => message.includes(pattern))) {
      return false;
    }

    // ✅ Retriable errors (transient failures)
    const retriablePatterns = [
      'timeout',
      'deadlock',
      'unique constraint',
      'duplicate key',
      'connection',
      'network',
      'econnrefused',
      'econnreset',
      'temporarily unavailable',
    ];

    return retriablePatterns.some(pattern => message.includes(pattern));
  }

  /**
   * ✨ Helper: Calculate retry delay based on error type
   */
  private calculateRetryDelay(error: Error, attempt: number): number {
    const message = error.message.toLowerCase();

    // Unique constraint conflict: Immediate retry (version conflict)
    if (message.includes('unique constraint') || message.includes('duplicate')) {
      return 0;
    }

    // Connection timeout: Longer delay
    if (message.includes('timeout') || message.includes('connection')) {
      return 500 * Math.pow(2, attempt);
    }

    // Deadlock: Random jitter to avoid synchronized retries
    if (message.includes('deadlock')) {
      return 100 * Math.pow(2, attempt) + Math.random() * 100;
    }

    // Default: Standard exponential backoff
    return 100 * Math.pow(2, attempt);
  }

  /**
   * ✨ Helper: Classify error for logging
   */
  private classifyError(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('unique') || message.includes('duplicate')) return 'CONFLICT';
    if (message.includes('timeout')) return 'TIMEOUT';
    if (message.includes('deadlock')) return 'DEADLOCK';
    if (message.includes('connection')) return 'CONNECTION';
    if (message.includes('validation')) return 'VALIDATION';

    return 'UNKNOWN';
  }

  async getCandidateProfiles(candidateId: string): Promise<CandidateProfile[]> {
    return this.selectMany<CandidateProfile>("candidate_profiles", { candidateId }, { orderBy: "version", ascending: false });
  }

  async getLatestCandidateProfile(candidateId: string): Promise<CandidateProfile | undefined> {
    const profiles = await this.selectMany<CandidateProfile>(
      "candidate_profiles",
      { candidateId },
      { orderBy: "version", ascending: false }
    );
    return profiles[0];
  }

  async getCandidateProfileByVersion(candidateId: string, version: number): Promise<CandidateProfile | undefined> {
    return this.selectSingle<CandidateProfile>("candidate_profiles", { candidateId, version });
  }

  async updateCandidateProfile(id: string, updates: Partial<CandidateProfile>): Promise<CandidateProfile | undefined> {
    const payload: Partial<CandidateProfile> = {
      ...updates,
      updatedAt: new Date(),
    };
    return this.updateRow<CandidateProfile>("candidate_profiles", { id }, payload);
  }

  // Interview Preparations
  async createInterviewPreparation(preparation: InsertInterviewPreparation): Promise<InterviewPreparation> {
    return this.insertRow<InterviewPreparation>("interview_preparations", preparation);
  }

  async getInterviewPreparation(interviewId: string): Promise<InterviewPreparation | undefined> {
    return this.selectSingle<InterviewPreparation>("interview_preparations", { interviewId });
  }

  async updateInterviewPreparation(id: string, updates: Partial<InterviewPreparation>): Promise<InterviewPreparation | undefined> {
    return this.updateRow<InterviewPreparation>("interview_preparations", { id }, updates);
  }

  // Additional user methods
  async getUsers(): Promise<User[]> {
    return this.selectMany<User>("users", undefined, { orderBy: "created_at", ascending: false });
  }

  // AI Token Usage
  async createAiTokenUsage(usage: InsertAiTokenUsage): Promise<AiTokenUsage> {
    return this.insertRow<AiTokenUsage>("ai_token_usage", usage);
  }

  async getAiTokenUsage(startDate?: Date, endDate?: Date): Promise<AiTokenUsage[]> {
    let query = this.client.from("ai_token_usage").select("*");
    if (startDate) {
      query = query.gte("created_at", startDate.toISOString());
    }
    if (endDate) {
      query = query.lte("created_at", endDate.toISOString());
    }
    const { data, error } = await query.order("created_at", { ascending: false } as never);
    if (error) {
      throw new Error(`Supabase query failed on ai_token_usage: ${error.message}`);
    }
    return transformRows<AiTokenUsage>(data);
  }

  async getAiTokenUsageByOperation(operation: string): Promise<AiTokenUsage[]> {
    return this.selectMany<AiTokenUsage>("ai_token_usage", { operation }, { orderBy: "created_at", ascending: false });
  }

  async getAiTokenUsageByUser(userId: string, startDate?: Date, endDate?: Date): Promise<AiTokenUsage[]> {
    let query = this.client.from("ai_token_usage").select("*").eq("user_id", userId);
    if (startDate) {
      query = query.gte("created_at", startDate.toISOString());
    }
    if (endDate) {
      query = query.lte("created_at", endDate.toISOString());
    }
    const { data, error } = await query.order("created_at", { ascending: false } as never);
    if (error) {
      throw new Error(`Supabase query failed on ai_token_usage: ${error.message}`);
    }
    return transformRows<AiTokenUsage>(data);
  }

  async getTotalCostByPeriod(startDate: Date, endDate: Date): Promise<number> {
    const usages = await this.getAiTokenUsage(startDate, endDate);
    return usages.reduce((sum, usage) => {
      const costValue = (usage.estimatedCost as unknown as string) ?? "0";
      const numeric = typeof costValue === "string" ? parseFloat(costValue) : (costValue as number | undefined);
      return sum + (numeric || 0);
    }, 0);
  }

  // Hiring decisions
  async createHiringDecision(decision: InsertHiringDecision): Promise<HiringDecision> {
    return this.insertRow<HiringDecision>("hiring_decisions", decision);
  }

  async getHiringDecision(candidateId: string, jobId: string): Promise<HiringDecision | undefined> {
    return this.selectSingle<HiringDecision>("hiring_decisions", { candidateId, jobId });
  }

  async getHiringDecisionById(id: string): Promise<HiringDecision | undefined> {
    return this.selectSingle<HiringDecision>("hiring_decisions", { id });
  }

  async getHiringDecisionsByJob(jobId: string): Promise<HiringDecision[]> {
    return this.selectMany<HiringDecision>("hiring_decisions", { jobId }, { orderBy: "created_at", ascending: false });
  }

  async updateHiringDecision(id: string, updates: Partial<HiringDecision>): Promise<HiringDecision | undefined> {
    const payload: Partial<HiringDecision> = {
      ...updates,
      updatedAt: new Date(),
    };
    return this.updateRow<HiringDecision>("hiring_decisions", { id }, payload);
  }

  async getCandidatesForJob(jobId: string): Promise<Candidate[]> {
    const matches = await this.getJobMatchesForJob(jobId);
    if (matches.length === 0) {
      return [];
    }
    const candidateIds = matches.map(match => match.candidateId);
    return this.selectMany<Candidate>("candidates", { id: candidateIds });
  }
}

let storageImplementation: IStorage;

if (process.env.USE_IN_MEMORY_STORAGE === "true") {
  storageImplementation = new MemStorage();
} else {
  storageImplementation = new SupabaseStorage();
}

export const storage = storageImplementation;
