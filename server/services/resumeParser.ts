import { createRequire } from "module";
const require = createRequire(import.meta.url);

type PdfParseFn = (data: Buffer, options?: Record<string, unknown>) => Promise<{
  text: string;
  numpages: number;
  info?: any;
}>;

let pdfParseInstance: PdfParseFn | null = null;
let pdfParseLoaded = false;

function getPdfParse(): PdfParseFn | null {
  if (!pdfParseLoaded) {
    pdfParseLoaded = true;
    try {
      const maybeModule = require("pdf-parse");
      pdfParseInstance = typeof maybeModule === "function" ? maybeModule : maybeModule?.default ?? null;
      if (!pdfParseInstance) {
        console.warn("[Resume Parser] pdf-parse module resolved but export missing");
      }
    } catch (error) {
      console.warn("[Resume Parser] pdf-parse module unavailable, using basic text fallback:", error);
      pdfParseInstance = null;
    }
  }
  return pdfParseInstance;
}

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
        const parser = getPdfParse();
        if (!parser) {
          console.warn("[Resume Parser] pdf-parse not available, falling back to plain-text extraction.");
          return this.parsePlainText(fileBuffer);
        }
        return await this.parsePDF(fileBuffer, parser);
      } else if (mimeType === "text/plain") {
        return this.parsePlainText(fileBuffer);
      } else {
        throw new Error('Unsupported resume format. 请上传 PDF 格式的简历。');
      }
    } catch (error) {
      console.error("Error parsing resume file:", error);
      throw new Error("Failed to parse resume file: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  }

  private async parsePDF(buffer: Buffer, parser: PdfParseFn): Promise<ParsedResume> {
    try {
      // 使用更好的PDF解析选项来处理中文字符
      const data = await parser(buffer, {
        // 保持原始字符编码
        normalizeWhitespace: false,
        // 使用更好的字体处理
        disableFontFace: false,
        // 保持原始文本格式
        useSystemFonts: true,
      });
      
      const cleanedText = this.cleanAndFixEncoding(data.text);

      return {
        text: cleanedText,
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

  /**
   * 清理和修复PDF文本中的编码问题
   */
  private cleanAndFixEncoding(text: string): string {
    if (!text) return '';
    
    try {
      // 1. 初步清理非打印字符，并保留换行
      let cleaned = text
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .replace(/\r\n/g, '\n')
        .replace(/\u00a0/g, ' ')
        // 修复常见的 UTF-8 误解码字符
        .replace(/â€™/g, "'")
        .replace(/â€œ/g, '"')
        .replace(/â€�/g, '"')
        .replace(/â€¢/g, '•')
        .replace(/â€“/g, '–')
        .replace(/â€”/g, '—');

      // 2. 标准化空白，保留段落结构
      cleaned = cleaned
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n[ \t]+/g, '\n')
        .trim();

      // 3. 如果检测到明显的编码问题，尝试重新编码
      if (this.hasEncodingIssues(cleaned)) {
        const reencoded = this.tryReencode(cleaned);
        if (reencoded && !this.hasEncodingIssues(reencoded)) {
          cleaned = reencoded;
        }
      }

      return cleaned;
    } catch (error) {
      console.warn('Error cleaning text encoding:', error);
      return text; // 返回原始文本作为备份
    }
  }

  /**
   * 检测文本是否存在编码问题
   */
  private hasEncodingIssues(text: string): boolean {
    if (!text) return false;

    const replacementChar = text.includes('\uFFFD');
    const typicalMojibake = /(Ã|Â|â€™|â€œ|â€�|â€“|â€”|â€¢|æ\x80|å\x8f|ç\x9a)/;

    return replacementChar || typicalMojibake.test(text);
  }

  /**
   * 尝试通过重新编码修复文本
   */
  private tryReencode(text: string): string | null {
    try {
      const buffer = Buffer.from(text, 'latin1');
      const decoded = buffer.toString('utf8');

      // 如果重新编码后出现更多可读字符，则返回结果
      const originalChineseCount = (text.match(/[\u4e00-\u9fff]/g) || []).length;
      const decodedChineseCount = (decoded.match(/[\u4e00-\u9fff]/g) || []).length;

      if (decodedChineseCount > originalChineseCount) {
        return decoded;
      }

      return null;
    } catch (error) {
      console.warn('Failed to re-encode text:', error);
      return null;
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
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    
    // 支持中国手机号码格式
    const phoneRegex = /(?:\+86[-.\s]?)?(?:1[3-9]\d{9}|(?:\(?0\d{2,3}\)?[-.\s]?)?\d{7,8})/g;
    
    const emailMatch = text.match(emailRegex);
    const phoneMatch = text.match(phoneRegex);
    
    // 改进的姓名提取逻辑，支持中文姓名
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    let name: string | undefined;
    
    // 尝试多种姓名提取策略
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      const line = lines[i]?.trim();
      if (!line) continue;
      
      // 策略1: 检查是否包含"姓名"、"Name"等关键词
      const nameKeywordMatch = line.match(/(?:姓名|Name|名字)[:：\s]*([^\s]+(?:\s+[^\s]+)*)/i);
      if (nameKeywordMatch && nameKeywordMatch[1]) {
        name = nameKeywordMatch[1].trim();
        break;
      }
      
      // 策略2: 第一行如果是纯中文或英文姓名格式
      if (i === 0) {
        // 中文姓名 (2-4个中文字符)
        if (/^[\u4e00-\u9fff]{2,4}$/.test(line)) {
          name = line;
          break;
        }
        // 英文姓名 (首字母大写的单词组合)
        if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/.test(line) && line.length < 50) {
          name = line;
          break;
        }
      }
      
      // 策略3: 查找看起来像姓名的模式
      if (line.length < 30) {
        // 中文姓名模式
        const chineseNameMatch = line.match(/[\u4e00-\u9fff]{2,4}/);
        if (chineseNameMatch && !line.includes('@') && !line.includes('公司') && !line.includes('大学')) {
          name = chineseNameMatch[0];
          break;
        }
        
        // 英文姓名模式
        const englishNameMatch = line.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})$/);
        if (englishNameMatch) {
          name = englishNameMatch[1];
          break;
        }
      }
    }

    return {
      email: emailMatch?.[0],
      phone: phoneMatch?.[0],
      name,
    };
  }

  extractSkills(text: string): string[] {
    // 技术技能关键词（中英文）
    const skillKeywords = [
      // 编程语言
      "JavaScript", "TypeScript", "React", "Vue", "Angular", "Node.js",
      "Python", "Java", "C++", "C#", "Go", "Rust", "PHP", "Swift", "Kotlin",
      "HTML", "CSS", "SASS", "SCSS", "Bootstrap", "Tailwind", "jQuery",
      
      // 数据库
      "SQL", "MySQL", "PostgreSQL", "MongoDB", "Redis", "Oracle", "SQLite",
      "数据库", "MySQL数据库", "PostgreSQL数据库", "MongoDB数据库",
      
      // 云服务和DevOps
      "Docker", "Kubernetes", "AWS", "Azure", "GCP", "阿里云", "腾讯云",
      "Git", "GitHub", "GitLab", "Jenkins", "CI/CD", "DevOps",
      
      // API和架构
      "REST", "GraphQL", "API", "Microservices", "微服务", "RESTful",
      
      // AI和数据科学
      "Machine Learning", "AI", "Data Science", "Analytics", "TensorFlow", "PyTorch",
      "人工智能", "机器学习", "数据科学", "数据分析", "深度学习",
      
      // 项目管理
      "Project Management", "Agile", "Scrum", "Kanban", "项目管理", "敏捷开发",
      
      // 前端框架和工具
      "Webpack", "Vite", "Babel", "ESLint", "Prettier", "npm", "yarn",
      
      // 后端框架
      "Express", "Koa", "Spring", "Django", "Flask", "Laravel",
      
      // 移动开发
      "React Native", "Flutter", "iOS", "Android", "移动开发",
      
      // 测试
      "Jest", "Cypress", "Selenium", "单元测试", "集成测试", "自动化测试",
      
      // 设计和UI/UX
      "Figma", "Sketch", "Adobe", "Photoshop", "UI设计", "UX设计", "用户体验",
      
      // 中文技能关键词
      "前端开发", "后端开发", "全栈开发", "软件开发", "Web开发", "移动端开发",
      "数据库设计", "系统架构", "性能优化", "代码优化", "团队协作", "沟通能力",
      "学习能力", "解决问题", "创新思维", "责任心", "抗压能力"
    ];

    const foundSkills: string[] = [];
    const lowerText = text.toLowerCase();
    const originalText = text;

    // 使用Set避免重复
    const skillSet = new Set<string>();

    skillKeywords.forEach(skill => {
      const lowerSkill = skill.toLowerCase();
      
      // 检查英文技能（不区分大小写）
      if (lowerText.includes(lowerSkill)) {
        skillSet.add(skill);
      }
      
      // 检查中文技能（原始大小写）
      if (originalText.includes(skill)) {
        skillSet.add(skill);
      }
    });

    // 额外的模式匹配来提取技能
    const skillPatterns = [
      // 匹配 "熟练掌握 XXX" 模式
      /(?:熟练掌握|精通|掌握|了解|使用过|熟悉)[:：\s]*([A-Za-z\u4e00-\u9fff][A-Za-z0-9\u4e00-\u9fff\s\.\-\/]{1,20})/g,
      // 匹配 "技能: XXX, YYY" 模式
      /(?:技能|Skills|专业技能)[:：\s]*([A-Za-z\u4e00-\u9fff][A-Za-z0-9\u4e00-\u9fff\s\.\-\/,，]{1,100})/g,
      // 匹配编程语言列表
      /(?:编程语言|Programming Languages?)[:：\s]*([A-Za-z\u4e00-\u9fff][A-Za-z0-9\u4e00-\u9fff\s\.\-\/,，]{1,100})/g
    ];

    skillPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(originalText)) !== null) {
        const skillText = match[1].trim();
        // 分割技能列表
        const skills = skillText.split(/[,，、\s]+/).filter(s => s.length > 1 && s.length < 30);
        skills.forEach(skill => {
          if (skill.trim()) {
            skillSet.add(skill.trim());
          }
        });
      }
    });

    return Array.from(skillSet);
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
