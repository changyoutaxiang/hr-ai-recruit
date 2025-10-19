import OpenAI from "openai";

// Using Openrouter with configurable AI models
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || '',
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "https://hr-recruit-system.vercel.app",
    "X-Title": "AI Recruit System",
  },
});

// 针对不同任务使用不同模型以平衡效果和成本
const MODELS = {
  // 简历分析使用最强旗舰模型 GPT-4o，确保最高准确性
  RESUME_ANALYSIS: process.env.RESUME_AI_MODEL || "openai/gpt-4o",
  // 画像生成使用高质量模型
  PROFILE_GENERATION: process.env.PROFILE_AI_MODEL || "openai/gpt-4o",
  // 匹配分析使用推理型模型
  MATCHING: process.env.MATCHING_AI_MODEL || "google/gemini-2.0-flash-thinking-exp",
  // 聊天助手使用经济型模型
  CHAT: process.env.CHAT_AI_MODEL || "google/gemini-2.0-flash-exp",
  // 默认模型
  DEFAULT: process.env.AI_MODEL || "google/gemini-2.0-flash-exp"
};

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ResumeAnalysis {
  summary: string;
  skills: string[];
  experience: number;
  education: string;
  strengths: string[];
  weaknesses: string[];
  recommendations?: string[];
}

export interface ResumeAnalysisResult {
  analysis: ResumeAnalysis;
  usage: TokenUsage;
  model: string;
}

export interface MatchResult {
  score: number;
  reasons: string[];
  explanation: string;
}

export interface MatchResultWithUsage {
  match: MatchResult;
  usage: TokenUsage;
  model: string;
}

export interface InterviewQuestionsResult {
  questions: string[];
  usage: TokenUsage;
  model: string;
}

export interface StructuredResponseResult {
  data: any;
  usage: TokenUsage;
  model: string;
}

export interface TextResponseResult {
  text: string;
  usage: TokenUsage;
  model: string;
}

export class AIService {
  async analyzeResume(resumeText: string): Promise<ResumeAnalysisResult> {
    try {
      const model = MODELS.RESUME_ANALYSIS;
      const response = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: `You are an expert HR recruiter specializing in analyzing resumes from various cultural contexts, especially Chinese resumes.

Key Instructions:
1. Accurately extract information from both Chinese and English text
2. Understand Chinese job titles, company names, and educational institutions
3. Recognize Chinese date formats (如 2020年3月-2023年5月)
4. Identify skills mentioned in Chinese technical terms
5. Pay attention to project descriptions and achievements
6. Extract both explicit and implicit skills from work experience

Return the analysis as JSON with the following structure:
{
  "summary": "Comprehensive professional summary capturing key strengths and career trajectory (in the same language as the resume)",
  "skills": ["skill1", "skill2", "..."], // Include technical skills, soft skills, tools, and frameworks
  "experience": 5, // Total years of work experience as a number
  "education": "Highest education level and major field (e.g., 硕士-计算机科学, Bachelor-Computer Science)",
  "strengths": ["strength1", "strength2", "strength3"], // Key professional strengths
  "weaknesses": ["area1", "area2"], // Potential areas for improvement
  "recommendations": ["recommendation1", "recommendation2"] // Suggestions for career development
}

Important:
- For Chinese resumes, keep the summary in Chinese
- Extract ALL relevant skills, not just explicitly listed ones
- Calculate experience accurately from work history dates
- Identify strengths from achievements and project outcomes`
          },
          {
            role: "user",
            content: `Please analyze this resume thoroughly and provide detailed structured feedback:\n\n${resumeText}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3, // Lower temperature for more consistent extraction
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No response from AI");
      }

      const analysis = JSON.parse(content) as ResumeAnalysis;

      // Extract token usage from response
      const usage: TokenUsage = {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      };

      return {
        analysis,
        usage,
        model,
      };
    } catch (error) {
      console.error("Error analyzing resume:", error);
      throw new Error("Failed to analyze resume: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  }

  async matchCandidateToJob(candidateData: {
    skills: string[];
    experience: number;
    education: string;
    position: string;
  }, jobData: {
    title: string;
    requirements: string[];
    description: string;
  }): Promise<MatchResultWithUsage> {
    try {
      const model = MODELS.MATCHING;
      const response = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: `You are an expert HR recruiter. Analyze how well a candidate matches a job position. Return the analysis as JSON with this structure:
            {
              "score": 85,
              "reasons": ["reason1", "reason2"],
              "explanation": "Detailed explanation of the match"
            }
            Score should be 0-100. Include specific reasons for the match score.`
          },
          {
            role: "user",
            content: `
            Candidate Profile:
            - Position: ${candidateData.position}
            - Skills: ${candidateData.skills.join(", ")}
            - Experience: ${candidateData.experience} years
            - Education: ${candidateData.education}

            Job Requirements:
            - Title: ${jobData.title}
            - Requirements: ${jobData.requirements.join(", ")}
            - Description: ${jobData.description}

            Please analyze the match between this candidate and job position.`
          }
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No response from AI");
      }

      const match = JSON.parse(content) as MatchResult;

      // Extract token usage
      const usage: TokenUsage = {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      };

      return {
        match,
        usage,
        model,
      };
    } catch (error) {
      console.error("Error matching candidate to job:", error);
      throw new Error("Failed to match candidate: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  }

  async generateInterviewQuestions(jobTitle: string, requirements: string[]): Promise<InterviewQuestionsResult> {
    try {
      const model = MODELS.DEFAULT;
      const response = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: `You are an expert HR recruiter. Generate relevant interview questions for a specific job position. Return the questions as JSON array:
            {
              "questions": ["question1", "question2", "question3"]
            }
            Generate 5-8 thoughtful questions that assess both technical skills and cultural fit.`
          },
          {
            role: "user",
            content: `Generate interview questions for:
            Job Title: ${jobTitle}
            Requirements: ${requirements.join(", ")}`
          }
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No response from AI");
      }

      const result = JSON.parse(content) as { questions: string[] };

      // Extract token usage
      const usage: TokenUsage = {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      };

      return {
        questions: result.questions,
        usage,
        model,
      };
    } catch (error) {
      console.error("Error generating interview questions:", error);
      throw new Error("Failed to generate questions: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  }

  async chatWithAssistant(message: string, context?: string): Promise<{ response: string; usage: TokenUsage; model: string }> {
    try {
      const model = MODELS.CHAT;
      const systemMessage = `You are an AI assistant specialized in HR and recruitment. You help HR managers with:
      - Candidate evaluation and analysis
      - Interview preparation and questions
      - Job posting optimization
      - Recruitment strategy advice
      - Data interpretation and insights

      Be helpful, professional, and provide actionable advice.`;

      const messages: any[] = [
        { role: "system", content: systemMessage }
      ];

      if (context) {
        messages.push({ role: "system", content: `Context: ${context}` });
      }

      messages.push({ role: "user", content: message });

      const apiResponse = await openai.chat.completions.create({
        model,
        messages,
      });

      const content = apiResponse.choices[0].message.content;
      if (!content) {
        throw new Error("No response from AI");
      }

      const usage: TokenUsage = {
        promptTokens: apiResponse.usage?.prompt_tokens || 0,
        completionTokens: apiResponse.usage?.completion_tokens || 0,
        totalTokens: apiResponse.usage?.total_tokens || 0,
      };

      return {
        response: content,
        usage,
        model,
      };
    } catch (error) {
      console.error("Error in AI chat:", error);
      throw new Error("Failed to get AI response: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  }

  /**
   * 生成结构化响应（返回 JSON）
   */
  async generateStructuredResponse(prompt: string, modelType: keyof typeof MODELS = "DEFAULT"): Promise<StructuredResponseResult> {
    try {
      const model = MODELS[modelType];
      const response = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: "你是一位专业的HR专家，请用中文回答。返回JSON格式的结构化数据。"
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from AI");
      }

      // Extract token usage
      const usage: TokenUsage = {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      };

      return {
        data: JSON.parse(content),
        usage,
        model,
      };
    } catch (error) {
      console.error("Error generating structured response:", error);
      // 返回空对象和零 token，让调用方使用默认值
      return {
        data: {},
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        model: MODELS[modelType],
      };
    }
  }

  /**
   * 生成文本响应
   */
  async generateTextResponse(prompt: string, modelType: keyof typeof MODELS = "DEFAULT"): Promise<TextResponseResult> {
    try {
      const model = MODELS[modelType];
      const response = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: "你是一位专业的HR专家，请用中文提供专业、客观的分析和建议。"
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 500
      });

      // Extract token usage
      const usage: TokenUsage = {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      };

      return {
        text: response.choices[0]?.message?.content || "",
        usage,
        model,
      };
    } catch (error) {
      console.error("Error generating text response:", error);
      return {
        text: "",
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        model: MODELS[modelType],
      };
    }
  }
}

export const aiService = new AIService();
