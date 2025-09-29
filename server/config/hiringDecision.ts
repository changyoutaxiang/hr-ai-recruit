/**
 * 招聘决策配置
 */

export const HIRING_DECISION_CONFIG = {
  // 默认薪酬配置
  SALARY: {
    DEFAULT_BASE: 50000,
    MULTIPLIER_MAX: 1.5,
  },

  // 成长潜力时间框架
  GROWTH_TIMEFRAME: "12-18 months",

  // 决策权重配置（根据职位类型）
  WEIGHTS: {
    // 技术岗位权重
    TECHNICAL_HEAVY: {
      interview: 0.3,
      overall: 0.2,
      technical: 0.4,
      cultural: 0.1
    },
    // 平衡权重
    BALANCED: {
      interview: 0.4,
      overall: 0.3,
      technical: 0.2,
      cultural: 0.1
    },
    // 文化契合度重要的岗位
    CULTURAL_HEAVY: {
      interview: 0.3,
      overall: 0.2,
      technical: 0.2,
      cultural: 0.3
    }
  },

  // 决策阈值
  DECISION_THRESHOLDS: {
    HIRE: 75,
    NEXT_ROUND: 60,
    HOLD: 50,
    REJECT: 40
  },

  // 风险评估阈值
  RISK_THRESHOLDS: {
    STABILITY_LOW: 30,
    STABILITY_MEDIUM: 50,
    CULTURE_FIT_POOR: 40,
    EXPERIENCE_MIN_YEARS: 2
  },

  // 能力评估阈值
  CAPABILITY_THRESHOLDS: {
    HIGH_PERFORMER: 80,
    SOLID_FOUNDATION: 60,
    DEVELOPING: 40
  },

  // 学习敏捷性阈值
  LEARNING_AGILITY_THRESHOLDS: {
    HIGH_POTENTIAL: 80,
    STEADY_GROWTH: 60,
    MODERATE_GROWTH: 40
  },

  // 技能熟练度分数
  PROFICIENCY_SCORES: {
    expert: 100,
    advanced: 80,
    intermediate: 60,
    beginner: 40
  }
};