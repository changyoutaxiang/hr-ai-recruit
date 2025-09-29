import OpenAI from "openai";
import { storage } from "../storage";
import type { CandidateProfile } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || '',
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "https://hr-recruit-system.vercel.app",
    "X-Title": "AI Recruit System",
  },
});

const ASSESSMENT_MODEL = process.env.CULTURAL_ASSESSMENT_MODEL || "openai/gpt-5";

/**
 * 公司文化价值观定义
 */
export interface CultureValue {
  name: string;                    // 价值观名称，如"创新"、"诚信"
  description: string;              // 详细描述
  behaviors: string[];              // 体现这个价值观的具体行为
  antiPatterns: string[];           // 违背这个价值观的行为
  interviewQuestions: string[];     // 评估这个价值观的面试问题
  weight: number;                   // 在整体评估中的权重 0-1
}

/**
 * 领导力框架定义
 */
export interface LeadershipDimension {
  name: string;                    // 维度名称，如"战略思维"、"团队建设"
  level: "individual" | "team" | "organizational"; // 适用层级
  description: string;              // 详细描述
  competencies: Array<{             // 具体能力项
    name: string;
    description: string;
    behavioralIndicators: string[]; // 行为指标
  }>;
  assessmentCriteria: string[];    // 评估标准
  developmentSuggestions: string[]; // 发展建议
  weight: number;                   // 权重
}

/**
 * 文化契合度评估结果
 */
export interface CultureFitAssessment {
  overallScore: number;            // 总体契合度 0-100
  confidence: "low" | "medium" | "high"; // 评估置信度
  stage: string;                    // 评估阶段（resume/interview_1/interview_2/final）

  valueAssessments: Array<{
    valueName: string;
    score: number;                 // 0-100
    evidence: string[];             // 支撑证据
    concerns: string[];             // 潜在顾虑
    confidence: "low" | "medium" | "high";
  }>;

  strengths: string[];              // 文化契合优势
  gaps: string[];                   // 文化契合差距
  risks: string[];                  // 文化风险

  observationPoints: string[];      // 后续观察要点
  interviewFocus: string[];         // 面试重点考察

  trajectory: "improving" | "stable" | "declining" | "uncertain"; // 趋势

  narrative: string;                // AI 生成的叙述性总结
}

/**
 * 领导力潜力评估结果
 */
export interface LeadershipAssessment {
  overallScore: number;             // 总体得分 0-100
  currentLevel: "contributor" | "emerging" | "developing" | "mature" | "strategic";
  potentialLevel: "contributor" | "emerging" | "developing" | "mature" | "strategic";
  confidence: "low" | "medium" | "high";
  stage: string;

  dimensionScores: Array<{
    dimension: string;
    score: number;
    evidence: string[];
    gaps: string[];
    developmentPotential: "low" | "medium" | "high";
  }>;

  strengths: Array<{
    competency: string;
    evidence: string[];
    impact: string;
  }>;

  developmentAreas: Array<{
    competency: string;
    currentState: string;
    targetState: string;
    developmentPath: string[];
  }>;

  leadershipStyle: string;          // 领导风格描述
  readinessForNextLevel: number;    // 晋升准备度 0-100

  successPredictors: string[];      // 成功预测因子
  derailers: string[];               // 潜在脱轨因素

  coachingRecommendations: string[]; // 辅导建议

  trajectory: "high-potential" | "steady" | "developing" | "at-risk";

  narrative: string;                // AI 生成的叙述性总结
}

/**
 * 组织契合度服务
 */
export class OrganizationalFitService {
  private cultureValues: CultureValue[] = [];
  private leadershipFramework: LeadershipDimension[] = [];

  constructor() {
    // 初始化时加载配置
    this.loadConfiguration();
  }

  /**
   * 加载公司文化和领导力框架配置
   */
  private async loadConfiguration() {
    // 这里可以从数据库或配置文件加载
    // 示例配置（实际应从数据库读取）

    this.cultureValues = [
      {
        name: "创新驱动",
        description: "勇于尝试新方法，持续改进和创造价值",
        behaviors: [
          "主动提出改进建议",
          "愿意尝试新技术和方法",
          "从失败中学习",
          "挑战现状"
        ],
        antiPatterns: [
          "墨守成规",
          "抵制变化",
          "不愿承担风险"
        ],
        interviewQuestions: [
          "请分享一个您推动创新或改变的例子",
          "您如何看待失败？能分享一个失败经历吗？"
        ],
        weight: 0.25
      },
      {
        name: "客户至上",
        description: "以客户需求为中心，提供卓越服务",
        behaviors: [
          "深入理解客户需求",
          "主动解决客户问题",
          "持续改善客户体验"
        ],
        antiPatterns: [
          "忽视客户反馈",
          "推卸责任",
          "只关注短期利益"
        ],
        interviewQuestions: [
          "请描述一次您超越客户期望的经历",
          "如何平衡客户需求和公司利益？"
        ],
        weight: 0.25
      },
      {
        name: "团队协作",
        description: "开放沟通，相互支持，共同成长",
        behaviors: [
          "积极分享知识",
          "主动帮助同事",
          "建设性地提出反馈",
          "尊重不同意见"
        ],
        antiPatterns: [
          "信息孤岛",
          "推诿责任",
          "恶性竞争"
        ],
        interviewQuestions: [
          "请分享一个团队合作的成功案例",
          "如何处理团队中的冲突？"
        ],
        weight: 0.25
      },
      {
        name: "结果导向",
        description: "设定高标准，专注执行，交付成果",
        behaviors: [
          "设定明确目标",
          "持续跟踪进度",
          "对结果负责",
          "追求卓越"
        ],
        antiPatterns: [
          "缺乏责任心",
          "过程导向而忽视结果",
          "满足于平庸"
        ],
        interviewQuestions: [
          "如何确保项目按时交付？",
          "请分享一个您克服困难达成目标的经历"
        ],
        weight: 0.25
      }
    ];

    this.leadershipFramework = [
      {
        name: "战略思维",
        level: "organizational",
        description: "能够看到全局，制定长远规划",
        competencies: [
          {
            name: "愿景规划",
            description: "制定清晰的愿景和战略",
            behavioralIndicators: [
              "能够描绘未来图景",
              "将愿景转化为行动计划",
              "激发他人认同和追随"
            ]
          },
          {
            name: "系统思考",
            description: "理解复杂系统的相互关系",
            behavioralIndicators: [
              "识别问题根因",
              "预见决策的连锁反应",
              "平衡短期和长期利益"
            ]
          }
        ],
        assessmentCriteria: [
          "能否提出战略性见解",
          "是否考虑多方利益相关者",
          "决策的前瞻性"
        ],
        developmentSuggestions: [
          "参与战略规划项目",
          "学习行业趋势分析",
          "培养全局观"
        ],
        weight: 0.2
      },
      {
        name: "团队领导",
        level: "team",
        description: "建设和领导高效团队",
        competencies: [
          {
            name: "团队建设",
            description: "打造高绩效团队",
            behavioralIndicators: [
              "识别和培养人才",
              "建立团队文化",
              "促进团队协作"
            ]
          },
          {
            name: "辅导发展",
            description: "帮助团队成员成长",
            behavioralIndicators: [
              "提供建设性反馈",
              "制定发展计划",
              "授权和赋能"
            ]
          }
        ],
        assessmentCriteria: [
          "团队绩效表现",
          "团队成员发展",
          "团队氛围和凝聚力"
        ],
        developmentSuggestions: [
          "学习教练技术",
          "参加领导力培训",
          "实践团队管理"
        ],
        weight: 0.3
      },
      {
        name: "执行力",
        level: "individual",
        description: "推动计划落地，达成目标",
        competencies: [
          {
            name: "目标管理",
            description: "设定和达成目标",
            behavioralIndicators: [
              "制定SMART目标",
              "有效分解任务",
              "持续跟踪进度"
            ]
          },
          {
            name: "问题解决",
            description: "识别和解决问题",
            behavioralIndicators: [
              "快速定位问题",
              "提出解决方案",
              "推动方案实施"
            ]
          }
        ],
        assessmentCriteria: [
          "目标达成率",
          "执行效率",
          "问题解决能力"
        ],
        developmentSuggestions: [
          "学习项目管理",
          "提升时间管理能力",
          "培养决策能力"
        ],
        weight: 0.3
      },
      {
        name: "影响力",
        level: "individual",
        description: "影响和说服他人",
        competencies: [
          {
            name: "沟通能力",
            description: "清晰有效的沟通",
            behavioralIndicators: [
              "表达清晰有力",
              "善于倾听",
              "适应不同受众"
            ]
          },
          {
            name: "关系建设",
            description: "建立信任关系",
            behavioralIndicators: [
              "建立广泛人脉",
              "维护良好关系",
              "跨部门协作"
            ]
          }
        ],
        assessmentCriteria: [
          "影响范围",
          "说服能力",
          "关系网络"
        ],
        developmentSuggestions: [
          "提升演讲技巧",
          "学习谈判技巧",
          "扩展人际网络"
        ],
        weight: 0.2
      }
    ];
  }

  /**
   * 评估文化契合度
   */
  async assessCultureFit(
    candidateData: {
      resumeText?: string;
      interviewTranscripts?: string[];
      profileHistory?: CandidateProfile[];
      behavioralResponses?: Record<string, string>;
    },
    stage: string
  ): Promise<CultureFitAssessment> {
    const prompt = this.buildCultureAssessmentPrompt(candidateData, stage);

    const response = await openai.chat.completions.create({
      model: ASSESSMENT_MODEL,
      messages: [
        {
          role: "system",
          content: prompt
        },
        {
          role: "user",
          content: `请基于以下候选人信息评估其文化契合度：

${candidateData.resumeText ? `简历内容：\n${candidateData.resumeText}\n` : ''}
${candidateData.interviewTranscripts ? `面试记录：\n${candidateData.interviewTranscripts.join('\n')}\n` : ''}
${candidateData.behavioralResponses ? `行为面试回答：\n${JSON.stringify(candidateData.behavioralResponses, null, 2)}` : ''}

评估阶段：${stage}

请提供详细的文化契合度评估，包括每个价值观维度的评分、证据和建议。`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 4000
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from culture assessment");
    }

    return JSON.parse(content) as CultureFitAssessment;
  }

  /**
   * 评估领导力潜力
   */
  async assessLeadership(
    candidateData: {
      resumeText?: string;
      interviewTranscripts?: string[];
      profileHistory?: CandidateProfile[];
      managementExperience?: string;
      achievements?: string[];
    },
    stage: string,
    targetLevel?: string
  ): Promise<LeadershipAssessment> {
    const prompt = this.buildLeadershipAssessmentPrompt(candidateData, stage, targetLevel);

    const response = await openai.chat.completions.create({
      model: ASSESSMENT_MODEL,
      messages: [
        {
          role: "system",
          content: prompt
        },
        {
          role: "user",
          content: `请基于以下候选人信息评估其领导力潜力：

${candidateData.resumeText ? `简历内容：\n${candidateData.resumeText}\n` : ''}
${candidateData.interviewTranscripts ? `面试记录：\n${candidateData.interviewTranscripts.join('\n')}\n` : ''}
${candidateData.managementExperience ? `管理经验：\n${candidateData.managementExperience}\n` : ''}
${candidateData.achievements ? `主要成就：\n${candidateData.achievements.join('\n')}` : ''}

评估阶段：${stage}
${targetLevel ? `目标职级：${targetLevel}` : ''}

请提供详细的领导力评估，包括各维度评分、发展潜力和建议。`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 4000
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from leadership assessment");
    }

    return JSON.parse(content) as LeadershipAssessment;
  }

  /**
   * 构建文化评估提示词
   */
  private buildCultureAssessmentPrompt(candidateData: any, stage: string): string {
    const valueDescriptions = this.cultureValues.map(v =>
      `- ${v.name}: ${v.description}\n  体现行为: ${v.behaviors.join(', ')}\n  反面行为: ${v.antiPatterns.join(', ')}`
    ).join('\n');

    return `你是一位资深的组织文化专家和人才评估顾问，专门评估候选人与公司文化的契合度。

公司文化价值观：
${valueDescriptions}

评估原则：
1. **证据导向**：所有评分必须基于具体的行为证据
2. **发展视角**：既要评估当前状态，也要预测未来潜力
3. **风险识别**：诚实指出可能的文化冲突风险
4. **阶段适应**：根据评估阶段（${stage}）调整评估深度和置信度

评估要求：
1. 对每个价值观维度进行0-100分评分
2. 提供支撑每个评分的具体证据
3. 识别文化契合的优势和差距
4. 提出后续评估或发展建议
5. 评估整体趋势和发展潜力

特别注意：
- 简历阶段：基于有限信息谨慎推断，置信度应偏低
- 面试阶段：结合行为问题回答深入评估
- 后期阶段：综合多轮反馈形成全面判断

输出JSON格式的详细评估结果。`;
  }

  /**
   * 构建领导力评估提示词
   */
  private buildLeadershipAssessmentPrompt(candidateData: any, stage: string, targetLevel?: string): string {
    const dimensionDescriptions = this.leadershipFramework.map(d =>
      `- ${d.name} (${d.level}级): ${d.description}\n  关键能力: ${d.competencies.map(c => c.name).join(', ')}`
    ).join('\n');

    return `你是一位资深的领导力发展专家，专门评估和培养组织领导人才。

领导力框架：
${dimensionDescriptions}

评估任务：
1. 评估候选人当前的领导力水平
2. 预测其领导力发展潜力
3. 识别优势和发展领域
4. 提供发展建议

${targetLevel ? `目标职级要求：${targetLevel}` : ''}

评估原则：
1. **多维评估**：从战略思维、团队领导、执行力、影响力等维度全面评估
2. **潜力识别**：不仅评估当前能力，更要识别发展潜力
3. **行为证据**：基于过往行为和成就进行评估
4. **情境考虑**：考虑候选人的经验背景和成长环境

评估阶段：${stage}
- 早期阶段：重点识别潜力信号
- 中期阶段：深入评估具体能力
- 后期阶段：综合评估和预测

输出要求：
1. 整体领导力得分（0-100）
2. 各维度详细评分和证据
3. 领导力优势和发展领域
4. 发展建议和培养计划
5. 成功预测和风险因素

输出JSON格式的详细评估结果。`;
  }

  /**
   * 生成文化契合度演化报告
   */
  generateCultureEvolutionReport(assessments: CultureFitAssessment[]): string {
    const latest = assessments[assessments.length - 1];
    const trend = this.analyzeTrend(assessments.map(a => a.overallScore));

    return `
# 文化契合度演化报告

## 当前状态
- **整体契合度**: ${latest.overallScore}/100
- **评估置信度**: ${latest.confidence}
- **发展趋势**: ${trend}

## 各价值观维度表现
${latest.valueAssessments.map(v => `
### ${v.valueName}: ${v.score}/100
**证据**:
${v.evidence.map(e => `- ${e}`).join('\n')}
${v.concerns.length > 0 ? `**顾虑**:\n${v.concerns.map(c => `- ${c}`).join('\n')}` : ''}
`).join('\n')}

## 演化轨迹
${assessments.map((a, i) => `- ${a.stage}: ${a.overallScore}分 (${a.confidence}置信度)`).join('\n')}

## 关键洞察
**优势**: ${latest.strengths.join(', ')}
**差距**: ${latest.gaps.join(', ')}
**风险**: ${latest.risks.join(', ')}

## 后续建议
${latest.interviewFocus.map(f => `- ${f}`).join('\n')}
`;
  }

  /**
   * 生成领导力潜力演化报告
   */
  generateLeadershipEvolutionReport(assessments: LeadershipAssessment[]): string {
    const latest = assessments[assessments.length - 1];

    return `
# 领导力潜力演化报告

## 当前评估
- **总体得分**: ${latest.overallScore}/100
- **当前水平**: ${latest.currentLevel}
- **潜力水平**: ${latest.potentialLevel}
- **发展轨迹**: ${latest.trajectory}

## 各维度表现
${latest.dimensionScores.map(d => `
### ${d.dimension}: ${d.score}/100
**证据**: ${d.evidence.join(', ')}
**发展潜力**: ${d.developmentPotential}
`).join('\n')}

## 领导力优势
${latest.strengths.map(s => `- **${s.competency}**: ${s.impact}`).join('\n')}

## 发展建议
${latest.developmentAreas.map(d => `
- **${d.competency}**
  当前: ${d.currentState}
  目标: ${d.targetState}
  路径: ${d.developmentPath.join(' → ')}
`).join('\n')}

## 成功预测因子
${latest.successPredictors.join(', ')}

## 潜在风险
${latest.derailers.join(', ')}
`;
  }

  /**
   * 分析趋势
   */
  private analyzeTrend(scores: number[]): string {
    if (scores.length < 2) return "数据不足";

    const lastScore = scores[scores.length - 1];
    const prevScore = scores[scores.length - 2];
    const change = lastScore - prevScore;

    if (change > 5) return "显著改善 ↑";
    if (change > 0) return "稳步提升 ↗";
    if (change === 0) return "保持稳定 →";
    if (change > -5) return "略有下降 ↘";
    return "明显下降 ↓";
  }

  /**
   * 比较两个候选人的组织契合度
   */
  compareCandidates(
    candidate1: { culture: CultureFitAssessment; leadership: LeadershipAssessment },
    candidate2: { culture: CultureFitAssessment; leadership: LeadershipAssessment }
  ) {
    return {
      cultureComparison: {
        candidate1Score: candidate1.culture.overallScore,
        candidate2Score: candidate2.culture.overallScore,
        winner: candidate1.culture.overallScore > candidate2.culture.overallScore ? "candidate1" : "candidate2",
        keyDifferences: this.identifyKeyDifferences(
          candidate1.culture.valueAssessments,
          candidate2.culture.valueAssessments
        )
      },
      leadershipComparison: {
        candidate1Score: candidate1.leadership.overallScore,
        candidate2Score: candidate2.leadership.overallScore,
        winner: candidate1.leadership.overallScore > candidate2.leadership.overallScore ? "candidate1" : "candidate2",
        dimensionComparison: this.compareDimensions(
          candidate1.leadership.dimensionScores,
          candidate2.leadership.dimensionScores
        )
      },
      recommendation: this.generateComparisonRecommendation(candidate1, candidate2)
    };
  }

  private identifyKeyDifferences(assess1: any[], assess2: any[]): string[] {
    const differences: string[] = [];
    assess1.forEach((a1, i) => {
      const a2 = assess2[i];
      if (Math.abs(a1.score - a2.score) > 15) {
        differences.push(`${a1.valueName}: 候选人1(${a1.score}) vs 候选人2(${a2.score})`);
      }
    });
    return differences;
  }

  private compareDimensions(dims1: any[], dims2: any[]): any[] {
    return dims1.map((d1, i) => {
      const d2 = dims2[i];
      return {
        dimension: d1.dimension,
        candidate1: d1.score,
        candidate2: d2.score,
        difference: d1.score - d2.score
      };
    });
  }

  private generateComparisonRecommendation(c1: any, c2: any): string {
    const cultureDiff = Math.abs(c1.culture.overallScore - c2.culture.overallScore);
    const leadershipDiff = Math.abs(c1.leadership.overallScore - c2.leadership.overallScore);

    if (cultureDiff < 5 && leadershipDiff < 5) {
      return "两位候选人在文化契合度和领导力方面都非常接近，建议基于其他因素（如专业技能、薪资期望）做决定。";
    }

    const cultureWinner = c1.culture.overallScore > c2.culture.overallScore ? "候选人1" : "候选人2";
    const leadershipWinner = c1.leadership.overallScore > c2.leadership.overallScore ? "候选人1" : "候选人2";

    if (cultureWinner === leadershipWinner) {
      return `${cultureWinner}在文化契合度和领导力两方面都更优秀，是更合适的选择。`;
    }

    return `候选人在不同维度各有优势：文化契合度方面${cultureWinner}更优，领导力方面${leadershipWinner}更强。建议根据岗位特点和团队需求权衡决定。`;
  }
}

export const organizationalFitService = new OrganizationalFitService();