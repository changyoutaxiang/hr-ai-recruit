/**
 * 面试反馈服务
 * 负责处理面试反馈并触发候选人画像更新
 */

import { db } from "../db";
import { interviews, candidateProfiles } from "@shared/schema";
import type { Interview, CandidateProfile, ProfileData } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { CandidateProfileService } from "./candidateProfileService";
import { OrganizationalFitService } from "./organizationalFitService";
import { openai } from "./openaiService";
import {
  InterviewType,
  generateStageId,
  type InterviewStageConfig,
  type ProfileEvolutionStage,
  type CandidateInterviewProcess
} from "@shared/types/interview";

export interface InterviewFeedback {
  interviewId: string;
  interviewerId: string;
  round: number;
  interviewType: InterviewType;

  // 评分维度
  scores: {
    technical?: number;        // 技术能力 (0-100)
    communication?: number;    // 沟通能力 (0-100)
    problemSolving?: number;   // 解决问题能力 (0-100)
    cultureFit?: number;       // 文化契合度 (0-100)
    leadership?: number;       // 领导力潜力 (0-100)
    overall: number;          // 综合评分 (0-100)
  };

  // 具体观察
  observations: {
    strengths: string[];      // 观察到的优势
    weaknesses: string[];     // 观察到的不足
    redFlags?: string[];      // 红旗警告
    highlights?: string[];    // 亮点表现
  };

  // 行为证据
  behavioralEvidence: {
    situation: string;        // 情境
    task: string;            // 任务
    action: string;          // 行动
    result: string;          // 结果
    learnings?: string;      // 学习反思
  }[];

  // 技能验证
  skillsValidation?: {
    skill: string;
    assessed: boolean;
    level: 'exceeded' | 'met' | 'below' | 'not_assessed';
    evidence?: string;
  }[];

  // 面试官建议
  recommendation: 'strong_hire' | 'hire' | 'lean_hire' | 'lean_no' | 'no_hire' | 'strong_no';
  nextSteps?: string;
  additionalNotes?: string;
}

export class InterviewFeedbackService {
  private profileService: CandidateProfileService;
  private orgFitService: OrganizationalFitService;

  constructor() {
    this.profileService = new CandidateProfileService();
    this.orgFitService = new OrganizationalFitService();
  }

  /**
   * 提交面试反馈并触发画像更新
   */
  async submitFeedbackAndUpdateProfile(
    candidateId: string,
    jobId: string,
    feedback: InterviewFeedback
  ): Promise<CandidateProfile> {
    try {
      // 1. 保存面试反馈到数据库
      await this.saveFeedback(feedback);

      // 2. 获取最新的画像
      const latestProfile = await this.getLatestProfile(candidateId);

      // 3. 获取所有该轮次的反馈（可能有多个面试官）
      const roundFeedbacks = await this.getRoundFeedbacks(
        candidateId,
        feedback.round,
        feedback.interviewType
      );

      // 4. 使用 AI 整合反馈并更新画像
      const updatedProfileData = await this.integrateFeedbackIntoProfile(
        latestProfile,
        roundFeedbacks,
        feedback
      );

      // 5. 生成新的阶段标识
      const stageId = generateStageId(
        feedback.round,
        feedback.interviewType
      );

      // 6. 创建新版本的画像
      const newProfile = await this.createUpdatedProfile(
        candidateId,
        jobId,
        stageId,
        updatedProfileData,
        latestProfile
      );

      // 7. 触发组织契合度重新评估
      if (feedback.scores.cultureFit || feedback.scores.leadership) {
        await this.updateOrganizationalFit(newProfile, feedback);
      }

      return newProfile;

    } catch (error) {
      console.error('Failed to submit feedback and update profile:', error);
      throw error;
    }
  }

  /**
   * 保存面试反馈
   */
  private async saveFeedback(feedback: InterviewFeedback): Promise<void> {
    await db.update(interviews)
      .set({
        feedback: JSON.stringify(feedback.observations),
        rating: feedback.scores.overall,
        notes: feedback.additionalNotes,
        updatedAt: new Date()
      })
      .where(eq(interviews.id, feedback.interviewId));
  }

  /**
   * 获取最新画像
   */
  private async getLatestProfile(candidateId: string): Promise<CandidateProfile> {
    const profiles = await db.select()
      .from(candidateProfiles)
      .where(eq(candidateProfiles.candidateId, candidateId))
      .orderBy(desc(candidateProfiles.version))
      .limit(1);

    if (profiles.length === 0) {
      throw new Error('No profile found for candidate');
    }

    return profiles[0];
  }

  /**
   * 获取某轮次的所有反馈
   */
  private async getRoundFeedbacks(
    candidateId: string,
    round: number,
    type: InterviewType
  ): Promise<InterviewFeedback[]> {
    const roundInterviews = await db.select()
      .from(interviews)
      .where(
        and(
          eq(interviews.candidateId, candidateId),
          eq(interviews.round, round)
        )
      );

    return roundInterviews
      .filter(i => i.feedback)
      .map(i => JSON.parse(i.feedback as string) as InterviewFeedback);
  }

  /**
   * 使用 AI 整合反馈到画像
   */
  private async integrateFeedbackIntoProfile(
    currentProfile: CandidateProfile,
    allFeedbacks: InterviewFeedback[],
    latestFeedback: InterviewFeedback
  ): Promise<ProfileData> {
    const currentData = currentProfile.profileData as ProfileData;

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

    const response = await openai.chat.completions.create({
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
  private async createUpdatedProfile(
    candidateId: string,
    jobId: string,
    stage: string,
    profileData: ProfileData,
    previousProfile: CandidateProfile
  ): Promise<CandidateProfile> {
    // 计算新的优势、顾虑和差距
    const analysis = await this.analyzeProfileChanges(profileData, previousProfile);

    const newProfile = {
      candidateId,
      jobId,
      stage,
      version: (previousProfile.version || 0) + 1,
      profileData: profileData,
      overallScore: analysis.overallScore.toString(),
      strengths: analysis.strengths,
      concerns: analysis.concerns,
      gaps: analysis.gaps,
      aiSummary: analysis.summary,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const [created] = await db.insert(candidateProfiles)
      .values(newProfile)
      .returning();

    return created;
  }

  /**
   * 分析画像变化
   */
  private async analyzeProfileChanges(
    newData: ProfileData,
    previousProfile: CandidateProfile
  ): Promise<{
    overallScore: number;
    strengths: string[];
    concerns: string[];
    gaps: string[];
    summary: string;
  }> {
    const previousData = previousProfile.profileData as ProfileData;

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

    const response = await openai.chat.completions.create({
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
  private async updateOrganizationalFit(
    profile: CandidateProfile,
    feedback: InterviewFeedback
  ): Promise<void> {
    const profileData = profile.profileData as ProfileData;

    // 如果有文化契合度反馈，更新文化评估
    if (feedback.scores.cultureFit !== undefined) {
      const cultureUpdate = await this.orgFitService.assessCultureAlignment(
        profileData,
        {
          feedbackScore: feedback.scores.cultureFit,
          observations: feedback.observations.strengths.concat(
            feedback.observations.weaknesses || []
          )
        }
      );

      profileData.organizationalFit = {
        ...profileData.organizationalFit,
        cultureAssessment: cultureUpdate
      };
    }

    // 如果有领导力反馈，更新领导力评估
    if (feedback.scores.leadership !== undefined) {
      // 这里调用领导力评估服务
      // profileData.organizationalFit.leadershipAssessment = ...
    }

    // 保存更新
    await db.update(candidateProfiles)
      .set({
        profileData: profileData,
        updatedAt: new Date()
      })
      .where(eq(candidateProfiles.id, profile.id));
  }

  /**
   * 获取候选人的面试进程
   */
  async getCandidateInterviewProcess(
    candidateId: string,
    jobId: string
  ): Promise<CandidateInterviewProcess> {
    const profiles = await db.select()
      .from(candidateProfiles)
      .where(
        and(
          eq(candidateProfiles.candidateId, candidateId),
          eq(candidateProfiles.jobId, jobId)
        )
      )
      .orderBy(candidateProfiles.version);

    const completedStages: ProfileEvolutionStage[] = profiles.map(p => ({
      stageId: p.stage,
      round: this.extractRoundFromStage(p.stage),
      type: this.extractTypeFromStage(p.stage),
      timestamp: p.createdAt || new Date(),
      version: p.version || 1,
      triggerType: 'auto',
      metadata: {
        confidence: 85  // 示例值
      }
    }));

    const currentRound = completedStages.length > 0
      ? Math.max(...completedStages.map(s => s.round))
      : 0;

    return {
      candidateId,
      jobId,
      currentRound,
      currentStage: profiles[profiles.length - 1]?.stage || 'resume',
      completedStages,
      status: 'in_progress'
    };
  }

  private extractRoundFromStage(stage: string): number {
    const match = stage.match(/interview_(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  private extractTypeFromStage(stage: string): InterviewType {
    if (stage === 'resume') return InterviewType.RESUME;

    const typeMatch = stage.match(/interview_\d+_([a-z_]+)/);
    if (typeMatch) {
      return typeMatch[1] as InterviewType;
    }

    return InterviewType.TECHNICAL;
  }
}

export const interviewFeedbackService = new InterviewFeedbackService();