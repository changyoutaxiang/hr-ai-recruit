import { pdfToPng, PngPageOutput } from "pdf-to-png-converter";
import sharp from "sharp";
import OpenAI from "openai";
import { resumeParserService } from "./resumeParser";
import type { ParsedResume } from "./resumeParser";

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || '',
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "https://hr-recruit-system.vercel.app",
    "X-Title": "AI Recruit System",
  },
});

// GPT-5 支持多模态（文本+图像）
const VISION_MODEL = process.env.VISION_AI_MODEL || "openai/gpt-5";

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
}

export class EnhancedResumeParser {
  /**
   * 使用 GPT-5 的视觉能力直接分析 PDF 图片
   * 这样可以保留布局、表格、图表等视觉信息
   */
  async parseWithVision(fileBuffer: Buffer, mimeType: string): Promise<{
    parsedText: ParsedResume;
    visionAnalysis: EnhancedResumeAnalysis;
  }> {
    // 先使用传统方法提取文本作为备份
    const parsedText = await resumeParserService.parseFile(fileBuffer, mimeType);

    if (mimeType !== "application/pdf") {
      // 如果不是 PDF，只返回文本分析
      return {
        parsedText,
        visionAnalysis: await this.analyzeWithTextOnly(parsedText.text)
      };
    }

    try {
      // 将 PDF 转换为图片
      console.log("[Vision Parser] Converting PDF to images...");
      const pngPages = await pdfToPng(fileBuffer, {
        disableFontFace: false,
        useSystemFonts: true,
        viewportScale: 2.0, // 高分辨率
      });

      // 准备图片数据用于 GPT-5 分析
      const imageMessages: any[] = [];

      for (let i = 0; i < Math.min(pngPages.length, 5); i++) { // 最多处理5页
        const page = pngPages[i] as PngPageOutput;

        // 将图片转换为 base64
        const base64Image = page.content.toString('base64');

        imageMessages.push({
          type: "image_url",
          image_url: {
            url: `data:image/png;base64,${base64Image}`,
            detail: "high" // 使用高精度分析
          }
        });
      }

      console.log(`[Vision Parser] Analyzing ${imageMessages.length} pages with GPT-5 vision...`);

      // 使用 GPT-5 的多模态能力分析简历图片
      const response = await openai.chat.completions.create({
        model: VISION_MODEL,
        messages: [
          {
            role: "system",
            content: `You are an expert HR recruiter with extensive experience analyzing resumes from various cultural contexts, especially Chinese resumes.

Your task is to analyze the resume images and extract comprehensive structured information.

Key Instructions:
1. Analyze the visual layout, tables, and formatting to understand information hierarchy
2. Extract information from both Chinese and English text accurately
3. Identify information from tables, charts, and visual elements
4. Pay attention to logos, certificates, and visual badges
5. Understand Chinese date formats, job titles, and company names
6. Extract both explicit and implicit information from the visual context

Return a detailed JSON analysis with the following structure:
{
  "summary": "Comprehensive professional summary in the same language as the resume",
  "skills": ["skill1", "skill2", "..."],
  "experience": 5,
  "education": "Highest education level and major",
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["area1", "area2"],
  "recommendations": ["recommendation1", "recommendation2"],
  "workHistory": [
    {
      "company": "Company Name",
      "position": "Job Title",
      "duration": "2020.03 - 2023.05",
      "responsibilities": ["responsibility1", "responsibility2"]
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "description": "Brief description",
      "technologies": ["tech1", "tech2"]
    }
  ],
  "certifications": ["cert1", "cert2"],
  "languages": [
    {
      "language": "Chinese",
      "proficiency": "Native"
    }
  ]
}

IMPORTANT:
- Extract ALL information visible in the images, including from tables and visual elements
- Maintain the original language for names and titles
- Calculate experience accurately from work history
- Include information from any certificates or badges shown`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please analyze this resume thoroughly. The resume is shown in the following images:"
              },
              ...imageMessages
            ]
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2, // 低温度确保准确性
        max_tokens: 4000
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No response from vision model");
      }

      const visionAnalysis = JSON.parse(content) as EnhancedResumeAnalysis;

      console.log("[Vision Parser] Vision analysis completed successfully");

      return {
        parsedText,
        visionAnalysis
      };

    } catch (error) {
      console.error("[Vision Parser] Error in vision analysis, falling back to text-only:", error);

      // 如果视觉分析失败，回退到纯文本分析
      return {
        parsedText,
        visionAnalysis: await this.analyzeWithTextOnly(parsedText.text)
      };
    }
  }

  /**
   * 纯文本分析（备用方案）
   */
  private async analyzeWithTextOnly(text: string): Promise<EnhancedResumeAnalysis> {
    const response = await openai.chat.completions.create({
      model: VISION_MODEL, // GPT-5 也能很好地处理纯文本
      messages: [
        {
          role: "system",
          content: `Analyze the resume text and extract structured information. Return JSON with the structure defined.`
        },
        {
          role: "user",
          content: text
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    return JSON.parse(content) as EnhancedResumeAnalysis;
  }

  /**
   * 选择最佳解析模式
   */
  async parse(fileBuffer: Buffer, mimeType: string, useVision: boolean = true): Promise<{
    text: string;
    analysis: EnhancedResumeAnalysis;
    metadata: any;
  }> {
    if (useVision && mimeType === "application/pdf") {
      // 使用视觉分析
      const { parsedText, visionAnalysis } = await this.parseWithVision(fileBuffer, mimeType);
      return {
        text: parsedText.text,
        analysis: visionAnalysis,
        metadata: {
          ...parsedText.metadata,
          analysisMode: "vision",
          model: VISION_MODEL
        }
      };
    } else {
      // 使用传统文本分析
      const parsed = await resumeParserService.parseFile(fileBuffer, mimeType);
      const analysis = await this.analyzeWithTextOnly(parsed.text);
      return {
        text: parsed.text,
        analysis,
        metadata: {
          ...parsed.metadata,
          analysisMode: "text",
          model: VISION_MODEL
        }
      };
    }
  }
}

export const enhancedResumeParser = new EnhancedResumeParser();