import OpenAI from "openai";

// Using Openrouter with Google Gemini 2.5 Flash Preview model
const openai = new OpenAI({ 
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "https://ai-recruit.replit.app", // Optional, for rankings on openrouter.ai
    "X-Title": "AI Recruit System", // Optional, shows in rankings on openrouter.ai
  },
});

export interface ResumeAnalysis {
  summary: string;
  skills: string[];
  experience: number;
  education: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface MatchResult {
  score: number;
  reasons: string[];
  explanation: string;
}

export class AIService {
  async analyzeResume(resumeText: string): Promise<ResumeAnalysis> {
    try {
      const response = await openai.chat.completions.create({
        model: "google/gemini-2.5-flash-preview-09-2025",
        messages: [
          {
            role: "system",
            content: `You are an expert HR recruiter and resume analyst. Analyze the provided resume and extract structured information. Return the analysis as JSON with the following structure:
            {
              "summary": "Brief professional summary",
              "skills": ["skill1", "skill2"],
              "experience": 5,
              "education": "Education details",
              "strengths": ["strength1", "strength2"],
              "weaknesses": ["weakness1", "weakness2"],
              "recommendations": ["recommendation1", "recommendation2"]
            }`
          },
          {
            role: "user",
            content: `Please analyze this resume and provide structured feedback:\n\n${resumeText}`
          }
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No response from AI");
      }

      return JSON.parse(content) as ResumeAnalysis;
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
  }): Promise<MatchResult> {
    try {
      const response = await openai.chat.completions.create({
        model: "google/gemini-2.5-flash-preview-09-2025",
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

      return JSON.parse(content) as MatchResult;
    } catch (error) {
      console.error("Error matching candidate to job:", error);
      throw new Error("Failed to match candidate: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  }

  async generateInterviewQuestions(jobTitle: string, requirements: string[]): Promise<string[]> {
    try {
      const response = await openai.chat.completions.create({
        model: "google/gemini-2.5-flash-preview-09-2025",
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
      return result.questions;
    } catch (error) {
      console.error("Error generating interview questions:", error);
      throw new Error("Failed to generate questions: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  }

  async chatWithAssistant(message: string, context?: string): Promise<string> {
    try {
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

      const response = await openai.chat.completions.create({
        model: "google/gemini-2.5-flash-preview-09-2025",
        messages,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No response from AI");
      }

      return content;
    } catch (error) {
      console.error("Error in AI chat:", error);
      throw new Error("Failed to get AI response: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  }
}

export const aiService = new AIService();
