import OpenAI from "openai";
import { z } from "zod";
import { storage } from "../storage";
import type { Candidate, Job, Interview, CandidateProfile, InterviewPreparation } from "@shared/schema";
import type { ResumeAnalysis } from "./aiService";
import { organizationalFitService, type CultureFitAssessment, type LeadershipAssessment } from "./organizationalFitService";
import { evidenceService } from "./evidenceService";
import type { Evidence, EvidenceChain, ClaimType, EvidenceSource, EvidenceStrength } from "@shared/types/evidence";
import {
  candidateContextSchema,
  suggestedQuestionSchema,
  focusAreaSchema,
  interviewPreparationStatusSchema
} from "@shared/schema";

const CONFIG = {
  AI_TEMPERATURE: 0.3,
  MAX_RESUME_LENGTH: 3000,
  DEFAULT_OVERALL_SCORE: 70,
  AI_TIMEOUT_MS: 45000,
  MAX_RETRIES: 2,
} as const;

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
  throw new Error("环境变量 OPENROUTER_API_KEY 未设置，无法使用 AI 功能");
}

const openai = new OpenAI({
  apiKey: OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": process.env.APP_URL || "https://hr-recruit-system.vercel.app",
    "X-Title": "AI Recruit System",
  },
});

// 画像生成使用最强的可用模型，确保深度和准确性
const DEFAULT_MODEL = process.env.PROFILE_AI_MODEL || "openai/gpt-4o";
const ADVANCED_MODEL = process.env.PROFILE_AI_ADVANCED_MODEL || "openai/gpt-4o";

const ProficiencySchema = z.enum(["beginner", "intermediate", "advanced", "expert"]);

const ProfileDataSchema = z.object({
  technicalSkills: z.array(z.object({
    skill: z.string().min(1),
    proficiency: ProficiencySchema,
    evidenceSource: z.string().min(1),
    evidence: z.array(z.any()).optional(), // Evidence objects
    evidenceChain: z.any().optional(), // EvidenceChain object
  })),
  softSkills: z.array(z.object({
    skill: z.string().min(1),
    examples: z.array(z.string()),
    evidence: z.array(z.any()).optional(),
    evidenceChain: z.any().optional(),
  })),
  experience: z.object({
    totalYears: z.number().nonnegative(),
    relevantYears: z.number().nonnegative(),
    positions: z.array(z.object({
      title: z.string(),
      duration: z.string(),
      keyAchievements: z.array(z.string()),
    })),
  }),
  education: z.object({
    level: z.string(),
    field: z.string(),
    institution: z.string().optional(),
  }),
  culturalFit: z.object({
    workStyle: z.string(),
    motivations: z.array(z.string()),
    preferences: z.array(z.string()),
  }),
  careerTrajectory: z.object({
    progression: z.string(),
    growthAreas: z.array(z.string()),
    stabilityScore: z.number().min(0).max(100),
  }),
  // 新增：组织契合度评估
  organizationalFit: z.object({
    cultureAssessment: z.object({
      overallScore: z.number().min(0).max(100),
      valueAssessments: z.array(z.object({
        valueName: z.string(),
        score: z.number().min(0).max(100),
        evidence: z.array(z.string()),
        concerns: z.array(z.string()).optional(),
      })),
      trajectory: z.enum(["improving", "stable", "declining"]).optional(),
      confidence: z.enum(["low", "medium", "high"]),
    }).optional(),
    leadershipAssessment: z.object({
      overallScore: z.number().min(0).max(100),
      currentLevel: z.enum(["individual_contributor", "emerging_leader", "developing_leader", "mature_leader"]),
      dimensionScores: z.array(z.object({
        dimension: z.string(),
        score: z.number().min(0).max(100),
        evidence: z.array(z.string()),
      })),
      trajectory: z.enum(["high_potential", "steady_growth", "developing", "at_risk"]).optional(),
      readinessForNextLevel: z.number().min(0).max(100).optional(),
    }).optional(),
  }).optional(),
});

const CandidateProfileDataSchema = z.object({
  profileData: ProfileDataSchema,
  overallScore: z.number().min(0).max(100),
  dataSources: z.array(z.string()),
  gaps: z.array(z.string()),
  strengths: z.array(z.string()),
  concerns: z.array(z.string()),
  aiSummary: z.string().min(50),
  evidenceSummary: z.object({
    totalEvidence: z.number(),
    strongEvidence: z.number(),
    contradictions: z.number(),
    averageConfidence: z.number(),
    mainSources: z.array(z.string()),
  }).optional(),
});

export type ProfileData = z.infer<typeof ProfileDataSchema>;
export type CandidateProfileData = z.infer<typeof CandidateProfileDataSchema>;

export class CandidateProfileService {
  private updateLocks = new Map<string, Promise<any>>();

  async buildInitialProfile(
    candidateId: string,
    resumeAnalysis: ResumeAnalysis,
    jobId?: string
  ): Promise<CandidateProfile> {
    if (!candidateId?.trim()) {
      throw new Error("candidateId 不能为空");
    }

    if (!resumeAnalysis?.summary || !resumeAnalysis?.skills?.length) {
      throw new Error("resumeAnalysis 数据不完整，无法生成画像");
    }

    if (jobId && !jobId.trim()) {
      throw new Error("jobId 不能为空字符串");
    }

    this.log("info", "Building initial profile with evidence tracking", { candidateId, jobId });

    const candidate = await storage.getCandidate(candidateId);
    if (!candidate) {
      throw new Error(`Candidate ${candidateId} not found`);
    }

    let job: Job | undefined;
    if (jobId) {
      job = await storage.getJob(jobId);
    }

    // 先从简历中提取证据
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
      job,
      resumeEvidence
    );

    // 进行初始的组织契合度评估（基于简历）
    try {
      const orgFitData = await this.performOrganizationalFitAssessment(
        candidate,
        "resume",
        resumeAnalysis,
        undefined,
        job
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
      aiSummary: profileData.aiSummary,
    });

    this.log("info", "Successfully created initial profile", {
      candidateId,
      version: profile.version
    });

    return profile;
  }

  async updateProfileWithInterview(
    candidateId: string,
    interviewId: string
  ): Promise<CandidateProfile> {
    if (!candidateId?.trim()) {
      throw new Error("candidateId 不能为空");
    }

    if (!interviewId?.trim()) {
      throw new Error("interviewId 不能为空");
    }

    if (this.updateLocks.has(candidateId)) {
      throw new Error(`候选人 ${candidateId} 的画像正在更新中，请稍后重试`);
    }

    const updatePromise = this._doUpdateProfileWithInterview(candidateId, interviewId);
    this.updateLocks.set(candidateId, updatePromise);

    try {
      return await updatePromise;
    } finally {
      this.updateLocks.delete(candidateId);
    }
  }

  private async _doUpdateProfileWithInterview(
    candidateId: string,
    interviewId: string
  ): Promise<CandidateProfile> {
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

    let job: Job | undefined;
    if (interview.jobId) {
      job = await storage.getJob(interview.jobId);
    }

    // 从面试中提取证据
    const interviewEvidence = await evidenceService.extractEvidenceFromInterview(
      {
        observations: {
          strengths: interview.aiKeyFindings || [],
        },
        skillsValidation: [],
        behavioralEvidence: [],
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

    // 更新组织契合度评估（基于面试信息）
    try {
      const stage = interview.round === 1 ? "interview_1" :
                    interview.round === 2 ? "interview_2" :
                    "final_evaluation";

      const orgFitData = await this.performOrganizationalFitAssessment(
        candidate,
        stage as "interview_1" | "interview_2" | "final_evaluation",
        undefined,
        interview,
        job,
        currentProfile.profileData as ProfileData
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
      aiSummary: updatedProfileData.aiSummary,
    });

    this.log("info", "Successfully updated profile", {
      candidateId,
      version: newProfile.version
    });

    return newProfile;
  }

  async getProfileEvolution(candidateId: string): Promise<CandidateProfile[]> {
    return storage.getCandidateProfiles(candidateId);
  }

  private async generateInitialProfileWithAI(
    candidate: Candidate,
    resumeAnalysis: ResumeAnalysis,
    job?: Job,
    resumeEvidence?: Evidence[]
  ): Promise<CandidateProfileData> {
    // 构建技能评估的证据链
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
            evidenceSource: "5年项目经验，参与大型企业级应用开发",
            evidence: [], // 实际的证据对象
            evidenceChain: {} // 证据链对象
          }
        ],
        softSkills: [
          {
            skill: "团队协作",
            examples: ["领导跨部门项目团队", "mentor 3名初级开发者"]
          }
        ],
        experience: {
          totalYears: 5,
          relevantYears: 4,
          positions: [
            {
              title: "高级前端工程师",
              duration: "2020-2025",
              keyAchievements: ["主导重构项目", "性能优化提升50%"]
            }
          ]
        },
        education: {
          level: "本科",
          field: "计算机科学",
          institution: "清华大学"
        },
        culturalFit: {
          workStyle: "注重协作，喜欢创新环境",
          motivations: ["技术挑战", "团队成长"],
          preferences: ["灵活工作时间", "远程办公"]
        },
        careerTrajectory: {
          progression: "稳步向上，从初级到高级用时3年",
          growthAreas: ["架构设计", "团队管理"],
          stabilityScore: 85
        }
      },
      overallScore: 85,
      dataSources: ["简历", "教育背景"],
      gaps: ["缺少后端经验", "未展示领导力"],
      strengths: ["扎实的前端基础", "优秀的问题解决能力"],
      concerns: ["频繁跳槽", "项目经验较浅"],
      aiSummary: "候选人具有扎实的前端技术背景，5年工作经验，擅长React生态系统...",
      evidenceSummary: {
        totalEvidence: resumeEvidence?.length || 0,
        strongEvidence: resumeEvidence?.filter(e =>
          e.strength === 'direct' || e.strength === 'strong'
        ).length || 0,
        contradictions: 0,
        averageConfidence: resumeEvidence?.reduce((sum, e) =>
          sum + e.confidence, 0
        ) / (resumeEvidence?.length || 1) || 0,
        mainSources: ["简历"]
      }
    };

    const systemPrompt = `你是一位资深的 HR 专家和人才评估专家。你的任务是基于候选人的简历分析，构建一个全面、深入的候选人画像。

**严格要求**：你必须返回符合以下结构的 JSON 数据：

\`\`\`json
${JSON.stringify(jsonSchemaExample, null, 2)}
\`\`\`

**字段说明**：
- technicalSkills[].proficiency 只能是以下值之一: "beginner", "intermediate", "advanced", "expert"
- 每个技能评估都应该包含支撑的证据和置信度
- overallScore 必须是 0-100 之间的数字，应该基于证据的强度和数量来计算
- stabilityScore 必须是 0-100 之间的整数
- dataSources 必须是字符串数组，如 ["简历", "教育背景"]
- gaps, strengths, concerns 都必须是字符串数组，每个结论都应该有证据支撑
- aiSummary 必须是 200-300 字的候选人画像总结，突出有强力证据支撑的结论

${job ? `\n目标职位：${job.title}\n职位要求：${job.requirements ? (job.requirements as string[]).join(", ") : ""}\n职位描述：${job.description}\n\n请特别关注候选人与该职位的匹配度。` : ""}

请严格按照上述 JSON 结构输出。`;

    const resumeText = candidate.resumeText
      ? this.smartTruncate(this.sanitizeForPrompt(candidate.resumeText), CONFIG.MAX_RESUME_LENGTH)
      : "";

    const userPrompt = `候选人基本信息：
- 姓名：${this.sanitizeForPrompt(candidate.name)}
- 应聘职位：${this.sanitizeForPrompt(candidate.position || "未指定")}
- 期望薪资：${candidate.salaryExpectation ? `${candidate.salaryExpectation} 元` : "未提供"}
- 所在地：${this.sanitizeForPrompt(candidate.location || "未提供")}

简历分析结果：
- 总结：${this.sanitizeForPrompt(resumeAnalysis.summary)}
- 技能：${resumeAnalysis.skills.map(s => this.sanitizeForPrompt(s)).join(", ")}
- 工作年限：${resumeAnalysis.experience} 年
- 教育背景：${this.sanitizeForPrompt(resumeAnalysis.education)}
- 优势：${resumeAnalysis.strengths.map(s => this.sanitizeForPrompt(s)).join(", ")}
- 不足：${resumeAnalysis.weaknesses.map(s => this.sanitizeForPrompt(s)).join(", ")}

证据统计：
- 共提取 ${resumeEvidence?.length || 0} 条证据
- 直接证据：${resumeEvidence?.filter(e => e.strength === 'direct').length || 0} 条
- 强力证据：${resumeEvidence?.filter(e => e.strength === 'strong').length || 0} 条
- 平均置信度：${(resumeEvidence?.reduce((s, e) => s + e.confidence, 0) / (resumeEvidence?.length || 1) || 0).toFixed(0)}%

${resumeText ? `\n简历全文：\n${resumeText}` : ""}

请生成完整的候选人画像。`;

    try {
      const result = await this.callAIWithRetry(
        {
          model: ADVANCED_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          response_format: { type: "json_object" },
          temperature: CONFIG.AI_TEMPERATURE,
        },
        CandidateProfileDataSchema
      );

      return result;
    } catch (error) {
      this.log("error", "生成初始画像时出错", { candidateId: candidate.id, error });
      throw new Error("AI 画像生成失败: " + (error instanceof Error ? error.message : "未知错误"));
    }
  }

  private async generateUpdatedProfileWithAI(
    candidate: Candidate,
    currentProfile: CandidateProfile,
    latestInterview: Interview,
    allInterviews: Interview[],
    job?: Job,
    newEvidence?: Evidence[]
  ): Promise<CandidateProfileData> {
    const systemPrompt = `你是一位资深的 HR 专家和人才评估专家。你的任务是基于候选人的现有画像和最新的面试反馈，更新候选人画像。

**重要原则：**
1. **整合新信息**：将面试中获得的新信息与现有画像整合
2. **保持一致性**：确保更新后的画像在逻辑上一致
3. **突出变化**：明确指出哪些信息是新增的，哪些评估有所调整
4. **深化理解**：利用面试信息深化对候选人的理解
5. **识别差异**：如果面试反馈与简历信息有出入，需要指出

请更新候选人画像，使用与初始画像相同的 JSON 结构，proficiency 只能是: "beginner", "intermediate", "advanced", "expert" 之一。`;

    const previousStrengths = (currentProfile.strengths as string[]) || [];
    const previousConcerns = (currentProfile.concerns as string[]) || [];
    const previousGaps = (currentProfile.gaps as string[]) || [];
    const previousDataSources = (currentProfile.dataSources as string[]) || [];

    const transcription = latestInterview.transcription
      ? this.smartTruncate(this.sanitizeForPrompt(latestInterview.transcription), 2000)
      : "";

    const userPrompt = `候选人：${this.sanitizeForPrompt(candidate.name)}

**当前画像（第 ${currentProfile.version} 版）：**
- 阶段：${currentProfile.stage}
- 综合评分：${currentProfile.overallScore}
- 已知优势：${previousStrengths.join(", ")}
- 已知顾虑：${previousConcerns.join(", ")}
- 信息缺口：${previousGaps.join(", ")}
- AI 总结：${this.sanitizeForPrompt(currentProfile.aiSummary || "")}

**最新面试信息（第 ${latestInterview.round} 轮）：**
- 面试类型：${latestInterview.type}
- 面试时间：${latestInterview.scheduledDate}
- 面试评分：${latestInterview.rating || "未评分"}/5
- 面试官反馈：${this.sanitizeForPrompt(latestInterview.feedback || "无")}
- 面试官笔记：${this.sanitizeForPrompt(latestInterview.interviewerNotes || "无")}
- 推荐意见：${latestInterview.recommendation || "未给出"}
${transcription ? `- 面试转录：${transcription}` : ""}
${latestInterview.aiKeyFindings ? `- AI 关键发现：${JSON.stringify(latestInterview.aiKeyFindings)}` : ""}
${latestInterview.aiConcernAreas ? `- AI 关注点：${JSON.stringify(latestInterview.aiConcernAreas)}` : ""}

**历史面试记录（共 ${allInterviews.length} 轮）：**
${allInterviews.map(iv => `- 第 ${iv.round} 轮：${iv.type}，评分 ${iv.rating || "N/A"}/5，${iv.recommendation || "无推荐"}`).join("\n")}

${job ? `\n**目标职位：**
- 职位：${job.title}
- 要求：${job.requirements ? (job.requirements as string[]).join(", ") : ""}
- 描述：${this.sanitizeForPrompt(job.description)}` : ""}

**请更新画像，确保：**
1. 整合面试中的新信息
2. 更新技能评估（如果面试中有体现）
3. 调整综合评分（基于面试表现）
4. 更新优势、顾虑和信息缺口
5. 重新生成 AI 总结，体现画像演进`;

    try {
      const result = await this.callAIWithRetry(
        {
          model: ADVANCED_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          response_format: { type: "json_object" },
          temperature: CONFIG.AI_TEMPERATURE,
        },
        CandidateProfileDataSchema
      );

      const newDataSource = `第${latestInterview.round}轮面试`;
      result.dataSources = Array.from(new Set([
        ...previousDataSources,
        newDataSource
      ]));

      // 更新证据摘要
      if (newEvidence) {
        const allEvidence = [...(currentProfile.profileData as any).evidenceSummary?.evidence || [], ...newEvidence];
        result.evidenceSummary = {
          totalEvidence: allEvidence.length,
          strongEvidence: allEvidence.filter(e =>
            e.strength === 'direct' || e.strength === 'strong'
          ).length,
          contradictions: 0, // TODO: 实现矛盾检测
          averageConfidence: allEvidence.reduce((sum, e) =>
            sum + e.confidence, 0
          ) / allEvidence.length,
          mainSources: Array.from(new Set(allEvidence.map(e => this.getEvidenceSourceLabel(e.source))))
        };
      }

      return result;
    } catch (error) {
      this.log("error", "更新画像时出错", { candidateId: candidate.id, interviewId: latestInterview.id, error });
      throw new Error("AI 画像更新失败: " + (error instanceof Error ? error.message : "未知错误"));
    }
  }

  private safeParseJSON<T>(content: string, schema: z.ZodSchema<T>): T {
    try {
      const parsed = JSON.parse(content);
      return schema.parse(parsed);
    } catch (error) {
      if (error instanceof z.ZodError) {
        this.log("error", "AI 返回数据验证失败", { errors: error.errors });
        throw new Error(`AI 返回数据格式不正确: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(", ")}`);
      }
      this.log("error", "JSON 解析失败", { error });
      throw new Error("AI 返回的不是有效的 JSON 格式");
    }
  }

  private async callAIWithRetry<T>(
    params: OpenAI.Chat.ChatCompletionCreateParams,
    schema: z.ZodSchema<T>,
    maxRetries = CONFIG.MAX_RETRIES
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await Promise.race([
          openai.chat.completions.create(params),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`AI 调用超时（${CONFIG.AI_TIMEOUT_MS}ms）`)), CONFIG.AI_TIMEOUT_MS)
          )
        ]);

        const content = response.choices[0].message.content;
        if (!content) {
          throw new Error("AI 返回空响应");
        }

        return this.safeParseJSON(content, schema);
      } catch (error) {
        lastError = error as Error;
        this.log("warn", `AI 调用第 ${i + 1} 次失败`, { error: lastError.message, attempt: i + 1 });

        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }

    throw new Error(`AI 调用失败（已重试 ${maxRetries} 次）: ${lastError?.message}`);
  }

  private sanitizeForPrompt(text: string): string {
    return text
      .replace(/```/g, "'''")
      .replace(/(忽略|ignore|forget|disregard|system|assistant|user)[\s]*[:：]/gi, "[已过滤]")
      .substring(0, 10000);
  }

  private smartTruncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;

    const truncated = text.substring(0, maxLength);
    const lastBreak = Math.max(
      truncated.lastIndexOf('。'),
      truncated.lastIndexOf('\n'),
      truncated.lastIndexOf(' ')
    );

    return lastBreak > maxLength * 0.8
      ? truncated.substring(0, lastBreak) + "..."
      : truncated + "...";
  }

  /**
   * 执行组织契合度评估
   */
  private async performOrganizationalFitAssessment(
    candidate: Candidate,
    stage: "resume" | "interview_1" | "interview_2" | "final_evaluation",
    resumeAnalysis?: ResumeAnalysis,
    interview?: Interview,
    job?: Job,
    previousProfileData?: ProfileData
  ): Promise<any> {
    const assessmentData: any = {
      candidateName: candidate.name,
      stage,
      resumeSummary: resumeAnalysis?.summary || candidate.resumeAnalysis?.summary || "",
      skills: resumeAnalysis?.skills || candidate.resumeAnalysis?.skills || [],
      experience: resumeAnalysis?.experience || candidate.resumeAnalysis?.experience || 0,
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

    // 获取文化和领导力评估
    const [cultureAssessment, leadershipAssessment] = await Promise.all([
      organizationalFitService.assessCultureFit(assessmentData, stage),
      organizationalFitService.assessLeadershipFramework(assessmentData, stage)
    ]);

    // 如果有历史数据，生成演化报告
    let evolutionData = null;
    if (previousProfileData?.organizationalFit) {
      const previousCulture = previousProfileData.organizationalFit.cultureAssessment;
      const previousLeadership = previousProfileData.organizationalFit.leadershipAssessment;

      if (previousCulture && previousLeadership) {
        evolutionData = organizationalFitService.generateEvolutionReport(
          [previousCulture as any, cultureAssessment],
          [previousLeadership as any, leadershipAssessment]
        );
      }
    }

    return {
      cultureAssessment,
      leadershipAssessment,
      ...(evolutionData && { evolution: evolutionData })
    };
  }

  private log(level: "info" | "warn" | "error", message: string, meta?: Record<string, any>) {
    const timestamp = new Date().toISOString();
    const logData = { timestamp, level, service: "CandidateProfileService", message, ...meta };
    console[level === "info" ? "log" : level](JSON.stringify(logData));
  }

  /**
   * 从简历分析生成声明（用于证据提取）
   */
  private generateClaimsFromResumeAnalysis(resumeAnalysis: ResumeAnalysis): any[] {
    const claims = [];

    // 为每个技能生成声明
    for (const skill of resumeAnalysis.skills) {
      claims.push({
        statement: `候选人掌握${skill}技能`,
        type: 'TECHNICAL_SKILL' as ClaimType
      });
    }

    // 为工作经验生成声明
    if (resumeAnalysis.experience > 0) {
      claims.push({
        statement: `候选人有${resumeAnalysis.experience}年相关工作经验`,
        type: 'WORK_EXPERIENCE' as ClaimType
      });
    }

    // 为优势生成声明
    for (const strength of resumeAnalysis.strengths) {
      claims.push({
        statement: strength,
        type: 'STRENGTH' as ClaimType
      });
    }

    return claims;
  }

  /**
   * 为技能构建证据链
   */
  private async buildSkillEvidenceChains(
    skills: string[],
    evidence: Evidence[]
  ): Promise<Map<string, EvidenceChain>> {
    const chains = new Map<string, EvidenceChain>();

    for (const skill of skills) {
      // 找到与该技能相关的证据
      const skillEvidence = evidence.filter(e =>
        e.originalText.toLowerCase().includes(skill.toLowerCase())
      );

      if (skillEvidence.length > 0) {
        const claim = await evidenceService.createClaimWithEvidence(
          `候选人掌握${skill}技能`,
          'TECHNICAL_SKILL' as ClaimType,
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
  private getEvidenceSourceLabel(source: string): string {
    const labels: Record<string, string> = {
      'resume': '简历',
      'interview_feedback': '面试反馈',
      'behavioral_observation': '行为观察',
      'test_result': '测试结果',
      'reference_check': '背景调查',
      'work_sample': '工作样本',
      'ai_analysis': 'AI分析',
      'public_profile': '公开资料',
      'certification': '证书',
      'portfolio': '作品集'
    };
    return labels[source] || source;
  }

  /**
   * 生成面试准备材料
   * 基于候选人当前画像和历史面试记录，为即将进行的面试生成AI准备材料
   */
  async generateInterviewPreparation(
    candidateId: string,
    interviewId: string,
    interviewerId?: string
  ): Promise<InterviewPreparation> {
    this.log("info", `生成面试准备材料 - 候选人: ${candidateId}, 面试: ${interviewId}`);

    try {
      // 并行获取候选人和面试信息
      const [candidate, upcomingInterview] = await Promise.all([
        storage.getCandidate(candidateId),
        storage.getInterview(interviewId)
      ]);

      if (!candidate) {
        throw new Error(`候选人不存在: ${candidateId}`);
      }
      if (!upcomingInterview) {
        throw new Error(`面试不存在: ${interviewId}`);
      }

      // 并行获取职位信息、候选人画像和历史面试记录
      const [job, latestProfile, allInterviews] = await Promise.all([
        upcomingInterview.jobId ? storage.getJob(upcomingInterview.jobId) : Promise.resolve(null),
        storage.getLatestCandidateProfile(candidateId),
        storage.getInterviewsByCandidate(candidateId)
      ]);

      const completedInterviews = allInterviews.filter(
        iv => iv.status === 'completed' && iv.feedback
      );

      // 生成面试准备材料
      const preparation = await this.generatePreparationContent(
        candidate,
        latestProfile,
        upcomingInterview,
        completedInterviews,
        job
      );

      // 保存到数据库
      const savedPreparation = await storage.createInterviewPreparation({
        candidateId,
        jobId: upcomingInterview.jobId,
        interviewId,
        generatedFor: interviewerId || upcomingInterview.interviewerId,
        status: 'completed',
        candidateContext: preparation.candidateContext,
        suggestedQuestions: preparation.suggestedQuestions,
        focusAreas: preparation.focusAreas,
        previousGaps: preparation.previousGaps,
        interviewerTips: preparation.interviewerTips,
        version: 1,
        confidence: preparation.confidence,
        aiModel: DEFAULT_MODEL
      });

      this.log("info", `面试准备材料生成成功 - ID: ${savedPreparation.id}`);
      return savedPreparation;

    } catch (error) {
      this.log("error", "生成面试准备材料失败", { candidateId, interviewId, error });

      // 保存失败状态
      await storage.createInterviewPreparation({
        candidateId,
        interviewId,
        status: 'failed',
        candidateContext: { error: error instanceof Error ? error.message : '未知错误' },
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
  private async generatePreparationContent(
    candidate: Candidate,
    latestProfile: CandidateProfile | null,
    upcomingInterview: Interview,
    completedInterviews: Interview[],
    job: Job | null
  ) {
    const systemPrompt = `你是一位经验丰富的招聘专家，负责为面试官准备面试材料。

基于候选人的当前画像和历史面试记录，生成以下内容：

1. **候选人状态摘要 (candidateContext)**：
   - summary: 简短总结候选人当前状态（100字以内）
   - currentScore: 当前综合评分（0-100）
   - strengths: 已验证的优势领域（3-5个）
   - concerns: 需要关注或进一步验证的点（2-4个）

2. **建议问题 (suggestedQuestions)**（5-7个）：
   - question: 具体问题内容
   - purpose: 提问的目的和评估维度
   - probing: 追问建议（可选，1-2个）
   - category: 问题类别（technical/behavioral/situational/cultural）

3. **重点考察领域 (focusAreas)**（3-5个）：
   - area: 需要重点考察的领域
   - why: 为什么需要考察
   - signals: 需要观察的关键信号（2-3个）
   - priority: 优先级（high/medium/low）

4. **前轮未覆盖点 (previousGaps)**：
   - 前几轮面试中未充分考察的重要方面（字符串数组）

5. **面试官提示 (interviewerTips)**：
   - 给面试官的实用建议和注意事项（字符串数组）

请确保：
- 问题有针对性，基于候选人背景和职位要求
- 避免重复已经充分验证的内容
- 关注信息缺口和潜在风险
- 提供可操作的具体建议`;

    const profileData = latestProfile?.profileData as any || {};
    const interviewRound = upcomingInterview.round || completedInterviews.length + 1;

    const userPrompt = `**候选人信息：**
姓名：${candidate.name}
当前职位：${candidate.position || '未知'}
经验年限：${candidate.experience || 0}年
技能：${candidate.skills ? (candidate.skills as string[]).join(', ') : '未知'}

**目标职位：**
${job ? `${job.title} - ${job.department}
要求：${job.requirements ? (job.requirements as string[]).join(', ') : ''}` : '未指定'}

**当前画像（版本 ${latestProfile?.version || 0}）：**
综合评分：${latestProfile?.overallScore || 70}/100
阶段：${latestProfile?.stage || 'initial'}
${latestProfile?.aiSummary || '暂无总结'}

技术技能：${profileData.technicalSkills?.map((s: any) => `${s.skill}(${s.proficiency})`).join(', ') || '待评估'}
软技能：${profileData.softSkills?.map((s: any) => s.skill).join(', ') || '待评估'}

**历史面试（${completedInterviews.length}轮）：**
${completedInterviews.map(iv =>
  `第${iv.round}轮 ${iv.type}：评分${iv.rating || 'N/A'}/5，${iv.recommendation || '无建议'}`
).join('\n') || '首次面试'}

**即将进行的面试：**
第${interviewRound}轮 ${upcomingInterview.type}面试

请生成面试准备材料，重点关注：
1. 基于已有信息，还需要验证什么？
2. 这轮面试的重点应该是什么？
3. 如何帮助面试官做出准确判断？`;

    try {
      const completion = await openai.chat.completions.create({
        model: ADVANCED_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const content = completion.choices[0].message.content || "{}";
      const result = JSON.parse(content);

      // 验证并规范化数据结构
      return {
        candidateContext: candidateContextSchema.parse(result.candidateContext || {
          summary: `${candidate.name}，${candidate.experience || 0}年经验`,
          currentScore: latestProfile?.overallScore || 70,
          strengths: profileData.strengths || [],
          concerns: profileData.concerns || []
        }),
        suggestedQuestions: z.array(suggestedQuestionSchema).parse(
          result.suggestedQuestions || []
        ),
        focusAreas: z.array(focusAreaSchema).parse(
          result.focusAreas || []
        ),
        previousGaps: result.previousGaps || [],
        interviewerTips: result.interviewerTips || [],
        confidence: Math.round((result.confidence || 0.8) * 100)
      };

    } catch (error) {
      this.log("error", "AI生成准备材料失败", { error });

      // 返回基础版本的准备材料
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
  private generateFallbackPreparation(
    candidate: Candidate,
    profile: CandidateProfile | null,
    upcomingInterview: Interview,
    completedInterviews: Interview[]
  ) {
    const round = upcomingInterview.round || completedInterviews.length + 1;

    return {
      candidateContext: {
        summary: `${candidate.name}，${candidate.experience || 0}年经验，第${round}轮${upcomingInterview.type}面试`,
        currentScore: profile?.overallScore || 70,
        strengths: ["经验丰富", "技术扎实"],
        concerns: ["需进一步验证", "文化契合度待评估"]
      },
      suggestedQuestions: [
        {
          question: "请介绍您最有挑战性的项目经历",
          purpose: "评估问题解决能力和技术深度",
          category: "behavioral" as const
        },
        {
          question: "您如何看待团队协作？",
          purpose: "评估团队合作能力",
          category: "cultural" as const
        }
      ],
      focusAreas: [
        {
          area: "技术能力",
          why: "核心岗位要求",
          signals: ["解决问题的思路", "技术深度"],
          priority: "high" as const
        }
      ],
      previousGaps: ["领导力", "项目管理经验"],
      interviewerTips: ["注意观察候选人的沟通方式", "深入了解其职业规划"],
      confidence: 60
    };
  }
}

export const candidateProfileService = new CandidateProfileService();