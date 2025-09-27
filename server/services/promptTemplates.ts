import { randomUUID } from "crypto";

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: "resume_analysis" | "job_matching" | "interview_questions" | "candidate_screening" | "general";
  template: string;
  variables: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InsertPromptTemplate {
  name: string;
  description: string;
  category: PromptTemplate["category"];
  template: string;
  variables: string[];
  isActive?: boolean;
}

export class PromptTemplateService {
  private templates: Map<string, PromptTemplate> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates() {
    const defaultTemplates: InsertPromptTemplate[] = [
      {
        name: "Resume Analysis",
        description: "Comprehensive resume analysis with skills extraction",
        category: "resume_analysis",
        template: `You are an expert HR recruiter and resume analyst. Analyze the provided resume and extract structured information. Return the analysis as JSON with the following structure:
{
  "summary": "Brief professional summary",
  "skills": ["skill1", "skill2"],
  "experience": 5,
  "education": "Education details",
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "recommendations": ["recommendation1", "recommendation2"]
}

Resume content:
{{resumeText}}`,
        variables: ["resumeText"],
        isActive: true,
      },
      {
        name: "Job Matching",
        description: "Match candidates to job positions with scoring",
        category: "job_matching",
        template: `You are an expert HR recruiter. Analyze how well a candidate matches a job position. Return the analysis as JSON with this structure:
{
  "score": 85,
  "reasons": ["reason1", "reason2"],
  "explanation": "Detailed explanation of the match"
}
Score should be 0-100. Include specific reasons for the match score.

Candidate Profile:
- Position: {{candidatePosition}}
- Skills: {{candidateSkills}}
- Experience: {{candidateExperience}} years
- Education: {{candidateEducation}}

Job Requirements:
- Title: {{jobTitle}}
- Requirements: {{jobRequirements}}
- Description: {{jobDescription}}

Please analyze the match between this candidate and job position.`,
        variables: ["candidatePosition", "candidateSkills", "candidateExperience", "candidateEducation", "jobTitle", "jobRequirements", "jobDescription"],
        isActive: true,
      },
      {
        name: "Interview Questions Generator",
        description: "Generate relevant interview questions for specific roles",
        category: "interview_questions",
        template: `You are an expert HR recruiter. Generate relevant interview questions for a specific job position. Return the questions as JSON array:
{
  "questions": ["question1", "question2", "question3"]
}
Generate 5-8 thoughtful questions that assess both technical skills and cultural fit.

Job Title: {{jobTitle}}
Requirements: {{jobRequirements}}
Experience Level: {{experienceLevel}}`,
        variables: ["jobTitle", "jobRequirements", "experienceLevel"],
        isActive: true,
      },
      {
        name: "Candidate Screening",
        description: "Initial candidate screening based on basic criteria",
        category: "candidate_screening",
        template: `You are an HR screening specialist. Evaluate if a candidate meets the basic requirements for a position. Return evaluation as JSON:
{
  "passed": true,
  "score": 75,
  "feedback": "Detailed feedback about the candidate",
  "missingRequirements": ["requirement1", "requirement2"],
  "recommendations": ["recommendation1", "recommendation2"]
}

Candidate Information:
- Resume: {{resumeText}}
- Target Position: {{targetPosition}}
- Minimum Requirements: {{minimumRequirements}}

Please evaluate if this candidate should proceed to the next stage.`,
        variables: ["resumeText", "targetPosition", "minimumRequirements"],
        isActive: true,
      },
      {
        name: "General HR Assistant",
        description: "General HR and recruitment advice",
        category: "general",
        template: `You are an AI assistant specialized in HR and recruitment. You help HR managers with:
- Candidate evaluation and analysis
- Interview preparation and questions
- Job posting optimization
- Recruitment strategy advice
- Data interpretation and insights

Be helpful, professional, and provide actionable advice.

User Query: {{userQuery}}
Context: {{context}}`,
        variables: ["userQuery", "context"],
        isActive: true,
      },
    ];

    defaultTemplates.forEach(template => {
      this.createTemplate(template);
    });
  }

  async getTemplates(): Promise<PromptTemplate[]> {
    return Array.from(this.templates.values());
  }

  async getTemplate(id: string): Promise<PromptTemplate | undefined> {
    return this.templates.get(id);
  }

  async getTemplatesByCategory(category: PromptTemplate["category"]): Promise<PromptTemplate[]> {
    return Array.from(this.templates.values()).filter(t => t.category === category);
  }

  async createTemplate(template: InsertPromptTemplate): Promise<PromptTemplate> {
    const newTemplate: PromptTemplate = {
      ...template,
      id: randomUUID(),
      isActive: template.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.templates.set(newTemplate.id, newTemplate);
    return newTemplate;
  }

  async updateTemplate(id: string, updates: Partial<PromptTemplate>): Promise<PromptTemplate | undefined> {
    const template = this.templates.get(id);
    if (!template) return undefined;

    const updatedTemplate: PromptTemplate = {
      ...template,
      ...updates,
      updatedAt: new Date(),
    };

    this.templates.set(id, updatedTemplate);
    return updatedTemplate;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    return this.templates.delete(id);
  }

  async renderTemplate(templateId: string, variables: Record<string, any>): Promise<string> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    let rendered = template.template;
    
    // Replace variables in the template
    template.variables.forEach(variable => {
      const value = variables[variable] || "";
      const regex = new RegExp(`{{${variable}}}`, "g");
      rendered = rendered.replace(regex, String(value));
    });

    return rendered;
  }

  extractVariables(template: string): string[] {
    const regex = /{{([^}]+)}}/g;
    const variables: string[] = [];
    let match;

    while ((match = regex.exec(template)) !== null) {
      const variable = match[1].trim();
      if (!variables.includes(variable)) {
        variables.push(variable);
      }
    }

    return variables;
  }
}

export const promptTemplateService = new PromptTemplateService();
