/**
 * 证据提取和管理服务
 * 负责从各种来源提取证据，并建立评价与证据的关联
 */

import { openai } from "./openaiService";
import {
  EvidenceSource,
  EvidenceStrength,
  ClaimType,
  type Evidence,
  type Claim,
  type EvidenceChain,
  type EvidenceSearchParams,
  type EvidenceNode,
  type EvidenceEdge
} from "@shared/types/evidence";
import { v4 as uuidv4 } from 'uuid';

export class EvidenceService {
  /**
   * 从简历文本中提取证据
   */
  async extractEvidenceFromResume(
    resumeText: string,
    claims: Partial<Claim>[]
  ): Promise<Evidence[]> {
    const prompt = `
You are an expert at extracting evidence from resumes to support or refute specific claims.

Resume Text:
${resumeText}

Claims to evaluate:
${claims.map(c => `- ${c.statement}`).join('\n')}

For each claim, extract relevant evidence from the resume. For each piece of evidence:
1. Quote the exact text from the resume
2. Identify the section it comes from
3. Assess the strength of the evidence
4. Provide confidence score

Return as JSON array of evidence objects with:
- claimStatement: string (which claim this evidence relates to)
- originalText: string (exact quote from resume)
- section: string (e.g., "Work Experience", "Education")
- strength: "direct" | "strong" | "moderate" | "weak" | "inferential"
- confidence: number (0-100)
- reasoning: string (why this is evidence for/against the claim)
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are an expert at evidence extraction and analysis. Always quote text exactly as it appears."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    const evidenceArray = result.evidence || [];

    return evidenceArray.map((e: any) => ({
      id: uuidv4(),
      source: EvidenceSource.RESUME,
      strength: e.strength as EvidenceStrength,
      originalText: e.originalText,
      highlightedText: e.originalText,
      sourceDetails: {
        timestamp: new Date(),
        section: e.section
      },
      confidence: e.confidence,
      verificationStatus: 'unverified'
    }));
  }

  /**
   * 从面试反馈中提取证据
   */
  async extractEvidenceFromInterview(
    interviewFeedback: any,
    interviewId: string,
    interviewerId: string
  ): Promise<Evidence[]> {
    const evidenceList: Evidence[] = [];

    // 从优势中提取证据
    if (interviewFeedback.observations?.strengths) {
      interviewFeedback.observations.strengths.forEach((strength: string) => {
        evidenceList.push({
          id: uuidv4(),
          source: EvidenceSource.INTERVIEW_FEEDBACK,
          strength: EvidenceStrength.STRONG,
          originalText: strength,
          sourceDetails: {
            interviewId,
            interviewerId,
            timestamp: new Date(),
            section: 'strengths'
          },
          confidence: 85,
          verificationStatus: 'verified'
        });
      });
    }

    // 从行为证据（STAR）中提取
    if (interviewFeedback.behavioralEvidence) {
      interviewFeedback.behavioralEvidence.forEach((star: any) => {
        const fullText = `情境: ${star.situation}\n任务: ${star.task}\n行动: ${star.action}\n结果: ${star.result}`;

        evidenceList.push({
          id: uuidv4(),
          source: EvidenceSource.BEHAVIORAL_OBSERVATION,
          strength: EvidenceStrength.DIRECT,
          originalText: fullText,
          highlightedText: star.action,
          context: fullText,
          sourceDetails: {
            interviewId,
            interviewerId,
            timestamp: new Date(),
            section: 'behavioral_evidence'
          },
          confidence: 95,
          verificationStatus: 'verified'
        });
      });
    }

    // 从技能验证中提取
    if (interviewFeedback.skillsValidation) {
      interviewFeedback.skillsValidation.forEach((skill: any) => {
        if (skill.assessed && skill.level !== 'not_assessed') {
          evidenceList.push({
            id: uuidv4(),
            source: EvidenceSource.INTERVIEW_FEEDBACK,
            strength: skill.level === 'exceeded' ? EvidenceStrength.DIRECT : EvidenceStrength.STRONG,
            originalText: `${skill.skill}: ${skill.level} - ${skill.evidence}`,
            sourceDetails: {
              interviewId,
              interviewerId,
              timestamp: new Date(),
              section: 'skills_validation'
            },
            confidence: skill.level === 'exceeded' ? 95 : 80,
            verificationStatus: 'verified'
          });
        }
      });
    }

    return evidenceList;
  }

  /**
   * 创建评价声明并关联证据
   */
  async createClaimWithEvidence(
    statement: string,
    type: ClaimType,
    evidence: Evidence[],
    reasoning?: { method?: string; steps: string[]; assumptions?: string[] }
  ): Promise<Claim> {
    // 计算基于证据的置信度
    const confidenceScore = this.calculateConfidenceFromEvidence(evidence);

    // 生成证据摘要
    const evidenceSummary = this.generateEvidenceSummary(evidence);

    return {
      id: uuidv4(),
      type,
      statement,
      category: this.getCategoryFromType(type),
      importance: this.determineImportance(type),
      supportingEvidence: evidence,
      evidenceSummary,
      confidenceScore,
      reasoning: this.normalizeReasoning(reasoning)
    };
  }

  /**
   * 构建证据链
   */
  async buildEvidenceChain(claim: Claim): Promise<EvidenceChain> {
    // 将证据分类
    const primaryEvidence = claim.supportingEvidence.filter(
      e => e.strength === EvidenceStrength.DIRECT || e.strength === EvidenceStrength.STRONG
    );

    const supportingEvidence = claim.supportingEvidence.filter(
      e => e.strength === EvidenceStrength.MODERATE || e.strength === EvidenceStrength.WEAK
    );

    // 查找矛盾证据
    const contradictoryEvidence = await this.findContradictoryEvidence(claim);

    // 构建论证结构
    const argumentStructure = this.buildArgumentStructure(
      claim,
      primaryEvidence,
      supportingEvidence
    );

    // 生成可视化数据
    const visualizationData = this.generateVisualizationData(
      claim,
      primaryEvidence,
      supportingEvidence,
      contradictoryEvidence
    );

    return {
      claimId: claim.id,
      claim: claim.statement,
      primaryEvidence,
      supportingEvidence,
      contradictoryEvidence: contradictoryEvidence.length > 0 ? contradictoryEvidence : undefined,
      argumentStructure,
      visualizationData
    };
  }

  private normalizeReasoning(
    reasoning?: { method?: string; steps: string[]; assumptions?: string[] }
  ): Claim["reasoning"] {
    if (!reasoning) return undefined;
    type ReasoningMethod = NonNullable<Claim["reasoning"]>["method"];
    const allowed: readonly ReasoningMethod[] = [
      "direct",
      "inductive",
      "deductive",
      "abductive",
    ];

    const method = allowed.includes(reasoning.method as ReasoningMethod)
      ? (reasoning.method as ReasoningMethod)
      : "direct";

    return {
      method,
      steps: reasoning.steps,
      assumptions: reasoning.assumptions,
    };
  }

  /**
   * AI驱动的证据分析
   */
  async analyzeEvidenceWithAI(
    claim: string,
    evidence: Evidence[]
  ): Promise<{
    analysis: string;
    strengthAssessment: string;
    gaps: string[];
    recommendations: string[];
  }> {
    const prompt = `
Analyze the following claim and its supporting evidence:

Claim: ${claim}

Evidence:
${evidence.map((e, i) => `
${i + 1}. Source: ${e.source}
   Strength: ${e.strength}
   Text: ${e.originalText}
   Confidence: ${e.confidence}%
`).join('\n')}

Provide:
1. Analysis of how well the evidence supports the claim
2. Assessment of overall evidence strength
3. Gaps in the evidence (what's missing)
4. Recommendations for additional evidence needed

Return as JSON with keys: analysis, strengthAssessment, gaps (array), recommendations (array)
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are an expert at evidence analysis and critical thinking."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  }

  /**
   * 查找矛盾证据
   */
  private async findContradictoryEvidence(claim: Claim): Promise<Evidence[]> {
    // 这里应该实现更复杂的矛盾检测逻辑
    // 可以使用NLP或向量数据库来查找语义矛盾的证据
    return [];
  }

  /**
   * 构建论证结构
   */
  private buildArgumentStructure(
    claim: Claim,
    primaryEvidence: Evidence[],
    supportingEvidence: Evidence[]
  ): { premise: string[]; inference: string[]; conclusion: string } {
    const premise = primaryEvidence.map(e =>
      `根据${this.getSourceLabel(e.source)}：${e.highlightedText || e.originalText.substring(0, 100)}`
    );

    const inference = [
      `基于${primaryEvidence.length}条主要证据和${supportingEvidence.length}条支撑证据`,
      `平均置信度为${claim.confidenceScore.toFixed(0)}%`,
      ...(claim.reasoning?.steps || [])
    ];

    return {
      premise,
      inference,
      conclusion: claim.statement
    };
  }

  /**
   * 生成可视化数据
   */
  private generateVisualizationData(
    claim: Claim,
    primaryEvidence: Evidence[],
    supportingEvidence: Evidence[],
    contradictoryEvidence: Evidence[]
  ): { nodes: EvidenceNode[]; edges: EvidenceEdge[] } {
    const nodes: EvidenceNode[] = [];
    const edges: EvidenceEdge[] = [];

    // 添加声明节点
    nodes.push({
      id: claim.id,
      label: claim.statement,
      type: 'claim',
      x: 400,
      y: 50
    });

    // 添加主要证据节点
    primaryEvidence.forEach((e, i) => {
      nodes.push({
        id: e.id,
        label: e.originalText.substring(0, 50) + '...',
        type: 'evidence',
        source: e.source,
        strength: e.strength,
        x: 200 + i * 150,
        y: 200
      });

      edges.push({
        source: e.id,
        target: claim.id,
        type: 'supports',
        weight: e.confidence / 100
      });
    });

    // 添加支撑证据节点
    supportingEvidence.forEach((e, i) => {
      nodes.push({
        id: e.id,
        label: e.originalText.substring(0, 50) + '...',
        type: 'evidence',
        source: e.source,
        strength: e.strength,
        x: 150 + i * 100,
        y: 350
      });

      edges.push({
        source: e.id,
        target: claim.id,
        type: 'supports',
        weight: e.confidence / 100 * 0.5
      });
    });

    // 添加矛盾证据节点
    contradictoryEvidence.forEach((e, i) => {
      nodes.push({
        id: e.id,
        label: e.originalText.substring(0, 50) + '...',
        type: 'evidence',
        source: e.source,
        strength: e.strength,
        x: 550 + i * 100,
        y: 350
      });

      edges.push({
        source: e.id,
        target: claim.id,
        type: 'contradicts',
        weight: e.confidence / 100
      });
    });

    return { nodes, edges };
  }

  /**
   * 辅助方法
   */
  private calculateConfidenceFromEvidence(evidence: Evidence[]): number {
    if (evidence.length === 0) return 0;

    const weightedSum = evidence.reduce((sum, e) => {
      const strengthWeight = {
        [EvidenceStrength.DIRECT]: 1.0,
        [EvidenceStrength.STRONG]: 0.8,
        [EvidenceStrength.MODERATE]: 0.6,
        [EvidenceStrength.WEAK]: 0.4,
        [EvidenceStrength.INFERENTIAL]: 0.3
      }[e.strength];

      return sum + (e.confidence * strengthWeight);
    }, 0);

    return Math.min(100, weightedSum / evidence.length);
  }

  private generateEvidenceSummary(evidence: Evidence[]): string {
    const sources = [...new Set(evidence.map(e => this.getSourceLabel(e.source)))];
    const avgConfidence = evidence.reduce((sum, e) => sum + e.confidence, 0) / evidence.length;

    return `基于${evidence.length}条证据（来自${sources.join('、')}），平均置信度${avgConfidence.toFixed(0)}%`;
  }

  private getSourceLabel(source: EvidenceSource): string {
    const labels = {
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
    };
    return labels[source] || source;
  }

  private getCategoryFromType(type: ClaimType): string {
    if (type.includes('SKILL')) return '技能';
    if (type.includes('EXPERIENCE')) return '经验';
    if (type.includes('CULTURE')) return '文化';
    if (type.includes('POTENTIAL')) return '潜力';
    if (type.includes('RISK')) return '风险';
    return '其他';
  }

  private determineImportance(type: ClaimType): 'critical' | 'high' | 'medium' | 'low' {
    const critical = [ClaimType.RED_FLAG, ClaimType.RISK_FACTOR];
    const high = [ClaimType.TECHNICAL_SKILL, ClaimType.DOMAIN_EXPERTISE, ClaimType.LEADERSHIP];
    const medium = [ClaimType.SOFT_SKILL, ClaimType.CULTURE_FIT, ClaimType.COMMUNICATION];

    if (critical.includes(type)) return 'critical';
    if (high.includes(type)) return 'high';
    if (medium.includes(type)) return 'medium';
    return 'low';
  }
}

export const evidenceService = new EvidenceService();
