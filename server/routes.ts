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
import type { TargetedResumeAnalysis } from "@shared/schema";
import { aiService } from "./services/aiService";
import type { ResumeAnalysis as AiResumeAnalysis } from "./services/aiService";
import { resumeParserService } from "./services/resumeParser";
import { enhancedResumeParser } from "./services/resumeParserEnhanced";
import { targetedResumeAnalyzer } from "./services/targetedResumeAnalyzer";
import type { TargetedAnalysis } from "./services/targetedResumeAnalyzer";
import { matchingService } from "./services/matchingService";
import { promptTemplateService } from "./services/promptTemplates";
import { candidateProfileService } from "./services/candidateProfileService";
import { organizationalFitService, type CultureFitAssessment, type LeadershipAssessment } from "./services/organizationalFitService";
import { companyConfigService } from "./services/companyConfigService";
import { supabaseStorageService } from "./services/supabaseStorage";
import { requireAuth, requireAuthWithInit, requireRole, resolveOrProvisionUser, type AuthRequest } from "./middleware/auth";
import { z } from "zod";
import multer from "multer";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // 只允许 PDF、DOC 和 DOCX 文件
    const allowedMimeTypes = ['application/pdf'];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF resumes are supported.'));
    }
  }
});

// Configure multer for bulk uploads (multiple files)
const bulkUpload = multer({
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 20 // Maximum 20 files per request
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['application/pdf'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF resumes are supported.'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      websocket: process.env.VERCEL !== '1' ? 'enabled' : 'disabled',
      features: {
        ai: !!process.env.OPENROUTER_API_KEY,
        storage: !!process.env.SUPABASE_URL,
        database: !!process.env.DATABASE_URL
      }
    });
  });

  // Handle Chrome DevTools .well-known requests
  app.get("/.well-known/*", (req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  // 诊断端点 - 检查环境变量配置（仅开发环境或通过特殊令牌访问）
  app.get("/api/debug/env", (req, res) => {
    const debugToken = req.headers['x-debug-token'];
    const isDev = process.env.NODE_ENV === 'development';

    if (!isDev && debugToken !== process.env.DEBUG_TOKEN) {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.json({
      environment: process.env.NODE_ENV || 'unknown',
      vercel: process.env.VERCEL === '1',
      envCheck: {
        SUPABASE_URL: !!process.env.SUPABASE_URL,
        VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
        SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
        SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        DATABASE_URL: !!process.env.DATABASE_URL,
        OPENROUTER_API_KEY: !!process.env.OPENROUTER_API_KEY,
      },
      supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'NOT_SET',
      warning: !process.env.SUPABASE_SERVICE_ROLE_KEY ? '⚠️ SUPABASE_SERVICE_ROLE_KEY is missing! This will cause authentication failures.' : null,
    });
  });

  // User routes
  app.get("/api/users/:id", requireAuthWithInit, async (req: AuthRequest, res) => {
    try {
      // 防止越权访问：用户只能获取自己的信息，除非是管理员
      if (req.params.id !== req.user?.id && req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Forbidden: Cannot access other user's data" });
      }

      const requestedUserId = req.params.id;
      let user = await storage.getUser(requestedUserId);

      if (!user && req.supabaseUser && req.supabaseUser.id === requestedUserId) {
        const provisioned = await resolveOrProvisionUser(req.supabaseUser);
        if (provisioned) {
          user = provisioned;
        } else {
          const fallbackName =
            (typeof req.supabaseUser.user_metadata?.full_name === "string" && req.supabaseUser.user_metadata.full_name.trim().length > 0
              ? req.supabaseUser.user_metadata.full_name
              : req.supabaseUser.email?.split("@")[0]) || "Recruiter";

          return res.json({
            id: req.supabaseUser.id,
            email: req.supabaseUser.email || "",
            name: fallbackName,
            role: "recruiter",
          });
        }
      }

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.post("/api/users", requireAuthWithInit, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { id, email, name, fullName, role, password } = req.body;
      const isAdmin = req.user.role === 'admin';

      if (isAdmin) {
        if (!email || !name) {
          return res.status(400).json({ error: "Email and name are required" });
        }

        const created = await storage.createUser({
          id,
          email,
          name,
          role: role || 'hr_manager',
          password: password ?? 'supabase-managed',
        });
        return res.status(201).json(created);
      }

      // 自助注册流程：仅允许为当前登录用户补充资料
      if (req.user.email !== email && req.user.id !== id) {
        return res.status(403).json({ error: "Forbidden: Cannot provision other users" });
      }

      const existing = await storage.getUser(req.user.id);
      if (existing) {
        return res.status(200).json(existing);
      }

      const derivedName = name || fullName || req.user.email?.split('@')[0] || 'Recruiter';
      const allowedRoles = new Set(['admin', 'recruitment_lead', 'recruiter', 'hiring_manager']);
      const resolvedRole = allowedRoles.has(role) ? role : 'recruiter';

      const created = await storage.createUser({
        id: req.user.id,
        email: req.user.email,
        name: derivedName,
        role: resolvedRole,
        password: 'supabase-managed',
      });

      return res.status(201).json(created);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  // Prompt template routes
  app.get("/api/prompt-templates", requireAuth, async (req: AuthRequest, res) => {
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

  app.get("/api/prompt-templates/:id", requireAuth, async (req: AuthRequest, res) => {
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

  app.post("/api/prompt-templates", requireAuth, async (req: AuthRequest, res) => {
    try {
      const template = await promptTemplateService.createTemplate(req.body);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating prompt template:", error);
      res.status(500).json({ error: "Failed to create prompt template" });
    }
  });

  app.put("/api/prompt-templates/:id", requireAuth, async (req: AuthRequest, res) => {
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

  app.delete("/api/prompt-templates/:id", requireAuth, async (req: AuthRequest, res) => {
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
  app.get("/api/dashboard/metrics", requireAuth, async (req: AuthRequest, res) => {
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
  app.get("/api/ai/token-usage", requireAuth, async (req: AuthRequest, res) => {
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
  app.get("/api/jobs", requireAuth, async (req: AuthRequest, res) => {
    try {
      const jobs = await storage.getJobs();
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  });

  app.get("/api/jobs/:id", requireAuth, async (req: AuthRequest, res) => {
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

  app.post("/api/jobs", requireAuth, async (req: AuthRequest, res) => {
    try {
      const jobData = insertJobSchema.parse(req.body);
      const job = await storage.createJob(jobData);
      res.status(201).json(job);
    } catch (error) {
      res.status(400).json({ error: "Invalid job data" });
    }
  });

  app.put("/api/jobs/:id", requireAuth, async (req: AuthRequest, res) => {
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

  app.delete("/api/jobs/:id", requireAuth, async (req: AuthRequest, res) => {
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

  app.post("/api/jobs/:id/find-matches", requireAuth, async (req: AuthRequest, res) => {
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

  app.get("/api/jobs/:id/matches", requireAuth, async (req: AuthRequest, res) => {
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
  app.get("/api/candidates", requireAuth, async (req: AuthRequest, res) => {
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

  app.get("/api/candidates/:id", requireAuth, async (req: AuthRequest, res) => {
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

  app.post("/api/candidates", requireAuth, async (req: AuthRequest, res) => {
    try {
      const candidateData = insertCandidateSchema.parse(req.body);
      const candidate = await storage.createCandidate(candidateData);
      res.status(201).json(candidate);
    } catch (error) {
      res.status(400).json({ error: "Invalid candidate data" });
    }
  });

  // Bulk resume upload endpoint
  app.post("/api/candidates/bulk-upload", requireAuth, bulkUpload.array('resumes', 20), async (req: AuthRequest, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      console.log(`[Bulk Upload] Processing ${files.length} resume files`);

      const results = [];
      
      for (const file of files) {
        try {
          console.log(`[Bulk Upload] Processing file: ${file.originalname}`);
          
          // Parse resume using enhanced parser
          const parseResult = await enhancedResumeParser.parse(
            file.buffer,
            file.mimetype
          );

          const { text: parsedText, analysis: visionAnalysis } = parseResult;
          
          // Extract contact info and basic data
          const contactInfo = resumeParserService.extractContactInfo(parsedText);
          
          const skills = visionAnalysis?.skills || 
            resumeParserService.extractSkills(parsedText);
          
          const experience = visionAnalysis?.experience || 
            resumeParserService.extractExperience(parsedText);

          // Generate candidate name from filename or contact info
          const candidateName = contactInfo?.name || 
            file.originalname.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");

          // Create candidate
          const candidateData = {
            name: candidateName,
            email: contactInfo?.email || "",
            phone: contactInfo?.phone || "",
            skills: skills,
            experience: typeof experience === 'number' ? experience : parseInt(String(experience)) || 0,
            education: visionAnalysis?.education || "",
            resumeText: parsedText,
          };

          const candidate = await storage.createCandidate(candidateData);
          
          // Upload resume file to storage
          let resumeFilePath: string | undefined;
          try {
            resumeFilePath = await supabaseStorageService.uploadResume(
              candidate.id,
              file.buffer,
              file.originalname,
              file.mimetype
            );
            
            // Update candidate with resume URL
            await storage.updateCandidate(candidate.id, {
              resumeUrl: resumeFilePath
            });
          } catch (storageError) {
            console.warn(`[Bulk Upload] Failed to upload resume file for ${candidateName}:`, storageError);
          }

          // Run AI analysis
          let aiAnalysis: AiResumeAnalysis | null = null;
          try {
            const aiResult = await aiService.analyzeResume(parsedText);
            if (aiResult?.analysis) {
              aiAnalysis = aiResult.analysis;
              
              // Ensure experience is an integer
              const experienceValue = aiAnalysis.experience ? 
                Math.floor(Number(aiAnalysis.experience)) : 
                (typeof experience === 'number' ? experience : parseInt(String(experience)) || 0);
              
              // Update candidate with AI analysis
              await storage.updateCandidate(candidate.id, {
                aiSummary: aiAnalysis.summary || "",
                skills: (aiAnalysis.skills && aiAnalysis.skills.length > 0) ? aiAnalysis.skills : skills,
                experience: experienceValue,
              });
            }
          } catch (aiError) {
            console.warn(`[Bulk Upload] AI analysis failed for ${candidateName}:`, aiError);
          }

          // Generate initial profile
          let initialProfile = null;
          try {
            const resumeAnalysisForProfile = {
              summary: aiAnalysis?.summary || "",
              skills: aiAnalysis?.skills || skills,
              experience: aiAnalysis?.experience || experience,
              education: candidateData.education,
              strengths: aiAnalysis?.strengths || [],
              weaknesses: aiAnalysis?.weaknesses || [],
              recommendations: aiAnalysis?.recommendations || [],
            };

            initialProfile = await candidateProfileService.buildInitialProfile(
              candidate.id,
              resumeAnalysisForProfile
            );
          } catch (profileError) {
            console.warn(`[Bulk Upload] Profile generation failed for ${candidateName}:`, profileError);
          }

          results.push({
            status: 'success',
            filename: file.originalname,
            candidate: {
              id: candidate.id,
              name: candidate.name,
              email: candidate.email,
            },
            profile: initialProfile ? {
              id: initialProfile.id,
              version: initialProfile.version,
            } : null,
          });

          console.log(`[Bulk Upload] Successfully processed: ${candidateName}`);
          
        } catch (error) {
          console.error(`[Bulk Upload] Failed to process file ${file.originalname}:`, error);
          
          results.push({
            status: 'error',
            filename: file.originalname,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      const successCount = results.filter(r => r.status === 'success').length;
      const errorCount = results.filter(r => r.status === 'error').length;

      console.log(`[Bulk Upload] Completed: ${successCount} successful, ${errorCount} failed`);

      res.json({
        success: true,
        processed: files.length,
        successful: successCount,
        failed: errorCount,
        results: results,
      });

    } catch (error) {
      console.error("[Bulk Upload] Bulk upload failed:", error);
      res.status(500).json({ 
        error: "Bulk upload failed", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  app.put("/api/candidates/:id", requireAuth, async (req: AuthRequest, res) => {
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

  app.delete("/api/candidates/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      // 先获取候选人信息以获得简历文件路径
      const candidate = await storage.getCandidate(req.params.id);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      // 检查是否有关联的面试和职位匹配记录
      const relatedInterviews = await storage.getInterviewsByCandidate(req.params.id);
      const relatedMatches = await storage.getJobMatchesForCandidate(req.params.id);

      if (relatedInterviews.length > 0 || relatedMatches.length > 0) {
        return res.status(409).json({
          error: "Cannot delete candidate with existing interviews or job matches",
          details: {
            interviews: relatedInterviews.length,
            jobMatches: relatedMatches.length,
            message: "请先删除相关的面试记录和职位匹配记录"
          }
        });
      }

      // 如果有简历文件，先从 Storage 删除
      if (candidate.resumeUrl) {
        try {
          await supabaseStorageService.deleteResume(candidate.resumeUrl);
          console.log(`[Candidate Delete] Deleted resume file: ${candidate.resumeUrl}`);
        } catch (storageError) {
          console.error(`[Candidate Delete] Failed to delete resume file:`, storageError);
          // 继续删除候选人记录，但记录错误
          // 孤儿文件可以通过定期清理任务处理
        }
      }

      // 删除数据库记录
      const deleted = await storage.deleteCandidate(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("[Candidate Delete] Error:", error);
      res.status(500).json({ error: "Failed to delete candidate" });
    }
  });

  app.post("/api/candidates/:id/find-matches", requireAuth, async (req: AuthRequest, res) => {
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

  app.get("/api/candidates/:id/matches", requireAuth, async (req: AuthRequest, res) => {
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

  // Object upload - Generate presigned upload URL
  app.post("/api/objects/upload", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { candidateId, filename } = req.body;

      if (!candidateId || !filename) {
        return res.status(400).json({ 
          error: "candidateId and filename are required" 
        });
      }

      // 验证候选人是否存在
      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      // 生成预签名上传 URL
      const uploadUrl = await supabaseStorageService.createPresignedUploadUrl(
        candidateId,
        filename
      );

      res.json({
        method: "PUT",
        url: uploadUrl
      });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // Proxy upload endpoint to bypass CORS issues
  app.post("/api/objects/proxy-upload", requireAuth, upload.single("file"), async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const candidateId = req.headers['x-candidate-id'] as string || req.body.candidateId;
      if (!candidateId) {
        return res.status(400).json({ error: "candidateId is required" });
      }

      // 验证候选人是否存在
      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      // 验证文件类型和大小
      if (req.file.mimetype !== 'application/pdf') {
        return res.status(400).json({ error: "Only PDF files are allowed" });
      }

      if (req.file.size > 10 * 1024 * 1024) { // 10MB
        return res.status(400).json({ error: "File size must be less than 10MB" });
      }

      console.log(`[Proxy Upload] Uploading file for candidate ${candidateId}: ${req.file.originalname}`);

      // 删除旧简历文件（如果存在）
      if (candidate.resumeUrl) {
        try {
          console.log(`[Proxy Upload] Deleting old resume: ${candidate.resumeUrl}`);
          await supabaseStorageService.deleteResume(candidate.resumeUrl);
          console.log(`[Proxy Upload] Old resume deleted successfully`);
        } catch (deleteError) {
          console.warn(`[Proxy Upload] Failed to delete old resume:`, deleteError);
        }
      }

      // 直接上传到 Supabase Storage
      const filePath = await supabaseStorageService.uploadResume(
        candidateId,
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      console.log(`[Proxy Upload] File uploaded successfully: ${filePath}`);

      // 更新候选人记录
      await storage.updateCandidate(candidateId, {
        resumeUrl: filePath
      });

      console.log(`[Proxy Upload] Starting AI analysis for file: ${filePath}`);

      // 立即进行AI分析
      try {
        const analysisResult = await enhancedResumeParser.parse(
          req.file.buffer,
          req.file.mimetype
        );
        
        // 更新候选人信息
        const updatedCandidate = await storage.updateCandidate(candidateId, {
          name: candidate.name, // 保持原有名称，避免覆盖
          resumeUrl: filePath,
          skills: analysisResult.analysis.skills, // 保持数组格式
          experience: analysisResult.analysis.experience, // 使用数字格式
          education: analysisResult.analysis.education,
          resumeText: analysisResult.text
        });

        console.log(`[Proxy Upload] AI analysis completed successfully`);

        // 设置CORS头部以支持跨域请求
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Candidate-ID');
        res.header('Access-Control-Expose-Headers', 'ETag, Content-Length');

        // 返回Uppy期望的格式
        res.json({
          uploadURL: `/api/files/${filePath}`,
          url: `/api/files/${filePath}`,
          response: {
            body: {
              success: true,
              filePath,
              analysis: {
                ...analysisResult,
                candidate: updatedCandidate
              },
              message: "File uploaded and analyzed successfully"
            }
          }
        });

      } catch (analysisError) {
        console.error(`[Proxy Upload] AI analysis failed:`, analysisError);
        
        // 即使分析失败，文件上传仍然成功
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Candidate-ID');
        res.header('Access-Control-Expose-Headers', 'ETag, Content-Length');

        // 返回Uppy期望的格式
        res.json({
          uploadURL: `/api/files/${filePath}`,
          url: `/api/files/${filePath}`,
          response: {
            body: {
              success: true,
              filePath,
              message: "File uploaded successfully, but AI analysis failed",
              analysisError: "AI analysis failed, please try manual analysis"
            }
          }
        });
      }

    } catch (error) {
      console.error("Error in proxy upload:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // Resume upload and parsing
  app.post("/api/candidates/:id/resume", requireAuth, upload.single("resume"), async (req: AuthRequest, res) => {
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

      let aiAnalysis: AiResumeAnalysis | undefined;
      let parsedText = "";
      let contactInfo: TargetedAnalysis["basicInfo"]["contact"] | undefined;
      let skills: string[] = [];
      let experience = 0;
      let targetedAnalysis: TargetedAnalysis | null = null;
      let interviewerBrief: string | null = null;

      const runAiResumeAnalysis = async (text: string) => {
        try {
          const analysisResult = await aiService.analyzeResume(text);
          aiAnalysis = analysisResult.analysis;

          await storage.createAiConversation({
            userId: "system",
            sessionId: `resume-parse-${req.params.id}`,
            message: `Analyze resume for candidate ${candidate.name}`,
            response: JSON.stringify(analysisResult.analysis),
            modelUsed: analysisResult.model,
            tokensUsed: analysisResult.usage.totalTokens,
          });
        } catch (analysisError) {
          console.warn('[Resume Upload] AI resume analysis fallback triggered:', analysisError);
        }
      };

      try {
        const baselineParsed = await resumeParserService.parseFile(
          req.file.buffer,
          req.file.mimetype
        );

        parsedText = baselineParsed.text;
        const baselineContact = resumeParserService.extractContactInfo(parsedText) as
          | { email?: string; phone?: string; location?: string }
          | undefined;
        contactInfo = baselineContact
          ? {
              email: baselineContact.email,
              phone: baselineContact.phone,
              location: baselineContact.location,
            }
          : undefined;

        skills = resumeParserService.extractSkills(parsedText);
        experience = resumeParserService.extractExperience(parsedText);
      } catch (parseError) {
        console.error('[Resume Upload] Failed to parse resume before analysis:', parseError);
        return res.status(422).json({ error: '无法解析上传的简历，请确认文件未损坏且为 PDF 格式。' });
      }

      // 如果提供了岗位ID，执行针对性分析
      if (useTargetedAnalysis) {
        try {
          const job = await storage.getJob(jobId);
          if (job) {
            console.log(`[Resume Upload] Performing targeted analysis for job: ${job.title}`);

            const jobContext = {
              title: job.title,
              description: job.description,
              requirements: Array.isArray(job.requirements) ? job.requirements : [],
              focusAreas: Array.isArray(job.focusAreas) ? job.focusAreas : [],
            };

            const analysis = await targetedResumeAnalyzer.analyzeForPosition(
              req.file.buffer,
              req.file.mimetype,
              jobContext
            );

            targetedAnalysis = analysis;
            interviewerBrief = targetedResumeAnalyzer.generateInterviewerBrief(analysis);

            const focusAreas = Array.isArray(analysis.interviewRecommendations?.focusAreas)
              ? analysis.interviewRecommendations.focusAreas.map(String)
              : [];

            aiAnalysis = {
              summary: analysis.basicInfo.summary,
              skills: analysis.skillsAssessment.technicalSkills.map(s => s.skill),
              experience: analysis.experienceAnalysis.totalRelevantYears,
              education: analysis.basicInfo.summary,
              strengths: analysis.keyInsights.uniqueSellingPoints,
              weaknesses: analysis.risksAndConcerns.redFlags.map(r => r.concern),
              recommendations: focusAreas,
            };

            skills = aiAnalysis.skills ?? [];
            experience = aiAnalysis.experience ?? experience;
            contactInfo = {
              email: analysis.basicInfo.contact?.email ?? contactInfo?.email,
              phone: analysis.basicInfo.contact?.phone ?? contactInfo?.phone,
              location: analysis.basicInfo.contact?.location ?? contactInfo?.location,
            };

            console.log(`[Resume Upload] Targeted analysis completed with score: ${analysis.jobFitAnalysis.overallScore}`);
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
            req.file.mimetype
          );

          parsedText = enhanced.text;
          aiAnalysis = enhanced.analysis;

          // 从视觉分析中提取信息
          skills = enhanced.analysis.skills;
          experience = enhanced.analysis.experience;

          // 尝试从文本提取联系信息作为补充
          const extractedContact = resumeParserService.extractContactInfo(parsedText) as
            | { email?: string; phone?: string; location?: string }
            | undefined;
          contactInfo = extractedContact
            ? {
                email: extractedContact.email,
                phone: extractedContact.phone,
                location: extractedContact.location,
              }
            : undefined;

          console.log(`[Resume Upload] Vision analysis completed successfully`);
        } catch (error) {
          console.error(`[Resume Upload] Vision analysis failed, falling back to text mode:`, error);

          // 回退到传统文本分析
          const fallbackContact = resumeParserService.extractContactInfo(parsedText) as
            | { email?: string; phone?: string; location?: string }
            | undefined;
          contactInfo = fallbackContact
            ? {
                email: fallbackContact.email,
                phone: fallbackContact.phone,
                location: fallbackContact.location,
              }
            : contactInfo;
          skills = resumeParserService.extractSkills(parsedText);
          experience = resumeParserService.extractExperience(parsedText);

          await runAiResumeAnalysis(parsedText);
        }
      } else {
        await runAiResumeAnalysis(parsedText);
      }

      }

      // 删除旧简历文件（如果存在）
      if (candidate.resumeUrl) {
        try {
          console.log(`[Resume Upload] Deleting old resume: ${candidate.resumeUrl}`);
          await supabaseStorageService.deleteResume(candidate.resumeUrl);
          console.log(`[Resume Upload] Old resume deleted successfully`);
        } catch (deleteError) {
          console.warn(`[Resume Upload] Failed to delete old resume:`, deleteError);
          // 继续上传新文件，旧文件可通过定期清理任务处理
        }
      }

      // 上传简历文件到 Supabase Storage
      let resumeFilePath: string | undefined;
      try {
        console.log(`[Resume Upload] Uploading file to Supabase Storage...`);
        resumeFilePath = await supabaseStorageService.uploadResume(
          req.params.id,
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype
        );
        console.log(`[Resume Upload] File uploaded successfully: ${resumeFilePath}`);
      } catch (storageError) {
        console.error(`[Resume Upload] Failed to upload file to storage:`, storageError);
        // 继续处理，但记录错误
      }

      const resolvedAnalysis: AiResumeAnalysis = aiAnalysis ?? {
        summary: "",
        skills,
        experience,
        education: candidate.education || "",
        strengths: [],
        weaknesses: [],
        recommendations: [],
      };
      aiAnalysis = resolvedAnalysis;

      // Update candidate with parsed information
      const updatedCandidate = await storage.updateCandidate(req.params.id, {
        resumeText: parsedText,
        resumeUrl: resumeFilePath, // 添加简历文件路径
        skills: skills.length > 0 ? skills : resolvedAnalysis.skills,
        experience: experience > 0 ? experience : resolvedAnalysis.experience,
        aiSummary: interviewerBrief || resolvedAnalysis.summary,
        name: candidate.name,
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
          recommendations: aiAnalysis.recommendations || [],
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

      const targetedAnalysisResponse = targetedAnalysis
        ? {
            overallScore: targetedAnalysis.jobFitAnalysis.overallScore,
            matchedRequirements: targetedAnalysis.jobFitAnalysis.matchedRequirements,
            missingRequirements: targetedAnalysis.jobFitAnalysis.missingRequirements,
            keyInsights: targetedAnalysis.keyInsights,
            interviewRecommendations: targetedAnalysis.interviewRecommendations,
            risksAndConcerns: targetedAnalysis.risksAndConcerns,
            interviewerBrief,
          }
        : null;

      res.json({
        candidate: updatedCandidate,
        analysis: aiAnalysis,
        parsedData: {
          contactInfo,
          skills,
          experience,
          metadata: { analysisMode: targetedAnalysis ? 'targeted' : (useVision ? 'vision' : 'text') },
        },
        targetedAnalysis: targetedAnalysisResponse,
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

  // 获取简历下载链接
  app.get("/api/candidates/:id/resume/download", requireAuth, async (req: AuthRequest, res) => {
    try {
      const candidate = await storage.getCandidate(req.params.id);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      // 权限检查：仅允许管理员访问简历下载
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Forbidden: You don't have permission to access this resume" });
      }

      if (!candidate.resumeUrl) {
        return res.status(404).json({ error: "No resume file found for this candidate" });
      }

      // 生成签名 URL（有效期 1 小时）
      const signedUrl = await supabaseStorageService.getResumeSignedUrl(candidate.resumeUrl);

      res.json({
        url: signedUrl,
        filename: candidate.resumeUrl.split('/').pop(), // 从路径提取文件名
        expiresIn: 3600 // 1 小时
      });
    } catch (error) {
      console.error("Error getting resume download URL:", error);
      res.status(500).json({ error: "Failed to get resume download URL" });
    }
  });

  // 分析已上传的简历文件（通过文件路径）
  app.post("/api/candidates/:id/analyze-uploaded-resume", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { filePath, jobId } = req.body;

      if (!filePath) {
        return res.status(400).json({ error: "File path is required" });
      }

      const candidate = await storage.getCandidate(req.params.id);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      console.log(`[Resume Analysis] Starting analysis for uploaded file: ${filePath}`);

      // 从 Supabase Storage 下载文件
      const fileBuffer = await supabaseStorageService.downloadResume(filePath);
      
      // 从文件路径推断 MIME 类型
      const mimeType = filePath.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream';
      const originalname = filePath.split('/').pop() || 'resume.pdf';

      // 检查是否提供了岗位ID用于针对性分析
      const useTargetedAnalysis = !!jobId;

      // 检查是否应该使用视觉分析（PDF 文件且启用视觉模式）
      const useVision = mimeType === "application/pdf" &&
                        process.env.ENABLE_VISION_PARSING !== "false";

      console.log(`[Resume Analysis] Processing with ${useVision ? 'vision' : 'text'} mode${useTargetedAnalysis ? ' and targeted analysis' : ''} for ${originalname}`);

      let aiAnalysis: AiResumeAnalysis | undefined;
      let parsedText = "";
      let contactInfo: TargetedAnalysis["basicInfo"]["contact"] | undefined;
      let skills: string[] = [];
      let experience = 0;
      let targetedAnalysis: TargetedAnalysis | null = null;
      let interviewerBrief: string | null = null;

      const runAiResumeAnalysis = async (text: string) => {
        try {
          const analysisResult = await aiService.analyzeResume(text);
          aiAnalysis = analysisResult.analysis;
          console.log(`[Resume Analysis] AI analysis completed successfully`);
        } catch (error) {
          console.error(`[Resume Analysis] AI analysis failed:`, error);
          throw error;
        }
      };

      // 基础解析
      try {
        const baselineParsed = await resumeParserService.parseFile(
          fileBuffer,
          mimeType
        );

        parsedText = baselineParsed.text;
        const baselineContact = resumeParserService.extractContactInfo(parsedText) as
          | { email?: string; phone?: string; location?: string }
          | undefined;
        contactInfo = baselineContact
          ? {
              email: baselineContact.email,
              phone: baselineContact.phone,
              location: baselineContact.location,
            }
          : undefined;

        skills = resumeParserService.extractSkills(parsedText);
        experience = resumeParserService.extractExperience(parsedText);
      } catch (parseError) {
        console.error('[Resume Analysis] Failed to parse resume before analysis:', parseError);
        return res.status(422).json({ error: '无法解析上传的简历，请确认文件未损坏且为 PDF 格式。' });
      }

      // 如果提供了岗位ID，执行针对性分析
      if (useTargetedAnalysis) {
        try {
          const job = await storage.getJob(jobId);
          if (job) {
            console.log(`[Resume Analysis] Performing targeted analysis for job: ${job.title}`);

            const jobContext = {
              title: job.title,
              description: job.description,
              requirements: Array.isArray(job.requirements) ? job.requirements : [],
              focusAreas: Array.isArray(job.focusAreas) ? job.focusAreas : [],
            };

            const analysis = await targetedResumeAnalyzer.analyzeForPosition(
              fileBuffer,
              mimeType,
              jobContext
            );

            targetedAnalysis = analysis;
            interviewerBrief = targetedResumeAnalyzer.generateInterviewerBrief(analysis);

            // 合并技能信息
            const targetedSkills = analysis.skillsAssessment.technicalSkills.map(s => s.skill);
            skills = Array.from(new Set([...skills, ...targetedSkills]));
            experience = analysis.experienceAnalysis.totalRelevantYears || experience;

            console.log(`[Resume Analysis] Targeted analysis completed with score: ${analysis.jobFitAnalysis.overallScore}`);
          }
        } catch (error) {
          console.error(`[Resume Analysis] Targeted analysis failed:`, error);
        }
      }

      // 如果没有进行针对性分析，使用原有的分析流程
      if (!targetedAnalysis) {
        if (useVision) {
          try {
            // 使用增强版解析器（GPT-5 多模态）
            const enhanced = await enhancedResumeParser.parse(
              fileBuffer,
              mimeType
            );

            parsedText = enhanced.text;
            aiAnalysis = enhanced.analysis;

            // 从视觉分析中提取信息
            skills = enhanced.analysis.skills;
            experience = enhanced.analysis.experience;

            // 尝试从文本提取联系信息作为补充
            const extractedContact = resumeParserService.extractContactInfo(parsedText) as
              | { email?: string; phone?: string; location?: string }
              | undefined;
            contactInfo = extractedContact
              ? {
                  email: extractedContact.email,
                  phone: extractedContact.phone,
                  location: extractedContact.location,
                }
              : undefined;

            console.log(`[Resume Analysis] Vision analysis completed successfully`);
          } catch (error) {
            console.error(`[Resume Analysis] Vision analysis failed, falling back to text mode:`, error);

            // 回退到传统文本分析
            const fallbackContact = resumeParserService.extractContactInfo(parsedText) as
              | { email?: string; phone?: string; location?: string }
              | undefined;
            contactInfo = fallbackContact
              ? {
                  email: fallbackContact.email,
                  phone: fallbackContact.phone,
                  location: fallbackContact.location,
                }
              : contactInfo;
            skills = resumeParserService.extractSkills(parsedText);
            experience = resumeParserService.extractExperience(parsedText);

            await runAiResumeAnalysis(parsedText);
          }
        } else {
          await runAiResumeAnalysis(parsedText);
        }
      }

      const resolvedAnalysis: AiResumeAnalysis = aiAnalysis ?? {
        summary: "",
        skills,
        experience,
        education: candidate.education || "",
        strengths: [],
        weaknesses: [],
        recommendations: [],
      };
      aiAnalysis = resolvedAnalysis;

      // Update candidate with parsed information
      const updatedCandidate = await storage.updateCandidate(req.params.id, {
        resumeText: parsedText,
        resumeUrl: filePath, // 更新简历文件路径
        skills: skills.length > 0 ? skills : resolvedAnalysis.skills,
        experience: experience > 0 ? experience : resolvedAnalysis.experience,
        aiSummary: interviewerBrief || resolvedAnalysis.summary,
        name: candidate.name,
        email: contactInfo?.email || candidate.email,
        phone: contactInfo?.phone || candidate.phone,
      });

      let initialProfile = null;
      let profileError = null;

      try {
        console.log(`[Resume Analysis] Auto-generating initial profile for candidate ${req.params.id}`);

        const resumeAnalysisForProfile = {
          summary: aiAnalysis.summary,
          skills: skills.length > 0 ? skills : aiAnalysis.skills,
          experience: experience > 0 ? experience : aiAnalysis.experience,
          education: candidate.education || "",
          strengths: aiAnalysis.strengths || [],
          weaknesses: aiAnalysis.weaknesses || [],
          recommendations: aiAnalysis.recommendations || [],
        };

        initialProfile = await candidateProfileService.buildInitialProfile(
          req.params.id,
          resumeAnalysisForProfile
        );

        console.log(`[Resume Analysis] Initial profile v${initialProfile.version} created successfully`);
      } catch (error) {
        profileError = error instanceof Error ? error.message : "Failed to generate profile";
        console.error(`[Resume Analysis] Failed to auto-generate profile:`, error);
      }

      const targetedAnalysisResponse = targetedAnalysis
        ? {
            overallScore: targetedAnalysis.jobFitAnalysis.overallScore,
            matchedRequirements: targetedAnalysis.jobFitAnalysis.matchedRequirements,
            missingRequirements: targetedAnalysis.jobFitAnalysis.missingRequirements,
            keyInsights: targetedAnalysis.keyInsights,
            interviewRecommendations: targetedAnalysis.interviewRecommendations,
            risksAndConcerns: targetedAnalysis.risksAndConcerns,
            interviewerBrief,
          }
        : null;

      res.json({
        candidate: updatedCandidate,
        analysis: aiAnalysis,
        parsedData: {
          contactInfo,
          skills,
          experience,
          metadata: { analysisMode: targetedAnalysis ? 'targeted' : (useVision ? 'vision' : 'text') },
        },
        targetedAnalysis: targetedAnalysisResponse,
        profile: initialProfile ? {
          id: initialProfile.id,
          version: initialProfile.version,
          generated: true,
        } : null,
        profileError: profileError,
      });
    } catch (error) {
      console.error("Error analyzing uploaded resume:", error);
      res.status(500).json({ error: "Failed to analyze uploaded resume" });
    }
  });

  // 针对特定岗位的简历深度分析
  app.post("/api/candidates/:id/targeted-analysis", requireAuth, upload.single("resume"), async (req: AuthRequest, res) => {
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

      let parsedText = "";
      let baselineSkills: string[] = [];
      let baselineExperience = candidate.experience ?? 0;
      let baselineContact = resumeParserService.extractContactInfo(candidate.resumeText ?? "") || undefined;

      try {
        const parsedResume = await resumeParserService.parseFile(req.file.buffer, req.file.mimetype);
        parsedText = parsedResume.text;
        baselineSkills = resumeParserService.extractSkills(parsedText);
        baselineExperience = resumeParserService.extractExperience(parsedText) || baselineExperience;
        const contact = resumeParserService.extractContactInfo(parsedText);
        baselineContact = contact ?? baselineContact;
      } catch (parseError) {
        console.error('[Targeted Analysis] Failed to parse resume for baseline extraction:', parseError);
        return res.status(422).json({ error: '无法解析上传的简历，请确认文件未损坏且为 PDF 格式。' });
      }

      // 构建岗位上下文
      const jobContext = {
        title: job.title,
        description: job.description,
        requirements: Array.isArray(job.requirements) ? job.requirements : [],
        focusAreas: Array.isArray(job.focusAreas) ? job.focusAreas : [],
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
      const mergedSkills = Array.from(new Set([
        ...baselineSkills,
        ...targetedAnalysis.skillsAssessment.technicalSkills.map(s => s.skill)
      ]));

      const updatedCandidate = await storage.updateCandidate(req.params.id, {
        resumeText: parsedText,
        skills: mergedSkills,
        experience: targetedAnalysis.experienceAnalysis.totalRelevantYears || baselineExperience,
        aiSummary: interviewerBrief,
        targetedAnalysis: targetedAnalysis as unknown as TargetedResumeAnalysis,
        email: targetedAnalysis.basicInfo.contact?.email || baselineContact?.email || candidate.email,
        phone: targetedAnalysis.basicInfo.contact?.phone || baselineContact?.phone || candidate.phone,
        location: targetedAnalysis.basicInfo.contact?.location || candidate.location,
      });

      // 如果分析成功，也创建或更新匹配记录
      if (targetedAnalysis.jobFitAnalysis.overallScore > 0) {
        const existingMatch = await storage.getJobMatch(jobId, req.params.id);

        if (existingMatch) {
          await storage.updateJobMatch(existingMatch.id, {
            score: targetedAnalysis.jobFitAnalysis.overallScore.toString(),
            analysis: {
              targeted: true,
              ...targetedAnalysis.jobFitAnalysis,
            },
          });
        } else {
          await storage.createJobMatch({
            jobId,
            candidateId: req.params.id,
            score: targetedAnalysis.jobFitAnalysis.overallScore.toString(),
            status: "pending",
            analysis: {
              targeted: true,
              ...targetedAnalysis.jobFitAnalysis,
            },
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

  app.get("/api/candidates/:id/profiles", requireAuth, async (req: AuthRequest, res) => {
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

  app.get("/api/candidates/:id/profiles/latest", requireAuth, async (req: AuthRequest, res) => {
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

  app.get("/api/candidates/:id/profiles/:version", requireAuth, async (req: AuthRequest, res) => {
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

  app.post("/api/candidates/:id/profiles/build", requireAuth, async (req: AuthRequest, res) => {
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

  app.post("/api/candidates/:candidateId/profiles/update-from-interview/:interviewId", requireAuth, async (req: AuthRequest, res) => {
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
  app.post("/api/candidates/:candidateId/organizational-fit", requireAuth, async (req: AuthRequest, res) => {
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

      const profileHistory = await storage.getCandidateProfiles(candidateId);

      const cultureInput = {
        resumeText: candidate.resumeText || candidate.resumeAnalysis?.summary || "",
        interviewTranscripts: undefined,
        profileHistory,
        behavioralResponses: undefined,
      };

      const leadershipInput = {
        resumeText: candidate.resumeText || candidate.resumeAnalysis?.summary || "",
        interviewTranscripts: undefined,
        profileHistory,
        managementExperience: undefined,
        achievements: candidate.resumeAnalysis?.strengths || [],
      };

      const [cultureAssessment, leadershipAssessment] = await Promise.all([
        organizationalFitService.assessCultureFit(cultureInput, stage),
        organizationalFitService.assessLeadership(leadershipInput, stage),
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
  app.get("/api/candidates/:candidateId/organizational-fit/evolution", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { candidateId } = req.params;

      const profiles = await storage.getCandidateProfiles(candidateId);
      if (!profiles.length) {
        return res.status(404).json({ error: "No profiles found for candidate" });
      }

      const cultureHistory: CultureFitAssessment[] = [];
      const leadershipHistory: LeadershipAssessment[] = [];

      for (const profile of profiles) {
        const profileData = profile.profileData as any;
        if (profileData?.organizationalFit) {
          if (profileData.organizationalFit.cultureAssessment) {
            cultureHistory.push(profileData.organizationalFit.cultureAssessment as CultureFitAssessment);
          }
          if (profileData.organizationalFit.leadershipAssessment) {
            leadershipHistory.push(profileData.organizationalFit.leadershipAssessment as LeadershipAssessment);
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
  app.get("/api/company/config", requireAuth, async (req: AuthRequest, res) => {
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

  app.put("/api/company/config", requireAuth, async (req: AuthRequest, res) => {
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

  app.get("/api/company/config/culture-values", requireAuth, async (req: AuthRequest, res) => {
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

  app.get("/api/company/config/leadership-dimensions", requireAuth, async (req: AuthRequest, res) => {
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

  app.get("/api/company/config/interview-questions/:stage", requireAuth, async (req: AuthRequest, res) => {
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
  app.post("/api/interviews/:id/feedback", requireAuth, async (req: AuthRequest, res) => {
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
  app.get("/api/candidates/:candidateId/interview-process", requireAuth, async (req: AuthRequest, res) => {
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
  app.post("/api/jobs/:jobId/match-candidates", requireAuth, async (req: AuthRequest, res) => {
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
  app.post("/api/candidates/:candidateId/calculate-match", requireAuth, async (req: AuthRequest, res) => {
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
  app.get("/api/interviews", requireAuth, async (req: AuthRequest, res) => {
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

  app.get("/api/interviews/:id", requireAuth, async (req: AuthRequest, res) => {
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

  app.post("/api/interviews", requireAuth, async (req: AuthRequest, res) => {
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

  app.put("/api/interviews/:id", requireAuth, async (req: AuthRequest, res) => {
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

          updatedProfile = await candidateProfileService.updateProfileWithInterview(
            interview.candidateId,
            interview.id
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
  app.post("/api/interviews/:id/cancel", requireAuth, async (req: AuthRequest, res) => {
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
  app.post("/api/interviews/:interviewId/preparation", requireAuth, async (req: AuthRequest, res) => {
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

  app.get("/api/interviews/:interviewId/preparation", requireAuth, async (req: AuthRequest, res) => {
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

  app.post("/api/interviews/:interviewId/preparation/feedback", requireAuth, async (req: AuthRequest, res) => {
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
  app.post("/api/interviews/transcribe", requireAuth, async (req: AuthRequest, res) => {
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
  app.post("/api/interviews/ai-analyze", requireAuth, async (req: AuthRequest, res) => {
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
  app.post("/api/hiring-decisions", requireAuth, async (req: AuthRequest, res) => {
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

  app.get("/api/hiring-decisions/:candidateId/:jobId", requireAuth, async (req: AuthRequest, res) => {
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

  app.put("/api/hiring-decisions/:id", requireAuth, async (req: AuthRequest, res) => {
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

  app.post("/api/hiring-decisions/:id/feedback", requireAuth, async (req: AuthRequest, res) => {
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

  app.post("/api/hiring-decisions/:id/finalize", requireAuth, async (req: AuthRequest, res) => {
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
  app.get("/api/hiring-decisions/job/:jobId", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { jobId } = req.params;

      // Get all hiring decisions for this job
      const decisions = await storage.getHiringDecisionsByJob(jobId);

      // Fetch candidate information for each decision
      const decisionsWithCandidates = await Promise.all(
        decisions.map(async (decision) => {
          const candidate = await storage.getCandidate(decision.candidateId);
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
  app.post("/api/ai/chat", requireAuth, async (req: AuthRequest, res) => {
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

  app.post("/api/ai/generate-questions", requireAuth, async (req: AuthRequest, res) => {
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
  app.post("/api/candidates/bulk-match", requireAuth, async (req: AuthRequest, res) => {
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
  app.get("/api/ai/conversations/:sessionId", requireAuth, async (req: AuthRequest, res) => {
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
  app.get("/api/activity", requireAuth, async (req: AuthRequest, res) => {
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

  app.post("/api/activity", requireAuth, async (req: AuthRequest, res) => {
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
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({
        error: "Failed to create activity log",
        ...(error instanceof Error ? { details: error.message } : {}),
      });
    }
  });

  // Notifications
  app.get("/api/notifications", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { userId } = req.query;
      if (!userId || typeof userId !== "string") {
        return res.status(400).json({ error: "User ID is required" });
      }
      
      const notifications = await storage.getNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({
        error: "Failed to fetch notifications",
        ...(error instanceof Error ? { details: error.message } : {}),
      });
    }
  });

  app.post("/api/notifications", requireAuth, async (req: AuthRequest, res) => {
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
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({
        error: "Failed to create notification",
        ...(error instanceof Error ? { details: error.message } : {}),
      });
    }
  });

  app.patch("/api/notifications/:id/read", requireAuth, async (req: AuthRequest, res) => {
    try {
      const success = await storage.markNotificationAsRead(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Notification not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({
        error: "Failed to mark notification as read",
        ...(error instanceof Error ? { details: error.message } : {}),
      });
    }
  });

  // User sessions and online status
  app.get("/api/team/online", requireAuth, async (req: AuthRequest, res) => {
    try {
      const onlineUsers = await storage.getOnlineUsers();
      res.json(onlineUsers);
    } catch (error) {
      console.error("Error fetching online users:", error);
      res.status(500).json({
        error: "Failed to fetch online users",
        ...(error instanceof Error ? { details: error.message } : {}),
      });
    }
  });

  // Comments
  app.get("/api/comments/:entityType/:entityId", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { entityType, entityId } = req.params;
      const comments = await storage.getComments(entityType, entityId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({
        error: "Failed to fetch comments",
        ...(error instanceof Error ? { details: error.message } : {}),
      });
    }
  });

  app.post("/api/comments", requireAuth, async (req: AuthRequest, res) => {
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
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({
        error: "Failed to create comment",
        ...(error instanceof Error ? { details: error.message } : {}),
      });
    }
  });

  // AI Interview Assistant Routes
  app.post("/api/interview-assistant/recommend", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { interviewAssistantService } = await import("./services/interviewAssistantService");
      const recommendation = await interviewAssistantService.recommendQuestions(req.body);
      res.json(recommendation);
    } catch (error) {
      console.error("Error generating interview recommendations:", error);
      res.status(500).json({ error: "Failed to generate recommendations" });
    }
  });

  app.post("/api/interview-assistant/session", requireAuth, async (req: AuthRequest, res) => {
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

  app.post("/api/interview-assistant/process-answer", requireAuth, async (req: AuthRequest, res) => {
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

  app.post("/api/interview-assistant/generate-report", requireAuth, async (req: AuthRequest, res) => {
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
