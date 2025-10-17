/**
 * AI Token 跟踪服务
 * 负责记录所有AI调用的token使用量、成本计算和预算控制
 */

import { storage } from "../storage";
import type { InsertAiTokenUsage } from "@shared/schema";
import type OpenAI from "openai";

/**
 * 模型定价配置（美元/百万token）
 * 来源: OpenAI官方定价页面
 */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // GPT-4o 系列
  "gpt-4o": { input: 5.00, output: 15.00 },
  "gpt-4o-2024-08-06": { input: 2.50, output: 10.00 },
  "gpt-4o-mini": { input: 0.150, output: 0.600 },

  // GPT-4 Turbo 系列
  "gpt-4-turbo": { input: 10.00, output: 30.00 },
  "gpt-4-turbo-preview": { input: 10.00, output: 30.00 },
  "gpt-4-0125-preview": { input: 10.00, output: 30.00 },

  // GPT-4 系列（旧版）
  "gpt-4": { input: 30.00, output: 60.00 },
  "gpt-4-0613": { input: 30.00, output: 60.00 },

  // GPT-3.5 Turbo 系列
  "gpt-3.5-turbo": { input: 0.50, output: 1.50 },
  "gpt-3.5-turbo-0125": { input: 0.50, output: 1.50 },

  // OpenRouter模型（近似定价）
  "google/gemini-2.0-flash-001": { input: 0.075, output: 0.30 },
  "google/gemini-2.5-flash": { input: 0.075, output: 0.30 },
  "anthropic/claude-3-opus": { input: 15.00, output: 75.00 },
  "anthropic/claude-3-sonnet": { input: 3.00, output: 15.00 },
  "anthropic/claude-3-haiku": { input: 0.25, output: 1.25 },

  // 默认定价（未知模型）
  "default": { input: 1.00, output: 2.00 },
};

/**
 * 预算配置
 */
interface BudgetConfig {
  dailyLimit: number;      // 每日预算上限（美元）
  warningThreshold: number; // 警告阈值（百分比，例如 0.8 表示 80%）
  enabled: boolean;        // 是否启用预算控制
}

const DEFAULT_BUDGET: BudgetConfig = {
  dailyLimit: 50.0,        // 默认每日预算 $50
  warningThreshold: 0.8,   // 80% 时发出警告
  enabled: true,
};

export class AiTokenTrackerService {
  private budgetConfig: BudgetConfig;

  constructor(budgetConfig?: Partial<BudgetConfig>) {
    this.budgetConfig = { ...DEFAULT_BUDGET, ...budgetConfig };
  }

  /**
   * 计算AI调用成本
   */
  calculateCost(
    model: string,
    promptTokens: number,
    completionTokens: number
  ): number {
    const pricing = MODEL_PRICING[model] || MODEL_PRICING["default"];

    const inputCost = (promptTokens / 1_000_000) * pricing.input;
    const outputCost = (completionTokens / 1_000_000) * pricing.output;

    return inputCost + outputCost;
  }

  /**
   * 记录AI调用的token使用
   */
  async trackUsage(params: {
    userId?: string;
    operation: string;
    entityType?: string;
    entityId?: string;
    model: string;
    response: OpenAI.Chat.Completions.ChatCompletion;
    success: boolean;
    errorMessage?: string;
    latencyMs: number;
    retryCount?: number;
    metadata?: any;
  }): Promise<void> {
    try {
      const { response, model, operation, success, errorMessage, latencyMs, retryCount, userId, entityType, entityId, metadata } = params;

      const promptTokens = response.usage?.prompt_tokens || 0;
      const completionTokens = response.usage?.completion_tokens || 0;
      const totalTokens = response.usage?.total_tokens || 0;

      const estimatedCost = this.calculateCost(model, promptTokens, completionTokens);

      const usage: InsertAiTokenUsage = {
        userId: userId || null,
        operation,
        entityType: entityType || null,
        entityId: entityId || null,
        model,
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCost: estimatedCost.toString(),
        success,
        errorMessage: errorMessage || null,
        latencyMs,
        retryCount: retryCount || 0,
        metadata: metadata || null,
      };

      await storage.createAiTokenUsage(usage);

      console.log(`✅ AI Token 跟踪: ${operation} | 模型: ${model} | Tokens: ${totalTokens} | 成本: $${estimatedCost.toFixed(6)}`);
    } catch (error) {
      console.error("❌ 记录AI token使用失败:", error);
      // 不抛出错误，避免影响主流程
    }
  }

  /**
   * 检查预算状态
   */
  async checkBudget(userId?: string): Promise<{
    allowed: boolean;
    currentSpend: number;
    limit: number;
    percentage: number;
    warning: boolean;
  }> {
    if (!this.budgetConfig.enabled) {
      return {
        allowed: true,
        currentSpend: 0,
        limit: this.budgetConfig.dailyLimit,
        percentage: 0,
        warning: false,
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let currentSpend: number;
    if (userId) {
      const usages = await storage.getAiTokenUsageByUser(userId, today, tomorrow);
      currentSpend = usages.reduce((total, u) => {
        const cost = u.estimatedCost ? parseFloat(u.estimatedCost as string) : 0;
        return total + cost;
      }, 0);
    } else {
      currentSpend = await storage.getTotalCostByPeriod(today, tomorrow);
    }

    const percentage = currentSpend / this.budgetConfig.dailyLimit;
    const warning = percentage >= this.budgetConfig.warningThreshold;
    const allowed = percentage < 1.0;

    return {
      allowed,
      currentSpend,
      limit: this.budgetConfig.dailyLimit,
      percentage,
      warning,
    };
  }

  /**
   * 获取成本统计
   */
  async getUsageStats(params: {
    userId?: string;
    operation?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    totalTokens: number;
    totalCost: number;
    avgTokensPerCall: number;
    avgCostPerCall: number;
    modelBreakdown: Record<string, {
      calls: number;
      tokens: number;
      cost: number;
    }>;
  }> {
    let usages;

    if (params.userId) {
      usages = await storage.getAiTokenUsageByUser(
        params.userId,
        params.startDate,
        params.endDate
      );
    } else if (params.operation) {
      usages = await storage.getAiTokenUsageByOperation(params.operation);

      if (params.startDate) {
        usages = usages.filter(u => u.createdAt && u.createdAt >= params.startDate!);
      }
      if (params.endDate) {
        usages = usages.filter(u => u.createdAt && u.createdAt <= params.endDate!);
      }
    } else {
      usages = await storage.getAiTokenUsage(params.startDate, params.endDate);
    }

    const totalCalls = usages.length;
    const successfulCalls = usages.filter(u => u.success).length;
    const failedCalls = totalCalls - successfulCalls;

    const totalTokens = usages.reduce((sum, u) => sum + u.totalTokens, 0);
    const totalCost = usages.reduce((sum, u) => {
      const cost = u.estimatedCost ? parseFloat(u.estimatedCost as string) : 0;
      return sum + cost;
    }, 0);

    const avgTokensPerCall = totalCalls > 0 ? totalTokens / totalCalls : 0;
    const avgCostPerCall = totalCalls > 0 ? totalCost / totalCalls : 0;

    // 按模型分组统计
    const modelBreakdown: Record<string, { calls: number; tokens: number; cost: number }> = {};

    for (const usage of usages) {
      if (!modelBreakdown[usage.model]) {
        modelBreakdown[usage.model] = { calls: 0, tokens: 0, cost: 0 };
      }

      modelBreakdown[usage.model].calls += 1;
      modelBreakdown[usage.model].tokens += usage.totalTokens;
      modelBreakdown[usage.model].cost += usage.estimatedCost
        ? parseFloat(usage.estimatedCost as string)
        : 0;
    }

    return {
      totalCalls,
      successfulCalls,
      failedCalls,
      totalTokens,
      totalCost,
      avgTokensPerCall,
      avgCostPerCall,
      modelBreakdown,
    };
  }

  /**
   * 更新预算配置
   */
  updateBudgetConfig(config: Partial<BudgetConfig>): void {
    this.budgetConfig = { ...this.budgetConfig, ...config };
  }

  /**
   * 获取当前预算配置
   */
  getBudgetConfig(): BudgetConfig {
    return { ...this.budgetConfig };
  }
}

// 导出单例实例
export const aiTokenTracker = new AiTokenTrackerService();
