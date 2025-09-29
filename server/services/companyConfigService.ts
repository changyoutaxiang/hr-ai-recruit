import { z } from "zod";
import { storage } from "../storage";

/**
 * 公司配置服务 - 管理公司文化价值观和领导力框架配置
 */

// 文化价值观配置
export interface CultureValue {
  name: string;
  description: string;
  behaviorIndicators: string[];  // 行为指标
  assessmentQuestions: string[];  // 评估问题
  weight: number;  // 权重（0-1）
}

// 领导力维度配置
export interface LeadershipDimension {
  name: string;
  description: string;
  levels: {
    individualContributor: string[];  // 个人贡献者级别的表现
    emergingLeader: string[];         // 新兴领导者的表现
    developingLeader: string[];       // 发展中领导者的表现
    matureLeader: string[];           // 成熟领导者的表现
  };
  assessmentCriteria: string[];  // 评估标准
  weight: number;  // 权重（0-1）
}

// 公司配置
export interface CompanyConfig {
  id?: string;
  companyName: string;
  // 文化配置
  cultureConfig: {
    values: CultureValue[];
    assessmentGuidelines: string;  // 评估指南
    fitThreshold: number;  // 匹配阈值（0-100）
  };
  // 领导力配置
  leadershipConfig: {
    dimensions: LeadershipDimension[];
    assessmentGuidelines: string;  // 评估指南
    promotionCriteria: {
      toEmergingLeader: number;     // 晋升到新兴领导者的分数
      toDevelopingLeader: number;   // 晋升到发展中领导者的分数
      toMatureLeader: number;        // 晋升到成熟领导者的分数
    };
  };
  // 面试配置
  interviewConfig: {
    stageWeights: {
      resume: number;       // 简历阶段权重
      interview_1: number;  // 第一轮面试权重
      interview_2: number;  // 第二轮面试权重
      final: number;        // 最终评估权重
    };
    confidenceAdjustment: {
      resume: number;       // 简历阶段的置信度调整系数
      interview_1: number;  // 第一轮面试的置信度调整系数
      interview_2: number;  // 第二轮面试的置信度调整系数
      final: number;        // 最终评估的置信度调整系数
    };
  };
  updatedAt?: Date;
  createdAt?: Date;
}

// 默认配置
const DEFAULT_CONFIG: CompanyConfig = {
  companyName: "Default Company",
  cultureConfig: {
    values: [
      {
        name: "创新驱动",
        description: "拥抱变化，勇于创新，持续探索新的可能性",
        behaviorIndicators: [
          "主动提出新想法和改进建议",
          "乐于尝试新方法和新技术",
          "能够跳出传统思维框架",
          "从失败中学习并快速迭代"
        ],
        assessmentQuestions: [
          "请描述一个您提出创新解决方案的例子",
          "您如何看待失败？能否分享一次失败的经历？",
          "在工作中，您是如何保持学习和创新的？"
        ],
        weight: 0.25
      },
      {
        name: "客户至上",
        description: "以客户为中心，超越客户期望，创造卓越价值",
        behaviorIndicators: [
          "深入理解客户需求",
          "主动寻求客户反馈",
          "为客户创造超预期的价值",
          "快速响应客户问题"
        ],
        assessmentQuestions: [
          "请分享一个您超越客户期望的经历",
          "当客户需求与公司利益冲突时，您如何处理？",
          "您如何理解'客户成功'？"
        ],
        weight: 0.25
      },
      {
        name: "团队协作",
        description: "开放协作，互相成就，共同成长",
        behaviorIndicators: [
          "积极分享知识和经验",
          "主动帮助团队成员",
          "善于跨部门协作",
          "能够处理团队冲突"
        ],
        assessmentQuestions: [
          "请描述一次成功的团队协作经历",
          "当团队意见不一致时，您如何处理？",
          "您如何帮助团队成员成长？"
        ],
        weight: 0.25
      },
      {
        name: "结果导向",
        description: "目标明确，执行有力，追求卓越结果",
        behaviorIndicators: [
          "设定清晰可衡量的目标",
          "制定详细的执行计划",
          "持续跟踪和优化结果",
          "对结果负责"
        ],
        assessmentQuestions: [
          "请分享一个您成功达成挑战性目标的例子",
          "当资源有限时，您如何确保达成目标？",
          "您如何平衡速度和质量？"
        ],
        weight: 0.25
      }
    ],
    assessmentGuidelines: "评估候选人与公司文化价值观的契合度，重点关注行为证据和价值观认同",
    fitThreshold: 70
  },
  leadershipConfig: {
    dimensions: [
      {
        name: "战略思维",
        description: "能够看到大局，制定长期战略，并将其转化为可执行的计划",
        levels: {
          individualContributor: [
            "理解团队目标和优先级",
            "能将日常工作与团队目标关联"
          ],
          emergingLeader: [
            "能制定小团队的工作计划",
            "开始思考跨职能影响"
          ],
          developingLeader: [
            "制定部门级战略",
            "能够平衡短期和长期目标"
          ],
          matureLeader: [
            "制定组织级战略",
            "预见行业趋势并制定应对策略"
          ]
        },
        assessmentCriteria: [
          "战略规划能力",
          "系统思考能力",
          "前瞻性和洞察力"
        ],
        weight: 0.25
      },
      {
        name: "团队领导",
        description: "激发团队潜能，培养人才，建设高效团队",
        levels: {
          individualContributor: [
            "有效协作和沟通",
            "主动帮助同事"
          ],
          emergingLeader: [
            "能够指导1-2名团队成员",
            "组织小型项目团队"
          ],
          developingLeader: [
            "管理5-10人团队",
            "制定团队发展计划"
          ],
          matureLeader: [
            "领导多个团队或大型团队",
            "建立人才梯队和继任计划"
          ]
        },
        assessmentCriteria: [
          "团队建设能力",
          "人才培养能力",
          "激励和授权能力"
        ],
        weight: 0.25
      },
      {
        name: "执行力",
        description: "将战略转化为结果，克服障碍，持续交付价值",
        levels: {
          individualContributor: [
            "高质量完成个人任务",
            "按时交付承诺"
          ],
          emergingLeader: [
            "协调资源完成项目",
            "处理执行中的问题"
          ],
          developingLeader: [
            "管理复杂项目和多个优先级",
            "建立执行监控机制"
          ],
          matureLeader: [
            "推动组织级变革",
            "建立执行文化"
          ]
        },
        assessmentCriteria: [
          "计划和组织能力",
          "问题解决能力",
          "结果交付能力"
        ],
        weight: 0.25
      },
      {
        name: "影响力",
        description: "建立信任，影响他人，推动组织变革",
        levels: {
          individualContributor: [
            "清晰表达观点",
            "在团队中有一定影响力"
          ],
          emergingLeader: [
            "能说服他人接受建议",
            "开始建立跨部门关系"
          ],
          developingLeader: [
            "影响部门级决策",
            "建立广泛的内部网络"
          ],
          matureLeader: [
            "影响组织战略方向",
            "在行业内有影响力"
          ]
        },
        assessmentCriteria: [
          "沟通和表达能力",
          "关系建立能力",
          "变革推动能力"
        ],
        weight: 0.25
      }
    ],
    assessmentGuidelines: "评估候选人的领导力潜力和当前水平，关注实际表现和发展潜力",
    promotionCriteria: {
      toEmergingLeader: 60,
      toDevelopingLeader: 75,
      toMatureLeader: 90
    }
  },
  interviewConfig: {
    stageWeights: {
      resume: 0.2,
      interview_1: 0.3,
      interview_2: 0.3,
      final: 0.2
    },
    confidenceAdjustment: {
      resume: 0.6,
      interview_1: 0.8,
      interview_2: 0.9,
      final: 1.0
    }
  }
};

// 配置验证Schema
const CompanyConfigSchema = z.object({
  companyName: z.string().min(1),
  cultureConfig: z.object({
    values: z.array(z.object({
      name: z.string().min(1),
      description: z.string().min(1),
      behaviorIndicators: z.array(z.string()),
      assessmentQuestions: z.array(z.string()),
      weight: z.number().min(0).max(1)
    })).min(1),
    assessmentGuidelines: z.string(),
    fitThreshold: z.number().min(0).max(100)
  }),
  leadershipConfig: z.object({
    dimensions: z.array(z.object({
      name: z.string().min(1),
      description: z.string().min(1),
      levels: z.object({
        individualContributor: z.array(z.string()),
        emergingLeader: z.array(z.string()),
        developingLeader: z.array(z.string()),
        matureLeader: z.array(z.string())
      }),
      assessmentCriteria: z.array(z.string()),
      weight: z.number().min(0).max(1)
    })).min(1),
    assessmentGuidelines: z.string(),
    promotionCriteria: z.object({
      toEmergingLeader: z.number().min(0).max(100),
      toDevelopingLeader: z.number().min(0).max(100),
      toMatureLeader: z.number().min(0).max(100)
    })
  }),
  interviewConfig: z.object({
    stageWeights: z.object({
      resume: z.number().min(0).max(1),
      interview_1: z.number().min(0).max(1),
      interview_2: z.number().min(0).max(1),
      final: z.number().min(0).max(1)
    }),
    confidenceAdjustment: z.object({
      resume: z.number().min(0).max(1),
      interview_1: z.number().min(0).max(1),
      interview_2: z.number().min(0).max(1),
      final: z.number().min(0).max(1)
    })
  })
});

export class CompanyConfigService {
  private currentConfig: CompanyConfig | null = null;
  private configCache: Map<string, CompanyConfig> = new Map();

  /**
   * 获取当前公司配置
   */
  async getCurrentConfig(): Promise<CompanyConfig> {
    if (this.currentConfig) {
      return this.currentConfig;
    }

    // TODO: 从数据库加载配置
    // const config = await storage.getCompanyConfig();

    // 暂时返回默认配置
    this.currentConfig = DEFAULT_CONFIG;
    return this.currentConfig;
  }

  /**
   * 更新公司配置
   */
  async updateConfig(config: Partial<CompanyConfig>): Promise<CompanyConfig> {
    const currentConfig = await this.getCurrentConfig();
    const updatedConfig = {
      ...currentConfig,
      ...config,
      updatedAt: new Date()
    };

    // 验证配置
    const validation = CompanyConfigSchema.safeParse(updatedConfig);
    if (!validation.success) {
      throw new Error(`配置验证失败: ${validation.error.message}`);
    }

    // TODO: 保存到数据库
    // await storage.updateCompanyConfig(updatedConfig);

    this.currentConfig = updatedConfig;
    return updatedConfig;
  }

  /**
   * 获取文化价值观配置
   */
  async getCultureValues(): Promise<CultureValue[]> {
    const config = await this.getCurrentConfig();
    return config.cultureConfig.values;
  }

  /**
   * 获取领导力维度配置
   */
  async getLeadershipDimensions(): Promise<LeadershipDimension[]> {
    const config = await this.getCurrentConfig();
    return config.leadershipConfig.dimensions;
  }

  /**
   * 获取面试阶段权重
   */
  async getStageWeights(): Promise<Record<string, number>> {
    const config = await this.getCurrentConfig();
    return config.interviewConfig.stageWeights;
  }

  /**
   * 获取置信度调整系数
   */
  async getConfidenceAdjustment(): Promise<Record<string, number>> {
    const config = await this.getCurrentConfig();
    return config.interviewConfig.confidenceAdjustment;
  }

  /**
   * 验证权重总和
   */
  validateWeights(weights: number[]): boolean {
    const sum = weights.reduce((acc, w) => acc + w, 0);
    return Math.abs(sum - 1.0) < 0.01; // 允许小误差
  }

  /**
   * 导出配置为JSON
   */
  async exportConfig(): Promise<string> {
    const config = await this.getCurrentConfig();
    return JSON.stringify(config, null, 2);
  }

  /**
   * 从JSON导入配置
   */
  async importConfig(jsonString: string): Promise<CompanyConfig> {
    try {
      const config = JSON.parse(jsonString);
      return await this.updateConfig(config);
    } catch (error) {
      throw new Error(`配置导入失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 重置为默认配置
   */
  async resetToDefault(): Promise<CompanyConfig> {
    return await this.updateConfig(DEFAULT_CONFIG);
  }

  /**
   * 生成面试问题建议
   */
  async generateInterviewQuestions(
    stage: "interview_1" | "interview_2" | "final_evaluation"
  ): Promise<{ culture: string[], leadership: string[] }> {
    const config = await this.getCurrentConfig();

    const cultureQuestions: string[] = [];
    const leadershipQuestions: string[] = [];

    // 根据面试阶段选择不同深度的问题
    if (stage === "interview_1") {
      // 第一轮：基础文化契合度问题
      config.cultureConfig.values.slice(0, 2).forEach(value => {
        cultureQuestions.push(...value.assessmentQuestions.slice(0, 1));
      });

      // 基础领导力潜力问题
      config.leadershipConfig.dimensions.slice(0, 2).forEach(dim => {
        leadershipQuestions.push(
          `请描述您在${dim.name}方面的经验或理解`
        );
      });
    } else if (stage === "interview_2") {
      // 第二轮：深入文化和领导力评估
      config.cultureConfig.values.forEach(value => {
        cultureQuestions.push(...value.assessmentQuestions.slice(1, 2));
      });

      config.leadershipConfig.dimensions.forEach(dim => {
        leadershipQuestions.push(
          `在${dim.name}方面，您认为自己处于什么水平？请举例说明`
        );
      });
    } else {
      // 最终评估：综合性问题
      cultureQuestions.push(
        "您如何理解我们的企业文化？",
        "您认为自己与我们的价值观有哪些契合点？",
        "如果价值观与工作目标冲突，您如何处理？"
      );

      leadershipQuestions.push(
        "您的领导风格是什么？",
        "您如何定义职业成功？",
        "未来3-5年，您希望在领导力方面达到什么水平？"
      );
    }

    return {
      culture: cultureQuestions,
      leadership: leadershipQuestions
    };
  }
}

export const companyConfigService = new CompanyConfigService();