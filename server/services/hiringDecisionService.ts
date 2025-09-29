import type {
  HiringDecision,
  InsertHiringDecision,
  Candidate,
  Job,
  Interview,
  CandidateProfile
} from "@shared/schema";
import { storage } from "../storage.ts";
import { HIRING_DECISION_CONFIG } from "../config/hiringDecision.ts";
import { aiService } from "./aiService.ts";

interface DecisionAnalysis {
  strengths: string[];
  weaknesses: string[];
  riskFactors: {
    risk: string;
    impact: "high" | "medium" | "low";
    mitigation?: string;
  }[];
  growthPotential: {
    currentCapability: string;
    futureProjection: string;
    timeframe: string;
    developmentAreas: string[];
  };
  culturalFitScore: number;
  culturalAlignmentDetails: {
    aligned: string[];
    misaligned: string[];
    neutral: string[];
  };
}

interface ComparisonData {
  comparedTo: number; // number of other candidates
  ranking: number; // position in comparison
  topDifferentiators: string[];
  competitiveAdvantages: string[];
  competitiveDisadvantages: string[];
}

interface CompensationRecommendation {
  minRange: number;
  maxRange: number;
  targetOffer: number;
  marketComparison: string;
  justification: string[];
}

export class HiringDecisionService {
  /**
   * 生成综合的招聘决策建议
   */
  async generateHiringDecision(
    candidateId: string,
    jobId: string,
    userId?: string
  ): Promise<HiringDecision> {
    try {
      // 并行获取所有需要的数据
      const [
        candidate,
        job,
        interviews,
        profile,
        existingDecision,
        otherCandidates
      ] = await Promise.all([
        storage.getCandidate(candidateId),
        storage.getJob(jobId),
        storage.getInterviewsByCandidate(candidateId),
        storage.getCandidateProfile(candidateId),
        storage.getHiringDecision(candidateId, jobId),
        storage.getCandidatesForJob(jobId)
      ]);

      // 如果已存在决策，返回现有的
      if (existingDecision) {
        console.log(`[HiringDecision] Decision already exists for candidate ${candidateId} and job ${jobId}`);
        return existingDecision;
      }

      if (!candidate || !job) {
        throw new Error("Candidate or job not found");
      }

      // 分析面试反馈
      const interviewAnalysis = this.analyzeInterviews(interviews || []);

      // 分析候选人档案
      const profileAnalysis = this.analyzeProfile(profile);

      // 生成决策和置信度
      const { decision, confidence } = this.calculateDecision(
        interviewAnalysis,
        profileAnalysis,
        job
      );

      // 生成详细分析
      const analysis = await this.generateDetailedAnalysis(
        candidate,
        job,
        interviews || [],
        profile
      );

      // 生成比较分析
      const comparison = this.generateComparison(
        candidate,
        otherCandidates || [],
        profileAnalysis
      );

      // 生成薪酬建议
      const compensation = this.generateCompensationRecommendation(
        candidate,
        job,
        profileAnalysis
      );

      // 生成下一步建议
      const nextSteps = this.generateNextSteps(decision, analysis);

      // 生成 AI 增强的推荐文本
      const recommendationText = await this.generateRecommendationText(
        decision,
        candidate,
        job,
        analysis
      );

      // 创建招聘决策记录
      const hiringDecision: InsertHiringDecision = {
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
        nextSteps: nextSteps,
        timelineSuggestion: this.generateTimelineSuggestion(decision, analysis),
        compensationRange: compensation,
        negotiationPoints: this.generateNegotiationPoints(candidate, job, analysis),
        decidedBy: userId || null,
        decidedAt: new Date(),
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
  private analyzeInterviews(interviews: Interview[]) {
    const completedInterviews = interviews.filter(i => i.status === "completed");

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

    const ratings = completedInterviews
      .map(i => i.rating)
      .filter((r): r is number => r !== null);

    const recommendations = completedInterviews
      .map(i => i.recommendation)
      .filter((r): r is string => r !== null);

    return {
      averageRating: ratings.length > 0
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
        : 0,
      totalInterviews: completedInterviews.length,
      recommendations: {
        hire: recommendations.filter(r => r === "hire").length,
        reject: recommendations.filter(r => r === "reject").length,
        nextRound: recommendations.filter(r => r === "next-round").length
      },
      keyFeedback: completedInterviews
        .map(i => i.feedback)
        .filter((f): f is string => f !== null)
    };
  }

  /**
   * 分析候选人档案
   */
  private analyzeProfile(profile?: CandidateProfile) {
    if (!profile) {
      return {
        overallScore: 0,
        technicalFit: 0,
        culturalFit: 0,
        experienceMatch: 0,
        hasRedFlags: false
      };
    }

    const profileData = profile.profileData as any || {};

    return {
      overallScore: profile.score || 0,
      technicalFit: this.calculateTechnicalFit(profileData),
      culturalFit: profileData.organizationalFit?.cultureAssessment?.overallScore || 0,
      experienceMatch: this.calculateExperienceMatch(profileData),
      hasRedFlags: this.checkForRedFlags(profileData)
    };
  }

  /**
   * 计算技术匹配度
   */
  private calculateTechnicalFit(profileData: any): number {
    const skills = profileData.technicalSkills || [];
    if (skills.length === 0) return 0;

    const totalScore = skills.reduce((acc: number, skill: any) => {
      return acc + (HIRING_DECISION_CONFIG.PROFICIENCY_SCORES[skill.proficiency] || 0);
    }, 0);

    return Math.min(100, totalScore / skills.length);
  }

  /**
   * 计算经验匹配度
   */
  private calculateExperienceMatch(profileData: any): number {
    const experience = profileData.experience;
    if (!experience) return 0;

    // 基础分数基于总年限
    let score = Math.min(100, (experience.totalYears || 0) * 10);

    // 相关经验加分
    if (experience.relevantYears) {
      score = Math.min(100, score + experience.relevantYears * 5);
    }

    return score;
  }

  /**
   * 检查红旗信号
   */
  private checkForRedFlags(profileData: any): boolean {
    const redFlags = [];
    const thresholds = HIRING_DECISION_CONFIG.RISK_THRESHOLDS;

    // 检查稳定性
    if (profileData.careerTrajectory?.stabilityScore < thresholds.STABILITY_LOW) {
      redFlags.push("low_stability");
    }

    // 检查文化匹配
    if (profileData.organizationalFit?.cultureAssessment?.overallScore < thresholds.CULTURE_FIT_POOR) {
      redFlags.push("poor_cultural_fit");
    }

    return redFlags.length > 0;
  }

  /**
   * 根据职位类型获取权重
   */
  private getWeightsForJobType(job: Job): typeof HIRING_DECISION_CONFIG.WEIGHTS.BALANCED {
    // 根据职位标题或部门判断类型
    const title = job.title.toLowerCase();
    const department = job.department?.toLowerCase() || '';

    if (title.includes('engineer') || title.includes('developer') ||
        title.includes('architect') || department.includes('tech')) {
      return HIRING_DECISION_CONFIG.WEIGHTS.TECHNICAL_HEAVY;
    }

    if (title.includes('culture') || title.includes('hr') ||
        title.includes('people') || department.includes('people')) {
      return HIRING_DECISION_CONFIG.WEIGHTS.CULTURAL_HEAVY;
    }

    return HIRING_DECISION_CONFIG.WEIGHTS.BALANCED;
  }

  /**
   * 计算最终决策
   */
  private calculateDecision(
    interviewAnalysis: any,
    profileAnalysis: any,
    job: Job
  ): { decision: string; confidence: number } {
    // 根据职位类型获取权重
    const weights = this.getWeightsForJobType(job);

    // 处理缺失数据
    const normalizedScores = {
      interview: interviewAnalysis.averageRating || 0,
      overall: profileAnalysis.overallScore || 0,
      technical: profileAnalysis.technicalFit || 0,
      cultural: profileAnalysis.culturalFit || 0
    };

    // 计算加权分数
    const weightedScore =
      normalizedScores.interview * weights.interview +
      normalizedScores.overall * weights.overall +
      normalizedScores.technical * weights.technical +
      normalizedScores.cultural * weights.cultural;

    // 置信度基于数据完整性
    const dataCompleteness = [
      interviewAnalysis.totalInterviews > 0,
      profileAnalysis.overallScore > 0,
      interviewAnalysis.keyFeedback.length > 0,
      normalizedScores.technical > 0,
      normalizedScores.cultural > 0
    ].filter(Boolean).length / 5;

    const confidence = Math.round(dataCompleteness * 100);

    // 决策逻辑
    const thresholds = HIRING_DECISION_CONFIG.DECISION_THRESHOLDS;
    let decision: string;

    if (profileAnalysis.hasRedFlags || weightedScore < thresholds.REJECT) {
      decision = "reject";
    } else if (weightedScore >= thresholds.HIRE &&
               interviewAnalysis.recommendations.hire > interviewAnalysis.recommendations.reject) {
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
  private async generateDetailedAnalysis(
    candidate: Candidate,
    job: Job,
    interviews: Interview[],
    profile?: CandidateProfile
  ): Promise<DecisionAnalysis> {
    const profileData = profile?.profileData as any || {};

    // 先使用基础逻辑生成初步分析
    const basicAnalysis = {
      strengths: this.extractStrengths(profileData, interviews),
      weaknesses: this.extractWeaknesses(profileData, interviews),
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

    // 使用 AI 增强分析
    try {
      const aiEnhancedAnalysis = await this.enhanceAnalysisWithAI(
        candidate,
        job,
        interviews,
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
  private async enhanceAnalysisWithAI(
    candidate: Candidate,
    job: Job,
    interviews: Interview[],
    basicAnalysis: DecisionAnalysis
  ): Promise<DecisionAnalysis> {
    const interviewFeedback = interviews
      .filter(i => i.feedback)
      .map(i => i.feedback)
      .join("\n");

    const prompt = `作为资深 HR 专家，请基于以下信息分析候选人：

候选人：${candidate.name}
职位：${job.title}
部门：${job.department || '未指定'}
职位要求：${job.requirements || '未指定'}

面试反馈：
${interviewFeedback || '暂无面试反馈'}

初步分析：
优势：${basicAnalysis.strengths.join(', ')}
劣势：${basicAnalysis.weaknesses.join(', ')}

请提供：
1. 3-5个核心优势（基于实际表现）
2. 3-5个需要关注的点
3. 风险评估和缓解建议
4. 成长潜力分析

请用中文回复，返回 JSON 格式：
{
  "strengths": ["优势1", "优势2", ...],
  "weaknesses": ["劣势1", "劣势2", ...],
  "riskFactors": [
    {"risk": "风险描述", "impact": "high/medium/low", "mitigation": "缓解方案"}
  ],
  "growthAnalysis": {
    "currentCapability": "当前能力评估",
    "futureProjection": "未来发展预测",
    "developmentAreas": ["发展领域1", "发展领域2"]
  }
}`;

    const aiResponse = await aiService.generateStructuredResponse(prompt, "MATCHING");

    // 合并 AI 分析和基础分析
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
  private extractStrengths(profileData: any, interviews: Interview[]): string[] {
    const strengths = [];

    // 从技术技能中提取
    const expertSkills = (profileData.technicalSkills || [])
      .filter((s: any) => s.proficiency === "expert" || s.proficiency === "advanced")
      .map((s: any) => `Expert in ${s.skill}`);
    strengths.push(...expertSkills);

    // 从软技能中提取
    const softSkills = (profileData.softSkills || [])
      .map((s: any) => s.skill);
    strengths.push(...softSkills);

    // 从面试反馈中提取
    const positivePatterns = this.extractPositivePatterns(interviews);
    strengths.push(...positivePatterns);

    return [...new Set(strengths)].slice(0, 5); // 去重并限制数量
  }

  /**
   * 提取劣势
   */
  private extractWeaknesses(profileData: any, interviews: Interview[]): string[] {
    const weaknesses = [];

    // 缺少的关键技能
    const beginnerSkills = (profileData.technicalSkills || [])
      .filter((s: any) => s.proficiency === "beginner")
      .map((s: any) => `Limited experience with ${s.skill}`);
    weaknesses.push(...beginnerSkills);

    // 从面试反馈中提取
    const negativePatterns = this.extractNegativePatterns(interviews);
    weaknesses.push(...negativePatterns);

    return [...new Set(weaknesses)].slice(0, 5);
  }

  /**
   * 评估风险
   */
  private assessRisks(candidate: Candidate, profileData: any): any[] {
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
  private assessCurrentCapability(profileData: any): string {
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
  private projectFutureGrowth(profileData: any): string {
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
  private identifyDevelopmentAreas(profileData: any): string[] {
    const areas = [];

    // 基于技能差距
    const intermediateSkills = (profileData.technicalSkills || [])
      .filter((s: any) => s.proficiency === "intermediate")
      .map((s: any) => s.skill);

    areas.push(...intermediateSkills.slice(0, 3));

    // 基于领导力评估
    if (profileData.organizationalFit?.leadershipAssessment?.developmentAreas) {
      areas.push(...profileData.organizationalFit.leadershipAssessment.developmentAreas.slice(0, 2));
    }

    return [...new Set(areas)];
  }

  /**
   * 生成比较分析
   */
  private generateComparison(
    candidate: Candidate,
    otherCandidates: Candidate[],
    profileAnalysis: any
  ): ComparisonData {
    const validCandidates = otherCandidates.filter(c => c.id !== candidate.id);
    const ranking = this.calculateRanking(candidate, validCandidates, profileAnalysis);

    return {
      comparedTo: validCandidates.length,
      ranking: ranking,
      topDifferentiators: this.identifyDifferentiators(candidate, validCandidates),
      competitiveAdvantages: this.identifyAdvantages(profileAnalysis),
      competitiveDisadvantages: this.identifyDisadvantages(profileAnalysis)
    };
  }

  /**
   * 计算排名
   */
  private calculateRanking(
    candidate: Candidate,
    others: Candidate[],
    profileAnalysis: any
  ): number {
    // 简化版排名逻辑
    const score = profileAnalysis.overallScore;
    let betterThanCount = 0;

    // 这里应该比较其他候选人的分数，但需要获取他们的profile
    // 暂时使用简化逻辑
    return Math.min(others.length + 1, Math.max(1, Math.round((100 - score) / 20)));
  }

  /**
   * 识别差异化因素
   */
  private identifyDifferentiators(candidate: Candidate, others: Candidate[]): string[] {
    // 简化版实现
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
  private identifyAdvantages(profileAnalysis: any): string[] {
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
  private identifyDisadvantages(profileAnalysis: any): string[] {
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
  private generateCompensationRecommendation(
    candidate: Candidate,
    job: Job,
    profileAnalysis: any
  ): CompensationRecommendation {
    // 基于职位和经验的基础薪酬
    const baseSalary = job.salaryMin || HIRING_DECISION_CONFIG.SALARY.DEFAULT_BASE;
    const maxSalary = job.salaryMax || baseSalary * HIRING_DECISION_CONFIG.SALARY.MULTIPLIER_MAX;

    // 根据候选人质量调整
    const qualityMultiplier = 1 + (profileAnalysis.overallScore / 200);
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
  private generateNegotiationPoints(
    candidate: Candidate,
    job: Job,
    analysis: DecisionAnalysis
  ): string[] {
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
  private suggestAlternativeRoles(candidate: Candidate, profileAnalysis: any): string[] {
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
  private generateHiringConditions(analysis: DecisionAnalysis): string[] {
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
  private generateNextSteps(decision: string, analysis: DecisionAnalysis): string[] {
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
  private generateTimelineSuggestion(decision: string, analysis: DecisionAnalysis): string {
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
  private async generateRecommendationText(
    decision: string,
    candidate: Candidate,
    job: Job,
    analysis: DecisionAnalysis
  ): Promise<string> {
    // 先生成基础文本作为备用
    const basicText = this.generateBasicRecommendationText(decision, candidate, job, analysis);

    try {
      // 使用 AI 生成更好的推荐文本
      const decisionMap = {
        "hire": "录用",
        "reject": "不录用",
        "hold": "暂缓决定",
        "next-round": "进入下一轮面试"
      };

      const prompt = `作为 HR 专家，请为以下招聘决策生成专业的推荐文本：

候选人：${candidate.name}
职位：${job.title}
决策：${decisionMap[decision as keyof typeof decisionMap]}

候选人优势：
${analysis.strengths.slice(0, 3).map((s, i) => `${i + 1}. ${s}`).join('\n')}

需要关注的点：
${analysis.weaknesses.slice(0, 3).map((w, i) => `${i + 1}. ${w}`).join('\n')}

文化匹配度：${analysis.culturalFitScore}%

请生成一段 150-200 字的专业推荐文本，要求：
1. 客观、专业
2. 明确说明决策理由
3. 提及候选人的亮点和风险
4. 如果是录用/下一轮，提出建议的后续行动

直接返回推荐文本，不要其他内容。`;

      const aiRecommendation = await aiService.generateTextResponse(prompt, "MATCHING");
      return aiRecommendation || basicText;
    } catch (error) {
      console.error("Failed to generate AI recommendation:", error);
      return basicText;
    }
  }

  /**
   * 生成基础推荐文本（备用）
   */
  private generateBasicRecommendationText(
    decision: string,
    candidate: Candidate,
    job: Job,
    analysis: DecisionAnalysis
  ): string {
    const intro = `经过对 ${candidate.name} 应聘 ${job.title} 职位的综合评估，`;

    switch (decision) {
      case "hire":
        return intro + `我们强烈建议录用该候选人。${candidate.name} 展现了${analysis.strengths.slice(0, 2).join("和")}，非常适合这个职位。候选人的背景与我们的需求和文化高度匹配。`;

      case "reject":
        return intro + `我们建议暂不继续考虑该候选人。虽然 ${candidate.name} 在${analysis.strengths[0] || "某些方面"}有优势，但在${analysis.weaknesses.slice(0, 2).join("和")}方面存在顾虑，不太适合当前职位。`;

      case "hold":
        return intro + `我们建议暂缓决定。${candidate.name} 显示出潜力，但应该在评估其他候选人后再做最终决定。关键考虑包括${analysis.strengths[0]}与${analysis.weaknesses[0]}的平衡。`;

      case "next-round":
        return intro + `我们建议进入下一轮面试。${candidate.name} 已经展示了${analysis.strengths[0]}，但我们需要在${analysis.weaknesses[0] || "特定技术能力"}等方面进一步评估。`;

      default:
        return intro + "需要进一步评估。";
    }
  }

  /**
   * 从面试中提取正面模式
   */
  private extractPositivePatterns(interviews: Interview[]): string[] {
    const patterns = [];
    const highRatedInterviews = interviews.filter(i => i.rating && i.rating >= 4);

    if (highRatedInterviews.length > 0) {
      patterns.push("Consistently positive interview feedback");
    }

    const hireRecommendations = interviews.filter(i => i.recommendation === "hire");
    if (hireRecommendations.length > 1) {
      patterns.push("Multiple interviewers recommend hiring");
    }

    return patterns;
  }

  /**
   * 从面试中提取负面模式
   */
  private extractNegativePatterns(interviews: Interview[]): string[] {
    const patterns = [];
    const lowRatedInterviews = interviews.filter(i => i.rating && i.rating <= 2);

    if (lowRatedInterviews.length > 0) {
      patterns.push("Concerning interview performance");
    }

    const rejectRecommendations = interviews.filter(i => i.recommendation === "reject");
    if (rejectRecommendations.length > 0) {
      patterns.push("Interview concerns raised");
    }

    return patterns;
  }
}

export const hiringDecisionService = new HiringDecisionService();