import OpenAI from "openai";
import { enhancedResumeParser } from "./resumeParserEnhanced";
import type { Job } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || '',
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "https://hr-recruit-system.vercel.app",
    "X-Title": "AI Recruit System",
  },
});

// 使用最强的 GPT-5 进行深度分析
const ANALYSIS_MODEL = process.env.TARGETED_ANALYSIS_MODEL || "openai/gpt-5";

export interface JobContext {
  title: string;
  description: string;
  requirements: string[];
  focusAreas?: string[];  // 招聘经理的重点关注领域
  teamContext?: string;    // 团队背景
  companyValues?: string[]; // 公司价值观
}

export interface TargetedAnalysis {
  // 基础信息
  basicInfo: {
    name: string;
    contact: {
      email?: string;
      phone?: string;
      location?: string;
    };
    summary: string;
  };

  // 岗位匹配度分析
  jobFitAnalysis: {
    overallScore: number; // 0-100
    matchedRequirements: Array<{
      requirement: string;
      evidence: string;
      confidence: "high" | "medium" | "low";
    }>;
    missingRequirements: Array<{
      requirement: string;
      severity: "critical" | "important" | "nice-to-have";
    }>;
    additionalStrengths: string[]; // 超出要求的优势
  };

  // 经验深度分析
  experienceAnalysis: {
    relevantExperience: Array<{
      company: string;
      position: string;
      duration: string;
      relevanceScore: number; // 相关度
      keyAchievements: string[];
      transferableSkills: string[];
    }>;
    totalRelevantYears: number;
    industryExperience: string[];
    managementExperience?: {
      teamSize: number;
      scope: string;
    };
  };

  // 技能深度评估
  skillsAssessment: {
    technicalSkills: Array<{
      skill: string;
      proficiency: "expert" | "advanced" | "intermediate" | "beginner";
      yearsOfExperience: number;
      evidenceProjects: string[];
      relevanceToJob: "critical" | "important" | "nice-to-have";
    }>;
    softSkills: Array<{
      skill: string;
      evidence: string[];
      importance: "high" | "medium" | "low";
    }>;
    skillGaps: string[]; // 需要培训的技能
  };

  // 项目和成就挖掘
  projectsAndAchievements: {
    relevantProjects: Array<{
      name: string;
      description: string;
      role: string;
      technologies: string[];
      impact: string;
      relevanceScore: number;
    }>;
    quantifiedAchievements: string[]; // 带数据的成就
    awards: string[];
  };

  // 文化匹配度
  culturalFit: {
    alignedValues: string[];
    workStyle: string;
    teamFitIndicators: string[];
    potentialConcerns?: string[];
  };

  // 成长潜力评估
  growthPotential: {
    learningAgility: string; // 基于经历的学习能力评估
    careerProgression: string; // 职业发展轨迹分析
    adaptabilityIndicators: string[];
    leadershipPotential?: string;
  };

  // 风险和关注点
  risksAndConcerns: {
    redFlags: Array<{
      concern: string;
      severity: "high" | "medium" | "low";
      context: string;
    }>;
    verificationNeeded: string[]; // 需要在面试中验证的点
    overqualificationRisk?: string;
    flightRisk?: string; // 离职风险
  };

  // 面试建议
  interviewRecommendations: {
    focusAreas: string[]; // 重点考察领域
    suggestedQuestions: Array<{
      category: string;
      question: string;
      purpose: string;
    }>;
    behavioralScenarios: string[]; // 建议的情景题
    technicalChallenges: string[]; // 建议的技术考察点
  };

  // 薪资预期分析
  compensationAnalysis: {
    expectedRange?: {
      min: number;
      max: number;
    };
    marketPosition: "below" | "at" | "above";
    negotiationLeverage: string[];
  };

  // 关键洞察
  keyInsights: {
    uniqueSellingPoints: string[]; // 候选人独特优势
    hiddenGems: string[]; // 容易被忽视的亮点
    quickWins: string[]; // 可以快速产生价值的领域
    longTermValue: string[]; // 长期价值贡献
  };
}

export class TargetedResumeAnalyzer {
  /**
   * 根据岗位需求进行针对性的简历分析
   */
  async analyzeForPosition(
    fileBuffer: Buffer,
    mimeType: string,
    jobContext: JobContext
  ): Promise<TargetedAnalysis> {
    // 先获取简历的基础解析
    const resumeData = await enhancedResumeParser.parse(fileBuffer, mimeType, true);

    // 构建针对性的分析提示词
    const analysisPrompt = this.buildTargetedPrompt(jobContext);

    // 使用 GPT-5 进行深度分析
    const response = await openai.chat.completions.create({
      model: ANALYSIS_MODEL,
      messages: [
        {
          role: "system",
          content: analysisPrompt
        },
        {
          role: "user",
          content: `
请对以下简历进行深度分析：

=== 岗位信息 ===
职位：${jobContext.title}
描述：${jobContext.description}
要求：${jobContext.requirements.join(", ")}
${jobContext.focusAreas ? `重点关注：${jobContext.focusAreas.join(", ")}` : ''}

=== 简历内容 ===
${JSON.stringify(resumeData.analysis, null, 2)}

请提供全面的针对性分析，特别关注：
1. 与岗位要求的精确匹配度
2. 潜在的价值和未被明确提及的优势
3. 可能的风险点和需要验证的内容
4. 为面试官提供有价值的洞察和建议
`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 8000
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from AI analysis");
    }

    return JSON.parse(content) as TargetedAnalysis;
  }

  /**
   * 构建智能分析的提示词
   */
  private buildTargetedPrompt(jobContext: JobContext): string {
    return `你是一位经验丰富的资深招聘专家和人才评估顾问，拥有20年的招聘经验，擅长深度人才分析。

你的任务是根据特定岗位需求，对候选人简历进行全方位的深度分析。

分析原则：
1. **精准匹配**：准确评估候选人与岗位要求的匹配程度
2. **深度挖掘**：发现简历中隐含的价值点和潜力
3. **风险识别**：识别潜在风险和需要验证的信息
4. **实用建议**：为面试官提供实用的面试策略和问题

分析维度：

一、岗位匹配度分析
- 逐条对比岗位要求，找出匹配证据
- 识别缺失的关键能力
- 发现超出预期的附加价值

二、经验深度评估
- 相关工作经验的质量和深度
- 行业背景的匹配度
- 职业发展轨迹的合理性
- 管理经验和团队规模

三、技能立体评估
- 技术技能的实际掌握程度（通过项目验证）
- 软技能的证据支撑
- 学习能力和适应能力
- 技能的时效性和先进性

四、项目成就挖掘
- 量化的业绩成果
- 项目的复杂度和影响力
- 在项目中的实际角色和贡献
- 可迁移到新岗位的经验

五、文化契合度
- 价值观的一致性
- 工作风格和团队协作
- 稳定性和忠诚度指标
- 职业动机和发展诉求

六、潜力与风险
- 成长潜力和发展空间
- 可能的离职风险因素
- 过度资历或资历不足
- 需要深入验证的疑点

七、面试策略建议
- 重点考察领域
- STAR 行为面试问题
- 技术能力验证方案
- 压力测试和情景模拟

八、关键洞察
- 候选人的独特竞争优势
- 容易被忽视的亮点
- 快速创造价值的领域
- 长期价值贡献潜力

${jobContext.focusAreas ? `
特别关注领域：
${jobContext.focusAreas.map(area => `- ${area}`).join('\n')}
` : ''}

${jobContext.companyValues ? `
公司价值观匹配：
${jobContext.companyValues.map(value => `- ${value}`).join('\n')}
` : ''}

输出格式：
返回详细的 JSON 格式分析结果，包含所有上述维度的深度分析。确保每个分析点都有具体的证据支撑，避免空泛的评价。

重要提示：
- 保持客观和专业，既要发现亮点，也要识别风险
- 所有评估都要基于简历中的具体信息，不要过度推测
- 为面试官提供可操作的建议，而不仅仅是描述
- 用中文输出，但保留原始的英文术语和名称`;
  }

  /**
   * 生成面试官参考报告
   */
  generateInterviewerBrief(analysis: TargetedAnalysis): string {
    return `
# 候选人面试简报

## 👤 基本信息
- **姓名**: ${analysis.basicInfo.name}
- **联系方式**: ${analysis.basicInfo.contact.email || '未提供'}
- **总体匹配度**: ${analysis.jobFitAnalysis.overallScore}/100

## 🎯 核心优势
${analysis.keyInsights.uniqueSellingPoints.map(point => `- ${point}`).join('\n')}

## ⚠️ 重点关注
${analysis.risksAndConcerns.redFlags.map(flag => `- ${flag.concern} (${flag.severity})`).join('\n')}

## 💡 面试重点
${analysis.interviewRecommendations.focusAreas.map(area => `- ${area}`).join('\n')}

## ❓ 建议问题
${analysis.interviewRecommendations.suggestedQuestions.slice(0, 5).map(q =>
  `**${q.category}**: ${q.question}`
).join('\n\n')}

## 📊 快速参考
- **相关经验**: ${analysis.experienceAnalysis.totalRelevantYears} 年
- **技能匹配**: ${analysis.jobFitAnalysis.matchedRequirements.length}/${analysis.jobFitAnalysis.matchedRequirements.length + analysis.jobFitAnalysis.missingRequirements.length} 项
- **成长潜力**: ${analysis.growthPotential.learningAgility}
- **文化契合**: ${analysis.culturalFit.alignedValues.join(', ')}
`;
  }

  /**
   * 批量分析多份简历并排序
   */
  async rankCandidates(
    resumes: Array<{ fileBuffer: Buffer; mimeType: string; candidateId: string }>,
    jobContext: JobContext
  ): Promise<Array<{ candidateId: string; score: number; analysis: TargetedAnalysis }>> {
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

    // 按匹配度排序
    return analyses.sort((a, b) => b.score - a.score);
  }
}

export const targetedResumeAnalyzer = new TargetedResumeAnalyzer();