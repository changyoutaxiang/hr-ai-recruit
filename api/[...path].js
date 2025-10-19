var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/storage.ts
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
var normalizeDecimalString, parseNullableJson, toStringArray, toResumeAnalysis, toTargetedAnalysis, toCamelCase, toSnakeCase, isIsoDateString, transformRow, transformRows, sanitizeUnicodeString, prepareForInsert, MemStorage, SupabaseStorage, storageImplementation, storage;
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    normalizeDecimalString = (value, fallback = "0") => {
      if (typeof value === "number") {
        return value.toFixed(2);
      }
      if (typeof value === "string" && value.trim().length > 0) {
        return value;
      }
      return fallback;
    };
    parseNullableJson = (value) => {
      if (value === null || value === void 0) {
        return null;
      }
      if (typeof value === "string") {
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      }
      if (typeof value === "object") {
        return value;
      }
      return null;
    };
    toStringArray = (value) => {
      if (Array.isArray(value)) {
        return value.filter((item) => typeof item === "string");
      }
      return null;
    };
    toResumeAnalysis = (value) => {
      if (value && typeof value === "object") {
        return value;
      }
      return null;
    };
    toTargetedAnalysis = (value) => {
      if (value && typeof value === "object") {
        return value;
      }
      return null;
    };
    toCamelCase = (key) => key.replace(/_([a-z])/g, (_match, letter) => letter.toUpperCase());
    toSnakeCase = (key) => key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    isIsoDateString = (value) => /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);
    transformRow = (row) => {
      if (!row) {
        return null;
      }
      const result = {};
      for (const [rawKey, rawValue] of Object.entries(row)) {
        const key = toCamelCase(rawKey);
        if (rawValue === null || rawValue === void 0) {
          result[key] = rawValue;
          continue;
        }
        if (Array.isArray(rawValue)) {
          result[key] = rawValue.map((item) => typeof item === "object" && item !== null ? transformRow(item) : item);
          continue;
        }
        if (typeof rawValue === "object") {
          result[key] = transformRow(rawValue);
          continue;
        }
        if (typeof rawValue === "string" && (key.endsWith("At") || key.endsWith("Date")) && isIsoDateString(rawValue)) {
          result[key] = new Date(rawValue);
          continue;
        }
        result[key] = rawValue;
      }
      return result;
    };
    transformRows = (rows) => {
      if (!rows) {
        return [];
      }
      return rows.map((row) => transformRow(row)).filter(Boolean);
    };
    sanitizeUnicodeString = (str) => {
      try {
        return str.replace(/[\u0000-\u001F\u007F-\u009F]/g, "").replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t");
      } catch (error) {
        console.warn("Unicode string sanitization failed:", error);
        return str.replace(/[^\x20-\x7E\u4e00-\u9fff]/g, "?");
      }
    };
    prepareForInsert = (data) => {
      const payload = {};
      for (const [key, value] of Object.entries(data)) {
        if (value === void 0) {
          continue;
        }
        const snakeKey = toSnakeCase(key);
        if (value instanceof Date) {
          payload[snakeKey] = value.toISOString();
          continue;
        }
        if (Array.isArray(value)) {
          payload[snakeKey] = value.map(
            (item) => typeof item === "string" ? sanitizeUnicodeString(item) : item
          );
          continue;
        }
        if (typeof value === "object" && value !== null) {
          const sanitizedObject = {};
          for (const [objKey, objValue] of Object.entries(value)) {
            if (typeof objValue === "string") {
              sanitizedObject[objKey] = sanitizeUnicodeString(objValue);
            } else {
              sanitizedObject[objKey] = objValue;
            }
          }
          payload[snakeKey] = sanitizedObject;
          continue;
        }
        if (typeof value === "string") {
          payload[snakeKey] = sanitizeUnicodeString(value);
          continue;
        }
        payload[snakeKey] = value;
      }
      return payload;
    };
    MemStorage = class {
      constructor() {
        this.users = /* @__PURE__ */ new Map();
        this.jobs = /* @__PURE__ */ new Map();
        this.candidates = /* @__PURE__ */ new Map();
        this.interviews = /* @__PURE__ */ new Map();
        this.aiConversations = /* @__PURE__ */ new Map();
        this.jobMatches = /* @__PURE__ */ new Map();
        this.candidateStatusHistory = /* @__PURE__ */ new Map();
        this.activityLogs = /* @__PURE__ */ new Map();
        this.notifications = /* @__PURE__ */ new Map();
        this.userSessions = /* @__PURE__ */ new Map();
        this.comments = /* @__PURE__ */ new Map();
        this.candidateProfiles = /* @__PURE__ */ new Map();
        this.interviewPreparations = /* @__PURE__ */ new Map();
        this.hiringDecisions = /* @__PURE__ */ new Map();
        this.aiTokenUsages = /* @__PURE__ */ new Map();
        this.initializeSampleData();
      }
      initializeSampleData() {
        const hrUser = {
          id: randomUUID(),
          email: "sarah.chen@company.com",
          password: "hashedpassword",
          name: "Sarah Chen",
          role: "hr_manager",
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        };
        this.users.set(hrUser.id, hrUser);
        const jobs2 = [
          {
            id: randomUUID(),
            title: "Senior Frontend Developer",
            department: "Engineering",
            location: "San Francisco, CA",
            type: "full-time",
            salaryMin: 12e4,
            salaryMax: 16e4,
            requirements: ["React", "TypeScript", "5+ years experience", "Node.js", "GraphQL"],
            focusAreas: null,
            description: "We are looking for a senior frontend developer to join our team and lead the development of our next-generation web applications.",
            status: "active",
            createdBy: hrUser.id,
            createdAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          },
          {
            id: randomUUID(),
            title: "Data Scientist",
            department: "Data",
            location: "Remote",
            type: "full-time",
            salaryMin: 11e4,
            salaryMax: 14e4,
            requirements: ["Python", "Machine Learning", "SQL", "3+ years experience", "TensorFlow"],
            focusAreas: null,
            description: "Join our data team to build ML models and analytics that drive business decisions.",
            status: "active",
            createdBy: hrUser.id,
            createdAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          },
          {
            id: randomUUID(),
            title: "Product Manager",
            department: "Product",
            location: "New York, NY",
            type: "full-time",
            salaryMin: 13e4,
            salaryMax: 17e4,
            requirements: ["Product Management", "Agile", "5+ years experience", "Analytics", "User Research"],
            focusAreas: null,
            description: "Lead product strategy and execution for our core platform features.",
            status: "active",
            createdBy: hrUser.id,
            createdAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          }
        ];
        jobs2.forEach((job) => this.jobs.set(job.id, job));
        const candidates2 = [
          {
            id: randomUUID(),
            name: "Alex Rodriguez",
            email: "alex.rodriguez@email.com",
            phone: "+1-555-0123",
            position: "Senior Frontend Developer",
            experience: 6,
            education: "BS Computer Science, Stanford University",
            location: "San Francisco, CA",
            salaryExpectation: 15e4,
            expectedSalary: 15e4,
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
            lastContactedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1e3),
            // 2 days ago
            createdAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
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
            salaryExpectation: 125e3,
            expectedSalary: 125e3,
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
            lastContactedAt: new Date(Date.now() - 24 * 60 * 60 * 1e3),
            // 1 day ago
            createdAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
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
            salaryExpectation: 16e4,
            expectedSalary: 16e4,
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
            lastContactedAt: new Date(Date.now() - 12 * 60 * 60 * 1e3),
            // 12 hours ago
            createdAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
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
            salaryExpectation: 11e4,
            expectedSalary: 11e4,
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
            createdAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
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
            salaryExpectation: 135e3,
            expectedSalary: 135e3,
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
            lastContactedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1e3),
            // 3 days ago
            createdAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          }
        ];
        candidates2.forEach((candidate) => this.candidates.set(candidate.id, candidate));
        const candidateIds = Array.from(this.candidates.keys());
        const jobIds = Array.from(this.jobs.keys());
        if (candidateIds.length > 0 && jobIds.length > 0) {
          const interviews2 = [
            {
              id: randomUUID(),
              candidateId: candidateIds[0],
              // Alex Rodriguez
              jobId: jobIds[0],
              // Senior Frontend Developer
              interviewerId: hrUser.id,
              scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1e3),
              // 2 days from now
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
              createdAt: /* @__PURE__ */ new Date(),
              updatedAt: /* @__PURE__ */ new Date()
            },
            {
              id: randomUUID(),
              candidateId: candidateIds[1],
              // Jessica Wang
              jobId: jobIds[1],
              // Data Scientist
              interviewerId: hrUser.id,
              scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1e3),
              // 1 day from now
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
              createdAt: /* @__PURE__ */ new Date(),
              updatedAt: /* @__PURE__ */ new Date()
            },
            {
              id: randomUUID(),
              candidateId: candidateIds[2],
              // Michael Thompson
              jobId: jobIds[2],
              // Product Manager
              interviewerId: hrUser.id,
              scheduledDate: new Date(Date.now() - 24 * 60 * 60 * 1e3),
              // 1 day ago
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
              createdAt: /* @__PURE__ */ new Date(),
              updatedAt: /* @__PURE__ */ new Date()
            }
          ];
          interviews2.forEach((interview) => this.interviews.set(interview.id, interview));
        }
      }
      // Users
      async getUser(id) {
        return this.users.get(id);
      }
      async getUserByEmail(email) {
        return Array.from(this.users.values()).find((user) => user.email === email);
      }
      async createUser(insertUser) {
        const userId = insertUser.id ?? randomUUID();
        const user = {
          ...insertUser,
          id: userId,
          password: insertUser.password ?? "supabase-managed",
          role: insertUser.role || "hr_manager",
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        };
        this.users.set(user.id, user);
        return user;
      }
      // Jobs
      async getJobs() {
        return Array.from(this.jobs.values());
      }
      async getJob(id) {
        return this.jobs.get(id);
      }
      async createJob(insertJob) {
        const job = {
          ...insertJob,
          id: randomUUID(),
          status: insertJob.status || "active",
          salaryMin: insertJob.salaryMin ?? null,
          salaryMax: insertJob.salaryMax ?? null,
          requirements: toStringArray(insertJob.requirements),
          focusAreas: toStringArray(insertJob.focusAreas),
          createdBy: insertJob.createdBy ?? null,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        };
        this.jobs.set(job.id, job);
        return job;
      }
      async updateJob(id, jobUpdate) {
        const job = this.jobs.get(id);
        if (!job) return void 0;
        const updatedJob = {
          ...job,
          ...jobUpdate,
          updatedAt: /* @__PURE__ */ new Date()
        };
        this.jobs.set(id, updatedJob);
        return updatedJob;
      }
      async deleteJob(id) {
        return this.jobs.delete(id);
      }
      // Candidates
      async getCandidates() {
        return Array.from(this.candidates.values());
      }
      async getCandidate(id) {
        return this.candidates.get(id);
      }
      async createCandidate(insertCandidate) {
        const candidate = {
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
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        };
        this.candidates.set(candidate.id, candidate);
        return candidate;
      }
      async updateCandidate(id, candidateUpdate) {
        const candidate = this.candidates.get(id);
        if (!candidate) return void 0;
        if (candidateUpdate.status && candidateUpdate.status !== candidate.status) {
          await this.createCandidateStatusHistory({
            candidateId: id,
            oldStatus: candidate.status,
            newStatus: candidateUpdate.status,
            reason: "Status updated",
            notes: null,
            changedBy: null
            // TODO: Get from auth context
          });
        }
        const updatedCandidate = {
          ...candidate,
          ...candidateUpdate,
          updatedAt: /* @__PURE__ */ new Date()
        };
        this.candidates.set(id, updatedCandidate);
        return updatedCandidate;
      }
      async deleteCandidate(id) {
        return this.candidates.delete(id);
      }
      async searchCandidates(query) {
        const candidates2 = Array.from(this.candidates.values());
        const lowerQuery = query.toLowerCase();
        return candidates2.filter(
          (candidate) => candidate.name.toLowerCase().includes(lowerQuery) || candidate.email.toLowerCase().includes(lowerQuery) || candidate.position?.toLowerCase().includes(lowerQuery) || candidate.skills?.some((skill) => skill.toLowerCase().includes(lowerQuery)) || candidate.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery)) || candidate.location?.toLowerCase().includes(lowerQuery)
        );
      }
      // Interviews
      async getInterviews() {
        return Array.from(this.interviews.values());
      }
      async getInterview(id) {
        return this.interviews.get(id);
      }
      async getInterviewsByCandidate(candidateId) {
        return Array.from(this.interviews.values()).filter(
          (interview) => interview.candidateId === candidateId
        );
      }
      async getInterviewsByJob(jobId) {
        return Array.from(this.interviews.values()).filter(
          (interview) => interview.jobId === jobId
        );
      }
      async createInterview(insertInterview) {
        const interview = {
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
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        };
        this.interviews.set(interview.id, interview);
        return interview;
      }
      async updateInterview(id, interviewUpdate) {
        const interview = this.interviews.get(id);
        if (!interview) return void 0;
        const updatedInterview = {
          ...interview,
          ...interviewUpdate,
          updatedAt: /* @__PURE__ */ new Date()
        };
        this.interviews.set(id, updatedInterview);
        return updatedInterview;
      }
      async deleteInterview(id) {
        return this.interviews.delete(id);
      }
      // AI Conversations
      async createAiConversation(insertConversation) {
        const conversation = {
          ...insertConversation,
          id: randomUUID(),
          tokensUsed: insertConversation.tokensUsed ?? null,
          templateId: insertConversation.templateId ?? null,
          context: insertConversation.context ?? null,
          createdAt: /* @__PURE__ */ new Date()
        };
        this.aiConversations.set(conversation.id, conversation);
        return conversation;
      }
      async getAiConversations() {
        return Array.from(this.aiConversations.values()).sort((a, b) => {
          const timeA = a.createdAt?.getTime() || 0;
          const timeB = b.createdAt?.getTime() || 0;
          return timeB - timeA;
        });
      }
      async getAiConversationsBySession(sessionId) {
        return Array.from(this.aiConversations.values()).filter(
          (conversation) => conversation.sessionId === sessionId
        );
      }
      // Job Matches
      async createJobMatch(matchInput) {
        const id = randomUUID();
        const normalizedScore = normalizeDecimalString(matchInput.score ?? matchInput.matchScore ?? null);
        const analysis = parseNullableJson(matchInput.analysis);
        const aiAnalysis = matchInput.aiAnalysis ?? (analysis ? JSON.stringify(analysis) : null);
        const match = {
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
          createdAt: /* @__PURE__ */ new Date()
        };
        this.jobMatches.set(match.id, match);
        return match;
      }
      async getJobMatch(jobId, candidateId) {
        return Array.from(this.jobMatches.values()).find(
          (match) => match.jobId === jobId && match.candidateId === candidateId
        );
      }
      async getJobMatchesForCandidate(candidateId) {
        return Array.from(this.jobMatches.values()).filter(
          (match) => match.candidateId === candidateId
        );
      }
      async getJobMatchesForJob(jobId) {
        return Array.from(this.jobMatches.values()).filter(
          (match) => match.jobId === jobId
        );
      }
      async updateJobMatch(id, updates) {
        const current = this.jobMatches.get(id);
        if (!current) return void 0;
        const normalizedScore = updates.score !== void 0 ? normalizeDecimalString(updates.score, current.matchScore) : updates.matchScore ?? current.matchScore;
        const analysis = updates.analysis !== void 0 ? parseNullableJson(updates.analysis) : current.analysis ?? null;
        const aiAnalysis = updates.aiAnalysis !== void 0 ? updates.aiAnalysis ?? null : current.aiAnalysis;
        const updatedMatch = {
          ...current,
          ...updates,
          matchScore: updates.matchScore ?? normalizedScore,
          score: normalizeDecimalString(
            updates.score !== void 0 ? updates.score : current.score ?? current.matchScore,
            current.matchScore
          ),
          analysis,
          aiAnalysis: aiAnalysis ?? (analysis ? JSON.stringify(analysis) : null)
        };
        this.jobMatches.set(id, updatedMatch);
        return updatedMatch;
      }
      // Candidate Status History
      async createCandidateStatusHistory(insertHistory) {
        const history = {
          ...insertHistory,
          id: randomUUID(),
          oldStatus: insertHistory.oldStatus ?? null,
          reason: insertHistory.reason ?? null,
          notes: insertHistory.notes ?? null,
          changedBy: insertHistory.changedBy ?? null,
          createdAt: /* @__PURE__ */ new Date()
        };
        this.candidateStatusHistory.set(history.id, history);
        return history;
      }
      async getCandidateStatusHistory(candidateId) {
        return Array.from(this.candidateStatusHistory.values()).filter(
          (history) => history.candidateId === candidateId
        ).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }
      // Activity Log methods
      async createActivityLog(activity) {
        const newActivity = {
          id: randomUUID(),
          userId: activity.userId,
          action: activity.action,
          entityType: activity.entityType,
          entityId: activity.entityId,
          entityName: activity.entityName,
          details: activity.details || null,
          createdAt: /* @__PURE__ */ new Date()
        };
        this.activityLogs.set(newActivity.id, newActivity);
        return newActivity;
      }
      async getActivityLogs() {
        return Array.from(this.activityLogs.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      async getActivityLogsByUser(userId) {
        return Array.from(this.activityLogs.values()).filter((log) => log.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      // Notification methods
      async createNotification(notification) {
        const newNotification = {
          id: randomUUID(),
          userId: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          entityType: notification.entityType || null,
          entityId: notification.entityId || null,
          isRead: notification.isRead || false,
          createdAt: /* @__PURE__ */ new Date()
        };
        this.notifications.set(newNotification.id, newNotification);
        return newNotification;
      }
      async getNotifications(userId) {
        return Array.from(this.notifications.values()).filter((notification) => notification.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      async markNotificationAsRead(id) {
        const notification = this.notifications.get(id);
        if (notification) {
          notification.isRead = true;
          this.notifications.set(id, notification);
          return true;
        }
        return false;
      }
      // User Session methods
      async createUserSession(session) {
        const newSession = {
          id: randomUUID(),
          userId: session.userId,
          isOnline: session.isOnline !== void 0 ? session.isOnline : true,
          currentPage: session.currentPage || null,
          lastActivity: session.lastActivity || /* @__PURE__ */ new Date(),
          socketId: session.socketId || null,
          createdAt: /* @__PURE__ */ new Date()
        };
        this.userSessions.set(newSession.id, newSession);
        return newSession;
      }
      async updateUserSession(socketId, updates) {
        for (const [id, session] of this.userSessions) {
          if (session.socketId === socketId) {
            const updatedSession = { ...session, ...updates };
            this.userSessions.set(id, updatedSession);
            return updatedSession;
          }
        }
        return void 0;
      }
      async getOnlineUsers() {
        const onlineSessions = Array.from(this.userSessions.values()).filter((session) => session.isOnline);
        const onlineUserIds = new Set(onlineSessions.map((session) => session.userId));
        return Array.from(this.users.values()).filter((user) => onlineUserIds.has(user.id));
      }
      async getUserSessions(userId) {
        return Array.from(this.userSessions.values()).filter((session) => session.userId === userId);
      }
      // Comment methods
      async createComment(comment) {
        const newComment = {
          id: randomUUID(),
          entityType: comment.entityType,
          entityId: comment.entityId,
          content: comment.content,
          authorId: comment.authorId,
          isInternal: comment.isInternal !== void 0 ? comment.isInternal : true,
          mentions: comment.mentions || null,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        };
        this.comments.set(newComment.id, newComment);
        return newComment;
      }
      async getComments(entityType, entityId) {
        return Array.from(this.comments.values()).filter((comment) => comment.entityType === entityType && comment.entityId === entityId).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      }
      async createCandidateProfile(profile) {
        if (!profile.candidateId) {
          throw new Error("candidateId is required");
        }
        if (!profile.stage) {
          throw new Error("stage is required");
        }
        if (!profile.profileData) {
          throw new Error("profileData is required");
        }
        const candidate = await this.getCandidate(profile.candidateId);
        if (!candidate) {
          throw new Error(`Candidate ${profile.candidateId} not found`);
        }
        const existingProfiles = Array.from(this.candidateProfiles.values()).filter((p) => p.candidateId === profile.candidateId);
        const maxVersion = existingProfiles.length > 0 ? Math.max(...existingProfiles.map((p) => p.version)) : 0;
        const nextVersion = maxVersion + 1;
        const versionExists = existingProfiles.some((p) => p.version === nextVersion);
        if (versionExists) {
          throw new Error(`Version ${nextVersion} already exists for candidate ${profile.candidateId}`);
        }
        const newProfile = {
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
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        };
        this.candidateProfiles.set(newProfile.id, newProfile);
        console.log(`Created candidate profile version ${nextVersion} for candidate ${profile.candidateId}`);
        return newProfile;
      }
      async getCandidateProfiles(candidateId) {
        if (!candidateId) {
          throw new Error("candidateId is required");
        }
        return Array.from(this.candidateProfiles.values()).filter((profile) => profile.candidateId === candidateId).sort((a, b) => b.version - a.version);
      }
      async getLatestCandidateProfile(candidateId) {
        if (!candidateId) {
          throw new Error("candidateId is required");
        }
        const profiles = Array.from(this.candidateProfiles.values()).filter((profile) => profile.candidateId === candidateId);
        if (profiles.length === 0) return void 0;
        return profiles.reduce(
          (latest, current) => current.version > latest.version ? current : latest
        );
      }
      async getCandidateProfileByVersion(candidateId, version) {
        if (!candidateId) {
          throw new Error("candidateId is required");
        }
        if (!Number.isInteger(version) || version < 1) {
          throw new Error("version must be a positive integer");
        }
        return Array.from(this.candidateProfiles.values()).find((profile) => profile.candidateId === candidateId && profile.version === version);
      }
      async updateCandidateProfile(id, updates) {
        const profile = this.candidateProfiles.get(id);
        if (!profile) return void 0;
        const updatedProfile = {
          ...profile,
          ...updates,
          updatedAt: /* @__PURE__ */ new Date()
        };
        this.candidateProfiles.set(id, updatedProfile);
        return updatedProfile;
      }
      // Additional user methods
      async getUsers() {
        return Array.from(this.users.values());
      }
      // Interview Preparations
      async createInterviewPreparation(preparation) {
        const id = randomUUID();
        const now = /* @__PURE__ */ new Date();
        const newPreparation = {
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
          updatedAt: now
        };
        this.interviewPreparations.set(id, newPreparation);
        return newPreparation;
      }
      async getInterviewPreparation(interviewId) {
        return Array.from(this.interviewPreparations.values()).find((prep) => prep.interviewId === interviewId);
      }
      async updateInterviewPreparation(id, updates) {
        const preparation = this.interviewPreparations.get(id);
        if (!preparation) return void 0;
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
          updatedAt: /* @__PURE__ */ new Date()
        };
        this.interviewPreparations.set(id, updated);
        return updated;
      }
      // Hiring Decision methods
      async createHiringDecision(decision) {
        const id = randomUUID();
        const now = /* @__PURE__ */ new Date();
        const newDecision = {
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
          updatedAt: now
        };
        this.hiringDecisions.set(id, newDecision);
        return newDecision;
      }
      async getHiringDecision(candidateId, jobId) {
        return Array.from(this.hiringDecisions.values()).find((d) => d.candidateId === candidateId && d.jobId === jobId);
      }
      async getHiringDecisionById(id) {
        return this.hiringDecisions.get(id);
      }
      async getHiringDecisionsByJob(jobId) {
        return Array.from(this.hiringDecisions.values()).filter((d) => d.jobId === jobId);
      }
      async updateHiringDecision(id, updates) {
        const decision = this.hiringDecisions.get(id);
        if (!decision) return void 0;
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
          updatedAt: /* @__PURE__ */ new Date()
        };
        this.hiringDecisions.set(id, updated);
        return updated;
      }
      async getCandidatesForJob(jobId) {
        const jobMatchesForJob = Array.from(this.jobMatches.values()).filter((match) => match.jobId === jobId);
        const candidateIds = jobMatchesForJob.map((match) => match.candidateId);
        return Array.from(this.candidates.values()).filter((c) => candidateIds.includes(c.id));
      }
      // AI Token Usage Methods
      async createAiTokenUsage(usage) {
        const id = randomUUID();
        const aiTokenUsage2 = {
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
          createdAt: /* @__PURE__ */ new Date()
        };
        this.aiTokenUsages.set(id, aiTokenUsage2);
        return aiTokenUsage2;
      }
      async getAiTokenUsage(startDate, endDate) {
        let usages = Array.from(this.aiTokenUsages.values());
        if (startDate) {
          usages = usages.filter((u) => u.createdAt && u.createdAt >= startDate);
        }
        if (endDate) {
          usages = usages.filter((u) => u.createdAt && u.createdAt <= endDate);
        }
        return usages.sort(
          (a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
        );
      }
      async getAiTokenUsageByOperation(operation) {
        return Array.from(this.aiTokenUsages.values()).filter((u) => u.operation === operation).sort(
          (a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
        );
      }
      async getAiTokenUsageByUser(userId, startDate, endDate) {
        let usages = Array.from(this.aiTokenUsages.values()).filter((u) => u.userId === userId);
        if (startDate) {
          usages = usages.filter((u) => u.createdAt && u.createdAt >= startDate);
        }
        if (endDate) {
          usages = usages.filter((u) => u.createdAt && u.createdAt <= endDate);
        }
        return usages.sort(
          (a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
        );
      }
      async getTotalCostByPeriod(startDate, endDate) {
        const usages = await this.getAiTokenUsage(startDate, endDate);
        return usages.reduce((total, usage) => {
          const cost = usage.estimatedCost ? parseFloat(usage.estimatedCost) : 0;
          return total + cost;
        }, 0);
      }
    };
    SupabaseStorage = class {
      constructor() {
        const url = process.env.SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !serviceKey) {
          throw new Error("Supabase credentials missing: ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set");
        }
        const customFetch = async (input, init) => {
          try {
            const response = await fetch(input, {
              ...init,
              // Add keepalive and other options to improve reliability
              keepalive: true,
              // Set a reasonable timeout
              signal: init?.signal || AbortSignal.timeout(3e4)
            });
            return response;
          } catch (error) {
            console.error("Custom fetch error:", error);
            throw error;
          }
        };
        this.client = createClient(url, serviceKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          },
          global: {
            fetch: customFetch
          }
        });
      }
      async selectSingle(table, filters) {
        let query = this.client.from(table).select("*").limit(1);
        for (const [key, value] of Object.entries(filters)) {
          const column = toSnakeCase(key);
          if (value === null) {
            query = query.is(column, null);
          } else {
            query = query.eq(column, value);
          }
        }
        const { data, error } = await query.maybeSingle();
        if (error) {
          if (error.code === "PGRST116") {
            return void 0;
          }
          throw new Error(`Supabase query failed on ${table}: ${error.message}`);
        }
        return transformRow(data) ?? void 0;
      }
      async selectMany(table, filters, options) {
        let query = this.client.from(table).select("*");
        if (filters) {
          for (const [key, value] of Object.entries(filters)) {
            const column = toSnakeCase(key);
            if (value === null) {
              query = query.is(column, null);
            } else if (Array.isArray(value)) {
              query = query.in(column, value);
            } else {
              query = query.eq(column, value);
            }
          }
        }
        if (options?.orderBy) {
          query = query.order(options.orderBy, { ascending: options.ascending ?? true });
        }
        const { data, error } = await query;
        if (error) {
          throw new Error(`Supabase query failed on ${table}: ${error.message}`);
        }
        return transformRows(data);
      }
      async insertRow(table, payload) {
        const prepared = prepareForInsert(payload);
        const { data, error } = await this.client.from(table).insert(prepared).select("*").single();
        if (error) {
          throw new Error(`Supabase insert failed on ${table}: ${error.message}`);
        }
        const transformed = transformRow(data);
        if (!transformed) {
          throw new Error(`Supabase insert returned no data for ${table}`);
        }
        return transformed;
      }
      async updateRow(table, filters, updates) {
        const prepared = prepareForInsert(updates);
        const filterPayload = {};
        for (const [key, value] of Object.entries(filters)) {
          filterPayload[toSnakeCase(key)] = value;
        }
        const { data, error } = await this.client.from(table).update(prepared).match(filterPayload).select("*").maybeSingle();
        if (error) {
          if (error.code === "PGRST116") {
            return void 0;
          }
          throw new Error(`Supabase update failed on ${table}: ${error.message}`);
        }
        return transformRow(data) ?? void 0;
      }
      async deleteRows(table, filters) {
        const filterPayload = {};
        for (const [key, value] of Object.entries(filters)) {
          filterPayload[toSnakeCase(key)] = value;
        }
        const { error } = await this.client.from(table).delete().match(filterPayload);
        if (error) {
          throw new Error(`Supabase delete failed on ${table}: ${error.message}`);
        }
        return true;
      }
      // Users
      async getUser(id) {
        return this.selectSingle("users", { id });
      }
      async getUserByEmail(email) {
        return this.selectSingle("users", { email });
      }
      async createUser(user) {
        const payload = {
          ...user,
          password: user.password ?? "supabase-managed"
        };
        return this.insertRow("users", payload);
      }
      // Jobs
      async getJobs() {
        return this.selectMany("jobs", void 0, { orderBy: "created_at", ascending: false });
      }
      async getJob(id) {
        return this.selectSingle("jobs", { id });
      }
      async createJob(job) {
        return this.insertRow("jobs", job);
      }
      async updateJob(id, job) {
        const payload = {
          ...job,
          updatedAt: /* @__PURE__ */ new Date()
        };
        return this.updateRow("jobs", { id }, payload);
      }
      async deleteJob(id) {
        await this.deleteRows("jobs", { id });
        return true;
      }
      // Candidates
      async getCandidates() {
        return this.selectMany("candidates", void 0, { orderBy: "created_at", ascending: false });
      }
      async getCandidate(id) {
        return this.selectSingle("candidates", { id });
      }
      async createCandidate(candidate) {
        return this.insertRow("candidates", candidate);
      }
      async updateCandidate(id, candidate) {
        const payload = {
          ...candidate,
          updatedAt: /* @__PURE__ */ new Date()
        };
        return this.updateRow("candidates", { id }, payload);
      }
      async deleteCandidate(id) {
        await this.deleteRows("candidates", { id });
        return true;
      }
      async searchCandidates(query) {
        const { data, error } = await this.client.from("candidates").select("*").or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%,position.ilike.%${query}%`);
        if (error) {
          throw new Error(`Supabase search failed on candidates: ${error.message}`);
        }
        return transformRows(data);
      }
      // Interviews
      async getInterviews() {
        return this.selectMany("interviews", void 0, { orderBy: "scheduled_date", ascending: true });
      }
      async getInterview(id) {
        return this.selectSingle("interviews", { id });
      }
      async getInterviewsByCandidate(candidateId) {
        return this.selectMany("interviews", { candidateId }, { orderBy: "scheduled_date", ascending: false });
      }
      async getInterviewsByJob(jobId) {
        return this.selectMany("interviews", { jobId }, { orderBy: "scheduled_date", ascending: false });
      }
      async createInterview(interview) {
        return this.insertRow("interviews", interview);
      }
      async updateInterview(id, interview) {
        const payload = {
          ...interview,
          updatedAt: /* @__PURE__ */ new Date()
        };
        return this.updateRow("interviews", { id }, payload);
      }
      async deleteInterview(id) {
        await this.deleteRows("interviews", { id });
        return true;
      }
      // AI Conversations
      async createAiConversation(conversation) {
        return this.insertRow("ai_conversations", conversation);
      }
      async getAiConversations() {
        return this.selectMany("ai_conversations", void 0, { orderBy: "created_at", ascending: false });
      }
      async getAiConversationsBySession(sessionId) {
        return this.selectMany("ai_conversations", { sessionId }, { orderBy: "created_at", ascending: true });
      }
      // Job Matches
      async createJobMatch(match) {
        const payload = {
          ...match,
          matchScore: normalizeDecimalString(match.matchScore ?? match.score ?? "0"),
          score: normalizeDecimalString(match.score ?? match.matchScore ?? "0")
        };
        return this.insertRow("job_matches", payload);
      }
      async getJobMatch(jobId, candidateId) {
        const { data, error } = await this.client.from("job_matches").select("*").eq("job_id", jobId).eq("candidate_id", candidateId).limit(1).maybeSingle();
        if (error) {
          if (error.code === "PGRST116") {
            return void 0;
          }
          throw new Error(`Supabase query failed on job_matches: ${error.message}`);
        }
        return transformRow(data) ?? void 0;
      }
      async getJobMatchesForCandidate(candidateId) {
        return this.selectMany("job_matches", { candidateId }, { orderBy: "created_at", ascending: false });
      }
      async getJobMatchesForJob(jobId) {
        return this.selectMany("job_matches", { jobId }, { orderBy: "created_at", ascending: false });
      }
      async updateJobMatch(id, match) {
        const payload = { ...match };
        if (match.score !== void 0) {
          payload.score = normalizeDecimalString(match.score);
        }
        if (match.matchScore !== void 0) {
          payload.matchScore = normalizeDecimalString(match.matchScore);
        }
        return this.updateRow("job_matches", { id }, payload);
      }
      // Candidate Status History
      async createCandidateStatusHistory(history) {
        return this.insertRow("candidate_status_history", history);
      }
      async getCandidateStatusHistory(candidateId) {
        return this.selectMany(
          "candidate_status_history",
          { candidateId },
          { orderBy: "created_at", ascending: false }
        );
      }
      // Activity Log
      async createActivityLog(activity) {
        return this.insertRow("activity_log", activity);
      }
      async getActivityLogs() {
        return this.selectMany("activity_log", void 0, { orderBy: "created_at", ascending: false });
      }
      async getActivityLogsByUser(userId) {
        return this.selectMany("activity_log", { userId }, { orderBy: "created_at", ascending: false });
      }
      // Notifications
      async createNotification(notification) {
        return this.insertRow("notifications", notification);
      }
      async getNotifications(userId) {
        return this.selectMany("notifications", { userId }, { orderBy: "created_at", ascending: false });
      }
      async markNotificationAsRead(id) {
        await this.updateRow("notifications", { id }, { isRead: true });
        return true;
      }
      // User Sessions
      async createUserSession(session) {
        return this.insertRow("user_sessions", session);
      }
      async updateUserSession(socketId, updates) {
        return this.updateRow("user_sessions", { socketId }, updates);
      }
      async getOnlineUsers() {
        const { data, error } = await this.client.from("user_sessions").select("user_id").eq("is_online", true);
        if (error) {
          throw new Error(`Supabase query failed on user_sessions: ${error.message}`);
        }
        const ids = (data || []).map((entry) => entry.user_id).filter(Boolean);
        if (!ids.length) {
          return [];
        }
        return this.selectMany("users", { id: ids });
      }
      async getUserSessions(userId) {
        return this.selectMany("user_sessions", { userId }, { orderBy: "last_seen_at", ascending: false });
      }
      // Comments
      async createComment(comment) {
        return this.insertRow("comments", comment);
      }
      async getComments(entityType, entityId) {
        return this.selectMany("comments", { entityType, entityId }, { orderBy: "created_at", ascending: true });
      }
      // Candidate Profiles
      async createCandidateProfile(profile) {
        if (!profile.candidateId) {
          throw new Error("candidateId is required");
        }
        const MAX_RETRIES = 3;
        const startTime = Date.now();
        let lastError = null;
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
          try {
            const RPC_TIMEOUT_MS = 5e3;
            const timeoutPromise = new Promise(
              (_, reject) => setTimeout(() => reject(new Error("RPC call timeout after 5000ms")), RPC_TIMEOUT_MS)
            );
            const rpcPromise = this.client.rpc(
              "get_next_profile_version",
              { candidate_id_param: profile.candidateId }
            );
            const { data: versionData, error: versionError } = await Promise.race([
              rpcPromise,
              timeoutPromise
            ]);
            if (versionError) {
              throw new Error(`Failed to get next version: ${versionError.message}`);
            }
            const nextVersion = Number(versionData);
            if (isNaN(nextVersion) || nextVersion < 1 || !Number.isInteger(nextVersion)) {
              throw new Error(
                `Invalid version number from database: ${versionData} (parsed as ${nextVersion})`
              );
            }
            const payload = {
              ...profile,
              version: nextVersion,
              aiSummary: profile.aiSummary ?? null,
              dataSources: profile.dataSources ?? null,
              gaps: profile.gaps ?? null,
              strengths: profile.strengths ?? null,
              concerns: profile.concerns ?? null,
              overallScore: profile.overallScore ?? null
            };
            const newProfile = await this.insertRow("candidate_profiles", payload);
            const duration = Date.now() - startTime;
            console.log(`[createCandidateProfile] Success after ${attempt + 1} attempt(s)`, {
              candidateId: profile.candidateId,
              version: nextVersion,
              durationMs: duration,
              retries: attempt
            });
            return newProfile;
          } catch (error) {
            lastError = error;
            const isRetriable = this.isRetriableError(lastError);
            if (!isRetriable || attempt === MAX_RETRIES - 1) {
              console.error("[createCandidateProfile] Failed", {
                candidateId: profile.candidateId,
                attempts: attempt + 1,
                isRetriable,
                errorType: this.classifyError(lastError),
                error: lastError.message
              });
              throw new Error(
                `Failed to create candidate profile after ${attempt + 1} attempt(s): ${lastError.message}`
              );
            }
            const delayMs = this.calculateRetryDelay(lastError, attempt);
            console.warn(`[createCandidateProfile] Retry ${attempt + 1}/${MAX_RETRIES}`, {
              candidateId: profile.candidateId,
              delayMs,
              errorType: this.classifyError(lastError),
              error: lastError.message
            });
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }
        throw lastError;
      }
      /**
       * ✨ Helper: Check if error is retriable
       */
      isRetriableError(error) {
        const message = error.message.toLowerCase();
        const nonRetriablePatterns = [
          "foreign key",
          "check constraint",
          "not null",
          "invalid input",
          "validation",
          "out of range",
          "permission denied",
          "does not exist"
        ];
        if (nonRetriablePatterns.some((pattern) => message.includes(pattern))) {
          return false;
        }
        const retriablePatterns = [
          "timeout",
          "deadlock",
          "unique constraint",
          "duplicate key",
          "connection",
          "network",
          "econnrefused",
          "econnreset",
          "temporarily unavailable"
        ];
        return retriablePatterns.some((pattern) => message.includes(pattern));
      }
      /**
       * ✨ Helper: Calculate retry delay based on error type
       */
      calculateRetryDelay(error, attempt) {
        const message = error.message.toLowerCase();
        if (message.includes("unique constraint") || message.includes("duplicate")) {
          return 0;
        }
        if (message.includes("timeout") || message.includes("connection")) {
          return 500 * Math.pow(2, attempt);
        }
        if (message.includes("deadlock")) {
          return 100 * Math.pow(2, attempt) + Math.random() * 100;
        }
        return 100 * Math.pow(2, attempt);
      }
      /**
       * ✨ Helper: Classify error for logging
       */
      classifyError(error) {
        const message = error.message.toLowerCase();
        if (message.includes("unique") || message.includes("duplicate")) return "CONFLICT";
        if (message.includes("timeout")) return "TIMEOUT";
        if (message.includes("deadlock")) return "DEADLOCK";
        if (message.includes("connection")) return "CONNECTION";
        if (message.includes("validation")) return "VALIDATION";
        return "UNKNOWN";
      }
      async getCandidateProfiles(candidateId) {
        return this.selectMany("candidate_profiles", { candidateId }, { orderBy: "version", ascending: false });
      }
      async getLatestCandidateProfile(candidateId) {
        const profiles = await this.selectMany(
          "candidate_profiles",
          { candidateId },
          { orderBy: "version", ascending: false }
        );
        return profiles[0];
      }
      async getCandidateProfileByVersion(candidateId, version) {
        return this.selectSingle("candidate_profiles", { candidateId, version });
      }
      async updateCandidateProfile(id, updates) {
        const payload = {
          ...updates,
          updatedAt: /* @__PURE__ */ new Date()
        };
        return this.updateRow("candidate_profiles", { id }, payload);
      }
      // Interview Preparations
      async createInterviewPreparation(preparation) {
        return this.insertRow("interview_preparations", preparation);
      }
      async getInterviewPreparation(interviewId) {
        return this.selectSingle("interview_preparations", { interviewId });
      }
      async updateInterviewPreparation(id, updates) {
        return this.updateRow("interview_preparations", { id }, updates);
      }
      // Additional user methods
      async getUsers() {
        return this.selectMany("users", void 0, { orderBy: "created_at", ascending: false });
      }
      // AI Token Usage
      async createAiTokenUsage(usage) {
        return this.insertRow("ai_token_usage", usage);
      }
      async getAiTokenUsage(startDate, endDate) {
        let query = this.client.from("ai_token_usage").select("*");
        if (startDate) {
          query = query.gte("created_at", startDate.toISOString());
        }
        if (endDate) {
          query = query.lte("created_at", endDate.toISOString());
        }
        const { data, error } = await query.order("created_at", { ascending: false });
        if (error) {
          throw new Error(`Supabase query failed on ai_token_usage: ${error.message}`);
        }
        return transformRows(data);
      }
      async getAiTokenUsageByOperation(operation) {
        return this.selectMany("ai_token_usage", { operation }, { orderBy: "created_at", ascending: false });
      }
      async getAiTokenUsageByUser(userId, startDate, endDate) {
        let query = this.client.from("ai_token_usage").select("*").eq("user_id", userId);
        if (startDate) {
          query = query.gte("created_at", startDate.toISOString());
        }
        if (endDate) {
          query = query.lte("created_at", endDate.toISOString());
        }
        const { data, error } = await query.order("created_at", { ascending: false });
        if (error) {
          throw new Error(`Supabase query failed on ai_token_usage: ${error.message}`);
        }
        return transformRows(data);
      }
      async getTotalCostByPeriod(startDate, endDate) {
        const usages = await this.getAiTokenUsage(startDate, endDate);
        return usages.reduce((sum, usage) => {
          const costValue = usage.estimatedCost ?? "0";
          const numeric = typeof costValue === "string" ? parseFloat(costValue) : costValue;
          return sum + (numeric || 0);
        }, 0);
      }
      // Hiring decisions
      async createHiringDecision(decision) {
        return this.insertRow("hiring_decisions", decision);
      }
      async getHiringDecision(candidateId, jobId) {
        return this.selectSingle("hiring_decisions", { candidateId, jobId });
      }
      async getHiringDecisionById(id) {
        return this.selectSingle("hiring_decisions", { id });
      }
      async getHiringDecisionsByJob(jobId) {
        return this.selectMany("hiring_decisions", { jobId }, { orderBy: "created_at", ascending: false });
      }
      async updateHiringDecision(id, updates) {
        const payload = {
          ...updates,
          updatedAt: /* @__PURE__ */ new Date()
        };
        return this.updateRow("hiring_decisions", { id }, payload);
      }
      async getCandidatesForJob(jobId) {
        const matches = await this.getJobMatchesForJob(jobId);
        if (matches.length === 0) {
          return [];
        }
        const candidateIds = matches.map((match) => match.candidateId);
        return this.selectMany("candidates", { id: candidateIds });
      }
    };
    if (process.env.USE_IN_MEMORY_STORAGE === "true") {
      storageImplementation = new MemStorage();
    } else {
      storageImplementation = new SupabaseStorage();
    }
    storage = storageImplementation;
  }
});

// shared/schema.ts
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, decimal, boolean, unique, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users, jobs, candidates, interviews, aiConversations, jobMatches, promptTemplates, candidateStatusHistory, activityLog, notifications, userSessions, comments, candidateProfiles, interviewPreparations, insertUserSchema, insertJobSchema, insertCandidateSchema, insertInterviewSchema, insertAiConversationSchema, insertJobMatchSchema, insertPromptTemplateSchema, insertCandidateStatusHistorySchema, insertActivityLogSchema, insertNotificationSchema, insertUserSessionSchema, insertCommentSchema, insertCandidateProfileSchema, insertInterviewPreparationSchema, hiringDecisions, insertHiringDecisionSchema, aiTokenUsage, insertAiTokenUsageSchema, candidateContextSchema, suggestedQuestionSchema, focusAreaSchema, interviewPreparationStatusSchema, proficiencySchema, profileDataSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    users = pgTable("users", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      email: text("email").notNull().unique(),
      password: text("password").notNull(),
      name: text("name").notNull(),
      role: text("role").notNull().default("hr_manager"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    jobs = pgTable("jobs", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      title: text("title").notNull(),
      department: text("department").notNull(),
      location: text("location").notNull(),
      type: text("type").notNull(),
      // full-time, part-time, contract
      salaryMin: integer("salary_min"),
      salaryMax: integer("salary_max"),
      requirements: jsonb("requirements").$type(),
      // array of strings
      focusAreas: jsonb("focus_areas").$type(),
      description: text("description").notNull(),
      status: text("status").notNull().default("active"),
      // active, paused, closed
      createdBy: varchar("created_by").references(() => users.id),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    candidates = pgTable("candidates", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      name: text("name").notNull(),
      email: text("email").notNull(),
      phone: text("phone"),
      position: text("position"),
      experience: integer("experience"),
      // years
      education: text("education"),
      location: text("location"),
      salaryExpectation: integer("salary_expectation"),
      expectedSalary: integer("expected_salary"),
      yearsOfExperience: integer("years_of_experience"),
      resumeUrl: text("resume_url"),
      resumeText: text("resume_text"),
      skills: jsonb("skills").$type(),
      // array of strings
      status: text("status").notNull().default("applied"),
      // applied, screening, interview, offer, hired, rejected
      matchScore: decimal("match_score", { precision: 5, scale: 2 }),
      aiSummary: text("ai_summary"),
      notes: text("notes"),
      source: text("source").default("manual"),
      // manual, linkedin, job_board, referral
      tags: jsonb("tags").$type(),
      // array of strings for categorization
      resumeAnalysis: jsonb("resume_analysis").$type(),
      targetedAnalysis: jsonb("targeted_analysis").$type(),
      lastContactedAt: timestamp("last_contacted_at"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    interviews = pgTable("interviews", {
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
      updatedAt: timestamp("updated_at").defaultNow()
    });
    aiConversations = pgTable("ai_conversations", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").references(() => users.id).notNull(),
      sessionId: varchar("session_id").notNull(),
      message: text("message").notNull(),
      response: text("response").notNull(),
      modelUsed: text("model_used").notNull(),
      tokensUsed: integer("tokens_used"),
      templateId: varchar("template_id"),
      // reference to prompt template used
      context: text("context"),
      // additional context provided
      createdAt: timestamp("created_at").defaultNow()
    });
    jobMatches = pgTable("job_matches", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      candidateId: varchar("candidate_id").references(() => candidates.id).notNull(),
      jobId: varchar("job_id").references(() => jobs.id).notNull(),
      matchScore: decimal("match_score", { precision: 5, scale: 2 }).notNull(),
      matchReasons: jsonb("match_reasons"),
      // array of strings
      aiAnalysis: text("ai_analysis"),
      basicMatchScore: decimal("basic_match_score", { precision: 5, scale: 2 }),
      status: text("status").notNull().default("pending"),
      analysis: jsonb("analysis").$type(),
      score: decimal("score", { precision: 5, scale: 2 }),
      createdAt: timestamp("created_at").defaultNow()
    });
    promptTemplates = pgTable("prompt_templates", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      name: text("name").notNull(),
      description: text("description").notNull(),
      category: text("category").notNull(),
      // resume_analysis, job_matching, interview_questions, candidate_screening, general
      template: text("template").notNull(),
      variables: jsonb("variables").notNull(),
      // array of variable names
      isActive: boolean("is_active").notNull().default(true),
      createdBy: varchar("created_by").references(() => users.id),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    candidateStatusHistory = pgTable("candidate_status_history", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      candidateId: varchar("candidate_id").references(() => candidates.id).notNull(),
      oldStatus: text("old_status"),
      newStatus: text("new_status").notNull(),
      reason: text("reason"),
      notes: text("notes"),
      changedBy: varchar("changed_by").references(() => users.id),
      createdAt: timestamp("created_at").defaultNow()
    });
    activityLog = pgTable("activity_log", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").references(() => users.id).notNull(),
      action: text("action").notNull(),
      // candidate_updated, interview_scheduled, job_created, etc.
      entityType: text("entity_type").notNull(),
      // candidate, job, interview
      entityId: varchar("entity_id").notNull(),
      entityName: text("entity_name").notNull(),
      // for display
      details: jsonb("details"),
      // additional context
      createdAt: timestamp("created_at").defaultNow()
    });
    notifications = pgTable("notifications", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").references(() => users.id).notNull(),
      type: text("type").notNull(),
      // candidate_update, interview_reminder, team_activity
      title: text("title").notNull(),
      message: text("message").notNull(),
      entityType: text("entity_type"),
      // candidate, job, interview
      entityId: varchar("entity_id"),
      isRead: boolean("is_read").notNull().default(false),
      createdAt: timestamp("created_at").defaultNow()
    });
    userSessions = pgTable("user_sessions", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").references(() => users.id).notNull(),
      isOnline: boolean("is_online").notNull().default(true),
      currentPage: text("current_page"),
      lastActivity: timestamp("last_activity").defaultNow(),
      socketId: text("socket_id"),
      createdAt: timestamp("created_at").defaultNow()
    });
    comments = pgTable("comments", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      entityType: text("entity_type").notNull(),
      entityId: varchar("entity_id").notNull(),
      content: text("content").notNull(),
      authorId: varchar("author_id").references(() => users.id).notNull(),
      isInternal: boolean("is_internal").notNull().default(true),
      mentions: jsonb("mentions"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    candidateProfiles = pgTable("candidate_profiles", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      /** 关联的候选人 ID，删除候选人时级联删除画像 */
      candidateId: varchar("candidate_id").references(() => candidates.id, { onDelete: "cascade" }).notNull(),
      /** 关联的职位 ID（可选），删除职位时设为 NULL */
      jobId: varchar("job_id").references(() => jobs.id, { onDelete: "set null" }),
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
      updatedAt: timestamp("updated_at").defaultNow()
    }, (table) => ({
      // 确保同一候选人的版本号唯一
      uniqueCandidateVersion: unique().on(table.candidateId, table.version)
    }));
    interviewPreparations = pgTable("interview_preparations", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      /** 关联的候选人ID */
      candidateId: varchar("candidate_id").references(() => candidates.id, { onDelete: "cascade" }).notNull(),
      /** 关联的职位ID (冗余存储以提高查询性能) */
      jobId: varchar("job_id").references(() => jobs.id, { onDelete: "set null" }),
      /** 关联的面试ID */
      interviewId: varchar("interview_id").references(() => interviews.id, { onDelete: "cascade" }).notNull(),
      /** 为哪位面试官生成的准备材料 */
      generatedFor: varchar("generated_for").references(() => users.id, { onDelete: "set null" }),
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
      updatedAt: timestamp("updated_at").defaultNow()
    }, (table) => ({
      // 索引优化查询性能
      candidateIdx: index("idx_interview_prep_candidate").on(table.candidateId),
      interviewIdx: index("idx_interview_prep_interview").on(table.interviewId),
      generatedForIdx: index("idx_interview_prep_generated_for").on(table.generatedFor),
      createdAtIdx: index("idx_interview_prep_created_at").on(table.createdAt),
      statusIdx: index("idx_interview_prep_status").on(table.status),
      // 确保每个面试只有一份准备材料（通过 interviewId 的唯一性）
      uniqueInterviewPrep: unique("unique_interview_prep").on(table.interviewId)
    }));
    insertUserSchema = createInsertSchema(users).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertJobSchema = createInsertSchema(jobs).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertCandidateSchema = createInsertSchema(candidates).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertInterviewSchema = createInsertSchema(interviews).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertAiConversationSchema = createInsertSchema(aiConversations).omit({
      id: true,
      createdAt: true
    });
    insertJobMatchSchema = createInsertSchema(jobMatches).omit({
      id: true,
      createdAt: true
    });
    insertPromptTemplateSchema = createInsertSchema(promptTemplates).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertCandidateStatusHistorySchema = createInsertSchema(candidateStatusHistory).omit({
      id: true,
      createdAt: true
    });
    insertActivityLogSchema = createInsertSchema(activityLog).omit({
      id: true,
      createdAt: true
    });
    insertNotificationSchema = createInsertSchema(notifications).omit({
      id: true,
      createdAt: true
    });
    insertUserSessionSchema = createInsertSchema(userSessions).omit({
      id: true,
      createdAt: true
    });
    insertCommentSchema = createInsertSchema(comments).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertCandidateProfileSchema = createInsertSchema(candidateProfiles).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertInterviewPreparationSchema = createInsertSchema(interviewPreparations).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    hiringDecisions = pgTable("hiring_decisions", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      candidateId: varchar("candidate_id").references(() => candidates.id, { onDelete: "cascade" }).notNull(),
      jobId: varchar("job_id").references(() => jobs.id, { onDelete: "cascade" }).notNull(),
      // Decision and recommendation
      decision: varchar("decision", { length: 50 }).notNull(),
      // hire, reject, hold, next-round
      confidence: integer("confidence"),
      // 0-100 confidence score
      recommendation: text("recommendation").notNull(),
      // AI generated recommendation text
      // Detailed analysis
      strengths: jsonb("strengths"),
      // Array of key strengths
      weaknesses: jsonb("weaknesses"),
      // Array of weaknesses/concerns
      riskAssessment: jsonb("risk_assessment"),
      // Risk factors and mitigation
      growthPotential: jsonb("growth_potential"),
      // Growth trajectory analysis
      culturalFit: jsonb("cultural_fit"),
      // Cultural alignment assessment
      // Comparative analysis
      comparisonWithOthers: jsonb("comparison_with_others"),
      // How candidate compares to others
      alternativeRoles: jsonb("alternative_roles"),
      // Other suitable positions
      // Conditions and next steps
      conditions: jsonb("conditions"),
      // Conditions for hiring (if applicable)
      nextSteps: jsonb("next_steps"),
      // Recommended next actions
      timelineSuggestion: varchar("timeline_suggestion", { length: 255 }),
      // Urgency/timeline
      // Compensation insights
      compensationRange: jsonb("compensation_range"),
      // Suggested compensation
      negotiationPoints: jsonb("negotiation_points"),
      // Key negotiation considerations
      // Decision metadata
      decidedBy: varchar("decided_by").references(() => users.id, { onDelete: "set null" }),
      decidedAt: timestamp("decided_at", { withTimezone: true }),
      status: varchar("status", { length: 50 }).default("draft"),
      // draft, final, revised
      // Tracking
      viewedAt: timestamp("viewed_at", { withTimezone: true }),
      feedbackRating: integer("feedback_rating"),
      // 1-5 rating
      feedbackComment: text("feedback_comment"),
      createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
      updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
    });
    insertHiringDecisionSchema = createInsertSchema(hiringDecisions).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    aiTokenUsage = pgTable("ai_token_usage", {
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
      createdAt: timestamp("created_at").defaultNow().notNull()
    }, (table) => ({
      // 索引优化查询性能
      userIdx: index("idx_ai_token_usage_user").on(table.userId),
      operationIdx: index("idx_ai_token_usage_operation").on(table.operation),
      entityIdx: index("idx_ai_token_usage_entity").on(table.entityType, table.entityId),
      createdAtIdx: index("idx_ai_token_usage_created_at").on(table.createdAt),
      modelIdx: index("idx_ai_token_usage_model").on(table.model)
    }));
    insertAiTokenUsageSchema = createInsertSchema(aiTokenUsage).omit({
      id: true,
      createdAt: true
    });
    candidateContextSchema = z.object({
      /** 候选人总体情况摘要 */
      summary: z.string(),
      /** 当前综合评分 */
      currentScore: z.number().min(0).max(100),
      /** 优势领域 */
      strengths: z.array(z.string()),
      /** 待考察或疑虑点 */
      concerns: z.array(z.string())
    });
    suggestedQuestionSchema = z.object({
      /** 建议的问题内容 */
      question: z.string(),
      /** 提问目的 */
      purpose: z.string(),
      /** 追问建议 */
      probing: z.array(z.string()).optional(),
      /** 问题类别 */
      category: z.enum(["technical", "behavioral", "situational", "cultural"]).optional()
    });
    focusAreaSchema = z.object({
      /** 重点考察领域 */
      area: z.string(),
      /** 为什么需要重点考察 */
      why: z.string(),
      /** 关键观察信号 */
      signals: z.array(z.string()),
      /** 优先级 */
      priority: z.enum(["high", "medium", "low"]).optional()
    });
    interviewPreparationStatusSchema = z.enum(["generating", "completed", "failed"]);
    proficiencySchema = z.enum(["beginner", "intermediate", "advanced", "expert"]);
    profileDataSchema = z.object({
      technicalSkills: z.array(z.object({
        skill: z.string(),
        proficiency: proficiencySchema,
        evidenceSource: z.string()
      })).optional(),
      softSkills: z.array(z.object({
        skill: z.string(),
        examples: z.array(z.string())
      })).optional(),
      experience: z.object({
        totalYears: z.number().nonnegative(),
        relevantYears: z.number().nonnegative(),
        positions: z.array(z.object({
          title: z.string(),
          duration: z.string(),
          keyAchievements: z.array(z.string())
        }))
      }).optional(),
      education: z.object({
        level: z.string(),
        field: z.string(),
        institution: z.string().optional()
      }).optional(),
      culturalFit: z.object({
        workStyle: z.string(),
        motivations: z.array(z.string()),
        preferences: z.array(z.string())
      }).optional(),
      careerTrajectory: z.object({
        progression: z.string(),
        growthAreas: z.array(z.string()),
        stabilityScore: z.number().min(0).max(100)
      }).optional(),
      organizationalFit: z.object({
        cultureAssessment: z.object({
          overallScore: z.number().min(0).max(100),
          valueAssessments: z.array(z.object({
            valueName: z.string(),
            score: z.number().min(0).max(100),
            confidence: z.string(),
            evidence: z.array(z.string()),
            alignmentLevel: z.enum(["strong", "moderate", "weak"])
          })),
          culturalStrengths: z.array(z.string()),
          culturalRisks: z.array(z.string())
        }).optional(),
        leadershipAssessment: z.object({
          overallScore: z.number().min(0).max(100),
          currentLevel: z.string(),
          potentialLevel: z.string(),
          dimensionScores: z.array(z.object({
            dimension: z.string(),
            score: z.number().min(0).max(100),
            examples: z.array(z.string())
          })),
          strengths: z.array(z.string()),
          developmentAreas: z.array(z.string())
        }).optional(),
        teamDynamics: z.object({
          preferredTeamSize: z.string(),
          collaborationStyle: z.string(),
          conflictResolution: z.string(),
          communicationPreference: z.string()
        }).optional(),
        organizationalReadiness: z.object({
          adaptabilityScore: z.number().min(0).max(100),
          changeReadiness: z.string(),
          learningAgility: z.number().min(0).max(100),
          crossFunctionalAbility: z.string()
        }).optional()
      }).optional()
    });
  }
});

// server/services/aiService.ts
import OpenAI from "openai";
var openai, MODELS, AIService, aiService;
var init_aiService = __esm({
  "server/services/aiService.ts"() {
    "use strict";
    openai = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY || "",
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://hr-recruit-system.vercel.app",
        "X-Title": "AI Recruit System"
      }
    });
    MODELS = {
      // 简历分析使用最强旗舰模型 GPT-4o，确保最高准确性
      RESUME_ANALYSIS: process.env.RESUME_AI_MODEL || "openai/gpt-4o",
      // 画像生成使用高质量模型
      PROFILE_GENERATION: process.env.PROFILE_AI_MODEL || "openai/gpt-4o",
      // 匹配分析使用推理型模型
      MATCHING: process.env.MATCHING_AI_MODEL || "google/gemini-2.0-flash-thinking-exp",
      // 聊天助手使用经济型模型
      CHAT: process.env.CHAT_AI_MODEL || "google/gemini-2.0-flash-exp",
      // 默认模型
      DEFAULT: process.env.AI_MODEL || "google/gemini-2.0-flash-exp"
    };
    AIService = class {
      async analyzeResume(resumeText) {
        try {
          const model = MODELS.RESUME_ANALYSIS;
          const response = await openai.chat.completions.create({
            model,
            messages: [
              {
                role: "system",
                content: `You are an expert HR recruiter specializing in analyzing resumes from various cultural contexts, especially Chinese resumes.

Key Instructions:
1. Accurately extract information from both Chinese and English text
2. Understand Chinese job titles, company names, and educational institutions
3. Recognize Chinese date formats (\u5982 2020\u5E743\u6708-2023\u5E745\u6708)
4. Identify skills mentioned in Chinese technical terms
5. Pay attention to project descriptions and achievements
6. Extract both explicit and implicit skills from work experience

Return the analysis as JSON with the following structure:
{
  "summary": "Comprehensive professional summary capturing key strengths and career trajectory (in the same language as the resume)",
  "skills": ["skill1", "skill2", "..."], // Include technical skills, soft skills, tools, and frameworks
  "experience": 5, // Total years of work experience as a number
  "education": "Highest education level and major field (e.g., \u7855\u58EB-\u8BA1\u7B97\u673A\u79D1\u5B66, Bachelor-Computer Science)",
  "strengths": ["strength1", "strength2", "strength3"], // Key professional strengths
  "weaknesses": ["area1", "area2"], // Potential areas for improvement
  "recommendations": ["recommendation1", "recommendation2"] // Suggestions for career development
}

Important:
- For Chinese resumes, keep the summary in Chinese
- Extract ALL relevant skills, not just explicitly listed ones
- Calculate experience accurately from work history dates
- Identify strengths from achievements and project outcomes`
              },
              {
                role: "user",
                content: `Please analyze this resume thoroughly and provide detailed structured feedback:

${resumeText}`
              }
            ],
            response_format: { type: "json_object" },
            temperature: 0.3
            // Lower temperature for more consistent extraction
          });
          const content = response.choices[0].message.content;
          if (!content) {
            throw new Error("No response from AI");
          }
          const analysis = JSON.parse(content);
          const usage = {
            promptTokens: response.usage?.prompt_tokens || 0,
            completionTokens: response.usage?.completion_tokens || 0,
            totalTokens: response.usage?.total_tokens || 0
          };
          return {
            analysis,
            usage,
            model
          };
        } catch (error) {
          console.error("Error analyzing resume:", error);
          throw new Error("Failed to analyze resume: " + (error instanceof Error ? error.message : "Unknown error"));
        }
      }
      async matchCandidateToJob(candidateData, jobData) {
        try {
          const model = MODELS.MATCHING;
          const response = await openai.chat.completions.create({
            model,
            messages: [
              {
                role: "system",
                content: `You are an expert HR recruiter. Analyze how well a candidate matches a job position. Return the analysis as JSON with this structure:
            {
              "score": 85,
              "reasons": ["reason1", "reason2"],
              "explanation": "Detailed explanation of the match"
            }
            Score should be 0-100. Include specific reasons for the match score.`
              },
              {
                role: "user",
                content: `
            Candidate Profile:
            - Position: ${candidateData.position}
            - Skills: ${candidateData.skills.join(", ")}
            - Experience: ${candidateData.experience} years
            - Education: ${candidateData.education}

            Job Requirements:
            - Title: ${jobData.title}
            - Requirements: ${jobData.requirements.join(", ")}
            - Description: ${jobData.description}

            Please analyze the match between this candidate and job position.`
              }
            ],
            response_format: { type: "json_object" }
          });
          const content = response.choices[0].message.content;
          if (!content) {
            throw new Error("No response from AI");
          }
          const match = JSON.parse(content);
          const usage = {
            promptTokens: response.usage?.prompt_tokens || 0,
            completionTokens: response.usage?.completion_tokens || 0,
            totalTokens: response.usage?.total_tokens || 0
          };
          return {
            match,
            usage,
            model
          };
        } catch (error) {
          console.error("Error matching candidate to job:", error);
          throw new Error("Failed to match candidate: " + (error instanceof Error ? error.message : "Unknown error"));
        }
      }
      async generateInterviewQuestions(jobTitle, requirements) {
        try {
          const model = MODELS.DEFAULT;
          const response = await openai.chat.completions.create({
            model,
            messages: [
              {
                role: "system",
                content: `You are an expert HR recruiter. Generate relevant interview questions for a specific job position. Return the questions as JSON array:
            {
              "questions": ["question1", "question2", "question3"]
            }
            Generate 5-8 thoughtful questions that assess both technical skills and cultural fit.`
              },
              {
                role: "user",
                content: `Generate interview questions for:
            Job Title: ${jobTitle}
            Requirements: ${requirements.join(", ")}`
              }
            ],
            response_format: { type: "json_object" }
          });
          const content = response.choices[0].message.content;
          if (!content) {
            throw new Error("No response from AI");
          }
          const result = JSON.parse(content);
          const usage = {
            promptTokens: response.usage?.prompt_tokens || 0,
            completionTokens: response.usage?.completion_tokens || 0,
            totalTokens: response.usage?.total_tokens || 0
          };
          return {
            questions: result.questions,
            usage,
            model
          };
        } catch (error) {
          console.error("Error generating interview questions:", error);
          throw new Error("Failed to generate questions: " + (error instanceof Error ? error.message : "Unknown error"));
        }
      }
      async chatWithAssistant(message, context) {
        try {
          const model = MODELS.CHAT;
          const systemMessage = `You are an AI assistant specialized in HR and recruitment. You help HR managers with:
      - Candidate evaluation and analysis
      - Interview preparation and questions
      - Job posting optimization
      - Recruitment strategy advice
      - Data interpretation and insights

      Be helpful, professional, and provide actionable advice.`;
          const messages = [
            { role: "system", content: systemMessage }
          ];
          if (context) {
            messages.push({ role: "system", content: `Context: ${context}` });
          }
          messages.push({ role: "user", content: message });
          const apiResponse = await openai.chat.completions.create({
            model,
            messages
          });
          const content = apiResponse.choices[0].message.content;
          if (!content) {
            throw new Error("No response from AI");
          }
          const usage = {
            promptTokens: apiResponse.usage?.prompt_tokens || 0,
            completionTokens: apiResponse.usage?.completion_tokens || 0,
            totalTokens: apiResponse.usage?.total_tokens || 0
          };
          return {
            response: content,
            usage,
            model
          };
        } catch (error) {
          console.error("Error in AI chat:", error);
          throw new Error("Failed to get AI response: " + (error instanceof Error ? error.message : "Unknown error"));
        }
      }
      /**
       * 生成结构化响应（返回 JSON）
       */
      async generateStructuredResponse(prompt, modelType = "DEFAULT") {
        try {
          const model = MODELS[modelType];
          const response = await openai.chat.completions.create({
            model,
            messages: [
              {
                role: "system",
                content: "\u4F60\u662F\u4E00\u4F4D\u4E13\u4E1A\u7684HR\u4E13\u5BB6\uFF0C\u8BF7\u7528\u4E2D\u6587\u56DE\u7B54\u3002\u8FD4\u56DEJSON\u683C\u5F0F\u7684\u7ED3\u6784\u5316\u6570\u636E\u3002"
              },
              {
                role: "user",
                content: prompt
              }
            ],
            temperature: 0.7,
            response_format: { type: "json_object" }
          });
          const content = response.choices[0]?.message?.content;
          if (!content) {
            throw new Error("No response from AI");
          }
          const usage = {
            promptTokens: response.usage?.prompt_tokens || 0,
            completionTokens: response.usage?.completion_tokens || 0,
            totalTokens: response.usage?.total_tokens || 0
          };
          return {
            data: JSON.parse(content),
            usage,
            model
          };
        } catch (error) {
          console.error("Error generating structured response:", error);
          return {
            data: {},
            usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            model: MODELS[modelType]
          };
        }
      }
      /**
       * 生成文本响应
       */
      async generateTextResponse(prompt, modelType = "DEFAULT") {
        try {
          const model = MODELS[modelType];
          const response = await openai.chat.completions.create({
            model,
            messages: [
              {
                role: "system",
                content: "\u4F60\u662F\u4E00\u4F4D\u4E13\u4E1A\u7684HR\u4E13\u5BB6\uFF0C\u8BF7\u7528\u4E2D\u6587\u63D0\u4F9B\u4E13\u4E1A\u3001\u5BA2\u89C2\u7684\u5206\u6790\u548C\u5EFA\u8BAE\u3002"
              },
              {
                role: "user",
                content: prompt
              }
            ],
            temperature: 0.8,
            max_tokens: 500
          });
          const usage = {
            promptTokens: response.usage?.prompt_tokens || 0,
            completionTokens: response.usage?.completion_tokens || 0,
            totalTokens: response.usage?.total_tokens || 0
          };
          return {
            text: response.choices[0]?.message?.content || "",
            usage,
            model
          };
        } catch (error) {
          console.error("Error generating text response:", error);
          return {
            text: "",
            usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            model: MODELS[modelType]
          };
        }
      }
    };
    aiService = new AIService();
  }
});

// server/services/resumeParser.ts
import { createRequire } from "module";
function getPdfParse() {
  if (!pdfParseLoaded) {
    pdfParseLoaded = true;
    try {
      const maybeModule = require2("pdf-parse");
      pdfParseInstance = typeof maybeModule === "function" ? maybeModule : maybeModule?.default ?? null;
      if (!pdfParseInstance) {
        console.warn("[Resume Parser] pdf-parse module resolved but export missing");
      }
    } catch (error) {
      console.warn("[Resume Parser] pdf-parse module unavailable, using basic text fallback:", error);
      pdfParseInstance = null;
    }
  }
  return pdfParseInstance;
}
var require2, pdfParseInstance, pdfParseLoaded, ResumeParserService, resumeParserService;
var init_resumeParser = __esm({
  "server/services/resumeParser.ts"() {
    "use strict";
    require2 = createRequire(import.meta.url);
    pdfParseInstance = null;
    pdfParseLoaded = false;
    ResumeParserService = class {
      async parseFile(fileBuffer, mimeType) {
        try {
          if (mimeType === "application/pdf") {
            const parser = getPdfParse();
            if (!parser) {
              console.warn("[Resume Parser] pdf-parse not available, falling back to plain-text extraction.");
              return this.parsePlainText(fileBuffer);
            }
            return await this.parsePDF(fileBuffer, parser);
          } else if (mimeType === "text/plain") {
            return this.parsePlainText(fileBuffer);
          } else {
            throw new Error("Unsupported resume format. \u8BF7\u4E0A\u4F20 PDF \u683C\u5F0F\u7684\u7B80\u5386\u3002");
          }
        } catch (error) {
          console.error("Error parsing resume file:", error);
          throw new Error("Failed to parse resume file: " + (error instanceof Error ? error.message : "Unknown error"));
        }
      }
      async parsePDF(buffer, parser) {
        try {
          const data = await parser(buffer, {
            // 保持原始字符编码
            normalizeWhitespace: false,
            // 使用更好的字体处理
            disableFontFace: false,
            // 保持原始文本格式
            useSystemFonts: true
          });
          const cleanedText = this.cleanAndFixEncoding(data.text);
          return {
            text: cleanedText,
            metadata: {
              pages: data.numpages,
              info: data.info
            }
          };
        } catch (error) {
          console.error("Error parsing PDF:", error);
          throw new Error("Failed to parse PDF file");
        }
      }
      /**
       * 清理和修复PDF文本中的编码问题
       */
      cleanAndFixEncoding(text2) {
        if (!text2) return "";
        try {
          let cleaned = text2.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").replace(/\r\n/g, "\n").replace(/\u00a0/g, " ").replace(/â€™/g, "'").replace(/â€œ/g, '"').replace(/â€�/g, '"').replace(/â€¢/g, "\u2022").replace(/â€“/g, "\u2013").replace(/â€”/g, "\u2014");
          cleaned = cleaned.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").replace(/[ \t]+\n/g, "\n").replace(/\n[ \t]+/g, "\n").trim();
          if (this.hasEncodingIssues(cleaned)) {
            const reencoded = this.tryReencode(cleaned);
            if (reencoded && !this.hasEncodingIssues(reencoded)) {
              cleaned = reencoded;
            }
          }
          return cleaned;
        } catch (error) {
          console.warn("Error cleaning text encoding:", error);
          return text2;
        }
      }
      /**
       * 检测文本是否存在编码问题
       */
      hasEncodingIssues(text2) {
        if (!text2) return false;
        const replacementChar = text2.includes("\uFFFD");
        const typicalMojibake = /(Ã|Â|â€™|â€œ|â€�|â€“|â€”|â€¢|æ\x80|å\x8f|ç\x9a)/;
        return replacementChar || typicalMojibake.test(text2);
      }
      /**
       * 尝试通过重新编码修复文本
       */
      tryReencode(text2) {
        try {
          const buffer = Buffer.from(text2, "latin1");
          const decoded = buffer.toString("utf8");
          const originalChineseCount = (text2.match(/[\u4e00-\u9fff]/g) || []).length;
          const decodedChineseCount = (decoded.match(/[\u4e00-\u9fff]/g) || []).length;
          if (decodedChineseCount > originalChineseCount) {
            return decoded;
          }
          return null;
        } catch (error) {
          console.warn("Failed to re-encode text:", error);
          return null;
        }
      }
      parsePlainText(buffer) {
        const text2 = buffer.toString("utf-8");
        return {
          text: text2,
          metadata: {
            pages: 1
          }
        };
      }
      extractContactInfo(text2) {
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        const phoneRegex = /(?:\+86[-.\s]?)?(?:1[3-9]\d{9}|(?:\(?0\d{2,3}\)?[-.\s]?)?\d{7,8})/g;
        const emailMatch = text2.match(emailRegex);
        const phoneMatch = text2.match(phoneRegex);
        const lines = text2.split("\n").filter((line) => line.trim().length > 0);
        let name;
        for (let i = 0; i < Math.min(lines.length, 5); i++) {
          const line = lines[i]?.trim();
          if (!line) continue;
          const nameKeywordMatch = line.match(/(?:姓名|Name|名字)[:：\s]*([^\s]+(?:\s+[^\s]+)*)/i);
          if (nameKeywordMatch && nameKeywordMatch[1]) {
            name = nameKeywordMatch[1].trim();
            break;
          }
          if (i === 0) {
            if (/^[\u4e00-\u9fff]{2,4}$/.test(line)) {
              name = line;
              break;
            }
            if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/.test(line) && line.length < 50) {
              name = line;
              break;
            }
          }
          if (line.length < 30) {
            const chineseNameMatch = line.match(/[\u4e00-\u9fff]{2,4}/);
            if (chineseNameMatch && !line.includes("@") && !line.includes("\u516C\u53F8") && !line.includes("\u5927\u5B66")) {
              name = chineseNameMatch[0];
              break;
            }
            const englishNameMatch = line.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})$/);
            if (englishNameMatch) {
              name = englishNameMatch[1];
              break;
            }
          }
        }
        return {
          email: emailMatch?.[0],
          phone: phoneMatch?.[0],
          name
        };
      }
      extractSkills(text2) {
        const skillKeywords = [
          // 编程语言
          "JavaScript",
          "TypeScript",
          "React",
          "Vue",
          "Angular",
          "Node.js",
          "Python",
          "Java",
          "C++",
          "C#",
          "Go",
          "Rust",
          "PHP",
          "Swift",
          "Kotlin",
          "HTML",
          "CSS",
          "SASS",
          "SCSS",
          "Bootstrap",
          "Tailwind",
          "jQuery",
          // 数据库
          "SQL",
          "MySQL",
          "PostgreSQL",
          "MongoDB",
          "Redis",
          "Oracle",
          "SQLite",
          "\u6570\u636E\u5E93",
          "MySQL\u6570\u636E\u5E93",
          "PostgreSQL\u6570\u636E\u5E93",
          "MongoDB\u6570\u636E\u5E93",
          // 云服务和DevOps
          "Docker",
          "Kubernetes",
          "AWS",
          "Azure",
          "GCP",
          "\u963F\u91CC\u4E91",
          "\u817E\u8BAF\u4E91",
          "Git",
          "GitHub",
          "GitLab",
          "Jenkins",
          "CI/CD",
          "DevOps",
          // API和架构
          "REST",
          "GraphQL",
          "API",
          "Microservices",
          "\u5FAE\u670D\u52A1",
          "RESTful",
          // AI和数据科学
          "Machine Learning",
          "AI",
          "Data Science",
          "Analytics",
          "TensorFlow",
          "PyTorch",
          "\u4EBA\u5DE5\u667A\u80FD",
          "\u673A\u5668\u5B66\u4E60",
          "\u6570\u636E\u79D1\u5B66",
          "\u6570\u636E\u5206\u6790",
          "\u6DF1\u5EA6\u5B66\u4E60",
          // 项目管理
          "Project Management",
          "Agile",
          "Scrum",
          "Kanban",
          "\u9879\u76EE\u7BA1\u7406",
          "\u654F\u6377\u5F00\u53D1",
          // 前端框架和工具
          "Webpack",
          "Vite",
          "Babel",
          "ESLint",
          "Prettier",
          "npm",
          "yarn",
          // 后端框架
          "Express",
          "Koa",
          "Spring",
          "Django",
          "Flask",
          "Laravel",
          // 移动开发
          "React Native",
          "Flutter",
          "iOS",
          "Android",
          "\u79FB\u52A8\u5F00\u53D1",
          // 测试
          "Jest",
          "Cypress",
          "Selenium",
          "\u5355\u5143\u6D4B\u8BD5",
          "\u96C6\u6210\u6D4B\u8BD5",
          "\u81EA\u52A8\u5316\u6D4B\u8BD5",
          // 设计和UI/UX
          "Figma",
          "Sketch",
          "Adobe",
          "Photoshop",
          "UI\u8BBE\u8BA1",
          "UX\u8BBE\u8BA1",
          "\u7528\u6237\u4F53\u9A8C",
          // 中文技能关键词
          "\u524D\u7AEF\u5F00\u53D1",
          "\u540E\u7AEF\u5F00\u53D1",
          "\u5168\u6808\u5F00\u53D1",
          "\u8F6F\u4EF6\u5F00\u53D1",
          "Web\u5F00\u53D1",
          "\u79FB\u52A8\u7AEF\u5F00\u53D1",
          "\u6570\u636E\u5E93\u8BBE\u8BA1",
          "\u7CFB\u7EDF\u67B6\u6784",
          "\u6027\u80FD\u4F18\u5316",
          "\u4EE3\u7801\u4F18\u5316",
          "\u56E2\u961F\u534F\u4F5C",
          "\u6C9F\u901A\u80FD\u529B",
          "\u5B66\u4E60\u80FD\u529B",
          "\u89E3\u51B3\u95EE\u9898",
          "\u521B\u65B0\u601D\u7EF4",
          "\u8D23\u4EFB\u5FC3",
          "\u6297\u538B\u80FD\u529B"
        ];
        const foundSkills = [];
        const lowerText = text2.toLowerCase();
        const originalText = text2;
        const skillSet = /* @__PURE__ */ new Set();
        skillKeywords.forEach((skill) => {
          const lowerSkill = skill.toLowerCase();
          if (lowerText.includes(lowerSkill)) {
            skillSet.add(skill);
          }
          if (originalText.includes(skill)) {
            skillSet.add(skill);
          }
        });
        const skillPatterns = [
          // 匹配 "熟练掌握 XXX" 模式
          /(?:熟练掌握|精通|掌握|了解|使用过|熟悉)[:：\s]*([A-Za-z\u4e00-\u9fff][A-Za-z0-9\u4e00-\u9fff\s\.\-\/]{1,20})/g,
          // 匹配 "技能: XXX, YYY" 模式
          /(?:技能|Skills|专业技能)[:：\s]*([A-Za-z\u4e00-\u9fff][A-Za-z0-9\u4e00-\u9fff\s\.\-\/,，]{1,100})/g,
          // 匹配编程语言列表
          /(?:编程语言|Programming Languages?)[:：\s]*([A-Za-z\u4e00-\u9fff][A-Za-z0-9\u4e00-\u9fff\s\.\-\/,，]{1,100})/g
        ];
        skillPatterns.forEach((pattern) => {
          let match;
          while ((match = pattern.exec(originalText)) !== null) {
            const skillText = match[1].trim();
            const skills = skillText.split(/[,，、\s]+/).filter((s) => s.length > 1 && s.length < 30);
            skills.forEach((skill) => {
              if (skill.trim()) {
                skillSet.add(skill.trim());
              }
            });
          }
        });
        return Array.from(skillSet);
      }
      extractExperience(text2) {
        const experiencePatterns = [
          /(\d+)\+?\s*years?\s*(?:of\s+)?experience/i,
          /(\d+)\+?\s*years?\s*in/i,
          /(\d+)\+?\s*yrs?\s*experience/i,
          /experience:\s*(\d+)\+?\s*years?/i
        ];
        for (const pattern of experiencePatterns) {
          const match = text2.match(pattern);
          if (match) {
            return parseInt(match[1], 10);
          }
        }
        return 0;
      }
    };
    resumeParserService = new ResumeParserService();
  }
});

// server/services/openaiService.ts
import OpenAI2 from "openai";
var openai2;
var init_openaiService = __esm({
  "server/services/openaiService.ts"() {
    "use strict";
    openai2 = new OpenAI2({
      apiKey: process.env.OPENROUTER_API_KEY || "",
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://hr-recruit-system.vercel.app",
        "X-Title": "AI Recruit System"
      }
    });
  }
});

// server/services/resumeParserEnhanced.ts
import { createRequire as createRequire2 } from "module";
function getPdfParse2() {
  if (!pdfParseLoaded2) {
    pdfParseLoaded2 = true;
    try {
      const maybeModule = require3("pdf-parse");
      pdfParseInstance2 = typeof maybeModule === "function" ? maybeModule : maybeModule?.default ?? null;
      if (!pdfParseInstance2) {
        console.warn("[Enhanced Parser] pdf-parse module resolved but no default export");
      }
    } catch (error) {
      console.warn("[Enhanced Parser] pdf-parse module unavailable, fallback parsers will be used:", error);
      pdfParseInstance2 = null;
    }
  }
  return pdfParseInstance2;
}
var require3, pdfParseInstance2, pdfParseLoaded2, ANALYSIS_MODEL, EnhancedResumeParser, enhancedResumeParser;
var init_resumeParserEnhanced = __esm({
  "server/services/resumeParserEnhanced.ts"() {
    "use strict";
    init_openaiService();
    init_resumeParser();
    require3 = createRequire2(import.meta.url);
    pdfParseInstance2 = null;
    pdfParseLoaded2 = false;
    ANALYSIS_MODEL = process.env.RESUME_AI_MODEL || "openai/gpt-4o-mini";
    EnhancedResumeParser = class {
      /**
       * 使用多策略解析PDF文本
       */
      async extractTextFromPDF(fileBuffer) {
        const results = [];
        const parser = getPdfParse2();
        if (parser) {
          try {
            console.log("[Enhanced Parser] Trying pdf-parse...");
            const pdfData = await parser(fileBuffer);
            const cleanText = this.cleanText(pdfData.text);
            if (cleanText.length > 100) {
              results.push({
                text: cleanText,
                confidence: this.calculateTextConfidence(cleanText),
                method: "pdf-parse"
              });
            }
          } catch (error) {
            console.log("[Enhanced Parser] pdf-parse failed:", error);
          }
        } else {
          console.log("[Enhanced Parser] pdf-parse not available, skipping primary strategy.");
        }
        if (parser) {
          try {
            console.log("[Enhanced Parser] Trying pdf-parse extraction...");
            const pdfParseText = await this.extractWithPdfParse(fileBuffer, parser);
            const cleanText = this.cleanText(pdfParseText);
            if (cleanText.length > 50) {
              results.push({
                text: cleanText,
                confidence: this.calculateTextConfidence(cleanText),
                method: "pdf-parse"
              });
            }
          } catch (error) {
            console.log("[Enhanced Parser] pdf-parse extraction failed:", error);
          }
        } else {
          console.log("[Enhanced Parser] pdf-parse not available, skipping secondary strategy.");
        }
        try {
          console.log("[Enhanced Parser] Trying fallback parser...");
          const fallbackResult = await resumeParserService.parseFile(fileBuffer, "application/pdf");
          const cleanText = this.cleanText(fallbackResult.text);
          if (cleanText.length > 50) {
            results.push({
              text: cleanText,
              confidence: this.calculateTextConfidence(cleanText),
              method: "fallback"
            });
          }
        } catch (error) {
          console.log("[Enhanced Parser] Fallback parser failed:", error);
        }
        if (results.length === 0) {
          throw new Error("\u6240\u6709PDF\u89E3\u6790\u7B56\u7565\u90FD\u5931\u8D25\u4E86");
        }
        results.sort((a, b) => b.confidence - a.confidence);
        const bestResult = results[0];
        console.log(`[Enhanced Parser] Best result: ${bestResult.method} (confidence: ${bestResult.confidence})`);
        return bestResult;
      }
      /**
       * 使用 pdf-parse 提取文本
       */
      async extractWithPdfParse(fileBuffer, parser) {
        try {
          const data = await parser(fileBuffer, {
            normalizeWhitespace: false,
            disableFontFace: false,
            useSystemFonts: true
          });
          return data.text;
        } catch (error) {
          console.log("[Enhanced Parser] pdf-parse extraction failed:", error);
          throw error;
        }
      }
      /**
       * 清理和标准化文本
       */
      cleanText(text2) {
        return text2.replace(/\s+/g, " ").replace(/[^\w\s\u4e00-\u9fff\u3400-\u4dbf\u20000-\u2a6df\u2a700-\u2b73f\u2b740-\u2b81f\u2b820-\u2ceaf\uf900-\ufaff\u3300-\u33ff\ufe30-\ufe4f\uf900-\ufaff\u2f800-\u2fa1f.,;:()\-@+]/g, " ").replace(/\n+/g, "\n").trim();
      }
      /**
       * 计算文本质量置信度
       */
      calculateTextConfidence(text2) {
        let confidence = 0;
        if (text2.length > 500) confidence += 30;
        else if (text2.length > 200) confidence += 20;
        else if (text2.length > 100) confidence += 10;
        const keywords = ["\u7ECF\u9A8C", "\u5DE5\u4F5C", "\u6559\u80B2", "\u6280\u80FD", "\u9879\u76EE", "experience", "education", "skills", "work"];
        const foundKeywords = keywords.filter(
          (keyword) => text2.toLowerCase().includes(keyword.toLowerCase())
        ).length;
        confidence += foundKeywords * 5;
        if (text2.includes("@")) confidence += 10;
        if (/\d{11}|\d{3}-\d{4}-\d{4}/.test(text2)) confidence += 10;
        if (/\d{4}[-年]\d{1,2}/.test(text2)) confidence += 10;
        const hasChinese = /[\u4e00-\u9fff]/.test(text2);
        const hasEnglish = /[a-zA-Z]/.test(text2);
        if (hasChinese && hasEnglish) confidence += 15;
        return Math.min(confidence, 100);
      }
      /**
       * 使用AI分析提取的文本
       */
      async analyzeWithAI(text2) {
        const prompt = `\u4F60\u662F\u4E00\u4E2A\u4E13\u4E1A\u7684HR\u7B80\u5386\u5206\u6790\u4E13\u5BB6\u3002\u8BF7\u4ED4\u7EC6\u5206\u6790\u4EE5\u4E0B\u7B80\u5386\u6587\u672C\uFF0C\u63D0\u53D6\u7ED3\u6784\u5316\u4FE1\u606F\u3002

\u7B80\u5386\u6587\u672C\uFF1A
${text2}

\u8BF7\u6309\u7167\u4EE5\u4E0BJSON\u683C\u5F0F\u8FD4\u56DE\u5206\u6790\u7ED3\u679C\uFF1A
{
  "summary": "\u7B80\u5386\u6982\u8981\uFF082-3\u53E5\u8BDD\uFF09",
  "skills": ["\u6280\u80FD1", "\u6280\u80FD2", "\u6280\u80FD3"],
  "experience": \u5DE5\u4F5C\u5E74\u9650\u6570\u5B57,
  "education": "\u6700\u9AD8\u5B66\u5386",
  "strengths": ["\u4F18\u52BF1", "\u4F18\u52BF2", "\u4F18\u52BF3"],
  "weaknesses": ["\u9700\u8981\u6539\u8FDB\u7684\u5730\u65B91", "\u9700\u8981\u6539\u8FDB\u7684\u5730\u65B92"],
  "recommendations": ["\u5EFA\u8BAE1", "\u5EFA\u8BAE2"],
  "workHistory": [
    {
      "company": "\u516C\u53F8\u540D\u79F0",
      "position": "\u804C\u4F4D",
      "duration": "\u65F6\u95F4\u6BB5",
      "responsibilities": ["\u804C\u8D231", "\u804C\u8D232"]
    }
  ],
  "projects": [
    {
      "name": "\u9879\u76EE\u540D\u79F0",
      "description": "\u9879\u76EE\u63CF\u8FF0",
      "technologies": ["\u6280\u672F1", "\u6280\u672F2"]
    }
  ],
  "certifications": ["\u8BC1\u4E661", "\u8BC1\u4E662"],
  "languages": [
    {
      "language": "\u8BED\u8A00\u540D\u79F0",
      "proficiency": "\u719F\u7EC3\u7A0B\u5EA6"
    }
  ],
  "confidence": 85
}

\u6CE8\u610F\uFF1A
1. \u5982\u679C\u67D0\u4E9B\u4FE1\u606F\u5728\u7B80\u5386\u4E2D\u6CA1\u6709\u660E\u786E\u63D0\u53CA\uFF0C\u8BF7\u5408\u7406\u63A8\u65AD\u6216\u6807\u8BB0\u4E3A"\u672A\u63D0\u53CA"
2. \u5DE5\u4F5C\u5E74\u9650\u8BF7\u6839\u636E\u5DE5\u4F5C\u7ECF\u5386\u8BA1\u7B97
3. confidence\u5B57\u6BB5\u8868\u793A\u5BF9\u5206\u6790\u7ED3\u679C\u7684\u7F6E\u4FE1\u5EA6(0-100)
4. \u6240\u6709\u6570\u7EC4\u5B57\u6BB5\u5373\u4F7F\u4E3A\u7A7A\u4E5F\u8981\u8FD4\u56DE\u7A7A\u6570\u7EC4[]
5. \u8BF7\u786E\u4FDD\u8FD4\u56DE\u7684\u662F\u6709\u6548\u7684JSON\u683C\u5F0F`;
        try {
          const response = await openai2.chat.completions.create({
            model: ANALYSIS_MODEL,
            messages: [
              {
                role: "system",
                content: "\u4F60\u662F\u4E00\u4E2A\u4E13\u4E1A\u7684HR\u7B80\u5386\u5206\u6790\u4E13\u5BB6\uFF0C\u64C5\u957F\u4ECE\u7B80\u5386\u6587\u672C\u4E2D\u63D0\u53D6\u7ED3\u6784\u5316\u4FE1\u606F\u3002\u8BF7\u59CB\u7EC8\u8FD4\u56DE\u6709\u6548\u7684JSON\u683C\u5F0F\u3002"
              },
              {
                role: "user",
                content: prompt
              }
            ],
            temperature: 0.3,
            max_tokens: 2e3
          });
          const content = response.choices[0]?.message?.content;
          if (!content) {
            throw new Error("AI\u5206\u6790\u8FD4\u56DE\u7A7A\u7ED3\u679C");
          }
          try {
            const analysis = JSON.parse(content);
            const requiredFields = ["summary", "skills", "experience", "education", "strengths", "weaknesses", "recommendations", "workHistory", "projects", "certifications", "languages"];
            for (const field of requiredFields) {
              if (!(field in analysis)) {
                analysis[field] = field === "experience" ? 0 : field === "summary" || field === "education" ? "\u672A\u63D0\u53CA" : [];
              }
            }
            if (!analysis.confidence) {
              analysis.confidence = 70;
            }
            return analysis;
          } catch (parseError) {
            console.error("[Enhanced Parser] JSON\u89E3\u6790\u5931\u8D25:", parseError);
            console.error("[Enhanced Parser] AI\u8FD4\u56DE\u5185\u5BB9:", content);
            return this.getDefaultAnalysis();
          }
        } catch (error) {
          console.error("[Enhanced Parser] AI\u5206\u6790\u5931\u8D25:", error);
          return this.getDefaultAnalysis();
        }
      }
      /**
       * 返回默认分析结果
       */
      getDefaultAnalysis() {
        return {
          summary: "\u7B80\u5386\u89E3\u6790\u5B8C\u6210\uFF0C\u4F46AI\u5206\u6790\u9047\u5230\u95EE\u9898",
          skills: [],
          experience: 0,
          education: "\u672A\u63D0\u53CA",
          strengths: [],
          weaknesses: ["\u9700\u8981\u66F4\u8BE6\u7EC6\u7684\u7B80\u5386\u4FE1\u606F"],
          recommendations: ["\u5EFA\u8BAE\u63D0\u4F9B\u66F4\u5B8C\u6574\u7684\u7B80\u5386\u4FE1\u606F"],
          workHistory: [],
          projects: [],
          certifications: [],
          languages: [],
          confidence: 30
        };
      }
      /**
       * 主要解析方法
       */
      async parse(fileBuffer, mimeType) {
        const startTime = Date.now();
        try {
          console.log("[Enhanced Parser] \u5F00\u59CB\u89E3\u6790\u7B80\u5386...");
          let extractedText;
          let confidence;
          let method;
          if (mimeType === "application/pdf") {
            const result = await this.extractTextFromPDF(fileBuffer);
            extractedText = result.text;
            confidence = result.confidence;
            method = result.method;
          } else {
            extractedText = fileBuffer.toString("utf-8");
            confidence = this.calculateTextConfidence(extractedText);
            method = "text";
          }
          console.log(`[Enhanced Parser] \u6587\u672C\u63D0\u53D6\u5B8C\u6210\uFF0C\u957F\u5EA6: ${extractedText.length}, \u7F6E\u4FE1\u5EA6: ${confidence}`);
          const analysis = await this.analyzeWithAI(extractedText);
          const processingTime = Date.now() - startTime;
          console.log(`[Enhanced Parser] \u89E3\u6790\u5B8C\u6210\uFF0C\u8017\u65F6: ${processingTime}ms`);
          return {
            text: extractedText,
            analysis,
            metadata: {
              parser: `enhanced-${method}`,
              confidence,
              processingTime
            }
          };
        } catch (error) {
          console.error("[Enhanced Parser] \u89E3\u6790\u5931\u8D25:", error);
          try {
            const fallbackResult = await resumeParserService.parseFile(fileBuffer, mimeType);
            const analysis = await this.analyzeWithAI(fallbackResult.text);
            return {
              text: fallbackResult.text,
              analysis,
              metadata: {
                parser: "enhanced-fallback",
                confidence: 50,
                processingTime: Date.now() - startTime
              }
            };
          } catch (fallbackError) {
            console.error("[Enhanced Parser] \u540E\u5907\u89E3\u6790\u4E5F\u5931\u8D25:", fallbackError);
            throw new Error(`\u7B80\u5386\u89E3\u6790\u5931\u8D25: ${error.message}`);
          }
        }
      }
    };
    enhancedResumeParser = new EnhancedResumeParser();
  }
});

// server/services/targetedResumeAnalyzer.ts
import OpenAI3 from "openai";
var openai3, ANALYSIS_MODEL2, TargetedResumeAnalyzer, targetedResumeAnalyzer;
var init_targetedResumeAnalyzer = __esm({
  "server/services/targetedResumeAnalyzer.ts"() {
    "use strict";
    init_resumeParserEnhanced();
    openai3 = new OpenAI3({
      apiKey: process.env.OPENROUTER_API_KEY || "",
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://hr-recruit-system.vercel.app",
        "X-Title": "AI Recruit System"
      }
    });
    ANALYSIS_MODEL2 = process.env.TARGETED_ANALYSIS_MODEL || "openai/gpt-5";
    TargetedResumeAnalyzer = class {
      /**
       * 根据岗位需求进行针对性的简历分析
       */
      async analyzeForPosition(fileBuffer, mimeType, jobContext) {
        const resumeData = await enhancedResumeParser.parse(fileBuffer, mimeType);
        const analysisPrompt = this.buildTargetedPrompt(jobContext);
        const response = await openai3.chat.completions.create({
          model: ANALYSIS_MODEL2,
          messages: [
            {
              role: "system",
              content: analysisPrompt
            },
            {
              role: "user",
              content: `
\u8BF7\u5BF9\u4EE5\u4E0B\u7B80\u5386\u8FDB\u884C\u6DF1\u5EA6\u5206\u6790\uFF1A

=== \u5C97\u4F4D\u4FE1\u606F ===
\u804C\u4F4D\uFF1A${jobContext.title}
\u63CF\u8FF0\uFF1A${jobContext.description}
\u8981\u6C42\uFF1A${jobContext.requirements.join(", ")}
${jobContext.focusAreas ? `\u91CD\u70B9\u5173\u6CE8\uFF1A${jobContext.focusAreas.join(", ")}` : ""}

=== \u7B80\u5386\u5185\u5BB9 ===
${JSON.stringify(resumeData.analysis, null, 2)}

\u8BF7\u63D0\u4F9B\u5168\u9762\u7684\u9488\u5BF9\u6027\u5206\u6790\uFF0C\u7279\u522B\u5173\u6CE8\uFF1A
1. \u4E0E\u5C97\u4F4D\u8981\u6C42\u7684\u7CBE\u786E\u5339\u914D\u5EA6
2. \u6F5C\u5728\u7684\u4EF7\u503C\u548C\u672A\u88AB\u660E\u786E\u63D0\u53CA\u7684\u4F18\u52BF
3. \u53EF\u80FD\u7684\u98CE\u9669\u70B9\u548C\u9700\u8981\u9A8C\u8BC1\u7684\u5185\u5BB9
4. \u4E3A\u9762\u8BD5\u5B98\u63D0\u4F9B\u6709\u4EF7\u503C\u7684\u6D1E\u5BDF\u548C\u5EFA\u8BAE
`
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
          max_tokens: 8e3
        });
        const content = response.choices[0].message.content;
        if (!content) {
          throw new Error("No response from AI analysis");
        }
        return JSON.parse(content);
      }
      /**
       * 构建智能分析的提示词
       */
      buildTargetedPrompt(jobContext) {
        return `\u4F60\u662F\u4E00\u4F4D\u7ECF\u9A8C\u4E30\u5BCC\u7684\u8D44\u6DF1\u62DB\u8058\u4E13\u5BB6\u548C\u4EBA\u624D\u8BC4\u4F30\u987E\u95EE\uFF0C\u62E5\u670920\u5E74\u7684\u62DB\u8058\u7ECF\u9A8C\uFF0C\u64C5\u957F\u6DF1\u5EA6\u4EBA\u624D\u5206\u6790\u3002

\u4F60\u7684\u4EFB\u52A1\u662F\u6839\u636E\u7279\u5B9A\u5C97\u4F4D\u9700\u6C42\uFF0C\u5BF9\u5019\u9009\u4EBA\u7B80\u5386\u8FDB\u884C\u5168\u65B9\u4F4D\u7684\u6DF1\u5EA6\u5206\u6790\u3002

\u5206\u6790\u539F\u5219\uFF1A
1. **\u7CBE\u51C6\u5339\u914D**\uFF1A\u51C6\u786E\u8BC4\u4F30\u5019\u9009\u4EBA\u4E0E\u5C97\u4F4D\u8981\u6C42\u7684\u5339\u914D\u7A0B\u5EA6
2. **\u6DF1\u5EA6\u6316\u6398**\uFF1A\u53D1\u73B0\u7B80\u5386\u4E2D\u9690\u542B\u7684\u4EF7\u503C\u70B9\u548C\u6F5C\u529B
3. **\u98CE\u9669\u8BC6\u522B**\uFF1A\u8BC6\u522B\u6F5C\u5728\u98CE\u9669\u548C\u9700\u8981\u9A8C\u8BC1\u7684\u4FE1\u606F
4. **\u5B9E\u7528\u5EFA\u8BAE**\uFF1A\u4E3A\u9762\u8BD5\u5B98\u63D0\u4F9B\u5B9E\u7528\u7684\u9762\u8BD5\u7B56\u7565\u548C\u95EE\u9898

\u5206\u6790\u7EF4\u5EA6\uFF1A

\u4E00\u3001\u5C97\u4F4D\u5339\u914D\u5EA6\u5206\u6790
- \u9010\u6761\u5BF9\u6BD4\u5C97\u4F4D\u8981\u6C42\uFF0C\u627E\u51FA\u5339\u914D\u8BC1\u636E
- \u8BC6\u522B\u7F3A\u5931\u7684\u5173\u952E\u80FD\u529B
- \u53D1\u73B0\u8D85\u51FA\u9884\u671F\u7684\u9644\u52A0\u4EF7\u503C

\u4E8C\u3001\u7ECF\u9A8C\u6DF1\u5EA6\u8BC4\u4F30
- \u76F8\u5173\u5DE5\u4F5C\u7ECF\u9A8C\u7684\u8D28\u91CF\u548C\u6DF1\u5EA6
- \u884C\u4E1A\u80CC\u666F\u7684\u5339\u914D\u5EA6
- \u804C\u4E1A\u53D1\u5C55\u8F68\u8FF9\u7684\u5408\u7406\u6027
- \u7BA1\u7406\u7ECF\u9A8C\u548C\u56E2\u961F\u89C4\u6A21

\u4E09\u3001\u6280\u80FD\u7ACB\u4F53\u8BC4\u4F30
- \u6280\u672F\u6280\u80FD\u7684\u5B9E\u9645\u638C\u63E1\u7A0B\u5EA6\uFF08\u901A\u8FC7\u9879\u76EE\u9A8C\u8BC1\uFF09
- \u8F6F\u6280\u80FD\u7684\u8BC1\u636E\u652F\u6491
- \u5B66\u4E60\u80FD\u529B\u548C\u9002\u5E94\u80FD\u529B
- \u6280\u80FD\u7684\u65F6\u6548\u6027\u548C\u5148\u8FDB\u6027

\u56DB\u3001\u9879\u76EE\u6210\u5C31\u6316\u6398
- \u91CF\u5316\u7684\u4E1A\u7EE9\u6210\u679C
- \u9879\u76EE\u7684\u590D\u6742\u5EA6\u548C\u5F71\u54CD\u529B
- \u5728\u9879\u76EE\u4E2D\u7684\u5B9E\u9645\u89D2\u8272\u548C\u8D21\u732E
- \u53EF\u8FC1\u79FB\u5230\u65B0\u5C97\u4F4D\u7684\u7ECF\u9A8C

\u4E94\u3001\u6587\u5316\u5951\u5408\u5EA6
- \u4EF7\u503C\u89C2\u7684\u4E00\u81F4\u6027
- \u5DE5\u4F5C\u98CE\u683C\u548C\u56E2\u961F\u534F\u4F5C
- \u7A33\u5B9A\u6027\u548C\u5FE0\u8BDA\u5EA6\u6307\u6807
- \u804C\u4E1A\u52A8\u673A\u548C\u53D1\u5C55\u8BC9\u6C42

\u516D\u3001\u6F5C\u529B\u4E0E\u98CE\u9669
- \u6210\u957F\u6F5C\u529B\u548C\u53D1\u5C55\u7A7A\u95F4
- \u53EF\u80FD\u7684\u79BB\u804C\u98CE\u9669\u56E0\u7D20
- \u8FC7\u5EA6\u8D44\u5386\u6216\u8D44\u5386\u4E0D\u8DB3
- \u9700\u8981\u6DF1\u5165\u9A8C\u8BC1\u7684\u7591\u70B9

\u4E03\u3001\u9762\u8BD5\u7B56\u7565\u5EFA\u8BAE
- \u91CD\u70B9\u8003\u5BDF\u9886\u57DF
- STAR \u884C\u4E3A\u9762\u8BD5\u95EE\u9898
- \u6280\u672F\u80FD\u529B\u9A8C\u8BC1\u65B9\u6848
- \u538B\u529B\u6D4B\u8BD5\u548C\u60C5\u666F\u6A21\u62DF

\u516B\u3001\u5173\u952E\u6D1E\u5BDF
- \u5019\u9009\u4EBA\u7684\u72EC\u7279\u7ADE\u4E89\u4F18\u52BF
- \u5BB9\u6613\u88AB\u5FFD\u89C6\u7684\u4EAE\u70B9
- \u5FEB\u901F\u521B\u9020\u4EF7\u503C\u7684\u9886\u57DF
- \u957F\u671F\u4EF7\u503C\u8D21\u732E\u6F5C\u529B

${jobContext.focusAreas ? `
\u7279\u522B\u5173\u6CE8\u9886\u57DF\uFF1A
${jobContext.focusAreas.map((area) => `- ${area}`).join("\n")}
` : ""}

${jobContext.companyValues ? `
\u516C\u53F8\u4EF7\u503C\u89C2\u5339\u914D\uFF1A
${jobContext.companyValues.map((value) => `- ${value}`).join("\n")}
` : ""}

\u8F93\u51FA\u683C\u5F0F\uFF1A
\u8FD4\u56DE\u8BE6\u7EC6\u7684 JSON \u683C\u5F0F\u5206\u6790\u7ED3\u679C\uFF0C\u5305\u542B\u6240\u6709\u4E0A\u8FF0\u7EF4\u5EA6\u7684\u6DF1\u5EA6\u5206\u6790\u3002\u786E\u4FDD\u6BCF\u4E2A\u5206\u6790\u70B9\u90FD\u6709\u5177\u4F53\u7684\u8BC1\u636E\u652F\u6491\uFF0C\u907F\u514D\u7A7A\u6CDB\u7684\u8BC4\u4EF7\u3002

\u91CD\u8981\u63D0\u793A\uFF1A
- \u4FDD\u6301\u5BA2\u89C2\u548C\u4E13\u4E1A\uFF0C\u65E2\u8981\u53D1\u73B0\u4EAE\u70B9\uFF0C\u4E5F\u8981\u8BC6\u522B\u98CE\u9669
- \u6240\u6709\u8BC4\u4F30\u90FD\u8981\u57FA\u4E8E\u7B80\u5386\u4E2D\u7684\u5177\u4F53\u4FE1\u606F\uFF0C\u4E0D\u8981\u8FC7\u5EA6\u63A8\u6D4B
- \u4E3A\u9762\u8BD5\u5B98\u63D0\u4F9B\u53EF\u64CD\u4F5C\u7684\u5EFA\u8BAE\uFF0C\u800C\u4E0D\u4EC5\u4EC5\u662F\u63CF\u8FF0
- \u7528\u4E2D\u6587\u8F93\u51FA\uFF0C\u4F46\u4FDD\u7559\u539F\u59CB\u7684\u82F1\u6587\u672F\u8BED\u548C\u540D\u79F0`;
      }
      /**
       * 生成面试官参考报告
       */
      generateInterviewerBrief(analysis) {
        return `
# \u5019\u9009\u4EBA\u9762\u8BD5\u7B80\u62A5

## \u{1F464} \u57FA\u672C\u4FE1\u606F
- **\u59D3\u540D**: ${analysis.basicInfo.name}
- **\u8054\u7CFB\u65B9\u5F0F**: ${analysis.basicInfo.contact.email || "\u672A\u63D0\u4F9B"}
- **\u603B\u4F53\u5339\u914D\u5EA6**: ${analysis.jobFitAnalysis.overallScore}/100

## \u{1F3AF} \u6838\u5FC3\u4F18\u52BF
${analysis.keyInsights.uniqueSellingPoints.map((point) => `- ${point}`).join("\n")}

## \u26A0\uFE0F \u91CD\u70B9\u5173\u6CE8
${analysis.risksAndConcerns.redFlags.map((flag) => `- ${flag.concern} (${flag.severity})`).join("\n")}

## \u{1F4A1} \u9762\u8BD5\u91CD\u70B9
${analysis.interviewRecommendations.focusAreas.map((area) => `- ${area}`).join("\n")}

## \u2753 \u5EFA\u8BAE\u95EE\u9898
${analysis.interviewRecommendations.suggestedQuestions.slice(0, 5).map(
          (q) => `**${q.category}**: ${q.question}`
        ).join("\n\n")}

## \u{1F4CA} \u5FEB\u901F\u53C2\u8003
- **\u76F8\u5173\u7ECF\u9A8C**: ${analysis.experienceAnalysis.totalRelevantYears} \u5E74
- **\u6280\u80FD\u5339\u914D**: ${analysis.jobFitAnalysis.matchedRequirements.length}/${analysis.jobFitAnalysis.matchedRequirements.length + analysis.jobFitAnalysis.missingRequirements.length} \u9879
- **\u6210\u957F\u6F5C\u529B**: ${analysis.growthPotential.learningAgility}
- **\u6587\u5316\u5951\u5408**: ${analysis.culturalFit.alignedValues.join(", ")}
`;
      }
      /**
       * 批量分析多份简历并排序
       */
      async rankCandidates(resumes, jobContext) {
        const analyses = await Promise.all(
          resumes.map(async (resume) => {
            const analysis = await this.analyzeForPosition(
              resume.fileBuffer,
              resume.mimeType,
              jobContext
            );
            return {
              candidateId: resume.candidateId,
              score: analysis.jobFitAnalysis.overallScore,
              analysis
            };
          })
        );
        return analyses.sort((a, b) => b.score - a.score);
      }
    };
    targetedResumeAnalyzer = new TargetedResumeAnalyzer();
  }
});

// server/services/matchingService.ts
var MatchingService, matchingService;
var init_matchingService = __esm({
  "server/services/matchingService.ts"() {
    "use strict";
    init_aiService();
    init_storage();
    MatchingService = class {
      async findMatchingCandidates(job, candidates2) {
        const matches = [];
        for (const candidate of candidates2) {
          try {
            const matchResult = await aiService.matchCandidateToJob(
              {
                skills: candidate.skills || [],
                experience: candidate.experience || 0,
                education: candidate.education || "",
                position: candidate.position || ""
              },
              {
                title: job.title,
                requirements: job.requirements || [],
                description: job.description
              }
            );
            storage.createAiConversation({
              userId: "system",
              sessionId: `batch-match-${job.id}`,
              message: `Match candidate ${candidate.name} to job ${job.title}`,
              response: JSON.stringify(matchResult.match),
              modelUsed: matchResult.model,
              tokensUsed: matchResult.usage.totalTokens
            }).catch((error) => {
              console.error("[Token Tracking] Failed to record batch matching token usage:", error);
            });
            matches.push({
              candidate,
              matchScore: matchResult.match.score,
              reasons: matchResult.match.reasons,
              explanation: matchResult.match.explanation
            });
          } catch (error) {
            console.error(`Error matching candidate ${candidate.id} to job ${job.id}:`, error);
          }
        }
        return matches.sort((a, b) => b.matchScore - a.matchScore);
      }
      async findMatchingJobs(candidate, jobs2) {
        const matches = [];
        for (const job of jobs2) {
          try {
            const matchResult = await aiService.matchCandidateToJob(
              {
                skills: candidate.skills || [],
                experience: candidate.experience || 0,
                education: candidate.education || "",
                position: candidate.position || ""
              },
              {
                title: job.title,
                requirements: job.requirements || [],
                description: job.description
              }
            );
            storage.createAiConversation({
              userId: "system",
              sessionId: `find-jobs-${candidate.id}`,
              message: `Match job ${job.title} to candidate ${candidate.name}`,
              response: JSON.stringify(matchResult.match),
              modelUsed: matchResult.model,
              tokensUsed: matchResult.usage.totalTokens
            }).catch((error) => {
              console.error("[Token Tracking] Failed to record job matching token usage:", error);
            });
            matches.push({
              candidate,
              matchScore: matchResult.match.score,
              reasons: matchResult.match.reasons,
              explanation: matchResult.match.explanation
            });
          } catch (error) {
            console.error(`Error matching job ${job.id} to candidate ${candidate.id}:`, error);
          }
        }
        return matches.sort((a, b) => b.matchScore - a.matchScore);
      }
      calculateBasicMatch(candidate, job) {
        let score = 0;
        const candidateSkills = candidate.skills || [];
        const jobRequirements = job.requirements || [];
        const skillMatches = candidateSkills.filter(
          (skill) => jobRequirements.some(
            (req) => req.toLowerCase().includes(skill.toLowerCase()) || skill.toLowerCase().includes(req.toLowerCase())
          )
        ).length;
        const skillScore = jobRequirements.length > 0 ? skillMatches / jobRequirements.length * 40 : 0;
        score += skillScore;
        const candidateExp = candidate.experience || 0;
        const expectedExp = this.extractExperienceFromRequirements(jobRequirements);
        if (expectedExp > 0) {
          const expRatio = Math.min(candidateExp / expectedExp, 1);
          score += expRatio * 30;
        } else {
          score += 20;
        }
        if (candidate.location && job.location) {
          const locationMatch = candidate.location.toLowerCase().includes(job.location.toLowerCase()) || job.location.toLowerCase().includes("remote") || candidate.location.toLowerCase().includes("remote");
          if (locationMatch) score += 20;
        } else {
          score += 10;
        }
        if (candidate.salaryExpectation && job.salaryMin && job.salaryMax) {
          const salaryMatch = candidate.salaryExpectation >= job.salaryMin && candidate.salaryExpectation <= job.salaryMax;
          if (salaryMatch) score += 10;
        } else {
          score += 5;
        }
        return Math.round(Math.min(score, 100));
      }
      extractExperienceFromRequirements(requirements) {
        for (const req of requirements) {
          const match = req.match(/(\d+)\+?\s*years?/i);
          if (match) {
            return parseInt(match[1], 10);
          }
        }
        return 0;
      }
    };
    matchingService = new MatchingService();
  }
});

// server/services/promptTemplates.ts
import { randomUUID as randomUUID2 } from "crypto";
var PromptTemplateService, promptTemplateService;
var init_promptTemplates = __esm({
  "server/services/promptTemplates.ts"() {
    "use strict";
    PromptTemplateService = class {
      constructor() {
        this.templates = /* @__PURE__ */ new Map();
        this.initializeDefaultTemplates();
      }
      initializeDefaultTemplates() {
        const defaultTemplates = [
          {
            name: "Resume Analysis",
            description: "Comprehensive resume analysis with skills extraction",
            category: "resume_analysis",
            template: `You are an expert HR recruiter and resume analyst. Analyze the provided resume and extract structured information. Return the analysis as JSON with the following structure:
{
  "summary": "Brief professional summary",
  "skills": ["skill1", "skill2"],
  "experience": 5,
  "education": "Education details",
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "recommendations": ["recommendation1", "recommendation2"]
}

Resume content:
{{resumeText}}`,
            variables: ["resumeText"],
            isActive: true
          },
          {
            name: "Job Matching",
            description: "Match candidates to job positions with scoring",
            category: "job_matching",
            template: `You are an expert HR recruiter. Analyze how well a candidate matches a job position. Return the analysis as JSON with this structure:
{
  "score": 85,
  "reasons": ["reason1", "reason2"],
  "explanation": "Detailed explanation of the match"
}
Score should be 0-100. Include specific reasons for the match score.

Candidate Profile:
- Position: {{candidatePosition}}
- Skills: {{candidateSkills}}
- Experience: {{candidateExperience}} years
- Education: {{candidateEducation}}

Job Requirements:
- Title: {{jobTitle}}
- Requirements: {{jobRequirements}}
- Description: {{jobDescription}}

Please analyze the match between this candidate and job position.`,
            variables: ["candidatePosition", "candidateSkills", "candidateExperience", "candidateEducation", "jobTitle", "jobRequirements", "jobDescription"],
            isActive: true
          },
          {
            name: "Interview Questions Generator",
            description: "Generate relevant interview questions for specific roles",
            category: "interview_questions",
            template: `You are an expert HR recruiter. Generate relevant interview questions for a specific job position. Return the questions as JSON array:
{
  "questions": ["question1", "question2", "question3"]
}
Generate 5-8 thoughtful questions that assess both technical skills and cultural fit.

Job Title: {{jobTitle}}
Requirements: {{jobRequirements}}
Experience Level: {{experienceLevel}}`,
            variables: ["jobTitle", "jobRequirements", "experienceLevel"],
            isActive: true
          },
          {
            name: "Candidate Screening",
            description: "Initial candidate screening based on basic criteria",
            category: "candidate_screening",
            template: `You are an HR screening specialist. Evaluate if a candidate meets the basic requirements for a position. Return evaluation as JSON:
{
  "passed": true,
  "score": 75,
  "feedback": "Detailed feedback about the candidate",
  "missingRequirements": ["requirement1", "requirement2"],
  "recommendations": ["recommendation1", "recommendation2"]
}

Candidate Information:
- Resume: {{resumeText}}
- Target Position: {{targetPosition}}
- Minimum Requirements: {{minimumRequirements}}

Please evaluate if this candidate should proceed to the next stage.`,
            variables: ["resumeText", "targetPosition", "minimumRequirements"],
            isActive: true
          },
          {
            name: "General HR Assistant",
            description: "General HR and recruitment advice",
            category: "general",
            template: `You are an AI assistant specialized in HR and recruitment. You help HR managers with:
- Candidate evaluation and analysis
- Interview preparation and questions
- Job posting optimization
- Recruitment strategy advice
- Data interpretation and insights

Be helpful, professional, and provide actionable advice.

User Query: {{userQuery}}
Context: {{context}}`,
            variables: ["userQuery", "context"],
            isActive: true
          }
        ];
        defaultTemplates.forEach((template) => {
          this.createTemplate(template);
        });
      }
      async getTemplates() {
        return Array.from(this.templates.values());
      }
      async getTemplate(id) {
        return this.templates.get(id);
      }
      async getTemplatesByCategory(category) {
        return Array.from(this.templates.values()).filter((t) => t.category === category);
      }
      async createTemplate(template) {
        const newTemplate = {
          ...template,
          id: randomUUID2(),
          isActive: template.isActive ?? true,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        };
        this.templates.set(newTemplate.id, newTemplate);
        return newTemplate;
      }
      async updateTemplate(id, updates) {
        const template = this.templates.get(id);
        if (!template) return void 0;
        const updatedTemplate = {
          ...template,
          ...updates,
          updatedAt: /* @__PURE__ */ new Date()
        };
        this.templates.set(id, updatedTemplate);
        return updatedTemplate;
      }
      async deleteTemplate(id) {
        return this.templates.delete(id);
      }
      async renderTemplate(templateId, variables) {
        const template = this.templates.get(templateId);
        if (!template) {
          throw new Error("Template not found");
        }
        let rendered = template.template;
        template.variables.forEach((variable) => {
          const value = variables[variable] || "";
          const regex = new RegExp(`{{${variable}}}`, "g");
          rendered = rendered.replace(regex, String(value));
        });
        return rendered;
      }
      extractVariables(template) {
        const regex = /{{([^}]+)}}/g;
        const variables = [];
        let match;
        while ((match = regex.exec(template)) !== null) {
          const variable = match[1].trim();
          if (!variables.includes(variable)) {
            variables.push(variable);
          }
        }
        return variables;
      }
    };
    promptTemplateService = new PromptTemplateService();
  }
});

// server/services/organizationalFitService.ts
import OpenAI4 from "openai";
var openai4, ASSESSMENT_MODEL, OrganizationalFitService, organizationalFitService;
var init_organizationalFitService = __esm({
  "server/services/organizationalFitService.ts"() {
    "use strict";
    openai4 = new OpenAI4({
      apiKey: process.env.OPENROUTER_API_KEY || "",
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://hr-recruit-system.vercel.app",
        "X-Title": "AI Recruit System"
      }
    });
    ASSESSMENT_MODEL = process.env.CULTURAL_ASSESSMENT_MODEL || "openai/gpt-5";
    OrganizationalFitService = class {
      constructor() {
        this.cultureValues = [];
        this.leadershipFramework = [];
        this.loadConfiguration();
      }
      /**
       * 加载公司文化和领导力框架配置
       */
      async loadConfiguration() {
        this.cultureValues = [
          {
            name: "\u521B\u65B0\u9A71\u52A8",
            description: "\u52C7\u4E8E\u5C1D\u8BD5\u65B0\u65B9\u6CD5\uFF0C\u6301\u7EED\u6539\u8FDB\u548C\u521B\u9020\u4EF7\u503C",
            behaviors: [
              "\u4E3B\u52A8\u63D0\u51FA\u6539\u8FDB\u5EFA\u8BAE",
              "\u613F\u610F\u5C1D\u8BD5\u65B0\u6280\u672F\u548C\u65B9\u6CD5",
              "\u4ECE\u5931\u8D25\u4E2D\u5B66\u4E60",
              "\u6311\u6218\u73B0\u72B6"
            ],
            antiPatterns: [
              "\u58A8\u5B88\u6210\u89C4",
              "\u62B5\u5236\u53D8\u5316",
              "\u4E0D\u613F\u627F\u62C5\u98CE\u9669"
            ],
            interviewQuestions: [
              "\u8BF7\u5206\u4EAB\u4E00\u4E2A\u60A8\u63A8\u52A8\u521B\u65B0\u6216\u6539\u53D8\u7684\u4F8B\u5B50",
              "\u60A8\u5982\u4F55\u770B\u5F85\u5931\u8D25\uFF1F\u80FD\u5206\u4EAB\u4E00\u4E2A\u5931\u8D25\u7ECF\u5386\u5417\uFF1F"
            ],
            weight: 0.25
          },
          {
            name: "\u5BA2\u6237\u81F3\u4E0A",
            description: "\u4EE5\u5BA2\u6237\u9700\u6C42\u4E3A\u4E2D\u5FC3\uFF0C\u63D0\u4F9B\u5353\u8D8A\u670D\u52A1",
            behaviors: [
              "\u6DF1\u5165\u7406\u89E3\u5BA2\u6237\u9700\u6C42",
              "\u4E3B\u52A8\u89E3\u51B3\u5BA2\u6237\u95EE\u9898",
              "\u6301\u7EED\u6539\u5584\u5BA2\u6237\u4F53\u9A8C"
            ],
            antiPatterns: [
              "\u5FFD\u89C6\u5BA2\u6237\u53CD\u9988",
              "\u63A8\u5378\u8D23\u4EFB",
              "\u53EA\u5173\u6CE8\u77ED\u671F\u5229\u76CA"
            ],
            interviewQuestions: [
              "\u8BF7\u63CF\u8FF0\u4E00\u6B21\u60A8\u8D85\u8D8A\u5BA2\u6237\u671F\u671B\u7684\u7ECF\u5386",
              "\u5982\u4F55\u5E73\u8861\u5BA2\u6237\u9700\u6C42\u548C\u516C\u53F8\u5229\u76CA\uFF1F"
            ],
            weight: 0.25
          },
          {
            name: "\u56E2\u961F\u534F\u4F5C",
            description: "\u5F00\u653E\u6C9F\u901A\uFF0C\u76F8\u4E92\u652F\u6301\uFF0C\u5171\u540C\u6210\u957F",
            behaviors: [
              "\u79EF\u6781\u5206\u4EAB\u77E5\u8BC6",
              "\u4E3B\u52A8\u5E2E\u52A9\u540C\u4E8B",
              "\u5EFA\u8BBE\u6027\u5730\u63D0\u51FA\u53CD\u9988",
              "\u5C0A\u91CD\u4E0D\u540C\u610F\u89C1"
            ],
            antiPatterns: [
              "\u4FE1\u606F\u5B64\u5C9B",
              "\u63A8\u8BFF\u8D23\u4EFB",
              "\u6076\u6027\u7ADE\u4E89"
            ],
            interviewQuestions: [
              "\u8BF7\u5206\u4EAB\u4E00\u4E2A\u56E2\u961F\u5408\u4F5C\u7684\u6210\u529F\u6848\u4F8B",
              "\u5982\u4F55\u5904\u7406\u56E2\u961F\u4E2D\u7684\u51B2\u7A81\uFF1F"
            ],
            weight: 0.25
          },
          {
            name: "\u7ED3\u679C\u5BFC\u5411",
            description: "\u8BBE\u5B9A\u9AD8\u6807\u51C6\uFF0C\u4E13\u6CE8\u6267\u884C\uFF0C\u4EA4\u4ED8\u6210\u679C",
            behaviors: [
              "\u8BBE\u5B9A\u660E\u786E\u76EE\u6807",
              "\u6301\u7EED\u8DDF\u8E2A\u8FDB\u5EA6",
              "\u5BF9\u7ED3\u679C\u8D1F\u8D23",
              "\u8FFD\u6C42\u5353\u8D8A"
            ],
            antiPatterns: [
              "\u7F3A\u4E4F\u8D23\u4EFB\u5FC3",
              "\u8FC7\u7A0B\u5BFC\u5411\u800C\u5FFD\u89C6\u7ED3\u679C",
              "\u6EE1\u8DB3\u4E8E\u5E73\u5EB8"
            ],
            interviewQuestions: [
              "\u5982\u4F55\u786E\u4FDD\u9879\u76EE\u6309\u65F6\u4EA4\u4ED8\uFF1F",
              "\u8BF7\u5206\u4EAB\u4E00\u4E2A\u60A8\u514B\u670D\u56F0\u96BE\u8FBE\u6210\u76EE\u6807\u7684\u7ECF\u5386"
            ],
            weight: 0.25
          }
        ];
        this.leadershipFramework = [
          {
            name: "\u6218\u7565\u601D\u7EF4",
            level: "organizational",
            description: "\u80FD\u591F\u770B\u5230\u5168\u5C40\uFF0C\u5236\u5B9A\u957F\u8FDC\u89C4\u5212",
            competencies: [
              {
                name: "\u613F\u666F\u89C4\u5212",
                description: "\u5236\u5B9A\u6E05\u6670\u7684\u613F\u666F\u548C\u6218\u7565",
                behavioralIndicators: [
                  "\u80FD\u591F\u63CF\u7ED8\u672A\u6765\u56FE\u666F",
                  "\u5C06\u613F\u666F\u8F6C\u5316\u4E3A\u884C\u52A8\u8BA1\u5212",
                  "\u6FC0\u53D1\u4ED6\u4EBA\u8BA4\u540C\u548C\u8FFD\u968F"
                ]
              },
              {
                name: "\u7CFB\u7EDF\u601D\u8003",
                description: "\u7406\u89E3\u590D\u6742\u7CFB\u7EDF\u7684\u76F8\u4E92\u5173\u7CFB",
                behavioralIndicators: [
                  "\u8BC6\u522B\u95EE\u9898\u6839\u56E0",
                  "\u9884\u89C1\u51B3\u7B56\u7684\u8FDE\u9501\u53CD\u5E94",
                  "\u5E73\u8861\u77ED\u671F\u548C\u957F\u671F\u5229\u76CA"
                ]
              }
            ],
            assessmentCriteria: [
              "\u80FD\u5426\u63D0\u51FA\u6218\u7565\u6027\u89C1\u89E3",
              "\u662F\u5426\u8003\u8651\u591A\u65B9\u5229\u76CA\u76F8\u5173\u8005",
              "\u51B3\u7B56\u7684\u524D\u77BB\u6027"
            ],
            developmentSuggestions: [
              "\u53C2\u4E0E\u6218\u7565\u89C4\u5212\u9879\u76EE",
              "\u5B66\u4E60\u884C\u4E1A\u8D8B\u52BF\u5206\u6790",
              "\u57F9\u517B\u5168\u5C40\u89C2"
            ],
            weight: 0.2
          },
          {
            name: "\u56E2\u961F\u9886\u5BFC",
            level: "team",
            description: "\u5EFA\u8BBE\u548C\u9886\u5BFC\u9AD8\u6548\u56E2\u961F",
            competencies: [
              {
                name: "\u56E2\u961F\u5EFA\u8BBE",
                description: "\u6253\u9020\u9AD8\u7EE9\u6548\u56E2\u961F",
                behavioralIndicators: [
                  "\u8BC6\u522B\u548C\u57F9\u517B\u4EBA\u624D",
                  "\u5EFA\u7ACB\u56E2\u961F\u6587\u5316",
                  "\u4FC3\u8FDB\u56E2\u961F\u534F\u4F5C"
                ]
              },
              {
                name: "\u8F85\u5BFC\u53D1\u5C55",
                description: "\u5E2E\u52A9\u56E2\u961F\u6210\u5458\u6210\u957F",
                behavioralIndicators: [
                  "\u63D0\u4F9B\u5EFA\u8BBE\u6027\u53CD\u9988",
                  "\u5236\u5B9A\u53D1\u5C55\u8BA1\u5212",
                  "\u6388\u6743\u548C\u8D4B\u80FD"
                ]
              }
            ],
            assessmentCriteria: [
              "\u56E2\u961F\u7EE9\u6548\u8868\u73B0",
              "\u56E2\u961F\u6210\u5458\u53D1\u5C55",
              "\u56E2\u961F\u6C1B\u56F4\u548C\u51DD\u805A\u529B"
            ],
            developmentSuggestions: [
              "\u5B66\u4E60\u6559\u7EC3\u6280\u672F",
              "\u53C2\u52A0\u9886\u5BFC\u529B\u57F9\u8BAD",
              "\u5B9E\u8DF5\u56E2\u961F\u7BA1\u7406"
            ],
            weight: 0.3
          },
          {
            name: "\u6267\u884C\u529B",
            level: "individual",
            description: "\u63A8\u52A8\u8BA1\u5212\u843D\u5730\uFF0C\u8FBE\u6210\u76EE\u6807",
            competencies: [
              {
                name: "\u76EE\u6807\u7BA1\u7406",
                description: "\u8BBE\u5B9A\u548C\u8FBE\u6210\u76EE\u6807",
                behavioralIndicators: [
                  "\u5236\u5B9ASMART\u76EE\u6807",
                  "\u6709\u6548\u5206\u89E3\u4EFB\u52A1",
                  "\u6301\u7EED\u8DDF\u8E2A\u8FDB\u5EA6"
                ]
              },
              {
                name: "\u95EE\u9898\u89E3\u51B3",
                description: "\u8BC6\u522B\u548C\u89E3\u51B3\u95EE\u9898",
                behavioralIndicators: [
                  "\u5FEB\u901F\u5B9A\u4F4D\u95EE\u9898",
                  "\u63D0\u51FA\u89E3\u51B3\u65B9\u6848",
                  "\u63A8\u52A8\u65B9\u6848\u5B9E\u65BD"
                ]
              }
            ],
            assessmentCriteria: [
              "\u76EE\u6807\u8FBE\u6210\u7387",
              "\u6267\u884C\u6548\u7387",
              "\u95EE\u9898\u89E3\u51B3\u80FD\u529B"
            ],
            developmentSuggestions: [
              "\u5B66\u4E60\u9879\u76EE\u7BA1\u7406",
              "\u63D0\u5347\u65F6\u95F4\u7BA1\u7406\u80FD\u529B",
              "\u57F9\u517B\u51B3\u7B56\u80FD\u529B"
            ],
            weight: 0.3
          },
          {
            name: "\u5F71\u54CD\u529B",
            level: "individual",
            description: "\u5F71\u54CD\u548C\u8BF4\u670D\u4ED6\u4EBA",
            competencies: [
              {
                name: "\u6C9F\u901A\u80FD\u529B",
                description: "\u6E05\u6670\u6709\u6548\u7684\u6C9F\u901A",
                behavioralIndicators: [
                  "\u8868\u8FBE\u6E05\u6670\u6709\u529B",
                  "\u5584\u4E8E\u503E\u542C",
                  "\u9002\u5E94\u4E0D\u540C\u53D7\u4F17"
                ]
              },
              {
                name: "\u5173\u7CFB\u5EFA\u8BBE",
                description: "\u5EFA\u7ACB\u4FE1\u4EFB\u5173\u7CFB",
                behavioralIndicators: [
                  "\u5EFA\u7ACB\u5E7F\u6CDB\u4EBA\u8109",
                  "\u7EF4\u62A4\u826F\u597D\u5173\u7CFB",
                  "\u8DE8\u90E8\u95E8\u534F\u4F5C"
                ]
              }
            ],
            assessmentCriteria: [
              "\u5F71\u54CD\u8303\u56F4",
              "\u8BF4\u670D\u80FD\u529B",
              "\u5173\u7CFB\u7F51\u7EDC"
            ],
            developmentSuggestions: [
              "\u63D0\u5347\u6F14\u8BB2\u6280\u5DE7",
              "\u5B66\u4E60\u8C08\u5224\u6280\u5DE7",
              "\u6269\u5C55\u4EBA\u9645\u7F51\u7EDC"
            ],
            weight: 0.2
          }
        ];
      }
      /**
       * 评估文化契合度
       */
      async assessCultureFit(candidateData, stage) {
        const prompt = this.buildCultureAssessmentPrompt(candidateData, stage);
        const response = await openai4.chat.completions.create({
          model: ASSESSMENT_MODEL,
          messages: [
            {
              role: "system",
              content: prompt
            },
            {
              role: "user",
              content: `\u8BF7\u57FA\u4E8E\u4EE5\u4E0B\u5019\u9009\u4EBA\u4FE1\u606F\u8BC4\u4F30\u5176\u6587\u5316\u5951\u5408\u5EA6\uFF1A

${candidateData.resumeText ? `\u7B80\u5386\u5185\u5BB9\uFF1A
${candidateData.resumeText}
` : ""}
${candidateData.interviewTranscripts ? `\u9762\u8BD5\u8BB0\u5F55\uFF1A
${candidateData.interviewTranscripts.join("\n")}
` : ""}
${candidateData.behavioralResponses ? `\u884C\u4E3A\u9762\u8BD5\u56DE\u7B54\uFF1A
${JSON.stringify(candidateData.behavioralResponses, null, 2)}` : ""}

\u8BC4\u4F30\u9636\u6BB5\uFF1A${stage}

\u8BF7\u63D0\u4F9B\u8BE6\u7EC6\u7684\u6587\u5316\u5951\u5408\u5EA6\u8BC4\u4F30\uFF0C\u5305\u62EC\u6BCF\u4E2A\u4EF7\u503C\u89C2\u7EF4\u5EA6\u7684\u8BC4\u5206\u3001\u8BC1\u636E\u548C\u5EFA\u8BAE\u3002`
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
          max_tokens: 4e3
        });
        const content = response.choices[0].message.content;
        if (!content) {
          throw new Error("No response from culture assessment");
        }
        return JSON.parse(content);
      }
      /**
       * 评估领导力潜力
       */
      async assessLeadership(candidateData, stage, targetLevel) {
        const prompt = this.buildLeadershipAssessmentPrompt(candidateData, stage, targetLevel);
        const response = await openai4.chat.completions.create({
          model: ASSESSMENT_MODEL,
          messages: [
            {
              role: "system",
              content: prompt
            },
            {
              role: "user",
              content: `\u8BF7\u57FA\u4E8E\u4EE5\u4E0B\u5019\u9009\u4EBA\u4FE1\u606F\u8BC4\u4F30\u5176\u9886\u5BFC\u529B\u6F5C\u529B\uFF1A

${candidateData.resumeText ? `\u7B80\u5386\u5185\u5BB9\uFF1A
${candidateData.resumeText}
` : ""}
${candidateData.interviewTranscripts ? `\u9762\u8BD5\u8BB0\u5F55\uFF1A
${candidateData.interviewTranscripts.join("\n")}
` : ""}
${candidateData.managementExperience ? `\u7BA1\u7406\u7ECF\u9A8C\uFF1A
${candidateData.managementExperience}
` : ""}
${candidateData.achievements ? `\u4E3B\u8981\u6210\u5C31\uFF1A
${candidateData.achievements.join("\n")}` : ""}

\u8BC4\u4F30\u9636\u6BB5\uFF1A${stage}
${targetLevel ? `\u76EE\u6807\u804C\u7EA7\uFF1A${targetLevel}` : ""}

\u8BF7\u63D0\u4F9B\u8BE6\u7EC6\u7684\u9886\u5BFC\u529B\u8BC4\u4F30\uFF0C\u5305\u62EC\u5404\u7EF4\u5EA6\u8BC4\u5206\u3001\u53D1\u5C55\u6F5C\u529B\u548C\u5EFA\u8BAE\u3002`
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
          max_tokens: 4e3
        });
        const content = response.choices[0].message.content;
        if (!content) {
          throw new Error("No response from leadership assessment");
        }
        return JSON.parse(content);
      }
      /**
       * 构建文化评估提示词
       */
      buildCultureAssessmentPrompt(candidateData, stage) {
        const valueDescriptions = this.cultureValues.map(
          (v) => `- ${v.name}: ${v.description}
  \u4F53\u73B0\u884C\u4E3A: ${v.behaviors.join(", ")}
  \u53CD\u9762\u884C\u4E3A: ${v.antiPatterns.join(", ")}`
        ).join("\n");
        return `\u4F60\u662F\u4E00\u4F4D\u8D44\u6DF1\u7684\u7EC4\u7EC7\u6587\u5316\u4E13\u5BB6\u548C\u4EBA\u624D\u8BC4\u4F30\u987E\u95EE\uFF0C\u4E13\u95E8\u8BC4\u4F30\u5019\u9009\u4EBA\u4E0E\u516C\u53F8\u6587\u5316\u7684\u5951\u5408\u5EA6\u3002

\u516C\u53F8\u6587\u5316\u4EF7\u503C\u89C2\uFF1A
${valueDescriptions}

\u8BC4\u4F30\u539F\u5219\uFF1A
1. **\u8BC1\u636E\u5BFC\u5411**\uFF1A\u6240\u6709\u8BC4\u5206\u5FC5\u987B\u57FA\u4E8E\u5177\u4F53\u7684\u884C\u4E3A\u8BC1\u636E
2. **\u53D1\u5C55\u89C6\u89D2**\uFF1A\u65E2\u8981\u8BC4\u4F30\u5F53\u524D\u72B6\u6001\uFF0C\u4E5F\u8981\u9884\u6D4B\u672A\u6765\u6F5C\u529B
3. **\u98CE\u9669\u8BC6\u522B**\uFF1A\u8BDA\u5B9E\u6307\u51FA\u53EF\u80FD\u7684\u6587\u5316\u51B2\u7A81\u98CE\u9669
4. **\u9636\u6BB5\u9002\u5E94**\uFF1A\u6839\u636E\u8BC4\u4F30\u9636\u6BB5\uFF08${stage}\uFF09\u8C03\u6574\u8BC4\u4F30\u6DF1\u5EA6\u548C\u7F6E\u4FE1\u5EA6

\u8BC4\u4F30\u8981\u6C42\uFF1A
1. \u5BF9\u6BCF\u4E2A\u4EF7\u503C\u89C2\u7EF4\u5EA6\u8FDB\u884C0-100\u5206\u8BC4\u5206
2. \u63D0\u4F9B\u652F\u6491\u6BCF\u4E2A\u8BC4\u5206\u7684\u5177\u4F53\u8BC1\u636E
3. \u8BC6\u522B\u6587\u5316\u5951\u5408\u7684\u4F18\u52BF\u548C\u5DEE\u8DDD
4. \u63D0\u51FA\u540E\u7EED\u8BC4\u4F30\u6216\u53D1\u5C55\u5EFA\u8BAE
5. \u8BC4\u4F30\u6574\u4F53\u8D8B\u52BF\u548C\u53D1\u5C55\u6F5C\u529B

\u7279\u522B\u6CE8\u610F\uFF1A
- \u7B80\u5386\u9636\u6BB5\uFF1A\u57FA\u4E8E\u6709\u9650\u4FE1\u606F\u8C28\u614E\u63A8\u65AD\uFF0C\u7F6E\u4FE1\u5EA6\u5E94\u504F\u4F4E
- \u9762\u8BD5\u9636\u6BB5\uFF1A\u7ED3\u5408\u884C\u4E3A\u95EE\u9898\u56DE\u7B54\u6DF1\u5165\u8BC4\u4F30
- \u540E\u671F\u9636\u6BB5\uFF1A\u7EFC\u5408\u591A\u8F6E\u53CD\u9988\u5F62\u6210\u5168\u9762\u5224\u65AD

\u8F93\u51FAJSON\u683C\u5F0F\u7684\u8BE6\u7EC6\u8BC4\u4F30\u7ED3\u679C\u3002`;
      }
      /**
       * 构建领导力评估提示词
       */
      buildLeadershipAssessmentPrompt(candidateData, stage, targetLevel) {
        const dimensionDescriptions = this.leadershipFramework.map(
          (d) => `- ${d.name} (${d.level}\u7EA7): ${d.description}
  \u5173\u952E\u80FD\u529B: ${d.competencies.map((c) => c.name).join(", ")}`
        ).join("\n");
        return `\u4F60\u662F\u4E00\u4F4D\u8D44\u6DF1\u7684\u9886\u5BFC\u529B\u53D1\u5C55\u4E13\u5BB6\uFF0C\u4E13\u95E8\u8BC4\u4F30\u548C\u57F9\u517B\u7EC4\u7EC7\u9886\u5BFC\u4EBA\u624D\u3002

\u9886\u5BFC\u529B\u6846\u67B6\uFF1A
${dimensionDescriptions}

\u8BC4\u4F30\u4EFB\u52A1\uFF1A
1. \u8BC4\u4F30\u5019\u9009\u4EBA\u5F53\u524D\u7684\u9886\u5BFC\u529B\u6C34\u5E73
2. \u9884\u6D4B\u5176\u9886\u5BFC\u529B\u53D1\u5C55\u6F5C\u529B
3. \u8BC6\u522B\u4F18\u52BF\u548C\u53D1\u5C55\u9886\u57DF
4. \u63D0\u4F9B\u53D1\u5C55\u5EFA\u8BAE

${targetLevel ? `\u76EE\u6807\u804C\u7EA7\u8981\u6C42\uFF1A${targetLevel}` : ""}

\u8BC4\u4F30\u539F\u5219\uFF1A
1. **\u591A\u7EF4\u8BC4\u4F30**\uFF1A\u4ECE\u6218\u7565\u601D\u7EF4\u3001\u56E2\u961F\u9886\u5BFC\u3001\u6267\u884C\u529B\u3001\u5F71\u54CD\u529B\u7B49\u7EF4\u5EA6\u5168\u9762\u8BC4\u4F30
2. **\u6F5C\u529B\u8BC6\u522B**\uFF1A\u4E0D\u4EC5\u8BC4\u4F30\u5F53\u524D\u80FD\u529B\uFF0C\u66F4\u8981\u8BC6\u522B\u53D1\u5C55\u6F5C\u529B
3. **\u884C\u4E3A\u8BC1\u636E**\uFF1A\u57FA\u4E8E\u8FC7\u5F80\u884C\u4E3A\u548C\u6210\u5C31\u8FDB\u884C\u8BC4\u4F30
4. **\u60C5\u5883\u8003\u8651**\uFF1A\u8003\u8651\u5019\u9009\u4EBA\u7684\u7ECF\u9A8C\u80CC\u666F\u548C\u6210\u957F\u73AF\u5883

\u8BC4\u4F30\u9636\u6BB5\uFF1A${stage}
- \u65E9\u671F\u9636\u6BB5\uFF1A\u91CD\u70B9\u8BC6\u522B\u6F5C\u529B\u4FE1\u53F7
- \u4E2D\u671F\u9636\u6BB5\uFF1A\u6DF1\u5165\u8BC4\u4F30\u5177\u4F53\u80FD\u529B
- \u540E\u671F\u9636\u6BB5\uFF1A\u7EFC\u5408\u8BC4\u4F30\u548C\u9884\u6D4B

\u8F93\u51FA\u8981\u6C42\uFF1A
1. \u6574\u4F53\u9886\u5BFC\u529B\u5F97\u5206\uFF080-100\uFF09
2. \u5404\u7EF4\u5EA6\u8BE6\u7EC6\u8BC4\u5206\u548C\u8BC1\u636E
3. \u9886\u5BFC\u529B\u4F18\u52BF\u548C\u53D1\u5C55\u9886\u57DF
4. \u53D1\u5C55\u5EFA\u8BAE\u548C\u57F9\u517B\u8BA1\u5212
5. \u6210\u529F\u9884\u6D4B\u548C\u98CE\u9669\u56E0\u7D20

\u8F93\u51FAJSON\u683C\u5F0F\u7684\u8BE6\u7EC6\u8BC4\u4F30\u7ED3\u679C\u3002`;
      }
      /**
       * 生成文化契合度演化报告
       */
      generateCultureEvolutionReport(assessments) {
        const latest = assessments[assessments.length - 1];
        const trend = this.analyzeTrend(assessments.map((a) => a.overallScore));
        return `
# \u6587\u5316\u5951\u5408\u5EA6\u6F14\u5316\u62A5\u544A

## \u5F53\u524D\u72B6\u6001
- **\u6574\u4F53\u5951\u5408\u5EA6**: ${latest.overallScore}/100
- **\u8BC4\u4F30\u7F6E\u4FE1\u5EA6**: ${latest.confidence}
- **\u53D1\u5C55\u8D8B\u52BF**: ${trend}

## \u5404\u4EF7\u503C\u89C2\u7EF4\u5EA6\u8868\u73B0
${latest.valueAssessments.map((v) => `
### ${v.valueName}: ${v.score}/100
**\u8BC1\u636E**:
${v.evidence.map((e) => `- ${e}`).join("\n")}
${v.concerns.length > 0 ? `**\u987E\u8651**:
${v.concerns.map((c) => `- ${c}`).join("\n")}` : ""}
`).join("\n")}

## \u6F14\u5316\u8F68\u8FF9
${assessments.map((a, i) => `- ${a.stage}: ${a.overallScore}\u5206 (${a.confidence}\u7F6E\u4FE1\u5EA6)`).join("\n")}

## \u5173\u952E\u6D1E\u5BDF
**\u4F18\u52BF**: ${latest.strengths.join(", ")}
**\u5DEE\u8DDD**: ${latest.gaps.join(", ")}
**\u98CE\u9669**: ${latest.risks.join(", ")}

## \u540E\u7EED\u5EFA\u8BAE
${latest.interviewFocus.map((f) => `- ${f}`).join("\n")}
`;
      }
      /**
       * 生成领导力潜力演化报告
       */
      generateLeadershipEvolutionReport(assessments) {
        const latest = assessments[assessments.length - 1];
        return `
# \u9886\u5BFC\u529B\u6F5C\u529B\u6F14\u5316\u62A5\u544A

## \u5F53\u524D\u8BC4\u4F30
- **\u603B\u4F53\u5F97\u5206**: ${latest.overallScore}/100
- **\u5F53\u524D\u6C34\u5E73**: ${latest.currentLevel}
- **\u6F5C\u529B\u6C34\u5E73**: ${latest.potentialLevel}
- **\u53D1\u5C55\u8F68\u8FF9**: ${latest.trajectory}

## \u5404\u7EF4\u5EA6\u8868\u73B0
${latest.dimensionScores.map((d) => `
### ${d.dimension}: ${d.score}/100
**\u8BC1\u636E**: ${d.evidence.join(", ")}
**\u53D1\u5C55\u6F5C\u529B**: ${d.developmentPotential}
`).join("\n")}

## \u9886\u5BFC\u529B\u4F18\u52BF
${latest.strengths.map((s) => `- **${s.competency}**: ${s.impact}`).join("\n")}

## \u53D1\u5C55\u5EFA\u8BAE
${latest.developmentAreas.map((d) => `
- **${d.competency}**
  \u5F53\u524D: ${d.currentState}
  \u76EE\u6807: ${d.targetState}
  \u8DEF\u5F84: ${d.developmentPath.join(" \u2192 ")}
`).join("\n")}

## \u6210\u529F\u9884\u6D4B\u56E0\u5B50
${latest.successPredictors.join(", ")}

## \u6F5C\u5728\u98CE\u9669
${latest.derailers.join(", ")}
`;
      }
      /**
       * 分析趋势
       */
      analyzeTrend(scores) {
        if (scores.length < 2) return "\u6570\u636E\u4E0D\u8DB3";
        const lastScore = scores[scores.length - 1];
        const prevScore = scores[scores.length - 2];
        const change = lastScore - prevScore;
        if (change > 5) return "\u663E\u8457\u6539\u5584 \u2191";
        if (change > 0) return "\u7A33\u6B65\u63D0\u5347 \u2197";
        if (change === 0) return "\u4FDD\u6301\u7A33\u5B9A \u2192";
        if (change > -5) return "\u7565\u6709\u4E0B\u964D \u2198";
        return "\u660E\u663E\u4E0B\u964D \u2193";
      }
      /**
       * 兼容旧接口：领导力框架评估
       */
      async assessLeadershipFramework(candidateData, stage, targetLevel) {
        return this.assessLeadership(candidateData, stage, targetLevel);
      }
      /**
       * 兼容旧接口：文化契合对齐评估
       */
      async assessCultureAlignment(profileData, context) {
        const behavioralResponses = context?.observations?.length ? { combined: context.observations.join("\n") } : void 0;
        return this.assessCultureFit(
          {
            resumeText: profileData?.resumeSummary || profileData?.resumeText || "",
            profileHistory: Array.isArray(profileData?.profileHistory) ? profileData.profileHistory : void 0,
            behavioralResponses
          },
          "interview_feedback"
        );
      }
      /**
       * 兼容旧接口：生成综合演化报告
       */
      generateEvolutionReport(cultureHistory, leadershipHistory) {
        return {
          cultureReport: cultureHistory.length ? this.generateCultureEvolutionReport(cultureHistory) : null,
          leadershipReport: leadershipHistory.length ? this.generateLeadershipEvolutionReport(leadershipHistory) : null
        };
      }
      /**
       * 比较两个候选人的组织契合度
       */
      compareCandidates(candidate1, candidate2) {
        return {
          cultureComparison: {
            candidate1Score: candidate1.culture.overallScore,
            candidate2Score: candidate2.culture.overallScore,
            winner: candidate1.culture.overallScore > candidate2.culture.overallScore ? "candidate1" : "candidate2",
            keyDifferences: this.identifyKeyDifferences(
              candidate1.culture.valueAssessments,
              candidate2.culture.valueAssessments
            )
          },
          leadershipComparison: {
            candidate1Score: candidate1.leadership.overallScore,
            candidate2Score: candidate2.leadership.overallScore,
            winner: candidate1.leadership.overallScore > candidate2.leadership.overallScore ? "candidate1" : "candidate2",
            dimensionComparison: this.compareDimensions(
              candidate1.leadership.dimensionScores,
              candidate2.leadership.dimensionScores
            )
          },
          recommendation: this.generateComparisonRecommendation(candidate1, candidate2)
        };
      }
      identifyKeyDifferences(assess1, assess2) {
        const differences = [];
        assess1.forEach((a1, i) => {
          const a2 = assess2[i];
          if (Math.abs(a1.score - a2.score) > 15) {
            differences.push(`${a1.valueName}: \u5019\u9009\u4EBA1(${a1.score}) vs \u5019\u9009\u4EBA2(${a2.score})`);
          }
        });
        return differences;
      }
      compareDimensions(dims1, dims2) {
        return dims1.map((d1, i) => {
          const d2 = dims2[i];
          return {
            dimension: d1.dimension,
            candidate1: d1.score,
            candidate2: d2.score,
            difference: d1.score - d2.score
          };
        });
      }
      generateComparisonRecommendation(c1, c2) {
        const cultureDiff = Math.abs(c1.culture.overallScore - c2.culture.overallScore);
        const leadershipDiff = Math.abs(c1.leadership.overallScore - c2.leadership.overallScore);
        if (cultureDiff < 5 && leadershipDiff < 5) {
          return "\u4E24\u4F4D\u5019\u9009\u4EBA\u5728\u6587\u5316\u5951\u5408\u5EA6\u548C\u9886\u5BFC\u529B\u65B9\u9762\u90FD\u975E\u5E38\u63A5\u8FD1\uFF0C\u5EFA\u8BAE\u57FA\u4E8E\u5176\u4ED6\u56E0\u7D20\uFF08\u5982\u4E13\u4E1A\u6280\u80FD\u3001\u85AA\u8D44\u671F\u671B\uFF09\u505A\u51B3\u5B9A\u3002";
        }
        const cultureWinner = c1.culture.overallScore > c2.culture.overallScore ? "\u5019\u9009\u4EBA1" : "\u5019\u9009\u4EBA2";
        const leadershipWinner = c1.leadership.overallScore > c2.leadership.overallScore ? "\u5019\u9009\u4EBA1" : "\u5019\u9009\u4EBA2";
        if (cultureWinner === leadershipWinner) {
          return `${cultureWinner}\u5728\u6587\u5316\u5951\u5408\u5EA6\u548C\u9886\u5BFC\u529B\u4E24\u65B9\u9762\u90FD\u66F4\u4F18\u79C0\uFF0C\u662F\u66F4\u5408\u9002\u7684\u9009\u62E9\u3002`;
        }
        return `\u5019\u9009\u4EBA\u5728\u4E0D\u540C\u7EF4\u5EA6\u5404\u6709\u4F18\u52BF\uFF1A\u6587\u5316\u5951\u5408\u5EA6\u65B9\u9762${cultureWinner}\u66F4\u4F18\uFF0C\u9886\u5BFC\u529B\u65B9\u9762${leadershipWinner}\u66F4\u5F3A\u3002\u5EFA\u8BAE\u6839\u636E\u5C97\u4F4D\u7279\u70B9\u548C\u56E2\u961F\u9700\u6C42\u6743\u8861\u51B3\u5B9A\u3002`;
      }
    };
    organizationalFitService = new OrganizationalFitService();
  }
});

// shared/types/evidence.ts
var init_evidence = __esm({
  "shared/types/evidence.ts"() {
    "use strict";
  }
});

// server/services/evidenceService.ts
import { v4 as uuidv4 } from "uuid";
var EvidenceService, evidenceService;
var init_evidenceService = __esm({
  "server/services/evidenceService.ts"() {
    "use strict";
    init_openaiService();
    init_evidence();
    EvidenceService = class {
      /**
       * 从简历文本中提取证据
       */
      async extractEvidenceFromResume(resumeText, claims) {
        const prompt = `
You are an expert at extracting evidence from resumes to support or refute specific claims.

Resume Text:
${resumeText}

Claims to evaluate:
${claims.map((c) => `- ${c.statement}`).join("\n")}

For each claim, extract relevant evidence from the resume. For each piece of evidence:
1. Quote the exact text from the resume
2. Identify the section it comes from
3. Assess the strength of the evidence
4. Provide confidence score

Return as JSON array of evidence objects with:
- claimStatement: string (which claim this evidence relates to)
- originalText: string (exact quote from resume)
- section: string (e.g., "Work Experience", "Education")
- strength: "direct" | "strong" | "moderate" | "weak" | "inferential"
- confidence: number (0-100)
- reasoning: string (why this is evidence for/against the claim)
`;
        const response = await openai2.chat.completions.create({
          model: "gpt-4-turbo-preview",
          messages: [
            {
              role: "system",
              content: "You are an expert at evidence extraction and analysis. Always quote text exactly as it appears."
            },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.2
        });
        const result = JSON.parse(response.choices[0].message.content || "{}");
        const evidenceArray = result.evidence || [];
        return evidenceArray.map((e) => ({
          id: uuidv4(),
          source: "resume" /* RESUME */,
          strength: e.strength,
          originalText: e.originalText,
          highlightedText: e.originalText,
          sourceDetails: {
            timestamp: /* @__PURE__ */ new Date(),
            section: e.section
          },
          confidence: e.confidence,
          verificationStatus: "unverified"
        }));
      }
      /**
       * 从面试反馈中提取证据
       */
      async extractEvidenceFromInterview(interviewFeedback, interviewId, interviewerId) {
        const evidenceList = [];
        if (interviewFeedback.observations?.strengths) {
          interviewFeedback.observations.strengths.forEach((strength) => {
            evidenceList.push({
              id: uuidv4(),
              source: "interview" /* INTERVIEW_FEEDBACK */,
              strength: "strong" /* STRONG */,
              originalText: strength,
              sourceDetails: {
                interviewId,
                interviewerId,
                timestamp: /* @__PURE__ */ new Date(),
                section: "strengths"
              },
              confidence: 85,
              verificationStatus: "verified"
            });
          });
        }
        if (interviewFeedback.behavioralEvidence) {
          interviewFeedback.behavioralEvidence.forEach((star) => {
            const fullText = `\u60C5\u5883: ${star.situation}
\u4EFB\u52A1: ${star.task}
\u884C\u52A8: ${star.action}
\u7ED3\u679C: ${star.result}`;
            evidenceList.push({
              id: uuidv4(),
              source: "behavior" /* BEHAVIORAL_OBSERVATION */,
              strength: "direct" /* DIRECT */,
              originalText: fullText,
              highlightedText: star.action,
              context: fullText,
              sourceDetails: {
                interviewId,
                interviewerId,
                timestamp: /* @__PURE__ */ new Date(),
                section: "behavioral_evidence"
              },
              confidence: 95,
              verificationStatus: "verified"
            });
          });
        }
        if (interviewFeedback.skillsValidation) {
          interviewFeedback.skillsValidation.forEach((skill) => {
            if (skill.assessed && skill.level !== "not_assessed") {
              evidenceList.push({
                id: uuidv4(),
                source: "interview" /* INTERVIEW_FEEDBACK */,
                strength: skill.level === "exceeded" ? "direct" /* DIRECT */ : "strong" /* STRONG */,
                originalText: `${skill.skill}: ${skill.level} - ${skill.evidence}`,
                sourceDetails: {
                  interviewId,
                  interviewerId,
                  timestamp: /* @__PURE__ */ new Date(),
                  section: "skills_validation"
                },
                confidence: skill.level === "exceeded" ? 95 : 80,
                verificationStatus: "verified"
              });
            }
          });
        }
        return evidenceList;
      }
      /**
       * 创建评价声明并关联证据
       */
      async createClaimWithEvidence(statement, type, evidence, reasoning) {
        const confidenceScore = this.calculateConfidenceFromEvidence(evidence);
        const evidenceSummary = this.generateEvidenceSummary(evidence);
        return {
          id: uuidv4(),
          type,
          statement,
          category: this.getCategoryFromType(type),
          importance: this.determineImportance(type),
          supportingEvidence: evidence,
          evidenceSummary,
          confidenceScore,
          reasoning: this.normalizeReasoning(reasoning)
        };
      }
      /**
       * 构建证据链
       */
      async buildEvidenceChain(claim) {
        const primaryEvidence = claim.supportingEvidence.filter(
          (e) => e.strength === "direct" /* DIRECT */ || e.strength === "strong" /* STRONG */
        );
        const supportingEvidence = claim.supportingEvidence.filter(
          (e) => e.strength === "moderate" /* MODERATE */ || e.strength === "weak" /* WEAK */
        );
        const contradictoryEvidence = await this.findContradictoryEvidence(claim);
        const argumentStructure = this.buildArgumentStructure(
          claim,
          primaryEvidence,
          supportingEvidence
        );
        const visualizationData = this.generateVisualizationData(
          claim,
          primaryEvidence,
          supportingEvidence,
          contradictoryEvidence
        );
        return {
          claimId: claim.id,
          claim: claim.statement,
          primaryEvidence,
          supportingEvidence,
          contradictoryEvidence: contradictoryEvidence.length > 0 ? contradictoryEvidence : void 0,
          argumentStructure,
          visualizationData
        };
      }
      normalizeReasoning(reasoning) {
        if (!reasoning) return void 0;
        const allowed = [
          "direct",
          "inductive",
          "deductive",
          "abductive"
        ];
        const method = allowed.includes(reasoning.method) ? reasoning.method : "direct";
        return {
          method,
          steps: reasoning.steps,
          assumptions: reasoning.assumptions
        };
      }
      /**
       * AI驱动的证据分析
       */
      async analyzeEvidenceWithAI(claim, evidence) {
        const prompt = `
Analyze the following claim and its supporting evidence:

Claim: ${claim}

Evidence:
${evidence.map((e, i) => `
${i + 1}. Source: ${e.source}
   Strength: ${e.strength}
   Text: ${e.originalText}
   Confidence: ${e.confidence}%
`).join("\n")}

Provide:
1. Analysis of how well the evidence supports the claim
2. Assessment of overall evidence strength
3. Gaps in the evidence (what's missing)
4. Recommendations for additional evidence needed

Return as JSON with keys: analysis, strengthAssessment, gaps (array), recommendations (array)
`;
        const response = await openai2.chat.completions.create({
          model: "gpt-4-turbo-preview",
          messages: [
            {
              role: "system",
              content: "You are an expert at evidence analysis and critical thinking."
            },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.3
        });
        return JSON.parse(response.choices[0].message.content || "{}");
      }
      /**
       * 查找矛盾证据
       */
      async findContradictoryEvidence(claim) {
        return [];
      }
      /**
       * 构建论证结构
       */
      buildArgumentStructure(claim, primaryEvidence, supportingEvidence) {
        const premise = primaryEvidence.map(
          (e) => `\u6839\u636E${this.getSourceLabel(e.source)}\uFF1A${e.highlightedText || e.originalText.substring(0, 100)}`
        );
        const inference = [
          `\u57FA\u4E8E${primaryEvidence.length}\u6761\u4E3B\u8981\u8BC1\u636E\u548C${supportingEvidence.length}\u6761\u652F\u6491\u8BC1\u636E`,
          `\u5E73\u5747\u7F6E\u4FE1\u5EA6\u4E3A${claim.confidenceScore.toFixed(0)}%`,
          ...claim.reasoning?.steps || []
        ];
        return {
          premise,
          inference,
          conclusion: claim.statement
        };
      }
      /**
       * 生成可视化数据
       */
      generateVisualizationData(claim, primaryEvidence, supportingEvidence, contradictoryEvidence) {
        const nodes = [];
        const edges = [];
        nodes.push({
          id: claim.id,
          label: claim.statement,
          type: "claim",
          x: 400,
          y: 50
        });
        primaryEvidence.forEach((e, i) => {
          nodes.push({
            id: e.id,
            label: e.originalText.substring(0, 50) + "...",
            type: "evidence",
            source: e.source,
            strength: e.strength,
            x: 200 + i * 150,
            y: 200
          });
          edges.push({
            source: e.id,
            target: claim.id,
            type: "supports",
            weight: e.confidence / 100
          });
        });
        supportingEvidence.forEach((e, i) => {
          nodes.push({
            id: e.id,
            label: e.originalText.substring(0, 50) + "...",
            type: "evidence",
            source: e.source,
            strength: e.strength,
            x: 150 + i * 100,
            y: 350
          });
          edges.push({
            source: e.id,
            target: claim.id,
            type: "supports",
            weight: e.confidence / 100 * 0.5
          });
        });
        contradictoryEvidence.forEach((e, i) => {
          nodes.push({
            id: e.id,
            label: e.originalText.substring(0, 50) + "...",
            type: "evidence",
            source: e.source,
            strength: e.strength,
            x: 550 + i * 100,
            y: 350
          });
          edges.push({
            source: e.id,
            target: claim.id,
            type: "contradicts",
            weight: e.confidence / 100
          });
        });
        return { nodes, edges };
      }
      /**
       * 辅助方法
       */
      calculateConfidenceFromEvidence(evidence) {
        if (evidence.length === 0) return 0;
        const weightedSum = evidence.reduce((sum, e) => {
          const strengthWeight = {
            ["direct" /* DIRECT */]: 1,
            ["strong" /* STRONG */]: 0.8,
            ["moderate" /* MODERATE */]: 0.6,
            ["weak" /* WEAK */]: 0.4,
            ["inferential" /* INFERENTIAL */]: 0.3
          }[e.strength];
          return sum + e.confidence * strengthWeight;
        }, 0);
        return Math.min(100, weightedSum / evidence.length);
      }
      generateEvidenceSummary(evidence) {
        const sources = [...new Set(evidence.map((e) => this.getSourceLabel(e.source)))];
        const avgConfidence = evidence.reduce((sum, e) => sum + e.confidence, 0) / evidence.length;
        return `\u57FA\u4E8E${evidence.length}\u6761\u8BC1\u636E\uFF08\u6765\u81EA${sources.join("\u3001")}\uFF09\uFF0C\u5E73\u5747\u7F6E\u4FE1\u5EA6${avgConfidence.toFixed(0)}%`;
      }
      getSourceLabel(source) {
        const labels = {
          ["resume" /* RESUME */]: "\u7B80\u5386",
          ["interview" /* INTERVIEW_FEEDBACK */]: "\u9762\u8BD5\u53CD\u9988",
          ["behavior" /* BEHAVIORAL_OBSERVATION */]: "\u884C\u4E3A\u89C2\u5BDF",
          ["test" /* TEST_RESULT */]: "\u6D4B\u8BD5\u7ED3\u679C",
          ["reference" /* REFERENCE_CHECK */]: "\u80CC\u666F\u8C03\u67E5",
          ["work_sample" /* WORK_SAMPLE */]: "\u5DE5\u4F5C\u6837\u672C",
          ["ai_analysis" /* AI_ANALYSIS */]: "AI\u5206\u6790",
          ["public" /* PUBLIC_PROFILE */]: "\u516C\u5F00\u8D44\u6599",
          ["certification" /* CERTIFICATION */]: "\u8BC1\u4E66",
          ["portfolio" /* PORTFOLIO */]: "\u4F5C\u54C1\u96C6"
        };
        return labels[source] || source;
      }
      getCategoryFromType(type) {
        if (type.includes("SKILL")) return "\u6280\u80FD";
        if (type.includes("EXPERIENCE")) return "\u7ECF\u9A8C";
        if (type.includes("CULTURE")) return "\u6587\u5316";
        if (type.includes("POTENTIAL")) return "\u6F5C\u529B";
        if (type.includes("RISK")) return "\u98CE\u9669";
        return "\u5176\u4ED6";
      }
      determineImportance(type) {
        const critical = ["red_flag" /* RED_FLAG */, "risk_factor" /* RISK_FACTOR */];
        const high = ["technical_skill" /* TECHNICAL_SKILL */, "domain_expertise" /* DOMAIN_EXPERTISE */, "leadership" /* LEADERSHIP */];
        const medium = ["soft_skill" /* SOFT_SKILL */, "culture_fit" /* CULTURE_FIT */, "communication" /* COMMUNICATION */];
        if (critical.includes(type)) return "critical";
        if (high.includes(type)) return "high";
        if (medium.includes(type)) return "medium";
        return "low";
      }
    };
    evidenceService = new EvidenceService();
  }
});

// server/services/aiTokenTrackerService.ts
var MODEL_PRICING, DEFAULT_BUDGET, AiTokenTrackerService, aiTokenTracker;
var init_aiTokenTrackerService = __esm({
  "server/services/aiTokenTrackerService.ts"() {
    "use strict";
    init_storage();
    MODEL_PRICING = {
      // GPT-4o 系列
      "gpt-4o": { input: 5, output: 15 },
      "gpt-4o-2024-08-06": { input: 2.5, output: 10 },
      "gpt-4o-mini": { input: 0.15, output: 0.6 },
      // GPT-4 Turbo 系列
      "gpt-4-turbo": { input: 10, output: 30 },
      "gpt-4-turbo-preview": { input: 10, output: 30 },
      "gpt-4-0125-preview": { input: 10, output: 30 },
      // GPT-4 系列（旧版）
      "gpt-4": { input: 30, output: 60 },
      "gpt-4-0613": { input: 30, output: 60 },
      // GPT-3.5 Turbo 系列
      "gpt-3.5-turbo": { input: 0.5, output: 1.5 },
      "gpt-3.5-turbo-0125": { input: 0.5, output: 1.5 },
      // OpenRouter模型（近似定价）
      "google/gemini-2.0-flash-001": { input: 0.075, output: 0.3 },
      "google/gemini-2.5-flash": { input: 0.075, output: 0.3 },
      "anthropic/claude-3-opus": { input: 15, output: 75 },
      "anthropic/claude-3-sonnet": { input: 3, output: 15 },
      "anthropic/claude-3-haiku": { input: 0.25, output: 1.25 },
      // 默认定价（未知模型）
      "default": { input: 1, output: 2 }
    };
    DEFAULT_BUDGET = {
      dailyLimit: 50,
      // 默认每日预算 $50
      warningThreshold: 0.8,
      // 80% 时发出警告
      enabled: true
    };
    AiTokenTrackerService = class {
      constructor(budgetConfig) {
        this.budgetConfig = { ...DEFAULT_BUDGET, ...budgetConfig };
      }
      /**
       * 计算AI调用成本
       */
      calculateCost(model, promptTokens, completionTokens) {
        const pricing = MODEL_PRICING[model] || MODEL_PRICING["default"];
        const inputCost = promptTokens / 1e6 * pricing.input;
        const outputCost = completionTokens / 1e6 * pricing.output;
        return inputCost + outputCost;
      }
      /**
       * 记录AI调用的token使用
       */
      async trackUsage(params) {
        try {
          const { response, model, operation, success, errorMessage, latencyMs, retryCount, userId, entityType, entityId, metadata } = params;
          const promptTokens = response.usage?.prompt_tokens || 0;
          const completionTokens = response.usage?.completion_tokens || 0;
          const totalTokens = response.usage?.total_tokens || 0;
          const estimatedCost = this.calculateCost(model, promptTokens, completionTokens);
          const usage = {
            userId: userId || null,
            operation,
            entityType: entityType || null,
            entityId: entityId || null,
            model,
            promptTokens,
            completionTokens,
            totalTokens,
            estimatedCost: estimatedCost.toString(),
            success,
            errorMessage: errorMessage || null,
            latencyMs,
            retryCount: retryCount || 0,
            metadata: metadata || null
          };
          await storage.createAiTokenUsage(usage);
          console.log(`\u2705 AI Token \u8DDF\u8E2A: ${operation} | \u6A21\u578B: ${model} | Tokens: ${totalTokens} | \u6210\u672C: $${estimatedCost.toFixed(6)}`);
        } catch (error) {
          console.error("\u274C \u8BB0\u5F55AI token\u4F7F\u7528\u5931\u8D25:", error);
        }
      }
      /**
       * 检查预算状态
       */
      async checkBudget(userId) {
        if (!this.budgetConfig.enabled) {
          return {
            allowed: true,
            currentSpend: 0,
            limit: this.budgetConfig.dailyLimit,
            percentage: 0,
            warning: false
          };
        }
        const today = /* @__PURE__ */ new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        let currentSpend;
        if (userId) {
          const usages = await storage.getAiTokenUsageByUser(userId, today, tomorrow);
          currentSpend = usages.reduce((total, u) => {
            const cost = u.estimatedCost ? parseFloat(u.estimatedCost) : 0;
            return total + cost;
          }, 0);
        } else {
          currentSpend = await storage.getTotalCostByPeriod(today, tomorrow);
        }
        const percentage = currentSpend / this.budgetConfig.dailyLimit;
        const warning = percentage >= this.budgetConfig.warningThreshold;
        const allowed = percentage < 1;
        return {
          allowed,
          currentSpend,
          limit: this.budgetConfig.dailyLimit,
          percentage,
          warning
        };
      }
      /**
       * 获取成本统计
       */
      async getUsageStats(params) {
        let usages;
        if (params.userId) {
          usages = await storage.getAiTokenUsageByUser(
            params.userId,
            params.startDate,
            params.endDate
          );
        } else if (params.operation) {
          usages = await storage.getAiTokenUsageByOperation(params.operation);
          if (params.startDate) {
            usages = usages.filter((u) => u.createdAt && u.createdAt >= params.startDate);
          }
          if (params.endDate) {
            usages = usages.filter((u) => u.createdAt && u.createdAt <= params.endDate);
          }
        } else {
          usages = await storage.getAiTokenUsage(params.startDate, params.endDate);
        }
        const totalCalls = usages.length;
        const successfulCalls = usages.filter((u) => u.success).length;
        const failedCalls = totalCalls - successfulCalls;
        const totalTokens = usages.reduce((sum, u) => sum + u.totalTokens, 0);
        const totalCost = usages.reduce((sum, u) => {
          const cost = u.estimatedCost ? parseFloat(u.estimatedCost) : 0;
          return sum + cost;
        }, 0);
        const avgTokensPerCall = totalCalls > 0 ? totalTokens / totalCalls : 0;
        const avgCostPerCall = totalCalls > 0 ? totalCost / totalCalls : 0;
        const modelBreakdown = {};
        for (const usage of usages) {
          if (!modelBreakdown[usage.model]) {
            modelBreakdown[usage.model] = { calls: 0, tokens: 0, cost: 0 };
          }
          modelBreakdown[usage.model].calls += 1;
          modelBreakdown[usage.model].tokens += usage.totalTokens;
          modelBreakdown[usage.model].cost += usage.estimatedCost ? parseFloat(usage.estimatedCost) : 0;
        }
        return {
          totalCalls,
          successfulCalls,
          failedCalls,
          totalTokens,
          totalCost,
          avgTokensPerCall,
          avgCostPerCall,
          modelBreakdown
        };
      }
      /**
       * 更新预算配置
       */
      updateBudgetConfig(config) {
        this.budgetConfig = { ...this.budgetConfig, ...config };
      }
      /**
       * 获取当前预算配置
       */
      getBudgetConfig() {
        return { ...this.budgetConfig };
      }
    };
    aiTokenTracker = new AiTokenTrackerService();
  }
});

// server/services/candidateProfileService.ts
import OpenAI5 from "openai";
import { z as z2 } from "zod";
var CONFIG, TOKEN_LIMITS, OPENROUTER_API_KEY, openai5, DEFAULT_MODEL, ADVANCED_MODEL, ProficiencySchema, ProfileDataSchema, CandidateProfileDataSchema, CandidateProfileService, candidateProfileService;
var init_candidateProfileService = __esm({
  "server/services/candidateProfileService.ts"() {
    "use strict";
    init_storage();
    init_organizationalFitService();
    init_evidenceService();
    init_evidence();
    init_aiTokenTrackerService();
    init_schema();
    CONFIG = {
      AI_TEMPERATURE: 0.3,
      MAX_RESUME_LENGTH: 3e3,
      DEFAULT_OVERALL_SCORE: 70,
      AI_TIMEOUT_MS: 45e3,
      MAX_RETRIES: 2
    };
    TOKEN_LIMITS = {
      MAX_TOTAL_TOKENS: 3e4,
      // 单次调用最大 token (约22500汉字)
      MAX_HISTORY_TOKENS: 5e3,
      // 历史面试记录最大 token
      MAX_EVIDENCE_TOKENS: 3e3,
      // 证据摘要最大 token
      MAX_TRANSCRIPTION_TOKENS: 2e3,
      // 面试转录最大 token
      MAX_FEEDBACK_TOKENS: 800,
      // 面试官反馈最大 token
      MAX_NOTES_TOKENS: 500,
      // 面试官笔记最大 token
      MAX_JOB_DESC_TOKENS: 500,
      // 职位描述最大 token
      MAX_SUMMARY_TOKENS: 300,
      // AI总结最大 token
      CHARS_PER_TOKEN: 2.5
      // 中文约2.5字符 = 1 token (估算)
    };
    OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) {
      throw new Error("\u73AF\u5883\u53D8\u91CF OPENROUTER_API_KEY \u672A\u8BBE\u7F6E\uFF0C\u65E0\u6CD5\u4F7F\u7528 AI \u529F\u80FD");
    }
    openai5 = new OpenAI5({
      apiKey: OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": process.env.APP_URL || "https://hr-recruit-system.vercel.app",
        "X-Title": "AI Recruit System"
      }
    });
    DEFAULT_MODEL = process.env.PROFILE_AI_MODEL || "openai/gpt-4o";
    ADVANCED_MODEL = process.env.PROFILE_AI_ADVANCED_MODEL || "openai/gpt-4o";
    ProficiencySchema = z2.enum(["beginner", "intermediate", "advanced", "expert"]);
    ProfileDataSchema = z2.object({
      technicalSkills: z2.array(z2.object({
        skill: z2.string().min(1),
        proficiency: ProficiencySchema,
        evidenceSource: z2.string().min(1),
        evidence: z2.array(z2.any()).optional(),
        // Evidence objects
        evidenceChain: z2.any().optional()
        // EvidenceChain object
      })),
      softSkills: z2.array(z2.object({
        skill: z2.string().min(1),
        examples: z2.array(z2.string()),
        evidence: z2.array(z2.any()).optional(),
        evidenceChain: z2.any().optional()
      })),
      experience: z2.object({
        totalYears: z2.number().nonnegative(),
        relevantYears: z2.number().nonnegative(),
        positions: z2.array(z2.object({
          title: z2.string(),
          duration: z2.string(),
          keyAchievements: z2.array(z2.string())
        }))
      }),
      education: z2.object({
        level: z2.string(),
        field: z2.string(),
        institution: z2.string().optional()
      }),
      culturalFit: z2.object({
        workStyle: z2.string(),
        motivations: z2.array(z2.string()),
        preferences: z2.array(z2.string())
      }),
      careerTrajectory: z2.object({
        progression: z2.string(),
        growthAreas: z2.array(z2.string()),
        stabilityScore: z2.number().min(0).max(100)
      }),
      // 新增：组织契合度评估
      organizationalFit: z2.object({
        cultureAssessment: z2.object({
          overallScore: z2.number().min(0).max(100),
          valueAssessments: z2.array(z2.object({
            valueName: z2.string(),
            score: z2.number().min(0).max(100),
            evidence: z2.array(z2.string()),
            concerns: z2.array(z2.string()).optional()
          })),
          trajectory: z2.enum(["improving", "stable", "declining"]).optional(),
          confidence: z2.enum(["low", "medium", "high"])
        }).optional(),
        leadershipAssessment: z2.object({
          overallScore: z2.number().min(0).max(100),
          currentLevel: z2.enum(["individual_contributor", "emerging_leader", "developing_leader", "mature_leader"]),
          dimensionScores: z2.array(z2.object({
            dimension: z2.string(),
            score: z2.number().min(0).max(100),
            evidence: z2.array(z2.string())
          })),
          trajectory: z2.enum(["high_potential", "steady_growth", "developing", "at_risk"]).optional(),
          readinessForNextLevel: z2.number().min(0).max(100).optional()
        }).optional()
      }).optional()
    });
    CandidateProfileDataSchema = z2.object({
      profileData: ProfileDataSchema,
      overallScore: z2.number().min(0).max(100),
      dataSources: z2.array(z2.string()),
      gaps: z2.array(z2.string()),
      strengths: z2.array(z2.string()),
      concerns: z2.array(z2.string()),
      aiSummary: z2.string().min(50),
      evidenceSummary: z2.object({
        totalEvidence: z2.number(),
        strongEvidence: z2.number(),
        contradictions: z2.number(),
        averageConfidence: z2.number(),
        mainSources: z2.array(z2.string())
      }).optional()
    });
    CandidateProfileService = class {
      constructor() {
        // 锁管理：存储 Promise 和开始时间
        this.updateLocks = /* @__PURE__ */ new Map();
        // 结果缓存：实现幂等性，避免重复计算
        this.resultCache = /* @__PURE__ */ new Map();
        // 锁清理定时器
        this.lockCleanerInterval = null;
        this.startLockCleaner();
      }
      /**
       * 定期清理超时的锁，防止内存泄漏
       */
      startLockCleaner() {
        this.lockCleanerInterval = setInterval(() => {
          const now = Date.now();
          let cleanedCount = 0;
          for (const [key, { startTime }] of this.updateLocks.entries()) {
            if (now - startTime > 6e4) {
              this.updateLocks.delete(key);
              cleanedCount++;
              this.log("warn", "\u6E05\u7406\u8D85\u65F6\u9501", { lockKey: key, age: now - startTime });
            }
          }
          if (cleanedCount > 0) {
            this.log("info", "\u9501\u6E05\u7406\u5B8C\u6210", { cleanedCount, remainingLocks: this.updateLocks.size });
          }
        }, 3e4);
      }
      /**
       * 停止锁清理机制（用于测试或服务关闭）
       */
      stopLockCleaner() {
        if (this.lockCleanerInterval) {
          clearInterval(this.lockCleanerInterval);
          this.lockCleanerInterval = null;
        }
      }
      async buildInitialProfile(candidateId, resumeAnalysis, jobId) {
        if (!candidateId?.trim()) {
          throw new Error("candidateId \u4E0D\u80FD\u4E3A\u7A7A");
        }
        if (!resumeAnalysis?.summary || !resumeAnalysis?.skills?.length) {
          throw new Error("resumeAnalysis \u6570\u636E\u4E0D\u5B8C\u6574\uFF0C\u65E0\u6CD5\u751F\u6210\u753B\u50CF");
        }
        if (jobId && !jobId.trim()) {
          throw new Error("jobId \u4E0D\u80FD\u4E3A\u7A7A\u5B57\u7B26\u4E32");
        }
        this.log("info", "Building initial profile with evidence tracking", { candidateId, jobId });
        const candidate = await storage.getCandidate(candidateId);
        if (!candidate) {
          throw new Error(`Candidate ${candidateId} not found`);
        }
        let job;
        if (jobId) {
          job = await storage.getJob(jobId);
        }
        const claims = this.generateClaimsFromResumeAnalysis(resumeAnalysis);
        const resumeEvidence = await evidenceService.extractEvidenceFromResume(
          candidate.resumeText || "",
          claims
        );
        this.log("info", "Extracted evidence from resume", {
          candidateId,
          evidenceCount: resumeEvidence.length
        });
        const profileData = await this.generateInitialProfileWithAI(
          candidate,
          resumeAnalysis,
          job || void 0,
          resumeEvidence
        );
        try {
          const orgFitData = await this.performOrganizationalFitAssessment(
            candidate,
            "resume",
            resumeAnalysis,
            void 0,
            job ?? void 0
          );
          if (orgFitData) {
            profileData.profileData.organizationalFit = orgFitData;
          }
        } catch (error) {
          this.log("warn", "Failed to perform organizational fit assessment", { error });
        }
        const profile = await storage.createCandidateProfile({
          candidateId,
          jobId: jobId || null,
          stage: "resume",
          profileData: profileData.profileData,
          overallScore: profileData.overallScore.toString(),
          dataSources: profileData.dataSources,
          gaps: profileData.gaps,
          strengths: profileData.strengths,
          concerns: profileData.concerns,
          aiSummary: profileData.aiSummary
        });
        this.log("info", "Successfully created initial profile", {
          candidateId,
          version: profile.version
        });
        return profile;
      }
      async updateProfileWithInterview(candidateId, interviewId) {
        if (!candidateId?.trim()) {
          throw new Error("candidateId \u4E0D\u80FD\u4E3A\u7A7A");
        }
        if (!interviewId?.trim()) {
          throw new Error("interviewId \u4E0D\u80FD\u4E3A\u7A7A");
        }
        const lockKey = `${candidateId}:${interviewId}`;
        const cached = this.resultCache.get(lockKey);
        if (cached && Date.now() - cached.timestamp < 3e5) {
          this.log("info", "\u8FD4\u56DE\u7F13\u5B58\u7684\u753B\u50CF\u66F4\u65B0\u7ED3\u679C", {
            lockKey,
            cacheAge: Date.now() - cached.timestamp
          });
          return cached.result;
        }
        if (this.updateLocks.has(lockKey)) {
          this.log("info", "\u7B49\u5F85\u5DF2\u5B58\u5728\u7684\u753B\u50CF\u66F4\u65B0\u5B8C\u6210", { candidateId, interviewId });
          const lockData = this.updateLocks.get(lockKey);
          const existingPromise = lockData.promise;
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
              reject(new Error("\u7B49\u5F85\u753B\u50CF\u66F4\u65B0\u8D85\u65F6\uFF0C\u53EF\u80FD\u5B58\u5728\u6B7B\u9501"));
            }, 3e4);
          });
          try {
            return await Promise.race([existingPromise, timeoutPromise]);
          } catch (error) {
            this.updateLocks.delete(lockKey);
            this.log("error", "\u7B49\u5F85\u66F4\u65B0\u8D85\u65F6\uFF0C\u5F3A\u5236\u6E05\u9664\u9501", {
              lockKey,
              error: error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF",
              lockAge: Date.now() - lockData.startTime
            });
            throw new Error(`\u753B\u50CF\u66F4\u65B0\u8D85\u65F6: ${error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF"}`);
          }
        }
        const updatePromise = this._doUpdateProfileWithInterview(candidateId, interviewId);
        this.updateLocks.set(lockKey, {
          promise: updatePromise,
          startTime: Date.now()
        });
        try {
          const result = await updatePromise;
          this.updateLocks.delete(lockKey);
          this.resultCache.set(lockKey, {
            result,
            timestamp: Date.now()
          });
          this.log("info", "\u753B\u50CF\u66F4\u65B0\u6210\u529F\uFF0C\u9501\u5DF2\u91CA\u653E", {
            lockKey,
            profileVersion: result.version
          });
          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF";
          const isRetryableError = errorMessage.includes("timeout") || errorMessage.includes("ECONNREFUSED") || errorMessage.includes("ETIMEDOUT") || errorMessage.includes("AI \u8C03\u7528\u8D85\u65F6");
          if (isRetryableError) {
            this.updateLocks.delete(lockKey);
            this.log("warn", "\u753B\u50CF\u66F4\u65B0\u9047\u5230\u53EF\u91CD\u8BD5\u9519\u8BEF\uFF0C\u9501\u5DF2\u91CA\u653E", {
              lockKey,
              error: errorMessage
            });
          } else {
            setTimeout(() => {
              this.updateLocks.delete(lockKey);
              this.log("info", "\u6301\u4E45\u6027\u9519\u8BEF\u7684\u9501\u5EF6\u8FDF\u6E05\u9664\u5B8C\u6210", { lockKey });
            }, 5e3);
            this.log("error", "\u753B\u50CF\u66F4\u65B0\u9047\u5230\u4E25\u91CD\u9519\u8BEF\uFF0C5\u79D2\u540E\u5141\u8BB8\u91CD\u8BD5", {
              lockKey,
              error: errorMessage
            });
          }
          throw error;
        }
      }
      async _doUpdateProfileWithInterview(candidateId, interviewId) {
        this.log("info", "Updating profile after interview", { candidateId, interviewId });
        const candidate = await storage.getCandidate(candidateId);
        if (!candidate) {
          throw new Error(`Candidate ${candidateId} not found`);
        }
        const interview = await storage.getInterview(interviewId);
        if (!interview) {
          throw new Error(`Interview ${interviewId} not found`);
        }
        if (interview.candidateId !== candidateId) {
          throw new Error(`Interview ${interviewId} does not belong to candidate ${candidateId}`);
        }
        if (!interview.feedback && !interview.interviewerNotes && !interview.transcription) {
          this.log("warn", "Interview lacks feedback data", { interviewId });
        }
        const currentProfile = await storage.getLatestCandidateProfile(candidateId);
        if (!currentProfile) {
          throw new Error(`No existing profile found for candidate ${candidateId}`);
        }
        const allInterviews = await storage.getInterviewsByCandidate(candidateId);
        let job;
        if (interview.jobId) {
          job = await storage.getJob(interview.jobId);
        }
        const interviewFeedbackData = this.parseInterviewFeedback(interview);
        const interviewEvidence = await evidenceService.extractEvidenceFromInterview(
          {
            observations: {
              strengths: interview.aiKeyFindings || interviewFeedbackData.observations?.strengths || [],
              weaknesses: interview.aiConcernAreas || interviewFeedbackData.observations?.weaknesses || [],
              redFlags: interviewFeedbackData.observations?.redFlags || [],
              highlights: interviewFeedbackData.observations?.highlights || []
            },
            skillsValidation: interviewFeedbackData.skillsValidation || [],
            behavioralEvidence: interviewFeedbackData.behavioralEvidence || []
          },
          interviewId,
          interview.interviewerId || "system"
        );
        const updatedProfileData = await this.generateUpdatedProfileWithAI(
          candidate,
          currentProfile,
          interview,
          allInterviews,
          job,
          interviewEvidence
        );
        try {
          const stage = interview.round === 1 ? "interview_1" : interview.round === 2 ? "interview_2" : "final_evaluation";
          const orgFitData = await this.performOrganizationalFitAssessment(
            candidate,
            stage,
            void 0,
            interview,
            job ?? void 0,
            currentProfile.profileData
          );
          if (orgFitData) {
            updatedProfileData.profileData.organizationalFit = orgFitData;
          }
        } catch (error) {
          this.log("warn", "Failed to update organizational fit assessment", { error });
        }
        const newProfile = await storage.createCandidateProfile({
          candidateId,
          jobId: interview.jobId || currentProfile.jobId || null,
          stage: `after_interview_${interview.round}`,
          profileData: updatedProfileData.profileData,
          overallScore: updatedProfileData.overallScore.toString(),
          dataSources: updatedProfileData.dataSources,
          gaps: updatedProfileData.gaps,
          strengths: updatedProfileData.strengths,
          concerns: updatedProfileData.concerns,
          aiSummary: updatedProfileData.aiSummary
        });
        this.log("info", "Successfully updated profile", {
          candidateId,
          version: newProfile.version
        });
        return newProfile;
      }
      async getProfileEvolution(candidateId) {
        return storage.getCandidateProfiles(candidateId);
      }
      async generateInitialProfileWithAI(candidate, resumeAnalysis, job, resumeEvidence) {
        const skillEvidenceChains = await this.buildSkillEvidenceChains(
          resumeAnalysis.skills,
          resumeEvidence || []
        );
        const jsonSchemaExample = {
          profileData: {
            technicalSkills: [
              {
                skill: "React",
                proficiency: "advanced",
                evidenceSource: "5\u5E74\u9879\u76EE\u7ECF\u9A8C\uFF0C\u53C2\u4E0E\u5927\u578B\u4F01\u4E1A\u7EA7\u5E94\u7528\u5F00\u53D1",
                evidence: [],
                // 实际的证据对象
                evidenceChain: {}
                // 证据链对象
              }
            ],
            softSkills: [
              {
                skill: "\u56E2\u961F\u534F\u4F5C",
                examples: ["\u9886\u5BFC\u8DE8\u90E8\u95E8\u9879\u76EE\u56E2\u961F", "mentor 3\u540D\u521D\u7EA7\u5F00\u53D1\u8005"]
              }
            ],
            experience: {
              totalYears: 5,
              relevantYears: 4,
              positions: [
                {
                  title: "\u9AD8\u7EA7\u524D\u7AEF\u5DE5\u7A0B\u5E08",
                  duration: "2020-2025",
                  keyAchievements: ["\u4E3B\u5BFC\u91CD\u6784\u9879\u76EE", "\u6027\u80FD\u4F18\u5316\u63D0\u534750%"]
                }
              ]
            },
            education: {
              level: "\u672C\u79D1",
              field: "\u8BA1\u7B97\u673A\u79D1\u5B66",
              institution: "\u6E05\u534E\u5927\u5B66"
            },
            culturalFit: {
              workStyle: "\u6CE8\u91CD\u534F\u4F5C\uFF0C\u559C\u6B22\u521B\u65B0\u73AF\u5883",
              motivations: ["\u6280\u672F\u6311\u6218", "\u56E2\u961F\u6210\u957F"],
              preferences: ["\u7075\u6D3B\u5DE5\u4F5C\u65F6\u95F4", "\u8FDC\u7A0B\u529E\u516C"]
            },
            careerTrajectory: {
              progression: "\u7A33\u6B65\u5411\u4E0A\uFF0C\u4ECE\u521D\u7EA7\u5230\u9AD8\u7EA7\u7528\u65F63\u5E74",
              growthAreas: ["\u67B6\u6784\u8BBE\u8BA1", "\u56E2\u961F\u7BA1\u7406"],
              stabilityScore: 85
            }
          },
          overallScore: 85,
          dataSources: ["\u7B80\u5386", "\u6559\u80B2\u80CC\u666F"],
          gaps: ["\u7F3A\u5C11\u540E\u7AEF\u7ECF\u9A8C", "\u672A\u5C55\u793A\u9886\u5BFC\u529B"],
          strengths: ["\u624E\u5B9E\u7684\u524D\u7AEF\u57FA\u7840", "\u4F18\u79C0\u7684\u95EE\u9898\u89E3\u51B3\u80FD\u529B"],
          concerns: ["\u9891\u7E41\u8DF3\u69FD", "\u9879\u76EE\u7ECF\u9A8C\u8F83\u6D45"],
          aiSummary: "\u5019\u9009\u4EBA\u5177\u6709\u624E\u5B9E\u7684\u524D\u7AEF\u6280\u672F\u80CC\u666F\uFF0C5\u5E74\u5DE5\u4F5C\u7ECF\u9A8C\uFF0C\u64C5\u957FReact\u751F\u6001\u7CFB\u7EDF...",
          evidenceSummary: (() => {
            const evidenceList = resumeEvidence ?? [];
            const strongEvidenceCount = evidenceList.filter(
              (e) => e.strength === "direct" || e.strength === "strong"
            ).length;
            const averageConfidence = evidenceList.length ? evidenceList.reduce((sum, e) => sum + e.confidence, 0) / evidenceList.length : 0;
            return {
              totalEvidence: evidenceList.length,
              strongEvidence: strongEvidenceCount,
              contradictions: 0,
              averageConfidence,
              mainSources: ["\u7B80\u5386"]
            };
          })()
        };
        const systemPrompt = `\u4F60\u662F\u4E00\u4F4D\u8D44\u6DF1\u7684 HR \u4E13\u5BB6\u548C\u4EBA\u624D\u8BC4\u4F30\u4E13\u5BB6\u3002\u4F60\u7684\u4EFB\u52A1\u662F\u57FA\u4E8E\u5019\u9009\u4EBA\u7684\u7B80\u5386\u5206\u6790\uFF0C\u6784\u5EFA\u4E00\u4E2A\u5168\u9762\u3001\u6DF1\u5165\u7684\u5019\u9009\u4EBA\u753B\u50CF\u3002

**\u4E25\u683C\u8981\u6C42**\uFF1A\u4F60\u5FC5\u987B\u8FD4\u56DE\u7B26\u5408\u4EE5\u4E0B\u7ED3\u6784\u7684 JSON \u6570\u636E\uFF1A

\`\`\`json
${JSON.stringify(jsonSchemaExample, null, 2)}
\`\`\`

**\u5B57\u6BB5\u8BF4\u660E**\uFF1A
- technicalSkills[].proficiency \u53EA\u80FD\u662F\u4EE5\u4E0B\u503C\u4E4B\u4E00: "beginner", "intermediate", "advanced", "expert"
- \u6BCF\u4E2A\u6280\u80FD\u8BC4\u4F30\u90FD\u5E94\u8BE5\u5305\u542B\u652F\u6491\u7684\u8BC1\u636E\u548C\u7F6E\u4FE1\u5EA6
- overallScore \u5FC5\u987B\u662F 0-100 \u4E4B\u95F4\u7684\u6570\u5B57\uFF0C\u5E94\u8BE5\u57FA\u4E8E\u8BC1\u636E\u7684\u5F3A\u5EA6\u548C\u6570\u91CF\u6765\u8BA1\u7B97
- stabilityScore \u5FC5\u987B\u662F 0-100 \u4E4B\u95F4\u7684\u6574\u6570
- dataSources \u5FC5\u987B\u662F\u5B57\u7B26\u4E32\u6570\u7EC4\uFF0C\u5982 ["\u7B80\u5386", "\u6559\u80B2\u80CC\u666F"]
- gaps, strengths, concerns \u90FD\u5FC5\u987B\u662F\u5B57\u7B26\u4E32\u6570\u7EC4\uFF0C\u6BCF\u4E2A\u7ED3\u8BBA\u90FD\u5E94\u8BE5\u6709\u8BC1\u636E\u652F\u6491
- aiSummary \u5FC5\u987B\u662F 200-300 \u5B57\u7684\u5019\u9009\u4EBA\u753B\u50CF\u603B\u7ED3\uFF0C\u7A81\u51FA\u6709\u5F3A\u529B\u8BC1\u636E\u652F\u6491\u7684\u7ED3\u8BBA

${job ? `
\u76EE\u6807\u804C\u4F4D\uFF1A${job.title}
\u804C\u4F4D\u8981\u6C42\uFF1A${job.requirements ? job.requirements.join(", ") : ""}
\u804C\u4F4D\u63CF\u8FF0\uFF1A${job.description}

\u8BF7\u7279\u522B\u5173\u6CE8\u5019\u9009\u4EBA\u4E0E\u8BE5\u804C\u4F4D\u7684\u5339\u914D\u5EA6\u3002` : ""}

\u8BF7\u4E25\u683C\u6309\u7167\u4E0A\u8FF0 JSON \u7ED3\u6784\u8F93\u51FA\u3002`;
        const resumeText = candidate.resumeText ? this.smartTruncate(this.sanitizeForPrompt(candidate.resumeText), CONFIG.MAX_RESUME_LENGTH) : "";
        const userPrompt = `\u5019\u9009\u4EBA\u57FA\u672C\u4FE1\u606F\uFF1A
- \u59D3\u540D\uFF1A${this.sanitizeForPrompt(candidate.name)}
- \u5E94\u8058\u804C\u4F4D\uFF1A${this.sanitizeForPrompt(candidate.position || "\u672A\u6307\u5B9A")}
- \u671F\u671B\u85AA\u8D44\uFF1A${candidate.salaryExpectation ? `${candidate.salaryExpectation} \u5143` : "\u672A\u63D0\u4F9B"}
- \u6240\u5728\u5730\uFF1A${this.sanitizeForPrompt(candidate.location || "\u672A\u63D0\u4F9B")}

\u7B80\u5386\u5206\u6790\u7ED3\u679C\uFF1A
- \u603B\u7ED3\uFF1A${this.sanitizeForPrompt(resumeAnalysis.summary)}
- \u6280\u80FD\uFF1A${resumeAnalysis.skills.map((s) => this.sanitizeForPrompt(s)).join(", ")}
- \u5DE5\u4F5C\u5E74\u9650\uFF1A${resumeAnalysis.experience} \u5E74
- \u6559\u80B2\u80CC\u666F\uFF1A${this.sanitizeForPrompt(resumeAnalysis.education)}
- \u4F18\u52BF\uFF1A${resumeAnalysis.strengths.map((s) => this.sanitizeForPrompt(s)).join(", ")}
- \u4E0D\u8DB3\uFF1A${resumeAnalysis.weaknesses.map((s) => this.sanitizeForPrompt(s)).join(", ")}

\u8BC1\u636E\u7EDF\u8BA1\uFF1A
  - \u5171\u63D0\u53D6 ${(resumeEvidence ?? []).length} \u6761\u8BC1\u636E
  - \u76F4\u63A5\u8BC1\u636E\uFF1A${(resumeEvidence ?? []).filter((e) => e.strength === "direct").length} \u6761
  - \u5F3A\u529B\u8BC1\u636E\uFF1A${(resumeEvidence ?? []).filter((e) => e.strength === "strong").length} \u6761
  - \u5E73\u5747\u7F6E\u4FE1\u5EA6\uFF1A${(() => {
          const list = resumeEvidence ?? [];
          if (!list.length) return "0";
          const avg = list.reduce((s, e) => s + e.confidence, 0) / list.length;
          return avg.toFixed(0);
        })()}%

${resumeText ? `
\u7B80\u5386\u5168\u6587\uFF1A
${resumeText}` : ""}

\u8BF7\u751F\u6210\u5B8C\u6574\u7684\u5019\u9009\u4EBA\u753B\u50CF\u3002`;
        try {
          const result = await this.callAIWithRetry(
            {
              model: ADVANCED_MODEL,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
              ],
              response_format: { type: "json_object" },
              temperature: CONFIG.AI_TEMPERATURE
            },
            CandidateProfileDataSchema,
            CONFIG.MAX_RETRIES,
            {
              operation: "initial_profile_generation",
              entityType: "candidate",
              entityId: candidate.id,
              metadata: {
                hasResume: !!resumeAnalysis,
                hasJob: !!job,
                evidenceCount: resumeEvidence?.length || 0
              }
            }
          );
          return result;
        } catch (error) {
          this.log("error", "\u751F\u6210\u521D\u59CB\u753B\u50CF\u65F6\u51FA\u9519", { candidateId: candidate.id, error });
          throw new Error("AI \u753B\u50CF\u751F\u6210\u5931\u8D25: " + (error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF"));
        }
      }
      async generateUpdatedProfileWithAI(candidate, currentProfile, latestInterview, allInterviews, job, newEvidence) {
        const historicalEvidence = this.extractEvidenceFromProfile(currentProfile);
        const allEvidence = [...historicalEvidence, ...newEvidence || []];
        this.log("info", "\u8BC1\u636E\u94FE\u6574\u5408", {
          candidateId: candidate.id,
          historicalEvidenceCount: historicalEvidence.length,
          newEvidenceCount: newEvidence?.length || 0,
          totalEvidenceCount: allEvidence.length
        });
        const contradictions = await this.detectEvidenceContradictions(allEvidence);
        const evidenceSummary = this.buildEvidenceSummaryCompact(allEvidence, newEvidence || []);
        const systemPrompt = `\u4F60\u662F\u4E00\u4F4D\u8D44\u6DF1\u7684 HR \u4E13\u5BB6\u548C\u4EBA\u624D\u8BC4\u4F30\u4E13\u5BB6\u3002\u4F60\u7684\u4EFB\u52A1\u662F\u57FA\u4E8E\u5019\u9009\u4EBA\u7684\u73B0\u6709\u753B\u50CF\u548C\u6700\u65B0\u7684\u9762\u8BD5\u53CD\u9988\uFF0C\u66F4\u65B0\u5019\u9009\u4EBA\u753B\u50CF\u3002

**\u91CD\u8981\u539F\u5219\uFF1A**
1. **\u8BC1\u636E\u9A71\u52A8**\uFF1A\u6240\u6709\u8BC4\u4F30\u5FC5\u987B\u57FA\u4E8E\u660E\u786E\u7684\u8BC1\u636E\uFF0C\u907F\u514D\u4E3B\u89C2\u81C6\u65AD
2. **\u6574\u5408\u65B0\u4FE1\u606F**\uFF1A\u5C06\u9762\u8BD5\u4E2D\u83B7\u5F97\u7684\u65B0\u4FE1\u606F\u4E0E\u73B0\u6709\u753B\u50CF\u6574\u5408
3. **\u4FDD\u6301\u4E00\u81F4\u6027**\uFF1A\u786E\u4FDD\u66F4\u65B0\u540E\u7684\u753B\u50CF\u5728\u903B\u8F91\u4E0A\u4E00\u81F4
4. **\u7A81\u51FA\u53D8\u5316**\uFF1A\u660E\u786E\u6307\u51FA\u54EA\u4E9B\u4FE1\u606F\u662F\u65B0\u589E\u7684\uFF0C\u54EA\u4E9B\u8BC4\u4F30\u6709\u6240\u8C03\u6574
5. **\u6DF1\u5316\u7406\u89E3**\uFF1A\u5229\u7528\u9762\u8BD5\u4FE1\u606F\u6DF1\u5316\u5BF9\u5019\u9009\u4EBA\u7684\u7406\u89E3
6. **\u8BC6\u522B\u77DB\u76FE**\uFF1A\u5982\u679C\u9762\u8BD5\u53CD\u9988\u4E0E\u7B80\u5386\u4FE1\u606F\u6709\u51FA\u5165\uFF0C\u9700\u8981\u660E\u786E\u6307\u51FA\u5E76\u57FA\u4E8E\u8BC1\u636E\u5F3A\u5EA6\u5224\u65AD

**\u8BC1\u636E\u5904\u7406\u89C4\u5219**\uFF1A
- \u76F4\u63A5\u8BC1\u636E (direct) > \u5F3A\u8BC1\u636E (strong) > \u4E2D\u7B49\u8BC1\u636E (moderate) > \u5F31\u8BC1\u636E (weak) > \u63A8\u65AD\u8BC1\u636E (inferential)
- \u9762\u8BD5\u9A8C\u8BC1\u7684\u8BC1\u636E\u4F18\u5148\u4E8E\u7B80\u5386\u58F0\u79F0
- \u5F53\u8BC1\u636E\u77DB\u76FE\u65F6\uFF0C\u9009\u62E9\u8BC1\u636E\u5F3A\u5EA6\u66F4\u9AD8\u3001\u6765\u6E90\u66F4\u53EF\u4FE1\u7684\u7ED3\u8BBA
- \u6807\u6CE8\u8BC1\u636E\u4E0D\u8DB3\u7684\u8BC4\u4F30\u4E3A"\u9700\u8981\u8FDB\u4E00\u6B65\u9A8C\u8BC1"

\u8BF7\u66F4\u65B0\u5019\u9009\u4EBA\u753B\u50CF\uFF0C\u4F7F\u7528\u4E0E\u521D\u59CB\u753B\u50CF\u76F8\u540C\u7684 JSON \u7ED3\u6784\uFF0Cproficiency \u53EA\u80FD\u662F: "beginner", "intermediate", "advanced", "expert" \u4E4B\u4E00\u3002`;
        const previousStrengths = currentProfile.strengths || [];
        const previousConcerns = currentProfile.concerns || [];
        const previousGaps = currentProfile.gaps || [];
        const previousDataSources = currentProfile.dataSources || [];
        const transcription = latestInterview.transcription ? this.truncateToTokenLimit(
          this.sanitizeForPrompt(latestInterview.transcription),
          TOKEN_LIMITS.MAX_TRANSCRIPTION_TOKENS
        ) : "";
        const interviewHistory = this.summarizeInterviewHistory(allInterviews, latestInterview);
        let jobInfo = "";
        if (job) {
          const requirements = job.requirements ? job.requirements.slice(0, 10).join(", ") : "";
          const description = this.truncateToTokenLimit(
            this.sanitizeForPrompt(job.description),
            TOKEN_LIMITS.MAX_JOB_DESC_TOKENS
          );
          jobInfo = `
**\u76EE\u6807\u804C\u4F4D\uFF1A**
- \u804C\u4F4D\uFF1A${job.title}
- \u8981\u6C42\uFF1A${requirements}
- \u63CF\u8FF0\uFF1A${description}`;
        }
        const userPrompt = `\u5019\u9009\u4EBA\uFF1A${this.sanitizeForPrompt(candidate.name)}

**\u5F53\u524D\u753B\u50CF\uFF08\u7B2C ${currentProfile.version} \u7248\uFF09\uFF1A**
- \u9636\u6BB5\uFF1A${currentProfile.stage}
- \u7EFC\u5408\u8BC4\u5206\uFF1A${currentProfile.overallScore}
- \u5DF2\u77E5\u4F18\u52BF\uFF1A${previousStrengths.slice(0, 5).join(", ")}${previousStrengths.length > 5 ? ` \u7B49${previousStrengths.length}\u9879` : ""}
- \u5DF2\u77E5\u987E\u8651\uFF1A${previousConcerns.slice(0, 5).join(", ")}${previousConcerns.length > 5 ? ` \u7B49${previousConcerns.length}\u9879` : ""}
- \u4FE1\u606F\u7F3A\u53E3\uFF1A${previousGaps.slice(0, 5).join(", ")}${previousGaps.length > 5 ? ` \u7B49${previousGaps.length}\u9879` : ""}
- AI \u603B\u7ED3\uFF1A${this.truncateToTokenLimit(this.sanitizeForPrompt(currentProfile.aiSummary || ""), TOKEN_LIMITS.MAX_SUMMARY_TOKENS)}

**\u8BC1\u636E\u94FE\u5206\u6790\uFF1A**
${evidenceSummary}

${contradictions.length > 0 ? `
**\u68C0\u6D4B\u5230\u7684\u8BC1\u636E\u77DB\u76FE\uFF08\u5171 ${contradictions.length} \u4E2A\uFF0C\u5C55\u793A\u524D5\u4E2A\uFF09\uFF1A**
${contradictions.slice(0, 5).map((c) => `- ${c.claim}: ${c.description}`).join("\n")}
\u8BF7\u5728\u66F4\u65B0\u753B\u50CF\u65F6\u660E\u786E\u89E3\u51B3\u8FD9\u4E9B\u77DB\u76FE\uFF0C\u57FA\u4E8E\u8BC1\u636E\u5F3A\u5EA6\u548C\u6765\u6E90\u53EF\u4FE1\u5EA6\u505A\u51FA\u5224\u65AD\u3002
` : ""}

**\u6700\u65B0\u9762\u8BD5\u4FE1\u606F\uFF08\u7B2C ${latestInterview.round} \u8F6E\uFF09\uFF1A**
- \u9762\u8BD5\u7C7B\u578B\uFF1A${latestInterview.type}
- \u9762\u8BD5\u65F6\u95F4\uFF1A${latestInterview.scheduledDate}
- \u9762\u8BD5\u8BC4\u5206\uFF1A${latestInterview.rating || "\u672A\u8BC4\u5206"}/5
- \u9762\u8BD5\u5B98\u53CD\u9988\uFF1A${this.truncateToTokenLimit(this.sanitizeForPrompt(latestInterview.feedback || "\u65E0"), TOKEN_LIMITS.MAX_FEEDBACK_TOKENS)}
- \u9762\u8BD5\u5B98\u7B14\u8BB0\uFF1A${this.truncateToTokenLimit(this.sanitizeForPrompt(latestInterview.interviewerNotes || "\u65E0"), TOKEN_LIMITS.MAX_NOTES_TOKENS)}
- \u63A8\u8350\u610F\u89C1\uFF1A${latestInterview.recommendation || "\u672A\u7ED9\u51FA"}
${transcription ? `- \u9762\u8BD5\u8F6C\u5F55\uFF08\u6458\u8981\uFF09\uFF1A${transcription}` : ""}
${latestInterview.aiKeyFindings ? `- AI \u5173\u952E\u53D1\u73B0\uFF1A${JSON.stringify(latestInterview.aiKeyFindings).substring(0, 500)}` : ""}
${latestInterview.aiConcernAreas ? `- AI \u5173\u6CE8\u70B9\uFF1A${JSON.stringify(latestInterview.aiConcernAreas).substring(0, 500)}` : ""}

**\u5386\u53F2\u9762\u8BD5\u8BB0\u5F55\uFF08\u5171 ${allInterviews.length} \u8F6E\uFF09\uFF1A**
${interviewHistory}

${jobInfo}

**\u8BF7\u66F4\u65B0\u753B\u50CF\uFF0C\u786E\u4FDD\uFF1A**
1. \u57FA\u4E8E\u8BC1\u636E\u6574\u5408\u9762\u8BD5\u4E2D\u7684\u65B0\u4FE1\u606F
2. \u66F4\u65B0\u6280\u80FD\u8BC4\u4F30\uFF08\u6807\u660E\u8BC1\u636E\u6765\u6E90\u548C\u5F3A\u5EA6\uFF09
3. \u8C03\u6574\u7EFC\u5408\u8BC4\u5206\uFF08\u57FA\u4E8E\u8BC1\u636E\u652F\u6491\u7684\u9762\u8BD5\u8868\u73B0\uFF09
4. \u66F4\u65B0\u4F18\u52BF\u3001\u987E\u8651\u548C\u4FE1\u606F\u7F3A\u53E3\uFF08\u533A\u5206\u5DF2\u9A8C\u8BC1\u548C\u5F85\u9A8C\u8BC1\uFF09
5. \u89E3\u51B3\u68C0\u6D4B\u5230\u7684\u8BC1\u636E\u77DB\u76FE
6. \u91CD\u65B0\u751F\u6210 AI \u603B\u7ED3\uFF0C\u4F53\u73B0\u753B\u50CF\u6F14\u8FDB\u548C\u8BC1\u636E\u589E\u5F3A`;
        const estimatedTokens = this.estimateTokens(systemPrompt + userPrompt);
        this.log("info", "AI \u63D0\u793A\u8BCD Token \u4F30\u7B97", {
          candidateId: candidate.id,
          interviewId: latestInterview.id,
          estimatedTokens,
          breakdown: {
            systemPrompt: this.estimateTokens(systemPrompt),
            userPrompt: this.estimateTokens(userPrompt),
            evidenceSummary: this.estimateTokens(evidenceSummary),
            interviewHistory: this.estimateTokens(interviewHistory),
            transcription: this.estimateTokens(transcription)
          },
          withinLimit: estimatedTokens < TOKEN_LIMITS.MAX_TOTAL_TOKENS
        });
        if (estimatedTokens > TOKEN_LIMITS.MAX_TOTAL_TOKENS) {
          this.log("warn", "Token \u6570\u91CF\u8D85\u9650\uFF0C\u4F7F\u7528\u964D\u7EA7\u7B56\u7565", {
            candidateId: candidate.id,
            estimatedTokens,
            limit: TOKEN_LIMITS.MAX_TOTAL_TOKENS
          });
          return await this.generateUpdatedProfileWithAI(
            candidate,
            currentProfile,
            { ...latestInterview, transcription: null },
            // 移除转录
            allInterviews,
            job,
            newEvidence
          );
        }
        try {
          const result = await this.callAIWithRetry(
            {
              model: ADVANCED_MODEL,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
              ],
              response_format: { type: "json_object" },
              temperature: CONFIG.AI_TEMPERATURE
            },
            CandidateProfileDataSchema,
            CONFIG.MAX_RETRIES,
            {
              operation: "profile_update_with_interview",
              entityType: "interview",
              entityId: latestInterview.id,
              metadata: {
                candidateId: candidate.id,
                interviewRound: latestInterview.round,
                interviewType: latestInterview.type,
                hasJob: !!job,
                evidenceCount: newEvidence?.length || 0,
                contradictionsDetected: contradictions.length,
                estimatedTokens
              }
            }
          );
          const newDataSource = `\u7B2C${latestInterview.round}\u8F6E\u9762\u8BD5`;
          result.dataSources = Array.from(/* @__PURE__ */ new Set([
            ...previousDataSources,
            newDataSource
          ]));
          if (newEvidence) {
            const allEvidence2 = [...currentProfile.profileData.evidenceSummary?.evidence || [], ...newEvidence];
            result.evidenceSummary = {
              totalEvidence: allEvidence2.length,
              strongEvidence: allEvidence2.filter(
                (e) => e.strength === "direct" || e.strength === "strong"
              ).length,
              contradictions: 0,
              // TODO: 实现矛盾检测
              averageConfidence: allEvidence2.reduce(
                (sum, e) => sum + e.confidence,
                0
              ) / allEvidence2.length,
              mainSources: Array.from(new Set(allEvidence2.map((e) => this.getEvidenceSourceLabel(e.source))))
            };
          }
          return result;
        } catch (error) {
          this.log("error", "\u66F4\u65B0\u753B\u50CF\u65F6\u51FA\u9519", { candidateId: candidate.id, interviewId: latestInterview.id, error });
          throw new Error("AI \u753B\u50CF\u66F4\u65B0\u5931\u8D25: " + (error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF"));
        }
      }
      safeParseJSON(content, schema) {
        try {
          const parsed = JSON.parse(content);
          return schema.parse(parsed);
        } catch (error) {
          if (error instanceof z2.ZodError) {
            this.log("error", "AI \u8FD4\u56DE\u6570\u636E\u9A8C\u8BC1\u5931\u8D25", { errors: error.errors });
            throw new Error(`AI \u8FD4\u56DE\u6570\u636E\u683C\u5F0F\u4E0D\u6B63\u786E: ${error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`);
          }
          this.log("error", "JSON \u89E3\u6790\u5931\u8D25", { error });
          throw new Error("AI \u8FD4\u56DE\u7684\u4E0D\u662F\u6709\u6548\u7684 JSON \u683C\u5F0F");
        }
      }
      async callAIWithRetry(params, schema, maxRetries = CONFIG.MAX_RETRIES, trackingInfo) {
        let lastError = null;
        const startTime = Date.now();
        for (let i = 0; i < maxRetries; i++) {
          try {
            const response = await Promise.race([
              openai5.chat.completions.create(params),
              new Promise(
                (_, reject) => setTimeout(() => reject(new Error(`AI \u8C03\u7528\u8D85\u65F6\uFF08${CONFIG.AI_TIMEOUT_MS}ms\uFF09`)), CONFIG.AI_TIMEOUT_MS)
              )
            ]);
            const latencyMs = Date.now() - startTime;
            if (trackingInfo) {
              await aiTokenTracker.trackUsage({
                userId: trackingInfo.userId,
                operation: trackingInfo.operation,
                entityType: trackingInfo.entityType,
                entityId: trackingInfo.entityId,
                model: params.model,
                response,
                success: true,
                latencyMs,
                retryCount: i,
                metadata: {
                  ...trackingInfo.metadata,
                  temperature: params.temperature,
                  maxTokens: params.max_tokens
                }
              });
            }
            const content = response.choices[0].message.content;
            if (!content) {
              throw new Error("AI \u8FD4\u56DE\u7A7A\u54CD\u5E94");
            }
            return this.safeParseJSON(content, schema);
          } catch (error) {
            lastError = error;
            this.log("warn", `AI \u8C03\u7528\u7B2C ${i + 1} \u6B21\u5931\u8D25`, { error: lastError.message, attempt: i + 1 });
            if (i === maxRetries - 1 && trackingInfo) {
              const latencyMs = Date.now() - startTime;
              const dummyResponse = {
                id: "failed",
                object: "chat.completion",
                created: Math.floor(Date.now() / 1e3),
                model: params.model,
                choices: [],
                usage: {
                  prompt_tokens: 0,
                  completion_tokens: 0,
                  total_tokens: 0
                }
              };
              await aiTokenTracker.trackUsage({
                userId: trackingInfo.userId,
                operation: trackingInfo.operation,
                entityType: trackingInfo.entityType,
                entityId: trackingInfo.entityId,
                model: params.model,
                response: dummyResponse,
                success: false,
                errorMessage: lastError.message,
                latencyMs,
                retryCount: maxRetries,
                metadata: {
                  ...trackingInfo.metadata,
                  temperature: params.temperature,
                  maxTokens: params.max_tokens
                }
              });
            }
            if (i < maxRetries - 1) {
              await new Promise((resolve) => setTimeout(resolve, 1e3 * (i + 1)));
            }
          }
        }
        throw new Error(`AI \u8C03\u7528\u5931\u8D25\uFF08\u5DF2\u91CD\u8BD5 ${maxRetries} \u6B21\uFF09: ${lastError?.message}`);
      }
      sanitizeForPrompt(text2) {
        return text2.replace(/```/g, "'''").replace(/(忽略|ignore|forget|disregard|system|assistant|user)[\s]*[:：]/gi, "[\u5DF2\u8FC7\u6EE4]").substring(0, 1e4);
      }
      smartTruncate(text2, maxLength) {
        if (text2.length <= maxLength) return text2;
        const truncated = text2.substring(0, maxLength);
        const lastBreak = Math.max(
          truncated.lastIndexOf("\u3002"),
          truncated.lastIndexOf("\n"),
          truncated.lastIndexOf(" ")
        );
        return lastBreak > maxLength * 0.8 ? truncated.substring(0, lastBreak) + "..." : truncated + "...";
      }
      /**
       * ✨ 估算文本的 token 数量（粗略估算）
       * 中文约2.5字符 = 1 token
       */
      estimateTokens(text2) {
        return Math.ceil(text2.length / TOKEN_LIMITS.CHARS_PER_TOKEN);
      }
      /**
       * ✨ 智能截断文本到目标 token 数量
       * 优先在句子边界截断,保持语义完整性
       */
      truncateToTokenLimit(text2, maxTokens) {
        const maxChars = maxTokens * TOKEN_LIMITS.CHARS_PER_TOKEN;
        if (text2.length <= maxChars) {
          return text2;
        }
        const truncated = text2.substring(0, maxChars);
        const lastSentenceEnd = Math.max(
          truncated.lastIndexOf("\u3002"),
          truncated.lastIndexOf("\uFF01"),
          truncated.lastIndexOf("\uFF1F"),
          truncated.lastIndexOf("\n")
        );
        if (lastSentenceEnd > maxChars * 0.8) {
          return truncated.substring(0, lastSentenceEnd + 1) + "\n[\u5185\u5BB9\u5DF2\u622A\u65AD]";
        }
        return truncated + "\n[\u5185\u5BB9\u5DF2\u622A\u65AD]";
      }
      /**
       * ✨ 压缩历史面试记录
       * 只保留关键信息,避免冗余
       */
      summarizeInterviewHistory(allInterviews, latestInterview, maxTokens = TOKEN_LIMITS.MAX_HISTORY_TOKENS) {
        const previousInterviews = allInterviews.filter((iv) => iv.id !== latestInterview.id);
        if (previousInterviews.length === 0) {
          return "\u9996\u6B21\u9762\u8BD5";
        }
        const summaries = previousInterviews.map(
          (iv) => `\u7B2C${iv.round}\u8F6E${iv.type}\uFF1A${iv.rating || "N/A"}/5\uFF0C${iv.recommendation || "\u65E0"}`
        );
        let result = summaries.join("\n");
        if (this.estimateTokens(result) > maxTokens) {
          const recentSummaries = summaries.slice(-5);
          const omittedCount = summaries.length - recentSummaries.length;
          result = [
            `[\u7701\u7565\u524D ${omittedCount} \u8F6E\u9762\u8BD5]`,
            ...recentSummaries
          ].join("\n");
        }
        return result;
      }
      /**
       * ✨ 压缩证据摘要
       * 提供高层次统计信息,避免详细列举
       */
      buildEvidenceSummaryCompact(allEvidence, newEvidence, maxTokens = TOKEN_LIMITS.MAX_EVIDENCE_TOKENS) {
        const totalEvidence = allEvidence.length;
        const newEvidenceCount = newEvidence.length;
        const strongEvidence = allEvidence.filter(
          (e) => e.strength === "direct" || e.strength === "strong"
        );
        const averageConfidence = totalEvidence > 0 ? allEvidence.reduce((sum, e) => sum + (e.confidence || 50), 0) / totalEvidence : 0;
        const sources = Array.from(new Set(allEvidence.map((e) => this.getEvidenceSourceLabel(e.source))));
        let summary = `
- \u603B\u8BC1\u636E\u6570\uFF1A${totalEvidence} \u6761\uFF08\u672C\u8F6E\u65B0\u589E ${newEvidenceCount} \u6761\uFF09
- \u5F3A\u529B\u8BC1\u636E\uFF1A${strongEvidence.length} \u6761\uFF08${(strongEvidence.length / totalEvidence * 100).toFixed(0)}%\uFF09
- \u5E73\u5747\u7F6E\u4FE1\u5EA6\uFF1A${averageConfidence.toFixed(0)}%
- \u8BC1\u636E\u6765\u6E90\uFF1A${sources.join("\u3001")}
- \u8BC1\u636E\u5BC6\u5EA6\uFF1A${totalEvidence > 10 ? "\u5145\u5206" : totalEvidence > 5 ? "\u826F\u597D" : "\u4E00\u822C"}`;
        const currentTokens = this.estimateTokens(summary);
        const remainingTokens = maxTokens - currentTokens;
        if (remainingTokens > 500 && strongEvidence.length > 0) {
          const topEvidence = strongEvidence.sort((a, b) => (b.confidence || 0) - (a.confidence || 0)).slice(0, 3).map((e) => `  - ${e.originalText.substring(0, 100)}`).join("\n");
          summary += `

\u5173\u952E\u8BC1\u636E\u793A\u4F8B\uFF1A
${topEvidence}`;
        }
        return summary;
      }
      /**
       * 执行组织契合度评估
       */
      async performOrganizationalFitAssessment(candidate, stage, resumeAnalysis, interview, job, previousProfileData) {
        const assessmentData = {
          candidateName: candidate.name,
          stage,
          resumeSummary: resumeAnalysis?.summary || candidate.resumeAnalysis?.summary || "",
          skills: resumeAnalysis?.skills || candidate.resumeAnalysis?.skills || [],
          experience: resumeAnalysis?.experience || candidate.resumeAnalysis?.experience || 0
        };
        if (interview) {
          assessmentData.interviewFeedback = interview.feedback || "";
          assessmentData.interviewNotes = interview.interviewerNotes || "";
          assessmentData.interviewTranscription = interview.transcription || "";
          assessmentData.interviewRating = interview.rating || 0;
        }
        if (job) {
          assessmentData.jobTitle = job.title;
          assessmentData.jobDescription = job.description;
          assessmentData.jobRequirements = job.requirements;
        }
        const [cultureAssessment, leadershipAssessment] = await Promise.all([
          organizationalFitService.assessCultureFit(assessmentData, stage),
          organizationalFitService.assessLeadershipFramework(assessmentData, stage)
        ]);
        let evolutionData = null;
        if (previousProfileData?.organizationalFit) {
          const previousCulture = previousProfileData.organizationalFit.cultureAssessment;
          const previousLeadership = previousProfileData.organizationalFit.leadershipAssessment;
          if (previousCulture && previousLeadership) {
            evolutionData = organizationalFitService.generateEvolutionReport(
              [previousCulture, cultureAssessment],
              [previousLeadership, leadershipAssessment]
            );
          }
        }
        return {
          cultureAssessment,
          leadershipAssessment,
          ...evolutionData && { evolution: evolutionData }
        };
      }
      log(level, message, meta) {
        const timestamp2 = (/* @__PURE__ */ new Date()).toISOString();
        const logData = { timestamp: timestamp2, level, service: "CandidateProfileService", message, ...meta };
        console[level === "info" ? "log" : level](JSON.stringify(logData));
      }
      /**
       * 解析面试反馈数据，提取结构化的观察、技能验证和行为证据
       */
      parseInterviewFeedback(interview) {
        try {
          if (interview.feedback) {
            if (typeof interview.feedback === "string") {
              const parsed = JSON.parse(interview.feedback);
              return {
                observations: parsed.observations || {},
                skillsValidation: parsed.skillsValidation || [],
                behavioralEvidence: parsed.behavioralEvidence || []
              };
            } else if (typeof interview.feedback === "object") {
              const feedbackObj = interview.feedback;
              return {
                observations: feedbackObj.observations || {},
                skillsValidation: feedbackObj.skillsValidation || [],
                behavioralEvidence: feedbackObj.behavioralEvidence || []
              };
            }
          }
          const fallbackData = {
            observations: {},
            skillsValidation: [],
            behavioralEvidence: []
          };
          if (interview.interviewerNotes) {
            fallbackData.observations.strengths = [];
            fallbackData.observations.weaknesses = [];
            const notes = interview.interviewerNotes.toLowerCase();
            if (notes.includes("\u4F18\u52BF") || notes.includes("strengths") || notes.includes("good")) {
              fallbackData.observations.strengths.push(interview.interviewerNotes.substring(0, 200));
            }
            if (notes.includes("\u4E0D\u8DB3") || notes.includes("weaknesses") || notes.includes("concern")) {
              fallbackData.observations.weaknesses.push(interview.interviewerNotes.substring(0, 200));
            }
          }
          return fallbackData;
        } catch (error) {
          this.log("error", "\u89E3\u6790\u9762\u8BD5\u53CD\u9988\u5931\u8D25", {
            interviewId: interview.id,
            error: error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF"
          });
          return {
            observations: {},
            skillsValidation: [],
            behavioralEvidence: []
          };
        }
      }
      /**
       * 从简历分析生成声明（用于证据提取）
       */
      generateClaimsFromResumeAnalysis(resumeAnalysis) {
        const claims = [];
        for (const skill of resumeAnalysis.skills) {
          claims.push({
            statement: `\u5019\u9009\u4EBA\u638C\u63E1${skill}\u6280\u80FD`,
            type: "TECHNICAL_SKILL"
          });
        }
        if (resumeAnalysis.experience > 0) {
          claims.push({
            statement: `\u5019\u9009\u4EBA\u6709${resumeAnalysis.experience}\u5E74\u76F8\u5173\u5DE5\u4F5C\u7ECF\u9A8C`,
            type: "WORK_EXPERIENCE"
          });
        }
        for (const strength of resumeAnalysis.strengths) {
          claims.push({
            statement: strength,
            type: "STRENGTH"
          });
        }
        return claims;
      }
      /**
       * 为技能构建证据链
       */
      async buildSkillEvidenceChains(skills, evidence) {
        const chains = /* @__PURE__ */ new Map();
        for (const skill of skills) {
          const skillEvidence = evidence.filter(
            (e) => e.originalText.toLowerCase().includes(skill.toLowerCase())
          );
          if (skillEvidence.length > 0) {
            const claim = await evidenceService.createClaimWithEvidence(
              `\u5019\u9009\u4EBA\u638C\u63E1${skill}\u6280\u80FD`,
              "TECHNICAL_SKILL",
              skillEvidence
            );
            const chain = await evidenceService.buildEvidenceChain(claim);
            chains.set(skill, chain);
          }
        }
        return chains;
      }
      /**
       * 获取证据来源标签
       */
      getEvidenceSourceLabel(source) {
        const labels = {
          "resume": "\u7B80\u5386",
          "interview_feedback": "\u9762\u8BD5\u53CD\u9988",
          "behavioral_observation": "\u884C\u4E3A\u89C2\u5BDF",
          "test_result": "\u6D4B\u8BD5\u7ED3\u679C",
          "reference_check": "\u80CC\u666F\u8C03\u67E5",
          "work_sample": "\u5DE5\u4F5C\u6837\u672C",
          "ai_analysis": "AI\u5206\u6790",
          "public_profile": "\u516C\u5F00\u8D44\u6599",
          "certification": "\u8BC1\u4E66",
          "portfolio": "\u4F5C\u54C1\u96C6"
        };
        return labels[source] || source;
      }
      /**
       * 从候选人画像中提取历史证据
       */
      /**
       * ✨ 从候选人画像中提取所有历史证据
       * 确保证据链的完整性和连续性
       */
      extractEvidenceFromProfile(profile) {
        const evidence = [];
        try {
          const profileData = profile.profileData;
          this.extractSkillEvidence(profileData, evidence);
          this.extractExperienceEvidence(profileData, evidence);
          this.extractEducationEvidence(profileData, evidence);
          this.extractCulturalFitEvidence(profileData, evidence);
          this.extractCareerTrajectoryEvidence(profileData, evidence);
          this.extractOrganizationalFitEvidence(profileData, evidence);
          if (profileData.evidenceSummary?.evidence && Array.isArray(profileData.evidenceSummary.evidence)) {
            evidence.push(...profileData.evidenceSummary.evidence);
          }
          const deduped = this.deduplicateEvidence(evidence);
          this.log("info", "\u4ECE\u753B\u50CF\u4E2D\u63D0\u53D6\u5386\u53F2\u8BC1\u636E", {
            profileId: profile.id,
            totalExtracted: evidence.length,
            afterDedup: deduped.length,
            breakdown: {
              skills: evidence.filter((e) => e.source === "resume" || e.source === "interview").length,
              total: evidence.length
            }
          });
          return deduped;
        } catch (error) {
          this.log("error", "\u63D0\u53D6\u5386\u53F2\u8BC1\u636E\u5931\u8D25", {
            profileId: profile.id,
            error: error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF"
          });
          return [];
        }
      }
      /**
       * ✨ 提取技能证据（技术技能 + 软技能）
       */
      extractSkillEvidence(profileData, evidence) {
        if (!profileData) return;
        const skillTypes = ["technicalSkills", "softSkills"];
        for (const skillType of skillTypes) {
          const skills = profileData[skillType];
          if (!skills || !Array.isArray(skills) || skills.length === 0) continue;
          for (const skill of skills) {
            if (!skill) continue;
            if (skill.evidence && Array.isArray(skill.evidence)) {
              evidence.push(...skill.evidence);
            }
            if (skill.evidenceChain?.supportingEvidence && Array.isArray(skill.evidenceChain.supportingEvidence)) {
              evidence.push(...skill.evidenceChain.supportingEvidence);
            }
          }
        }
      }
      /**
       * ✨ 提取工作经验证据
       */
      extractExperienceEvidence(profileData, evidence) {
        if (!profileData?.experience) return;
        const { positions, evidence: expEvidence } = profileData.experience;
        if (positions && Array.isArray(positions) && positions.length > 0) {
          for (const position of positions) {
            if (!position) continue;
            if (position.evidence && Array.isArray(position.evidence)) {
              evidence.push(...position.evidence);
            }
            if (position.keyAchievements && Array.isArray(position.keyAchievements)) {
              for (const achievement of position.keyAchievements) {
                if (achievement && typeof achievement === "object" && achievement.evidence && Array.isArray(achievement.evidence)) {
                  evidence.push(...achievement.evidence);
                }
              }
            }
          }
        }
        if (expEvidence && Array.isArray(expEvidence)) {
          evidence.push(...expEvidence);
        }
      }
      /**
       * ✨ 提取教育背景证据
       */
      extractEducationEvidence(profileData, evidence) {
        if (profileData.education?.evidence && Array.isArray(profileData.education.evidence)) {
          evidence.push(...profileData.education.evidence);
        }
      }
      /**
       * ✨ 提取文化契合度证据
       */
      extractCulturalFitEvidence(profileData, evidence) {
        if (profileData.culturalFit?.evidence && Array.isArray(profileData.culturalFit.evidence)) {
          evidence.push(...profileData.culturalFit.evidence);
        }
        if (profileData.culturalFit?.workStyle?.evidence && Array.isArray(profileData.culturalFit.workStyle.evidence)) {
          evidence.push(...profileData.culturalFit.workStyle.evidence);
        }
      }
      /**
       * ✨ 提取职业发展轨迹证据
       */
      extractCareerTrajectoryEvidence(profileData, evidence) {
        if (profileData.careerTrajectory?.evidence && Array.isArray(profileData.careerTrajectory.evidence)) {
          evidence.push(...profileData.careerTrajectory.evidence);
        }
      }
      /**
       * ✨ 提取组织契合度证据（文化评估 + 领导力评估）
       */
      extractOrganizationalFitEvidence(profileData, evidence) {
        if (!profileData?.organizationalFit) return;
        if (profileData.organizationalFit.cultureAssessment?.valueAssessments && Array.isArray(profileData.organizationalFit.cultureAssessment.valueAssessments)) {
          for (const valueAssessment of profileData.organizationalFit.cultureAssessment.valueAssessments) {
            if (!valueAssessment?.evidence || !Array.isArray(valueAssessment.evidence)) continue;
            const evidenceObjects = valueAssessment.evidence.map((e) => {
              if (typeof e === "string") {
                const uniqueId = `cultural-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
                return {
                  id: uniqueId,
                  source: "ai_analysis",
                  originalText: e,
                  strength: "moderate",
                  confidence: 70,
                  timestamp: (/* @__PURE__ */ new Date()).toISOString()
                };
              }
              return e;
            });
            evidence.push(...evidenceObjects);
          }
        }
        if (profileData.organizationalFit.leadershipAssessment?.dimensionScores && Array.isArray(profileData.organizationalFit.leadershipAssessment.dimensionScores)) {
          for (const dimension of profileData.organizationalFit.leadershipAssessment.dimensionScores) {
            if (!dimension?.evidence || !Array.isArray(dimension.evidence)) continue;
            const evidenceObjects = dimension.evidence.map((e) => {
              if (typeof e === "string") {
                const uniqueId = `leadership-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
                return {
                  id: uniqueId,
                  source: "ai_analysis",
                  originalText: e,
                  strength: "moderate",
                  confidence: 70,
                  timestamp: (/* @__PURE__ */ new Date()).toISOString()
                };
              }
              return e;
            });
            evidence.push(...evidenceObjects);
          }
        }
      }
      /**
       * ✨ 证据去重 - 优化版 O(n)
       * 基于证据ID或内容哈希进行去重
       */
      deduplicateEvidence(evidence) {
        const seenIds = /* @__PURE__ */ new Set();
        const seenHashes = /* @__PURE__ */ new Set();
        const result = [];
        for (const e of evidence) {
          if (e.id) {
            if (seenIds.has(e.id)) continue;
            seenIds.add(e.id);
            result.push(e);
            continue;
          }
          const hash = this.hashEvidence(e);
          if (seenHashes.has(hash)) continue;
          seenHashes.add(hash);
          result.push(e);
        }
        return result;
      }
      /**
       * ✨ 生成证据内容哈希（用于去重）
       * 使用排序后的键确保一致性
       */
      hashEvidence(evidence) {
        const normalized = {
          confidence: evidence.confidence || 0,
          originalText: evidence.originalText || "",
          source: evidence.source || "",
          strength: evidence.strength || ""
        };
        const key = JSON.stringify(normalized);
        return Buffer.from(key).toString("base64");
      }
      /**
       * 检测证据矛盾
       */
      async detectEvidenceContradictions(allEvidence) {
        const contradictions = [];
        try {
          const evidenceByStatement = /* @__PURE__ */ new Map();
          for (const evidence of allEvidence) {
            const key = evidence.originalText.toLowerCase().substring(0, 50);
            if (!evidenceByStatement.has(key)) {
              evidenceByStatement.set(key, []);
            }
            evidenceByStatement.get(key).push(evidence);
          }
          for (const [statement, evidences] of evidenceByStatement.entries()) {
            if (evidences.length > 1) {
              const resumeEvidence = evidences.filter((e) => e.source === "resume" /* RESUME */);
              const interviewEvidence = evidences.filter((e) => e.source === "interview" /* INTERVIEW_FEEDBACK */);
              if (resumeEvidence.length > 0 && interviewEvidence.length > 0) {
                contradictions.push({
                  claim: statement,
                  description: `\u7B80\u5386\u58F0\u79F0\u4E0E\u9762\u8BD5\u9A8C\u8BC1\u5B58\u5728\u5DEE\u5F02`,
                  conflictingEvidence: [...resumeEvidence, ...interviewEvidence]
                });
              }
            }
          }
          this.log("info", "\u8BC1\u636E\u77DB\u76FE\u68C0\u6D4B\u5B8C\u6210", {
            totalEvidence: allEvidence.length,
            contradictionsFound: contradictions.length
          });
          return contradictions;
        } catch (error) {
          this.log("error", "\u8BC1\u636E\u77DB\u76FE\u68C0\u6D4B\u5931\u8D25", {
            error: error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF"
          });
          return [];
        }
      }
      /**
       * 构建证据摘要
       */
      buildEvidenceSummary(allEvidence, newEvidence) {
        const totalEvidence = allEvidence.length;
        const newEvidenceCount = newEvidence.length;
        const strongEvidence = allEvidence.filter(
          (e) => e.strength === "direct" || e.strength === "strong"
        );
        const averageConfidence = totalEvidence > 0 ? allEvidence.reduce((sum, e) => sum + (e.confidence || 50), 0) / totalEvidence : 0;
        const sources = Array.from(new Set(allEvidence.map((e) => this.getEvidenceSourceLabel(e.source))));
        return `
- \u603B\u8BC1\u636E\u6570\uFF1A${totalEvidence} \u6761\uFF08\u672C\u8F6E\u65B0\u589E ${newEvidenceCount} \u6761\uFF09
- \u5F3A\u529B\u8BC1\u636E\uFF1A${strongEvidence.length} \u6761\uFF08\u76F4\u63A5\u8BC1\u636E\u6216\u5F3A\u8BC1\u636E\uFF09
- \u5E73\u5747\u7F6E\u4FE1\u5EA6\uFF1A${averageConfidence.toFixed(0)}%
- \u8BC1\u636E\u6765\u6E90\uFF1A${sources.join("\u3001")}
- \u8BC1\u636E\u5BC6\u5EA6\uFF1A${totalEvidence > 10 ? "\u5145\u5206" : totalEvidence > 5 ? "\u826F\u597D" : "\u4E00\u822C"}`;
      }
      /**
       * 生成面试准备材料
       * 基于候选人当前画像和历史面试记录，为即将进行的面试生成AI准备材料
       */
      async generateInterviewPreparation(candidateId, interviewId, interviewerId) {
        this.log("info", `\u751F\u6210\u9762\u8BD5\u51C6\u5907\u6750\u6599 - \u5019\u9009\u4EBA: ${candidateId}, \u9762\u8BD5: ${interviewId}`);
        try {
          const [candidate, upcomingInterview] = await Promise.all([
            storage.getCandidate(candidateId),
            storage.getInterview(interviewId)
          ]);
          if (!candidate) {
            throw new Error(`\u5019\u9009\u4EBA\u4E0D\u5B58\u5728: ${candidateId}`);
          }
          if (!upcomingInterview) {
            throw new Error(`\u9762\u8BD5\u4E0D\u5B58\u5728: ${interviewId}`);
          }
          const [job, latestProfile, allInterviews] = await Promise.all([
            upcomingInterview.jobId ? storage.getJob(upcomingInterview.jobId) : Promise.resolve(null),
            storage.getLatestCandidateProfile(candidateId),
            storage.getInterviewsByCandidate(candidateId)
          ]);
          const completedInterviews = allInterviews.filter(
            (iv) => iv.status === "completed" && iv.feedback
          );
          const preparation = await this.generatePreparationContent(
            candidate,
            latestProfile ?? null,
            upcomingInterview,
            completedInterviews,
            job ?? null
          );
          const savedPreparation = await storage.createInterviewPreparation({
            candidateId,
            jobId: upcomingInterview.jobId,
            interviewId,
            generatedFor: interviewerId || upcomingInterview.interviewerId,
            status: "completed",
            candidateContext: preparation.candidateContext,
            suggestedQuestions: preparation.suggestedQuestions,
            focusAreas: preparation.focusAreas,
            previousGaps: preparation.previousGaps,
            interviewerTips: preparation.interviewerTips,
            version: 1,
            confidence: preparation.confidence,
            aiModel: DEFAULT_MODEL
          });
          this.log("info", `\u9762\u8BD5\u51C6\u5907\u6750\u6599\u751F\u6210\u6210\u529F - ID: ${savedPreparation.id}`);
          return savedPreparation;
        } catch (error) {
          this.log("error", "\u751F\u6210\u9762\u8BD5\u51C6\u5907\u6750\u6599\u5931\u8D25", { candidateId, interviewId, error });
          await storage.createInterviewPreparation({
            candidateId,
            interviewId,
            status: "failed",
            candidateContext: { error: error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF" },
            suggestedQuestions: [],
            focusAreas: [],
            aiModel: DEFAULT_MODEL
          });
          throw error;
        }
      }
      /**
       * 生成准备材料的核心内容
       */
      async generatePreparationContent(candidate, latestProfile, upcomingInterview, completedInterviews, job) {
        const systemPrompt = `\u4F60\u662F\u4E00\u4F4D\u7ECF\u9A8C\u4E30\u5BCC\u7684\u62DB\u8058\u4E13\u5BB6\uFF0C\u8D1F\u8D23\u4E3A\u9762\u8BD5\u5B98\u51C6\u5907\u9762\u8BD5\u6750\u6599\u3002

\u57FA\u4E8E\u5019\u9009\u4EBA\u7684\u5F53\u524D\u753B\u50CF\u548C\u5386\u53F2\u9762\u8BD5\u8BB0\u5F55\uFF0C\u751F\u6210\u4EE5\u4E0B\u5185\u5BB9\uFF1A

1. **\u5019\u9009\u4EBA\u72B6\u6001\u6458\u8981 (candidateContext)**\uFF1A
   - summary: \u7B80\u77ED\u603B\u7ED3\u5019\u9009\u4EBA\u5F53\u524D\u72B6\u6001\uFF08100\u5B57\u4EE5\u5185\uFF09
   - currentScore: \u5F53\u524D\u7EFC\u5408\u8BC4\u5206\uFF080-100\uFF09
   - strengths: \u5DF2\u9A8C\u8BC1\u7684\u4F18\u52BF\u9886\u57DF\uFF083-5\u4E2A\uFF09
   - concerns: \u9700\u8981\u5173\u6CE8\u6216\u8FDB\u4E00\u6B65\u9A8C\u8BC1\u7684\u70B9\uFF082-4\u4E2A\uFF09

2. **\u5EFA\u8BAE\u95EE\u9898 (suggestedQuestions)**\uFF085-7\u4E2A\uFF09\uFF1A
   - question: \u5177\u4F53\u95EE\u9898\u5185\u5BB9
   - purpose: \u63D0\u95EE\u7684\u76EE\u7684\u548C\u8BC4\u4F30\u7EF4\u5EA6
   - probing: \u8FFD\u95EE\u5EFA\u8BAE\uFF08\u53EF\u9009\uFF0C1-2\u4E2A\uFF09
   - category: \u95EE\u9898\u7C7B\u522B\uFF08technical/behavioral/situational/cultural\uFF09

3. **\u91CD\u70B9\u8003\u5BDF\u9886\u57DF (focusAreas)**\uFF083-5\u4E2A\uFF09\uFF1A
   - area: \u9700\u8981\u91CD\u70B9\u8003\u5BDF\u7684\u9886\u57DF
   - why: \u4E3A\u4EC0\u4E48\u9700\u8981\u8003\u5BDF
   - signals: \u9700\u8981\u89C2\u5BDF\u7684\u5173\u952E\u4FE1\u53F7\uFF082-3\u4E2A\uFF09
   - priority: \u4F18\u5148\u7EA7\uFF08high/medium/low\uFF09

4. **\u524D\u8F6E\u672A\u8986\u76D6\u70B9 (previousGaps)**\uFF1A
   - \u524D\u51E0\u8F6E\u9762\u8BD5\u4E2D\u672A\u5145\u5206\u8003\u5BDF\u7684\u91CD\u8981\u65B9\u9762\uFF08\u5B57\u7B26\u4E32\u6570\u7EC4\uFF09

5. **\u9762\u8BD5\u5B98\u63D0\u793A (interviewerTips)**\uFF1A
   - \u7ED9\u9762\u8BD5\u5B98\u7684\u5B9E\u7528\u5EFA\u8BAE\u548C\u6CE8\u610F\u4E8B\u9879\uFF08\u5B57\u7B26\u4E32\u6570\u7EC4\uFF09

\u8BF7\u786E\u4FDD\uFF1A
- \u95EE\u9898\u6709\u9488\u5BF9\u6027\uFF0C\u57FA\u4E8E\u5019\u9009\u4EBA\u80CC\u666F\u548C\u804C\u4F4D\u8981\u6C42
- \u907F\u514D\u91CD\u590D\u5DF2\u7ECF\u5145\u5206\u9A8C\u8BC1\u7684\u5185\u5BB9
- \u5173\u6CE8\u4FE1\u606F\u7F3A\u53E3\u548C\u6F5C\u5728\u98CE\u9669
- \u63D0\u4F9B\u53EF\u64CD\u4F5C\u7684\u5177\u4F53\u5EFA\u8BAE`;
        const profileData = latestProfile?.profileData || {};
        const interviewRound = upcomingInterview.round || completedInterviews.length + 1;
        const userPrompt = `**\u5019\u9009\u4EBA\u4FE1\u606F\uFF1A**
\u59D3\u540D\uFF1A${candidate.name}
\u5F53\u524D\u804C\u4F4D\uFF1A${candidate.position || "\u672A\u77E5"}
\u7ECF\u9A8C\u5E74\u9650\uFF1A${candidate.experience || 0}\u5E74
\u6280\u80FD\uFF1A${candidate.skills ? candidate.skills.join(", ") : "\u672A\u77E5"}

**\u76EE\u6807\u804C\u4F4D\uFF1A**
${job ? `${job.title} - ${job.department}
\u8981\u6C42\uFF1A${job.requirements ? job.requirements.join(", ") : ""}` : "\u672A\u6307\u5B9A"}

**\u5F53\u524D\u753B\u50CF\uFF08\u7248\u672C ${latestProfile?.version || 0}\uFF09\uFF1A**
\u7EFC\u5408\u8BC4\u5206\uFF1A${latestProfile?.overallScore || 70}/100
\u9636\u6BB5\uFF1A${latestProfile?.stage || "initial"}
${latestProfile?.aiSummary || "\u6682\u65E0\u603B\u7ED3"}

\u6280\u672F\u6280\u80FD\uFF1A${profileData.technicalSkills?.map((s) => `${s.skill}(${s.proficiency})`).join(", ") || "\u5F85\u8BC4\u4F30"}
\u8F6F\u6280\u80FD\uFF1A${profileData.softSkills?.map((s) => s.skill).join(", ") || "\u5F85\u8BC4\u4F30"}

**\u5386\u53F2\u9762\u8BD5\uFF08${completedInterviews.length}\u8F6E\uFF09\uFF1A**
${completedInterviews.map(
          (iv) => `\u7B2C${iv.round}\u8F6E ${iv.type}\uFF1A\u8BC4\u5206${iv.rating || "N/A"}/5\uFF0C${iv.recommendation || "\u65E0\u5EFA\u8BAE"}`
        ).join("\n") || "\u9996\u6B21\u9762\u8BD5"}

**\u5373\u5C06\u8FDB\u884C\u7684\u9762\u8BD5\uFF1A**
\u7B2C${interviewRound}\u8F6E ${upcomingInterview.type}\u9762\u8BD5

\u8BF7\u751F\u6210\u9762\u8BD5\u51C6\u5907\u6750\u6599\uFF0C\u91CD\u70B9\u5173\u6CE8\uFF1A
1. \u57FA\u4E8E\u5DF2\u6709\u4FE1\u606F\uFF0C\u8FD8\u9700\u8981\u9A8C\u8BC1\u4EC0\u4E48\uFF1F
2. \u8FD9\u8F6E\u9762\u8BD5\u7684\u91CD\u70B9\u5E94\u8BE5\u662F\u4EC0\u4E48\uFF1F
3. \u5982\u4F55\u5E2E\u52A9\u9762\u8BD5\u5B98\u505A\u51FA\u51C6\u786E\u5224\u65AD\uFF1F`;
        try {
          const completion = await openai5.chat.completions.create({
            model: ADVANCED_MODEL,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.3
          });
          const content = completion.choices[0].message.content || "{}";
          const result = JSON.parse(content);
          return {
            candidateContext: candidateContextSchema.parse(result.candidateContext || {
              summary: `${candidate.name}\uFF0C${candidate.experience || 0}\u5E74\u7ECF\u9A8C`,
              currentScore: latestProfile?.overallScore || 70,
              strengths: profileData.strengths || [],
              concerns: profileData.concerns || []
            }),
            suggestedQuestions: z2.array(suggestedQuestionSchema).parse(
              result.suggestedQuestions || []
            ),
            focusAreas: z2.array(focusAreaSchema).parse(
              result.focusAreas || []
            ),
            previousGaps: result.previousGaps || [],
            interviewerTips: result.interviewerTips || [],
            confidence: Math.round((result.confidence || 0.8) * 100)
          };
        } catch (error) {
          this.log("error", "AI\u751F\u6210\u51C6\u5907\u6750\u6599\u5931\u8D25", { error });
          return this.generateFallbackPreparation(
            candidate,
            latestProfile,
            upcomingInterview,
            completedInterviews
          );
        }
      }
      /**
       * 生成备用的基础准备材料（当AI服务失败时）
       */
      generateFallbackPreparation(candidate, profile, upcomingInterview, completedInterviews) {
        const round = upcomingInterview.round || completedInterviews.length + 1;
        return {
          candidateContext: {
            summary: `${candidate.name}\uFF0C${candidate.experience || 0}\u5E74\u7ECF\u9A8C\uFF0C\u7B2C${round}\u8F6E${upcomingInterview.type}\u9762\u8BD5`,
            currentScore: profile?.overallScore || 70,
            strengths: ["\u7ECF\u9A8C\u4E30\u5BCC", "\u6280\u672F\u624E\u5B9E"],
            concerns: ["\u9700\u8FDB\u4E00\u6B65\u9A8C\u8BC1", "\u6587\u5316\u5951\u5408\u5EA6\u5F85\u8BC4\u4F30"]
          },
          suggestedQuestions: [
            {
              question: "\u8BF7\u4ECB\u7ECD\u60A8\u6700\u6709\u6311\u6218\u6027\u7684\u9879\u76EE\u7ECF\u5386",
              purpose: "\u8BC4\u4F30\u95EE\u9898\u89E3\u51B3\u80FD\u529B\u548C\u6280\u672F\u6DF1\u5EA6",
              category: "behavioral"
            },
            {
              question: "\u60A8\u5982\u4F55\u770B\u5F85\u56E2\u961F\u534F\u4F5C\uFF1F",
              purpose: "\u8BC4\u4F30\u56E2\u961F\u5408\u4F5C\u80FD\u529B",
              category: "cultural"
            }
          ],
          focusAreas: [
            {
              area: "\u6280\u672F\u80FD\u529B",
              why: "\u6838\u5FC3\u5C97\u4F4D\u8981\u6C42",
              signals: ["\u89E3\u51B3\u95EE\u9898\u7684\u601D\u8DEF", "\u6280\u672F\u6DF1\u5EA6"],
              priority: "high"
            }
          ],
          previousGaps: ["\u9886\u5BFC\u529B", "\u9879\u76EE\u7BA1\u7406\u7ECF\u9A8C"],
          interviewerTips: ["\u6CE8\u610F\u89C2\u5BDF\u5019\u9009\u4EBA\u7684\u6C9F\u901A\u65B9\u5F0F", "\u6DF1\u5165\u4E86\u89E3\u5176\u804C\u4E1A\u89C4\u5212"],
          confidence: 60
        };
      }
    };
    candidateProfileService = new CandidateProfileService();
  }
});

// server/services/companyConfigService.ts
import { z as z3 } from "zod";
var DEFAULT_CONFIG, CompanyConfigSchema, CompanyConfigService, companyConfigService;
var init_companyConfigService = __esm({
  "server/services/companyConfigService.ts"() {
    "use strict";
    DEFAULT_CONFIG = {
      companyName: "Default Company",
      cultureConfig: {
        values: [
          {
            name: "\u521B\u65B0\u9A71\u52A8",
            description: "\u62E5\u62B1\u53D8\u5316\uFF0C\u52C7\u4E8E\u521B\u65B0\uFF0C\u6301\u7EED\u63A2\u7D22\u65B0\u7684\u53EF\u80FD\u6027",
            behaviorIndicators: [
              "\u4E3B\u52A8\u63D0\u51FA\u65B0\u60F3\u6CD5\u548C\u6539\u8FDB\u5EFA\u8BAE",
              "\u4E50\u4E8E\u5C1D\u8BD5\u65B0\u65B9\u6CD5\u548C\u65B0\u6280\u672F",
              "\u80FD\u591F\u8DF3\u51FA\u4F20\u7EDF\u601D\u7EF4\u6846\u67B6",
              "\u4ECE\u5931\u8D25\u4E2D\u5B66\u4E60\u5E76\u5FEB\u901F\u8FED\u4EE3"
            ],
            assessmentQuestions: [
              "\u8BF7\u63CF\u8FF0\u4E00\u4E2A\u60A8\u63D0\u51FA\u521B\u65B0\u89E3\u51B3\u65B9\u6848\u7684\u4F8B\u5B50",
              "\u60A8\u5982\u4F55\u770B\u5F85\u5931\u8D25\uFF1F\u80FD\u5426\u5206\u4EAB\u4E00\u6B21\u5931\u8D25\u7684\u7ECF\u5386\uFF1F",
              "\u5728\u5DE5\u4F5C\u4E2D\uFF0C\u60A8\u662F\u5982\u4F55\u4FDD\u6301\u5B66\u4E60\u548C\u521B\u65B0\u7684\uFF1F"
            ],
            weight: 0.25
          },
          {
            name: "\u5BA2\u6237\u81F3\u4E0A",
            description: "\u4EE5\u5BA2\u6237\u4E3A\u4E2D\u5FC3\uFF0C\u8D85\u8D8A\u5BA2\u6237\u671F\u671B\uFF0C\u521B\u9020\u5353\u8D8A\u4EF7\u503C",
            behaviorIndicators: [
              "\u6DF1\u5165\u7406\u89E3\u5BA2\u6237\u9700\u6C42",
              "\u4E3B\u52A8\u5BFB\u6C42\u5BA2\u6237\u53CD\u9988",
              "\u4E3A\u5BA2\u6237\u521B\u9020\u8D85\u9884\u671F\u7684\u4EF7\u503C",
              "\u5FEB\u901F\u54CD\u5E94\u5BA2\u6237\u95EE\u9898"
            ],
            assessmentQuestions: [
              "\u8BF7\u5206\u4EAB\u4E00\u4E2A\u60A8\u8D85\u8D8A\u5BA2\u6237\u671F\u671B\u7684\u7ECF\u5386",
              "\u5F53\u5BA2\u6237\u9700\u6C42\u4E0E\u516C\u53F8\u5229\u76CA\u51B2\u7A81\u65F6\uFF0C\u60A8\u5982\u4F55\u5904\u7406\uFF1F",
              "\u60A8\u5982\u4F55\u7406\u89E3'\u5BA2\u6237\u6210\u529F'\uFF1F"
            ],
            weight: 0.25
          },
          {
            name: "\u56E2\u961F\u534F\u4F5C",
            description: "\u5F00\u653E\u534F\u4F5C\uFF0C\u4E92\u76F8\u6210\u5C31\uFF0C\u5171\u540C\u6210\u957F",
            behaviorIndicators: [
              "\u79EF\u6781\u5206\u4EAB\u77E5\u8BC6\u548C\u7ECF\u9A8C",
              "\u4E3B\u52A8\u5E2E\u52A9\u56E2\u961F\u6210\u5458",
              "\u5584\u4E8E\u8DE8\u90E8\u95E8\u534F\u4F5C",
              "\u80FD\u591F\u5904\u7406\u56E2\u961F\u51B2\u7A81"
            ],
            assessmentQuestions: [
              "\u8BF7\u63CF\u8FF0\u4E00\u6B21\u6210\u529F\u7684\u56E2\u961F\u534F\u4F5C\u7ECF\u5386",
              "\u5F53\u56E2\u961F\u610F\u89C1\u4E0D\u4E00\u81F4\u65F6\uFF0C\u60A8\u5982\u4F55\u5904\u7406\uFF1F",
              "\u60A8\u5982\u4F55\u5E2E\u52A9\u56E2\u961F\u6210\u5458\u6210\u957F\uFF1F"
            ],
            weight: 0.25
          },
          {
            name: "\u7ED3\u679C\u5BFC\u5411",
            description: "\u76EE\u6807\u660E\u786E\uFF0C\u6267\u884C\u6709\u529B\uFF0C\u8FFD\u6C42\u5353\u8D8A\u7ED3\u679C",
            behaviorIndicators: [
              "\u8BBE\u5B9A\u6E05\u6670\u53EF\u8861\u91CF\u7684\u76EE\u6807",
              "\u5236\u5B9A\u8BE6\u7EC6\u7684\u6267\u884C\u8BA1\u5212",
              "\u6301\u7EED\u8DDF\u8E2A\u548C\u4F18\u5316\u7ED3\u679C",
              "\u5BF9\u7ED3\u679C\u8D1F\u8D23"
            ],
            assessmentQuestions: [
              "\u8BF7\u5206\u4EAB\u4E00\u4E2A\u60A8\u6210\u529F\u8FBE\u6210\u6311\u6218\u6027\u76EE\u6807\u7684\u4F8B\u5B50",
              "\u5F53\u8D44\u6E90\u6709\u9650\u65F6\uFF0C\u60A8\u5982\u4F55\u786E\u4FDD\u8FBE\u6210\u76EE\u6807\uFF1F",
              "\u60A8\u5982\u4F55\u5E73\u8861\u901F\u5EA6\u548C\u8D28\u91CF\uFF1F"
            ],
            weight: 0.25
          }
        ],
        assessmentGuidelines: "\u8BC4\u4F30\u5019\u9009\u4EBA\u4E0E\u516C\u53F8\u6587\u5316\u4EF7\u503C\u89C2\u7684\u5951\u5408\u5EA6\uFF0C\u91CD\u70B9\u5173\u6CE8\u884C\u4E3A\u8BC1\u636E\u548C\u4EF7\u503C\u89C2\u8BA4\u540C",
        fitThreshold: 70
      },
      leadershipConfig: {
        dimensions: [
          {
            name: "\u6218\u7565\u601D\u7EF4",
            description: "\u80FD\u591F\u770B\u5230\u5927\u5C40\uFF0C\u5236\u5B9A\u957F\u671F\u6218\u7565\uFF0C\u5E76\u5C06\u5176\u8F6C\u5316\u4E3A\u53EF\u6267\u884C\u7684\u8BA1\u5212",
            levels: {
              individualContributor: [
                "\u7406\u89E3\u56E2\u961F\u76EE\u6807\u548C\u4F18\u5148\u7EA7",
                "\u80FD\u5C06\u65E5\u5E38\u5DE5\u4F5C\u4E0E\u56E2\u961F\u76EE\u6807\u5173\u8054"
              ],
              emergingLeader: [
                "\u80FD\u5236\u5B9A\u5C0F\u56E2\u961F\u7684\u5DE5\u4F5C\u8BA1\u5212",
                "\u5F00\u59CB\u601D\u8003\u8DE8\u804C\u80FD\u5F71\u54CD"
              ],
              developingLeader: [
                "\u5236\u5B9A\u90E8\u95E8\u7EA7\u6218\u7565",
                "\u80FD\u591F\u5E73\u8861\u77ED\u671F\u548C\u957F\u671F\u76EE\u6807"
              ],
              matureLeader: [
                "\u5236\u5B9A\u7EC4\u7EC7\u7EA7\u6218\u7565",
                "\u9884\u89C1\u884C\u4E1A\u8D8B\u52BF\u5E76\u5236\u5B9A\u5E94\u5BF9\u7B56\u7565"
              ]
            },
            assessmentCriteria: [
              "\u6218\u7565\u89C4\u5212\u80FD\u529B",
              "\u7CFB\u7EDF\u601D\u8003\u80FD\u529B",
              "\u524D\u77BB\u6027\u548C\u6D1E\u5BDF\u529B"
            ],
            weight: 0.25
          },
          {
            name: "\u56E2\u961F\u9886\u5BFC",
            description: "\u6FC0\u53D1\u56E2\u961F\u6F5C\u80FD\uFF0C\u57F9\u517B\u4EBA\u624D\uFF0C\u5EFA\u8BBE\u9AD8\u6548\u56E2\u961F",
            levels: {
              individualContributor: [
                "\u6709\u6548\u534F\u4F5C\u548C\u6C9F\u901A",
                "\u4E3B\u52A8\u5E2E\u52A9\u540C\u4E8B"
              ],
              emergingLeader: [
                "\u80FD\u591F\u6307\u5BFC1-2\u540D\u56E2\u961F\u6210\u5458",
                "\u7EC4\u7EC7\u5C0F\u578B\u9879\u76EE\u56E2\u961F"
              ],
              developingLeader: [
                "\u7BA1\u74065-10\u4EBA\u56E2\u961F",
                "\u5236\u5B9A\u56E2\u961F\u53D1\u5C55\u8BA1\u5212"
              ],
              matureLeader: [
                "\u9886\u5BFC\u591A\u4E2A\u56E2\u961F\u6216\u5927\u578B\u56E2\u961F",
                "\u5EFA\u7ACB\u4EBA\u624D\u68AF\u961F\u548C\u7EE7\u4EFB\u8BA1\u5212"
              ]
            },
            assessmentCriteria: [
              "\u56E2\u961F\u5EFA\u8BBE\u80FD\u529B",
              "\u4EBA\u624D\u57F9\u517B\u80FD\u529B",
              "\u6FC0\u52B1\u548C\u6388\u6743\u80FD\u529B"
            ],
            weight: 0.25
          },
          {
            name: "\u6267\u884C\u529B",
            description: "\u5C06\u6218\u7565\u8F6C\u5316\u4E3A\u7ED3\u679C\uFF0C\u514B\u670D\u969C\u788D\uFF0C\u6301\u7EED\u4EA4\u4ED8\u4EF7\u503C",
            levels: {
              individualContributor: [
                "\u9AD8\u8D28\u91CF\u5B8C\u6210\u4E2A\u4EBA\u4EFB\u52A1",
                "\u6309\u65F6\u4EA4\u4ED8\u627F\u8BFA"
              ],
              emergingLeader: [
                "\u534F\u8C03\u8D44\u6E90\u5B8C\u6210\u9879\u76EE",
                "\u5904\u7406\u6267\u884C\u4E2D\u7684\u95EE\u9898"
              ],
              developingLeader: [
                "\u7BA1\u7406\u590D\u6742\u9879\u76EE\u548C\u591A\u4E2A\u4F18\u5148\u7EA7",
                "\u5EFA\u7ACB\u6267\u884C\u76D1\u63A7\u673A\u5236"
              ],
              matureLeader: [
                "\u63A8\u52A8\u7EC4\u7EC7\u7EA7\u53D8\u9769",
                "\u5EFA\u7ACB\u6267\u884C\u6587\u5316"
              ]
            },
            assessmentCriteria: [
              "\u8BA1\u5212\u548C\u7EC4\u7EC7\u80FD\u529B",
              "\u95EE\u9898\u89E3\u51B3\u80FD\u529B",
              "\u7ED3\u679C\u4EA4\u4ED8\u80FD\u529B"
            ],
            weight: 0.25
          },
          {
            name: "\u5F71\u54CD\u529B",
            description: "\u5EFA\u7ACB\u4FE1\u4EFB\uFF0C\u5F71\u54CD\u4ED6\u4EBA\uFF0C\u63A8\u52A8\u7EC4\u7EC7\u53D8\u9769",
            levels: {
              individualContributor: [
                "\u6E05\u6670\u8868\u8FBE\u89C2\u70B9",
                "\u5728\u56E2\u961F\u4E2D\u6709\u4E00\u5B9A\u5F71\u54CD\u529B"
              ],
              emergingLeader: [
                "\u80FD\u8BF4\u670D\u4ED6\u4EBA\u63A5\u53D7\u5EFA\u8BAE",
                "\u5F00\u59CB\u5EFA\u7ACB\u8DE8\u90E8\u95E8\u5173\u7CFB"
              ],
              developingLeader: [
                "\u5F71\u54CD\u90E8\u95E8\u7EA7\u51B3\u7B56",
                "\u5EFA\u7ACB\u5E7F\u6CDB\u7684\u5185\u90E8\u7F51\u7EDC"
              ],
              matureLeader: [
                "\u5F71\u54CD\u7EC4\u7EC7\u6218\u7565\u65B9\u5411",
                "\u5728\u884C\u4E1A\u5185\u6709\u5F71\u54CD\u529B"
              ]
            },
            assessmentCriteria: [
              "\u6C9F\u901A\u548C\u8868\u8FBE\u80FD\u529B",
              "\u5173\u7CFB\u5EFA\u7ACB\u80FD\u529B",
              "\u53D8\u9769\u63A8\u52A8\u80FD\u529B"
            ],
            weight: 0.25
          }
        ],
        assessmentGuidelines: "\u8BC4\u4F30\u5019\u9009\u4EBA\u7684\u9886\u5BFC\u529B\u6F5C\u529B\u548C\u5F53\u524D\u6C34\u5E73\uFF0C\u5173\u6CE8\u5B9E\u9645\u8868\u73B0\u548C\u53D1\u5C55\u6F5C\u529B",
        promotionCriteria: {
          toEmergingLeader: 60,
          toDevelopingLeader: 75,
          toMatureLeader: 90
        }
      },
      interviewConfig: {
        stageWeights: {
          resume: 0.2,
          interview_1: 0.3,
          interview_2: 0.3,
          final: 0.2
        },
        confidenceAdjustment: {
          resume: 0.6,
          interview_1: 0.8,
          interview_2: 0.9,
          final: 1
        }
      }
    };
    CompanyConfigSchema = z3.object({
      companyName: z3.string().min(1),
      cultureConfig: z3.object({
        values: z3.array(z3.object({
          name: z3.string().min(1),
          description: z3.string().min(1),
          behaviorIndicators: z3.array(z3.string()),
          assessmentQuestions: z3.array(z3.string()),
          weight: z3.number().min(0).max(1)
        })).min(1),
        assessmentGuidelines: z3.string(),
        fitThreshold: z3.number().min(0).max(100)
      }),
      leadershipConfig: z3.object({
        dimensions: z3.array(z3.object({
          name: z3.string().min(1),
          description: z3.string().min(1),
          levels: z3.object({
            individualContributor: z3.array(z3.string()),
            emergingLeader: z3.array(z3.string()),
            developingLeader: z3.array(z3.string()),
            matureLeader: z3.array(z3.string())
          }),
          assessmentCriteria: z3.array(z3.string()),
          weight: z3.number().min(0).max(1)
        })).min(1),
        assessmentGuidelines: z3.string(),
        promotionCriteria: z3.object({
          toEmergingLeader: z3.number().min(0).max(100),
          toDevelopingLeader: z3.number().min(0).max(100),
          toMatureLeader: z3.number().min(0).max(100)
        })
      }),
      interviewConfig: z3.object({
        stageWeights: z3.object({
          resume: z3.number().min(0).max(1),
          interview_1: z3.number().min(0).max(1),
          interview_2: z3.number().min(0).max(1),
          final: z3.number().min(0).max(1)
        }),
        confidenceAdjustment: z3.object({
          resume: z3.number().min(0).max(1),
          interview_1: z3.number().min(0).max(1),
          interview_2: z3.number().min(0).max(1),
          final: z3.number().min(0).max(1)
        })
      })
    });
    CompanyConfigService = class {
      constructor() {
        this.currentConfig = null;
        this.configCache = /* @__PURE__ */ new Map();
      }
      /**
       * 获取当前公司配置
       */
      async getCurrentConfig() {
        if (this.currentConfig) {
          return this.currentConfig;
        }
        this.currentConfig = DEFAULT_CONFIG;
        return this.currentConfig;
      }
      /**
       * 更新公司配置
       */
      async updateConfig(config) {
        const currentConfig = await this.getCurrentConfig();
        const updatedConfig = {
          ...currentConfig,
          ...config,
          updatedAt: /* @__PURE__ */ new Date()
        };
        const validation = CompanyConfigSchema.safeParse(updatedConfig);
        if (!validation.success) {
          throw new Error(`\u914D\u7F6E\u9A8C\u8BC1\u5931\u8D25: ${validation.error.message}`);
        }
        this.currentConfig = updatedConfig;
        return updatedConfig;
      }
      /**
       * 获取文化价值观配置
       */
      async getCultureValues() {
        const config = await this.getCurrentConfig();
        return config.cultureConfig.values;
      }
      /**
       * 获取领导力维度配置
       */
      async getLeadershipDimensions() {
        const config = await this.getCurrentConfig();
        return config.leadershipConfig.dimensions;
      }
      /**
       * 获取面试阶段权重
       */
      async getStageWeights() {
        const config = await this.getCurrentConfig();
        return config.interviewConfig.stageWeights;
      }
      /**
       * 获取置信度调整系数
       */
      async getConfidenceAdjustment() {
        const config = await this.getCurrentConfig();
        return config.interviewConfig.confidenceAdjustment;
      }
      /**
       * 验证权重总和
       */
      validateWeights(weights) {
        const sum = weights.reduce((acc, w) => acc + w, 0);
        return Math.abs(sum - 1) < 0.01;
      }
      /**
       * 导出配置为JSON
       */
      async exportConfig() {
        const config = await this.getCurrentConfig();
        return JSON.stringify(config, null, 2);
      }
      /**
       * 从JSON导入配置
       */
      async importConfig(jsonString) {
        try {
          const config = JSON.parse(jsonString);
          return await this.updateConfig(config);
        } catch (error) {
          throw new Error(`\u914D\u7F6E\u5BFC\u5165\u5931\u8D25: ${error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF"}`);
        }
      }
      /**
       * 重置为默认配置
       */
      async resetToDefault() {
        return await this.updateConfig(DEFAULT_CONFIG);
      }
      /**
       * 生成面试问题建议
       */
      async generateInterviewQuestions(stage) {
        const config = await this.getCurrentConfig();
        const cultureQuestions = [];
        const leadershipQuestions = [];
        if (stage === "interview_1") {
          config.cultureConfig.values.slice(0, 2).forEach((value) => {
            cultureQuestions.push(...value.assessmentQuestions.slice(0, 1));
          });
          config.leadershipConfig.dimensions.slice(0, 2).forEach((dim) => {
            leadershipQuestions.push(
              `\u8BF7\u63CF\u8FF0\u60A8\u5728${dim.name}\u65B9\u9762\u7684\u7ECF\u9A8C\u6216\u7406\u89E3`
            );
          });
        } else if (stage === "interview_2") {
          config.cultureConfig.values.forEach((value) => {
            cultureQuestions.push(...value.assessmentQuestions.slice(1, 2));
          });
          config.leadershipConfig.dimensions.forEach((dim) => {
            leadershipQuestions.push(
              `\u5728${dim.name}\u65B9\u9762\uFF0C\u60A8\u8BA4\u4E3A\u81EA\u5DF1\u5904\u4E8E\u4EC0\u4E48\u6C34\u5E73\uFF1F\u8BF7\u4E3E\u4F8B\u8BF4\u660E`
            );
          });
        } else {
          cultureQuestions.push(
            "\u60A8\u5982\u4F55\u7406\u89E3\u6211\u4EEC\u7684\u4F01\u4E1A\u6587\u5316\uFF1F",
            "\u60A8\u8BA4\u4E3A\u81EA\u5DF1\u4E0E\u6211\u4EEC\u7684\u4EF7\u503C\u89C2\u6709\u54EA\u4E9B\u5951\u5408\u70B9\uFF1F",
            "\u5982\u679C\u4EF7\u503C\u89C2\u4E0E\u5DE5\u4F5C\u76EE\u6807\u51B2\u7A81\uFF0C\u60A8\u5982\u4F55\u5904\u7406\uFF1F"
          );
          leadershipQuestions.push(
            "\u60A8\u7684\u9886\u5BFC\u98CE\u683C\u662F\u4EC0\u4E48\uFF1F",
            "\u60A8\u5982\u4F55\u5B9A\u4E49\u804C\u4E1A\u6210\u529F\uFF1F",
            "\u672A\u67653-5\u5E74\uFF0C\u60A8\u5E0C\u671B\u5728\u9886\u5BFC\u529B\u65B9\u9762\u8FBE\u5230\u4EC0\u4E48\u6C34\u5E73\uFF1F"
          );
        }
        return {
          culture: cultureQuestions,
          leadership: leadershipQuestions
        };
      }
    };
    companyConfigService = new CompanyConfigService();
  }
});

// server/services/supabaseStorage.ts
import { createClient as createClient2 } from "@supabase/supabase-js";
var supabase, RESUME_BUCKET, SupabaseStorageService, supabaseStorageService;
var init_supabaseStorage = __esm({
  "server/services/supabaseStorage.ts"() {
    "use strict";
    if (!process.env.SUPABASE_URL) {
      throw new Error("SUPABASE_URL environment variable is required");
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is required");
    }
    supabase = createClient2(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    RESUME_BUCKET = "resumes";
    SupabaseStorageService = class {
      /**
       * 确保 resumes bucket 存在
       * 如果不存在则创建（首次运行时）
       */
      async ensureBucketExists() {
        try {
          console.log("Listing existing buckets...");
          const { data: buckets, error: listError } = await supabase.storage.listBuckets();
          if (listError) {
            console.error("Error listing buckets:", listError);
            return;
          }
          console.log("Existing buckets:", buckets?.map((b) => b.name));
          const bucketExists = buckets?.some((bucket) => bucket.name === RESUME_BUCKET);
          console.log(`Bucket ${RESUME_BUCKET} exists:`, bucketExists);
          if (!bucketExists) {
            console.log(`Creating ${RESUME_BUCKET} bucket...`);
            const { error: createError } = await supabase.storage.createBucket(RESUME_BUCKET, {
              public: false,
              // 私有 bucket，需要签名 URL 访问
              fileSizeLimit: 10485760,
              // 10MB 限制
              allowedMimeTypes: [
                "application/pdf"
              ]
            });
            if (createError) {
              console.error("Error creating bucket:", createError);
            } else {
              console.log(`${RESUME_BUCKET} bucket created successfully`);
            }
          } else {
            console.log(`${RESUME_BUCKET} bucket already exists`);
          }
        } catch (error) {
          console.error("Error ensuring bucket exists:", error);
        }
      }
      /**
       * 上传简历文件到 Supabase Storage
       * @param candidateId 候选人 ID
       * @param fileBuffer 文件二进制数据
       * @param filename 原始文件名
       * @param contentType 文件 MIME 类型
       * @returns 文件在 storage 中的路径
       */
      async uploadResume(candidateId, fileBuffer, filename, contentType) {
        const allowedTypes = [
          "application/pdf"
        ];
        if (!allowedTypes.includes(contentType)) {
          throw new Error(
            `Invalid file type: ${contentType}. Only PDF files are allowed.`
          );
        }
        const maxSize = 10 * 1024 * 1024;
        if (fileBuffer.length > maxSize) {
          throw new Error(
            `File too large: ${(fileBuffer.length / 1024 / 1024).toFixed(2)}MB. Maximum allowed: 10MB.`
          );
        }
        const timestamp2 = Date.now();
        const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filePath = `${candidateId}/${timestamp2}-${sanitizedFilename}`;
        const { data, error } = await supabase.storage.from(RESUME_BUCKET).upload(filePath, fileBuffer, {
          contentType,
          upsert: false,
          // 不覆盖已存在的文件
          cacheControl: "3600"
          // 1小时缓存
        });
        if (error) {
          console.error("Error uploading file to Supabase Storage:", error);
          throw new Error(`Failed to upload file: ${error.message}`);
        }
        console.log(`File uploaded successfully: ${data.path}`);
        return data.path;
      }
      /**
       * 获取简历文件的签名访问 URL
       * @param filePath 文件在 storage 中的路径
       * @param expiresIn 签名 URL 有效期（秒），默认 1 小时
       * @returns 签名 URL
       */
      async getResumeSignedUrl(filePath, expiresIn = 3600) {
        const { data, error } = await supabase.storage.from(RESUME_BUCKET).createSignedUrl(filePath, expiresIn);
        if (error) {
          console.error("Error creating signed URL:", error);
          throw new Error(`Failed to create signed URL: ${error.message}`);
        }
        if (!data?.signedUrl) {
          throw new Error("No signed URL returned from Supabase");
        }
        return data.signedUrl;
      }
      /**
       * 删除简历文件
       * @param filePath 文件在 storage 中的路径
       */
      async deleteResume(filePath) {
        const { error } = await supabase.storage.from(RESUME_BUCKET).remove([filePath]);
        if (error) {
          console.error("Error deleting file:", error);
          throw new Error(`Failed to delete file: ${error.message}`);
        }
        console.log(`File deleted successfully: ${filePath}`);
      }
      /**
       * 列出候选人的所有简历文件
       * @param candidateId 候选人 ID
       * @returns 文件列表
       */
      async listCandidateResumes(candidateId) {
        const { data, error } = await supabase.storage.from(RESUME_BUCKET).list(candidateId);
        if (error) {
          console.error("Error listing files:", error);
          throw new Error(`Failed to list files: ${error.message}`);
        }
        return (data || []).map((file) => ({
          name: file.name,
          path: `${candidateId}/${file.name}`,
          size: file.metadata?.size || 0,
          createdAt: file.created_at
        }));
      }
      /**
       * 生成预签名上传 URL
       * @param candidateId 候选人 ID
       * @param filename 文件名
       * @param expiresIn 签名 URL 有效期（秒），默认 1 小时
       * @returns 预签名上传 URL
       */
      async createPresignedUploadUrl(candidateId, filename, expiresIn = 3600) {
        const timestamp2 = Date.now();
        const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filePath = `${candidateId}/${timestamp2}_${sanitizedFilename}`;
        const { data, error } = await supabase.storage.from(RESUME_BUCKET).createSignedUploadUrl(filePath);
        if (error) {
          console.error("Error creating presigned upload URL:", error);
          throw new Error(`Failed to create presigned upload URL: ${error.message}`);
        }
        if (!data?.signedUrl) {
          throw new Error("No presigned upload URL returned from Supabase");
        }
        return data.signedUrl;
      }
      /**
       * 下载简历文件内容
       * @param filePath 文件在 storage 中的路径
       * @returns 文件二进制数据
       */
      async downloadResume(filePath) {
        const { data, error } = await supabase.storage.from(RESUME_BUCKET).download(filePath);
        if (error) {
          console.error("Error downloading file:", error);
          throw new Error(`Failed to download file: ${error.message}`);
        }
        if (!data) {
          throw new Error("No file data returned from Supabase");
        }
        const arrayBuffer = await data.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }
      /**
       * 获取文件的公共 URL（仅适用于公共 bucket）
       * 注意：当前配置为私有 bucket，应使用 getResumeSignedUrl
       * @param filePath 文件路径
       * @returns 公共 URL
       */
      getPublicUrl(filePath) {
        const { data } = supabase.storage.from(RESUME_BUCKET).getPublicUrl(filePath);
        return data.publicUrl;
      }
    };
    supabaseStorageService = new SupabaseStorageService();
    console.log("Initializing Supabase Storage Service...");
    supabaseStorageService.ensureBucketExists().then(() => {
      console.log("Bucket initialization completed");
    }).catch((err) => {
      console.error("Failed to ensure bucket exists:", err);
    });
  }
});

// server/middleware/auth.ts
import { createClient as createClient3 } from "@supabase/supabase-js";
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }
    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase2.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }
    req.supabaseUser = user;
    const userProfile = await resolveOrProvisionUser(user);
    if (!userProfile) {
      return res.status(401).json({ error: "Unauthorized: User profile missing" });
    }
    req.user = {
      id: userProfile.id,
      email: userProfile.email,
      role: userProfile.role
    };
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({ error: "Unauthorized" });
  }
}
async function resolveOrProvisionUser(supabaseUser) {
  try {
    const existing = await storage.getUser(supabaseUser.id);
    if (existing) {
      return existing;
    }
  } catch (error) {
    console.error("[Auth] \u26A0\uFE0F Failed to load user from storage:", error);
  }
  const email = supabaseUser.email;
  if (!email) {
    console.warn("[Auth] Supabase user has no email, cannot auto-provision profile.");
    return void 0;
  }
  const derivedName = (typeof supabaseUser.user_metadata?.full_name === "string" && supabaseUser.user_metadata.full_name.trim().length > 0 ? supabaseUser.user_metadata.full_name : email.split("@")[0]) || "Recruiter";
  const payload = {
    email,
    password: "supabase-managed",
    name: derivedName,
    role: "recruiter"
  };
  try {
    const created = await storage.createUser({ ...payload, id: supabaseUser.id });
    console.log("[Auth] \u2705 Auto-provisioned user profile for", email);
    return created;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/duplicate key|unique constraint/i.test(message)) {
      try {
        const existing = await storage.getUser(supabaseUser.id);
        if (existing) {
          return existing;
        }
      } catch (secondError) {
        console.error("[Auth] \u26A0\uFE0F Failed to reload user after duplicate error:", secondError);
      }
    } else {
      console.error("[Auth] \u274C Failed to auto-provision user profile:", error);
    }
  }
  return void 0;
}
async function requireAuthWithInit(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.warn("[Auth] \u26A0\uFE0F Missing or invalid Authorization header");
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }
    const token = authHeader.substring(7);
    console.log("[Auth] \u{1F510} Verifying Supabase token...");
    const { data: { user }, error: authError } = await supabase2.auth.getUser(token);
    if (authError) {
      console.error("[Auth] \u274C Supabase auth error:", authError.message);
      return res.status(401).json({ error: "Unauthorized: Invalid token", details: authError.message });
    }
    if (!user) {
      console.error("[Auth] \u274C No user returned from Supabase");
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }
    console.log("[Auth] \u2705 Token valid for user:", user.id);
    req.supabaseUser = user;
    const resolvedProfile = await resolveOrProvisionUser(user);
    if (resolvedProfile) {
      req.user = {
        id: resolvedProfile.id,
        email: resolvedProfile.email,
        role: resolvedProfile.role
      };
      console.log("[Auth] \u2705 User profile ready:", resolvedProfile.email);
    } else {
      req.user = {
        id: user.id,
        email: user.email || "",
        role: "recruiter"
      };
      console.warn("[Auth] \u26A0\uFE0F Falling back to Supabase auth data for user:", user.email);
    }
    next();
  } catch (error) {
    console.error("[Auth] \u274C Unexpected error in auth middleware:", error.message);
    console.error("[Auth] Stack trace:", error.stack);
    return res.status(500).json({
      error: "Internal server error during authentication",
      details: process.env.NODE_ENV === "development" ? error.message : void 0
    });
  }
}
var supabaseUrl, supabaseServiceKey, supabase2;
var init_auth = __esm({
  "server/middleware/auth.ts"() {
    "use strict";
    init_storage();
    supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
    supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    if (!supabaseUrl || !supabaseServiceKey) {
      const missing = [];
      if (!supabaseUrl) missing.push("SUPABASE_URL");
      if (!supabaseServiceKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
      console.error("[Auth Middleware] \u274C \u81F4\u547D\u9519\u8BEF: \u7F3A\u5C11\u5FC5\u9700\u7684\u73AF\u5883\u53D8\u91CF:", missing.join(", "));
      console.error("[Auth Middleware] \u{1F4A1} \u8BF7\u5728 Vercel Dashboard \u2192 Settings \u2192 Environment Variables \u4E2D\u914D\u7F6E");
      console.error("[Auth Middleware] \u{1F4CB} \u9700\u8981\u914D\u7F6E\u7684\u53D8\u91CF:", {
        SUPABASE_URL: "https://xxx.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "eyJxxx..."
      });
    }
    supabase2 = createClient3(supabaseUrl, supabaseServiceKey);
  }
});

// shared/types/interview.ts
function generateStageId(round, type, subRound) {
  if (type === "resume" /* RESUME */) {
    return "resume";
  }
  let stageId = `interview_${round}`;
  if (type !== "technical" /* TECHNICAL */) {
    stageId += `_${type}`;
  }
  if (subRound) {
    stageId += `_${subRound}`;
  }
  return stageId;
}
var init_interview = __esm({
  "shared/types/interview.ts"() {
    "use strict";
  }
});

// server/services/interviewFeedbackService.ts
var interviewFeedbackService_exports = {};
__export(interviewFeedbackService_exports, {
  InterviewFeedbackService: () => InterviewFeedbackService,
  interviewFeedbackService: () => interviewFeedbackService
});
var InterviewFeedbackService, interviewFeedbackService;
var init_interviewFeedbackService = __esm({
  "server/services/interviewFeedbackService.ts"() {
    "use strict";
    init_storage();
    init_candidateProfileService();
    init_organizationalFitService();
    init_openaiService();
    init_interview();
    InterviewFeedbackService = class {
      constructor() {
        this.profileService = new CandidateProfileService();
        this.orgFitService = new OrganizationalFitService();
      }
      /**
       * 提交面试反馈并触发画像更新
       */
      async submitFeedbackAndUpdateProfile(candidateId, jobId, feedback) {
        try {
          await this.saveFeedback(feedback);
          const latestProfile = await this.getLatestProfile(candidateId);
          const roundFeedbacks = await this.getRoundFeedbacks(
            candidateId,
            feedback.round,
            feedback.interviewType
          );
          const updatedProfileData = await this.integrateFeedbackIntoProfile(
            latestProfile,
            roundFeedbacks,
            feedback
          );
          const stageId = generateStageId(
            feedback.round,
            feedback.interviewType
          );
          const newProfile = await this.createUpdatedProfile(
            candidateId,
            jobId,
            stageId,
            updatedProfileData,
            latestProfile
          );
          if (feedback.scores.cultureFit || feedback.scores.leadership) {
            await this.updateOrganizationalFit(newProfile, feedback);
          }
          return newProfile;
        } catch (error) {
          console.error("Failed to submit feedback and update profile:", error);
          throw error;
        }
      }
      /**
       * 保存面试反馈
       */
      async saveFeedback(feedback) {
        await storage.updateInterview(feedback.interviewId, {
          feedback: JSON.stringify(feedback.observations),
          rating: feedback.scores.overall,
          interviewerNotes: feedback.additionalNotes ?? null,
          updatedAt: /* @__PURE__ */ new Date()
        });
      }
      /**
       * 获取最新画像
       */
      async getLatestProfile(candidateId) {
        const profiles = await storage.getCandidateProfiles(candidateId);
        if (profiles.length === 0) {
          throw new Error("No profile found for candidate");
        }
        const sortedProfiles = profiles.sort((a, b) => (b.version || 0) - (a.version || 0));
        return sortedProfiles[0];
      }
      /**
       * 获取某轮次的所有反馈
       */
      async getRoundFeedbacks(candidateId, round, type) {
        const roundInterviews = await storage.getInterviewsByCandidate(candidateId);
        const roundFilteredInterviews = roundInterviews.filter((i) => i.round === round);
        return roundFilteredInterviews.filter((i) => i.feedback).map((i) => JSON.parse(i.feedback));
      }
      /**
       * 使用 AI 整合反馈到画像
       */
      async integrateFeedbackIntoProfile(currentProfile, allFeedbacks, latestFeedback) {
        const currentData = currentProfile.profileData;
        const prompt = `
You are an expert HR analyst integrating interview feedback into a candidate profile.

Current Profile Data:
${JSON.stringify(currentData, null, 2)}

Interview Round: ${latestFeedback.round}
Interview Type: ${latestFeedback.interviewType}

Latest Interview Feedback:
${JSON.stringify(latestFeedback, null, 2)}

All Feedback from This Round:
${JSON.stringify(allFeedbacks, null, 2)}

Task: Update the candidate profile by integrating the interview feedback.

Focus on:
1. Validating or adjusting technical skills based on actual assessment
2. Adding newly discovered skills or competencies
3. Updating soft skills based on observed behaviors
4. Refining cultural fit assessment
5. Adjusting career trajectory insights
6. Adding specific behavioral evidence

Important:
- Preserve all existing valid information
- Add new insights from the interview
- Adjust any assessments that were proven incorrect
- Increase confidence levels for validated skills
- Add specific examples and evidence from the interview

Return the updated ProfileData JSON that incorporates all feedback while maintaining the same structure.
`;
        const response = await openai2.chat.completions.create({
          model: "gpt-4-turbo-preview",
          messages: [
            {
              role: "system",
              content: "You are an expert at analyzing interview feedback and updating candidate profiles. Always return valid JSON matching the ProfileData schema."
            },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.3
        });
        return JSON.parse(response.choices[0].message.content || "{}");
      }
      /**
       * 创建更新后的画像
       */
      async createUpdatedProfile(candidateId, jobId, stage, profileData, previousProfile) {
        const analysis = await this.analyzeProfileChanges(profileData, previousProfile);
        const newProfile = {
          candidateId,
          jobId,
          stage,
          version: (previousProfile.version || 0) + 1,
          profileData,
          overallScore: analysis.overallScore.toString(),
          strengths: analysis.strengths,
          concerns: analysis.concerns,
          gaps: analysis.gaps,
          aiSummary: analysis.summary,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        };
        const created = await storage.createCandidateProfile(newProfile);
        return created;
      }
      /**
       * 分析画像变化
       */
      async analyzeProfileChanges(newData, previousProfile) {
        const previousData = previousProfile.profileData;
        const prompt = `
Compare the previous and updated candidate profiles and provide an analysis.

Previous Profile:
${JSON.stringify(previousData, null, 2)}

Updated Profile After Interview:
${JSON.stringify(newData, null, 2)}

Provide:
1. An updated overall score (0-100) based on all available information
2. Top 3-5 confirmed strengths
3. Any new or remaining concerns
4. Any gaps that still need to be assessed
5. A brief summary of how the candidate's profile has evolved

Return as JSON with keys: overallScore, strengths (array), concerns (array), gaps (array), summary
`;
        const response = await openai2.chat.completions.create({
          model: "gpt-4-turbo-preview",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.3
        });
        return JSON.parse(response.choices[0].message.content || "{}");
      }
      /**
       * 更新组织契合度评估
       */
      async updateOrganizationalFit(profile, feedback) {
        const profileData = profile.profileData;
        if (feedback.scores.cultureFit !== void 0) {
          const cultureUpdate = await this.orgFitService.assessCultureAlignment(
            profileData,
            {
              feedbackScore: feedback.scores.cultureFit,
              observations: feedback.observations.strengths.concat(
                feedback.observations.weaknesses || []
              )
            }
          );
          const valueAssessments = (cultureUpdate.valueAssessments || []).map((value) => {
            const alignmentLevel = value.score >= 80 ? "strong" : value.score >= 60 ? "moderate" : "weak";
            return {
              valueName: value.valueName,
              score: value.score,
              evidence: value.evidence,
              confidence: value.confidence,
              alignmentLevel
            };
          });
          profileData.organizationalFit = {
            ...profileData.organizationalFit || {},
            cultureAssessment: {
              ...cultureUpdate,
              culturalStrengths: cultureUpdate.strengths || [],
              culturalRisks: cultureUpdate.risks || [],
              valueAssessments
            }
          };
        }
        if (feedback.scores.leadership !== void 0) {
        }
        await storage.updateCandidateProfile(profile.id, {
          profileData,
          updatedAt: /* @__PURE__ */ new Date()
        });
      }
      /**
       * 获取候选人的面试进程
       */
      async getCandidateInterviewProcess(candidateId, jobId) {
        const allProfiles = await storage.getCandidateProfiles(candidateId);
        const profiles = allProfiles.filter((p) => p.jobId === jobId).sort((a, b) => (a.version || 0) - (b.version || 0));
        const completedStages = profiles.map((p) => ({
          stageId: p.stage,
          round: this.extractRoundFromStage(p.stage),
          type: this.extractTypeFromStage(p.stage),
          timestamp: p.createdAt || /* @__PURE__ */ new Date(),
          version: p.version || 1,
          triggerType: "auto",
          metadata: {
            confidence: 85
            // 示例值
          }
        }));
        const currentRound = completedStages.length > 0 ? Math.max(...completedStages.map((s) => s.round)) : 0;
        return {
          candidateId,
          jobId,
          currentRound,
          currentStage: profiles[profiles.length - 1]?.stage || "resume",
          completedStages,
          status: "in_progress"
        };
      }
      extractRoundFromStage(stage) {
        const match = stage.match(/interview_(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      }
      extractTypeFromStage(stage) {
        if (stage === "resume") return "resume" /* RESUME */;
        const typeMatch = stage.match(/interview_\d+_([a-z_]+)/);
        if (typeMatch) {
          return typeMatch[1];
        }
        return "technical" /* TECHNICAL */;
      }
    };
    interviewFeedbackService = new InterviewFeedbackService();
  }
});

// server/config/hiringDecision.ts
var HIRING_DECISION_CONFIG;
var init_hiringDecision = __esm({
  "server/config/hiringDecision.ts"() {
    "use strict";
    HIRING_DECISION_CONFIG = {
      // 默认薪酬配置
      SALARY: {
        DEFAULT_BASE: 5e4,
        MULTIPLIER_MAX: 1.5
      },
      // 成长潜力时间框架
      GROWTH_TIMEFRAME: "12-18 months",
      // 决策权重配置（根据职位类型）
      WEIGHTS: {
        // 技术岗位权重
        TECHNICAL_HEAVY: {
          interview: 0.3,
          overall: 0.2,
          technical: 0.4,
          cultural: 0.1
        },
        // 平衡权重
        BALANCED: {
          interview: 0.4,
          overall: 0.3,
          technical: 0.2,
          cultural: 0.1
        },
        // 文化契合度重要的岗位
        CULTURAL_HEAVY: {
          interview: 0.3,
          overall: 0.2,
          technical: 0.2,
          cultural: 0.3
        }
      },
      // 决策阈值
      DECISION_THRESHOLDS: {
        HIRE: 75,
        NEXT_ROUND: 60,
        HOLD: 50,
        REJECT: 40
      },
      // 风险评估阈值
      RISK_THRESHOLDS: {
        STABILITY_LOW: 30,
        STABILITY_MEDIUM: 50,
        CULTURE_FIT_POOR: 40,
        EXPERIENCE_MIN_YEARS: 2
      },
      // 能力评估阈值
      CAPABILITY_THRESHOLDS: {
        HIGH_PERFORMER: 80,
        SOLID_FOUNDATION: 60,
        DEVELOPING: 40
      },
      // 学习敏捷性阈值
      LEARNING_AGILITY_THRESHOLDS: {
        HIGH_POTENTIAL: 80,
        STEADY_GROWTH: 60,
        MODERATE_GROWTH: 40
      },
      // 技能熟练度分数
      PROFICIENCY_SCORES: {
        expert: 100,
        advanced: 80,
        intermediate: 60,
        beginner: 40
      }
    };
  }
});

// server/services/hiringDecisionService.ts
var hiringDecisionService_exports = {};
__export(hiringDecisionService_exports, {
  HiringDecisionService: () => HiringDecisionService,
  hiringDecisionService: () => hiringDecisionService
});
var HiringDecisionService, hiringDecisionService;
var init_hiringDecisionService = __esm({
  "server/services/hiringDecisionService.ts"() {
    "use strict";
    init_storage();
    init_hiringDecision();
    init_aiService();
    HiringDecisionService = class {
      /**
       * 生成综合的招聘决策建议
       */
      async generateHiringDecision(candidateId, jobId, userId) {
        try {
          const [
            candidate,
            job,
            interviews2,
            profile,
            existingDecision,
            otherCandidates
          ] = await Promise.all([
            storage.getCandidate(candidateId),
            storage.getJob(jobId),
            storage.getInterviewsByCandidate(candidateId),
            storage.getLatestCandidateProfile(candidateId),
            storage.getHiringDecision(candidateId, jobId),
            storage.getCandidatesForJob(jobId)
          ]);
          if (existingDecision) {
            console.log(`[HiringDecision] Decision already exists for candidate ${candidateId} and job ${jobId}`);
            return existingDecision;
          }
          if (!candidate || !job) {
            throw new Error("Candidate or job not found");
          }
          const interviewAnalysis = this.analyzeInterviews(interviews2 || []);
          const profileAnalysis = this.analyzeProfile(profile);
          const { decision, confidence } = this.calculateDecision(
            interviewAnalysis,
            profileAnalysis,
            job
          );
          const analysis = await this.generateDetailedAnalysis(
            candidate,
            job,
            interviews2 || [],
            profile
          );
          const comparison = this.generateComparison(
            candidate,
            otherCandidates || [],
            profileAnalysis
          );
          const compensation = this.generateCompensationRecommendation(
            candidate,
            job,
            profileAnalysis
          );
          const nextSteps = this.generateNextSteps(decision, analysis);
          const recommendationText = await this.generateRecommendationText(
            decision,
            candidate,
            job,
            analysis
          );
          const hiringDecision = {
            candidateId,
            jobId,
            decision,
            confidence,
            recommendation: recommendationText,
            strengths: analysis.strengths,
            weaknesses: analysis.weaknesses,
            riskAssessment: analysis.riskFactors,
            growthPotential: analysis.growthPotential,
            culturalFit: analysis.culturalAlignmentDetails,
            comparisonWithOthers: comparison,
            alternativeRoles: this.suggestAlternativeRoles(candidate, profileAnalysis),
            conditions: decision === "hire" ? this.generateHiringConditions(analysis) : null,
            nextSteps,
            timelineSuggestion: this.generateTimelineSuggestion(decision, analysis),
            compensationRange: compensation,
            negotiationPoints: this.generateNegotiationPoints(candidate, job, analysis),
            decidedBy: userId || null,
            decidedAt: /* @__PURE__ */ new Date(),
            status: "draft"
          };
          const savedDecision = await storage.createHiringDecision(hiringDecision);
          console.log(`[HiringDecision] Generated decision ${savedDecision.id} for candidate ${candidateId}`);
          return savedDecision;
        } catch (error) {
          console.error("Failed to generate hiring decision:", error);
          throw error;
        }
      }
      /**
       * 分析面试反馈
       */
      analyzeInterviews(interviews2) {
        const completedInterviews = interviews2.filter((i) => i.status === "completed");
        if (completedInterviews.length === 0) {
          return {
            averageRating: 0,
            totalInterviews: 0,
            recommendations: {
              hire: 0,
              reject: 0,
              nextRound: 0
            },
            keyFeedback: []
          };
        }
        const ratings = completedInterviews.map((i) => i.rating).filter((r) => r !== null);
        const recommendations = completedInterviews.map((i) => i.recommendation).filter((r) => r !== null);
        return {
          averageRating: ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
          totalInterviews: completedInterviews.length,
          recommendations: {
            hire: recommendations.filter((r) => r === "hire").length,
            reject: recommendations.filter((r) => r === "reject").length,
            nextRound: recommendations.filter((r) => r === "next-round").length
          },
          keyFeedback: completedInterviews.map((i) => i.feedback).filter((f) => f !== null)
        };
      }
      /**
       * 分析候选人档案
       */
      analyzeProfile(profile) {
        if (!profile) {
          return {
            overallScore: 0,
            technicalFit: 0,
            culturalFit: 0,
            experienceMatch: 0,
            hasRedFlags: false
          };
        }
        const profileData = profile.profileData || {};
        const overallScore = profile.overallScore ? Number(profile.overallScore) : 0;
        return {
          overallScore,
          technicalFit: this.calculateTechnicalFit(profileData),
          culturalFit: profileData.organizationalFit?.cultureAssessment?.overallScore || 0,
          experienceMatch: this.calculateExperienceMatch(profileData),
          hasRedFlags: this.checkForRedFlags(profileData)
        };
      }
      /**
       * 计算技术匹配度
       */
      calculateTechnicalFit(profileData) {
        const skills = profileData.technicalSkills || [];
        if (skills.length === 0) return 0;
        const totalScore = skills.reduce((acc, skill) => {
          const proficiency = skill.proficiency || "intermediate";
          return acc + (HIRING_DECISION_CONFIG.PROFICIENCY_SCORES[proficiency] || 0);
        }, 0);
        return Math.min(100, totalScore / skills.length);
      }
      /**
       * 计算经验匹配度
       */
      calculateExperienceMatch(profileData) {
        const experience = profileData.experience;
        if (!experience) return 0;
        let score = Math.min(100, (experience.totalYears || 0) * 10);
        if (experience.relevantYears) {
          score = Math.min(100, score + experience.relevantYears * 5);
        }
        return score;
      }
      /**
       * 检查红旗信号
       */
      checkForRedFlags(profileData) {
        const redFlags = [];
        const thresholds = HIRING_DECISION_CONFIG.RISK_THRESHOLDS;
        if (profileData.careerTrajectory?.stabilityScore < thresholds.STABILITY_LOW) {
          redFlags.push("low_stability");
        }
        if (profileData.organizationalFit?.cultureAssessment?.overallScore < thresholds.CULTURE_FIT_POOR) {
          redFlags.push("poor_cultural_fit");
        }
        return redFlags.length > 0;
      }
      /**
       * 根据职位类型获取权重
       */
      getWeightsForJobType(job) {
        const title = job.title.toLowerCase();
        const department = job.department?.toLowerCase() || "";
        if (title.includes("engineer") || title.includes("developer") || title.includes("architect") || department.includes("tech")) {
          return HIRING_DECISION_CONFIG.WEIGHTS.TECHNICAL_HEAVY;
        }
        if (title.includes("culture") || title.includes("hr") || title.includes("people") || department.includes("people")) {
          return HIRING_DECISION_CONFIG.WEIGHTS.CULTURAL_HEAVY;
        }
        return HIRING_DECISION_CONFIG.WEIGHTS.BALANCED;
      }
      /**
       * 计算最终决策
       */
      calculateDecision(interviewAnalysis, profileAnalysis, job) {
        const weights = this.getWeightsForJobType(job);
        const normalizedScores = {
          interview: interviewAnalysis.averageRating || 0,
          overall: profileAnalysis.overallScore || 0,
          technical: profileAnalysis.technicalFit || 0,
          cultural: profileAnalysis.culturalFit || 0
        };
        const weightedScore = normalizedScores.interview * weights.interview + normalizedScores.overall * weights.overall + normalizedScores.technical * weights.technical + normalizedScores.cultural * weights.cultural;
        const dataCompleteness = [
          interviewAnalysis.totalInterviews > 0,
          profileAnalysis.overallScore > 0,
          interviewAnalysis.keyFeedback.length > 0,
          normalizedScores.technical > 0,
          normalizedScores.cultural > 0
        ].filter(Boolean).length / 5;
        const confidence = Math.round(dataCompleteness * 100);
        const thresholds = HIRING_DECISION_CONFIG.DECISION_THRESHOLDS;
        let decision;
        if (profileAnalysis.hasRedFlags || weightedScore < thresholds.REJECT) {
          decision = "reject";
        } else if (weightedScore >= thresholds.HIRE && interviewAnalysis.recommendations.hire > interviewAnalysis.recommendations.reject) {
          decision = "hire";
        } else if (weightedScore >= thresholds.NEXT_ROUND) {
          decision = "next-round";
        } else if (weightedScore >= thresholds.HOLD) {
          decision = "hold";
        } else {
          decision = "reject";
        }
        return { decision, confidence };
      }
      /**
       * 生成详细分析 - 使用 AI 增强
       */
      async generateDetailedAnalysis(candidate, job, interviews2, profile) {
        const profileData = profile?.profileData || {};
        const basicAnalysis = {
          strengths: this.extractStrengths(profileData, interviews2),
          weaknesses: this.extractWeaknesses(profileData, interviews2),
          riskFactors: this.assessRisks(candidate, profileData),
          growthPotential: {
            currentCapability: this.assessCurrentCapability(profileData),
            futureProjection: this.projectFutureGrowth(profileData),
            timeframe: HIRING_DECISION_CONFIG.GROWTH_TIMEFRAME,
            developmentAreas: this.identifyDevelopmentAreas(profileData)
          },
          culturalFitScore: profileData.organizationalFit?.cultureAssessment?.overallScore || 0,
          culturalAlignmentDetails: {
            aligned: profileData.organizationalFit?.cultureAssessment?.culturalStrengths || [],
            misaligned: profileData.organizationalFit?.cultureAssessment?.culturalRisks || [],
            neutral: []
          }
        };
        try {
          const aiEnhancedAnalysis = await this.enhanceAnalysisWithAI(
            candidate,
            job,
            interviews2,
            basicAnalysis
          );
          return aiEnhancedAnalysis;
        } catch (error) {
          console.error("AI enhancement failed, using basic analysis:", error);
          return basicAnalysis;
        }
      }
      /**
       * 使用 AI 增强分析
       */
      async enhanceAnalysisWithAI(candidate, job, interviews2, basicAnalysis) {
        const interviewFeedback = interviews2.filter((i) => i.feedback).map((i) => i.feedback).join("\n");
        const prompt = `\u4F5C\u4E3A\u8D44\u6DF1 HR \u4E13\u5BB6\uFF0C\u8BF7\u57FA\u4E8E\u4EE5\u4E0B\u4FE1\u606F\u5206\u6790\u5019\u9009\u4EBA\uFF1A

\u5019\u9009\u4EBA\uFF1A${candidate.name}
\u804C\u4F4D\uFF1A${job.title}
\u90E8\u95E8\uFF1A${job.department || "\u672A\u6307\u5B9A"}
\u804C\u4F4D\u8981\u6C42\uFF1A${job.requirements || "\u672A\u6307\u5B9A"}

\u9762\u8BD5\u53CD\u9988\uFF1A
${interviewFeedback || "\u6682\u65E0\u9762\u8BD5\u53CD\u9988"}

\u521D\u6B65\u5206\u6790\uFF1A
\u4F18\u52BF\uFF1A${basicAnalysis.strengths.join(", ")}
\u52A3\u52BF\uFF1A${basicAnalysis.weaknesses.join(", ")}

\u8BF7\u63D0\u4F9B\uFF1A
1. 3-5\u4E2A\u6838\u5FC3\u4F18\u52BF\uFF08\u57FA\u4E8E\u5B9E\u9645\u8868\u73B0\uFF09
2. 3-5\u4E2A\u9700\u8981\u5173\u6CE8\u7684\u70B9
3. \u98CE\u9669\u8BC4\u4F30\u548C\u7F13\u89E3\u5EFA\u8BAE
4. \u6210\u957F\u6F5C\u529B\u5206\u6790

\u8BF7\u7528\u4E2D\u6587\u56DE\u590D\uFF0C\u8FD4\u56DE JSON \u683C\u5F0F\uFF1A
{
  "strengths": ["\u4F18\u52BF1", "\u4F18\u52BF2", ...],
  "weaknesses": ["\u52A3\u52BF1", "\u52A3\u52BF2", ...],
  "riskFactors": [
    {"risk": "\u98CE\u9669\u63CF\u8FF0", "impact": "high/medium/low", "mitigation": "\u7F13\u89E3\u65B9\u6848"}
  ],
  "growthAnalysis": {
    "currentCapability": "\u5F53\u524D\u80FD\u529B\u8BC4\u4F30",
    "futureProjection": "\u672A\u6765\u53D1\u5C55\u9884\u6D4B",
    "developmentAreas": ["\u53D1\u5C55\u9886\u57DF1", "\u53D1\u5C55\u9886\u57DF2"]
  }
}`;
        const result = await aiService.generateStructuredResponse(prompt, "MATCHING");
        const aiResponse = result.data;
        storage.createAiConversation({
          userId: "system",
          sessionId: `hiring-analysis-${candidate.id}`,
          message: `Analyze candidate strengths and weaknesses for hiring decision`,
          response: JSON.stringify(aiResponse),
          modelUsed: result.model,
          tokensUsed: result.usage.totalTokens
        }).catch((error) => {
          console.error("[Token Tracking] Failed to record hiring analysis token usage:", error);
        });
        return {
          strengths: aiResponse.strengths || basicAnalysis.strengths,
          weaknesses: aiResponse.weaknesses || basicAnalysis.weaknesses,
          riskFactors: aiResponse.riskFactors || basicAnalysis.riskFactors,
          growthPotential: {
            currentCapability: aiResponse.growthAnalysis?.currentCapability || basicAnalysis.growthPotential.currentCapability,
            futureProjection: aiResponse.growthAnalysis?.futureProjection || basicAnalysis.growthPotential.futureProjection,
            timeframe: HIRING_DECISION_CONFIG.GROWTH_TIMEFRAME,
            developmentAreas: aiResponse.growthAnalysis?.developmentAreas || basicAnalysis.growthPotential.developmentAreas
          },
          culturalFitScore: basicAnalysis.culturalFitScore,
          culturalAlignmentDetails: basicAnalysis.culturalAlignmentDetails
        };
      }
      /**
       * 提取优势
       */
      extractStrengths(profileData, interviews2) {
        const strengths = [];
        const expertSkills = (profileData.technicalSkills || []).filter((s) => s.proficiency === "expert" || s.proficiency === "advanced").map((s) => `Expert in ${s.skill}`);
        strengths.push(...expertSkills);
        const softSkills = (profileData.softSkills || []).map((s) => s.skill);
        strengths.push(...softSkills);
        const positivePatterns = this.extractPositivePatterns(interviews2);
        strengths.push(...positivePatterns);
        return [...new Set(strengths)].slice(0, 5);
      }
      /**
       * 提取劣势
       */
      extractWeaknesses(profileData, interviews2) {
        const weaknesses = [];
        const beginnerSkills = (profileData.technicalSkills || []).filter((s) => s.proficiency === "beginner").map((s) => `Limited experience with ${s.skill}`);
        weaknesses.push(...beginnerSkills);
        const negativePatterns = this.extractNegativePatterns(interviews2);
        weaknesses.push(...negativePatterns);
        return [...new Set(weaknesses)].slice(0, 5);
      }
      /**
       * 评估风险
       */
      assessRisks(candidate, profileData) {
        const risks = [];
        const thresholds = HIRING_DECISION_CONFIG.RISK_THRESHOLDS;
        if (profileData.careerTrajectory?.stabilityScore < thresholds.STABILITY_MEDIUM) {
          risks.push({
            risk: "High turnover risk",
            impact: "high",
            mitigation: "Implement retention strategies and clear career path"
          });
        }
        if (!profileData.experience || profileData.experience.totalYears < thresholds.EXPERIENCE_MIN_YEARS) {
          risks.push({
            risk: "Limited experience",
            impact: "medium",
            mitigation: "Provide structured onboarding and mentorship"
          });
        }
        return risks;
      }
      /**
       * 评估当前能力
       */
      assessCurrentCapability(profileData) {
        const score = this.calculateTechnicalFit(profileData);
        const thresholds = HIRING_DECISION_CONFIG.CAPABILITY_THRESHOLDS;
        if (score >= thresholds.HIGH_PERFORMER) return "High performer ready for immediate contribution";
        if (score >= thresholds.SOLID_FOUNDATION) return "Solid foundation with room for growth";
        if (score >= thresholds.DEVELOPING) return "Developing professional requiring support";
        return "Entry level requiring significant investment";
      }
      /**
       * 预测未来成长
       */
      projectFutureGrowth(profileData) {
        const learningAgility = profileData.organizationalFit?.organizationalReadiness?.learningAgility || 0;
        const thresholds = HIRING_DECISION_CONFIG.LEARNING_AGILITY_THRESHOLDS;
        if (learningAgility >= thresholds.HIGH_POTENTIAL) return "High potential for rapid advancement";
        if (learningAgility >= thresholds.STEADY_GROWTH) return "Steady growth trajectory expected";
        if (learningAgility >= thresholds.MODERATE_GROWTH) return "Moderate growth with proper support";
        return "Limited growth potential identified";
      }
      /**
       * 识别发展领域
       */
      identifyDevelopmentAreas(profileData) {
        const areas = [];
        const intermediateSkills = (profileData.technicalSkills || []).filter((s) => s.proficiency === "intermediate").map((s) => s.skill);
        areas.push(...intermediateSkills.slice(0, 3));
        if (profileData.organizationalFit?.leadershipAssessment?.developmentAreas) {
          areas.push(...profileData.organizationalFit.leadershipAssessment.developmentAreas.slice(0, 2));
        }
        return [...new Set(areas)];
      }
      /**
       * 生成比较分析
       */
      generateComparison(candidate, otherCandidates, profileAnalysis) {
        const validCandidates = otherCandidates.filter((c) => c.id !== candidate.id);
        const ranking = this.calculateRanking(candidate, validCandidates, profileAnalysis);
        return {
          comparedTo: validCandidates.length,
          ranking,
          topDifferentiators: this.identifyDifferentiators(candidate, validCandidates),
          competitiveAdvantages: this.identifyAdvantages(profileAnalysis),
          competitiveDisadvantages: this.identifyDisadvantages(profileAnalysis)
        };
      }
      /**
       * 计算排名
       */
      calculateRanking(candidate, others, profileAnalysis) {
        const score = profileAnalysis.overallScore;
        let betterThanCount = 0;
        return Math.min(others.length + 1, Math.max(1, Math.round((100 - score) / 20)));
      }
      /**
       * 识别差异化因素
       */
      identifyDifferentiators(candidate, others) {
        const differentiators = [];
        if (candidate.yearsOfExperience && candidate.yearsOfExperience > 5) {
          differentiators.push("Extensive relevant experience");
        }
        if (candidate.skills && candidate.skills.length > 10) {
          differentiators.push("Broad technical skillset");
        }
        return differentiators;
      }
      /**
       * 识别竞争优势
       */
      identifyAdvantages(profileAnalysis) {
        const advantages = [];
        if (profileAnalysis.technicalFit > 80) {
          advantages.push("Strong technical match");
        }
        if (profileAnalysis.culturalFit > 80) {
          advantages.push("Excellent cultural alignment");
        }
        if (profileAnalysis.experienceMatch > 80) {
          advantages.push("Ideal experience level");
        }
        return advantages;
      }
      /**
       * 识别竞争劣势
       */
      identifyDisadvantages(profileAnalysis) {
        const disadvantages = [];
        if (profileAnalysis.technicalFit < 50) {
          disadvantages.push("Technical skill gaps");
        }
        if (profileAnalysis.culturalFit < 50) {
          disadvantages.push("Cultural fit concerns");
        }
        if (profileAnalysis.hasRedFlags) {
          disadvantages.push("Risk factors identified");
        }
        return disadvantages;
      }
      /**
       * 生成薪酬建议
       */
      generateCompensationRecommendation(candidate, job, profileAnalysis) {
        const baseSalary = job.salaryMin || HIRING_DECISION_CONFIG.SALARY.DEFAULT_BASE;
        const maxSalary = job.salaryMax || baseSalary * HIRING_DECISION_CONFIG.SALARY.MULTIPLIER_MAX;
        const qualityMultiplier = 1 + profileAnalysis.overallScore / 200;
        const targetOffer = Math.round(baseSalary * qualityMultiplier);
        return {
          minRange: baseSalary,
          maxRange: maxSalary,
          targetOffer: Math.min(targetOffer, maxSalary),
          marketComparison: "Competitive with market rate",
          justification: [
            `${candidate.yearsOfExperience || 0} years of relevant experience`,
            `Technical proficiency score: ${profileAnalysis.technicalFit}%`,
            `Cultural fit score: ${profileAnalysis.culturalFit}%`
          ]
        };
      }
      /**
       * 生成谈判要点
       */
      generateNegotiationPoints(candidate, job, analysis) {
        const points = [];
        if (analysis.strengths.length > 3) {
          points.push("Candidate has multiple strong competencies - limited flexibility on compensation");
        }
        if (analysis.culturalFitScore > 80) {
          points.push("Strong cultural fit - consider non-monetary benefits");
        }
        if (candidate.expectedSalary && job.salaryMax && candidate.expectedSalary > job.salaryMax) {
          points.push("Salary expectations exceed budget - explore creative compensation structure");
        }
        points.push("Consider signing bonus or performance incentives");
        points.push("Flexible work arrangements may be valuable");
        return points;
      }
      /**
       * 建议替代角色
       */
      suggestAlternativeRoles(candidate, profileAnalysis) {
        const alternatives = [];
        if (profileAnalysis.technicalFit > 70 && profileAnalysis.experienceMatch < 50) {
          alternatives.push("Junior version of current role");
        }
        if (profileAnalysis.experienceMatch > 80 && profileAnalysis.technicalFit < 60) {
          alternatives.push("Adjacent role with transferable skills");
        }
        return alternatives;
      }
      /**
       * 生成招聘条件
       */
      generateHiringConditions(analysis) {
        const conditions = [];
        if (analysis.riskFactors.length > 0) {
          conditions.push("Probationary period with clear performance metrics");
        }
        if (analysis.weaknesses.length > 2) {
          conditions.push("Commitment to training and development program");
        }
        conditions.push("Successful reference checks");
        conditions.push("Background verification");
        return conditions;
      }
      /**
       * 生成下一步建议
       */
      generateNextSteps(decision, analysis) {
        const steps = [];
        switch (decision) {
          case "hire":
            steps.push("Extend formal offer");
            steps.push("Conduct reference checks");
            steps.push("Prepare onboarding plan");
            steps.push("Assign buddy/mentor");
            break;
          case "next-round":
            steps.push("Schedule final interview with senior leadership");
            steps.push("Conduct technical assessment");
            steps.push("Gather additional references");
            break;
          case "hold":
            steps.push("Keep candidate warm with regular updates");
            steps.push("Re-evaluate after other candidates interviewed");
            steps.push("Consider for future openings");
            break;
          case "reject":
            steps.push("Send respectful rejection communication");
            steps.push("Provide constructive feedback if requested");
            steps.push("Keep in talent pool for future opportunities");
            break;
        }
        return steps;
      }
      /**
       * 生成时间线建议
       */
      generateTimelineSuggestion(decision, analysis) {
        switch (decision) {
          case "hire":
            return "Move quickly - within 48 hours to avoid losing candidate";
          case "next-round":
            return "Schedule within 1 week to maintain momentum";
          case "hold":
            return "Re-evaluate in 2-3 weeks";
          case "reject":
            return "Communicate decision within 3 business days";
          default:
            return "Take action within 1 week";
        }
      }
      /**
       * 生成推荐文本 - 使用 AI 生成更人性化的建议
       */
      async generateRecommendationText(decision, candidate, job, analysis) {
        const basicText = this.generateBasicRecommendationText(decision, candidate, job, analysis);
        try {
          const decisionMap = {
            "hire": "\u5F55\u7528",
            "reject": "\u4E0D\u5F55\u7528",
            "hold": "\u6682\u7F13\u51B3\u5B9A",
            "next-round": "\u8FDB\u5165\u4E0B\u4E00\u8F6E\u9762\u8BD5"
          };
          const prompt = `\u4F5C\u4E3A HR \u4E13\u5BB6\uFF0C\u8BF7\u4E3A\u4EE5\u4E0B\u62DB\u8058\u51B3\u7B56\u751F\u6210\u4E13\u4E1A\u7684\u63A8\u8350\u6587\u672C\uFF1A

\u5019\u9009\u4EBA\uFF1A${candidate.name}
\u804C\u4F4D\uFF1A${job.title}
\u51B3\u7B56\uFF1A${decisionMap[decision]}

\u5019\u9009\u4EBA\u4F18\u52BF\uFF1A
${analysis.strengths.slice(0, 3).map((s, i) => `${i + 1}. ${s}`).join("\n")}

\u9700\u8981\u5173\u6CE8\u7684\u70B9\uFF1A
${analysis.weaknesses.slice(0, 3).map((w, i) => `${i + 1}. ${w}`).join("\n")}

\u6587\u5316\u5339\u914D\u5EA6\uFF1A${analysis.culturalFitScore}%

\u8BF7\u751F\u6210\u4E00\u6BB5 150-200 \u5B57\u7684\u4E13\u4E1A\u63A8\u8350\u6587\u672C\uFF0C\u8981\u6C42\uFF1A
1. \u5BA2\u89C2\u3001\u4E13\u4E1A
2. \u660E\u786E\u8BF4\u660E\u51B3\u7B56\u7406\u7531
3. \u63D0\u53CA\u5019\u9009\u4EBA\u7684\u4EAE\u70B9\u548C\u98CE\u9669
4. \u5982\u679C\u662F\u5F55\u7528/\u4E0B\u4E00\u8F6E\uFF0C\u63D0\u51FA\u5EFA\u8BAE\u7684\u540E\u7EED\u884C\u52A8

\u76F4\u63A5\u8FD4\u56DE\u63A8\u8350\u6587\u672C\uFF0C\u4E0D\u8981\u5176\u4ED6\u5185\u5BB9\u3002`;
          const result = await aiService.generateTextResponse(prompt, "MATCHING");
          storage.createAiConversation({
            userId: "system",
            sessionId: `hiring-recommendation-${candidate.id}`,
            message: `Generate hiring recommendation for ${candidate.name} - ${job.title}`,
            response: result.text,
            modelUsed: result.model,
            tokensUsed: result.usage.totalTokens
          }).catch((error) => {
            console.error("[Token Tracking] Failed to record hiring recommendation token usage:", error);
          });
          return result.text || basicText;
        } catch (error) {
          console.error("Failed to generate AI recommendation:", error);
          return basicText;
        }
      }
      /**
       * 生成基础推荐文本（备用）
       */
      generateBasicRecommendationText(decision, candidate, job, analysis) {
        const intro = `\u7ECF\u8FC7\u5BF9 ${candidate.name} \u5E94\u8058 ${job.title} \u804C\u4F4D\u7684\u7EFC\u5408\u8BC4\u4F30\uFF0C`;
        switch (decision) {
          case "hire":
            return intro + `\u6211\u4EEC\u5F3A\u70C8\u5EFA\u8BAE\u5F55\u7528\u8BE5\u5019\u9009\u4EBA\u3002${candidate.name} \u5C55\u73B0\u4E86${analysis.strengths.slice(0, 2).join("\u548C")}\uFF0C\u975E\u5E38\u9002\u5408\u8FD9\u4E2A\u804C\u4F4D\u3002\u5019\u9009\u4EBA\u7684\u80CC\u666F\u4E0E\u6211\u4EEC\u7684\u9700\u6C42\u548C\u6587\u5316\u9AD8\u5EA6\u5339\u914D\u3002`;
          case "reject":
            return intro + `\u6211\u4EEC\u5EFA\u8BAE\u6682\u4E0D\u7EE7\u7EED\u8003\u8651\u8BE5\u5019\u9009\u4EBA\u3002\u867D\u7136 ${candidate.name} \u5728${analysis.strengths[0] || "\u67D0\u4E9B\u65B9\u9762"}\u6709\u4F18\u52BF\uFF0C\u4F46\u5728${analysis.weaknesses.slice(0, 2).join("\u548C")}\u65B9\u9762\u5B58\u5728\u987E\u8651\uFF0C\u4E0D\u592A\u9002\u5408\u5F53\u524D\u804C\u4F4D\u3002`;
          case "hold":
            return intro + `\u6211\u4EEC\u5EFA\u8BAE\u6682\u7F13\u51B3\u5B9A\u3002${candidate.name} \u663E\u793A\u51FA\u6F5C\u529B\uFF0C\u4F46\u5E94\u8BE5\u5728\u8BC4\u4F30\u5176\u4ED6\u5019\u9009\u4EBA\u540E\u518D\u505A\u6700\u7EC8\u51B3\u5B9A\u3002\u5173\u952E\u8003\u8651\u5305\u62EC${analysis.strengths[0]}\u4E0E${analysis.weaknesses[0]}\u7684\u5E73\u8861\u3002`;
          case "next-round":
            return intro + `\u6211\u4EEC\u5EFA\u8BAE\u8FDB\u5165\u4E0B\u4E00\u8F6E\u9762\u8BD5\u3002${candidate.name} \u5DF2\u7ECF\u5C55\u793A\u4E86${analysis.strengths[0]}\uFF0C\u4F46\u6211\u4EEC\u9700\u8981\u5728${analysis.weaknesses[0] || "\u7279\u5B9A\u6280\u672F\u80FD\u529B"}\u7B49\u65B9\u9762\u8FDB\u4E00\u6B65\u8BC4\u4F30\u3002`;
          default:
            return intro + "\u9700\u8981\u8FDB\u4E00\u6B65\u8BC4\u4F30\u3002";
        }
      }
      /**
       * 从面试中提取正面模式
       */
      extractPositivePatterns(interviews2) {
        const patterns = [];
        const highRatedInterviews = interviews2.filter((i) => i.rating && i.rating >= 4);
        if (highRatedInterviews.length > 0) {
          patterns.push("Consistently positive interview feedback");
        }
        const hireRecommendations = interviews2.filter((i) => i.recommendation === "hire");
        if (hireRecommendations.length > 1) {
          patterns.push("Multiple interviewers recommend hiring");
        }
        return patterns;
      }
      /**
       * 从面试中提取负面模式
       */
      extractNegativePatterns(interviews2) {
        const patterns = [];
        const lowRatedInterviews = interviews2.filter((i) => i.rating && i.rating <= 2);
        if (lowRatedInterviews.length > 0) {
          patterns.push("Concerning interview performance");
        }
        const rejectRecommendations = interviews2.filter((i) => i.recommendation === "reject");
        if (rejectRecommendations.length > 0) {
          patterns.push("Interview concerns raised");
        }
        return patterns;
      }
    };
    hiringDecisionService = new HiringDecisionService();
  }
});

// shared/types/interview-assistant.ts
var init_interview_assistant = __esm({
  "shared/types/interview-assistant.ts"() {
    "use strict";
  }
});

// server/services/interviewAssistantService.ts
var interviewAssistantService_exports = {};
__export(interviewAssistantService_exports, {
  InterviewAssistantService: () => InterviewAssistantService,
  interviewAssistantService: () => interviewAssistantService
});
import { v4 as uuidv42 } from "uuid";
var InterviewAssistantService, interviewAssistantService;
var init_interviewAssistantService = __esm({
  "server/services/interviewAssistantService.ts"() {
    "use strict";
    init_openaiService();
    init_interview_assistant();
    init_storage();
    InterviewAssistantService = class {
      constructor() {
        // 问题知识库（实际应该存在数据库中）
        this.questionBank = /* @__PURE__ */ new Map();
        this.templates = /* @__PURE__ */ new Map();
        this.initializeQuestionBank();
        this.initializeTemplates();
      }
      /**
       * 推荐面试问题
       */
      async recommendQuestions(request) {
        console.log(`[InterviewAssistant] Recommending questions for candidate ${request.candidateId}`);
        const candidate = await this.getCandidateInfo(request.candidateId);
        const job = await this.getJobInfo(request.jobId);
        const profile = await this.getCandidateProfile(request.candidateId);
        const personalizedQuestions = await this.generatePersonalizedQuestions(
          candidate,
          job,
          profile,
          request
        );
        const strategy = await this.generateInterviewStrategy(
          candidate,
          job,
          request.interviewRound,
          request.interviewType
        );
        const timeAllocation = this.generateTimeAllocation(
          personalizedQuestions.length,
          request.interviewType
        );
        const evaluationFramework = await this.generateEvaluationFramework(
          job,
          request.interviewType,
          personalizedQuestions
        );
        const focusPoints = this.identifyFocusPoints(candidate, job, profile);
        return {
          questions: personalizedQuestions,
          strategy,
          focusPoints,
          timeAllocation,
          evaluationFramework
        };
      }
      /**
       * 生成个性化问题
       */
      async generatePersonalizedQuestions(candidate, job, profile, request) {
        const prompt = `
\u4F60\u662F\u4E00\u4F4D\u8D44\u6DF1\u7684\u9762\u8BD5\u5B98\u548C\u4EBA\u624D\u8BC4\u4F30\u4E13\u5BB6\u3002\u8BF7\u57FA\u4E8E\u5019\u9009\u4EBA\u80CC\u666F\u751F\u6210\u4E2A\u6027\u5316\u7684\u9762\u8BD5\u95EE\u9898\u3002

\u5019\u9009\u4EBA\u4FE1\u606F\uFF1A
- \u59D3\u540D\uFF1A${candidate.name}
- \u804C\u4F4D\uFF1A${candidate.position}
- \u7ECF\u9A8C\uFF1A${candidate.experience}\u5E74
- \u6280\u80FD\uFF1A${JSON.stringify(profile?.profileData?.technicalSkills || [])}
- \u6559\u80B2\uFF1A${candidate.education}

\u804C\u4F4D\u8981\u6C42\uFF1A
- \u804C\u4F4D\uFF1A${job.title}
- \u8981\u6C42\uFF1A${JSON.stringify(job.requirements)}
- \u63CF\u8FF0\uFF1A${job.description}

\u9762\u8BD5\u4FE1\u606F\uFF1A
- \u8F6E\u6B21\uFF1A\u7B2C${request.interviewRound}\u8F6E
- \u7C7B\u578B\uFF1A${request.interviewType}
- \u91CD\u70B9\u9886\u57DF\uFF1A${JSON.stringify(request.preferences?.focusAreas || [])}

\u8BF7\u751F\u62108-10\u4E2A\u9AD8\u8D28\u91CF\u7684\u9762\u8BD5\u95EE\u9898\uFF0C\u6BCF\u4E2A\u95EE\u9898\u5305\u62EC\uFF1A
1. \u95EE\u9898\u5185\u5BB9
2. \u95EE\u9898\u7C7B\u578B\uFF08behavioral/technical/situational\u7B49\uFF09
3. \u8003\u5BDF\u76EE\u7684
4. \u5173\u952E\u8003\u5BDF\u70B9
5. \u597D\u7B54\u6848\u7279\u5F81
6. \u8B66\u793A\u4FE1\u53F7
7. \u8FFD\u95EE\u5EFA\u8BAE
8. \u4E2A\u6027\u5316\u80CC\u666F\uFF08\u57FA\u4E8E\u5019\u9009\u4EBA\u7279\u70B9\uFF09
9. \u63A8\u8350\u7406\u7531

\u8FD4\u56DEJSON\u683C\u5F0F\u7684\u95EE\u9898\u5217\u8868\u3002`;
        const response = await openai2.chat.completions.create({
          model: "gpt-4-turbo-preview",
          messages: [
            {
              role: "system",
              content: "\u4F60\u662F\u4E00\u4F4D\u7ECF\u9A8C\u4E30\u5BCC\u7684\u9762\u8BD5\u4E13\u5BB6\uFF0C\u64C5\u957F\u8BBE\u8BA1\u9AD8\u8D28\u91CF\u3001\u4E2A\u6027\u5316\u7684\u9762\u8BD5\u95EE\u9898\u3002"
            },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.7
        });
        const result = JSON.parse(response.choices[0].message.content || "{}");
        const questions = result.questions || [];
        return questions.map((q, index2) => ({
          id: uuidv42(),
          question: q.question,
          type: q.type,
          difficulty: this.assessDifficulty(q, request.interviewRound),
          category: q.category || this.inferCategory(q.question),
          purpose: q.purpose,
          keyPoints: q.keyPoints || [],
          goodAnswerTraits: q.goodAnswerTraits || [],
          redFlags: q.redFlags || [],
          followUpQuestions: q.followUpQuestions || [],
          tags: this.generateTags(q),
          timeEstimate: q.timeEstimate || 5,
          // 个性化信息
          recommendationReason: q.recommendationReason,
          personalizedContext: q.personalizedContext,
          candidateSpecificProbes: q.candidateSpecificProbes || [],
          relevanceScore: this.calculateRelevance(q, job, profile),
          priority: index2 + 1,
          // STAR引导
          starGuidance: q.type === "behavioral" ? {
            situation: "\u8BF7\u63CF\u8FF0\u5F53\u65F6\u7684\u5177\u4F53\u60C5\u51B5\u548C\u80CC\u666F",
            task: "\u60A8\u7684\u4EFB\u52A1\u6216\u76EE\u6807\u662F\u4EC0\u4E48\uFF1F",
            action: "\u60A8\u91C7\u53D6\u4E86\u54EA\u4E9B\u5177\u4F53\u884C\u52A8\uFF1F",
            result: "\u6700\u7EC8\u7684\u7ED3\u679C\u5982\u4F55\uFF1F\u6709\u4EC0\u4E48\u6536\u83B7\uFF1F"
          } : void 0
        }));
      }
      /**
       * 生成面试策略
       */
      async generateInterviewStrategy(candidate, job, round, type) {
        const prompt = `
\u57FA\u4E8E\u4EE5\u4E0B\u4FE1\u606F\u751F\u6210\u9762\u8BD5\u7B56\u7565\uFF1A
- \u5019\u9009\u4EBA\uFF1A${candidate.name}\uFF0C${candidate.experience}\u5E74\u7ECF\u9A8C
- \u804C\u4F4D\uFF1A${job.title}
- \u9762\u8BD5\u8F6E\u6B21\uFF1A\u7B2C${round}\u8F6E
- \u9762\u8BD5\u7C7B\u578B\uFF1A${type}

\u8BF7\u63D0\u4F9B\uFF1A
1. \u63A8\u8350\u7684\u9762\u8BD5\u65B9\u6CD5
2. \u9762\u8BD5\u76EE\u6807\uFF083-5\u4E2A\uFF09
3. \u5173\u952E\u4E3B\u9898
4. \u5EFA\u8BAE\u7684\u9762\u8BD5\u6D41\u7A0B
5. \u5E94\u8BE5\u505A\u7684\u4E8B\u9879\uFF08Do's\uFF09
6. \u4E0D\u5E94\u8BE5\u505A\u7684\u4E8B\u9879\uFF08Don'ts\uFF09`;
        const response = await openai2.chat.completions.create({
          model: "gpt-4-turbo-preview",
          messages: [
            {
              role: "system",
              content: "\u4F60\u662F\u9762\u8BD5\u7B56\u7565\u4E13\u5BB6\uFF0C\u5E2E\u52A9\u9762\u8BD5\u5B98\u5236\u5B9A\u6700\u4F73\u9762\u8BD5\u7B56\u7565\u3002"
            },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.6
        });
        const result = JSON.parse(response.choices[0].message.content || "{}");
        return {
          approach: result.approach || `\u7ED3\u6784\u5316${type}\u9762\u8BD5`,
          objectives: result.objectives || [
            "\u8BC4\u4F30\u5019\u9009\u4EBA\u7684\u6838\u5FC3\u80FD\u529B",
            "\u9A8C\u8BC1\u7B80\u5386\u4FE1\u606F\u7684\u771F\u5B9E\u6027",
            "\u4E86\u89E3\u5019\u9009\u4EBA\u7684\u804C\u4E1A\u52A8\u673A",
            "\u8BC4\u4F30\u6587\u5316\u5951\u5408\u5EA6",
            "\u786E\u5B9A\u53D1\u5C55\u6F5C\u529B"
          ],
          keyThemes: result.keyThemes || this.generateKeyThemes(job, type),
          suggestedFlow: result.suggestedFlow || [
            "\u5F00\u573A\u4ECB\u7ECD\u548C\u7834\u51B0\uFF085\u5206\u949F\uFF09",
            "\u80CC\u666F\u4E86\u89E3\uFF0810\u5206\u949F\uFF09",
            "\u6838\u5FC3\u80FD\u529B\u8BC4\u4F30\uFF0820\u5206\u949F\uFF09",
            "\u6DF1\u5EA6\u63A2\u8BA8\uFF0815\u5206\u949F\uFF09",
            "\u5019\u9009\u4EBA\u63D0\u95EE\uFF085\u5206\u949F\uFF09",
            "\u603B\u7ED3\u548C\u540E\u7EED\u6B65\u9AA4\uFF085\u5206\u949F\uFF09"
          ],
          doList: result.doList || [
            "\u4FDD\u6301\u53CB\u597D\u548C\u4E13\u4E1A",
            "\u4F7F\u7528STAR\u6CD5\u5219\u5F15\u5BFC\u56DE\u7B54",
            "\u6DF1\u5165\u63A2\u8BE2\u5177\u4F53\u6848\u4F8B",
            "\u8BB0\u5F55\u5173\u952E\u884C\u4E3A\u8BC1\u636E",
            "\u7ED9\u5019\u9009\u4EBA\u5145\u5206\u8868\u8FBE\u7684\u673A\u4F1A"
          ],
          dontList: result.dontList || [
            "\u907F\u514D\u5E26\u6709\u504F\u89C1\u7684\u95EE\u9898",
            "\u4E0D\u8981\u6253\u65AD\u5019\u9009\u4EBA\u56DE\u7B54",
            "\u907F\u514D\u8FC7\u4E8E\u4E2A\u4EBA\u5316\u7684\u95EE\u9898",
            "\u4E0D\u8981\u663E\u9732\u4E2A\u4EBA\u504F\u597D",
            "\u907F\u514D\u627F\u8BFA\u6216\u6697\u793A\u7ED3\u679C"
          ]
        };
      }
      /**
       * 生成时间分配
       */
      generateTimeAllocation(questionCount, interviewType) {
        const totalTime = 60;
        return [
          {
            section: "\u5F00\u573A\u4ECB\u7ECD",
            duration: 5,
            questions: 0,
            purpose: "\u5EFA\u7ACB\u878D\u6D3D\u5173\u7CFB\uFF0C\u4ECB\u7ECD\u9762\u8BD5\u6D41\u7A0B"
          },
          {
            section: "\u80CC\u666F\u4E86\u89E3",
            duration: 10,
            questions: 2,
            purpose: "\u4E86\u89E3\u5019\u9009\u4EBA\u80CC\u666F\u548C\u7ECF\u5386"
          },
          {
            section: "\u6838\u5FC3\u8BC4\u4F30",
            duration: 30,
            questions: Math.min(questionCount - 3, 5),
            purpose: "\u6DF1\u5165\u8BC4\u4F30\u6838\u5FC3\u80FD\u529B"
          },
          {
            section: "\u6DF1\u5EA6\u63A2\u8BA8",
            duration: 10,
            questions: 1,
            purpose: "\u6DF1\u5165\u4E86\u89E3\u7279\u5B9A\u9886\u57DF"
          },
          {
            section: "\u5019\u9009\u4EBA\u63D0\u95EE",
            duration: 5,
            questions: 0,
            purpose: "\u56DE\u7B54\u5019\u9009\u4EBA\u7591\u95EE\uFF0C\u8BC4\u4F30\u5176\u5173\u6CE8\u70B9"
          }
        ];
      }
      /**
       * 生成评估框架
       */
      async generateEvaluationFramework(job, interviewType, questions) {
        const dimensions = this.generateEvaluationDimensions(job, interviewType, questions);
        return {
          dimensions,
          scoringGuide: {
            scale: 5,
            guidelines: [
              "5\u5206 - \u8FDC\u8D85\u671F\u671B\uFF1A\u8868\u73B0\u5353\u8D8A\uFF0C\u5C55\u73B0\u51FA\u8D85\u8D8A\u5C97\u4F4D\u8981\u6C42\u7684\u80FD\u529B",
              "4\u5206 - \u8D85\u51FA\u671F\u671B\uFF1A\u8868\u73B0\u4F18\u79C0\uFF0C\u5B8C\u5168\u6EE1\u8DB3\u5E76\u90E8\u5206\u8D85\u8D8A\u8981\u6C42",
              "3\u5206 - \u7B26\u5408\u671F\u671B\uFF1A\u8868\u73B0\u826F\u597D\uFF0C\u6EE1\u8DB3\u5C97\u4F4D\u57FA\u672C\u8981\u6C42",
              "2\u5206 - \u4F4E\u4E8E\u671F\u671B\uFF1A\u8868\u73B0\u4E00\u822C\uFF0C\u90E8\u5206\u6EE1\u8DB3\u8981\u6C42\u4F46\u6709\u660E\u663E\u4E0D\u8DB3",
              "1\u5206 - \u4E0D\u7B26\u5408\u8981\u6C42\uFF1A\u8868\u73B0\u8F83\u5DEE\uFF0C\u4E0D\u6EE1\u8DB3\u5C97\u4F4D\u57FA\u672C\u8981\u6C42"
            ],
            biasChecklist: [
              "\u662F\u5426\u57FA\u4E8E\u5BA2\u89C2\u884C\u4E3A\u8BC1\u636E\u8BC4\u5206\uFF1F",
              "\u662F\u5426\u907F\u514D\u4E86\u7B2C\u4E00\u5370\u8C61\u7684\u5F71\u54CD\uFF1F",
              "\u662F\u5426\u8003\u8651\u4E86\u5019\u9009\u4EBA\u7684\u80CC\u666F\u5DEE\u5F02\uFF1F",
              "\u662F\u5426\u4E0E\u5176\u4ED6\u5019\u9009\u4EBA\u4FDD\u6301\u4E00\u81F4\u7684\u6807\u51C6\uFF1F",
              "\u662F\u5426\u6392\u9664\u4E86\u4E2A\u4EBA\u504F\u597D\u7684\u5F71\u54CD\uFF1F"
            ]
          },
          decisionCriteria: {
            strongHire: "\u5E73\u5747\u5206\u22654.5\uFF0C\u65E0\u4EFB\u4F55\u7EF4\u5EA6\u4F4E\u4E8E3\u5206",
            hire: "\u5E73\u5747\u5206\u22653.5\uFF0C\u6700\u591A\u4E00\u4E2A\u7EF4\u5EA6\u4F4E\u4E8E3\u5206",
            undecided: "\u5E73\u5747\u52063.0-3.5\uFF0C\u9700\u8981\u8FDB\u4E00\u6B65\u8BC4\u4F30",
            noHire: "\u5E73\u5747\u5206<3.0\u6216\u6709\u591A\u4E2A\u7EF4\u5EA6\u4F4E\u4E8E3\u5206"
          }
        };
      }
      /**
       * 生成评估维度
       */
      generateEvaluationDimensions(job, interviewType, questions) {
        const dimensions = [];
        if (interviewType === "technical") {
          dimensions.push({
            name: "\u6280\u672F\u80FD\u529B",
            weight: 0.35,
            description: "\u4E13\u4E1A\u6280\u672F\u77E5\u8BC6\u548C\u5B9E\u8DF5\u80FD\u529B",
            indicators: [
              "\u6280\u672F\u6DF1\u5EA6\u548C\u5E7F\u5EA6",
              "\u95EE\u9898\u89E3\u51B3\u80FD\u529B",
              "\u4EE3\u7801\u8D28\u91CF\u610F\u8BC6",
              "\u7CFB\u7EDF\u8BBE\u8BA1\u80FD\u529B"
            ],
            questions: questions.filter((q) => q.type === "technical" /* TECHNICAL */).map((q) => q.id),
            scoringRubric: {
              excellent: "\u5C55\u73B0\u51FA\u6DF1\u539A\u7684\u6280\u672F\u529F\u5E95\uFF0C\u80FD\u591F\u89E3\u51B3\u590D\u6742\u95EE\u9898",
              good: "\u6280\u672F\u624E\u5B9E\uFF0C\u80FD\u591F\u72EC\u7ACB\u5B8C\u6210\u4EFB\u52A1",
              average: "\u5177\u5907\u57FA\u672C\u6280\u672F\u80FD\u529B\uFF0C\u9700\u8981\u4E00\u5B9A\u6307\u5BFC",
              poor: "\u6280\u672F\u57FA\u7840\u8584\u5F31\uFF0C\u96BE\u4EE5\u80DC\u4EFB\u5DE5\u4F5C"
            }
          });
        }
        dimensions.push({
          name: "\u884C\u4E3A\u80FD\u529B",
          weight: 0.25,
          description: "\u8FC7\u5F80\u884C\u4E3A\u8868\u73B0\u548C\u5DE5\u4F5C\u65B9\u5F0F",
          indicators: [
            "\u56E2\u961F\u534F\u4F5C",
            "\u6C9F\u901A\u80FD\u529B",
            "\u8D23\u4EFB\u5FC3",
            "\u9002\u5E94\u80FD\u529B"
          ],
          questions: questions.filter((q) => q.type === "behavioral" /* BEHAVIORAL */).map((q) => q.id),
          scoringRubric: {
            excellent: "\u5C55\u73B0\u51FA\u5353\u8D8A\u7684\u8F6F\u6280\u80FD\u548C\u804C\u4E1A\u7D20\u517B",
            good: "\u5177\u5907\u826F\u597D\u7684\u5DE5\u4F5C\u4E60\u60EF\u548C\u534F\u4F5C\u80FD\u529B",
            average: "\u57FA\u672C\u7684\u804C\u4E1A\u6280\u80FD\uFF0C\u6709\u63D0\u5347\u7A7A\u95F4",
            poor: "\u8F6F\u6280\u80FD\u4E0D\u8DB3\uFF0C\u53EF\u80FD\u5F71\u54CD\u5DE5\u4F5C\u6548\u7387"
          }
        });
        dimensions.push({
          name: "\u6587\u5316\u5951\u5408",
          weight: 0.2,
          description: "\u4E0E\u516C\u53F8\u6587\u5316\u548C\u4EF7\u503C\u89C2\u7684\u5339\u914D\u5EA6",
          indicators: [
            "\u4EF7\u503C\u89C2\u8BA4\u540C",
            "\u5DE5\u4F5C\u98CE\u683C\u5339\u914D",
            "\u56E2\u961F\u878D\u5165\u5EA6",
            "\u957F\u671F\u53D1\u5C55\u610F\u613F"
          ],
          questions: questions.filter((q) => q.type === "culture_fit" /* CULTURE_FIT */).map((q) => q.id),
          scoringRubric: {
            excellent: "\u9AD8\u5EA6\u8BA4\u540C\u516C\u53F8\u6587\u5316\uFF0C\u80FD\u591F\u6210\u4E3A\u6587\u5316\u5927\u4F7F",
            good: "\u4E0E\u516C\u53F8\u6587\u5316\u5951\u5408\uFF0C\u80FD\u591F\u826F\u597D\u878D\u5165",
            average: "\u57FA\u672C\u5951\u5408\uFF0C\u9700\u8981\u4E00\u5B9A\u9002\u5E94\u671F",
            poor: "\u6587\u5316\u5339\u914D\u5EA6\u4F4E\uFF0C\u53EF\u80FD\u96BE\u4EE5\u878D\u5165"
          }
        });
        dimensions.push({
          name: "\u53D1\u5C55\u6F5C\u529B",
          weight: 0.2,
          description: "\u5B66\u4E60\u80FD\u529B\u548C\u6210\u957F\u6F5C\u529B",
          indicators: [
            "\u5B66\u4E60\u80FD\u529B",
            "\u6210\u957Fmindset",
            "\u804C\u4E1A\u89C4\u5212",
            "\u521B\u65B0\u601D\u7EF4"
          ],
          questions: questions.filter(
            (q) => q.category === "\u6F5C\u529B" || q.tags.includes("\u53D1\u5C55")
          ).map((q) => q.id),
          scoringRubric: {
            excellent: "\u6781\u9AD8\u7684\u6210\u957F\u6F5C\u529B\uFF0C\u672A\u6765\u53EF\u671F",
            good: "\u826F\u597D\u7684\u5B66\u4E60\u80FD\u529B\uFF0C\u7A33\u6B65\u6210\u957F",
            average: "\u4E00\u822C\u7684\u53D1\u5C55\u6F5C\u529B\uFF0C\u6210\u957F\u901F\u5EA6\u9002\u4E2D",
            poor: "\u53D1\u5C55\u6F5C\u529B\u6709\u9650\uFF0C\u6210\u957F\u7F13\u6162"
          }
        });
        return dimensions;
      }
      /**
       * 创建面试会话
       */
      async createInterviewSession(candidateId, interviewerId, jobId, questions) {
        const sessionId = uuidv42();
        const session = {
          id: sessionId,
          candidateId,
          interviewerId,
          jobId,
          startTime: /* @__PURE__ */ new Date(),
          status: "preparing",
          plannedQuestions: questions,
          completedQuestions: [],
          realTimeNotes: "",
          keyObservations: [],
          followUpQueue: [],
          evaluationProgress: /* @__PURE__ */ new Map(),
          overallImpression: "",
          aiSuggestions: [],
          aiWarnings: [],
          aiInsights: []
        };
        return session;
      }
      /**
       * 处理答案并提供实时反馈
       */
      async processAnswer(sessionId, questionId, answer) {
        const analysis = await this.analyzeAnswer(answer);
        const suggestions = await this.generateSuggestions(
          questionId,
          answer,
          analysis
        );
        const warnings = this.detectWarnings(analysis);
        return {
          analysis,
          suggestions,
          warnings
        };
      }
      /**
       * 分析答案
       */
      async analyzeAnswer(answer) {
        const prompt = `
\u5206\u6790\u4EE5\u4E0B\u9762\u8BD5\u56DE\u7B54\uFF1A

"${answer}"

\u8BF7\u63D0\u4F9B\uFF1A
1. \u60C5\u611F\u503E\u5411\uFF08\u79EF\u6781/\u4E2D\u6027/\u6D88\u6781\uFF09
2. \u5173\u952E\u8981\u70B9\uFF083-5\u4E2A\uFF09
3. \u5C55\u73B0\u7684\u80FD\u529B
4. \u6F5C\u5728\u987E\u8651
5. STAR\u7ED3\u6784\u5B8C\u6574\u6027

\u8FD4\u56DEJSON\u683C\u5F0F\u3002`;
        const response = await openai2.chat.completions.create({
          model: "gpt-4-turbo-preview",
          messages: [
            {
              role: "system",
              content: "\u4F60\u662F\u9762\u8BD5\u5206\u6790\u4E13\u5BB6\uFF0C\u64C5\u957F\u5FEB\u901F\u8BC6\u522B\u7B54\u6848\u4E2D\u7684\u5173\u952E\u4FE1\u606F\u3002"
            },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.3
        });
        return JSON.parse(response.choices[0].message.content || "{}");
      }
      /**
       * 生成建议
       */
      async generateSuggestions(questionId, answer, analysis) {
        const suggestions = [];
        if (!analysis.hasSpecificExamples) {
          suggestions.push({
            type: "probe",
            content: "\u80FD\u5426\u5206\u4EAB\u4E00\u4E2A\u5177\u4F53\u7684\u4F8B\u5B50\uFF1F",
            reason: "\u7B54\u6848\u8F83\u4E3A\u62BD\u8C61\uFF0C\u9700\u8981\u5177\u4F53\u6848\u4F8B\u652F\u6491",
            timing: "immediate",
            priority: "high"
          });
        }
        if (analysis.hasContradiction) {
          suggestions.push({
            type: "clarification",
            content: "\u521A\u624D\u63D0\u5230\u7684XX\u548CYY\u4F3C\u4E4E\u6709\u4E9B\u4E0D\u4E00\u81F4\uFF0C\u80FD\u5426\u89E3\u91CA\u4E00\u4E0B\uFF1F",
            reason: "\u53D1\u73B0\u6F5C\u5728\u7684\u903B\u8F91\u77DB\u76FE",
            timing: "next",
            priority: "medium"
          });
        }
        if (analysis.hasHighlight) {
          suggestions.push({
            type: "probe",
            content: "\u8FD9\u4E2A\u9879\u76EE\u5F88\u6709\u610F\u601D\uFF0C\u80FD\u8BE6\u7EC6\u8BF4\u8BF4\u60A8\u7684\u89D2\u8272\u548C\u8D21\u732E\u5417\uFF1F",
            reason: "\u53D1\u73B0\u4EAE\u70B9\uFF0C\u503C\u5F97\u6DF1\u5165\u4E86\u89E3",
            timing: "next",
            priority: "medium"
          });
        }
        return suggestions;
      }
      /**
       * 检测警告信号
       */
      detectWarnings(analysis) {
        const warnings = [];
        if (analysis.sentiment === "negative") {
          warnings.push("\u5019\u9009\u4EBA\u60C5\u7EEA\u8F83\u4E3A\u6D88\u6781\uFF0C\u6CE8\u610F\u89C2\u5BDF\u539F\u56E0");
        }
        if (analysis.hasRedFlag) {
          warnings.push("\u53D1\u73B0\u6F5C\u5728\u98CE\u9669\u4FE1\u53F7\uFF0C\u5EFA\u8BAE\u6DF1\u5165\u4E86\u89E3");
        }
        if (analysis.lacksDepth) {
          warnings.push("\u56DE\u7B54\u7F3A\u4E4F\u6DF1\u5EA6\uFF0C\u53EF\u80FD\u7ECF\u9A8C\u4E0D\u8DB3");
        }
        return warnings;
      }
      /**
       * 生成面试报告
       */
      async generateInterviewReport(session) {
        const dimensionScores = this.calculateDimensionScores(session);
        const overallScore = this.calculateOverallScore(dimensionScores);
        const recommendation = this.generateRecommendation(overallScore, dimensionScores);
        const aiSummary = await this.generateAISummary(session);
        const cultureFitAnalysis = await this.analyzeCultureFit(session);
        const potentialAnalysis = await this.analyzePotential(session);
        const riskAssessment = await this.assessRisks(session);
        return {
          sessionId: session.id,
          candidateId: session.candidateId,
          jobId: session.jobId,
          date: session.startTime,
          duration: this.calculateDuration(session),
          interviewer: session.interviewerId,
          overallScore,
          dimensionScores,
          recommendation,
          strengths: this.extractStrengths(session),
          concerns: this.extractConcerns(session),
          keyFindings: this.extractKeyFindings(session),
          behaviorEvidence: this.extractBehaviorEvidence(session),
          aiSummary,
          cultureFitAnalysis,
          potentialAnalysis,
          riskAssessment,
          nextSteps: this.generateNextSteps(recommendation),
          additionalAssessments: this.suggestAdditionalAssessments(session),
          developmentAreas: this.identifyDevelopmentAreas(session)
        };
      }
      /**
       * 辅助方法
       */
      async getCandidateInfo(candidateId) {
        return await storage.getCandidate(candidateId);
      }
      async getJobInfo(jobId) {
        return await storage.getJob(jobId);
      }
      async getCandidateProfile(candidateId) {
        const profiles = await storage.getCandidateProfiles(candidateId);
        if (profiles.length === 0) return null;
        const sortedProfiles = profiles.sort((a, b) => (b.version || 0) - (a.version || 0));
        return sortedProfiles[0];
      }
      assessDifficulty(question, round) {
        if (round === 1) return "easy" /* EASY */;
        if (round === 2) return "medium" /* MEDIUM */;
        if (round >= 3) return "hard" /* HARD */;
        return "medium" /* MEDIUM */;
      }
      inferCategory(question) {
        if (question.includes("\u56E2\u961F") || question.includes("\u534F\u4F5C")) return "\u56E2\u961F\u534F\u4F5C";
        if (question.includes("\u9886\u5BFC") || question.includes("\u7BA1\u7406")) return "\u9886\u5BFC\u529B";
        if (question.includes("\u89E3\u51B3") || question.includes("\u95EE\u9898")) return "\u95EE\u9898\u89E3\u51B3";
        if (question.includes("\u538B\u529B") || question.includes("\u6311\u6218")) return "\u6297\u538B\u80FD\u529B";
        return "\u7EFC\u5408\u80FD\u529B";
      }
      generateTags(question) {
        const tags = [];
        if (question.type) tags.push(question.type);
        if (question.category) tags.push(question.category);
        if (question.difficulty) tags.push(question.difficulty);
        return tags;
      }
      calculateRelevance(question, job, profile) {
        let score = 50;
        if (job.requirements?.some(
          (req) => question.question.toLowerCase().includes(req.toLowerCase())
        )) {
          score += 25;
        }
        if (profile?.profileData?.gaps?.some(
          (gap) => question.purpose.includes(gap)
        )) {
          score += 25;
        }
        return Math.min(100, score);
      }
      generateKeyThemes(job, type) {
        const themes = ["\u4E13\u4E1A\u80FD\u529B", "\u56E2\u961F\u534F\u4F5C", "\u95EE\u9898\u89E3\u51B3"];
        if (type === "technical") {
          themes.push("\u6280\u672F\u6DF1\u5EA6", "\u7CFB\u7EDF\u601D\u7EF4");
        }
        if (type === "behavioral") {
          themes.push("\u8FC7\u5F80\u7ECF\u9A8C", "\u5DE5\u4F5C\u65B9\u5F0F");
        }
        return themes;
      }
      identifyFocusPoints(candidate, job, profile) {
        const points = [];
        if (candidate.experience < 3) {
          points.push("\u5B66\u4E60\u80FD\u529B\u548C\u6210\u957F\u6F5C\u529B");
        } else if (candidate.experience > 8) {
          points.push("\u9886\u5BFC\u529B\u548C\u56E2\u961F\u7BA1\u7406");
        }
        if (profile?.gaps?.length > 0) {
          points.push("\u9A8C\u8BC1\u548C\u8865\u5145\u4FE1\u606F\u7F3A\u53E3");
        }
        points.push("\u6838\u5FC3\u6280\u80FD\u5339\u914D\u5EA6");
        points.push("\u6587\u5316\u4EF7\u503C\u89C2\u5951\u5408");
        return points;
      }
      calculateDimensionScores(session) {
        const scores = /* @__PURE__ */ new Map();
        scores.set("\u6280\u672F\u80FD\u529B", 4.2);
        scores.set("\u884C\u4E3A\u80FD\u529B", 3.8);
        scores.set("\u6587\u5316\u5951\u5408", 4);
        scores.set("\u53D1\u5C55\u6F5C\u529B", 4.5);
        return scores;
      }
      calculateOverallScore(dimensionScores) {
        let sum = 0;
        let count = 0;
        dimensionScores.forEach((score) => {
          sum += score;
          count++;
        });
        return count > 0 ? sum / count : 0;
      }
      generateRecommendation(overallScore, dimensionScores) {
        if (overallScore >= 4.5) return "strong_hire";
        if (overallScore >= 3.5) return "hire";
        if (overallScore >= 3) return "undecided";
        return "no_hire";
      }
      calculateDuration(session) {
        if (session.endTime) {
          return Math.round(
            (session.endTime.getTime() - session.startTime.getTime()) / 6e4
          );
        }
        return 0;
      }
      extractStrengths(session) {
        return session.keyObservations.filter(
          (obs) => obs.includes("\u4F18\u79C0") || obs.includes("\u7A81\u51FA") || obs.includes("\u5F3A")
        );
      }
      extractConcerns(session) {
        return session.aiWarnings;
      }
      extractKeyFindings(session) {
        return session.aiInsights;
      }
      extractBehaviorEvidence(session) {
        return session.completedQuestions.filter((q) => q.behaviorEvidence).map((q) => q.behaviorEvidence);
      }
      async generateAISummary(session) {
        return `\u5019\u9009\u4EBA\u5728\u9762\u8BD5\u4E2D\u8868\u73B0\u826F\u597D\uFF0C\u5C55\u73B0\u4E86\u624E\u5B9E\u7684\u4E13\u4E1A\u80FD\u529B\u548C\u826F\u597D\u7684\u6C9F\u901A\u80FD\u529B\u3002
    \u7279\u522B\u5728\u6280\u672F\u95EE\u9898\u4E0A\u7ED9\u51FA\u4E86\u6DF1\u601D\u719F\u8651\u7684\u7B54\u6848\uFF0C\u663E\u793A\u4E86\u4E30\u5BCC\u7684\u5B9E\u8DF5\u7ECF\u9A8C\u3002
    \u56E2\u961F\u534F\u4F5C\u65B9\u9762\u4E5F\u6709\u4E0D\u9519\u7684\u6848\u4F8B\u652F\u6491\u3002\u5EFA\u8BAE\u8FDB\u5165\u4E0B\u4E00\u8F6E\u8BC4\u4F30\u3002`;
      }
      async analyzeCultureFit(session) {
        return "\u5019\u9009\u4EBA\u7684\u4EF7\u503C\u89C2\u4E0E\u516C\u53F8\u6587\u5316\u9AD8\u5EA6\u5951\u5408\uFF0C\u7279\u522B\u662F\u5728\u521B\u65B0\u548C\u534F\u4F5C\u65B9\u9762\u3002";
      }
      async analyzePotential(session) {
        return "\u5C55\u73B0\u51FA\u8F83\u9AD8\u7684\u5B66\u4E60\u80FD\u529B\u548C\u6210\u957F\u6F5C\u529B\uFF0C\u6709\u671B\u57281-2\u5E74\u5185\u664B\u5347\u5230\u9AD8\u7EA7\u804C\u4F4D\u3002";
      }
      async assessRisks(session) {
        return "\u4E3B\u8981\u98CE\u9669\u5728\u4E8E\u884C\u4E1A\u7ECF\u9A8C\u7565\u663E\u4E0D\u8DB3\uFF0C\u53EF\u80FD\u9700\u89813-6\u4E2A\u6708\u9002\u5E94\u671F\u3002";
      }
      generateNextSteps(recommendation) {
        if (recommendation === "strong_hire" || recommendation === "hire") {
          return [
            "\u5B89\u6392\u4E0B\u4E00\u8F6E\u9762\u8BD5",
            "\u8FDB\u884C\u80CC\u666F\u8C03\u67E5",
            "\u51C6\u5907offer\u65B9\u6848"
          ];
        }
        return ["\u6536\u96C6\u66F4\u591A\u4FE1\u606F", "\u4E0E\u5176\u4ED6\u9762\u8BD5\u5B98\u8BA8\u8BBA"];
      }
      suggestAdditionalAssessments(session) {
        return [
          "\u6280\u672F\u6D4B\u8BD5",
          "\u6848\u4F8B\u5206\u6790",
          "\u56E2\u961Ffit\u9762\u8BD5"
        ];
      }
      identifyDevelopmentAreas(session) {
        return [
          "\u7CFB\u7EDF\u8BBE\u8BA1\u80FD\u529B",
          "\u9879\u76EE\u7BA1\u7406\u7ECF\u9A8C",
          "\u8DE8\u90E8\u95E8\u534F\u4F5C"
        ];
      }
      /**
       * 初始化问题库
       */
      initializeQuestionBank() {
        const sampleQuestions = [
          {
            id: "q1",
            question: "\u8BF7\u63CF\u8FF0\u4E00\u6B21\u60A8\u5728\u538B\u529B\u4E0B\u89E3\u51B3\u590D\u6742\u6280\u672F\u95EE\u9898\u7684\u7ECF\u5386",
            type: "behavioral" /* BEHAVIORAL */,
            difficulty: "medium" /* MEDIUM */,
            category: "\u95EE\u9898\u89E3\u51B3",
            purpose: "\u8BC4\u4F30\u5019\u9009\u4EBA\u7684\u6297\u538B\u80FD\u529B\u548C\u95EE\u9898\u89E3\u51B3\u80FD\u529B",
            keyPoints: ["\u95EE\u9898\u5206\u6790", "\u89E3\u51B3\u65B9\u6848", "\u7ED3\u679C", "\u5B66\u4E60"],
            goodAnswerTraits: ["\u5177\u4F53\u6848\u4F8B", "\u6E05\u6670\u601D\u8DEF", "\u79EF\u6781\u7ED3\u679C"],
            redFlags: ["\u56DE\u907F\u95EE\u9898", "\u5F52\u548E\u4ED6\u4EBA", "\u7F3A\u4E4F\u53CD\u601D"],
            tags: ["\u95EE\u9898\u89E3\u51B3", "\u6297\u538B", "\u6280\u672F"],
            timeEstimate: 5
          }
        ];
        sampleQuestions.forEach((q) => this.questionBank.set(q.id, q));
      }
      /**
       * 初始化模板
       */
      initializeTemplates() {
      }
    };
    interviewAssistantService = new InterviewAssistantService();
  }
});

// server/routes.ts
var routes_exports = {};
__export(routes_exports, {
  registerRoutes: () => registerRoutes
});
import { createServer } from "http";
import { z as z4 } from "zod";
import multer from "multer";
async function registerRoutes(app2) {
  app2.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      environment: process.env.NODE_ENV || "unknown",
      websocket: process.env.VERCEL !== "1" ? "enabled" : "disabled",
      features: {
        ai: !!process.env.OPENROUTER_API_KEY,
        storage: !!process.env.SUPABASE_URL,
        database: !!process.env.DATABASE_URL
      }
    });
  });
  app2.get("/.well-known/*", (req, res) => {
    res.status(404).json({ error: "Not found" });
  });
  app2.get("/api/debug/env", (req, res) => {
    const debugToken = req.headers["x-debug-token"];
    const isDev = process.env.NODE_ENV === "development";
    if (!isDev && debugToken !== process.env.DEBUG_TOKEN) {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.json({
      environment: process.env.NODE_ENV || "unknown",
      vercel: process.env.VERCEL === "1",
      envCheck: {
        SUPABASE_URL: !!process.env.SUPABASE_URL,
        VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
        SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
        SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        DATABASE_URL: !!process.env.DATABASE_URL,
        OPENROUTER_API_KEY: !!process.env.OPENROUTER_API_KEY
      },
      supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "NOT_SET",
      warning: !process.env.SUPABASE_SERVICE_ROLE_KEY ? "\u26A0\uFE0F SUPABASE_SERVICE_ROLE_KEY is missing! This will cause authentication failures." : null
    });
  });
  app2.get("/api/users/:id", requireAuthWithInit, async (req, res) => {
    try {
      if (req.params.id !== req.user?.id && req.user?.role !== "admin") {
        return res.status(403).json({ error: "Forbidden: Cannot access other user's data" });
      }
      const requestedUserId = req.params.id;
      let user = await storage.getUser(requestedUserId);
      if (!user && req.supabaseUser && req.supabaseUser.id === requestedUserId) {
        const provisioned = await resolveOrProvisionUser(req.supabaseUser);
        if (provisioned) {
          user = provisioned;
        } else {
          const fallbackName = (typeof req.supabaseUser.user_metadata?.full_name === "string" && req.supabaseUser.user_metadata.full_name.trim().length > 0 ? req.supabaseUser.user_metadata.full_name : req.supabaseUser.email?.split("@")[0]) || "Recruiter";
          return res.json({
            id: req.supabaseUser.id,
            email: req.supabaseUser.email || "",
            name: fallbackName,
            role: "recruiter"
          });
        }
      }
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });
  app2.post("/api/users", requireAuthWithInit, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { id, email, name, fullName, role, password } = req.body;
      const isAdmin = req.user.role === "admin";
      if (isAdmin) {
        if (!email || !name) {
          return res.status(400).json({ error: "Email and name are required" });
        }
        const created2 = await storage.createUser({
          id,
          email,
          name,
          role: role || "hr_manager",
          password: password ?? "supabase-managed"
        });
        return res.status(201).json(created2);
      }
      if (req.user.email !== email && req.user.id !== id) {
        return res.status(403).json({ error: "Forbidden: Cannot provision other users" });
      }
      const existing = await storage.getUser(req.user.id);
      if (existing) {
        return res.status(200).json(existing);
      }
      const derivedName = name || fullName || req.user.email?.split("@")[0] || "Recruiter";
      const allowedRoles = /* @__PURE__ */ new Set(["admin", "recruitment_lead", "recruiter", "hiring_manager"]);
      const resolvedRole = allowedRoles.has(role) ? role : "recruiter";
      const created = await storage.createUser({
        id: req.user.id,
        email: req.user.email,
        name: derivedName,
        role: resolvedRole,
        password: "supabase-managed"
      });
      return res.status(201).json(created);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });
  app2.get("/api/prompt-templates", requireAuth, async (req, res) => {
    try {
      const { category } = req.query;
      let templates;
      if (category && typeof category === "string") {
        templates = await promptTemplateService.getTemplatesByCategory(category);
      } else {
        templates = await promptTemplateService.getTemplates();
      }
      res.json(templates);
    } catch (error) {
      console.error("Error fetching prompt templates:", error);
      res.status(500).json({ error: "Failed to fetch prompt templates" });
    }
  });
  app2.get("/api/prompt-templates/:id", requireAuth, async (req, res) => {
    try {
      const template = await promptTemplateService.getTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching prompt template:", error);
      res.status(500).json({ error: "Failed to fetch prompt template" });
    }
  });
  app2.post("/api/prompt-templates", requireAuth, async (req, res) => {
    try {
      const template = await promptTemplateService.createTemplate(req.body);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating prompt template:", error);
      res.status(500).json({ error: "Failed to create prompt template" });
    }
  });
  app2.put("/api/prompt-templates/:id", requireAuth, async (req, res) => {
    try {
      const template = await promptTemplateService.updateTemplate(req.params.id, req.body);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error updating prompt template:", error);
      res.status(500).json({ error: "Failed to update prompt template" });
    }
  });
  app2.delete("/api/prompt-templates/:id", requireAuth, async (req, res) => {
    try {
      const deleted = await promptTemplateService.deleteTemplate(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting prompt template:", error);
      res.status(500).json({ error: "Failed to delete prompt template" });
    }
  });
  app2.get("/api/dashboard/metrics", requireAuth, async (req, res) => {
    try {
      const [candidates2, jobs2, interviews2] = await Promise.all([
        storage.getCandidates(),
        storage.getJobs(),
        storage.getInterviews()
      ]);
      const totalCandidates = candidates2.length;
      const activeJobs = jobs2.filter((job) => job.status === "active").length;
      const upcomingInterviews = interviews2.filter(
        (interview) => interview.scheduledDate > /* @__PURE__ */ new Date() && interview.status === "scheduled"
      ).length;
      const appliedCandidates = candidates2.filter((c) => c.status === "applied").length;
      const screeningCandidates = candidates2.filter((c) => c.status === "screening").length;
      const interviewCandidates = candidates2.filter((c) => c.status === "interview").length;
      const hiredCandidates = candidates2.filter((c) => c.status === "hired").length;
      const interviewRate = totalCandidates > 0 ? Math.round(interviewCandidates / totalCandidates * 100) : 0;
      const hireRate = totalCandidates > 0 ? Math.round(hiredCandidates / totalCandidates * 100) : 0;
      res.json({
        totalCandidates,
        activeJobs,
        upcomingInterviews,
        interviewRate,
        hireRate,
        funnel: {
          applied: appliedCandidates,
          screening: screeningCandidates,
          interview: interviewCandidates,
          hired: hiredCandidates
        }
      });
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ error: "Failed to fetch metrics" });
    }
  });
  app2.get("/api/ai/token-usage", requireAuth, async (req, res) => {
    try {
      const { startDate, endDate, userId, model } = req.query;
      const conversations = await storage.getAiConversations();
      let filtered = conversations;
      if (startDate) {
        const start = new Date(startDate);
        filtered = filtered.filter((c) => c.createdAt && c.createdAt >= start);
      }
      if (endDate) {
        const end = new Date(endDate);
        filtered = filtered.filter((c) => c.createdAt && c.createdAt <= end);
      }
      if (userId) {
        filtered = filtered.filter((c) => c.userId === userId);
      }
      if (model) {
        filtered = filtered.filter((c) => c.modelUsed === model);
      }
      const totalTokens = filtered.reduce((sum, c) => sum + (c.tokensUsed || 0), 0);
      const totalConversations = filtered.length;
      const averageTokensPerConversation = totalConversations > 0 ? Math.round(totalTokens / totalConversations) : 0;
      const byModel = {};
      filtered.forEach((c) => {
        const modelName = c.modelUsed || "unknown";
        if (!byModel[modelName]) {
          byModel[modelName] = { count: 0, tokens: 0 };
        }
        byModel[modelName].count++;
        byModel[modelName].tokens += c.tokensUsed || 0;
      });
      const byDate = {};
      filtered.forEach((c) => {
        if (c.createdAt) {
          const date = c.createdAt.toISOString().split("T")[0];
          byDate[date] = (byDate[date] || 0) + (c.tokensUsed || 0);
        }
      });
      const costEstimates = {
        "openai/gpt-5": 0.04,
        "openai/gpt-5-chat": 0.04,
        "google/gemini-2.5-pro": 15e-4,
        "google/gemini-2.5-flash": 2e-4,
        "anthropic/claude-sonnet-4": 0.015
      };
      let estimatedCost = 0;
      Object.entries(byModel).forEach(([model2, data]) => {
        const costPer1K = costEstimates[model2] || 1e-3;
        estimatedCost += data.tokens / 1e3 * costPer1K;
      });
      res.json({
        summary: {
          totalTokens,
          totalConversations,
          averageTokensPerConversation,
          estimatedCost: Math.round(estimatedCost * 100) / 100
          // round to 2 decimals
        },
        byModel,
        byDate,
        period: {
          start: startDate || (filtered.length > 0 ? filtered[0].createdAt : null),
          end: endDate || (filtered.length > 0 ? filtered[filtered.length - 1].createdAt : null)
        }
      });
    } catch (error) {
      console.error("Error fetching token usage:", error);
      res.status(500).json({ error: "Failed to fetch token usage statistics" });
    }
  });
  app2.get("/api/jobs", requireAuth, async (req, res) => {
    try {
      const jobs2 = await storage.getJobs();
      res.json(jobs2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  });
  app2.get("/api/jobs/:id", requireAuth, async (req, res) => {
    try {
      const job = await storage.getJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      res.json(job);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch job" });
    }
  });
  app2.post("/api/jobs", requireAuth, async (req, res) => {
    try {
      const jobData = insertJobSchema.parse(req.body);
      const job = await storage.createJob(jobData);
      res.status(201).json(job);
    } catch (error) {
      res.status(400).json({ error: "Invalid job data" });
    }
  });
  app2.put("/api/jobs/:id", requireAuth, async (req, res) => {
    try {
      const job = await storage.updateJob(req.params.id, req.body);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      res.json(job);
    } catch (error) {
      res.status(500).json({ error: "Failed to update job" });
    }
  });
  app2.delete("/api/jobs/:id", requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteJob(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Job not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete job" });
    }
  });
  app2.post("/api/jobs/:id/find-matches", requireAuth, async (req, res) => {
    try {
      const job = await storage.getJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      const candidates2 = await storage.getCandidates();
      const matches = await matchingService.findMatchingCandidates(job, candidates2);
      for (const match of matches) {
        await storage.createJobMatch({
          candidateId: match.candidate.id,
          jobId: job.id,
          matchScore: match.matchScore.toString(),
          matchReasons: match.reasons,
          aiAnalysis: match.explanation
        });
      }
      res.json({ matches });
    } catch (error) {
      console.error("Error finding matches:", error);
      res.status(500).json({ error: "Failed to find matches" });
    }
  });
  app2.get("/api/jobs/:id/matches", requireAuth, async (req, res) => {
    try {
      const matches = await storage.getJobMatchesForJob(req.params.id);
      const enrichedMatches = await Promise.all(
        matches.map(async (match) => {
          const candidate = await storage.getCandidate(match.candidateId);
          return {
            ...match,
            candidate
          };
        })
      );
      enrichedMatches.sort(
        (a, b) => parseFloat(b.matchScore) - parseFloat(a.matchScore)
      );
      res.json(enrichedMatches);
    } catch (error) {
      console.error("Error fetching job matches:", error);
      res.status(500).json({ error: "Failed to fetch job matches" });
    }
  });
  app2.get("/api/candidates", requireAuth, async (req, res) => {
    try {
      const { search } = req.query;
      let candidates2;
      if (search && typeof search === "string") {
        candidates2 = await storage.searchCandidates(search);
      } else {
        candidates2 = await storage.getCandidates();
      }
      res.json(candidates2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch candidates" });
    }
  });
  app2.get("/api/candidates/:id", requireAuth, async (req, res) => {
    try {
      const candidate = await storage.getCandidate(req.params.id);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      res.json(candidate);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch candidate" });
    }
  });
  app2.post("/api/candidates", requireAuth, async (req, res) => {
    try {
      const candidateData = insertCandidateSchema.parse(req.body);
      const candidate = await storage.createCandidate(candidateData);
      res.status(201).json(candidate);
    } catch (error) {
      res.status(400).json({ error: "Invalid candidate data" });
    }
  });
  app2.post("/api/candidates/bulk-upload", requireAuth, bulkUpload.array("resumes", 20), async (req, res) => {
    try {
      const files = req.files;
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }
      console.log(`[Bulk Upload] Processing ${files.length} resume files`);
      const results = [];
      for (const file of files) {
        try {
          console.log(`[Bulk Upload] Processing file: ${file.originalname}`);
          const parseResult = await enhancedResumeParser.parse(
            file.buffer,
            file.mimetype
          );
          const { text: parsedText, analysis: visionAnalysis } = parseResult;
          const contactInfo = resumeParserService.extractContactInfo(parsedText);
          const skills = visionAnalysis?.skills || resumeParserService.extractSkills(parsedText);
          const experience = visionAnalysis?.experience || resumeParserService.extractExperience(parsedText);
          const candidateName = contactInfo?.name || file.originalname.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
          const candidateData = {
            name: candidateName,
            email: contactInfo?.email || "",
            phone: contactInfo?.phone || "",
            skills,
            experience: typeof experience === "number" ? experience : parseInt(String(experience)) || 0,
            education: visionAnalysis?.education || "",
            resumeText: parsedText
          };
          const candidate = await storage.createCandidate(candidateData);
          let resumeFilePath;
          try {
            resumeFilePath = await supabaseStorageService.uploadResume(
              candidate.id,
              file.buffer,
              file.originalname,
              file.mimetype
            );
            await storage.updateCandidate(candidate.id, {
              resumeUrl: resumeFilePath
            });
          } catch (storageError) {
            console.warn(`[Bulk Upload] Failed to upload resume file for ${candidateName}:`, storageError);
          }
          let aiAnalysis = null;
          try {
            const aiResult = await aiService.analyzeResume(parsedText);
            if (aiResult?.analysis) {
              aiAnalysis = aiResult.analysis;
              const experienceValue = aiAnalysis.experience ? Math.floor(Number(aiAnalysis.experience)) : typeof experience === "number" ? experience : parseInt(String(experience)) || 0;
              await storage.updateCandidate(candidate.id, {
                aiSummary: aiAnalysis.summary || "",
                skills: aiAnalysis.skills && aiAnalysis.skills.length > 0 ? aiAnalysis.skills : skills,
                experience: experienceValue
              });
            }
          } catch (aiError) {
            console.warn(`[Bulk Upload] AI analysis failed for ${candidateName}:`, aiError);
          }
          let initialProfile = null;
          try {
            const resumeAnalysisForProfile = {
              summary: aiAnalysis?.summary || "",
              skills: aiAnalysis?.skills || skills,
              experience: aiAnalysis?.experience || experience,
              education: candidateData.education,
              strengths: aiAnalysis?.strengths || [],
              weaknesses: aiAnalysis?.weaknesses || [],
              recommendations: aiAnalysis?.recommendations || []
            };
            initialProfile = await candidateProfileService.buildInitialProfile(
              candidate.id,
              resumeAnalysisForProfile
            );
          } catch (profileError) {
            console.warn(`[Bulk Upload] Profile generation failed for ${candidateName}:`, profileError);
          }
          results.push({
            status: "success",
            filename: file.originalname,
            candidate: {
              id: candidate.id,
              name: candidate.name,
              email: candidate.email
            },
            profile: initialProfile ? {
              id: initialProfile.id,
              version: initialProfile.version
            } : null
          });
          console.log(`[Bulk Upload] Successfully processed: ${candidateName}`);
        } catch (error) {
          console.error(`[Bulk Upload] Failed to process file ${file.originalname}:`, error);
          results.push({
            status: "error",
            filename: file.originalname,
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }
      const successCount = results.filter((r) => r.status === "success").length;
      const errorCount = results.filter((r) => r.status === "error").length;
      console.log(`[Bulk Upload] Completed: ${successCount} successful, ${errorCount} failed`);
      res.json({
        success: true,
        processed: files.length,
        successful: successCount,
        failed: errorCount,
        results
      });
    } catch (error) {
      console.error("[Bulk Upload] Bulk upload failed:", error);
      res.status(500).json({
        error: "Bulk upload failed",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.put("/api/candidates/:id", requireAuth, async (req, res) => {
    try {
      const candidate = await storage.updateCandidate(req.params.id, req.body);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      res.json(candidate);
    } catch (error) {
      res.status(500).json({ error: "Failed to update candidate" });
    }
  });
  app2.delete("/api/candidates/:id", requireAuth, async (req, res) => {
    try {
      const candidate = await storage.getCandidate(req.params.id);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      const relatedInterviews = await storage.getInterviewsByCandidate(req.params.id);
      const relatedMatches = await storage.getJobMatchesForCandidate(req.params.id);
      if (relatedInterviews.length > 0 || relatedMatches.length > 0) {
        return res.status(409).json({
          error: "Cannot delete candidate with existing interviews or job matches",
          details: {
            interviews: relatedInterviews.length,
            jobMatches: relatedMatches.length
          }
        });
      }
      if (candidate.resumeUrl) {
        try {
          await supabaseStorageService.deleteResume(candidate.resumeUrl);
          console.log(`[Candidate Delete] Deleted resume file: ${candidate.resumeUrl}`);
        } catch (storageError) {
          console.error(`[Candidate Delete] Failed to delete resume file:`, storageError);
        }
      }
      const deleted = await storage.deleteCandidate(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("[Candidate Delete] Error:", error);
      res.status(500).json({ error: "Failed to delete candidate" });
    }
  });
  app2.post("/api/candidates/:id/find-matches", requireAuth, async (req, res) => {
    try {
      const candidate = await storage.getCandidate(req.params.id);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      const jobs2 = await storage.getJobs();
      const activeJobs = jobs2.filter((job) => job.status === "active");
      const matchesWithJobs = [];
      for (const job of activeJobs) {
        try {
          const matchResult = await aiService.matchCandidateToJob(
            {
              skills: candidate.skills || [],
              experience: candidate.experience || 0,
              education: candidate.education || "",
              position: candidate.position || ""
            },
            {
              title: job.title,
              requirements: job.requirements || [],
              description: job.description
            }
          );
          try {
            await storage.createAiConversation({
              userId: "system",
              sessionId: `candidate-match-${candidate.id}`,
              message: `Match candidate ${candidate.name} to job ${job.title}`,
              response: JSON.stringify(matchResult.match),
              modelUsed: matchResult.model,
              tokensUsed: matchResult.usage.totalTokens
            });
          } catch (error) {
            console.error("[Token Tracking] Failed to record match token usage:", error);
          }
          await storage.createJobMatch({
            candidateId: candidate.id,
            jobId: job.id,
            matchScore: matchResult.match.score.toString(),
            matchReasons: matchResult.match.reasons,
            aiAnalysis: matchResult.match.explanation
          });
          matchesWithJobs.push({
            job,
            matchScore: matchResult.match.score,
            reasons: matchResult.match.reasons,
            explanation: matchResult.match.explanation
          });
        } catch (error) {
          console.error(`Error matching job ${job.id}:`, error);
        }
      }
      matchesWithJobs.sort((a, b) => b.matchScore - a.matchScore);
      res.json({ matches: matchesWithJobs });
    } catch (error) {
      console.error("Error finding matches:", error);
      res.status(500).json({ error: "Failed to find matches" });
    }
  });
  app2.get("/api/candidates/:id/matches", requireAuth, async (req, res) => {
    try {
      const matches = await storage.getJobMatchesForCandidate(req.params.id);
      const enrichedMatches = await Promise.all(
        matches.map(async (match) => {
          const job = await storage.getJob(match.jobId);
          return {
            ...match,
            job
          };
        })
      );
      enrichedMatches.sort(
        (a, b) => parseFloat(b.matchScore) - parseFloat(a.matchScore)
      );
      res.json(enrichedMatches);
    } catch (error) {
      console.error("Error fetching candidate matches:", error);
      res.status(500).json({ error: "Failed to fetch candidate matches" });
    }
  });
  app2.post("/api/objects/upload", requireAuth, async (req, res) => {
    try {
      const { candidateId, filename } = req.body;
      if (!candidateId || !filename) {
        return res.status(400).json({
          error: "candidateId and filename are required"
        });
      }
      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      const uploadUrl = await supabaseStorageService.createPresignedUploadUrl(
        candidateId,
        filename
      );
      res.json({
        method: "PUT",
        url: uploadUrl
      });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });
  app2.post("/api/objects/proxy-upload", requireAuth, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const candidateId = req.headers["x-candidate-id"] || req.body.candidateId;
      if (!candidateId) {
        return res.status(400).json({ error: "candidateId is required" });
      }
      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      if (req.file.mimetype !== "application/pdf") {
        return res.status(400).json({ error: "Only PDF files are allowed" });
      }
      if (req.file.size > 10 * 1024 * 1024) {
        return res.status(400).json({ error: "File size must be less than 10MB" });
      }
      console.log(`[Proxy Upload] Uploading file for candidate ${candidateId}: ${req.file.originalname}`);
      if (candidate.resumeUrl) {
        try {
          console.log(`[Proxy Upload] Deleting old resume: ${candidate.resumeUrl}`);
          await supabaseStorageService.deleteResume(candidate.resumeUrl);
          console.log(`[Proxy Upload] Old resume deleted successfully`);
        } catch (deleteError) {
          console.warn(`[Proxy Upload] Failed to delete old resume:`, deleteError);
        }
      }
      const filePath = await supabaseStorageService.uploadResume(
        candidateId,
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );
      console.log(`[Proxy Upload] File uploaded successfully: ${filePath}`);
      await storage.updateCandidate(candidateId, {
        resumeUrl: filePath
      });
      console.log(`[Proxy Upload] Starting AI analysis for file: ${filePath}`);
      try {
        const analysisResult = await enhancedResumeParser.parse(
          req.file.buffer,
          req.file.mimetype
        );
        const updatedCandidate = await storage.updateCandidate(candidateId, {
          name: candidate.name,
          // 保持原有名称，避免覆盖
          resumeUrl: filePath,
          skills: analysisResult.analysis.skills,
          // 保持数组格式
          experience: analysisResult.analysis.experience,
          // 使用数字格式
          education: analysisResult.analysis.education,
          resumeText: analysisResult.text
        });
        console.log(`[Proxy Upload] AI analysis completed successfully`);
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Candidate-ID");
        res.header("Access-Control-Expose-Headers", "ETag, Content-Length");
        res.json({
          uploadURL: `/api/files/${filePath}`,
          url: `/api/files/${filePath}`,
          response: {
            body: {
              success: true,
              filePath,
              analysis: {
                ...analysisResult,
                candidate: updatedCandidate
              },
              message: "File uploaded and analyzed successfully"
            }
          }
        });
      } catch (analysisError) {
        console.error(`[Proxy Upload] AI analysis failed:`, analysisError);
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Candidate-ID");
        res.header("Access-Control-Expose-Headers", "ETag, Content-Length");
        res.json({
          uploadURL: `/api/files/${filePath}`,
          url: `/api/files/${filePath}`,
          response: {
            body: {
              success: true,
              filePath,
              message: "File uploaded successfully, but AI analysis failed",
              analysisError: "AI analysis failed, please try manual analysis"
            }
          }
        });
      }
    } catch (error) {
      console.error("Error in proxy upload:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });
  app2.post("/api/candidates/:id/resume", requireAuth, upload.single("resume"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const candidate = await storage.getCandidate(req.params.id);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      const { jobId } = req.body;
      const useTargetedAnalysis = !!jobId;
      const useVision = req.file.mimetype === "application/pdf" && process.env.ENABLE_VISION_PARSING !== "false";
      console.log(`[Resume Upload] Processing with ${useVision ? "vision" : "text"} mode${useTargetedAnalysis ? " and targeted analysis" : ""} for ${req.file.originalname}`);
      let aiAnalysis;
      let parsedText = "";
      let contactInfo;
      let skills = [];
      let experience = 0;
      let targetedAnalysis = null;
      let interviewerBrief = null;
      const runAiResumeAnalysis = async (text2) => {
        try {
          const analysisResult = await aiService.analyzeResume(text2);
          aiAnalysis = analysisResult.analysis;
          await storage.createAiConversation({
            userId: "system",
            sessionId: `resume-parse-${req.params.id}`,
            message: `Analyze resume for candidate ${candidate.name}`,
            response: JSON.stringify(analysisResult.analysis),
            modelUsed: analysisResult.model,
            tokensUsed: analysisResult.usage.totalTokens
          });
        } catch (analysisError) {
          console.warn("[Resume Upload] AI resume analysis fallback triggered:", analysisError);
        }
      };
      try {
        const baselineParsed = await resumeParserService.parseFile(
          req.file.buffer,
          req.file.mimetype
        );
        parsedText = baselineParsed.text;
        const baselineContact = resumeParserService.extractContactInfo(parsedText);
        contactInfo = baselineContact ? {
          email: baselineContact.email,
          phone: baselineContact.phone,
          location: baselineContact.location
        } : void 0;
        skills = resumeParserService.extractSkills(parsedText);
        experience = resumeParserService.extractExperience(parsedText);
      } catch (parseError) {
        console.error("[Resume Upload] Failed to parse resume before analysis:", parseError);
        return res.status(422).json({ error: "\u65E0\u6CD5\u89E3\u6790\u4E0A\u4F20\u7684\u7B80\u5386\uFF0C\u8BF7\u786E\u8BA4\u6587\u4EF6\u672A\u635F\u574F\u4E14\u4E3A PDF \u683C\u5F0F\u3002" });
      }
      if (useTargetedAnalysis) {
        try {
          const job = await storage.getJob(jobId);
          if (job) {
            console.log(`[Resume Upload] Performing targeted analysis for job: ${job.title}`);
            const jobContext = {
              title: job.title,
              description: job.description,
              requirements: Array.isArray(job.requirements) ? job.requirements : [],
              focusAreas: Array.isArray(job.focusAreas) ? job.focusAreas : []
            };
            const analysis = await targetedResumeAnalyzer.analyzeForPosition(
              req.file.buffer,
              req.file.mimetype,
              jobContext
            );
            targetedAnalysis = analysis;
            interviewerBrief = targetedResumeAnalyzer.generateInterviewerBrief(analysis);
            const focusAreas = Array.isArray(analysis.interviewRecommendations?.focusAreas) ? analysis.interviewRecommendations.focusAreas.map(String) : [];
            aiAnalysis = {
              summary: analysis.basicInfo.summary,
              skills: analysis.skillsAssessment.technicalSkills.map((s) => s.skill),
              experience: analysis.experienceAnalysis.totalRelevantYears,
              education: analysis.basicInfo.summary,
              strengths: analysis.keyInsights.uniqueSellingPoints,
              weaknesses: analysis.risksAndConcerns.redFlags.map((r) => r.concern),
              recommendations: focusAreas
            };
            skills = aiAnalysis.skills ?? [];
            experience = aiAnalysis.experience ?? experience;
            contactInfo = {
              email: analysis.basicInfo.contact?.email ?? contactInfo?.email,
              phone: analysis.basicInfo.contact?.phone ?? contactInfo?.phone,
              location: analysis.basicInfo.contact?.location ?? contactInfo?.location
            };
            console.log(`[Resume Upload] Targeted analysis completed with score: ${analysis.jobFitAnalysis.overallScore}`);
          }
        } catch (error) {
          console.error(`[Resume Upload] Targeted analysis failed:`, error);
        }
      }
      if (!targetedAnalysis) {
        if (useVision) {
          try {
            const enhanced = await enhancedResumeParser.parse(
              req.file.buffer,
              req.file.mimetype
            );
            parsedText = enhanced.text;
            aiAnalysis = enhanced.analysis;
            skills = enhanced.analysis.skills;
            experience = enhanced.analysis.experience;
            const extractedContact = resumeParserService.extractContactInfo(parsedText);
            contactInfo = extractedContact ? {
              email: extractedContact.email,
              phone: extractedContact.phone,
              location: extractedContact.location
            } : void 0;
            console.log(`[Resume Upload] Vision analysis completed successfully`);
          } catch (error) {
            console.error(`[Resume Upload] Vision analysis failed, falling back to text mode:`, error);
            const fallbackContact = resumeParserService.extractContactInfo(parsedText);
            contactInfo = fallbackContact ? {
              email: fallbackContact.email,
              phone: fallbackContact.phone,
              location: fallbackContact.location
            } : contactInfo;
            skills = resumeParserService.extractSkills(parsedText);
            experience = resumeParserService.extractExperience(parsedText);
            await runAiResumeAnalysis(parsedText);
          }
        } else {
          await runAiResumeAnalysis(parsedText);
        }
      }
      if (candidate.resumeUrl) {
        try {
          console.log(`[Resume Upload] Deleting old resume: ${candidate.resumeUrl}`);
          await supabaseStorageService.deleteResume(candidate.resumeUrl);
          console.log(`[Resume Upload] Old resume deleted successfully`);
        } catch (deleteError) {
          console.warn(`[Resume Upload] Failed to delete old resume:`, deleteError);
        }
      }
      let resumeFilePath;
      try {
        console.log(`[Resume Upload] Uploading file to Supabase Storage...`);
        resumeFilePath = await supabaseStorageService.uploadResume(
          req.params.id,
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype
        );
        console.log(`[Resume Upload] File uploaded successfully: ${resumeFilePath}`);
      } catch (storageError) {
        console.error(`[Resume Upload] Failed to upload file to storage:`, storageError);
      }
      const resolvedAnalysis = aiAnalysis ?? {
        summary: "",
        skills,
        experience,
        education: candidate.education || "",
        strengths: [],
        weaknesses: [],
        recommendations: []
      };
      aiAnalysis = resolvedAnalysis;
      const updatedCandidate = await storage.updateCandidate(req.params.id, {
        resumeText: parsedText,
        resumeUrl: resumeFilePath,
        // 添加简历文件路径
        skills: skills.length > 0 ? skills : resolvedAnalysis.skills,
        experience: experience > 0 ? experience : resolvedAnalysis.experience,
        aiSummary: interviewerBrief || resolvedAnalysis.summary,
        name: candidate.name,
        email: contactInfo?.email || candidate.email,
        phone: contactInfo?.phone || candidate.phone
      });
      let initialProfile = null;
      let profileError = null;
      try {
        console.log(`[Resume Upload] Auto-generating initial profile for candidate ${req.params.id}`);
        const resumeAnalysisForProfile = {
          summary: aiAnalysis.summary,
          skills: skills.length > 0 ? skills : aiAnalysis.skills,
          experience: experience > 0 ? experience : aiAnalysis.experience,
          education: candidate.education || "",
          strengths: aiAnalysis.strengths || [],
          weaknesses: aiAnalysis.weaknesses || [],
          recommendations: aiAnalysis.recommendations || []
        };
        initialProfile = await candidateProfileService.buildInitialProfile(
          req.params.id,
          resumeAnalysisForProfile
        );
        console.log(`[Resume Upload] Initial profile v${initialProfile.version} created successfully`);
      } catch (error) {
        profileError = error instanceof Error ? error.message : "Failed to generate profile";
        console.error(`[Resume Upload] Failed to auto-generate profile:`, error);
      }
      const targetedAnalysisResponse = targetedAnalysis ? {
        overallScore: targetedAnalysis.jobFitAnalysis.overallScore,
        matchedRequirements: targetedAnalysis.jobFitAnalysis.matchedRequirements,
        missingRequirements: targetedAnalysis.jobFitAnalysis.missingRequirements,
        keyInsights: targetedAnalysis.keyInsights,
        interviewRecommendations: targetedAnalysis.interviewRecommendations,
        risksAndConcerns: targetedAnalysis.risksAndConcerns,
        interviewerBrief
      } : null;
      res.json({
        candidate: updatedCandidate,
        analysis: aiAnalysis,
        parsedData: {
          contactInfo,
          skills,
          experience,
          metadata: { analysisMode: targetedAnalysis ? "targeted" : useVision ? "vision" : "text" }
        },
        targetedAnalysis: targetedAnalysisResponse,
        profile: initialProfile ? {
          id: initialProfile.id,
          version: initialProfile.version,
          generated: true
        } : null,
        profileError
      });
    } catch (error) {
      console.error("Error processing resume:", error);
      res.status(500).json({ error: "Failed to process resume" });
    }
  });
  app2.get("/api/candidates/:id/resume/download", requireAuth, async (req, res) => {
    try {
      const candidate = await storage.getCandidate(req.params.id);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Forbidden: You don't have permission to access this resume" });
      }
      if (!candidate.resumeUrl) {
        return res.status(404).json({ error: "No resume file found for this candidate" });
      }
      const signedUrl = await supabaseStorageService.getResumeSignedUrl(candidate.resumeUrl);
      res.json({
        url: signedUrl,
        filename: candidate.resumeUrl.split("/").pop(),
        // 从路径提取文件名
        expiresIn: 3600
        // 1 小时
      });
    } catch (error) {
      console.error("Error getting resume download URL:", error);
      res.status(500).json({ error: "Failed to get resume download URL" });
    }
  });
  app2.post("/api/candidates/:id/analyze-uploaded-resume", requireAuth, async (req, res) => {
    try {
      const { filePath, jobId } = req.body;
      if (!filePath) {
        return res.status(400).json({ error: "File path is required" });
      }
      const candidate = await storage.getCandidate(req.params.id);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      console.log(`[Resume Analysis] Starting analysis for uploaded file: ${filePath}`);
      const fileBuffer = await supabaseStorageService.downloadResume(filePath);
      const mimeType = filePath.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream";
      const originalname = filePath.split("/").pop() || "resume.pdf";
      const useTargetedAnalysis = !!jobId;
      const useVision = mimeType === "application/pdf" && process.env.ENABLE_VISION_PARSING !== "false";
      console.log(`[Resume Analysis] Processing with ${useVision ? "vision" : "text"} mode${useTargetedAnalysis ? " and targeted analysis" : ""} for ${originalname}`);
      let aiAnalysis;
      let parsedText = "";
      let contactInfo;
      let skills = [];
      let experience = 0;
      let targetedAnalysis = null;
      let interviewerBrief = null;
      const runAiResumeAnalysis = async (text2) => {
        try {
          const analysisResult = await aiService.analyzeResume(text2);
          aiAnalysis = analysisResult.analysis;
          console.log(`[Resume Analysis] AI analysis completed successfully`);
        } catch (error) {
          console.error(`[Resume Analysis] AI analysis failed:`, error);
          throw error;
        }
      };
      try {
        const baselineParsed = await resumeParserService.parseFile(
          fileBuffer,
          mimeType
        );
        parsedText = baselineParsed.text;
        const baselineContact = resumeParserService.extractContactInfo(parsedText);
        contactInfo = baselineContact ? {
          email: baselineContact.email,
          phone: baselineContact.phone,
          location: baselineContact.location
        } : void 0;
        skills = resumeParserService.extractSkills(parsedText);
        experience = resumeParserService.extractExperience(parsedText);
      } catch (parseError) {
        console.error("[Resume Analysis] Failed to parse resume before analysis:", parseError);
        return res.status(422).json({ error: "\u65E0\u6CD5\u89E3\u6790\u4E0A\u4F20\u7684\u7B80\u5386\uFF0C\u8BF7\u786E\u8BA4\u6587\u4EF6\u672A\u635F\u574F\u4E14\u4E3A PDF \u683C\u5F0F\u3002" });
      }
      if (useTargetedAnalysis) {
        try {
          const job = await storage.getJob(jobId);
          if (job) {
            console.log(`[Resume Analysis] Performing targeted analysis for job: ${job.title}`);
            const jobContext = {
              title: job.title,
              description: job.description,
              requirements: Array.isArray(job.requirements) ? job.requirements : [],
              focusAreas: Array.isArray(job.focusAreas) ? job.focusAreas : []
            };
            const analysis = await targetedResumeAnalyzer.analyzeForPosition(
              fileBuffer,
              mimeType,
              jobContext
            );
            targetedAnalysis = analysis;
            interviewerBrief = targetedResumeAnalyzer.generateInterviewerBrief(analysis);
            const targetedSkills = analysis.skillsAssessment.technicalSkills.map((s) => s.skill);
            skills = Array.from(/* @__PURE__ */ new Set([...skills, ...targetedSkills]));
            experience = analysis.experienceAnalysis.totalRelevantYears || experience;
            console.log(`[Resume Analysis] Targeted analysis completed with score: ${analysis.jobFitAnalysis.overallScore}`);
          }
        } catch (error) {
          console.error(`[Resume Analysis] Targeted analysis failed:`, error);
        }
      }
      if (!targetedAnalysis) {
        if (useVision) {
          try {
            const enhanced = await enhancedResumeParser.parse(
              fileBuffer,
              mimeType
            );
            parsedText = enhanced.text;
            aiAnalysis = enhanced.analysis;
            skills = enhanced.analysis.skills;
            experience = enhanced.analysis.experience;
            const extractedContact = resumeParserService.extractContactInfo(parsedText);
            contactInfo = extractedContact ? {
              email: extractedContact.email,
              phone: extractedContact.phone,
              location: extractedContact.location
            } : void 0;
            console.log(`[Resume Analysis] Vision analysis completed successfully`);
          } catch (error) {
            console.error(`[Resume Analysis] Vision analysis failed, falling back to text mode:`, error);
            const fallbackContact = resumeParserService.extractContactInfo(parsedText);
            contactInfo = fallbackContact ? {
              email: fallbackContact.email,
              phone: fallbackContact.phone,
              location: fallbackContact.location
            } : contactInfo;
            skills = resumeParserService.extractSkills(parsedText);
            experience = resumeParserService.extractExperience(parsedText);
            await runAiResumeAnalysis(parsedText);
          }
        } else {
          await runAiResumeAnalysis(parsedText);
        }
      }
      const resolvedAnalysis = aiAnalysis ?? {
        summary: "",
        skills,
        experience,
        education: candidate.education || "",
        strengths: [],
        weaknesses: [],
        recommendations: []
      };
      aiAnalysis = resolvedAnalysis;
      const updatedCandidate = await storage.updateCandidate(req.params.id, {
        resumeText: parsedText,
        resumeUrl: filePath,
        // 更新简历文件路径
        skills: skills.length > 0 ? skills : resolvedAnalysis.skills,
        experience: experience > 0 ? experience : resolvedAnalysis.experience,
        aiSummary: interviewerBrief || resolvedAnalysis.summary,
        name: candidate.name,
        email: contactInfo?.email || candidate.email,
        phone: contactInfo?.phone || candidate.phone
      });
      let initialProfile = null;
      let profileError = null;
      try {
        console.log(`[Resume Analysis] Auto-generating initial profile for candidate ${req.params.id}`);
        const resumeAnalysisForProfile = {
          summary: aiAnalysis.summary,
          skills: skills.length > 0 ? skills : aiAnalysis.skills,
          experience: experience > 0 ? experience : aiAnalysis.experience,
          education: candidate.education || "",
          strengths: aiAnalysis.strengths || [],
          weaknesses: aiAnalysis.weaknesses || [],
          recommendations: aiAnalysis.recommendations || []
        };
        initialProfile = await candidateProfileService.buildInitialProfile(
          req.params.id,
          resumeAnalysisForProfile
        );
        console.log(`[Resume Analysis] Initial profile v${initialProfile.version} created successfully`);
      } catch (error) {
        profileError = error instanceof Error ? error.message : "Failed to generate profile";
        console.error(`[Resume Analysis] Failed to auto-generate profile:`, error);
      }
      const targetedAnalysisResponse = targetedAnalysis ? {
        overallScore: targetedAnalysis.jobFitAnalysis.overallScore,
        matchedRequirements: targetedAnalysis.jobFitAnalysis.matchedRequirements,
        missingRequirements: targetedAnalysis.jobFitAnalysis.missingRequirements,
        keyInsights: targetedAnalysis.keyInsights,
        interviewRecommendations: targetedAnalysis.interviewRecommendations,
        risksAndConcerns: targetedAnalysis.risksAndConcerns,
        interviewerBrief
      } : null;
      res.json({
        candidate: updatedCandidate,
        analysis: aiAnalysis,
        parsedData: {
          contactInfo,
          skills,
          experience,
          metadata: { analysisMode: targetedAnalysis ? "targeted" : useVision ? "vision" : "text" }
        },
        targetedAnalysis: targetedAnalysisResponse,
        profile: initialProfile ? {
          id: initialProfile.id,
          version: initialProfile.version,
          generated: true
        } : null,
        profileError
      });
    } catch (error) {
      console.error("Error analyzing uploaded resume:", error);
      res.status(500).json({ error: "Failed to analyze uploaded resume" });
    }
  });
  app2.post("/api/candidates/:id/targeted-analysis", requireAuth, upload.single("resume"), async (req, res) => {
    try {
      const { jobId } = req.body;
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      if (!jobId) {
        return res.status(400).json({ error: "Job ID is required for targeted analysis" });
      }
      const candidate = await storage.getCandidate(req.params.id);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      console.log(`[Targeted Analysis] Starting for candidate ${candidate.name} and job ${job.title}`);
      let parsedText = "";
      let baselineSkills = [];
      let baselineExperience = candidate.experience ?? 0;
      let baselineContact = resumeParserService.extractContactInfo(candidate.resumeText ?? "") || void 0;
      try {
        const parsedResume = await resumeParserService.parseFile(req.file.buffer, req.file.mimetype);
        parsedText = parsedResume.text;
        baselineSkills = resumeParserService.extractSkills(parsedText);
        baselineExperience = resumeParserService.extractExperience(parsedText) || baselineExperience;
        const contact = resumeParserService.extractContactInfo(parsedText);
        baselineContact = contact ?? baselineContact;
      } catch (parseError) {
        console.error("[Targeted Analysis] Failed to parse resume for baseline extraction:", parseError);
        return res.status(422).json({ error: "\u65E0\u6CD5\u89E3\u6790\u4E0A\u4F20\u7684\u7B80\u5386\uFF0C\u8BF7\u786E\u8BA4\u6587\u4EF6\u672A\u635F\u574F\u4E14\u4E3A PDF \u683C\u5F0F\u3002" });
      }
      const jobContext = {
        title: job.title,
        description: job.description,
        requirements: Array.isArray(job.requirements) ? job.requirements : [],
        focusAreas: Array.isArray(job.focusAreas) ? job.focusAreas : []
      };
      const targetedAnalysis = await targetedResumeAnalyzer.analyzeForPosition(
        req.file.buffer,
        req.file.mimetype,
        jobContext
      );
      const interviewerBrief = targetedResumeAnalyzer.generateInterviewerBrief(targetedAnalysis);
      const mergedSkills = Array.from(/* @__PURE__ */ new Set([
        ...baselineSkills,
        ...targetedAnalysis.skillsAssessment.technicalSkills.map((s) => s.skill)
      ]));
      const updatedCandidate = await storage.updateCandidate(req.params.id, {
        resumeText: parsedText,
        skills: mergedSkills,
        experience: targetedAnalysis.experienceAnalysis.totalRelevantYears || baselineExperience,
        aiSummary: interviewerBrief,
        targetedAnalysis,
        email: targetedAnalysis.basicInfo.contact?.email || baselineContact?.email || candidate.email,
        phone: targetedAnalysis.basicInfo.contact?.phone || baselineContact?.phone || candidate.phone,
        location: targetedAnalysis.basicInfo.contact?.location || candidate.location
      });
      if (targetedAnalysis.jobFitAnalysis.overallScore > 0) {
        const existingMatch = await storage.getJobMatch(jobId, req.params.id);
        if (existingMatch) {
          await storage.updateJobMatch(existingMatch.id, {
            score: targetedAnalysis.jobFitAnalysis.overallScore.toString(),
            analysis: {
              targeted: true,
              ...targetedAnalysis.jobFitAnalysis
            }
          });
        } else {
          await storage.createJobMatch({
            jobId,
            candidateId: req.params.id,
            score: targetedAnalysis.jobFitAnalysis.overallScore.toString(),
            status: "pending",
            analysis: {
              targeted: true,
              ...targetedAnalysis.jobFitAnalysis
            }
          });
        }
      }
      console.log(`[Targeted Analysis] Completed with score ${targetedAnalysis.jobFitAnalysis.overallScore}`);
      res.json({
        candidate: updatedCandidate,
        analysis: targetedAnalysis,
        interviewerBrief,
        matchScore: targetedAnalysis.jobFitAnalysis.overallScore
      });
    } catch (error) {
      console.error("Error in targeted resume analysis:", error);
      res.status(500).json({ error: "Failed to perform targeted analysis" });
    }
  });
  app2.get("/api/candidates/:id/profiles", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const candidate = await storage.getCandidate(id);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      const profiles = await candidateProfileService.getProfileEvolution(id);
      res.json(profiles);
    } catch (error) {
      console.error("Error fetching candidate profiles:", error);
      res.status(500).json({ error: "Failed to fetch candidate profiles" });
    }
  });
  app2.get("/api/candidates/:id/profiles/latest", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const candidate = await storage.getCandidate(id);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      const profile = await storage.getLatestCandidateProfile(id);
      if (!profile) {
        return res.status(404).json({ error: "No profile found for this candidate" });
      }
      res.json(profile);
    } catch (error) {
      console.error("Error fetching latest candidate profile:", error);
      res.status(500).json({ error: "Failed to fetch latest candidate profile" });
    }
  });
  app2.get("/api/candidates/:id/profiles/:version", requireAuth, async (req, res) => {
    try {
      const { id, version: versionParam } = req.params;
      const candidate = await storage.getCandidate(id);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      const version = parseInt(versionParam);
      if (isNaN(version) || version < 1) {
        return res.status(400).json({ error: "Invalid version number" });
      }
      const profile = await storage.getCandidateProfileByVersion(id, version);
      if (!profile) {
        return res.status(404).json({ error: "Profile version not found" });
      }
      res.json(profile);
    } catch (error) {
      console.error("Error fetching candidate profile by version:", error);
      res.status(500).json({ error: "Failed to fetch candidate profile" });
    }
  });
  app2.post("/api/candidates/:id/profiles/build", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const candidate = await storage.getCandidate(id);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      if (!candidate.resumeText || !candidate.aiSummary) {
        return res.status(400).json({
          error: "Candidate must have resume analysis before building profile"
        });
      }
      const resumeAnalysis = {
        summary: candidate.aiSummary || "",
        skills: candidate.skills || [],
        experience: candidate.experience || 0,
        education: candidate.education || "",
        strengths: [],
        weaknesses: [],
        recommendations: []
      };
      const { jobId } = req.body;
      if (jobId && typeof jobId !== "string") {
        return res.status(400).json({ error: "Invalid jobId format" });
      }
      if (jobId) {
        const job = await storage.getJob(jobId);
        if (!job) {
          return res.status(404).json({ error: "Job not found" });
        }
      }
      console.log(`[API] Building profile for candidate ${id}${jobId ? ` with job ${jobId}` : ""}`);
      const profile = await candidateProfileService.buildInitialProfile(
        id,
        resumeAnalysis,
        jobId
      );
      res.status(201).json(profile);
    } catch (error) {
      console.error("Error building candidate profile:", error);
      const isDev = process.env.NODE_ENV === "development";
      res.status(500).json({
        error: "Failed to build candidate profile",
        ...isDev && { details: error instanceof Error ? error.message : String(error) }
      });
    }
  });
  app2.post("/api/candidates/:candidateId/profiles/update-from-interview/:interviewId", requireAuth, async (req, res) => {
    try {
      const { candidateId, interviewId } = req.params;
      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      const interview = await storage.getInterview(interviewId);
      if (!interview) {
        return res.status(404).json({ error: "Interview not found" });
      }
      if (interview.candidateId !== candidateId) {
        return res.status(400).json({ error: "Interview does not belong to this candidate" });
      }
      console.log(`[API] Updating profile for candidate ${candidateId} from interview ${interviewId}`);
      const profile = await candidateProfileService.updateProfileWithInterview(
        candidateId,
        interviewId
      );
      res.json(profile);
    } catch (error) {
      console.error("Error updating candidate profile:", error);
      const isDev = process.env.NODE_ENV === "development";
      res.status(500).json({
        error: "Failed to update candidate profile",
        ...isDev && { details: error instanceof Error ? error.message : String(error) }
      });
    }
  });
  app2.post("/api/candidates/:candidateId/organizational-fit", requireAuth, async (req, res) => {
    try {
      const { candidateId } = req.params;
      const { stage = "resume", jobId } = req.body;
      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      let job = void 0;
      if (jobId) {
        job = await storage.getJob(jobId);
      }
      const profileHistory = await storage.getCandidateProfiles(candidateId);
      const cultureInput = {
        resumeText: candidate.resumeText || candidate.resumeAnalysis?.summary || "",
        interviewTranscripts: void 0,
        profileHistory,
        behavioralResponses: void 0
      };
      const leadershipInput = {
        resumeText: candidate.resumeText || candidate.resumeAnalysis?.summary || "",
        interviewTranscripts: void 0,
        profileHistory,
        managementExperience: void 0,
        achievements: candidate.resumeAnalysis?.strengths || []
      };
      const [cultureAssessment, leadershipAssessment] = await Promise.all([
        organizationalFitService.assessCultureFit(cultureInput, stage),
        organizationalFitService.assessLeadership(leadershipInput, stage)
      ]);
      res.json({
        candidateId,
        stage,
        cultureAssessment,
        leadershipAssessment,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (error) {
      console.error("Error assessing organizational fit:", error);
      res.status(500).json({
        error: "Failed to assess organizational fit",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.get("/api/candidates/:candidateId/organizational-fit/evolution", requireAuth, async (req, res) => {
    try {
      const { candidateId } = req.params;
      const profiles = await storage.getCandidateProfiles(candidateId);
      if (!profiles.length) {
        return res.status(404).json({ error: "No profiles found for candidate" });
      }
      const cultureHistory = [];
      const leadershipHistory = [];
      for (const profile of profiles) {
        const profileData = profile.profileData;
        if (profileData?.organizationalFit) {
          if (profileData.organizationalFit.cultureAssessment) {
            cultureHistory.push(profileData.organizationalFit.cultureAssessment);
          }
          if (profileData.organizationalFit.leadershipAssessment) {
            leadershipHistory.push(profileData.organizationalFit.leadershipAssessment);
          }
        }
      }
      const evolutionReport = organizationalFitService.generateEvolutionReport(
        cultureHistory,
        leadershipHistory
      );
      res.json({
        candidateId,
        evolutionReport,
        assessmentCount: profiles.length,
        latestStage: profiles[profiles.length - 1].stage
      });
    } catch (error) {
      console.error("Error generating evolution report:", error);
      res.status(500).json({
        error: "Failed to generate evolution report",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.get("/api/company/config", requireAuth, async (req, res) => {
    try {
      const config = await companyConfigService.getCurrentConfig();
      res.json(config);
    } catch (error) {
      console.error("Error getting company config:", error);
      res.status(500).json({
        error: "Failed to get company configuration",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.put("/api/company/config", requireAuth, async (req, res) => {
    try {
      const updatedConfig = await companyConfigService.updateConfig(req.body);
      res.json(updatedConfig);
    } catch (error) {
      console.error("Error updating company config:", error);
      res.status(500).json({
        error: "Failed to update company configuration",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.get("/api/company/config/culture-values", requireAuth, async (req, res) => {
    try {
      const values = await companyConfigService.getCultureValues();
      res.json(values);
    } catch (error) {
      console.error("Error getting culture values:", error);
      res.status(500).json({
        error: "Failed to get culture values",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.get("/api/company/config/leadership-dimensions", requireAuth, async (req, res) => {
    try {
      const dimensions = await companyConfigService.getLeadershipDimensions();
      res.json(dimensions);
    } catch (error) {
      console.error("Error getting leadership dimensions:", error);
      res.status(500).json({
        error: "Failed to get leadership dimensions",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.get("/api/company/config/interview-questions/:stage", requireAuth, async (req, res) => {
    try {
      const { stage } = req.params;
      const questions = await companyConfigService.generateInterviewQuestions(
        stage
      );
      res.json(questions);
    } catch (error) {
      console.error("Error generating interview questions:", error);
      res.status(500).json({
        error: "Failed to generate interview questions",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.post("/api/interviews/:id/feedback", requireAuth, async (req, res) => {
    try {
      const interviewId = req.params.id;
      const feedback = req.body;
      const interview = await storage.getInterview(interviewId);
      if (!interview) {
        return res.status(404).json({ error: "Interview not found" });
      }
      const { interviewFeedbackService: interviewFeedbackService2 } = await Promise.resolve().then(() => (init_interviewFeedbackService(), interviewFeedbackService_exports));
      const updatedProfile = await interviewFeedbackService2.submitFeedbackAndUpdateProfile(
        interview.candidateId,
        interview.jobId,
        feedback
      );
      res.json({
        success: true,
        message: "Feedback submitted and profile updated",
        profileId: updatedProfile.id,
        profileVersion: updatedProfile.version,
        newStage: updatedProfile.stage
      });
    } catch (error) {
      console.error("Error submitting interview feedback:", error);
      res.status(500).json({
        error: "Failed to submit feedback",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.get("/api/candidates/:candidateId/interview-process", requireAuth, async (req, res) => {
    try {
      const { candidateId } = req.params;
      const { jobId } = req.query;
      if (!jobId) {
        return res.status(400).json({ error: "jobId is required" });
      }
      const { interviewFeedbackService: interviewFeedbackService2 } = await Promise.resolve().then(() => (init_interviewFeedbackService(), interviewFeedbackService_exports));
      const process2 = await interviewFeedbackService2.getCandidateInterviewProcess(
        candidateId,
        jobId
      );
      res.json(process2);
    } catch (error) {
      console.error("Error getting interview process:", error);
      res.status(500).json({
        error: "Failed to get interview process",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.post("/api/jobs/:jobId/match-candidates", requireAuth, async (req, res) => {
    try {
      const job = await storage.getJob(req.params.jobId);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      const candidates2 = await storage.getCandidates();
      const matches = await matchingService.findMatchingCandidates(job, candidates2);
      res.json(matches);
    } catch (error) {
      console.error("Error matching candidates:", error);
      res.status(500).json({ error: "Failed to match candidates" });
    }
  });
  app2.post("/api/candidates/:candidateId/calculate-match", requireAuth, async (req, res) => {
    try {
      const { jobId } = req.body;
      const [candidate, job] = await Promise.all([
        storage.getCandidate(req.params.candidateId),
        storage.getJob(jobId)
      ]);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      const basicMatch = matchingService.calculateBasicMatch(candidate, job);
      let aiMatch;
      try {
        const matchResult = await aiService.matchCandidateToJob(
          {
            skills: candidate.skills || [],
            experience: candidate.experience || 0,
            education: candidate.education || "",
            position: candidate.position || ""
          },
          {
            title: job.title,
            requirements: job.requirements || [],
            description: job.description
          }
        );
        aiMatch = matchResult.match;
        try {
          await storage.createAiConversation({
            userId: "system",
            sessionId: `calculate-match-${candidate.id}-${jobId}`,
            message: `Calculate detailed match score for candidate ${candidate.name} and job ${job.title}`,
            response: JSON.stringify(matchResult.match),
            modelUsed: matchResult.model,
            tokensUsed: matchResult.usage.totalTokens
          });
        } catch (tokenError) {
          console.error("[Token Tracking] Failed to record match token usage:", tokenError);
        }
      } catch (error) {
        console.error("AI match failed, using basic match:", error);
        aiMatch = { score: basicMatch, reasons: ["Basic matching used"], explanation: "AI matching unavailable" };
      }
      await storage.updateCandidate(req.params.candidateId, {
        matchScore: aiMatch.score.toString()
      });
      res.json({
        candidateId: candidate.id,
        jobId: job.id,
        basicMatchScore: basicMatch,
        aiMatchScore: aiMatch.score,
        reasons: aiMatch.reasons,
        explanation: aiMatch.explanation
      });
    } catch (error) {
      console.error("Error calculating match:", error);
      res.status(500).json({ error: "Failed to calculate match" });
    }
  });
  app2.get("/api/interviews", requireAuth, async (req, res) => {
    try {
      const { candidateId, jobId } = req.query;
      let interviews2;
      if (candidateId && typeof candidateId === "string") {
        interviews2 = await storage.getInterviewsByCandidate(candidateId);
      } else if (jobId && typeof jobId === "string") {
        interviews2 = await storage.getInterviewsByJob(jobId);
      } else {
        interviews2 = await storage.getInterviews();
      }
      res.json(interviews2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch interviews" });
    }
  });
  app2.get("/api/interviews/:id", requireAuth, async (req, res) => {
    try {
      const interview = await storage.getInterview(req.params.id);
      if (!interview) {
        return res.status(404).json({ error: "Interview not found" });
      }
      res.json(interview);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch interview" });
    }
  });
  app2.post("/api/interviews", requireAuth, async (req, res) => {
    try {
      const interviewData = insertInterviewSchema.parse(req.body);
      const interview = await storage.createInterview(interviewData);
      if (interview.candidateId && interview.status === "scheduled") {
        storage.getInterviewPreparation(interview.id).then((existingPrep) => {
          if (!existingPrep) {
            return candidateProfileService.generateInterviewPreparation(
              interview.candidateId,
              interview.id,
              interview.interviewerId || void 0
            ).then((preparation) => {
              console.log(`[Interview] Auto-generated preparation ${preparation.id} for interview ${interview.id}`);
            });
          } else {
            console.log(`[Interview] Preparation already exists for interview ${interview.id}`);
          }
        }).catch((error) => {
          console.error(`[Interview] Failed to auto-generate preparation for interview ${interview.id}:`, error);
        });
      }
      res.status(201).json(interview);
    } catch (error) {
      res.status(400).json({ error: "Invalid interview data" });
    }
  });
  app2.put("/api/interviews/:id", requireAuth, async (req, res) => {
    try {
      const existingInterview = await storage.getInterview(req.params.id);
      if (!existingInterview) {
        return res.status(404).json({ error: "Interview not found" });
      }
      const interview = await storage.updateInterview(req.params.id, req.body);
      if (!interview) {
        return res.status(404).json({ error: "Interview not found" });
      }
      let updatedProfile = null;
      let profileError = null;
      const isJustCompleted = existingInterview.status !== "completed" && interview.status === "completed";
      const hasNewFeedback = !existingInterview.feedback && interview.feedback || !existingInterview.transcription && interview.transcription;
      const shouldUpdateProfile = (isJustCompleted || hasNewFeedback) && (interview.feedback || interview.transcription);
      if (shouldUpdateProfile && interview.candidateId) {
        try {
          console.log(`[Interview Update] Auto-updating profile for candidate ${interview.candidateId} after interview ${interview.id}`);
          updatedProfile = await candidateProfileService.updateProfileWithInterview(
            interview.candidateId,
            interview.id
          );
          console.log(`[Interview Update] Profile updated to v${updatedProfile.version} (stage: ${updatedProfile.stage})`);
        } catch (error) {
          profileError = error instanceof Error ? error.message : "Failed to update profile";
          console.error(`[Interview Update] Failed to auto-update profile:`, error);
        }
      }
      res.json({
        interview,
        profile: updatedProfile ? {
          id: updatedProfile.id,
          version: updatedProfile.version,
          stage: updatedProfile.stage,
          updated: true
        } : null,
        profileError
      });
    } catch (error) {
      console.error("Error updating interview:", error);
      res.status(500).json({ error: "Failed to update interview" });
    }
  });
  app2.post("/api/interviews/:id/cancel", requireAuth, async (req, res) => {
    try {
      const existingInterview = await storage.getInterview(req.params.id);
      if (!existingInterview) {
        return res.status(404).json({ error: "Interview not found" });
      }
      if (existingInterview.status === "cancelled") {
        return res.status(400).json({ error: "Interview is already cancelled" });
      }
      if (existingInterview.status === "completed") {
        return res.status(400).json({ error: "Cannot cancel completed interview" });
      }
      const interview = await storage.updateInterview(req.params.id, {
        status: "cancelled",
        updatedAt: /* @__PURE__ */ new Date()
      });
      res.json(interview);
    } catch (error) {
      console.error("Error cancelling interview:", error);
      res.status(500).json({ error: "Failed to cancel interview" });
    }
  });
  app2.post("/api/interviews/:interviewId/preparation", requireAuth, async (req, res) => {
    try {
      const { interviewId } = req.params;
      const { candidateId, interviewerId } = req.body;
      if (!candidateId) {
        return res.status(400).json({ error: "candidateId is required" });
      }
      const interview = await storage.getInterview(interviewId);
      if (!interview) {
        return res.status(404).json({ error: "Interview not found" });
      }
      const preparation = await candidateProfileService.generateInterviewPreparation(
        candidateId,
        interviewId,
        interviewerId || interview.interviewerId
      );
      console.log(`[Interview Preparation] Generated preparation ${preparation.id} for interview ${interviewId}`);
      res.json(preparation);
    } catch (error) {
      console.error("Failed to generate interview preparation:", error);
      res.status(500).json({
        error: "Failed to generate preparation",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.get("/api/interviews/:interviewId/preparation", requireAuth, async (req, res) => {
    try {
      const { interviewId } = req.params;
      const preparation = await storage.getInterviewPreparation(interviewId);
      if (!preparation) {
        return res.status(404).json({ error: "Preparation not found" });
      }
      if (!preparation.viewedAt && preparation.id) {
        await storage.updateInterviewPreparation(preparation.id, {
          viewedAt: /* @__PURE__ */ new Date()
        });
      }
      res.json(preparation);
    } catch (error) {
      console.error("Failed to get interview preparation:", error);
      res.status(500).json({ error: "Failed to get preparation" });
    }
  });
  app2.post("/api/interviews/:interviewId/preparation/feedback", requireAuth, async (req, res) => {
    try {
      const { interviewId } = req.params;
      const { rating, comment } = req.body;
      const preparation = await storage.getInterviewPreparation(interviewId);
      if (!preparation || !preparation.id) {
        return res.status(404).json({ error: "Preparation not found" });
      }
      if (rating && (rating < 1 || rating > 5)) {
        return res.status(400).json({ error: "Rating must be between 1 and 5" });
      }
      const updated = await storage.updateInterviewPreparation(preparation.id, {
        feedbackRating: rating,
        feedbackComment: comment
      });
      console.log(`[Interview Preparation] Feedback submitted for preparation ${preparation.id}`);
      res.json(updated);
    } catch (error) {
      console.error("Failed to submit preparation feedback:", error);
      res.status(500).json({ error: "Failed to submit feedback" });
    }
  });
  app2.post("/api/interviews/transcribe", requireAuth, async (req, res) => {
    try {
      const { interviewId } = req.body;
      const audioFile = req.file;
      if (!audioFile) {
        return res.status(400).json({ error: "No audio file provided" });
      }
      const mockTranscription = `
        \u9762\u8BD5\u5B98\uFF1A\u8BF7\u4ECB\u7ECD\u4E00\u4E0B\u4F60\u6700\u8FD1\u7684\u9879\u76EE\u7ECF\u5386\u3002
        \u5019\u9009\u4EBA\uFF1A\u6211\u6700\u8FD1\u8D1F\u8D23\u4E86\u4E00\u4E2A\u7535\u5546\u5E73\u53F0\u7684\u91CD\u6784\u9879\u76EE\uFF0C\u4E3B\u8981\u8D1F\u8D23\u67B6\u6784\u8BBE\u8BA1\u548C\u6280\u672F\u9009\u578B...
        \u9762\u8BD5\u5B98\uFF1A\u5728\u8FD9\u4E2A\u9879\u76EE\u4E2D\u9047\u5230\u7684\u6700\u5927\u6311\u6218\u662F\u4EC0\u4E48\uFF1F
        \u5019\u9009\u4EBA\uFF1A\u6700\u5927\u7684\u6311\u6218\u662F\u5982\u4F55\u5728\u4FDD\u8BC1\u7CFB\u7EDF\u7A33\u5B9A\u6027\u7684\u540C\u65F6\u8FDB\u884C\u67B6\u6784\u5347\u7EA7...
      `;
      const keyFindings = [
        "\u5177\u6709\u5927\u578B\u9879\u76EE\u67B6\u6784\u8BBE\u8BA1\u7ECF\u9A8C",
        "\u719F\u6089\u5FAE\u670D\u52A1\u67B6\u6784",
        "\u6CE8\u91CD\u7CFB\u7EDF\u7A33\u5B9A\u6027",
        "\u6709\u6280\u672F\u9009\u578B\u51B3\u7B56\u7ECF\u9A8C"
      ];
      const concernAreas = [
        "\u9700\u8981\u8FDB\u4E00\u6B65\u4E86\u89E3\u5177\u4F53\u6280\u672F\u7EC6\u8282",
        "\u56E2\u961F\u534F\u4F5C\u7ECF\u9A8C\u9700\u8981\u6DF1\u5165\u8BC4\u4F30"
      ];
      if (interviewId) {
        await storage.updateInterview(interviewId, {
          transcription: mockTranscription,
          transcriptionMethod: "audio"
        });
      }
      res.json({
        transcription: mockTranscription,
        keyFindings,
        concernAreas,
        confidence: 0.95
      });
    } catch (error) {
      console.error("Transcription error:", error);
      res.status(500).json({ error: "Failed to transcribe audio" });
    }
  });
  app2.post("/api/interviews/ai-analyze", requireAuth, async (req, res) => {
    try {
      const { interviewId, content, candidateInfo } = req.body;
      if (!content) {
        return res.status(400).json({ error: "No content to analyze" });
      }
      const analysisPrompt = `
        \u5206\u6790\u4EE5\u4E0B\u9762\u8BD5\u5185\u5BB9\uFF0C\u63D0\u53D6\u5019\u9009\u4EBA\u7684\u4F18\u52BF\u3001\u52A3\u52BF\u548C\u5173\u952E\u53D1\u73B0\uFF1A

        \u5019\u9009\u4EBA\u4FE1\u606F\uFF1A
        \u59D3\u540D\uFF1A${candidateInfo?.name || "\u672A\u77E5"}
        \u804C\u4F4D\uFF1A${candidateInfo?.position || "\u672A\u77E5"}
        \u7ECF\u9A8C\uFF1A${candidateInfo?.experience || 0}\u5E74

        \u9762\u8BD5\u5185\u5BB9\uFF1A
        ${content}

        \u8BF7\u63D0\u4F9B\uFF1A
        1. \u4E3B\u8981\u4F18\u52BF\uFF083-5\u4E2A\uFF09
        2. \u9700\u8981\u6539\u8FDB\u7684\u5730\u65B9\uFF082-3\u4E2A\uFF09
        3. \u5173\u952E\u53D1\u73B0
        4. \u5EFA\u8BAE\u7684\u8BC4\u5206
      `;
      const analysisResult = {
        strengths: [
          "\u624E\u5B9E\u7684\u6280\u672F\u57FA\u7840",
          "\u826F\u597D\u7684\u95EE\u9898\u89E3\u51B3\u80FD\u529B",
          "\u6E05\u6670\u7684\u6C9F\u901A\u8868\u8FBE",
          "\u4E30\u5BCC\u7684\u9879\u76EE\u7ECF\u9A8C"
        ],
        weaknesses: [
          "\u9886\u5BFC\u529B\u7ECF\u9A8C\u6709\u9650",
          "\u5BF9\u65B0\u6280\u672F\u4E86\u89E3\u4E0D\u591F\u6DF1\u5165"
        ],
        keyFindings: [
          "\u9002\u5408\u9AD8\u7EA7\u5DE5\u7A0B\u5E08\u804C\u4F4D",
          "\u6709\u6F5C\u529B\u53D1\u5C55\u4E3A\u6280\u672F\u8D1F\u8D23\u4EBA",
          "\u9700\u8981\u52A0\u5F3A\u56E2\u961F\u7BA1\u7406\u80FD\u529B"
        ],
        concernAreas: [
          "\u8DF3\u69FD\u9891\u7387\u7565\u9AD8",
          "\u671F\u671B\u85AA\u8D44\u53EF\u80FD\u8D85\u51FA\u9884\u7B97"
        ],
        suggestedScores: {
          technical: 85,
          communication: 80,
          problemSolving: 82,
          cultureFit: 75,
          leadership: 65
        },
        suggestions: [
          "\u5EFA\u8BAE\u8FDB\u884C\u7B2C\u4E8C\u8F6E\u6280\u672F\u6DF1\u5EA6\u9762\u8BD5",
          "\u8BC4\u4F30\u5019\u9009\u4EBA\u7684\u56E2\u961F\u534F\u4F5C\u80FD\u529B",
          "\u4E86\u89E3\u5019\u9009\u4EBA\u7684\u957F\u671F\u804C\u4E1A\u89C4\u5212"
        ]
      };
      res.json(analysisResult);
    } catch (error) {
      console.error("AI analysis error:", error);
      res.status(500).json({ error: "Failed to analyze content" });
    }
  });
  app2.post("/api/hiring-decisions", requireAuth, async (req, res) => {
    try {
      const { candidateId, jobId } = req.body;
      if (!candidateId || !jobId) {
        return res.status(400).json({ error: "candidateId and jobId are required" });
      }
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(candidateId) || !uuidRegex.test(jobId)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }
      const [candidate, job] = await Promise.all([
        storage.getCandidate(candidateId),
        storage.getJob(jobId)
      ]);
      if (!candidate || !job) {
        return res.status(404).json({ error: "Candidate or job not found" });
      }
      const { hiringDecisionService: hiringDecisionService2 } = await Promise.resolve().then(() => (init_hiringDecisionService(), hiringDecisionService_exports));
      const decision = await hiringDecisionService2.generateHiringDecision(
        candidateId,
        jobId,
        req.user?.id
        // 如果有用户认证系统，传递用户ID
      );
      console.log(`[HiringDecision] Generated decision ${decision.id} for candidate ${candidateId} and job ${jobId}`);
      res.json(decision);
    } catch (error) {
      console.error("Failed to generate hiring decision:", error);
      res.status(500).json({
        error: "Failed to generate hiring decision",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.get("/api/hiring-decisions/:candidateId/:jobId", requireAuth, async (req, res) => {
    try {
      const { candidateId, jobId } = req.params;
      const decision = await storage.getHiringDecision(candidateId, jobId);
      if (!decision) {
        return res.status(404).json({ error: "Hiring decision not found" });
      }
      if (!decision.viewedAt) {
        await storage.updateHiringDecision(decision.id, {
          viewedAt: /* @__PURE__ */ new Date()
        });
      }
      res.json(decision);
    } catch (error) {
      console.error("Failed to fetch hiring decision:", error);
      res.status(500).json({ error: "Failed to fetch hiring decision" });
    }
  });
  app2.put("/api/hiring-decisions/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const decision = await storage.updateHiringDecision(id, updates);
      if (!decision) {
        return res.status(404).json({ error: "Hiring decision not found" });
      }
      console.log(`[HiringDecision] Updated decision ${id}`);
      res.json(decision);
    } catch (error) {
      console.error("Failed to update hiring decision:", error);
      res.status(500).json({ error: "Failed to update hiring decision" });
    }
  });
  app2.post("/api/hiring-decisions/:id/feedback", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { rating, comment } = req.body;
      if (rating && (rating < 1 || rating > 5)) {
        return res.status(400).json({ error: "Rating must be between 1 and 5" });
      }
      const decision = await storage.updateHiringDecision(id, {
        feedbackRating: rating,
        feedbackComment: comment
      });
      if (!decision) {
        return res.status(404).json({ error: "Hiring decision not found" });
      }
      console.log(`[HiringDecision] Feedback submitted for decision ${id}`);
      res.json(decision);
    } catch (error) {
      console.error("Failed to submit hiring decision feedback:", error);
      res.status(500).json({ error: "Failed to submit feedback" });
    }
  });
  app2.post("/api/hiring-decisions/:id/finalize", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { decidedBy } = req.body;
      const decision = await storage.updateHiringDecision(id, {
        status: "final",
        decidedBy: decidedBy || null,
        decidedAt: /* @__PURE__ */ new Date()
      });
      if (!decision) {
        return res.status(404).json({ error: "Hiring decision not found" });
      }
      console.log(`[HiringDecision] Decision ${id} finalized`);
      res.json(decision);
    } catch (error) {
      console.error("Failed to finalize hiring decision:", error);
      res.status(500).json({ error: "Failed to finalize decision" });
    }
  });
  app2.get("/api/hiring-decisions/job/:jobId", requireAuth, async (req, res) => {
    try {
      const { jobId } = req.params;
      const decisions = await storage.getHiringDecisionsByJob(jobId);
      const decisionsWithCandidates = await Promise.all(
        decisions.map(async (decision) => {
          const candidate = await storage.getCandidate(decision.candidateId);
          return {
            ...decision,
            candidate: candidate ? {
              id: candidate.id,
              name: candidate.name,
              position: candidate.position,
              email: candidate.email,
              experience: candidate.resumeAnalysis?.experience,
              skills: candidate.resumeAnalysis?.skills
            } : null
          };
        })
      );
      console.log(`[HiringDecision] Retrieved ${decisionsWithCandidates.length} decisions for job ${jobId}`);
      res.json(decisionsWithCandidates);
    } catch (error) {
      console.error("Failed to get hiring decisions for job:", error);
      res.status(500).json({ error: "Failed to fetch hiring decisions" });
    }
  });
  app2.post("/api/ai/chat", requireAuth, async (req, res) => {
    try {
      const { message, sessionId, context, templateId } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }
      let result;
      if (templateId) {
        const template = await promptTemplateService.getTemplate(templateId);
        if (!template) {
          return res.status(404).json({ error: "Template not found" });
        }
        const renderedPrompt = await promptTemplateService.renderTemplate(templateId, req.body.variables || {});
        result = await aiService.chatWithAssistant(renderedPrompt, context);
      } else {
        result = await aiService.chatWithAssistant(message, context);
      }
      await storage.createAiConversation({
        userId: "default-user",
        // TODO: Get from auth
        sessionId: sessionId || "default-session",
        message,
        response: result.response,
        modelUsed: result.model,
        tokensUsed: result.usage.totalTokens
      });
      res.json({
        response: result.response,
        usage: result.usage,
        model: result.model
      });
    } catch (error) {
      console.error("Error in AI chat:", error);
      res.status(500).json({ error: "Failed to get AI response" });
    }
  });
  app2.post("/api/ai/generate-questions", requireAuth, async (req, res) => {
    try {
      const { jobTitle, requirements, experienceLevel } = req.body;
      if (!jobTitle || !requirements) {
        return res.status(400).json({ error: "Job title and requirements are required" });
      }
      const result = await aiService.generateInterviewQuestions(jobTitle, requirements);
      try {
        await storage.createAiConversation({
          userId: "system",
          sessionId: `generate-questions-${jobTitle.replace(/\s+/g, "-")}`,
          message: `Generate interview questions for ${jobTitle}`,
          response: JSON.stringify(result.questions),
          modelUsed: result.model,
          tokensUsed: result.usage.totalTokens
        });
      } catch (tokenError) {
        console.error("[Token Tracking] Failed to record question generation token usage:", tokenError);
      }
      res.json({ questions: result.questions });
    } catch (error) {
      console.error("Error generating questions:", error);
      res.status(500).json({ error: "Failed to generate interview questions" });
    }
  });
  app2.post("/api/candidates/bulk-match", requireAuth, async (req, res) => {
    try {
      const { jobId, candidateIds } = req.body;
      if (!jobId || !candidateIds || !Array.isArray(candidateIds)) {
        return res.status(400).json({ error: "Job ID and candidate IDs are required" });
      }
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      const results = [];
      for (const candidateId of candidateIds) {
        try {
          const candidate = await storage.getCandidate(candidateId);
          if (!candidate) continue;
          const matchResult = await aiService.matchCandidateToJob(
            {
              skills: candidate.skills || [],
              experience: candidate.experience || 0,
              education: candidate.education || "",
              position: candidate.position || ""
            },
            {
              title: job.title,
              requirements: job.requirements || [],
              description: job.description
            }
          );
          try {
            await storage.createAiConversation({
              userId: "system",
              sessionId: `bulk-match-${jobId}-${candidateId}`,
              message: `Bulk match candidate ${candidate.name} to job ${job.title}`,
              response: JSON.stringify(matchResult.match),
              modelUsed: matchResult.model,
              tokensUsed: matchResult.usage.totalTokens
            });
          } catch (tokenError) {
            console.error("[Token Tracking] Failed to record bulk match token usage:", tokenError);
          }
          await storage.updateCandidate(candidateId, {
            matchScore: matchResult.match.score.toString()
          });
          await storage.createJobMatch({
            candidateId,
            jobId,
            matchScore: matchResult.match.score.toString(),
            matchReasons: matchResult.match.reasons,
            aiAnalysis: matchResult.match.explanation
          });
          results.push({
            candidateId,
            matchScore: matchResult.match.score,
            reasons: matchResult.match.reasons
          });
        } catch (error) {
          console.error(`Error matching candidate ${candidateId}:`, error);
          results.push({
            candidateId,
            error: "Failed to calculate match"
          });
        }
      }
      res.json({ results });
    } catch (error) {
      console.error("Error in bulk matching:", error);
      res.status(500).json({ error: "Failed to perform bulk matching" });
    }
  });
  app2.get("/api/ai/conversations/:sessionId", requireAuth, async (req, res) => {
    try {
      const conversations = await storage.getAiConversationsBySession(req.params.sessionId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversation history" });
    }
  });
  app2.get("/api/activity", requireAuth, async (req, res) => {
    try {
      const { userId } = req.query;
      let activities;
      if (userId && typeof userId === "string") {
        activities = await storage.getActivityLogsByUser(userId);
      } else {
        activities = await storage.getActivityLogs();
      }
      res.json(activities);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ error: "Failed to fetch activity logs" });
    }
  });
  app2.post("/api/activity", requireAuth, async (req, res) => {
    try {
      const validatedData = insertActivityLogSchema.parse(req.body);
      const activity = await storage.createActivityLog(validatedData);
      const collaborationService = app2.get("collaborationService");
      if (collaborationService) {
        await collaborationService.broadcastToAll({
          type: "team_activity",
          payload: activity
        });
      }
      res.status(201).json(activity);
    } catch (error) {
      console.error("Error creating activity log:", error);
      if (error instanceof z4.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({
        error: "Failed to create activity log",
        ...error instanceof Error ? { details: error.message } : {}
      });
    }
  });
  app2.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId || typeof userId !== "string") {
        return res.status(400).json({ error: "User ID is required" });
      }
      const notifications2 = await storage.getNotifications(userId);
      res.json(notifications2);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({
        error: "Failed to fetch notifications",
        ...error instanceof Error ? { details: error.message } : {}
      });
    }
  });
  app2.post("/api/notifications", requireAuth, async (req, res) => {
    try {
      const validatedData = insertNotificationSchema.parse(req.body);
      const notification = await storage.createNotification(validatedData);
      const collaborationService = app2.get("collaborationService");
      if (collaborationService) {
        await collaborationService.notifyUser(validatedData.userId, {
          type: "notification",
          payload: notification
        });
      }
      res.status(201).json(notification);
    } catch (error) {
      console.error("Error creating notification:", error);
      if (error instanceof z4.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({
        error: "Failed to create notification",
        ...error instanceof Error ? { details: error.message } : {}
      });
    }
  });
  app2.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const success = await storage.markNotificationAsRead(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Notification not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({
        error: "Failed to mark notification as read",
        ...error instanceof Error ? { details: error.message } : {}
      });
    }
  });
  app2.get("/api/team/online", requireAuth, async (req, res) => {
    try {
      const onlineUsers = await storage.getOnlineUsers();
      res.json(onlineUsers);
    } catch (error) {
      console.error("Error fetching online users:", error);
      res.status(500).json({
        error: "Failed to fetch online users",
        ...error instanceof Error ? { details: error.message } : {}
      });
    }
  });
  app2.get("/api/comments/:entityType/:entityId", requireAuth, async (req, res) => {
    try {
      const { entityType, entityId } = req.params;
      const comments2 = await storage.getComments(entityType, entityId);
      res.json(comments2);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({
        error: "Failed to fetch comments",
        ...error instanceof Error ? { details: error.message } : {}
      });
    }
  });
  app2.post("/api/comments", requireAuth, async (req, res) => {
    try {
      const validatedData = insertCommentSchema.parse(req.body);
      const comment = await storage.createComment(validatedData);
      const collaborationService = app2.get("collaborationService");
      if (collaborationService) {
        await collaborationService.broadcastToAll({
          type: "new_comment",
          payload: comment
        });
      }
      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      if (error instanceof z4.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({
        error: "Failed to create comment",
        ...error instanceof Error ? { details: error.message } : {}
      });
    }
  });
  app2.post("/api/interview-assistant/recommend", requireAuth, async (req, res) => {
    try {
      const { interviewAssistantService: interviewAssistantService2 } = await Promise.resolve().then(() => (init_interviewAssistantService(), interviewAssistantService_exports));
      const recommendation = await interviewAssistantService2.recommendQuestions(req.body);
      res.json(recommendation);
    } catch (error) {
      console.error("Error generating interview recommendations:", error);
      res.status(500).json({ error: "Failed to generate recommendations" });
    }
  });
  app2.post("/api/interview-assistant/session", requireAuth, async (req, res) => {
    try {
      const { interviewAssistantService: interviewAssistantService2 } = await Promise.resolve().then(() => (init_interviewAssistantService(), interviewAssistantService_exports));
      const { candidateId, interviewerId, jobId, questions } = req.body;
      const session = await interviewAssistantService2.createInterviewSession(
        candidateId,
        interviewerId,
        jobId,
        questions
      );
      res.json(session);
    } catch (error) {
      console.error("Error creating interview session:", error);
      res.status(500).json({ error: "Failed to create session" });
    }
  });
  app2.post("/api/interview-assistant/process-answer", requireAuth, async (req, res) => {
    try {
      const { interviewAssistantService: interviewAssistantService2 } = await Promise.resolve().then(() => (init_interviewAssistantService(), interviewAssistantService_exports));
      const { sessionId, questionId, answer } = req.body;
      const result = await interviewAssistantService2.processAnswer(
        sessionId,
        questionId,
        answer
      );
      res.json(result);
    } catch (error) {
      console.error("Error processing answer:", error);
      res.status(500).json({ error: "Failed to process answer" });
    }
  });
  app2.post("/api/interview-assistant/generate-report", requireAuth, async (req, res) => {
    try {
      const { interviewAssistantService: interviewAssistantService2 } = await Promise.resolve().then(() => (init_interviewAssistantService(), interviewAssistantService_exports));
      const report = await interviewAssistantService2.generateInterviewReport(req.body.session);
      res.json(report);
    } catch (error) {
      console.error("Error generating interview report:", error);
      res.status(500).json({ error: "Failed to generate report" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}
var upload, bulkUpload;
var init_routes = __esm({
  "server/routes.ts"() {
    "use strict";
    init_storage();
    init_schema();
    init_aiService();
    init_resumeParser();
    init_resumeParserEnhanced();
    init_targetedResumeAnalyzer();
    init_matchingService();
    init_promptTemplates();
    init_candidateProfileService();
    init_organizationalFitService();
    init_companyConfigService();
    init_supabaseStorage();
    init_auth();
    upload = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      // 10MB limit
      fileFilter: (req, file, cb) => {
        const allowedMimeTypes = ["application/pdf"];
        if (allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error("Invalid file type. Only PDF resumes are supported."));
        }
      }
    });
    bulkUpload = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024,
        // 10MB per file
        files: 20
        // Maximum 20 files per request
      },
      fileFilter: (req, file, cb) => {
        const allowedMimeTypes = ["application/pdf"];
        if (allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error("Invalid file type. Only PDF resumes are supported."));
        }
      }
    });
  }
});

// server/config/env.ts
var env_exports = {};
__export(env_exports, {
  ensureRequiredEnv: () => ensureRequiredEnv
});
function isTestMode() {
  return process.env.NODE_ENV === "test" || process.env.VITEST === "true" || typeof process.env.JEST_WORKER_ID !== "undefined";
}
function ensureRequiredEnv() {
  const missing = REQUIRED_KEYS.filter((key) => !process.env[key] || process.env[key]?.trim().length === 0);
  const useInMemoryStorage = process.env.USE_IN_MEMORY_STORAGE === "true";
  const isProduction = process.env.NODE_ENV === "production";
  const isTest = isTestMode();
  if (missing.length > 0) {
    const message = `[Config] Missing required environment variables: ${missing.join(", ")}.`;
    if (isProduction) {
      if (useInMemoryStorage) {
        console.error("[Config] \u26A0\uFE0F CRITICAL: USE_IN_MEMORY_STORAGE \u5728\u751F\u4EA7\u73AF\u5883\u88AB\u8BBE\u7F6E\u4E3A true\uFF0C\u8FD9\u662F\u4E0D\u5B89\u5168\u7684\u914D\u7F6E\uFF01");
      }
      throw new Error(`${message} \u751F\u4EA7\u73AF\u5883\u5FC5\u987B\u914D\u7F6E\u6240\u6709\u5FC5\u9700\u7684\u73AF\u5883\u53D8\u91CF\u3002`);
    }
    const relaxedValidation = useInMemoryStorage || isTest;
    const hint = useInMemoryStorage ? "\u68C0\u6D4B\u5230 USE_IN_MEMORY_STORAGE=true\uFF0C\u5C06\u8DF3\u8FC7 Supabase/OpenRouter \u6821\u9A8C\uFF08\u4EC5\u9650\u5F00\u53D1\u73AF\u5883\uFF09\u3002" : isTest ? "\u6D4B\u8BD5\u6A21\u5F0F\u5DF2\u542F\u7528\uFF0C\u8DF3\u8FC7\u73AF\u5883\u53D8\u91CF\u6821\u9A8C\u3002" : "\u8BF7\u68C0\u67E5 .env \u6587\u4EF6\u914D\u7F6E\u3002";
    console.warn(`${message} ${hint}`);
    if (!relaxedValidation) {
      throw new Error(`${message} ${hint}`);
    }
  } else {
    if (isProduction && useInMemoryStorage) {
      console.warn("[Config] \u26A0\uFE0F WARNING: USE_IN_MEMORY_STORAGE \u5728\u751F\u4EA7\u73AF\u5883\u4E0D\u5E94\u8BBE\u7F6E\u4E3A true");
    }
  }
}
var REQUIRED_KEYS;
var init_env = __esm({
  "server/config/env.ts"() {
    "use strict";
    REQUIRED_KEYS = [
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "OPENROUTER_API_KEY"
    ];
  }
});

// api/_[...path].ts.source
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
var app = null;
async function getApp() {
  if (app) {
    return app;
  }
  console.log("[Vercel] Initializing Express app...");
  const { registerRoutes: registerRoutes2 } = await Promise.resolve().then(() => (init_routes(), routes_exports));
  const { ensureRequiredEnv: ensureRequiredEnv2 } = await Promise.resolve().then(() => (init_env(), env_exports));
  ensureRequiredEnv2();
  app = express();
  const supabaseUrl2 = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: ["'self'", ...supabaseUrl2 ? [supabaseUrl2] : [], "https://openrouter.ai"],
        fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: false
  }));
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1e3,
    max: 500,
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false
  });
  const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1e3,
    max: 30,
    message: "Too many AI requests, please try again later.",
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use("/api", apiLimiter);
  app.use("/api/ai", aiLimiter);
  const isProduction = process.env.NODE_ENV === "production";
  function parseAllowedOrigins(corsOriginEnv) {
    if (!corsOriginEnv) return [];
    const origins = corsOriginEnv.split(",").map((o) => o.trim()).filter(Boolean);
    for (const origin of origins) {
      if (origin === "*") {
        console.error("[CORS] \u274C Wildcard origin not allowed in configuration");
        throw new Error("Wildcard CORS origin not permitted");
      }
      try {
        const url = new URL(origin);
        if (url.protocol !== "http:" && url.protocol !== "https:") {
          throw new Error(`Invalid protocol: ${url.protocol}`);
        }
      } catch (err) {
        console.error(`[CORS] \u274C Invalid origin URL: ${origin}`, err);
        throw new Error(`Invalid CORS origin configuration: ${origin}`);
      }
    }
    return origins;
  }
  const configuredOrigins = parseAllowedOrigins(process.env.CORS_ORIGIN);
  const VERCEL_DOMAIN_REGEX = /^https:\/\/[a-z0-9-]+\.vercel\.app$/;
  const APP_DOMAIN_REGEX = /^https:\/\/(www\.)?hr-ai-recruit\.com$/;
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      if (isProduction) {
        if (configuredOrigins.length > 0 && configuredOrigins.includes(origin)) {
          return callback(null, true);
        }
        if (VERCEL_DOMAIN_REGEX.test(origin) || APP_DOMAIN_REGEX.test(origin)) {
          return callback(null, true);
        }
        console.warn("[CORS] \u26A0\uFE0F Blocked unauthorized origin");
        return callback(new Error("Not allowed by CORS"));
      }
      if (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1")) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    optionsSuccessStatus: 200
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      if (req.path.startsWith("/api")) {
        console.log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
      }
    });
    next();
  });
  await registerRoutes2(app);
  app.use((err, _req, res, _next) => {
    const status = err?.status || err?.statusCode || 500;
    const message = err?.message || "Internal Server Error";
    if (!res.headersSent) {
      res.status(status).json({ message });
    }
    console.error("[Express] Error:", err);
  });
  console.log("[Vercel] Express app initialized");
  return app;
}
async function handler(req, res) {
  try {
    const app2 = await getApp();
    return app2(req, res);
  } catch (error) {
    console.error("[Vercel Handler] Fatal error:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : void 0
    });
  }
}
export {
  handler as default
};
