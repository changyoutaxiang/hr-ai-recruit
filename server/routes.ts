import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertJobSchema,
  insertCandidateSchema,
  insertInterviewSchema,
  insertActivityLogSchema,
  insertNotificationSchema,
  insertCommentSchema
} from "@shared/schema";
import { aiService } from "./services/aiService";
import { resumeParserService } from "./services/resumeParser";
import { enhancedResumeParser } from "./services/resumeParserEnhanced";
import { targetedResumeAnalyzer } from "./services/targetedResumeAnalyzer";
import { matchingService } from "./services/matchingService";
import { promptTemplateService } from "./services/promptTemplates";
import { candidateProfileService } from "./services/candidateProfileService";
import { organizationalFitService } from "./services/organizationalFitService";
import { companyConfigService } from "./services/companyConfigService";
import { ObjectStorageService } from "./objectStorage";
import { requireAuth, requireRole, type AuthRequest } from "./middleware/auth";
import multer from "multer";

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {

  // User routes
  app.get("/api/users/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      // 防止越权访问：用户只能获取自己的信息，除非是管理员
      if (req.params.id !== req.user?.id && req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Forbidden: Cannot access other user's data" });
      }

      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.post("/api/users", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id, email, fullName, role } = req.body;

      // 防止越权创建：用户只能创建自己的记录，且必须匹配 JWT 中的用户 ID
      if (id !== req.user?.id) {
        return res.status(403).json({ error: "Forbidden: Cannot create user for different ID" });
      }

      const user = await storage.createUser({
        id,
        email,
        fullName: fullName || null,
        role: role || 'recruiter',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  // Object storage routes
  app.post("/api/objects/upload", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Prompt template routes
  app.get("/api/prompt-templates", async (req, res) => {
    try {
      const { category } = req.query;
      
      let templates;
      if (category && typeof category === "string") {
        templates = await promptTemplateService.getTemplatesByCategory(category as any);
      } else {
        templates = await promptTemplateService.getTemplates();
      }
      
      res.json(templates);
    } catch (error) {
      console.error("Error fetching prompt templates:", error);
      res.status(500).json({ error: "Failed to fetch prompt templates" });
    }
  });

  app.get("/api/prompt-templates/:id", async (req, res) => {
    try {
      const template = await promptTemplateService.getTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching prompt template:", error);
      res.status(500).json({ error: "Failed to fetch prompt template" });
    }
  });

  app.post("/api/prompt-templates", async (req, res) => {
    try {
      const template = await promptTemplateService.createTemplate(req.body);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating prompt template:", error);
      res.status(500).json({ error: "Failed to create prompt template" });
    }
  });

  app.put("/api/prompt-templates/:id", async (req, res) => {
    try {
      const template = await promptTemplateService.updateTemplate(req.params.id, req.body);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error updating prompt template:", error);
      res.status(500).json({ error: "Failed to update prompt template" });
    }
  });

  app.delete("/api/prompt-templates/:id", async (req, res) => {
    try {
      const deleted = await promptTemplateService.deleteTemplate(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting prompt template:", error);
      res.status(500).json({ error: "Failed to delete prompt template" });
    }
  });

  // Dashboard metrics
  app.get("/api/dashboard/metrics", async (req, res) => {
    try {
      const [candidates, jobs, interviews] = await Promise.all([
        storage.getCandidates(),
        storage.getJobs(),
        storage.getInterviews()
      ]);

      const totalCandidates = candidates.length;
      const activeJobs = jobs.filter(job => job.status === "active").length;
      const upcomingInterviews = interviews.filter(
        interview => interview.scheduledDate > new Date() && interview.status === "scheduled"
      ).length;

      // Calculate funnel metrics
      const appliedCandidates = candidates.filter(c => c.status === "applied").length;
      const screeningCandidates = candidates.filter(c => c.status === "screening").length;
      const interviewCandidates = candidates.filter(c => c.status === "interview").length;
      const hiredCandidates = candidates.filter(c => c.status === "hired").length;

      const interviewRate = totalCandidates > 0 ? Math.round((interviewCandidates / totalCandidates) * 100) : 0;
      const hireRate = totalCandidates > 0 ? Math.round((hiredCandidates / totalCandidates) * 100) : 0;

      res.json({
        totalCandidates,
        activeJobs,
        upcomingInterviews,
        interviewRate,
        hireRate,
        funnel: {
          applied: appliedCandidates,
          screening: screeningCandidates,
          interview: interviewCandidates,
          hired: hiredCandidates,
        }
      });
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ error: "Failed to fetch metrics" });
    }
  });

  // AI Token usage statistics
  app.get("/api/ai/token-usage", async (req, res) => {
    try {
      const { startDate, endDate, userId, model } = req.query;

      // Build query filters
      const conversations = await storage.getAiConversations();

      // Filter conversations
      let filtered = conversations;

      if (startDate) {
        const start = new Date(startDate as string);
        filtered = filtered.filter(c => c.createdAt && c.createdAt >= start);
      }

      if (endDate) {
        const end = new Date(endDate as string);
        filtered = filtered.filter(c => c.createdAt && c.createdAt <= end);
      }

      if (userId) {
        filtered = filtered.filter(c => c.userId === userId);
      }

      if (model) {
        filtered = filtered.filter(c => c.modelUsed === model);
      }

      // Calculate statistics
      const totalTokens = filtered.reduce((sum, c) => sum + (c.tokensUsed || 0), 0);
      const totalConversations = filtered.length;
      const averageTokensPerConversation = totalConversations > 0 ? Math.round(totalTokens / totalConversations) : 0;

      // Group by model
      const byModel: Record<string, { count: number; tokens: number }> = {};
      filtered.forEach(c => {
        const modelName = c.modelUsed || 'unknown';
        if (!byModel[modelName]) {
          byModel[modelName] = { count: 0, tokens: 0 };
        }
        byModel[modelName].count++;
        byModel[modelName].tokens += c.tokensUsed || 0;
      });

      // Group by date (for trend analysis)
      const byDate: Record<string, number> = {};
      filtered.forEach(c => {
        if (c.createdAt) {
          const date = c.createdAt.toISOString().split('T')[0];
          byDate[date] = (byDate[date] || 0) + (c.tokensUsed || 0);
        }
      });

      // Estimate cost (approximate OpenRouter pricing)
      // GPT-5: $0.015/1K input, $0.06/1K output (average ~$0.04/1K)
      // Gemini 2.5 Flash: $0.00007/1K input, $0.00028/1K output (average ~$0.0002/1K)
      const costEstimates: Record<string, number> = {
        'openai/gpt-5': 0.04,
        'openai/gpt-5-chat': 0.04,
        'google/gemini-2.5-pro': 0.0015,
        'google/gemini-2.5-flash': 0.0002,
        'anthropic/claude-sonnet-4': 0.015,
      };

      let estimatedCost = 0;
      Object.entries(byModel).forEach(([model, data]) => {
        const costPer1K = costEstimates[model] || 0.001; // default fallback
        estimatedCost += (data.tokens / 1000) * costPer1K;
      });

      res.json({
        summary: {
          totalTokens,
          totalConversations,
          averageTokensPerConversation,
          estimatedCost: Math.round(estimatedCost * 100) / 100, // round to 2 decimals
        },
        byModel,
        byDate,
        period: {
          start: startDate || (filtered.length > 0 ? filtered[0].createdAt : null),
          end: endDate || (filtered.length > 0 ? filtered[filtered.length - 1].createdAt : null),
        },
      });
    } catch (error) {
      console.error("Error fetching token usage:", error);
      res.status(500).json({ error: "Failed to fetch token usage statistics" });
    }
  });

  // Jobs routes
  app.get("/api/jobs", async (req, res) => {
    try {
      const jobs = await storage.getJobs();
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  });

  app.get("/api/jobs/:id", async (req, res) => {
    try {
      const job = await storage.getJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      res.json(job);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch job" });
    }
  });

  app.post("/api/jobs", async (req, res) => {
    try {
      const jobData = insertJobSchema.parse(req.body);
      const job = await storage.createJob(jobData);
      res.status(201).json(job);
    } catch (error) {
      res.status(400).json({ error: "Invalid job data" });
    }
  });

  app.put("/api/jobs/:id", async (req, res) => {
    try {
      const job = await storage.updateJob(req.params.id, req.body);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      res.json(job);
    } catch (error) {
      res.status(500).json({ error: "Failed to update job" });
    }
  });

  app.delete("/api/jobs/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteJob(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Job not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete job" });
    }
  });

  app.post("/api/jobs/:id/find-matches", async (req, res) => {
    try {
      const job = await storage.getJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      const candidates = await storage.getCandidates();
      const matches = await matchingService.findMatchingCandidates(job, candidates);

      for (const match of matches) {
        await storage.createJobMatch({
          candidateId: match.candidate.id,
          jobId: job.id,
          matchScore: match.matchScore.toString(),
          matchReasons: match.reasons,
          aiAnalysis: match.explanation,
        });
      }

      res.json({ matches });
    } catch (error) {
      console.error("Error finding matches:", error);
      res.status(500).json({ error: "Failed to find matches" });
    }
  });

  app.get("/api/jobs/:id/matches", async (req, res) => {
    try {
      const matches = await storage.getJobMatchesForJob(req.params.id);

      const enrichedMatches = await Promise.all(
        matches.map(async (match) => {
          const candidate = await storage.getCandidate(match.candidateId);
          return {
            ...match,
            candidate,
          };
        })
      );

      enrichedMatches.sort((a, b) =>
        parseFloat(b.matchScore as string) - parseFloat(a.matchScore as string)
      );

      res.json(enrichedMatches);
    } catch (error) {
      console.error("Error fetching job matches:", error);
      res.status(500).json({ error: "Failed to fetch job matches" });
    }
  });

  // Candidates routes
  app.get("/api/candidates", async (req, res) => {
    try {
      const { search } = req.query;
      let candidates;
      
      if (search && typeof search === "string") {
        candidates = await storage.searchCandidates(search);
      } else {
        candidates = await storage.getCandidates();
      }
      
      res.json(candidates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch candidates" });
    }
  });

  app.get("/api/candidates/:id", async (req, res) => {
    try {
      const candidate = await storage.getCandidate(req.params.id);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      res.json(candidate);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch candidate" });
    }
  });

  app.post("/api/candidates", async (req, res) => {
    try {
      const candidateData = insertCandidateSchema.parse(req.body);
      const candidate = await storage.createCandidate(candidateData);
      res.status(201).json(candidate);
    } catch (error) {
      res.status(400).json({ error: "Invalid candidate data" });
    }
  });

  app.put("/api/candidates/:id", async (req, res) => {
    try {
      const candidate = await storage.updateCandidate(req.params.id, req.body);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      res.json(candidate);
    } catch (error) {
      res.status(500).json({ error: "Failed to update candidate" });
    }
  });

  app.delete("/api/candidates/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteCandidate(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete candidate" });
    }
  });

  app.post("/api/candidates/:id/find-matches", async (req, res) => {
    try {
      const candidate = await storage.getCandidate(req.params.id);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      const jobs = await storage.getJobs();
      const activeJobs = jobs.filter(job => job.status === "active");

      const matchesWithJobs = [];
      for (const job of activeJobs) {
        try {
          const matchResult = await aiService.matchCandidateToJob(
            {
              skills: (candidate.skills as string[]) || [],
              experience: candidate.experience || 0,
              education: candidate.education || "",
              position: candidate.position || "",
            },
            {
              title: job.title,
              requirements: (job.requirements as string[]) || [],
              description: job.description,
            }
          );

          // 记录 Token 使用
          try {
            await storage.createAiConversation({
              userId: "system",
              sessionId: `candidate-match-${candidate.id}`,
              message: `Match candidate ${candidate.name} to job ${job.title}`,
              response: JSON.stringify(matchResult.match),
              modelUsed: matchResult.model,
              tokensUsed: matchResult.usage.totalTokens,
            });
          } catch (error) {
            console.error('[Token Tracking] Failed to record match token usage:', error);
          }

          await storage.createJobMatch({
            candidateId: candidate.id,
            jobId: job.id,
            matchScore: matchResult.match.score.toString(),
            matchReasons: matchResult.match.reasons,
            aiAnalysis: matchResult.match.explanation,
          });

          matchesWithJobs.push({
            job,
            matchScore: matchResult.match.score,
            reasons: matchResult.match.reasons,
            explanation: matchResult.match.explanation,
          });
        } catch (error) {
          console.error(`Error matching job ${job.id}:`, error);
        }
      }

      matchesWithJobs.sort((a, b) => b.matchScore - a.matchScore);

      res.json({ matches: matchesWithJobs });
    } catch (error) {
      console.error("Error finding matches:", error);
      res.status(500).json({ error: "Failed to find matches" });
    }
  });

  app.get("/api/candidates/:id/matches", async (req, res) => {
    try {
      const matches = await storage.getJobMatchesForCandidate(req.params.id);

      const enrichedMatches = await Promise.all(
        matches.map(async (match) => {
          const job = await storage.getJob(match.jobId);
          return {
            ...match,
            job,
          };
        })
      );

      enrichedMatches.sort((a, b) =>
        parseFloat(b.matchScore as string) - parseFloat(a.matchScore as string)
      );

      res.json(enrichedMatches);
    } catch (error) {
      console.error("Error fetching candidate matches:", error);
      res.status(500).json({ error: "Failed to fetch candidate matches" });
    }
  });

  // Resume upload and parsing
  app.post("/api/candidates/:id/resume", upload.single("resume"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const candidate = await storage.getCandidate(req.params.id);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      // 检查是否提供了岗位ID用于针对性分析
      const { jobId } = req.body;
      const useTargetedAnalysis = !!jobId;

      // 检查是否应该使用视觉分析（PDF 文件且启用视觉模式）
      const useVision = req.file.mimetype === "application/pdf" &&
                        process.env.ENABLE_VISION_PARSING !== "false";

      console.log(`[Resume Upload] Processing with ${useVision ? 'vision' : 'text'} mode${useTargetedAnalysis ? ' and targeted analysis' : ''} for ${req.file.originalname}`);

      let aiAnalysis;
      let parsedText: string;
      let contactInfo;
      let skills: string[] = [];
      let experience = 0;
      let targetedAnalysis = null;
      let interviewerBrief = null;

      // 如果提供了岗位ID，执行针对性分析
      if (useTargetedAnalysis) {
        try {
          const job = await storage.getJob(jobId);
          if (job) {
            console.log(`[Resume Upload] Performing targeted analysis for job: ${job.title}`);

            const jobContext = {
              title: job.title,
              description: job.description,
              requirements: job.requirements,
              focusAreas: job.focusAreas || [],
            };

            targetedAnalysis = await targetedResumeAnalyzer.analyzeForPosition(
              req.file.buffer,
              req.file.mimetype,
              jobContext
            );

            interviewerBrief = targetedResumeAnalyzer.generateInterviewerBrief(targetedAnalysis);

            // 使用针对性分析结果
            aiAnalysis = {
              summary: targetedAnalysis.basicInfo.summary,
              skills: targetedAnalysis.skillsAssessment.technicalSkills.map(s => s.skill),
              experience: targetedAnalysis.experienceAnalysis.totalRelevantYears,
              education: targetedAnalysis.basicInfo.summary,
              strengths: targetedAnalysis.keyInsights.uniqueSellingPoints,
              weaknesses: targetedAnalysis.risksAndConcerns.redFlags.map(r => r.concern),
              recommendations: targetedAnalysis.interviewRecommendations.focusAreas
            };

            skills = aiAnalysis.skills;
            experience = aiAnalysis.experience;
            parsedText = targetedAnalysis.basicInfo.summary;
            contactInfo = targetedAnalysis.basicInfo.contact;

            console.log(`[Resume Upload] Targeted analysis completed with score: ${targetedAnalysis.jobFitAnalysis.overallScore}`);
          }
        } catch (error) {
          console.error(`[Resume Upload] Targeted analysis failed:`, error);
        }
      }

      // 如果没有进行针对性分析，使用原有的分析流程
      if (!targetedAnalysis) {
        if (useVision) {
        try {
          // 使用增强版解析器（GPT-5 多模态）
          const enhanced = await enhancedResumeParser.parse(
            req.file.buffer,
            req.file.mimetype,
            true // 使用视觉模式
          );

          parsedText = enhanced.text;
          aiAnalysis = enhanced.analysis;

          // 从视觉分析中提取信息
          skills = enhanced.analysis.skills;
          experience = enhanced.analysis.experience;

          // 尝试从文本提取联系信息作为补充
          contactInfo = resumeParserService.extractContactInfo(parsedText);

          console.log(`[Resume Upload] Vision analysis completed successfully`);
        } catch (error) {
          console.error(`[Resume Upload] Vision analysis failed, falling back to text mode:`, error);

          // 回退到传统文本分析
          const parsedResume = await resumeParserService.parseFile(
            req.file.buffer,
            req.file.mimetype
          );

          parsedText = parsedResume.text;
          contactInfo = resumeParserService.extractContactInfo(parsedText);
          skills = resumeParserService.extractSkills(parsedText);
          experience = resumeParserService.extractExperience(parsedText);

          // 修复：正确处理返回值并记录 token
          const analysisResult = await aiService.analyzeResume(parsedText);
          aiAnalysis = analysisResult.analysis;

          // 记录 token 使用
          await storage.createAiConversation({
            userId: "system",
            sessionId: `resume-parse-${req.params.id}`,
            message: `Analyze resume for candidate ${candidate.name}`,
            response: JSON.stringify(aiAnalysis),
            modelUsed: analysisResult.model,
            tokensUsed: analysisResult.usage.totalTokens,
          });
        }
      } else {
        // 使用传统文本分析
        const parsedResume = await resumeParserService.parseFile(
          req.file.buffer,
          req.file.mimetype
        );

        parsedText = parsedResume.text;
        contactInfo = resumeParserService.extractContactInfo(parsedText);
        skills = resumeParserService.extractSkills(parsedText);
        experience = resumeParserService.extractExperience(parsedText);

        // 修复：正确处理返回值并记录 token
        const analysisResult = await aiService.analyzeResume(parsedText);
        aiAnalysis = analysisResult.analysis;

        // 记录 token 使用
        await storage.createAiConversation({
          userId: "system",
          sessionId: `resume-parse-${req.params.id}`,
          message: `Analyze resume for candidate ${candidate.name}`,
          response: JSON.stringify(aiAnalysis),
          modelUsed: analysisResult.model,
          tokensUsed: analysisResult.usage.totalTokens,
        });
      }

      }

      // Update candidate with parsed information
      const updatedCandidate = await storage.updateCandidate(req.params.id, {
        resumeText: parsedText,
        skills: skills.length > 0 ? skills : aiAnalysis.skills,
        experience: experience > 0 ? experience : aiAnalysis.experience,
        aiSummary: interviewerBrief || aiAnalysis.summary,  // 优先使用面试官简报
        name: contactInfo?.name || candidate.name,
        email: contactInfo?.email || candidate.email,
        phone: contactInfo?.phone || candidate.phone,
      });

      let initialProfile = null;
      let profileError = null;

      try {
        console.log(`[Resume Upload] Auto-generating initial profile for candidate ${req.params.id}`);

        const resumeAnalysisForProfile = {
          summary: aiAnalysis.summary,
          skills: skills.length > 0 ? skills : aiAnalysis.skills,
          experience: experience > 0 ? experience : aiAnalysis.experience,
          education: candidate.education || "",
          strengths: aiAnalysis.strengths || [],
          weaknesses: aiAnalysis.weaknesses || [],
        };

        initialProfile = await candidateProfileService.buildInitialProfile(
          req.params.id,
          resumeAnalysisForProfile
        );

        console.log(`[Resume Upload] Initial profile v${initialProfile.version} created successfully`);
      } catch (error) {
        profileError = error instanceof Error ? error.message : "Failed to generate profile";
        console.error(`[Resume Upload] Failed to auto-generate profile:`, error);
      }

      res.json({
        candidate: updatedCandidate,
        analysis: aiAnalysis,
        parsedData: {
          contactInfo,
          skills,
          experience,
          metadata: { analysisMode: targetedAnalysis ? 'targeted' : (useVision ? 'vision' : 'text') },
        },
        // 如果有针对性分析，包含详细结果
        targetedAnalysis: targetedAnalysis ? {
          overallScore: targetedAnalysis.jobFitAnalysis.overallScore,
          matchedRequirements: targetedAnalysis.jobFitAnalysis.matchedRequirements,
          missingRequirements: targetedAnalysis.jobFitAnalysis.missingRequirements,
          keyInsights: targetedAnalysis.keyInsights,
          interviewRecommendations: targetedAnalysis.interviewRecommendations,
          risksAndConcerns: targetedAnalysis.risksAndConcerns,
          interviewerBrief: interviewerBrief,
        } : null,
        profile: initialProfile ? {
          id: initialProfile.id,
          version: initialProfile.version,
          generated: true,
        } : null,
        profileError: profileError,
      });
    } catch (error) {
      console.error("Error processing resume:", error);
      res.status(500).json({ error: "Failed to process resume" });
    }
  });

  // 针对特定岗位的简历深度分析
  app.post("/api/candidates/:id/targeted-analysis", upload.single("resume"), async (req, res) => {
    try {
      const { jobId } = req.body;

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      if (!jobId) {
        return res.status(400).json({ error: "Job ID is required for targeted analysis" });
      }

      const candidate = await storage.getCandidate(req.params.id);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      console.log(`[Targeted Analysis] Starting for candidate ${candidate.name} and job ${job.title}`);

      // 构建岗位上下文
      const jobContext = {
        title: job.title,
        description: job.description,
        requirements: job.requirements,
        focusAreas: job.focusAreas || [], // 假设我们可以在 job 表中添加这个字段
      };

      // 执行针对性分析
      const targetedAnalysis = await targetedResumeAnalyzer.analyzeForPosition(
        req.file.buffer,
        req.file.mimetype,
        jobContext
      );

      // 生成面试官简报
      const interviewerBrief = targetedResumeAnalyzer.generateInterviewerBrief(targetedAnalysis);

      // 更新候选人信息
      const updatedCandidate = await storage.updateCandidate(req.params.id, {
        resumeText: targetedAnalysis.basicInfo.summary,
        skills: targetedAnalysis.skillsAssessment.technicalSkills.map(s => s.skill),
        experience: targetedAnalysis.experienceAnalysis.totalRelevantYears,
        aiSummary: interviewerBrief,
        targetedAnalysis: JSON.stringify(targetedAnalysis), // 存储完整分析结果
      });

      // 如果分析成功，也创建或更新匹配记录
      if (targetedAnalysis.jobFitAnalysis.overallScore > 0) {
        const existingMatch = await storage.getJobMatch(jobId, req.params.id);

        if (existingMatch) {
          await storage.updateJobMatch(existingMatch.id, {
            score: targetedAnalysis.jobFitAnalysis.overallScore,
            analysis: JSON.stringify({
              targeted: true,
              ...targetedAnalysis.jobFitAnalysis
            }),
          });
        } else {
          await storage.createJobMatch({
            jobId,
            candidateId: req.params.id,
            score: targetedAnalysis.jobFitAnalysis.overallScore,
            status: "pending",
            analysis: JSON.stringify({
              targeted: true,
              ...targetedAnalysis.jobFitAnalysis
            }),
          });
        }
      }

      console.log(`[Targeted Analysis] Completed with score ${targetedAnalysis.jobFitAnalysis.overallScore}`);

      res.json({
        candidate: updatedCandidate,
        analysis: targetedAnalysis,
        interviewerBrief,
        matchScore: targetedAnalysis.jobFitAnalysis.overallScore
      });

    } catch (error) {
      console.error("Error in targeted resume analysis:", error);
      res.status(500).json({ error: "Failed to perform targeted analysis" });
    }
  });

  app.get("/api/candidates/:id/profiles", async (req, res) => {
    try {
      const { id } = req.params;

      const candidate = await storage.getCandidate(id);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      const profiles = await candidateProfileService.getProfileEvolution(id);
      res.json(profiles);
    } catch (error) {
      console.error("Error fetching candidate profiles:", error);
      res.status(500).json({ error: "Failed to fetch candidate profiles" });
    }
  });

  app.get("/api/candidates/:id/profiles/latest", async (req, res) => {
    try {
      const { id } = req.params;

      const candidate = await storage.getCandidate(id);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      const profile = await storage.getLatestCandidateProfile(id);
      if (!profile) {
        return res.status(404).json({ error: "No profile found for this candidate" });
      }
      res.json(profile);
    } catch (error) {
      console.error("Error fetching latest candidate profile:", error);
      res.status(500).json({ error: "Failed to fetch latest candidate profile" });
    }
  });

  app.get("/api/candidates/:id/profiles/:version", async (req, res) => {
    try {
      const { id, version: versionParam } = req.params;

      const candidate = await storage.getCandidate(id);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      const version = parseInt(versionParam);
      if (isNaN(version) || version < 1) {
        return res.status(400).json({ error: "Invalid version number" });
      }

      const profile = await storage.getCandidateProfileByVersion(id, version);
      if (!profile) {
        return res.status(404).json({ error: "Profile version not found" });
      }
      res.json(profile);
    } catch (error) {
      console.error("Error fetching candidate profile by version:", error);
      res.status(500).json({ error: "Failed to fetch candidate profile" });
    }
  });

  app.post("/api/candidates/:id/profiles/build", async (req, res) => {
    try {
      const { id } = req.params;

      const candidate = await storage.getCandidate(id);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      if (!candidate.resumeText || !candidate.aiSummary) {
        return res.status(400).json({
          error: "Candidate must have resume analysis before building profile"
        });
      }

      const resumeAnalysis = {
        summary: candidate.aiSummary || "",
        skills: (candidate.skills as string[]) || [],
        experience: candidate.experience || 0,
        education: candidate.education || "",
        strengths: [],
        weaknesses: [],
        recommendations: []
      };

      const { jobId } = req.body;

      if (jobId && typeof jobId !== 'string') {
        return res.status(400).json({ error: "Invalid jobId format" });
      }

      if (jobId) {
        const job = await storage.getJob(jobId);
        if (!job) {
          return res.status(404).json({ error: "Job not found" });
        }
      }

      console.log(`[API] Building profile for candidate ${id}${jobId ? ` with job ${jobId}` : ''}`);

      const profile = await candidateProfileService.buildInitialProfile(
        id,
        resumeAnalysis,
        jobId
      );

      res.status(201).json(profile);
    } catch (error) {
      console.error("Error building candidate profile:", error);
      const isDev = process.env.NODE_ENV === 'development';
      res.status(500).json({
        error: "Failed to build candidate profile",
        ...(isDev && { details: error instanceof Error ? error.message : String(error) })
      });
    }
  });

  app.post("/api/candidates/:candidateId/profiles/update-from-interview/:interviewId", async (req, res) => {
    try {
      const { candidateId, interviewId } = req.params;

      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      const interview = await storage.getInterview(interviewId);
      if (!interview) {
        return res.status(404).json({ error: "Interview not found" });
      }

      if (interview.candidateId !== candidateId) {
        return res.status(400).json({ error: "Interview does not belong to this candidate" });
      }

      console.log(`[API] Updating profile for candidate ${candidateId} from interview ${interviewId}`);

      const profile = await candidateProfileService.updateProfileWithInterview(
        candidateId,
        interviewId
      );

      res.json(profile);
    } catch (error) {
      console.error("Error updating candidate profile:", error);
      const isDev = process.env.NODE_ENV === 'development';
      res.status(500).json({
        error: "Failed to update candidate profile",
        ...(isDev && { details: error instanceof Error ? error.message : String(error) })
      });
    }
  });

  // 组织契合度评估 API
  app.post("/api/candidates/:candidateId/organizational-fit", async (req, res) => {
    try {
      const { candidateId } = req.params;
      const { stage = "resume", jobId } = req.body;

      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      let job = undefined;
      if (jobId) {
        job = await storage.getJob(jobId);
      }

      // 准备评估数据
      const assessmentData = {
        candidateName: candidate.name,
        stage,
        resumeSummary: candidate.resumeAnalysis?.summary || "",
        skills: candidate.resumeAnalysis?.skills || [],
        experience: candidate.resumeAnalysis?.experience || 0,
        jobTitle: job?.title,
        jobDescription: job?.description,
        jobRequirements: job?.requirements
      };

      // 并行执行文化和领导力评估
      const [cultureAssessment, leadershipAssessment] = await Promise.all([
        organizationalFitService.assessCultureFit(assessmentData, stage),
        organizationalFitService.assessLeadershipFramework(assessmentData, stage)
      ]);

      res.json({
        candidateId,
        stage,
        cultureAssessment,
        leadershipAssessment,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error assessing organizational fit:", error);
      res.status(500).json({
        error: "Failed to assess organizational fit",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // 获取组织契合度演化报告
  app.get("/api/candidates/:candidateId/organizational-fit/evolution", async (req, res) => {
    try {
      const { candidateId } = req.params;

      const profiles = await storage.getCandidateProfiles(candidateId);
      if (!profiles.length) {
        return res.status(404).json({ error: "No profiles found for candidate" });
      }

      const cultureHistory = [];
      const leadershipHistory = [];

      for (const profile of profiles) {
        const profileData = profile.profileData as any;
        if (profileData?.organizationalFit) {
          if (profileData.organizationalFit.cultureAssessment) {
            cultureHistory.push(profileData.organizationalFit.cultureAssessment);
          }
          if (profileData.organizationalFit.leadershipAssessment) {
            leadershipHistory.push(profileData.organizationalFit.leadershipAssessment);
          }
        }
      }

      const evolutionReport = organizationalFitService.generateEvolutionReport(
        cultureHistory,
        leadershipHistory
      );

      res.json({
        candidateId,
        evolutionReport,
        assessmentCount: profiles.length,
        latestStage: profiles[profiles.length - 1].stage
      });
    } catch (error) {
      console.error("Error generating evolution report:", error);
      res.status(500).json({
        error: "Failed to generate evolution report",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // 公司配置 API
  app.get("/api/company/config", async (req, res) => {
    try {
      const config = await companyConfigService.getCurrentConfig();
      res.json(config);
    } catch (error) {
      console.error("Error getting company config:", error);
      res.status(500).json({
        error: "Failed to get company configuration",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.put("/api/company/config", async (req, res) => {
    try {
      const updatedConfig = await companyConfigService.updateConfig(req.body);
      res.json(updatedConfig);
    } catch (error) {
      console.error("Error updating company config:", error);
      res.status(500).json({
        error: "Failed to update company configuration",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/company/config/culture-values", async (req, res) => {
    try {
      const values = await companyConfigService.getCultureValues();
      res.json(values);
    } catch (error) {
      console.error("Error getting culture values:", error);
      res.status(500).json({
        error: "Failed to get culture values",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/company/config/leadership-dimensions", async (req, res) => {
    try {
      const dimensions = await companyConfigService.getLeadershipDimensions();
      res.json(dimensions);
    } catch (error) {
      console.error("Error getting leadership dimensions:", error);
      res.status(500).json({
        error: "Failed to get leadership dimensions",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/company/config/interview-questions/:stage", async (req, res) => {
    try {
      const { stage } = req.params;
      const questions = await companyConfigService.generateInterviewQuestions(
        stage as "interview_1" | "interview_2" | "final_evaluation"
      );
      res.json(questions);
    } catch (error) {
      console.error("Error generating interview questions:", error);
      res.status(500).json({
        error: "Failed to generate interview questions",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Interview feedback and profile update
  app.post("/api/interviews/:id/feedback", async (req, res) => {
    try {
      const interviewId = req.params.id;
      const feedback = req.body;

      // 获取面试信息
      const interview = await storage.getInterview(interviewId);
      if (!interview) {
        return res.status(404).json({ error: "Interview not found" });
      }

      // 导入服务（延迟导入避免循环依赖）
      const { interviewFeedbackService } = await import("./services/interviewFeedbackService");

      // 提交反馈并自动更新候选人画像
      const updatedProfile = await interviewFeedbackService.submitFeedbackAndUpdateProfile(
        interview.candidateId,
        interview.jobId,
        feedback
      );

      res.json({
        success: true,
        message: "Feedback submitted and profile updated",
        profileId: updatedProfile.id,
        profileVersion: updatedProfile.version,
        newStage: updatedProfile.stage
      });
    } catch (error) {
      console.error("Error submitting interview feedback:", error);
      res.status(500).json({
        error: "Failed to submit feedback",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // 获取候选人的面试进程
  app.get("/api/candidates/:candidateId/interview-process", async (req, res) => {
    try {
      const { candidateId } = req.params;
      const { jobId } = req.query;

      if (!jobId) {
        return res.status(400).json({ error: "jobId is required" });
      }

      const { interviewFeedbackService } = await import("./services/interviewFeedbackService");
      const process = await interviewFeedbackService.getCandidateInterviewProcess(
        candidateId,
        jobId as string
      );

      res.json(process);
    } catch (error) {
      console.error("Error getting interview process:", error);
      res.status(500).json({
        error: "Failed to get interview process",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // AI-powered candidate matching
  app.post("/api/jobs/:jobId/match-candidates", async (req, res) => {
    try {
      const job = await storage.getJob(req.params.jobId);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      const candidates = await storage.getCandidates();
      const matches = await matchingService.findMatchingCandidates(job, candidates);

      res.json(matches);
    } catch (error) {
      console.error("Error matching candidates:", error);
      res.status(500).json({ error: "Failed to match candidates" });
    }
  });

  // Enhanced candidate matching with specific scores
  app.post("/api/candidates/:candidateId/calculate-match", async (req, res) => {
    try {
      const { jobId } = req.body;
      
      const [candidate, job] = await Promise.all([
        storage.getCandidate(req.params.candidateId),
        storage.getJob(jobId)
      ]);

      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      // Calculate both basic and AI-powered match
      const basicMatch = matchingService.calculateBasicMatch(candidate, job);

      let aiMatch;
      try {
        const matchResult = await aiService.matchCandidateToJob(
          {
            skills: (candidate.skills as string[]) || [],
            experience: candidate.experience || 0,
            education: candidate.education || "",
            position: candidate.position || "",
          },
          {
            title: job.title,
            requirements: (job.requirements as string[]) || [],
            description: job.description,
          }
        );

        // Extract the match object from the result
        aiMatch = matchResult.match;

        // Record token usage for AI matching
        try {
          await storage.createAiConversation({
            userId: "system",
            sessionId: `calculate-match-${candidate.id}-${jobId}`,
            message: `Calculate detailed match score for candidate ${candidate.name} and job ${job.title}`,
            response: JSON.stringify(matchResult.match),
            modelUsed: matchResult.model,
            tokensUsed: matchResult.usage.totalTokens,
          });
        } catch (tokenError) {
          console.error('[Token Tracking] Failed to record match token usage:', tokenError);
        }
      } catch (error) {
        console.error("AI match failed, using basic match:", error);
        aiMatch = { score: basicMatch, reasons: ["Basic matching used"], explanation: "AI matching unavailable" };
      }

      // Update candidate's match score
      await storage.updateCandidate(req.params.candidateId, {
        matchScore: aiMatch.score.toString(),
      });

      res.json({
        candidateId: candidate.id,
        jobId: job.id,
        basicMatchScore: basicMatch,
        aiMatchScore: aiMatch.score,
        reasons: aiMatch.reasons,
        explanation: aiMatch.explanation,
      });
    } catch (error) {
      console.error("Error calculating match:", error);
      res.status(500).json({ error: "Failed to calculate match" });
    }
  });

  // Interviews routes
  app.get("/api/interviews", async (req, res) => {
    try {
      const { candidateId, jobId } = req.query;
      
      let interviews;
      if (candidateId && typeof candidateId === "string") {
        interviews = await storage.getInterviewsByCandidate(candidateId);
      } else if (jobId && typeof jobId === "string") {
        interviews = await storage.getInterviewsByJob(jobId);
      } else {
        interviews = await storage.getInterviews();
      }
      
      res.json(interviews);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch interviews" });
    }
  });

  app.get("/api/interviews/:id", async (req, res) => {
    try {
      const interview = await storage.getInterview(req.params.id);
      if (!interview) {
        return res.status(404).json({ error: "Interview not found" });
      }
      res.json(interview);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch interview" });
    }
  });

  app.post("/api/interviews", async (req, res) => {
    try {
      const interviewData = insertInterviewSchema.parse(req.body);
      const interview = await storage.createInterview(interviewData);

      // 异步生成面试准备材料（不阻塞响应）
      if (interview.candidateId && interview.status === "scheduled") {
        // 先检查是否已存在准备材料，避免重复生成
        storage.getInterviewPreparation(interview.id).then(existingPrep => {
          if (!existingPrep) {
            return candidateProfileService.generateInterviewPreparation(
              interview.candidateId,
              interview.id,
              interview.interviewerId || undefined
            ).then(preparation => {
              console.log(`[Interview] Auto-generated preparation ${preparation.id} for interview ${interview.id}`);
            });
          } else {
            console.log(`[Interview] Preparation already exists for interview ${interview.id}`);
          }
        }).catch(error => {
          console.error(`[Interview] Failed to auto-generate preparation for interview ${interview.id}:`, error);
        });
      }

      res.status(201).json(interview);
    } catch (error) {
      res.status(400).json({ error: "Invalid interview data" });
    }
  });

  app.put("/api/interviews/:id", async (req, res) => {
    try {
      const existingInterview = await storage.getInterview(req.params.id);
      if (!existingInterview) {
        return res.status(404).json({ error: "Interview not found" });
      }

      const interview = await storage.updateInterview(req.params.id, req.body);
      if (!interview) {
        return res.status(404).json({ error: "Interview not found" });
      }

      let updatedProfile = null;
      let profileError = null;

      const isJustCompleted =
        existingInterview.status !== "completed" &&
        interview.status === "completed";

      const hasNewFeedback =
        !existingInterview.feedback && interview.feedback ||
        !existingInterview.transcription && interview.transcription;

      const shouldUpdateProfile = (isJustCompleted || hasNewFeedback) &&
        (interview.feedback || interview.transcription);

      if (shouldUpdateProfile && interview.candidateId) {
        try {
          console.log(`[Interview Update] Auto-updating profile for candidate ${interview.candidateId} after interview ${interview.id}`);

          updatedProfile = await candidateProfileService.updateProfileFromInterview(
            interview.candidateId,
            interview.id,
            interview.jobId || undefined
          );

          console.log(`[Interview Update] Profile updated to v${updatedProfile.version} (stage: ${updatedProfile.stage})`);
        } catch (error) {
          profileError = error instanceof Error ? error.message : "Failed to update profile";
          console.error(`[Interview Update] Failed to auto-update profile:`, error);
        }
      }

      res.json({
        interview,
        profile: updatedProfile ? {
          id: updatedProfile.id,
          version: updatedProfile.version,
          stage: updatedProfile.stage,
          updated: true,
        } : null,
        profileError: profileError,
      });
    } catch (error) {
      console.error("Error updating interview:", error);
      res.status(500).json({ error: "Failed to update interview" });
    }
  });

  // Cancel interview endpoint
  app.post("/api/interviews/:id/cancel", async (req, res) => {
    try {
      const existingInterview = await storage.getInterview(req.params.id);
      if (!existingInterview) {
        return res.status(404).json({ error: "Interview not found" });
      }

      if (existingInterview.status === "cancelled") {
        return res.status(400).json({ error: "Interview is already cancelled" });
      }

      if (existingInterview.status === "completed") {
        return res.status(400).json({ error: "Cannot cancel completed interview" });
      }

      const interview = await storage.updateInterview(req.params.id, {
        status: "cancelled",
        updatedAt: new Date(),
      });

      res.json(interview);
    } catch (error) {
      console.error("Error cancelling interview:", error);
      res.status(500).json({ error: "Failed to cancel interview" });
    }
  });

  // Interview Preparation routes
  app.post("/api/interviews/:interviewId/preparation", async (req, res) => {
    try {
      const { interviewId } = req.params;
      const { candidateId, interviewerId } = req.body;

      // 参数验证
      if (!candidateId) {
        return res.status(400).json({ error: "candidateId is required" });
      }

      // 检查面试是否存在
      const interview = await storage.getInterview(interviewId);
      if (!interview) {
        return res.status(404).json({ error: "Interview not found" });
      }

      // 生成面试准备材料
      const preparation = await candidateProfileService.generateInterviewPreparation(
        candidateId,
        interviewId,
        interviewerId || interview.interviewerId
      );

      console.log(`[Interview Preparation] Generated preparation ${preparation.id} for interview ${interviewId}`);
      res.json(preparation);
    } catch (error) {
      console.error("Failed to generate interview preparation:", error);
      res.status(500).json({
        error: "Failed to generate preparation",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/interviews/:interviewId/preparation", async (req, res) => {
    try {
      const { interviewId } = req.params;

      const preparation = await storage.getInterviewPreparation(interviewId);
      if (!preparation) {
        return res.status(404).json({ error: "Preparation not found" });
      }

      // 标记为已查看
      if (!preparation.viewedAt && preparation.id) {
        await storage.updateInterviewPreparation(preparation.id, {
          viewedAt: new Date()
        });
      }

      res.json(preparation);
    } catch (error) {
      console.error("Failed to get interview preparation:", error);
      res.status(500).json({ error: "Failed to get preparation" });
    }
  });

  app.post("/api/interviews/:interviewId/preparation/feedback", async (req, res) => {
    try {
      const { interviewId } = req.params;
      const { rating, comment } = req.body;

      const preparation = await storage.getInterviewPreparation(interviewId);
      if (!preparation || !preparation.id) {
        return res.status(404).json({ error: "Preparation not found" });
      }

      // 验证评分范围
      if (rating && (rating < 1 || rating > 5)) {
        return res.status(400).json({ error: "Rating must be between 1 and 5" });
      }

      const updated = await storage.updateInterviewPreparation(preparation.id, {
        feedbackRating: rating,
        feedbackComment: comment,
      });

      console.log(`[Interview Preparation] Feedback submitted for preparation ${preparation.id}`);
      res.json(updated);
    } catch (error) {
      console.error("Failed to submit preparation feedback:", error);
      res.status(500).json({ error: "Failed to submit feedback" });
    }
  });

  // Interview Transcription API
  app.post("/api/interviews/transcribe", async (req, res) => {
    try {
      const { interviewId } = req.body;
      const audioFile = req.file; // 需要配置multer中间件

      if (!audioFile) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      // 模拟转录过程（实际项目中应该调用语音转文字服务）
      // 可以集成：OpenAI Whisper, Google Speech-to-Text, Azure Speech Services等
      const mockTranscription = `
        面试官：请介绍一下你最近的项目经历。
        候选人：我最近负责了一个电商平台的重构项目，主要负责架构设计和技术选型...
        面试官：在这个项目中遇到的最大挑战是什么？
        候选人：最大的挑战是如何在保证系统稳定性的同时进行架构升级...
      `;

      // 分析关键发现（实际项目中应该使用AI分析）
      const keyFindings = [
        "具有大型项目架构设计经验",
        "熟悉微服务架构",
        "注重系统稳定性",
        "有技术选型决策经验"
      ];

      const concernAreas = [
        "需要进一步了解具体技术细节",
        "团队协作经验需要深入评估"
      ];

      // 更新面试记录
      if (interviewId) {
        await storage.updateInterview(interviewId, {
          transcription: mockTranscription,
          transcriptionMethod: "audio",
        });
      }

      res.json({
        transcription: mockTranscription,
        keyFindings,
        concernAreas,
        confidence: 0.95
      });

    } catch (error) {
      console.error("Transcription error:", error);
      res.status(500).json({ error: "Failed to transcribe audio" });
    }
  });

  // Interview AI Analysis API
  app.post("/api/interviews/ai-analyze", async (req, res) => {
    try {
      const { interviewId, content, candidateInfo } = req.body;

      if (!content) {
        return res.status(400).json({ error: "No content to analyze" });
      }

      // 使用AI服务分析面试内容（集成OpenAI或其他AI服务）
      const analysisPrompt = `
        分析以下面试内容，提取候选人的优势、劣势和关键发现：

        候选人信息：
        姓名：${candidateInfo?.name || "未知"}
        职位：${candidateInfo?.position || "未知"}
        经验：${candidateInfo?.experience || 0}年

        面试内容：
        ${content}

        请提供：
        1. 主要优势（3-5个）
        2. 需要改进的地方（2-3个）
        3. 关键发现
        4. 建议的评分
      `;

      // 模拟AI分析结果（实际项目中调用AI服务）
      const analysisResult = {
        strengths: [
          "扎实的技术基础",
          "良好的问题解决能力",
          "清晰的沟通表达",
          "丰富的项目经验"
        ],
        weaknesses: [
          "领导力经验有限",
          "对新技术了解不够深入"
        ],
        keyFindings: [
          "适合高级工程师职位",
          "有潜力发展为技术负责人",
          "需要加强团队管理能力"
        ],
        concernAreas: [
          "跳槽频率略高",
          "期望薪资可能超出预算"
        ],
        suggestedScores: {
          technical: 85,
          communication: 80,
          problemSolving: 82,
          cultureFit: 75,
          leadership: 65
        },
        suggestions: [
          "建议进行第二轮技术深度面试",
          "评估候选人的团队协作能力",
          "了解候选人的长期职业规划"
        ]
      };

      res.json(analysisResult);

    } catch (error) {
      console.error("AI analysis error:", error);
      res.status(500).json({ error: "Failed to analyze content" });
    }
  });

  // Hiring Decision routes
  app.post("/api/hiring-decisions", async (req, res) => {
    try {
      const { candidateId, jobId } = req.body;

      // 输入验证
      if (!candidateId || !jobId) {
        return res.status(400).json({ error: "candidateId and jobId are required" });
      }

      // 验证 UUID 格式（简单验证）
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(candidateId) || !uuidRegex.test(jobId)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }

      // 检查候选人和职位是否存在
      const [candidate, job] = await Promise.all([
        storage.getCandidate(candidateId),
        storage.getJob(jobId)
      ]);

      if (!candidate || !job) {
        return res.status(404).json({ error: "Candidate or job not found" });
      }

      // 导入服务
      const { hiringDecisionService } = await import("./services/hiringDecisionService");

      // 生成招聘决策
      const decision = await hiringDecisionService.generateHiringDecision(
        candidateId,
        jobId,
        req.user?.id // 如果有用户认证系统，传递用户ID
      );

      console.log(`[HiringDecision] Generated decision ${decision.id} for candidate ${candidateId} and job ${jobId}`);
      res.json(decision);

    } catch (error) {
      console.error("Failed to generate hiring decision:", error);
      res.status(500).json({
        error: "Failed to generate hiring decision",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/hiring-decisions/:candidateId/:jobId", async (req, res) => {
    try {
      const { candidateId, jobId } = req.params;
      const decision = await storage.getHiringDecision(candidateId, jobId);

      if (!decision) {
        return res.status(404).json({ error: "Hiring decision not found" });
      }

      // 更新查看时间
      if (!decision.viewedAt) {
        await storage.updateHiringDecision(decision.id, {
          viewedAt: new Date()
        });
      }

      res.json(decision);
    } catch (error) {
      console.error("Failed to fetch hiring decision:", error);
      res.status(500).json({ error: "Failed to fetch hiring decision" });
    }
  });

  app.put("/api/hiring-decisions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const decision = await storage.updateHiringDecision(id, updates);
      if (!decision) {
        return res.status(404).json({ error: "Hiring decision not found" });
      }

      console.log(`[HiringDecision] Updated decision ${id}`);
      res.json(decision);

    } catch (error) {
      console.error("Failed to update hiring decision:", error);
      res.status(500).json({ error: "Failed to update hiring decision" });
    }
  });

  app.post("/api/hiring-decisions/:id/feedback", async (req, res) => {
    try {
      const { id } = req.params;
      const { rating, comment } = req.body;

      // 验证评分范围
      if (rating && (rating < 1 || rating > 5)) {
        return res.status(400).json({ error: "Rating must be between 1 and 5" });
      }

      const decision = await storage.updateHiringDecision(id, {
        feedbackRating: rating,
        feedbackComment: comment
      });

      if (!decision) {
        return res.status(404).json({ error: "Hiring decision not found" });
      }

      console.log(`[HiringDecision] Feedback submitted for decision ${id}`);
      res.json(decision);

    } catch (error) {
      console.error("Failed to submit hiring decision feedback:", error);
      res.status(500).json({ error: "Failed to submit feedback" });
    }
  });

  app.post("/api/hiring-decisions/:id/finalize", async (req, res) => {
    try {
      const { id } = req.params;
      const { decidedBy } = req.body;

      const decision = await storage.updateHiringDecision(id, {
        status: "final",
        decidedBy: decidedBy || null,
        decidedAt: new Date()
      });

      if (!decision) {
        return res.status(404).json({ error: "Hiring decision not found" });
      }

      console.log(`[HiringDecision] Decision ${id} finalized`);
      res.json(decision);

    } catch (error) {
      console.error("Failed to finalize hiring decision:", error);
      res.status(500).json({ error: "Failed to finalize decision" });
    }
  });

  // Get all hiring decisions for a specific job
  app.get("/api/hiring-decisions/job/:jobId", async (req, res) => {
    try {
      const { jobId } = req.params;

      // Get all hiring decisions for this job
      const decisions = await storage.getHiringDecisionsByJob(jobId);

      // Fetch candidate information for each decision
      const decisionsWithCandidates = await Promise.all(
        decisions.map(async (decision) => {
          const candidate = await storage.getCandidateById(decision.candidateId);
          return {
            ...decision,
            candidate: candidate ? {
              id: candidate.id,
              name: candidate.name,
              position: candidate.position,
              email: candidate.email,
              experience: candidate.resumeAnalysis?.experience,
              skills: candidate.resumeAnalysis?.skills
            } : null
          };
        })
      );

      console.log(`[HiringDecision] Retrieved ${decisionsWithCandidates.length} decisions for job ${jobId}`);
      res.json(decisionsWithCandidates);

    } catch (error) {
      console.error("Failed to get hiring decisions for job:", error);
      res.status(500).json({ error: "Failed to fetch hiring decisions" });
    }
  });

  // AI Assistant routes
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message, sessionId, context, templateId } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      let result;

      if (templateId) {
        // Use specific template
        const template = await promptTemplateService.getTemplate(templateId);
        if (!template) {
          return res.status(404).json({ error: "Template not found" });
        }

        // Render template with provided variables
        const renderedPrompt = await promptTemplateService.renderTemplate(templateId, req.body.variables || {});
        result = await aiService.chatWithAssistant(renderedPrompt, context);
      } else {
        // Use general chat
        result = await aiService.chatWithAssistant(message, context);
      }

      // Store conversation with actual token usage
      await storage.createAiConversation({
        userId: "default-user", // TODO: Get from auth
        sessionId: sessionId || "default-session",
        message,
        response: result.response,
        modelUsed: result.model,
        tokensUsed: result.usage.totalTokens,
      });

      res.json({
        response: result.response,
        usage: result.usage,
        model: result.model,
      });
    } catch (error) {
      console.error("Error in AI chat:", error);
      res.status(500).json({ error: "Failed to get AI response" });
    }
  });

  app.post("/api/ai/generate-questions", async (req, res) => {
    try {
      const { jobTitle, requirements, experienceLevel } = req.body;

      if (!jobTitle || !requirements) {
        return res.status(400).json({ error: "Job title and requirements are required" });
      }

      const result = await aiService.generateInterviewQuestions(jobTitle, requirements);

      // Record token usage
      try {
        await storage.createAiConversation({
          userId: "system",
          sessionId: `generate-questions-${jobTitle.replace(/\s+/g, '-')}`,
          message: `Generate interview questions for ${jobTitle}`,
          response: JSON.stringify(result.questions),
          modelUsed: result.model,
          tokensUsed: result.usage.totalTokens,
        });
      } catch (tokenError) {
        console.error('[Token Tracking] Failed to record question generation token usage:', tokenError);
      }

      res.json({ questions: result.questions });
    } catch (error) {
      console.error("Error generating questions:", error);
      res.status(500).json({ error: "Failed to generate interview questions" });
    }
  });

  // Bulk operations
  app.post("/api/candidates/bulk-match", async (req, res) => {
    try {
      const { jobId, candidateIds } = req.body;
      
      if (!jobId || !candidateIds || !Array.isArray(candidateIds)) {
        return res.status(400).json({ error: "Job ID and candidate IDs are required" });
      }

      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      const results = [];
      
      for (const candidateId of candidateIds) {
        try {
          const candidate = await storage.getCandidate(candidateId);
          if (!candidate) continue;

          const matchResult = await aiService.matchCandidateToJob(
            {
              skills: (candidate.skills as string[]) || [],
              experience: candidate.experience || 0,
              education: candidate.education || "",
              position: candidate.position || "",
            },
            {
              title: job.title,
              requirements: (job.requirements as string[]) || [],
              description: job.description,
            }
          );

          // Record token usage for AI matching
          try {
            await storage.createAiConversation({
              userId: "system",
              sessionId: `bulk-match-${jobId}-${candidateId}`,
              message: `Bulk match candidate ${candidate.name} to job ${job.title}`,
              response: JSON.stringify(matchResult.match),
              modelUsed: matchResult.model,
              tokensUsed: matchResult.usage.totalTokens,
            });
          } catch (tokenError) {
            console.error('[Token Tracking] Failed to record bulk match token usage:', tokenError);
          }

          // Update candidate match score (access match object)
          await storage.updateCandidate(candidateId, {
            matchScore: matchResult.match.score.toString(),
          });

          // Store match result (access match object properties)
          await storage.createJobMatch({
            candidateId,
            jobId,
            matchScore: matchResult.match.score.toString(),
            matchReasons: matchResult.match.reasons,
            aiAnalysis: matchResult.match.explanation,
          });

          results.push({
            candidateId,
            matchScore: matchResult.match.score,
            reasons: matchResult.match.reasons,
          });
        } catch (error) {
          console.error(`Error matching candidate ${candidateId}:`, error);
          results.push({
            candidateId,
            error: "Failed to calculate match",
          });
        }
      }

      res.json({ results });
    } catch (error) {
      console.error("Error in bulk matching:", error);
      res.status(500).json({ error: "Failed to perform bulk matching" });
    }
  });

  // Get conversation history
  app.get("/api/ai/conversations/:sessionId", async (req, res) => {
    try {
      const conversations = await storage.getAiConversationsBySession(req.params.sessionId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversation history" });
    }
  });

  // Collaboration routes
  
  // Activity logs
  app.get("/api/activity", async (req, res) => {
    try {
      const { userId } = req.query;
      let activities;
      
      if (userId && typeof userId === "string") {
        activities = await storage.getActivityLogsByUser(userId);
      } else {
        activities = await storage.getActivityLogs();
      }
      
      res.json(activities);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ error: "Failed to fetch activity logs" });
    }
  });

  app.post("/api/activity", async (req, res) => {
    try {
      const validatedData = insertActivityLogSchema.parse(req.body);
      const activity = await storage.createActivityLog(validatedData);
      
      // Broadcast to collaboration service
      const collaborationService = app.get('collaborationService');
      if (collaborationService) {
        await collaborationService.broadcastToAll({
          type: 'team_activity',
          payload: activity
        });
      }
      
      res.status(201).json(activity);
    } catch (error) {
      console.error("Error creating activity log:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create activity log" });
    }
  });

  // Notifications
  app.get("/api/notifications", async (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId || typeof userId !== "string") {
        return res.status(400).json({ error: "User ID is required" });
      }
      
      const notifications = await storage.getNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.post("/api/notifications", async (req, res) => {
    try {
      const validatedData = insertNotificationSchema.parse(req.body);
      const notification = await storage.createNotification(validatedData);
      
      // Send real-time notification
      const collaborationService = app.get('collaborationService');
      if (collaborationService) {
        await collaborationService.notifyUser(validatedData.userId, {
          type: 'notification',
          payload: notification
        });
      }
      
      res.status(201).json(notification);
    } catch (error) {
      console.error("Error creating notification:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create notification" });
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      const success = await storage.markNotificationAsRead(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Notification not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  // User sessions and online status
  app.get("/api/team/online", async (req, res) => {
    try {
      const onlineUsers = await storage.getOnlineUsers();
      res.json(onlineUsers);
    } catch (error) {
      console.error("Error fetching online users:", error);
      res.status(500).json({ error: "Failed to fetch online users" });
    }
  });

  // Comments
  app.get("/api/comments/:entityType/:entityId", async (req, res) => {
    try {
      const { entityType, entityId } = req.params;
      const comments = await storage.getComments(entityType, entityId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  app.post("/api/comments", async (req, res) => {
    try {
      const validatedData = insertCommentSchema.parse(req.body);
      const comment = await storage.createComment(validatedData);
      
      // Broadcast new comment
      const collaborationService = app.get('collaborationService');
      if (collaborationService) {
        await collaborationService.broadcastToAll({
          type: 'new_comment',
          payload: comment
        });
      }
      
      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  // AI Interview Assistant Routes
  app.post("/api/interview-assistant/recommend", async (req, res) => {
    try {
      const { interviewAssistantService } = await import("./services/interviewAssistantService");
      const recommendation = await interviewAssistantService.recommendQuestions(req.body);
      res.json(recommendation);
    } catch (error) {
      console.error("Error generating interview recommendations:", error);
      res.status(500).json({ error: "Failed to generate recommendations" });
    }
  });

  app.post("/api/interview-assistant/session", async (req, res) => {
    try {
      const { interviewAssistantService } = await import("./services/interviewAssistantService");
      const { candidateId, interviewerId, jobId, questions } = req.body;
      const session = await interviewAssistantService.createInterviewSession(
        candidateId,
        interviewerId,
        jobId,
        questions
      );
      res.json(session);
    } catch (error) {
      console.error("Error creating interview session:", error);
      res.status(500).json({ error: "Failed to create session" });
    }
  });

  app.post("/api/interview-assistant/process-answer", async (req, res) => {
    try {
      const { interviewAssistantService } = await import("./services/interviewAssistantService");
      const { sessionId, questionId, answer } = req.body;
      const result = await interviewAssistantService.processAnswer(
        sessionId,
        questionId,
        answer
      );
      res.json(result);
    } catch (error) {
      console.error("Error processing answer:", error);
      res.status(500).json({ error: "Failed to process answer" });
    }
  });

  app.post("/api/interview-assistant/generate-report", async (req, res) => {
    try {
      const { interviewAssistantService } = await import("./services/interviewAssistantService");
      const report = await interviewAssistantService.generateInterviewReport(req.body.session);
      res.json(report);
    } catch (error) {
      console.error("Error generating interview report:", error);
      res.status(500).json({ error: "Failed to generate report" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
