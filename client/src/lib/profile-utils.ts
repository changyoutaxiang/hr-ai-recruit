/**
 * 候选人画像相关的工具函数
 */

import { profileDataSchema } from "@shared/schema";
import type { CandidateProfile } from "@shared/schema";

/**
 * 获取阶段标签的中文名称
 */
export const getStageLabel = (stage: string): string => {
  const stageMap: Record<string, string> = {
    resume: "简历阶段",
    interview_1: "初试后",
    interview_2: "复试后",
    final_evaluation: "终面后",
    after_interview_1: "第 1 轮面试后",
    after_interview_2: "第 2 轮面试后",
    after_interview_3: "第 3 轮面试后",
  };

  if (stageMap[stage]) return stageMap[stage];

  // 处理动态的面试轮次
  if (stage.startsWith("after_interview_")) {
    const round = stage.split("_")[2];
    return `第 ${round} 轮面试后`;
  }

  return stage;
};

/**
 * 根据分数获取颜色类名
 */
export const getScoreColor = (score: number): string => {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-blue-600";
  if (score >= 40) return "text-yellow-600";
  return "text-red-600";
};

/**
 * 根据分数获取背景颜色类名
 */
export const getScoreBgColor = (score: number): string => {
  if (score >= 80) return "bg-green-100 text-green-800 border-green-200";
  if (score >= 60) return "bg-blue-100 text-blue-800 border-blue-200";
  if (score >= 40) return "bg-yellow-100 text-yellow-800 border-yellow-200";
  return "bg-red-100 text-red-800 border-red-200";
};

/**
 * 根据分数获取评级标签
 */
export const getScoreLabel = (score: number): string => {
  if (score >= 80) return "优秀";
  if (score >= 60) return "良好";
  if (score >= 40) return "一般";
  return "较差";
};

/**
 * 格式化日期
 */
export const formatDate = (date?: string | Date): string => {
  if (!date) return "";
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return "日期无效";

  try {
    return parsed.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return parsed.toISOString().split('T')[0];
  }
};

/**
 * 格式化简短日期
 */
export const formatShortDate = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
};

/**
 * 批量解析候选人画像数据，带缓存
 */
export class ProfileDataParser {
  private cache = new Map<string, ReturnType<typeof profileDataSchema.safeParse>>();

  /**
   * 解析单个画像数据
   */
  parse(profile: CandidateProfile) {
    if (!this.cache.has(profile.id)) {
      this.cache.set(profile.id, profileDataSchema.safeParse(profile.profileData));
    }
    return this.cache.get(profile.id)!;
  }

  /**
   * 批量解析画像数据
   */
  parseMany(profiles: CandidateProfile[]) {
    return profiles.map(p => ({
      profile: p,
      parsed: this.parse(p)
    }));
  }

  /**
   * 清除缓存
   */
  clear() {
    this.cache.clear();
  }
}

/**
 * 图表配置常量
 */
export const CHART_CONFIG = {
  colors: {
    culture: '#3b82f6',
    leadership: '#8b5cf6',
    overall: '#10b981',
    culture_gradient: {
      start: '#3b82f6',
      startOpacity: 0.8,
      end: '#3b82f6',
      endOpacity: 0.1
    },
    leadership_gradient: {
      start: '#8b5cf6',
      startOpacity: 0.8,
      end: '#8b5cf6',
      endOpacity: 0.1
    }
  },
  sizes: {
    radar: {
      default: 300,
      small: 250,
      large: 400
    },
    bar: {
      default: 250,
      small: 200,
      large: 350
    },
    trend: {
      default: 400,
      small: 300,
      large: 500
    }
  },
  animation: {
    duration: 500,
    easing: 'ease-in-out'
  }
} as const;

/**
 * 熟练度颜色映射
 */
export const PROFICIENCY_COLORS = {
  expert: "bg-purple-500/10 text-purple-700 border-purple-500/20",
  advanced: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  intermediate: "bg-green-500/10 text-green-700 border-green-500/20",
  beginner: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
} as const;

/**
 * 置信度颜色映射
 */
export const CONFIDENCE_COLORS = {
  high: "text-green-600",
  medium: "text-blue-600",
  low: "text-yellow-600"
} as const;