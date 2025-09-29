import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Briefcase,
  MapPin,
  DollarSign,
  TrendingUp,
  Building,
  Clock
} from "lucide-react";
import type { Job } from "@shared/schema";

interface JobMatchCardProps {
  job: Job;
  matchScore: number;
  reasons: string[];
  explanation: string;
  onViewDetails?: () => void;
  onApply?: () => void;
}

export function JobMatchCard({
  job,
  matchScore,
  reasons,
  explanation,
  onViewDetails,
  onApply,
}: JobMatchCardProps) {
  const getMatchColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-blue-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const getMatchLabel = (score: number) => {
    if (score >= 80) return "Excellent Match";
    if (score >= 60) return "Good Match";
    if (score >= 40) return "Fair Match";
    return "Low Match";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "paused":
        return "bg-yellow-100 text-yellow-800";
      case "closed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow" data-testid="card-job-match">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <CardTitle className="text-lg font-semibold truncate" data-testid="text-job-title">
                {job.title}
              </CardTitle>
              <Badge className={getStatusColor(job.status)} variant="secondary" data-testid="badge-job-status">
                {job.status}
              </Badge>
            </div>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              {job.department && (
                <div className="flex items-center space-x-1">
                  <Building className="w-3 h-3" />
                  <span data-testid="text-department">{job.department}</span>
                </div>
              )}
              {job.location && (
                <div className="flex items-center space-x-1">
                  <MapPin className="w-3 h-3" />
                  <span data-testid="text-location">{job.location}</span>
                </div>
              )}
              {job.type && (
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span data-testid="text-type">{job.type}</span>
                </div>
              )}
            </div>
          </div>

          <div className="text-right ml-4 flex-shrink-0">
            <div className={`text-3xl font-bold ${getMatchColor(matchScore)}`} data-testid="text-match-score">
              {matchScore}%
            </div>
            <p className="text-xs text-muted-foreground">{getMatchLabel(matchScore)}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Progress value={matchScore} className="h-2" data-testid="progress-match-score" />

        {(job.salaryMin || job.salaryMax) && (
          <div className="flex items-center space-x-2 text-sm">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium" data-testid="text-salary">
              {job.salaryMin && job.salaryMax
                ? `$${job.salaryMin.toLocaleString()} - $${job.salaryMax.toLocaleString()}`
                : job.salaryMin
                ? `From $${job.salaryMin.toLocaleString()}`
                : `Up to $${job.salaryMax?.toLocaleString()}`}
            </span>
          </div>
        )}

        {job.description && (
          <p className="text-sm text-muted-foreground line-clamp-2" data-testid="text-description">
            {job.description}
          </p>
        )}

        {job.requirements && (job.requirements as string[]).length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Key Requirements</p>
            <div className="flex flex-wrap gap-1">
              {(job.requirements as string[]).slice(0, 4).map((req, index) => (
                <Badge key={index} variant="outline" className="text-xs" data-testid={`badge-requirement-${index}`}>
                  {req}
                </Badge>
              ))}
              {(job.requirements as string[]).length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{(job.requirements as string[]).length - 4} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {reasons && reasons.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              Why This Matches
            </p>
            <ul className="space-y-1">
              {reasons.slice(0, 3).map((reason, index) => (
                <li key={index} className="text-xs text-foreground flex items-start" data-testid={`text-reason-${index}`}>
                  <span className="text-green-600 mr-1">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex space-x-2 pt-2">
          {onViewDetails && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onViewDetails}
              data-testid="button-view-details"
            >
              View Job
            </Button>
          )}
          {onApply && (
            <Button
              size="sm"
              className="flex-1"
              onClick={onApply}
              data-testid="button-apply"
            >
              Apply Now
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}