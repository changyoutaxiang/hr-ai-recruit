import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  TrendingUp,
  Calendar,
  DollarSign
} from "lucide-react";
import type { Candidate } from "@shared/schema";

interface CandidateMatchCardProps {
  candidate: Candidate;
  matchScore: number;
  reasons: string[];
  explanation: string;
  onViewDetails?: () => void;
  onScheduleInterview?: () => void;
}

export function CandidateMatchCard({
  candidate,
  matchScore,
  reasons,
  explanation,
  onViewDetails,
  onScheduleInterview,
}: CandidateMatchCardProps) {
  const skills = Array.isArray(candidate.skills)
    ? (candidate.skills as string[])
    : [];
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

  return (
    <Card className="hover:shadow-lg transition-shadow" data-testid="card-candidate-match">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold truncate" data-testid="text-candidate-name">
                {candidate.name}
              </CardTitle>
              {candidate.position && (
                <p className="text-sm text-muted-foreground flex items-center mt-1">
                  <Briefcase className="w-3 h-3 mr-1" />
                  {candidate.position}
                </p>
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

        <div className="grid grid-cols-2 gap-3 text-sm">
          {candidate.email && (
            <div className="flex items-center space-x-2 truncate">
              <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate" data-testid="text-email">{candidate.email}</span>
            </div>
          )}

          {candidate.phone && (
            <div className="flex items-center space-x-2">
              <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span data-testid="text-phone">{candidate.phone}</span>
            </div>
          )}

          {candidate.location && (
            <div className="flex items-center space-x-2 truncate">
              <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate" data-testid="text-location">{candidate.location}</span>
            </div>
          )}

          {candidate.experience !== null && candidate.experience !== undefined && (
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span data-testid="text-experience">{candidate.experience} years exp</span>
            </div>
          )}
        </div>

        {skills.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Skills</p>
            <div className="flex flex-wrap gap-1">
              {skills.slice(0, 5).map((skill, index) => (
                <Badge key={index} variant="secondary" className="text-xs" data-testid={`badge-skill-${index}`}>
                  {skill}
                </Badge>
              ))}
              {skills.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{skills.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {reasons && reasons.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              Match Reasons
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
              View Profile
            </Button>
          )}
          {onScheduleInterview && (
            <Button
              size="sm"
              className="flex-1"
              onClick={onScheduleInterview}
              data-testid="button-schedule-interview"
            >
              Schedule Interview
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
