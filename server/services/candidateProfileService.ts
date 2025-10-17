import OpenAI from "openai";
import { z } from "zod";
import { storage } from "../storage";
import type { Candidate, Job, Interview, CandidateProfile, InterviewPreparation } from "@shared/schema";
import type { ResumeAnalysis } from "./aiService";
import { organizationalFitService, type CultureFitAssessment, type LeadershipAssessment } from "./organizationalFitService";
import { evidenceService } from "./evidenceService";
import {
  EvidenceSource,
  EvidenceStrength,
  ClaimType,
  type Evidence,
  type EvidenceChain,
} from "@shared/types/evidence";
import { aiTokenTracker } from "./aiTokenTrackerService";
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

/**
 * ✨ Token 限制配置
 * 用于控制AI调用成本和防止超限
 */
const TOKEN_LIMITS = {
  MAX_TOTAL_TOKENS: 30000,        // 单次调用最大 token (约22500汉字)
  MAX_HISTORY_TOKENS: 5000,       // 历史面试记录最大 token
  MAX_EVIDENCE_TOKENS: 3000,      // 证据摘要最大 token
  MAX_TRANSCRIPTION_TOKENS: 2000, // 面试转录最大 token
  MAX_FEEDBACK_TOKENS: 800,       // 面试官反馈最大 token
  MAX_NOTES_TOKENS: 500,          // 面试官笔记最大 token
  MAX_JOB_DESC_TOKENS: 500,       // 职位描述最大 token
  MAX_SUMMARY_TOKENS: 300,        // AI总结最大 token
  CHARS_PER_TOKEN: 2.5,           // 中文约2.5字符 = 1 token (估算)
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
  // 锁管理：存储 Promise 和开始时间
  private updateLocks = new Map<string, { promise: Promise<CandidateProfile>, startTime: number }>();

  // 结果缓存：实现幂等性，避免重复计算
  private resultCache = new Map<string, { result: CandidateProfile, timestamp: number }>();

  // 锁清理定时器
  private lockCleanerInterval: NodeJS.Timeout | null = null;

  constructor() {
    // 启动锁清理机制（每30秒检查一次）
    this.startLockCleaner();
  }

  /**
   * 定期清理超时的锁，防止内存泄漏
   */
  private startLockCleaner() {
    this.lockCleanerInterval = setInterval(() => {
      const now = Date.now();
      let cleanedCount = 0;

      for (const [key, { startTime }] of this.updateLocks.entries()) {
        // 清理超过1分钟的锁
        if (now - startTime > 60000) {
          this.updateLocks.delete(key);
          cleanedCount++;
          this.log("warn", "清理超时锁", { lockKey: key, age: now - startTime });
        }
      }

      if (cleanedCount > 0) {
        this.log("info", "锁清理完成", { cleanedCount, remainingLocks: this.updateLocks.size });
      }
    }, 30000);
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
      job || undefined,
      resumeEvidence
    );

    // 进行初始的组织契合度评估（基于简历）
    try {
      const orgFitData = await this.performOrganizationalFitAssessment(
        candidate,
        "resume",
        resumeAnalysis,
        undefined,
        job ?? undefined
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

    // 使用更细粒度的锁：candidateId + interviewId
    // 允许同一候选人的不同面试反馈并行处理
    const lockKey = `${candidateId}:${interviewId}`;

    // 1. 检查缓存（5分钟内的结果直接返回，实现幂等性）
    const cached = this.resultCache.get(lockKey);
    if (cached && Date.now() - cached.timestamp < 300000) {
      this.log("info", "返回缓存的画像更新结果", {
        lockKey,
        cacheAge: Date.now() - cached.timestamp
      });
      return cached.result;
    }

    // 2. 如果已有相同的更新在进行，等待它完成（带超时保护）
    if (this.updateLocks.has(lockKey)) {
      this.log("info", "等待已存在的画像更新完成", { candidateId, interviewId });

      const lockData = this.updateLocks.get(lockKey)!;
      const existingPromise = lockData.promise;

      // 创建超时 Promise（30秒超时）
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error("等待画像更新超时，可能存在死锁"));
        }, 30000);
      });

      try {
        // 等待现有更新完成或超时
        return await Promise.race([existingPromise, timeoutPromise]);
      } catch (error) {
        // 超时后强制清除锁，允许重试
        this.updateLocks.delete(lockKey);
        this.log("error", "等待更新超时，强制清除锁", {
          lockKey,
          error: error instanceof Error ? error.message : '未知错误',
          lockAge: Date.now() - lockData.startTime
        });
        throw new Error(`画像更新超时: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    }

    // 3. 创建新的更新操作
    const updatePromise = this._doUpdateProfileWithInterview(candidateId, interviewId);
    this.updateLocks.set(lockKey, {
      promise: updatePromise,
      startTime: Date.now()
    });

    try {
      const result = await updatePromise;

      // 4. 立即删除锁（不延迟，避免竞态条件）
      this.updateLocks.delete(lockKey);

      // 5. 缓存结果（5分钟有效期）
      this.resultCache.set(lockKey, {
        result,
        timestamp: Date.now()
      });

      this.log("info", "画像更新成功，锁已释放", {
        lockKey,
        profileVersion: result.version
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';

      // 6. 智能错误处理：区分可重试和不可重试的错误
      const isRetryableError =
        errorMessage.includes("timeout") ||
        errorMessage.includes("ECONNREFUSED") ||
        errorMessage.includes("ETIMEDOUT") ||
        errorMessage.includes("AI 调用超时");

      if (isRetryableError) {
        // 瞬时错误：立即删除锁，允许重试
        this.updateLocks.delete(lockKey);
        this.log("warn", "画像更新遇到可重试错误，锁已释放", {
          lockKey,
          error: errorMessage
        });
      } else {
        // 持久性错误：延迟删除锁（5秒），防止重复失败浪费资源
        setTimeout(() => {
          this.updateLocks.delete(lockKey);
          this.log("info", "持久性错误的锁延迟清除完成", { lockKey });
        }, 5000);

        this.log("error", "画像更新遇到严重错误，5秒后允许重试", {
          lockKey,
          error: errorMessage
        });
      }

      throw error;
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

    // 从面试中提取完整证据
    const interviewFeedbackData = this.parseInterviewFeedback(interview);
    const interviewEvidence = await evidenceService.extractEvidenceFromInterview(
      {
        observations: {
          strengths: interview.aiKeyFindings || interviewFeedbackData.observations?.strengths || [],
          weaknesses: interview.aiConcernAreas || interviewFeedbackData.observations?.weaknesses || [],
          redFlags: interviewFeedbackData.observations?.redFlags || [],
          highlights: interviewFeedbackData.observations?.highlights || [],
        },
        skillsValidation: interviewFeedbackData.skillsValidation || [],
        behavioralEvidence: interviewFeedbackData.behavioralEvidence || [],
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
        job ?? undefined,
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
      evidenceSummary: (() => {
        const evidenceList = resumeEvidence ?? [];
        const strongEvidenceCount = evidenceList.filter(e =>
          e.strength === 'direct' || e.strength === 'strong'
        ).length;
        const averageConfidence = evidenceList.length
          ? evidenceList.reduce((sum, e) => sum + e.confidence, 0) / evidenceList.length
          : 0;

        return {
          totalEvidence: evidenceList.length,
          strongEvidence: strongEvidenceCount,
          contradictions: 0,
          averageConfidence,
          mainSources: ["简历"],
        };
      })()
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
  - 共提取 ${(resumeEvidence ?? []).length} 条证据
  - 直接证据：${(resumeEvidence ?? []).filter(e => e.strength === 'direct').length} 条
  - 强力证据：${(resumeEvidence ?? []).filter(e => e.strength === 'strong').length} 条
  - 平均置信度：${(() => {
      const list = resumeEvidence ?? [];
      if (!list.length) return '0';
      const avg = list.reduce((s, e) => s + e.confidence, 0) / list.length;
      return avg.toFixed(0);
    })()}%

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
        CandidateProfileDataSchema,
        CONFIG.MAX_RETRIES,
        {
          operation: "initial_profile_generation",
          entityType: "candidate",
          entityId: candidate.id,
          metadata: {
            hasResume: !!resumeAnalysis,
            hasJob: !!job,
            evidenceCount: resumeEvidence?.length || 0,
          },
        }
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
    // 1. 获取历史证据（从当前画像中提取）
    const historicalEvidence = this.extractEvidenceFromProfile(currentProfile);

    // 2. 合并所有证据
    const allEvidence = [...historicalEvidence, ...(newEvidence || [])];

    this.log("info", "证据链整合", {
      candidateId: candidate.id,
      historicalEvidenceCount: historicalEvidence.length,
      newEvidenceCount: newEvidence?.length || 0,
      totalEvidenceCount: allEvidence.length
    });

    // 3. 检测证据矛盾
    const contradictions = await this.detectEvidenceContradictions(allEvidence);

    // 4. ✨ 构建压缩后的证据摘要
    const evidenceSummary = this.buildEvidenceSummaryCompact(allEvidence, newEvidence || []);

    const systemPrompt = `你是一位资深的 HR 专家和人才评估专家。你的任务是基于候选人的现有画像和最新的面试反馈，更新候选人画像。

**重要原则：**
1. **证据驱动**：所有评估必须基于明确的证据，避免主观臆断
2. **整合新信息**：将面试中获得的新信息与现有画像整合
3. **保持一致性**：确保更新后的画像在逻辑上一致
4. **突出变化**：明确指出哪些信息是新增的，哪些评估有所调整
5. **深化理解**：利用面试信息深化对候选人的理解
6. **识别矛盾**：如果面试反馈与简历信息有出入，需要明确指出并基于证据强度判断

**证据处理规则**：
- 直接证据 (direct) > 强证据 (strong) > 中等证据 (moderate) > 弱证据 (weak) > 推断证据 (inferential)
- 面试验证的证据优先于简历声称
- 当证据矛盾时，选择证据强度更高、来源更可信的结论
- 标注证据不足的评估为"需要进一步验证"

请更新候选人画像，使用与初始画像相同的 JSON 结构，proficiency 只能是: "beginner", "intermediate", "advanced", "expert" 之一。`;

    const previousStrengths = (currentProfile.strengths as string[]) || [];
    const previousConcerns = (currentProfile.concerns as string[]) || [];
    const previousGaps = (currentProfile.gaps as string[]) || [];
    const previousDataSources = (currentProfile.dataSources as string[]) || [];

    // ✨ 使用Token限制处理各个部分
    const transcription = latestInterview.transcription
      ? this.truncateToTokenLimit(
          this.sanitizeForPrompt(latestInterview.transcription),
          TOKEN_LIMITS.MAX_TRANSCRIPTION_TOKENS
        )
      : "";

    // ✨ 压缩历史面试记录
    const interviewHistory = this.summarizeInterviewHistory(allInterviews, latestInterview);

    // ✨ 压缩职位信息
    let jobInfo = "";
    if (job) {
      const requirements = job.requirements
        ? (job.requirements as string[]).slice(0, 10).join(', ')  // 最多10个要求
        : '';
      const description = this.truncateToTokenLimit(
        this.sanitizeForPrompt(job.description),
        TOKEN_LIMITS.MAX_JOB_DESC_TOKENS
      );

      jobInfo = `\n**目标职位：**
- 职位：${job.title}
- 要求：${requirements}
- 描述：${description}`;
    }

    const userPrompt = `候选人：${this.sanitizeForPrompt(candidate.name)}

**当前画像（第 ${currentProfile.version} 版）：**
- 阶段：${currentProfile.stage}
- 综合评分：${currentProfile.overallScore}
- 已知优势：${previousStrengths.slice(0, 5).join(", ")}${previousStrengths.length > 5 ? ` 等${previousStrengths.length}项` : ''}
- 已知顾虑：${previousConcerns.slice(0, 5).join(", ")}${previousConcerns.length > 5 ? ` 等${previousConcerns.length}项` : ''}
- 信息缺口：${previousGaps.slice(0, 5).join(", ")}${previousGaps.length > 5 ? ` 等${previousGaps.length}项` : ''}
- AI 总结：${this.truncateToTokenLimit(this.sanitizeForPrompt(currentProfile.aiSummary || ""), TOKEN_LIMITS.MAX_SUMMARY_TOKENS)}

**证据链分析：**
${evidenceSummary}

${contradictions.length > 0 ? `
**检测到的证据矛盾（共 ${contradictions.length} 个，展示前5个）：**
${contradictions.slice(0, 5).map(c => `- ${c.claim}: ${c.description}`).join("\n")}
请在更新画像时明确解决这些矛盾，基于证据强度和来源可信度做出判断。
` : ""}

**最新面试信息（第 ${latestInterview.round} 轮）：**
- 面试类型：${latestInterview.type}
- 面试时间：${latestInterview.scheduledDate}
- 面试评分：${latestInterview.rating || "未评分"}/5
- 面试官反馈：${this.truncateToTokenLimit(this.sanitizeForPrompt(latestInterview.feedback || "无"), TOKEN_LIMITS.MAX_FEEDBACK_TOKENS)}
- 面试官笔记：${this.truncateToTokenLimit(this.sanitizeForPrompt(latestInterview.interviewerNotes || "无"), TOKEN_LIMITS.MAX_NOTES_TOKENS)}
- 推荐意见：${latestInterview.recommendation || "未给出"}
${transcription ? `- 面试转录（摘要）：${transcription}` : ""}
${latestInterview.aiKeyFindings ? `- AI 关键发现：${JSON.stringify(latestInterview.aiKeyFindings).substring(0, 500)}` : ""}
${latestInterview.aiConcernAreas ? `- AI 关注点：${JSON.stringify(latestInterview.aiConcernAreas).substring(0, 500)}` : ""}

**历史面试记录（共 ${allInterviews.length} 轮）：**
${interviewHistory}

${jobInfo}

**请更新画像，确保：**
1. 基于证据整合面试中的新信息
2. 更新技能评估（标明证据来源和强度）
3. 调整综合评分（基于证据支撑的面试表现）
4. 更新优势、顾虑和信息缺口（区分已验证和待验证）
5. 解决检测到的证据矛盾
6. 重新生成 AI 总结，体现画像演进和证据增强`;

    // ✨ Token 估算和日志
    const estimatedTokens = this.estimateTokens(systemPrompt + userPrompt);
    this.log('info', 'AI 提示词 Token 估算', {
      candidateId: candidate.id,
      interviewId: latestInterview.id,
      estimatedTokens,
      breakdown: {
        systemPrompt: this.estimateTokens(systemPrompt),
        userPrompt: this.estimateTokens(userPrompt),
        evidenceSummary: this.estimateTokens(evidenceSummary),
        interviewHistory: this.estimateTokens(interviewHistory),
        transcription: this.estimateTokens(transcription),
      },
      withinLimit: estimatedTokens < TOKEN_LIMITS.MAX_TOTAL_TOKENS
    });

    // ✨ 如果仍然超限，使用降级策略
    if (estimatedTokens > TOKEN_LIMITS.MAX_TOTAL_TOKENS) {
      this.log('warn', 'Token 数量超限，使用降级策略', {
        candidateId: candidate.id,
        estimatedTokens,
        limit: TOKEN_LIMITS.MAX_TOTAL_TOKENS
      });

      // 降级策略：移除面试转录
      return await this.generateUpdatedProfileWithAI(
        candidate,
        currentProfile,
        { ...latestInterview, transcription: null },  // 移除转录
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
          temperature: CONFIG.AI_TEMPERATURE,
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
            estimatedTokens,
          },
        }
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
    maxRetries = CONFIG.MAX_RETRIES,
    trackingInfo?: {
      operation: string;
      userId?: string;
      entityType?: string;
      entityId?: string;
      metadata?: any;
    }
  ): Promise<T> {
    let lastError: Error | null = null;
    const startTime = Date.now();

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await Promise.race([
          openai.chat.completions.create(params),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`AI 调用超时（${CONFIG.AI_TIMEOUT_MS}ms）`)), CONFIG.AI_TIMEOUT_MS)
          )
        ]) as OpenAI.Chat.Completions.ChatCompletion;

        const latencyMs = Date.now() - startTime;

        // 记录成功的AI调用
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
              maxTokens: params.max_tokens,
            },
          });
        }

        const content = response.choices[0].message.content;
        if (!content) {
          throw new Error("AI 返回空响应");
        }

        return this.safeParseJSON(content, schema);
      } catch (error) {
        lastError = error as Error;
        this.log("warn", `AI 调用第 ${i + 1} 次失败`, { error: lastError.message, attempt: i + 1 });

        // 如果是最后一次重试，记录失败
        if (i === maxRetries - 1 && trackingInfo) {
          const latencyMs = Date.now() - startTime;

          // 创建一个虚拟响应对象用于记录失败
          const dummyResponse: OpenAI.Chat.Completions.ChatCompletion = {
            id: "failed",
            object: "chat.completion",
            created: Math.floor(Date.now() / 1000),
            model: params.model,
            choices: [],
            usage: {
              prompt_tokens: 0,
              completion_tokens: 0,
              total_tokens: 0,
            },
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
              maxTokens: params.max_tokens,
            },
          });
        }

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
   * ✨ 估算文本的 token 数量（粗略估算）
   * 中文约2.5字符 = 1 token
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / TOKEN_LIMITS.CHARS_PER_TOKEN);
  }

  /**
   * ✨ 智能截断文本到目标 token 数量
   * 优先在句子边界截断,保持语义完整性
   */
  private truncateToTokenLimit(text: string, maxTokens: number): string {
    const maxChars = maxTokens * TOKEN_LIMITS.CHARS_PER_TOKEN;

    if (text.length <= maxChars) {
      return text;
    }

    // 在句子边界截断（寻找最后的句号、问号或感叹号）
    const truncated = text.substring(0, maxChars);
    const lastSentenceEnd = Math.max(
      truncated.lastIndexOf('。'),
      truncated.lastIndexOf('！'),
      truncated.lastIndexOf('？'),
      truncated.lastIndexOf('\n')
    );

    if (lastSentenceEnd > maxChars * 0.8) {
      return truncated.substring(0, lastSentenceEnd + 1) + '\n[内容已截断]';
    }

    return truncated + '\n[内容已截断]';
  }

  /**
   * ✨ 压缩历史面试记录
   * 只保留关键信息,避免冗余
   */
  private summarizeInterviewHistory(
    allInterviews: Interview[],
    latestInterview: Interview,
    maxTokens: number = TOKEN_LIMITS.MAX_HISTORY_TOKENS
  ): string {
    // 排除最新面试（会单独详细展示）
    const previousInterviews = allInterviews.filter(iv => iv.id !== latestInterview.id);

    if (previousInterviews.length === 0) {
      return '首次面试';
    }

    // 简化格式：只保留关键信息
    const summaries = previousInterviews.map(iv =>
      `第${iv.round}轮${iv.type}：${iv.rating || 'N/A'}/5，${iv.recommendation || '无'}`
    );

    let result = summaries.join('\n');

    // 如果超过限制，进一步压缩
    if (this.estimateTokens(result) > maxTokens) {
      // 只保留最近的5轮
      const recentSummaries = summaries.slice(-5);
      const omittedCount = summaries.length - recentSummaries.length;

      result = [
        `[省略前 ${omittedCount} 轮面试]`,
        ...recentSummaries
      ].join('\n');
    }

    return result;
  }

  /**
   * ✨ 压缩证据摘要
   * 提供高层次统计信息,避免详细列举
   */
  private buildEvidenceSummaryCompact(
    allEvidence: Evidence[],
    newEvidence: Evidence[],
    maxTokens: number = TOKEN_LIMITS.MAX_EVIDENCE_TOKENS
  ): string {
    const totalEvidence = allEvidence.length;
    const newEvidenceCount = newEvidence.length;

    const strongEvidence = allEvidence.filter(e =>
      e.strength === 'direct' || e.strength === 'strong'
    );

    const averageConfidence = totalEvidence > 0
      ? allEvidence.reduce((sum, e) => sum + (e.confidence || 50), 0) / totalEvidence
      : 0;

    const sources = Array.from(new Set(allEvidence.map(e => this.getEvidenceSourceLabel(e.source))));

    // 基础摘要（总是包含）
    let summary = `
- 总证据数：${totalEvidence} 条（本轮新增 ${newEvidenceCount} 条）
- 强力证据：${strongEvidence.length} 条（${(strongEvidence.length / totalEvidence * 100).toFixed(0)}%）
- 平均置信度：${averageConfidence.toFixed(0)}%
- 证据来源：${sources.join('、')}
- 证据密度：${totalEvidence > 10 ? '充分' : totalEvidence > 5 ? '良好' : '一般'}`;

    // 如果还有 token 余量，添加关键证据示例
    const currentTokens = this.estimateTokens(summary);
    const remainingTokens = maxTokens - currentTokens;

    if (remainingTokens > 500 && strongEvidence.length > 0) {
      const topEvidence = strongEvidence
        .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
        .slice(0, 3)  // 只展示前3条最强证据
        .map(e => `  - ${e.originalText.substring(0, 100)}`)
        .join('\n');

      summary += `\n\n关键证据示例：\n${topEvidence}`;
    }

    return summary;
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
   * 解析面试反馈数据，提取结构化的观察、技能验证和行为证据
   */
  private parseInterviewFeedback(interview: Interview): {
    observations?: {
      strengths?: string[];
      weaknesses?: string[];
      redFlags?: string[];
      highlights?: string[];
    };
    skillsValidation?: any[];
    behavioralEvidence?: any[];
  } {
    try {
      // 尝试解析 feedback 字段（可能是 JSON 字符串）
      if (interview.feedback) {
        if (typeof interview.feedback === 'string') {
          const parsed = JSON.parse(interview.feedback);
          return {
            observations: parsed.observations || {},
            skillsValidation: parsed.skillsValidation || [],
            behavioralEvidence: parsed.behavioralEvidence || [],
          };
        } else if (typeof interview.feedback === 'object') {
          const feedbackObj = interview.feedback as any;
          return {
            observations: feedbackObj.observations || {},
            skillsValidation: feedbackObj.skillsValidation || [],
            behavioralEvidence: feedbackObj.behavioralEvidence || [],
          };
        }
      }

      // 如果没有结构化反馈，尝试从其他字段提取
      const fallbackData: any = {
        observations: {},
        skillsValidation: [],
        behavioralEvidence: [],
      };

      // 从 interviewerNotes 中提取信息
      if (interview.interviewerNotes) {
        fallbackData.observations.strengths = [];
        fallbackData.observations.weaknesses = [];

        // 简单的关键词提取（后续可以用 AI 优化）
        const notes = interview.interviewerNotes.toLowerCase();
        if (notes.includes('优势') || notes.includes('strengths') || notes.includes('good')) {
          fallbackData.observations.strengths.push(interview.interviewerNotes.substring(0, 200));
        }
        if (notes.includes('不足') || notes.includes('weaknesses') || notes.includes('concern')) {
          fallbackData.observations.weaknesses.push(interview.interviewerNotes.substring(0, 200));
        }
      }

      return fallbackData;
    } catch (error) {
      this.log("error", "解析面试反馈失败", {
        interviewId: interview.id,
        error: error instanceof Error ? error.message : '未知错误'
      });

      return {
        observations: {},
        skillsValidation: [],
        behavioralEvidence: [],
      };
    }
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
   * 从候选人画像中提取历史证据
   */
  /**
   * ✨ 从候选人画像中提取所有历史证据
   * 确保证据链的完整性和连续性
   */
  private extractEvidenceFromProfile(profile: CandidateProfile): Evidence[] {
    const evidence: Evidence[] = [];

    try {
      const profileData = profile.profileData as any;

      // 1. 提取技能证据（技术技能 + 软技能）
      this.extractSkillEvidence(profileData, evidence);

      // 2. 提取工作经验证据
      this.extractExperienceEvidence(profileData, evidence);

      // 3. 提取教育背景证据
      this.extractEducationEvidence(profileData, evidence);

      // 4. 提取文化契合度证据
      this.extractCulturalFitEvidence(profileData, evidence);

      // 5. 提取职业发展证据
      this.extractCareerTrajectoryEvidence(profileData, evidence);

      // 6. 提取组织契合度证据（文化评估 + 领导力评估）
      this.extractOrganizationalFitEvidence(profileData, evidence);

      // 7. 提取 evidenceSummary 中的证据（防止丢失）
      if (profileData.evidenceSummary?.evidence && Array.isArray(profileData.evidenceSummary.evidence)) {
        evidence.push(...profileData.evidenceSummary.evidence);
      }

      // 8. 去重（基于证据ID或内容哈希）
      const deduped = this.deduplicateEvidence(evidence);

      this.log("info", "从画像中提取历史证据", {
        profileId: profile.id,
        totalExtracted: evidence.length,
        afterDedup: deduped.length,
        breakdown: {
          skills: evidence.filter(e => e.source === 'resume' || e.source === 'interview').length,
          total: evidence.length
        }
      });

      return deduped;
    } catch (error) {
      this.log("error", "提取历史证据失败", {
        profileId: profile.id,
        error: error instanceof Error ? error.message : '未知错误'
      });
      return [];
    }
  }

  /**
   * ✨ 提取技能证据（技术技能 + 软技能）
   */
  private extractSkillEvidence(profileData: any, evidence: Evidence[]): void {
    if (!profileData) return;

    const skillTypes = ['technicalSkills', 'softSkills'];

    for (const skillType of skillTypes) {
      const skills = profileData[skillType];
      if (!skills || !Array.isArray(skills) || skills.length === 0) continue;

      for (const skill of skills) {
        if (!skill) continue;

        // 提取直接证据
        if (skill.evidence && Array.isArray(skill.evidence)) {
          evidence.push(...skill.evidence);
        }

        // 提取证据链
        if (skill.evidenceChain?.supportingEvidence && Array.isArray(skill.evidenceChain.supportingEvidence)) {
          evidence.push(...skill.evidenceChain.supportingEvidence);
        }
      }
    }
  }

  /**
   * ✨ 提取工作经验证据
   */
  private extractExperienceEvidence(profileData: any, evidence: Evidence[]): void {
    if (!profileData?.experience) return;

    const { positions, evidence: expEvidence } = profileData.experience;

    // 提取职位证据
    if (positions && Array.isArray(positions) && positions.length > 0) {
      for (const position of positions) {
        if (!position) continue;

        // 职位成就证据
        if (position.evidence && Array.isArray(position.evidence)) {
          evidence.push(...position.evidence);
        }

        // 关键成就的证据
        if (position.keyAchievements && Array.isArray(position.keyAchievements)) {
          for (const achievement of position.keyAchievements) {
            if (achievement && typeof achievement === 'object' && achievement.evidence && Array.isArray(achievement.evidence)) {
              evidence.push(...achievement.evidence);
            }
          }
        }
      }
    }

    // 工作年限证据
    if (expEvidence && Array.isArray(expEvidence)) {
      evidence.push(...expEvidence);
    }
  }

  /**
   * ✨ 提取教育背景证据
   */
  private extractEducationEvidence(profileData: any, evidence: Evidence[]): void {
    if (profileData.education?.evidence && Array.isArray(profileData.education.evidence)) {
      evidence.push(...profileData.education.evidence);
    }
  }

  /**
   * ✨ 提取文化契合度证据
   */
  private extractCulturalFitEvidence(profileData: any, evidence: Evidence[]): void {
    if (profileData.culturalFit?.evidence && Array.isArray(profileData.culturalFit.evidence)) {
      evidence.push(...profileData.culturalFit.evidence);
    }

    // 工作风格证据
    if (profileData.culturalFit?.workStyle?.evidence && Array.isArray(profileData.culturalFit.workStyle.evidence)) {
      evidence.push(...profileData.culturalFit.workStyle.evidence);
    }
  }

  /**
   * ✨ 提取职业发展轨迹证据
   */
  private extractCareerTrajectoryEvidence(profileData: any, evidence: Evidence[]): void {
    if (profileData.careerTrajectory?.evidence && Array.isArray(profileData.careerTrajectory.evidence)) {
      evidence.push(...profileData.careerTrajectory.evidence);
    }
  }

  /**
   * ✨ 提取组织契合度证据（文化评估 + 领导力评估）
   */
  private extractOrganizationalFitEvidence(profileData: any, evidence: Evidence[]): void {
    if (!profileData?.organizationalFit) return;

    // 文化评估证据
    if (profileData.organizationalFit.cultureAssessment?.valueAssessments && Array.isArray(profileData.organizationalFit.cultureAssessment.valueAssessments)) {
      for (const valueAssessment of profileData.organizationalFit.cultureAssessment.valueAssessments) {
        if (!valueAssessment?.evidence || !Array.isArray(valueAssessment.evidence)) continue;

        // 将字符串证据转换为 Evidence 对象
        const evidenceObjects = valueAssessment.evidence.map((e: any) => {
          if (typeof e === 'string') {
            // 生成唯一ID: 类型-时间戳-随机字符串
            const uniqueId = `cultural-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
            return {
              id: uniqueId,
              source: 'ai_analysis' as const,
              originalText: e,
              strength: 'moderate' as const,
              confidence: 70,
              timestamp: new Date().toISOString()
            };
          }
          return e;
        });
        evidence.push(...evidenceObjects);
      }
    }

    // 领导力评估证据
    if (profileData.organizationalFit.leadershipAssessment?.dimensionScores && Array.isArray(profileData.organizationalFit.leadershipAssessment.dimensionScores)) {
      for (const dimension of profileData.organizationalFit.leadershipAssessment.dimensionScores) {
        if (!dimension?.evidence || !Array.isArray(dimension.evidence)) continue;

        const evidenceObjects = dimension.evidence.map((e: any) => {
          if (typeof e === 'string') {
            // 生成唯一ID: 类型-时间戳-随机字符串
            const uniqueId = `leadership-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
            return {
              id: uniqueId,
              source: 'ai_analysis' as const,
              originalText: e,
              strength: 'moderate' as const,
              confidence: 70,
              timestamp: new Date().toISOString()
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
  private deduplicateEvidence(evidence: Evidence[]): Evidence[] {
    const seenIds = new Set<string>();
    const seenHashes = new Set<string>();
    const result: Evidence[] = [];

    for (const e of evidence) {
      // 优先使用 ID
      if (e.id) {
        if (seenIds.has(e.id)) continue;
        seenIds.add(e.id);
        result.push(e);
        continue;
      }

      // 如果没有 ID，使用内容哈希
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
  private hashEvidence(evidence: Evidence): string {
    // 按字母顺序排列键，确保相同内容生成相同哈希
    const normalized = {
      confidence: evidence.confidence || 0,
      originalText: evidence.originalText || '',
      source: evidence.source || '',
      strength: evidence.strength || '',
    };
    const key = JSON.stringify(normalized);
    return Buffer.from(key).toString('base64');
  }

  /**
   * 检测证据矛盾
   */
  private async detectEvidenceContradictions(allEvidence: Evidence[]): Promise<Array<{
    claim: string;
    description: string;
    conflictingEvidence: Evidence[];
  }>> {
    const contradictions: Array<{
      claim: string;
      description: string;
      conflictingEvidence: Evidence[];
    }> = [];

    try {
      // 按声明分组证据
      const evidenceByStatement = new Map<string, Evidence[]>();

      for (const evidence of allEvidence) {
        const key = evidence.originalText.toLowerCase().substring(0, 50); // 使用前50个字符作为简单的分组键
        if (!evidenceByStatement.has(key)) {
          evidenceByStatement.set(key, []);
        }
        evidenceByStatement.get(key)!.push(evidence);
      }

      // 检测矛盾
      for (const [statement, evidences] of evidenceByStatement.entries()) {
        if (evidences.length > 1) {
          // 检查是否有矛盾的证据（简单版本：来源不同且强度冲突）
          const resumeEvidence = evidences.filter((e: Evidence) => e.source === EvidenceSource.RESUME);
          const interviewEvidence = evidences.filter((e: Evidence) => e.source === EvidenceSource.INTERVIEW_FEEDBACK);

          if (resumeEvidence.length > 0 && interviewEvidence.length > 0) {
            // 这里可以使用 AI 进行更精确的矛盾检测
            contradictions.push({
              claim: statement,
              description: `简历声称与面试验证存在差异`,
              conflictingEvidence: [...resumeEvidence, ...interviewEvidence]
            });
          }
        }
      }

      this.log("info", "证据矛盾检测完成", {
        totalEvidence: allEvidence.length,
        contradictionsFound: contradictions.length
      });

      return contradictions;
    } catch (error) {
      this.log("error", "证据矛盾检测失败", {
        error: error instanceof Error ? error.message : '未知错误'
      });
      return [];
    }
  }

  /**
   * 构建证据摘要
   */
  private buildEvidenceSummary(allEvidence: Evidence[], newEvidence: Evidence[]): string {
    const totalEvidence = allEvidence.length;
    const newEvidenceCount = newEvidence.length;

    const strongEvidence = allEvidence.filter(e =>
      e.strength === 'direct' || e.strength === 'strong'
    );

    const averageConfidence = totalEvidence > 0
      ? allEvidence.reduce((sum, e) => sum + (e.confidence || 50), 0) / totalEvidence
      : 0;

    const sources = Array.from(new Set(allEvidence.map(e => this.getEvidenceSourceLabel(e.source))));

    return `
- 总证据数：${totalEvidence} 条（本轮新增 ${newEvidenceCount} 条）
- 强力证据：${strongEvidence.length} 条（直接证据或强证据）
- 平均置信度：${averageConfidence.toFixed(0)}%
- 证据来源：${sources.join('、')}
- 证据密度：${totalEvidence > 10 ? '充分' : totalEvidence > 5 ? '良好' : '一般'}`;
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
        latestProfile ?? null,
        upcomingInterview,
        completedInterviews,
        job ?? null
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
