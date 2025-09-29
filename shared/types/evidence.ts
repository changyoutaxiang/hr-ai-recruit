/**
 * 可追溯论据系统
 * 为每个AI评价提供可信的证据支撑
 */

// 证据来源类型
export enum EvidenceSource {
  RESUME = 'resume',                    // 简历原文
  INTERVIEW_FEEDBACK = 'interview',     // 面试反馈
  BEHAVIORAL_OBSERVATION = 'behavior',  // 行为观察
  TEST_RESULT = 'test',                // 测试结果
  REFERENCE_CHECK = 'reference',        // 背景调查
  WORK_SAMPLE = 'work_sample',         // 工作样本
  AI_ANALYSIS = 'ai_analysis',         // AI分析推理
  PUBLIC_PROFILE = 'public',           // 公开资料（LinkedIn等）
  CERTIFICATION = 'certification',      // 证书认证
  PORTFOLIO = 'portfolio'              // 作品集
}

// 证据强度级别
export enum EvidenceStrength {
  DIRECT = 'direct',           // 直接证据 - 明确陈述
  STRONG = 'strong',           // 强证据 - 高度相关
  MODERATE = 'moderate',       // 中等证据 - 相关但需推理
  WEAK = 'weak',              // 弱证据 - 间接相关
  INFERENTIAL = 'inferential' // 推理证据 - 基于多个弱证据推理
}

// 单条证据
export interface Evidence {
  id: string;
  source: EvidenceSource;
  strength: EvidenceStrength;

  // 原始内容
  originalText: string;        // 原文
  highlightedText?: string;    // 高亮部分
  context?: string;           // 上下文

  // 来源信息
  sourceDetails: {
    documentId?: string;       // 文档ID（如简历ID）
    interviewId?: string;      // 面试ID
    interviewerId?: string;    // 面试官ID
    timestamp: Date;          // 时间戳
    page?: number;            // 页码（PDF）
    section?: string;         // 章节（如"工作经历"）
    lineNumber?: number;      // 行号
  };

  // 可信度
  confidence: number;         // 0-100 可信度评分
  verificationStatus?: 'verified' | 'unverified' | 'disputed';

  // 关联
  relatedEvidenceIds?: string[]; // 相关证据ID
  contradictingEvidenceIds?: string[]; // 矛盾证据ID
}

// 评价声明（需要证据支撑的结论）
export interface Claim {
  id: string;
  type: ClaimType;
  statement: string;           // 评价陈述
  category: string;           // 分类（技能、性格、经验等）
  importance: 'critical' | 'high' | 'medium' | 'low';

  // 证据支撑
  supportingEvidence: Evidence[];
  evidenceSummary: string;    // 证据摘要
  confidenceScore: number;    // 基于证据的置信度

  // 推理过程
  reasoning?: {
    method: 'direct' | 'inductive' | 'deductive' | 'abductive';
    steps: string[];          // 推理步骤
    assumptions?: string[];   // 假设
  };
}

// 评价类型
export enum ClaimType {
  // 技能相关
  TECHNICAL_SKILL = 'technical_skill',
  SOFT_SKILL = 'soft_skill',
  LANGUAGE_SKILL = 'language_skill',

  // 经验相关
  EXPERIENCE_YEARS = 'experience_years',
  DOMAIN_EXPERTISE = 'domain_expertise',
  PROJECT_COMPLEXITY = 'project_complexity',

  // 能力评估
  PROBLEM_SOLVING = 'problem_solving',
  LEADERSHIP = 'leadership',
  COMMUNICATION = 'communication',
  TEAMWORK = 'teamwork',

  // 文化契合
  CULTURE_FIT = 'culture_fit',
  VALUE_ALIGNMENT = 'value_alignment',
  WORK_STYLE = 'work_style',

  // 潜力评估
  GROWTH_POTENTIAL = 'growth_potential',
  LEARNING_ABILITY = 'learning_ability',
  ADAPTABILITY = 'adaptability',

  // 风险评估
  RISK_FACTOR = 'risk_factor',
  RED_FLAG = 'red_flag',
  CONCERN = 'concern'
}

// 证据链 - 连接多个证据形成完整论证
export interface EvidenceChain {
  claimId: string;
  claim: string;

  // 证据组织
  primaryEvidence: Evidence[];      // 主要证据
  supportingEvidence: Evidence[];   // 支撑证据
  contradictoryEvidence?: Evidence[]; // 矛盾证据

  // 论证逻辑
  argumentStructure: {
    premise: string[];             // 前提
    inference: string[];           // 推理
    conclusion: string;            // 结论
  };

  // 可视化数据
  visualizationData?: {
    nodes: EvidenceNode[];
    edges: EvidenceEdge[];
  };
}

// 证据节点（用于可视化）
export interface EvidenceNode {
  id: string;
  label: string;
  type: 'claim' | 'evidence' | 'inference';
  source?: EvidenceSource;
  strength?: EvidenceStrength;
  x?: number;
  y?: number;
}

// 证据边（用于可视化）
export interface EvidenceEdge {
  source: string;
  target: string;
  type: 'supports' | 'contradicts' | 'relates';
  weight: number;
}

// 证据审计记录
export interface EvidenceAudit {
  evidenceId: string;
  action: 'created' | 'verified' | 'disputed' | 'updated';
  performedBy: string;
  performedAt: Date;
  notes?: string;
  previousValue?: any;
  newValue?: any;
}

// 证据验证规则
export interface EvidenceValidationRule {
  id: string;
  name: string;
  description: string;

  // 验证条件
  requiredSources: EvidenceSource[];  // 需要的证据来源
  minimumEvidence: number;            // 最少证据数量
  minimumStrength: EvidenceStrength;  // 最低证据强度

  // 应用范围
  applicableToTypes: ClaimType[];
  priority: number;
}

// 证据搜索参数
export interface EvidenceSearchParams {
  claimId?: string;
  source?: EvidenceSource;
  strength?: EvidenceStrength;
  dateRange?: {
    start: Date;
    end: Date;
  };
  keywords?: string[];
  verificationStatus?: 'verified' | 'unverified' | 'disputed';
}

// 证据统计
export interface EvidenceStatistics {
  totalEvidence: number;
  bySource: Record<EvidenceSource, number>;
  byStrength: Record<EvidenceStrength, number>;
  averageConfidence: number;
  verificationRate: number;
  contradictionCount: number;
}

// 工具函数：计算证据链的整体强度
export function calculateEvidenceChainStrength(chain: EvidenceChain): number {
  const primaryWeight = 0.6;
  const supportingWeight = 0.3;
  const contradictionPenalty = 0.1;

  const primaryScore = chain.primaryEvidence.reduce((sum, e) => {
    const strengthScore = {
      [EvidenceStrength.DIRECT]: 100,
      [EvidenceStrength.STRONG]: 80,
      [EvidenceStrength.MODERATE]: 60,
      [EvidenceStrength.WEAK]: 40,
      [EvidenceStrength.INFERENTIAL]: 30
    }[e.strength];

    return sum + (strengthScore * e.confidence / 100);
  }, 0) / Math.max(chain.primaryEvidence.length, 1);

  const supportingScore = chain.supportingEvidence.reduce((sum, e) => {
    const strengthScore = {
      [EvidenceStrength.DIRECT]: 100,
      [EvidenceStrength.STRONG]: 80,
      [EvidenceStrength.MODERATE]: 60,
      [EvidenceStrength.WEAK]: 40,
      [EvidenceStrength.INFERENTIAL]: 30
    }[e.strength];

    return sum + (strengthScore * e.confidence / 100);
  }, 0) / Math.max(chain.supportingEvidence.length, 1);

  const contradictionDeduction = (chain.contradictoryEvidence?.length || 0) * contradictionPenalty * 100;

  const totalScore = (primaryScore * primaryWeight) +
                     (supportingScore * supportingWeight) -
                     contradictionDeduction;

  return Math.max(0, Math.min(100, totalScore));
}

// 工具函数：生成证据摘要
export function generateEvidenceSummary(evidence: Evidence[]): string {
  if (evidence.length === 0) return "无可用证据";

  const bySource = evidence.reduce((acc, e) => {
    acc[e.source] = (acc[e.source] || 0) + 1;
    return acc;
  }, {} as Record<EvidenceSource, number>);

  const sourceDescriptions = Object.entries(bySource)
    .map(([source, count]) => {
      const sourceLabel = {
        [EvidenceSource.RESUME]: '简历',
        [EvidenceSource.INTERVIEW_FEEDBACK]: '面试反馈',
        [EvidenceSource.BEHAVIORAL_OBSERVATION]: '行为观察',
        [EvidenceSource.TEST_RESULT]: '测试结果',
        [EvidenceSource.REFERENCE_CHECK]: '背景调查',
        [EvidenceSource.WORK_SAMPLE]: '工作样本',
        [EvidenceSource.AI_ANALYSIS]: 'AI分析',
        [EvidenceSource.PUBLIC_PROFILE]: '公开资料',
        [EvidenceSource.CERTIFICATION]: '证书',
        [EvidenceSource.PORTFOLIO]: '作品集'
      }[source as EvidenceSource];

      return `${count}条${sourceLabel}`;
    });

  const avgConfidence = evidence.reduce((sum, e) => sum + e.confidence, 0) / evidence.length;

  return `基于${sourceDescriptions.join('、')}，平均置信度${avgConfidence.toFixed(0)}%`;
}

// 工具函数：检测证据矛盾
export function detectEvidenceContradictions(
  evidence1: Evidence,
  evidence2: Evidence
): boolean {
  // 这里可以实现更复杂的矛盾检测逻辑
  // 比如使用NLP分析文本语义矛盾

  // 简单示例：检查是否有明确标记的矛盾
  return evidence1.contradictingEvidenceIds?.includes(evidence2.id) ||
         evidence2.contradictingEvidenceIds?.includes(evidence1.id) ||
         false;
}

// 工具函数：验证评价声明
export function validateClaim(
  claim: Claim,
  rules: EvidenceValidationRule[]
): { isValid: boolean; violations: string[] } {
  const violations: string[] = [];

  const applicableRules = rules
    .filter(r => r.applicableToTypes.includes(claim.type))
    .sort((a, b) => b.priority - a.priority);

  for (const rule of applicableRules) {
    // 检查证据来源
    const sources = new Set(claim.supportingEvidence.map(e => e.source));
    const missingSources = rule.requiredSources.filter(s => !sources.has(s));
    if (missingSources.length > 0) {
      violations.push(`缺少必要的证据来源: ${missingSources.join(', ')}`);
    }

    // 检查证据数量
    if (claim.supportingEvidence.length < rule.minimumEvidence) {
      violations.push(`证据数量不足: 需要至少${rule.minimumEvidence}条，实际${claim.supportingEvidence.length}条`);
    }

    // 检查证据强度
    const hasStrongEnoughEvidence = claim.supportingEvidence.some(e => {
      const strengthOrder = [
        EvidenceStrength.DIRECT,
        EvidenceStrength.STRONG,
        EvidenceStrength.MODERATE,
        EvidenceStrength.WEAK,
        EvidenceStrength.INFERENTIAL
      ];

      const evidenceStrengthIndex = strengthOrder.indexOf(e.strength);
      const requiredStrengthIndex = strengthOrder.indexOf(rule.minimumStrength);

      return evidenceStrengthIndex <= requiredStrengthIndex;
    });

    if (!hasStrongEnoughEvidence) {
      violations.push(`证据强度不足: 需要至少${rule.minimumStrength}级别的证据`);
    }
  }

  return {
    isValid: violations.length === 0,
    violations
  };
}