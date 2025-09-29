import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { JobMatchCard } from "@/components/job-match-card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Brain, Loader2, RefreshCw, Briefcase } from "lucide-react";
import type { Job } from "@shared/schema";

interface CandidateJobMatchesProps {
  candidateId: string;
}

interface JobMatch {
  id: string;
  candidateId: string;
  jobId: string;
  matchScore: string;
  matchReasons: string[];
  aiAnalysis: string;
  job: Job;
  createdAt: Date;
}

export function CandidateJobMatches({ candidateId }: CandidateJobMatchesProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: matches, isLoading } = useQuery<JobMatch[]>({
    queryKey: [`/api/candidates/${candidateId}/matches`],
    retry: 1,
  });

  const findMatchesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/candidates/${candidateId}/find-matches`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/candidates/${candidateId}/matches`] });
      setIsGenerating(false);
      toast({
        title: "Matches found",
        description: "AI has analyzed and ranked suitable positions for this candidate.",
      });
    },
    onError: (error: Error) => {
      setIsGenerating(false);
      toast({
        title: "Failed to find matches",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFindMatches = () => {
    setIsGenerating(true);
    findMatchesMutation.mutate();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!matches || matches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Brain className="w-5 h-5" />
              <span>AI Job Matching</span>
            </CardTitle>
            <Button
              onClick={handleFindMatches}
              disabled={isGenerating}
              data-testid="button-find-matches"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Find Matches
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Briefcase className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No job matches found yet
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Use AI to analyze all open positions and find the best matches for this candidate.
            </p>
            <Button
              onClick={handleFindMatches}
              disabled={isGenerating}
              size="lg"
              data-testid="button-find-matches-empty"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing Positions...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Find Best Matches
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="w-5 h-5 text-primary" />
                <span>Matched Positions</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {matches.length} positions ranked by AI match score
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleFindMatches}
              disabled={isGenerating}
              data-testid="button-refresh-matches"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Matches
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {matches.map((match) => (
          <JobMatchCard
            key={match.id}
            job={match.job}
            matchScore={parseFloat(match.matchScore)}
            reasons={match.matchReasons || []}
            explanation={match.aiAnalysis || ""}
            onViewDetails={() => {
              window.location.href = `/jobs?id=${match.job.id}`;
            }}
            onApply={() => {
              window.location.href = `/interviews?candidateId=${candidateId}&jobId=${match.job.id}`;
            }}
          />
        ))}
      </div>
    </div>
  );
}