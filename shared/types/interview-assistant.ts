/**
 * AI面试助手类型定义
 * 提供智能化的面试支持，包括问题推荐、实时辅助、评估框架等
 */

/**
 * 面试问题类型
 */
export enum QuestionType {
  // 基础类型
  BEHAVIORAL = "behavioral",           // 行为面试
  TECHNICAL = "technical",             // 技术面试
  SITUATIONAL = "situational",         // 情景面试
  COMPETENCY = "competency",           // 能力面试
  CULTURE_FIT = "culture_fit",         // 文化契合
  MOTIVATION = "motivation",           // 动机面试
  STRESS = "stress",                   // 压力面试
  CASE_STUDY = "case_study",          // 案例分析
}

/**
 * 问题难度级别
 */
export enum QuestionDifficulty {
  EASY = "easy",
  MEDIUM = "medium",
  HARD = "hard",
  EXPERT = "expert"
}

/**
 * 面试问题
 */
export interface InterviewQuestion {
  id: string;
  question: string;                    // 问题内容
  type: QuestionType;                  // 问题类型
  difficulty: QuestionDifficulty;      // 难度级别
  category: string;                    // 类别（如：领导力、团队协作等）
  competency?: string;                 // 考察的能力项

  // 评估指导
  purpose: string;                     // 问题目的
  keyPoints: string[];                 // 关键考察点
  goodAnswerTraits: string[];          // 好答案特征
  redFlags: string[];                  // 警示信号

  // 追问建议
  followUpQuestions?: string[];        // 追问问题
  probingTechniques?: string[];        // 探询技巧

  // STAR引导
  starGuidance?: {
    situation: string;                // 情境引导
    task: string;                     // 任务引导
    action: string;                   // 行动引导
    result: string;                   // 结果引导
  };

  // 标签和元数据
  tags: string[];                      // 标签
  industry?: string;                   // 行业
  position?: string;                   // 职位
  experienceLevel?: string;            // 经验级别
  timeEstimate?: number;               // 预计用时（分钟）

  // 使用统计
  usageCount?: number;                 // 使用次数
  averageRating?: number;              // 平均评分
  successRate?: number;                // 成功率
}

/**
 * 问题推荐请求
 */
export interface QuestionRecommendationRequest {
  candidateId: string;
  jobId: string;
  interviewRound: number;
  interviewType: string;

  // 候选人信息
  candidateProfile?: any;              // 候选人画像
  resumeHighlights?: string[];         // 简历亮点
  previousAnswers?: AnswerRecord[];    // 之前的回答记录

  // 岗位要求
  jobRequirements?: string[];          // 岗位要求
  coreCompetencies?: string[];         // 核心能力

  // 推荐偏好
  preferences?: {
    focusAreas?: string[];            // 重点考察领域
    avoidAreas?: string[];            // 避免的领域
    difficulty?: QuestionDifficulty; // 期望难度
    questionTypes?: QuestionType[];  // 偏好的问题类型
    maxQuestions?: number;            // 最大问题数
  };
}

/**
 * 问题推荐结果
 */
export interface QuestionRecommendation {
  questions: RecommendedQuestion[];    // 推荐的问题列表
  strategy: InterviewStrategy;         // 面试策略
  focusPoints: string[];               // 重点关注点
  timeAllocation: TimeAllocation[];    // 时间分配建议
  evaluationFramework: EvaluationFramework; // 评估框架
}

/**
 * 推荐的问题（包含个性化信息）
 */
export interface RecommendedQuestion extends InterviewQuestion {
  recommendationReason: string;        // 推荐理由
  personalizedContext?: string;        // 个性化背景
  candidateSpecificProbes?: string[];  // 针对候选人的探询问题
  relevanceScore: number;              // 相关性评分
  priority: number;                    // 优先级
}

/**
 * 面试策略
 */
export interface InterviewStrategy {
  approach: string;                    // 面试方法
  objectives: string[];                // 面试目标
  keyThemes: string[];                 // 关键主题
  suggestedFlow: string[];             // 建议的流程
  doList: string[];                    // 应该做的
  dontList: string[];                  // 不应该做的
}

/**
 * 时间分配
 */
export interface TimeAllocation {
  section: string;                     // 环节名称
  duration: number;                    // 时长（分钟）
  questions: number;                   // 问题数量
  purpose: string;                     // 目的
}

/**
 * 评估框架
 */
export interface EvaluationFramework {
  dimensions: EvaluationDimension[];   // 评估维度
  scoringGuide: ScoringGuide;         // 评分指南
  decisionCriteria: DecisionCriteria; // 决策标准
}

/**
 * 评估维度
 */
export interface EvaluationDimension {
  name: string;                        // 维度名称
  weight: number;                      // 权重
  description: string;                 // 描述
  indicators: string[];                // 指标
  questions: string[];                 // 相关问题ID
  scoringRubric: ScoringRubric;       // 评分标准
}

/**
 * 评分标准
 */
export interface ScoringRubric {
  excellent: string;                   // 优秀
  good: string;                        // 良好
  average: string;                     // 一般
  poor: string;                        // 较差
}

/**
 * 评分指南
 */
export interface ScoringGuide {
  scale: number;                       // 评分范围（如1-5）
  guidelines: string[];                // 评分指导
  biasChecklist: string[];            // 偏见检查清单
}

/**
 * 决策标准
 */
export interface DecisionCriteria {
  strongHire: string;                  // 强烈推荐
  hire: string;                        // 推荐
  undecided: string;                   // 待定
  noHire: string;                      // 不推荐
}

/**
 * 答案记录
 */
export interface AnswerRecord {
  questionId: string;
  question: string;
  answer: string;
  timestamp: Date;

  // 评估信息
  score?: number;                      // 评分
  notes?: string;                      // 笔记
  strengths?: string[];                // 优势
  concerns?: string[];                 // 顾虑

  // 行为证据
  behaviorEvidence?: {
    situation: string;
    task: string;
    action: string;
    result: string;
  };

  // AI分析
  aiAnalysis?: {
    sentiment: string;                 // 情感分析
    keyPoints: string[];              // 关键点
    competencies: string[];           // 展现的能力
    warnings: string[];               // 警示
  };
}

/**
 * 实时面试会话
 */
export interface InterviewSession {
  id: string;
  candidateId: string;
  interviewerId: string;
  jobId: string;

  // 基本信息
  startTime: Date;
  endTime?: Date;
  status: 'preparing' | 'in_progress' | 'completed' | 'cancelled';

  // 问题和答案
  plannedQuestions: RecommendedQuestion[];
  completedQuestions: AnswerRecord[];
  currentQuestion?: RecommendedQuestion;

  // 实时辅助
  realTimeNotes: string;               // 实时笔记
  keyObservations: string[];           // 关键观察
  followUpQueue: string[];             // 待追问队列

  // 评估进度
  evaluationProgress: Map<string, number>; // 各维度评分进度
  overallImpression: string;           // 整体印象

  // AI辅助
  aiSuggestions: AISuggestion[];      // AI建议
  aiWarnings: string[];                // AI警告
  aiInsights: string[];                // AI洞察
}

/**
 * AI建议
 */
export interface AISuggestion {
  type: 'question' | 'probe' | 'clarification' | 'wrap_up';
  content: string;
  reason: string;
  timing: 'immediate' | 'next' | 'later';
  priority: 'high' | 'medium' | 'low';
}

/**
 * 面试报告
 */
export interface InterviewReport {
  sessionId: string;
  candidateId: string;
  jobId: string;

  // 基本信息
  date: Date;
  duration: number;                    // 时长（分钟）
  interviewer: string;

  // 评估结果
  overallScore: number;
  dimensionScores: Map<string, number>;
  recommendation: 'strong_hire' | 'hire' | 'undecided' | 'no_hire';

  // 详细分析
  strengths: string[];
  concerns: string[];
  keyFindings: string[];
  behaviorEvidence: any[];

  // AI分析
  aiSummary: string;
  cultureFitAnalysis: string;
  potentialAnalysis: string;
  riskAssessment: string;

  // 建议
  nextSteps: string[];
  additionalAssessments: string[];
  developmentAreas: string[];

  // 对比分析
  comparisonWithOthers?: {
    percentile: number;               // 百分位
    standoutFactors: string[];       // 突出因素
    commonGaps: string[];             // 共同差距
  };
}

/**
 * 面试知识库
 */
export interface InterviewKnowledgeBase {
  questions: InterviewQuestion[];      // 问题库
  templates: InterviewTemplate[];      // 面试模板
  bestPractices: BestPractice[];      // 最佳实践
  cases: CaseStudy[];                 // 案例库
}

/**
 * 面试模板
 */
export interface InterviewTemplate {
  id: string;
  name: string;
  description: string;
  position: string;
  level: string;
  questions: string[];                 // 问题ID列表
  structure: TimeAllocation[];
  evaluationFramework: EvaluationFramework;
  tags: string[];
}

/**
 * 最佳实践
 */
export interface BestPractice {
  id: string;
  title: string;
  category: string;
  content: string;
  examples: string[];
  doList: string[];
  dontList: string[];
  references: string[];
}

/**
 * 案例研究
 */
export interface CaseStudy {
  id: string;
  title: string;
  scenario: string;
  industry: string;
  position: string;
  difficulty: QuestionDifficulty;

  // 案例内容
  background: string;
  challenge: string;
  constraints: string[];
  data?: any;

  // 评估标准
  evaluationCriteria: string[];
  excellentResponse: string;
  goodResponse: string;
  poorResponse: string;

  // 使用指导
  facilitation: string[];
  timeLimit: number;
  followUpQuestions: string[];
}

/**
 * 语音转文字配置
 */
export interface TranscriptionConfig {
  enabled: boolean;
  language: string;
  provider: 'whisper' | 'google' | 'azure';
  realTime: boolean;
  punctuation: boolean;
  speakerDiarization: boolean;
  autoSave: boolean;
}

/**
 * 面试助手配置
 */
export interface InterviewAssistantConfig {
  // AI配置
  aiModel: string;
  temperature: number;
  responseStyle: 'formal' | 'conversational' | 'coaching';

  // 功能开关
  features: {
    questionRecommendation: boolean;
    realTimeAssistance: boolean;
    transcription: boolean;
    behaviorAnalysis: boolean;
    sentimentAnalysis: boolean;
    autoScoring: boolean;
  };

  // 个性化设置
  preferences: {
    defaultQuestionTypes: QuestionType[];
    defaultDifficulty: QuestionDifficulty;
    defaultDuration: number;
    focusAreas: string[];
    evaluationWeights: Map<string, number>;
  };
}