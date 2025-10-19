import { createRequire } from "module";
import { openai } from "./openaiService";
import { resumeParserService } from "./resumeParser";
import type { ParsedResume } from "./resumeParser";

const require = createRequire(import.meta.url);

type PdfParseFn = (data: Buffer, options?: Record<string, unknown>) => Promise<{ text: string }>;

let pdfParseInstance: PdfParseFn | null = null;
let pdfParseLoaded = false;

function getPdfParse(): PdfParseFn | null {
  if (!pdfParseLoaded) {
    pdfParseLoaded = true;
    try {
      const maybeModule = require("pdf-parse");
      pdfParseInstance = typeof maybeModule === "function" ? maybeModule : maybeModule?.default ?? null;
      if (!pdfParseInstance) {
        console.warn("[Enhanced Parser] pdf-parse module resolved but no default export");
      }
    } catch (error) {
      console.warn("[Enhanced Parser] pdf-parse module unavailable, fallback parsers will be used:", error);
      pdfParseInstance = null;
    }
  }
  return pdfParseInstance;
}

// 使用 GPT-4o-mini 进行文本分析，性价比更高
const ANALYSIS_MODEL = process.env.RESUME_AI_MODEL || "openai/gpt-4o-mini";

export interface EnhancedResumeAnalysis {
  summary: string;
  skills: string[];
  experience: number;
  education: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  workHistory: Array<{
    company: string;
    position: string;
    duration: string;
    responsibilities: string[];
  }>;
  projects: Array<{
    name: string;
    description: string;
    technologies: string[];
  }>;
  certifications: string[];
  languages: Array<{
    language: string;
    proficiency: string;
  }>;
  confidence: number; // 解析置信度 0-100
}

export interface ParsedResumeData {
  text: string;
  analysis: EnhancedResumeAnalysis;
  metadata: {
    parser: string;
    confidence: number;
    processingTime: number;
  };
}

export class EnhancedResumeParser {
  
  /**
   * 使用多策略解析PDF文本
   */
  private async extractTextFromPDF(fileBuffer: Buffer): Promise<{
    text: string;
    confidence: number;
    method: string;
  }> {
    const results: Array<{ text: string; confidence: number; method: string }> = [];

    // 策略1: 使用 pdf-parse (快速，适合标准PDF)
    const parser = getPdfParse();
    if (parser) {
      try {
        console.log("[Enhanced Parser] Trying pdf-parse...");
        const pdfData = await parser(fileBuffer);
        const cleanText = this.cleanText(pdfData.text);
        if (cleanText.length > 100) {
          results.push({
            text: cleanText,
            confidence: this.calculateTextConfidence(cleanText),
            method: "pdf-parse"
          });
        }
      } catch (error) {
        console.log("[Enhanced Parser] pdf-parse failed:", error);
      }
    } else {
      console.log("[Enhanced Parser] pdf-parse not available, skipping primary strategy.");
    }

    // 策略2: 使用 pdf-parse 进行更精确的文本提取
    if (parser) {
      try {
        console.log("[Enhanced Parser] Trying pdf-parse extraction...");
        const pdfParseText = await this.extractWithPdfParse(fileBuffer, parser);
        const cleanText = this.cleanText(pdfParseText);
        if (cleanText.length > 50) {
          results.push({
            text: cleanText,
            confidence: this.calculateTextConfidence(cleanText),
            method: "pdf-parse"
          });
        }
      } catch (error) {
        console.log("[Enhanced Parser] pdf-parse extraction failed:", error);
      }
    } else {
      console.log("[Enhanced Parser] pdf-parse not available, skipping secondary strategy.");
    }

    // 策略3: 使用原有的解析器作为后备
     try {
       console.log("[Enhanced Parser] Trying fallback parser...");
       const fallbackResult = await resumeParserService.parseFile(fileBuffer, "application/pdf");
       const cleanText = this.cleanText(fallbackResult.text);
       if (cleanText.length > 50) {
         results.push({
           text: cleanText,
           confidence: this.calculateTextConfidence(cleanText),
           method: "fallback"
         });
       }
     } catch (error) {
       console.log("[Enhanced Parser] Fallback parser failed:", error);
     }

    // 选择最佳结果
    if (results.length === 0) {
      throw new Error("所有PDF解析策略都失败了");
    }

    // 按置信度排序，选择最佳结果
    results.sort((a, b) => b.confidence - a.confidence);
    const bestResult = results[0];
    
    console.log(`[Enhanced Parser] Best result: ${bestResult.method} (confidence: ${bestResult.confidence})`);
    return bestResult;
  }

  /**
   * 使用 pdf-parse 提取文本
   */
  private async extractWithPdfParse(fileBuffer: Buffer, parser: PdfParseFn): Promise<string> {
    try {
      const data = await parser(fileBuffer, {
        normalizeWhitespace: false,
        disableFontFace: false,
        useSystemFonts: true,
      });
      return data.text;
    } catch (error) {
      console.log("[Enhanced Parser] pdf-parse extraction failed:", error);
      throw error;
    }
  }

  /**
   * 清理和标准化文本
   */
  private cleanText(text: string): string {
    return text
      // 移除多余的空白字符
      .replace(/\s+/g, ' ')
      // 移除特殊字符但保留中文
      .replace(/[^\w\s\u4e00-\u9fff\u3400-\u4dbf\u20000-\u2a6df\u2a700-\u2b73f\u2b740-\u2b81f\u2b820-\u2ceaf\uf900-\ufaff\u3300-\u33ff\ufe30-\ufe4f\uf900-\ufaff\u2f800-\u2fa1f.,;:()\-@+]/g, ' ')
      // 标准化换行
      .replace(/\n+/g, '\n')
      // 移除首尾空白
      .trim();
  }

  /**
   * 计算文本质量置信度
   */
  private calculateTextConfidence(text: string): number {
    let confidence = 0;
    
    // 基础长度检查
    if (text.length > 500) confidence += 30;
    else if (text.length > 200) confidence += 20;
    else if (text.length > 100) confidence += 10;
    
    // 关键词检查
    const keywords = ['经验', '工作', '教育', '技能', '项目', 'experience', 'education', 'skills', 'work'];
    const foundKeywords = keywords.filter(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    ).length;
    confidence += foundKeywords * 5;
    
    // 邮箱和电话检查
    if (text.includes('@')) confidence += 10;
    if (/\d{11}|\d{3}-\d{4}-\d{4}/.test(text)) confidence += 10;
    
    // 日期格式检查
    if (/\d{4}[-年]\d{1,2}/.test(text)) confidence += 10;
    
    // 中英文混合内容检查
    const hasChinese = /[\u4e00-\u9fff]/.test(text);
    const hasEnglish = /[a-zA-Z]/.test(text);
    if (hasChinese && hasEnglish) confidence += 15;
    
    return Math.min(confidence, 100);
  }

  /**
   * 使用AI分析提取的文本
   */
  private async analyzeWithAI(text: string): Promise<EnhancedResumeAnalysis> {
    const prompt = `你是一个专业的HR简历分析专家。请仔细分析以下简历文本，提取结构化信息。

简历文本：
${text}

请按照以下JSON格式返回分析结果：
{
  "summary": "简历概要（2-3句话）",
  "skills": ["技能1", "技能2", "技能3"],
  "experience": 工作年限数字,
  "education": "最高学历",
  "strengths": ["优势1", "优势2", "优势3"],
  "weaknesses": ["需要改进的地方1", "需要改进的地方2"],
  "recommendations": ["建议1", "建议2"],
  "workHistory": [
    {
      "company": "公司名称",
      "position": "职位",
      "duration": "时间段",
      "responsibilities": ["职责1", "职责2"]
    }
  ],
  "projects": [
    {
      "name": "项目名称",
      "description": "项目描述",
      "technologies": ["技术1", "技术2"]
    }
  ],
  "certifications": ["证书1", "证书2"],
  "languages": [
    {
      "language": "语言名称",
      "proficiency": "熟练程度"
    }
  ],
  "confidence": 85
}

注意：
1. 如果某些信息在简历中没有明确提及，请合理推断或标记为"未提及"
2. 工作年限请根据工作经历计算
3. confidence字段表示对分析结果的置信度(0-100)
4. 所有数组字段即使为空也要返回空数组[]
5. 请确保返回的是有效的JSON格式`;

    try {
      const response = await openai.chat.completions.create({
        model: ANALYSIS_MODEL,
        messages: [
          {
            role: "system",
            content: "你是一个专业的HR简历分析专家，擅长从简历文本中提取结构化信息。请始终返回有效的JSON格式。"
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("AI分析返回空结果");
      }

      // 尝试解析JSON
      try {
        const analysis = JSON.parse(content);
        
        // 验证必需字段
        const requiredFields = ['summary', 'skills', 'experience', 'education', 'strengths', 'weaknesses', 'recommendations', 'workHistory', 'projects', 'certifications', 'languages'];
        for (const field of requiredFields) {
          if (!(field in analysis)) {
            analysis[field] = field === 'experience' ? 0 : (field === 'summary' || field === 'education' ? '未提及' : []);
          }
        }

        // 确保confidence字段存在
        if (!analysis.confidence) {
          analysis.confidence = 70; // 默认置信度
        }

        return analysis;
      } catch (parseError) {
        console.error("[Enhanced Parser] JSON解析失败:", parseError);
        console.error("[Enhanced Parser] AI返回内容:", content);
        
        // 返回默认结构
        return this.getDefaultAnalysis();
      }
    } catch (error) {
      console.error("[Enhanced Parser] AI分析失败:", error);
      return this.getDefaultAnalysis();
    }
  }

  /**
   * 返回默认分析结果
   */
  private getDefaultAnalysis(): EnhancedResumeAnalysis {
    return {
      summary: "简历解析完成，但AI分析遇到问题",
      skills: [],
      experience: 0,
      education: "未提及",
      strengths: [],
      weaknesses: ["需要更详细的简历信息"],
      recommendations: ["建议提供更完整的简历信息"],
      workHistory: [],
      projects: [],
      certifications: [],
      languages: [],
      confidence: 30
    };
  }

  /**
   * 主要解析方法
   */
  async parse(fileBuffer: Buffer, mimeType: string): Promise<ParsedResumeData> {
    const startTime = Date.now();
    
    try {
      console.log("[Enhanced Parser] 开始解析简历...");
      
      let extractedText: string;
      let confidence: number;
      let method: string;

      if (mimeType === "application/pdf") {
        const result = await this.extractTextFromPDF(fileBuffer);
        extractedText = result.text;
        confidence = result.confidence;
        method = result.method;
      } else {
        // 处理纯文本文件
        extractedText = fileBuffer.toString('utf-8');
        confidence = this.calculateTextConfidence(extractedText);
        method = "text";
      }

      console.log(`[Enhanced Parser] 文本提取完成，长度: ${extractedText.length}, 置信度: ${confidence}`);

      // 使用AI分析文本
      const analysis = await this.analyzeWithAI(extractedText);
      
      const processingTime = Date.now() - startTime;
      console.log(`[Enhanced Parser] 解析完成，耗时: ${processingTime}ms`);

      return {
        text: extractedText,
        analysis,
        metadata: {
          parser: `enhanced-${method}`,
          confidence,
          processingTime
        }
      };
    } catch (error) {
      console.error("[Enhanced Parser] 解析失败:", error);
      
      // 尝试使用原有解析器作为最后的后备方案
       try {
         const fallbackResult = await resumeParserService.parseFile(fileBuffer, mimeType);
         const analysis = await this.analyzeWithAI(fallbackResult.text);
         
         return {
           text: fallbackResult.text,
           analysis,
           metadata: {
             parser: "enhanced-fallback",
             confidence: 50,
             processingTime: Date.now() - startTime
           }
         };
       } catch (fallbackError) {
         console.error("[Enhanced Parser] 后备解析也失败:", fallbackError);
         throw new Error(`简历解析失败: ${(error as Error).message}`);
       }
    }
  }
}

export const enhancedResumeParser = new EnhancedResumeParser();
