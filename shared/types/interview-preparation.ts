// 面试准备材料的类型定义

export interface CandidateContext {
  summary?: string;
  currentScore?: number;
  strengths?: string[];
  concerns?: string[];
  previousFeedback?: string[];
}

export interface SuggestedQuestion {
  question: string;
  category?: 'technical' | 'behavioral' | 'situational' | 'cultural';
  purpose?: string;
  probing?: string[];
}

export interface FocusArea {
  area: string;
  priority?: 'high' | 'medium' | 'low';
  why?: string;
  signals?: string[];
}

export interface InterviewPreparationContent {
  candidateContext: CandidateContext;
  suggestedQuestions: SuggestedQuestion[];
  focusAreas: FocusArea[];
  previousGaps?: string[];
  interviewerTips?: string[];
}

// 评分常量
export const RATING_SCALE = {
  MIN: 1,
  MAX: 5,
  DEFAULT: 0
} as const;

export type RatingValue = 1 | 2 | 3 | 4 | 5;