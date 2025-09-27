import { 
  type User, type InsertUser,
  type Job, type InsertJob,
  type Candidate, type InsertCandidate,
  type Interview, type InsertInterview,
  type AiConversation, type InsertAiConversation,
  type JobMatch, type InsertJobMatch,
  type PromptTemplate, type InsertPromptTemplate,
  type CandidateStatusHistory, type InsertCandidateStatusHistory
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

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
  getAiConversationsBySession(sessionId: string): Promise<AiConversation[]>;

  // Job Matches
  createJobMatch(match: InsertJobMatch): Promise<JobMatch>;
  getJobMatchesForCandidate(candidateId: string): Promise<JobMatch[]>;
  getJobMatchesForJob(jobId: string): Promise<JobMatch[]>;

  // Candidate Status History
  createCandidateStatusHistory(history: InsertCandidateStatusHistory): Promise<CandidateStatusHistory>;
  getCandidateStatusHistory(candidateId: string): Promise<CandidateStatusHistory[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private jobs: Map<string, Job> = new Map();
  private candidates: Map<string, Candidate> = new Map();
  private interviews: Map<string, Interview> = new Map();
  private aiConversations: Map<string, AiConversation> = new Map();
  private jobMatches: Map<string, JobMatch> = new Map();
  private candidateStatusHistory: Map<string, CandidateStatusHistory> = new Map();

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
        resumeUrl: null,
        resumeText: null,
        skills: ["React", "TypeScript", "JavaScript", "Node.js", "GraphQL", "CSS", "HTML"],
        status: "interview",
        matchScore: "92",
        aiSummary: "Highly experienced frontend developer with strong React and TypeScript skills. Perfect match for senior roles.",
        notes: "Excellent technical interview performance",
        source: "linkedin",
        tags: ["frontend", "senior", "high-priority"],
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
        resumeUrl: null,
        resumeText: null,
        skills: ["Python", "Machine Learning", "TensorFlow", "SQL", "R", "Statistics", "Deep Learning"],
        status: "screening",
        matchScore: "89",
        aiSummary: "Strong data science background with excellent ML skills and academic credentials.",
        notes: "Great portfolio of projects",
        source: "job_board",
        tags: ["data-science", "ml", "academic"],
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
        resumeUrl: null,
        resumeText: null,
        skills: ["Product Management", "Agile", "Scrum", "Analytics", "User Research", "Strategy"],
        status: "offer",
        matchScore: "95",
        aiSummary: "Experienced product manager with proven track record of successful product launches.",
        notes: "Strong leadership and strategic thinking",
        source: "referral",
        tags: ["product", "senior", "leadership"],
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
        resumeUrl: null,
        resumeText: null,
        skills: ["React", "Node.js", "JavaScript", "Python", "MongoDB", "Express"],
        status: "applied",
        matchScore: "76",
        aiSummary: "Junior to mid-level developer with full stack capabilities and good growth potential.",
        notes: "Eager to learn and grow",
        source: "manual",
        tags: ["fullstack", "junior", "potential"],
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
        resumeUrl: null,
        resumeText: null,
        skills: ["AWS", "Kubernetes", "Docker", "Terraform", "Python", "Linux", "CI/CD"],
        status: "screening",
        matchScore: "82",
        aiSummary: "Solid DevOps experience with cloud infrastructure and automation expertise.",
        notes: "Strong technical background",
        source: "linkedin",
        tags: ["devops", "cloud", "automation"],
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      ...insertUser,
      id: randomUUID(),
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
      requirements: insertJob.requirements ?? null,
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
      resumeUrl: insertCandidate.resumeUrl ?? null,
      resumeText: insertCandidate.resumeText ?? null,
      skills: insertCandidate.skills ?? null,
      matchScore: insertCandidate.matchScore ?? null,
      aiSummary: insertCandidate.aiSummary ?? null,
      notes: insertCandidate.notes ?? null,
      tags: insertCandidate.tags ?? null,
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

  async getAiConversationsBySession(sessionId: string): Promise<AiConversation[]> {
    return Array.from(this.aiConversations.values()).filter(
      conversation => conversation.sessionId === sessionId
    );
  }

  // Job Matches
  async createJobMatch(insertMatch: InsertJobMatch): Promise<JobMatch> {
    const match: JobMatch = {
      ...insertMatch,
      id: randomUUID(),
      matchReasons: insertMatch.matchReasons ?? null,
      aiAnalysis: insertMatch.aiAnalysis ?? null,
      basicMatchScore: insertMatch.basicMatchScore ?? null,
      createdAt: new Date(),
    };
    this.jobMatches.set(match.id, match);
    return match;
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
}

export const storage = new MemStorage();
