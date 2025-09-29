/**
 * 面试相关的类型定义
 * 支持弹性的面试轮次管理
 */

// 面试类型枚举
export enum InterviewType {
  RESUME = "resume",              // 简历筛选
  PHONE_SCREEN = "phone_screen",  // 电话筛选
  TECHNICAL = "technical",        // 技术面试
  BEHAVIORAL = "behavioral",      // 行为面试
  CULTURAL = "cultural",          // 文化面试
  CASE_STUDY = "case_study",      // 案例分析
  PANEL = "panel",                // 小组面试
  EXECUTIVE = "executive",        // 高管面试
  HR = "hr",                      // HR面试
  DEPARTMENT = "department",      // 部门面试
  CROSS_TEAM = "cross_team",      // 跨团队面试
  FINAL = "final",                // 终面
  INFORMAL = "informal"           // 非正式面谈
}

// 面试阶段配置
export interface InterviewStageConfig {
  round: number;                  // 第几轮（1, 2, 3, 4, 5...无上限）
  type: InterviewType;            // 面试类型
  subRound?: string;              // 子轮次标识（如 a, b 用于同一轮的多个面试）
  label: string;                  // 显示标签
  description?: string;           // 阶段描述
  isMilestone?: boolean;          // 是否为关键里程碑
  isParallel?: boolean;           // 是否并行面试（同轮次多个面试）
  dependencies?: string[];        // 依赖的前置阶段
}

// 画像演化阶段
export interface ProfileEvolutionStage {
  stageId: string;                // 唯一标识，格式：interview_[round]_[type]_[subround?]
  round: number;                  // 轮次
  type: InterviewType;            // 类型
  timestamp: Date;                // 时间戳
  version: number;                // 画像版本号
  triggerType: 'manual' | 'auto' | 'feedback'; // 触发类型
  metadata?: {
    interviewId?: string;         // 关联的面试ID
    interviewerIds?: string[];    // 面试官ID
    feedbackIntegrated?: boolean; // 是否已整合反馈
    confidence?: number;          // 置信度
  };
}

// 面试流程模板（可配置）
export interface InterviewProcessTemplate {
  id: string;
  name: string;
  description: string;
  stages: InterviewStageConfig[];
  isDefault?: boolean;
  jobType?: string;               // 适用的职位类型
  seniorityLevel?: string;         // 适用的资深级别
}

// 候选人面试进程
export interface CandidateInterviewProcess {
  candidateId: string;
  jobId: string;
  templateId?: string;             // 使用的流程模板
  currentRound: number;            // 当前轮次
  currentStage: string;            // 当前阶段标识
  totalPlannedRounds?: number;     // 计划总轮数（可能动态调整）
  completedStages: ProfileEvolutionStage[];
  nextPlannedStages?: InterviewStageConfig[];
  status: 'in_progress' | 'completed' | 'terminated' | 'on_hold';
  decision?: 'hire' | 'reject' | 'pending';
}

// 生成阶段标识的辅助函数
export function generateStageId(
  round: number,
  type: InterviewType,
  subRound?: string
): string {
  if (type === InterviewType.RESUME) {
    return 'resume';
  }

  let stageId = `interview_${round}`;

  if (type !== InterviewType.TECHNICAL) {
    stageId += `_${type}`;
  }

  if (subRound) {
    stageId += `_${subRound}`;
  }

  return stageId;
}

// 解析阶段标识
export function parseStageId(stageId: string): {
  round: number;
  type?: InterviewType;
  subRound?: string;
} | null {
  if (stageId === 'resume') {
    return { round: 0, type: InterviewType.RESUME };
  }

  const match = stageId.match(/interview_(\d+)(?:_([a-z_]+))?(?:_([a-z]+))?/);
  if (!match) return null;

  return {
    round: parseInt(match[1], 10),
    type: (match[2] as InterviewType) || InterviewType.TECHNICAL,
    subRound: match[3]
  };
}

// 获取阶段显示标签
export function getStageLabel(
  stageId: string,
  locale: 'zh' | 'en' = 'zh'
): string {
  const parsed = parseStageId(stageId);
  if (!parsed) return stageId;

  if (parsed.type === InterviewType.RESUME) {
    return locale === 'zh' ? '简历阶段' : 'Resume Stage';
  }

  const typeLabels = {
    zh: {
      [InterviewType.PHONE_SCREEN]: '电话筛选',
      [InterviewType.TECHNICAL]: '技术面试',
      [InterviewType.BEHAVIORAL]: '行为面试',
      [InterviewType.CULTURAL]: '文化面试',
      [InterviewType.CASE_STUDY]: '案例分析',
      [InterviewType.PANEL]: '小组面试',
      [InterviewType.EXECUTIVE]: '高管面试',
      [InterviewType.HR]: 'HR面试',
      [InterviewType.DEPARTMENT]: '部门面试',
      [InterviewType.CROSS_TEAM]: '跨团队面试',
      [InterviewType.FINAL]: '终面',
      [InterviewType.INFORMAL]: '面谈'
    },
    en: {
      [InterviewType.PHONE_SCREEN]: 'Phone Screen',
      [InterviewType.TECHNICAL]: 'Technical',
      [InterviewType.BEHAVIORAL]: 'Behavioral',
      [InterviewType.CULTURAL]: 'Cultural Fit',
      [InterviewType.CASE_STUDY]: 'Case Study',
      [InterviewType.PANEL]: 'Panel Interview',
      [InterviewType.EXECUTIVE]: 'Executive',
      [InterviewType.HR]: 'HR Interview',
      [InterviewType.DEPARTMENT]: 'Department',
      [InterviewType.CROSS_TEAM]: 'Cross-team',
      [InterviewType.FINAL]: 'Final',
      [InterviewType.INFORMAL]: 'Informal Chat'
    }
  };

  const typeLabel = parsed.type ? typeLabels[locale][parsed.type] : '';
  const roundLabel = locale === 'zh' ? `第${parsed.round}轮` : `Round ${parsed.round}`;
  const subRoundLabel = parsed.subRound ? ` (${parsed.subRound.toUpperCase()})` : '';

  return `${roundLabel} ${typeLabel}${subRoundLabel}`.trim();
}

// 判断是否可以进入下一阶段
export function canProgressToNextStage(
  process: CandidateInterviewProcess,
  nextStage: InterviewStageConfig
): boolean {
  if (!nextStage.dependencies || nextStage.dependencies.length === 0) {
    return true;
  }

  const completedStageIds = process.completedStages.map(s => s.stageId);
  return nextStage.dependencies.every(dep => completedStageIds.includes(dep));
}

// 预设的面试流程模板
export const defaultInterviewTemplates: InterviewProcessTemplate[] = [
  {
    id: 'standard_tech_3_rounds',
    name: '标准技术岗-3轮',
    description: '适用于中级技术岗位的标准流程',
    stages: [
      { round: 0, type: InterviewType.RESUME, label: '简历筛选' },
      { round: 1, type: InterviewType.PHONE_SCREEN, label: '电话初筛' },
      { round: 2, type: InterviewType.TECHNICAL, label: '技术面试' },
      { round: 3, type: InterviewType.BEHAVIORAL, label: 'HR面试', isMilestone: true }
    ]
  },
  {
    id: 'senior_tech_5_rounds',
    name: '高级技术岗-5轮',
    description: '适用于高级/架构师岗位的完整流程',
    stages: [
      { round: 0, type: InterviewType.RESUME, label: '简历筛选' },
      { round: 1, type: InterviewType.PHONE_SCREEN, label: '电话初筛' },
      { round: 2, type: InterviewType.TECHNICAL, label: '技术一面' },
      { round: 3, type: InterviewType.TECHNICAL, subRound: 'a', label: '技术二面（深度）', isParallel: true },
      { round: 3, type: InterviewType.CASE_STUDY, subRound: 'b', label: '系统设计', isParallel: true },
      { round: 4, type: InterviewType.DEPARTMENT, label: '部门面试', isMilestone: true },
      { round: 5, type: InterviewType.EXECUTIVE, label: '高管面试', isMilestone: true }
    ]
  },
  {
    id: 'management_4_rounds',
    name: '管理岗-4轮',
    description: '适用于管理岗位的面试流程',
    stages: [
      { round: 0, type: InterviewType.RESUME, label: '简历筛选' },
      { round: 1, type: InterviewType.HR, label: 'HR初筛' },
      { round: 2, type: InterviewType.BEHAVIORAL, label: '管理能力评估' },
      { round: 3, type: InterviewType.PANEL, label: '团队面试', isMilestone: true },
      { round: 4, type: InterviewType.EXECUTIVE, label: '高管终面', isMilestone: true }
    ]
  },
  {
    id: 'flexible',
    name: '弹性流程',
    description: '根据实际情况动态调整的流程',
    stages: [
      { round: 0, type: InterviewType.RESUME, label: '简历筛选' }
      // 其余阶段动态添加
    ]
  }
];

// 获取下一个建议的面试阶段
export function suggestNextStage(
  process: CandidateInterviewProcess,
  template?: InterviewProcessTemplate
): InterviewStageConfig | null {
  if (!template) {
    // 如果没有模板，返回通用的下一轮
    return {
      round: process.currentRound + 1,
      type: InterviewType.TECHNICAL,
      label: `第${process.currentRound + 1}轮面试`
    };
  }

  const remainingStages = template.stages.filter(
    stage => !process.completedStages.some(
      completed => completed.round === stage.round && completed.type === stage.type
    )
  );

  return remainingStages.length > 0 ? remainingStages[0] : null;
}