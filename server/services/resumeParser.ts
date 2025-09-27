import * as pdfParse from "pdf-parse";

export interface ParsedResume {
  text: string;
  metadata: {
    pages: number;
    info?: any;
  };
}

export class ResumeParserService {
  async parseFile(fileBuffer: Buffer, mimeType: string): Promise<ParsedResume> {
    try {
      if (mimeType === "application/pdf") {
        return await this.parsePDF(fileBuffer);
      } else if (mimeType === "text/plain") {
        return this.parsePlainText(fileBuffer);
      } else {
        throw new Error(`Unsupported file type: ${mimeType}`);
      }
    } catch (error) {
      console.error("Error parsing resume file:", error);
      throw new Error("Failed to parse resume file: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  }

  private async parsePDF(buffer: Buffer): Promise<ParsedResume> {
    try {
      const data = await pdfParse(buffer);
      
      return {
        text: data.text,
        metadata: {
          pages: data.numpages,
          info: data.info,
        },
      };
    } catch (error) {
      console.error("Error parsing PDF:", error);
      throw new Error("Failed to parse PDF file");
    }
  }

  private parsePlainText(buffer: Buffer): ParsedResume {
    const text = buffer.toString("utf-8");
    
    return {
      text,
      metadata: {
        pages: 1,
      },
    };
  }

  extractContactInfo(text: string): {
    email?: string;
    phone?: string;
    name?: string;
  } {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const phoneRegex = /(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/;
    
    const emailMatch = text.match(emailRegex);
    const phoneMatch = text.match(phoneRegex);
    
    // Simple name extraction - look for patterns at the beginning
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const firstLine = lines[0]?.trim();
    
    // Basic name detection - first line that's not too long and contains letters
    let name: string | undefined;
    if (firstLine && firstLine.length < 50 && /^[A-Za-z\s]+$/.test(firstLine)) {
      name = firstLine;
    }

    return {
      email: emailMatch?.[0],
      phone: phoneMatch?.[0],
      name,
    };
  }

  extractSkills(text: string): string[] {
    // Common technical skills to look for
    const skillKeywords = [
      "JavaScript", "TypeScript", "React", "Vue", "Angular", "Node.js",
      "Python", "Java", "C++", "C#", "Go", "Rust", "PHP",
      "HTML", "CSS", "SASS", "SCSS", "Bootstrap", "Tailwind",
      "SQL", "MySQL", "PostgreSQL", "MongoDB", "Redis",
      "Docker", "Kubernetes", "AWS", "Azure", "GCP",
      "Git", "GitHub", "GitLab", "Jenkins", "CI/CD",
      "REST", "GraphQL", "API", "Microservices",
      "Machine Learning", "AI", "Data Science", "Analytics",
      "Project Management", "Agile", "Scrum", "Kanban"
    ];

    const foundSkills: string[] = [];
    const lowerText = text.toLowerCase();

    skillKeywords.forEach(skill => {
      if (lowerText.includes(skill.toLowerCase())) {
        foundSkills.push(skill);
      }
    });

    return foundSkills;
  }

  extractExperience(text: string): number {
    // Look for experience patterns
    const experiencePatterns = [
      /(\d+)\+?\s*years?\s*(?:of\s+)?experience/i,
      /(\d+)\+?\s*years?\s*in/i,
      /(\d+)\+?\s*yrs?\s*experience/i,
      /experience:\s*(\d+)\+?\s*years?/i,
    ];

    for (const pattern of experiencePatterns) {
      const match = text.match(pattern);
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    return 0;
  }
}

export const resumeParserService = new ResumeParserService();
