import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertJobSchema, insertCandidateSchema, insertInterviewSchema } from "@shared/schema";
import { aiService } from "./services/aiService";
import { resumeParserService } from "./services/resumeParser";
import { matchingService } from "./services/matchingService";
import { promptTemplateService } from "./services/promptTemplates";
import { ObjectStorageService } from "./objectStorage";
import multer from "multer";

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  
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

      // Parse the resume
      const parsedResume = await resumeParserService.parseFile(
        req.file.buffer, 
        req.file.mimetype
      );

      // Extract contact info and skills
      const contactInfo = resumeParserService.extractContactInfo(parsedResume.text);
      const skills = resumeParserService.extractSkills(parsedResume.text);
      const experience = resumeParserService.extractExperience(parsedResume.text);

      // Get AI analysis
      const aiAnalysis = await aiService.analyzeResume(parsedResume.text);

      // Update candidate with parsed information
      const updatedCandidate = await storage.updateCandidate(req.params.id, {
        resumeText: parsedResume.text,
        skills: skills.length > 0 ? skills : aiAnalysis.skills,
        experience: experience > 0 ? experience : aiAnalysis.experience,
        aiSummary: aiAnalysis.summary,
        name: contactInfo.name || candidate.name,
        email: contactInfo.email || candidate.email,
        phone: contactInfo.phone || candidate.phone,
      });

      res.json({
        candidate: updatedCandidate,
        analysis: aiAnalysis,
        parsedData: {
          contactInfo,
          skills,
          experience,
          metadata: parsedResume.metadata,
        }
      });
    } catch (error) {
      console.error("Error processing resume:", error);
      res.status(500).json({ error: "Failed to process resume" });
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
        const aiMatchResult = await aiService.matchCandidateToJob(
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
        aiMatch = aiMatchResult;
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
      res.status(201).json(interview);
    } catch (error) {
      res.status(400).json({ error: "Invalid interview data" });
    }
  });

  app.put("/api/interviews/:id", async (req, res) => {
    try {
      const interview = await storage.updateInterview(req.params.id, req.body);
      if (!interview) {
        return res.status(404).json({ error: "Interview not found" });
      }
      res.json(interview);
    } catch (error) {
      res.status(500).json({ error: "Failed to update interview" });
    }
  });

  // AI Assistant routes
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message, sessionId, context, templateId } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      let response;
      
      if (templateId) {
        // Use specific template
        const template = await promptTemplateService.getTemplate(templateId);
        if (!template) {
          return res.status(404).json({ error: "Template not found" });
        }
        
        // Render template with provided variables
        const renderedPrompt = await promptTemplateService.renderTemplate(templateId, req.body.variables || {});
        response = await aiService.chatWithAssistant(renderedPrompt, context);
      } else {
        // Use general chat
        response = await aiService.chatWithAssistant(message, context);
      }

      // Store conversation
      await storage.createAiConversation({
        userId: "default-user", // TODO: Get from auth
        sessionId: sessionId || "default-session",
        message,
        response,
        modelUsed: "gpt-5",
        tokensUsed: 0, // TODO: Track actual tokens
      });

      res.json({ response });
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

      const questions = await aiService.generateInterviewQuestions(jobTitle, requirements);
      res.json({ questions });
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

          // Update candidate match score
          await storage.updateCandidate(candidateId, {
            matchScore: matchResult.score.toString(),
          });

          // Store match result
          await storage.createJobMatch({
            candidateId,
            jobId,
            matchScore: matchResult.score.toString(),
            matchReasons: matchResult.reasons,
            aiAnalysis: matchResult.explanation,
          });

          results.push({
            candidateId,
            matchScore: matchResult.score,
            reasons: matchResult.reasons,
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

  const httpServer = createServer(app);
  return httpServer;
}
