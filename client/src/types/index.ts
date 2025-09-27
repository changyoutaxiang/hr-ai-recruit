export interface DashboardMetrics {
  totalCandidates: number;
  activeJobs: number;
  upcomingInterviews: number;
  interviewRate: number;
  hireRate: number;
  funnel: {
    applied: number;
    screening: number;
    interview: number;
    hired: number;
  };
}

export interface ResumeAnalysisResult {
  candidate?: any;
  analysis: {
    summary: string;
    skills: string[];
    experience: number;
    education: string;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
  parsedData: {
    contactInfo: {
      name?: string;
      email?: string;
      phone?: string;
    };
    skills: string[];
    experience: number;
    metadata: {
      pages: number;
      info?: any;
    };
  };
}

export interface CandidateMatch {
  candidate: any;
  matchScore: number;
  reasons: string[];
  explanation: string;
}

export interface AIConversation {
  id: string;
  userId: string;
  sessionId: string;
  message: string;
  response: string;
  modelUsed: string;
  tokensUsed?: number;
  createdAt: Date;
}

export interface FileUploadProgress {
  progress: number;
  status: "idle" | "uploading" | "processing" | "complete" | "error";
  error?: string;
}

export type CandidateStatus = 
  | "applied" 
  | "screening" 
  | "interview" 
  | "offer" 
  | "hired" 
  | "rejected";

export type JobStatus = "active" | "paused" | "closed";

export type InterviewStatus = 
  | "scheduled" 
  | "completed" 
  | "cancelled" 
  | "no-show";

export type InterviewType = "phone" | "video" | "in-person";

export interface NotificationItem {
  id: string;
  type: "info" | "warning" | "success" | "error";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}
