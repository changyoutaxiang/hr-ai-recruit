import OpenAI from "openai";

// Export the OpenAI instance for use in other services
export const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || '',
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "https://hr-recruit-system.vercel.app",
    "X-Title": "AI Recruit System",
  },
});