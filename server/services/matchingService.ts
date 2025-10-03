import { type Candidate, type Job } from "@shared/schema";
import { aiService } from "./aiService";
import { storage } from "../storage";

export interface CandidateMatch {
  candidate: Candidate;
  matchScore: number;
  reasons: string[];
  explanation: string;
}

export class MatchingService {
  async findMatchingCandidates(job: Job, candidates: Candidate[]): Promise<CandidateMatch[]> {
    const matches: CandidateMatch[] = [];

    for (const candidate of candidates) {
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

        // Record token usage (non-blocking)
        storage.createAiConversation({
          userId: "system",
          sessionId: `batch-match-${job.id}`,
          message: `Match candidate ${candidate.name} to job ${job.title}`,
          response: JSON.stringify(matchResult.match),
          modelUsed: matchResult.model,
          tokensUsed: matchResult.usage.totalTokens,
        }).catch(error => {
          console.error('[Token Tracking] Failed to record batch matching token usage:', error);
        });

        // Extract match object from result (matchResult contains { match, usage, model })
        matches.push({
          candidate,
          matchScore: matchResult.match.score,
          reasons: matchResult.match.reasons,
          explanation: matchResult.match.explanation,
        });
      } catch (error) {
        console.error(`Error matching candidate ${candidate.id} to job ${job.id}:`, error);
        // Continue with other candidates even if one fails
      }
    }

    // Sort by match score descending
    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }

  async findMatchingJobs(candidate: Candidate, jobs: Job[]): Promise<CandidateMatch[]> {
    const matches: CandidateMatch[] = [];

    for (const job of jobs) {
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

        // Record token usage (non-blocking)
        storage.createAiConversation({
          userId: "system",
          sessionId: `find-jobs-${candidate.id}`,
          message: `Match job ${job.title} to candidate ${candidate.name}`,
          response: JSON.stringify(matchResult.match),
          modelUsed: matchResult.model,
          tokensUsed: matchResult.usage.totalTokens,
        }).catch(error => {
          console.error('[Token Tracking] Failed to record job matching token usage:', error);
        });

        // Extract match object from result (matchResult contains { match, usage, model })
        matches.push({
          candidate,
          matchScore: matchResult.match.score,
          reasons: matchResult.match.reasons,
          explanation: matchResult.match.explanation,
        });
      } catch (error) {
        console.error(`Error matching job ${job.id} to candidate ${candidate.id}:`, error);
        // Continue with other jobs even if one fails
      }
    }

    // Sort by match score descending
    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }

  calculateBasicMatch(candidate: Candidate, job: Job): number {
    let score = 0;
    const candidateSkills = (candidate.skills as string[]) || [];
    const jobRequirements = (job.requirements as string[]) || [];

    // Skill matching (40% of score)
    const skillMatches = candidateSkills.filter(skill =>
      jobRequirements.some(req => 
        req.toLowerCase().includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(req.toLowerCase())
      )
    ).length;
    
    const skillScore = jobRequirements.length > 0 
      ? (skillMatches / jobRequirements.length) * 40 
      : 0;
    score += skillScore;

    // Experience matching (30% of score)
    const candidateExp = candidate.experience || 0;
    const expectedExp = this.extractExperienceFromRequirements(jobRequirements);
    
    if (expectedExp > 0) {
      const expRatio = Math.min(candidateExp / expectedExp, 1);
      score += expRatio * 30;
    } else {
      score += 20; // Default if no experience requirement
    }

    // Location matching (20% of score)
    if (candidate.location && job.location) {
      const locationMatch = candidate.location.toLowerCase().includes(job.location.toLowerCase()) ||
                           job.location.toLowerCase().includes("remote") ||
                           candidate.location.toLowerCase().includes("remote");
      if (locationMatch) score += 20;
    } else {
      score += 10; // Partial score if location info is missing
    }

    // Salary expectation matching (10% of score)
    if (candidate.salaryExpectation && job.salaryMin && job.salaryMax) {
      const salaryMatch = candidate.salaryExpectation >= job.salaryMin && 
                         candidate.salaryExpectation <= job.salaryMax;
      if (salaryMatch) score += 10;
    } else {
      score += 5; // Partial score if salary info is missing
    }

    return Math.round(Math.min(score, 100));
  }

  private extractExperienceFromRequirements(requirements: string[]): number {
    for (const req of requirements) {
      const match = req.match(/(\d+)\+?\s*years?/i);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
    return 0;
  }
}

export const matchingService = new MatchingService();
