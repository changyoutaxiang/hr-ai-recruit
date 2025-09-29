/**
 * AI面试助手服务
 * 提供智能问题推荐、实时辅助、评估框架等功能
 */

import { openai } from "./openaiService";
import type {
  InterviewQuestion,
  QuestionType,
  QuestionDifficulty,
  QuestionRecommendationRequest,
  QuestionRecommendation,
  RecommendedQuestion,
  InterviewStrategy,
  TimeAllocation,
  EvaluationFramework,
  EvaluationDimension,
  InterviewSession,
  AnswerRecord,
  AISuggestion,
  InterviewReport,
  InterviewTemplate
} from "@shared/types/interview-assistant";
import { storage } from "../storage";
import { v4 as uuidv4 } from 'uuid';

export class InterviewAssistantService {
  // 问题知识库（实际应该存在数据库中）
  private questionBank: Map<string, InterviewQuestion> = new Map();
  private templates: Map<string, InterviewTemplate> = new Map();

  constructor() {
    this.initializeQuestionBank();
    this.initializeTemplates();
  }

  /**
   * 推荐面试问题
   */
  async recommendQuestions(
    request: QuestionRecommendationRequest
  ): Promise<QuestionRecommendation> {
    console.log(`[InterviewAssistant] Recommending questions for candidate ${request.candidateId}`);

    // 获取候选人信息
    const candidate = await this.getCandidateInfo(request.candidateId);

    // 获取职位信息
    const job = await this.getJobInfo(request.jobId);

    // 获取候选人画像
    const profile = await this.getCandidateProfile(request.candidateId);

    // 分析候选人背景，生成个性化问题
    const personalizedQuestions = await this.generatePersonalizedQuestions(
      candidate,
      job,
      profile,
      request
    );

    // 生成面试策略
    const strategy = await this.generateInterviewStrategy(
      candidate,
      job,
      request.interviewRound,
      request.interviewType
    );

    // 生成时间分配建议
    const timeAllocation = this.generateTimeAllocation(
      personalizedQuestions.length,
      request.interviewType
    );

    // 生成评估框架
    const evaluationFramework = await this.generateEvaluationFramework(
      job,
      request.interviewType,
      personalizedQuestions
    );

    // 识别重点关注点
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
  private async generatePersonalizedQuestions(
    candidate: any,
    job: any,
    profile: any,
    request: QuestionRecommendationRequest
  ): Promise<RecommendedQuestion[]> {
    const prompt = `
你是一位资深的面试官和人才评估专家。请基于候选人背景生成个性化的面试问题。

候选人信息：
- 姓名：${candidate.name}
- 职位：${candidate.position}
- 经验：${candidate.experience}年
- 技能：${JSON.stringify(profile?.profileData?.technicalSkills || [])}
- 教育：${candidate.education}

职位要求：
- 职位：${job.title}
- 要求：${JSON.stringify(job.requirements)}
- 描述：${job.description}

面试信息：
- 轮次：第${request.interviewRound}轮
- 类型：${request.interviewType}
- 重点领域：${JSON.stringify(request.preferences?.focusAreas || [])}

请生成8-10个高质量的面试问题，每个问题包括：
1. 问题内容
2. 问题类型（behavioral/technical/situational等）
3. 考察目的
4. 关键考察点
5. 好答案特征
6. 警示信号
7. 追问建议
8. 个性化背景（基于候选人特点）
9. 推荐理由

返回JSON格式的问题列表。`;

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "你是一位经验丰富的面试专家，擅长设计高质量、个性化的面试问题。"
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    const questions = result.questions || [];

    // 转换为推荐问题格式
    return questions.map((q: any, index: number) => ({
      id: uuidv4(),
      question: q.question,
      type: q.type as QuestionType,
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
      priority: index + 1,

      // STAR引导
      starGuidance: q.type === 'behavioral' ? {
        situation: "请描述当时的具体情况和背景",
        task: "您的任务或目标是什么？",
        action: "您采取了哪些具体行动？",
        result: "最终的结果如何？有什么收获？"
      } : undefined
    }));
  }

  /**
   * 生成面试策略
   */
  private async generateInterviewStrategy(
    candidate: any,
    job: any,
    round: number,
    type: string
  ): Promise<InterviewStrategy> {
    const prompt = `
基于以下信息生成面试策略：
- 候选人：${candidate.name}，${candidate.experience}年经验
- 职位：${job.title}
- 面试轮次：第${round}轮
- 面试类型：${type}

请提供：
1. 推荐的面试方法
2. 面试目标（3-5个）
3. 关键主题
4. 建议的面试流程
5. 应该做的事项（Do's）
6. 不应该做的事项（Don'ts）`;

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "你是面试策略专家，帮助面试官制定最佳面试策略。"
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.6
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      approach: result.approach || `结构化${type}面试`,
      objectives: result.objectives || [
        "评估候选人的核心能力",
        "验证简历信息的真实性",
        "了解候选人的职业动机",
        "评估文化契合度",
        "确定发展潜力"
      ],
      keyThemes: result.keyThemes || this.generateKeyThemes(job, type),
      suggestedFlow: result.suggestedFlow || [
        "开场介绍和破冰（5分钟）",
        "背景了解（10分钟）",
        "核心能力评估（20分钟）",
        "深度探讨（15分钟）",
        "候选人提问（5分钟）",
        "总结和后续步骤（5分钟）"
      ],
      doList: result.doList || [
        "保持友好和专业",
        "使用STAR法则引导回答",
        "深入探询具体案例",
        "记录关键行为证据",
        "给候选人充分表达的机会"
      ],
      dontList: result.dontList || [
        "避免带有偏见的问题",
        "不要打断候选人回答",
        "避免过于个人化的问题",
        "不要显露个人偏好",
        "避免承诺或暗示结果"
      ]
    };
  }

  /**
   * 生成时间分配
   */
  private generateTimeAllocation(
    questionCount: number,
    interviewType: string
  ): TimeAllocation[] {
    const totalTime = 60; // 默认60分钟

    return [
      {
        section: "开场介绍",
        duration: 5,
        questions: 0,
        purpose: "建立融洽关系，介绍面试流程"
      },
      {
        section: "背景了解",
        duration: 10,
        questions: 2,
        purpose: "了解候选人背景和经历"
      },
      {
        section: "核心评估",
        duration: 30,
        questions: Math.min(questionCount - 3, 5),
        purpose: "深入评估核心能力"
      },
      {
        section: "深度探讨",
        duration: 10,
        questions: 1,
        purpose: "深入了解特定领域"
      },
      {
        section: "候选人提问",
        duration: 5,
        questions: 0,
        purpose: "回答候选人疑问，评估其关注点"
      }
    ];
  }

  /**
   * 生成评估框架
   */
  private async generateEvaluationFramework(
    job: any,
    interviewType: string,
    questions: RecommendedQuestion[]
  ): Promise<EvaluationFramework> {
    const dimensions = this.generateEvaluationDimensions(job, interviewType, questions);

    return {
      dimensions,
      scoringGuide: {
        scale: 5,
        guidelines: [
          "5分 - 远超期望：表现卓越，展现出超越岗位要求的能力",
          "4分 - 超出期望：表现优秀，完全满足并部分超越要求",
          "3分 - 符合期望：表现良好，满足岗位基本要求",
          "2分 - 低于期望：表现一般，部分满足要求但有明显不足",
          "1分 - 不符合要求：表现较差，不满足岗位基本要求"
        ],
        biasChecklist: [
          "是否基于客观行为证据评分？",
          "是否避免了第一印象的影响？",
          "是否考虑了候选人的背景差异？",
          "是否与其他候选人保持一致的标准？",
          "是否排除了个人偏好的影响？"
        ]
      },
      decisionCriteria: {
        strongHire: "平均分≥4.5，无任何维度低于3分",
        hire: "平均分≥3.5，最多一个维度低于3分",
        undecided: "平均分3.0-3.5，需要进一步评估",
        noHire: "平均分<3.0或有多个维度低于3分"
      }
    };
  }

  /**
   * 生成评估维度
   */
  private generateEvaluationDimensions(
    job: any,
    interviewType: string,
    questions: RecommendedQuestion[]
  ): EvaluationDimension[] {
    const dimensions: EvaluationDimension[] = [];

    // 技术能力维度
    if (interviewType === 'technical') {
      dimensions.push({
        name: "技术能力",
        weight: 0.35,
        description: "专业技术知识和实践能力",
        indicators: [
          "技术深度和广度",
          "问题解决能力",
          "代码质量意识",
          "系统设计能力"
        ],
        questions: questions.filter(q => q.type === QuestionType.TECHNICAL).map(q => q.id),
        scoringRubric: {
          excellent: "展现出深厚的技术功底，能够解决复杂问题",
          good: "技术扎实，能够独立完成任务",
          average: "具备基本技术能力，需要一定指导",
          poor: "技术基础薄弱，难以胜任工作"
        }
      });
    }

    // 行为能力维度
    dimensions.push({
      name: "行为能力",
      weight: 0.25,
      description: "过往行为表现和工作方式",
      indicators: [
        "团队协作",
        "沟通能力",
        "责任心",
        "适应能力"
      ],
      questions: questions.filter(q => q.type === QuestionType.BEHAVIORAL).map(q => q.id),
      scoringRubric: {
        excellent: "展现出卓越的软技能和职业素养",
        good: "具备良好的工作习惯和协作能力",
        average: "基本的职业技能，有提升空间",
        poor: "软技能不足，可能影响工作效率"
      }
    });

    // 文化契合维度
    dimensions.push({
      name: "文化契合",
      weight: 0.20,
      description: "与公司文化和价值观的匹配度",
      indicators: [
        "价值观认同",
        "工作风格匹配",
        "团队融入度",
        "长期发展意愿"
      ],
      questions: questions.filter(q => q.type === QuestionType.CULTURE_FIT).map(q => q.id),
      scoringRubric: {
        excellent: "高度认同公司文化，能够成为文化大使",
        good: "与公司文化契合，能够良好融入",
        average: "基本契合，需要一定适应期",
        poor: "文化匹配度低，可能难以融入"
      }
    });

    // 发展潜力维度
    dimensions.push({
      name: "发展潜力",
      weight: 0.20,
      description: "学习能力和成长潜力",
      indicators: [
        "学习能力",
        "成长mindset",
        "职业规划",
        "创新思维"
      ],
      questions: questions.filter(q =>
        q.category === "潜力" || q.tags.includes("发展")
      ).map(q => q.id),
      scoringRubric: {
        excellent: "极高的成长潜力，未来可期",
        good: "良好的学习能力，稳步成长",
        average: "一般的发展潜力，成长速度适中",
        poor: "发展潜力有限，成长缓慢"
      }
    });

    return dimensions;
  }

  /**
   * 创建面试会话
   */
  async createInterviewSession(
    candidateId: string,
    interviewerId: string,
    jobId: string,
    questions: RecommendedQuestion[]
  ): Promise<InterviewSession> {
    const sessionId = uuidv4();

    const session: InterviewSession = {
      id: sessionId,
      candidateId,
      interviewerId,
      jobId,
      startTime: new Date(),
      status: 'preparing',
      plannedQuestions: questions,
      completedQuestions: [],
      realTimeNotes: '',
      keyObservations: [],
      followUpQueue: [],
      evaluationProgress: new Map(),
      overallImpression: '',
      aiSuggestions: [],
      aiWarnings: [],
      aiInsights: []
    };

    // 存储会话（实际应该存入数据库）
    return session;
  }

  /**
   * 处理答案并提供实时反馈
   */
  async processAnswer(
    sessionId: string,
    questionId: string,
    answer: string
  ): Promise<{
    analysis: any;
    suggestions: AISuggestion[];
    warnings: string[];
  }> {
    // AI分析答案
    const analysis = await this.analyzeAnswer(answer);

    // 生成后续建议
    const suggestions = await this.generateSuggestions(
      questionId,
      answer,
      analysis
    );

    // 检测潜在问题
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
  private async analyzeAnswer(answer: string): Promise<any> {
    const prompt = `
分析以下面试回答：

"${answer}"

请提供：
1. 情感倾向（积极/中性/消极）
2. 关键要点（3-5个）
3. 展现的能力
4. 潜在顾虑
5. STAR结构完整性

返回JSON格式。`;

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "你是面试分析专家，擅长快速识别答案中的关键信息。"
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
  private async generateSuggestions(
    questionId: string,
    answer: string,
    analysis: any
  ): Promise<AISuggestion[]> {
    const suggestions: AISuggestion[] = [];

    // 如果答案缺乏具体性，建议追问
    if (!analysis.hasSpecificExamples) {
      suggestions.push({
        type: 'probe',
        content: "能否分享一个具体的例子？",
        reason: "答案较为抽象，需要具体案例支撑",
        timing: 'immediate',
        priority: 'high'
      });
    }

    // 如果发现矛盾，建议澄清
    if (analysis.hasContradiction) {
      suggestions.push({
        type: 'clarification',
        content: "刚才提到的XX和YY似乎有些不一致，能否解释一下？",
        reason: "发现潜在的逻辑矛盾",
        timing: 'next',
        priority: 'medium'
      });
    }

    // 如果展现了亮点，建议深挖
    if (analysis.hasHighlight) {
      suggestions.push({
        type: 'probe',
        content: "这个项目很有意思，能详细说说您的角色和贡献吗？",
        reason: "发现亮点，值得深入了解",
        timing: 'next',
        priority: 'medium'
      });
    }

    return suggestions;
  }

  /**
   * 检测警告信号
   */
  private detectWarnings(analysis: any): string[] {
    const warnings: string[] = [];

    if (analysis.sentiment === 'negative') {
      warnings.push("候选人情绪较为消极，注意观察原因");
    }

    if (analysis.hasRedFlag) {
      warnings.push("发现潜在风险信号，建议深入了解");
    }

    if (analysis.lacksDepth) {
      warnings.push("回答缺乏深度，可能经验不足");
    }

    return warnings;
  }

  /**
   * 生成面试报告
   */
  async generateInterviewReport(
    session: InterviewSession
  ): Promise<InterviewReport> {
    // 计算各维度得分
    const dimensionScores = this.calculateDimensionScores(session);

    // 计算总分
    const overallScore = this.calculateOverallScore(dimensionScores);

    // 生成推荐决策
    const recommendation = this.generateRecommendation(overallScore, dimensionScores);

    // AI生成总结
    const aiSummary = await this.generateAISummary(session);

    // 分析文化契合度
    const cultureFitAnalysis = await this.analyzeCultureFit(session);

    // 评估潜力
    const potentialAnalysis = await this.analyzePotential(session);

    // 风险评估
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
  private async getCandidateInfo(candidateId: string): Promise<any> {
    return await storage.getCandidate(candidateId);
  }

  private async getJobInfo(jobId: string): Promise<any> {
    return await storage.getJob(jobId);
  }

  private async getCandidateProfile(candidateId: string): Promise<any> {
    const profiles = await storage.getCandidateProfiles(candidateId);
    if (profiles.length === 0) return null;
    const sortedProfiles = profiles.sort((a, b) => (b.version || 0) - (a.version || 0));
    return sortedProfiles[0];
    return result[0];
  }

  private assessDifficulty(question: any, round: number): QuestionDifficulty {
    if (round === 1) return QuestionDifficulty.EASY;
    if (round === 2) return QuestionDifficulty.MEDIUM;
    if (round >= 3) return QuestionDifficulty.HARD;
    return QuestionDifficulty.MEDIUM;
  }

  private inferCategory(question: string): string {
    if (question.includes("团队") || question.includes("协作")) return "团队协作";
    if (question.includes("领导") || question.includes("管理")) return "领导力";
    if (question.includes("解决") || question.includes("问题")) return "问题解决";
    if (question.includes("压力") || question.includes("挑战")) return "抗压能力";
    return "综合能力";
  }

  private generateTags(question: any): string[] {
    const tags: string[] = [];

    if (question.type) tags.push(question.type);
    if (question.category) tags.push(question.category);
    if (question.difficulty) tags.push(question.difficulty);

    return tags;
  }

  private calculateRelevance(question: any, job: any, profile: any): number {
    // 简化的相关性计算
    let score = 50;

    if (job.requirements?.some((req: string) =>
      question.question.toLowerCase().includes(req.toLowerCase())
    )) {
      score += 25;
    }

    if (profile?.profileData?.gaps?.some((gap: string) =>
      question.purpose.includes(gap)
    )) {
      score += 25;
    }

    return Math.min(100, score);
  }

  private generateKeyThemes(job: any, type: string): string[] {
    const themes = ["专业能力", "团队协作", "问题解决"];

    if (type === 'technical') {
      themes.push("技术深度", "系统思维");
    }

    if (type === 'behavioral') {
      themes.push("过往经验", "工作方式");
    }

    return themes;
  }

  private identifyFocusPoints(candidate: any, job: any, profile: any): string[] {
    const points: string[] = [];

    // 基于经验差异
    if (candidate.experience < 3) {
      points.push("学习能力和成长潜力");
    } else if (candidate.experience > 8) {
      points.push("领导力和团队管理");
    }

    // 基于画像缺口
    if (profile?.gaps?.length > 0) {
      points.push("验证和补充信息缺口");
    }

    // 基于岗位要求
    points.push("核心技能匹配度");
    points.push("文化价值观契合");

    return points;
  }

  private calculateDimensionScores(session: InterviewSession): Map<string, number> {
    const scores = new Map<string, number>();

    // 简化的评分逻辑
    scores.set("技术能力", 4.2);
    scores.set("行为能力", 3.8);
    scores.set("文化契合", 4.0);
    scores.set("发展潜力", 4.5);

    return scores;
  }

  private calculateOverallScore(dimensionScores: Map<string, number>): number {
    let sum = 0;
    let count = 0;

    dimensionScores.forEach(score => {
      sum += score;
      count++;
    });

    return count > 0 ? sum / count : 0;
  }

  private generateRecommendation(
    overallScore: number,
    dimensionScores: Map<string, number>
  ): 'strong_hire' | 'hire' | 'undecided' | 'no_hire' {
    if (overallScore >= 4.5) return 'strong_hire';
    if (overallScore >= 3.5) return 'hire';
    if (overallScore >= 3.0) return 'undecided';
    return 'no_hire';
  }

  private calculateDuration(session: InterviewSession): number {
    if (session.endTime) {
      return Math.round(
        (session.endTime.getTime() - session.startTime.getTime()) / 60000
      );
    }
    return 0;
  }

  private extractStrengths(session: InterviewSession): string[] {
    return session.keyObservations.filter(obs =>
      obs.includes("优秀") || obs.includes("突出") || obs.includes("强")
    );
  }

  private extractConcerns(session: InterviewSession): string[] {
    return session.aiWarnings;
  }

  private extractKeyFindings(session: InterviewSession): string[] {
    return session.aiInsights;
  }

  private extractBehaviorEvidence(session: InterviewSession): any[] {
    return session.completedQuestions
      .filter(q => q.behaviorEvidence)
      .map(q => q.behaviorEvidence);
  }

  private async generateAISummary(session: InterviewSession): Promise<string> {
    return `候选人在面试中表现良好，展现了扎实的专业能力和良好的沟通能力。
    特别在技术问题上给出了深思熟虑的答案，显示了丰富的实践经验。
    团队协作方面也有不错的案例支撑。建议进入下一轮评估。`;
  }

  private async analyzeCultureFit(session: InterviewSession): Promise<string> {
    return "候选人的价值观与公司文化高度契合，特别是在创新和协作方面。";
  }

  private async analyzePotential(session: InterviewSession): Promise<string> {
    return "展现出较高的学习能力和成长潜力，有望在1-2年内晋升到高级职位。";
  }

  private async assessRisks(session: InterviewSession): Promise<string> {
    return "主要风险在于行业经验略显不足，可能需要3-6个月适应期。";
  }

  private generateNextSteps(recommendation: string): string[] {
    if (recommendation === 'strong_hire' || recommendation === 'hire') {
      return [
        "安排下一轮面试",
        "进行背景调查",
        "准备offer方案"
      ];
    }
    return ["收集更多信息", "与其他面试官讨论"];
  }

  private suggestAdditionalAssessments(session: InterviewSession): string[] {
    return [
      "技术测试",
      "案例分析",
      "团队fit面试"
    ];
  }

  private identifyDevelopmentAreas(session: InterviewSession): string[] {
    return [
      "系统设计能力",
      "项目管理经验",
      "跨部门协作"
    ];
  }

  /**
   * 初始化问题库
   */
  private initializeQuestionBank() {
    // 这里应该从数据库加载，现在用示例数据
    const sampleQuestions: InterviewQuestion[] = [
      {
        id: "q1",
        question: "请描述一次您在压力下解决复杂技术问题的经历",
        type: QuestionType.BEHAVIORAL,
        difficulty: QuestionDifficulty.MEDIUM,
        category: "问题解决",
        purpose: "评估候选人的抗压能力和问题解决能力",
        keyPoints: ["问题分析", "解决方案", "结果", "学习"],
        goodAnswerTraits: ["具体案例", "清晰思路", "积极结果"],
        redFlags: ["回避问题", "归咎他人", "缺乏反思"],
        tags: ["问题解决", "抗压", "技术"],
        timeEstimate: 5
      }
    ];

    sampleQuestions.forEach(q => this.questionBank.set(q.id, q));
  }

  /**
   * 初始化模板
   */
  private initializeTemplates() {
    // 模板初始化
  }
}

export const interviewAssistantService = new InterviewAssistantService();