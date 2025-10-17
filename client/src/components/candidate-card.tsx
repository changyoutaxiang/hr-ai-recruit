import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  DollarSign,
  FileText,
  Eye,
  MessageSquare,
  Upload,
  Brain,
  Clock,
  Tag
} from "lucide-react";
import { useLocation } from "wouter";
import { type Candidate } from "@shared/schema";

interface CandidateCardProps {
  candidate: Candidate;
  onUploadResume?: () => void;
  onViewMatches?: (candidateId: string) => void;
}

export function CandidateCard({ candidate, onUploadResume, onViewMatches }: CandidateCardProps) {
  const [, navigate] = useLocation();
  const getStatusColor = (status: string) => {
    switch (status) {
      case "applied":
        return "bg-blue-500/10 text-blue-700 border-blue-500/20";
      case "screening":
        return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20";
      case "interview":
        return "bg-purple-500/10 text-purple-700 border-purple-500/20";
      case "offer":
        return "bg-green-500/10 text-green-700 border-green-500/20";
      case "hired":
        return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
      case "rejected":
        return "bg-red-500/10 text-red-700 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-700 border-gray-500/20";
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case "linkedin":
        return "bg-blue-500/10 text-blue-700";
      case "job_board":
        return "bg-green-500/10 text-green-700";
      case "referral":
        return "bg-purple-500/10 text-purple-700";
      default:
        return "bg-gray-500/10 text-gray-700";
    }
  };

  const formatSalary = (amount?: number) => {
    if (!amount) return "Not specified";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatLastContacted = (date?: Date) => {
    if (!date) return "Never";
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return `${Math.floor(diffInDays / 30)} months ago`;
  };

  const skills = candidate.skills as string[] || [];
  const tags = candidate.tags as string[] || [];
  const matchScore = Number(candidate.matchScore) || 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-lg font-semibold text-primary">
                {candidate.name?.charAt(0) || 'C'}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-foreground" data-testid={`text-name-${candidate.id}`}>
                {candidate.name || 'Unknown Name'}
              </h3>
              <p className="text-sm text-muted-foreground" data-testid={`text-position-${candidate.id}`}>
                {candidate.position || 'Position not specified'}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-1">
            <Badge 
              className={getStatusColor(candidate.status)}
              data-testid={`badge-status-${candidate.id}`}
            >
              {candidate.status}
            </Badge>
            {candidate.source && (
              <Badge 
                variant="outline" 
                className={`text-xs ${getSourceColor(candidate.source)}`}
                data-testid={`badge-source-${candidate.id}`}
              >
                {candidate.source}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Contact Information */}
        <div className="space-y-2">
          {candidate.email && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Mail className="w-4 h-4 mr-2" />
              <span data-testid={`text-email-${candidate.id}`}>{candidate.email}</span>
            </div>
          )}
          {candidate.phone && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Phone className="w-4 h-4 mr-2" />
              <span data-testid={`text-phone-${candidate.id}`}>{candidate.phone}</span>
            </div>
          )}
          {candidate.location && (
            <div className="flex items-center text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 mr-2" />
              <span data-testid={`text-location-${candidate.id}`}>{candidate.location}</span>
            </div>
          )}
        </div>

        {/* Experience and Salary */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Experience</p>
            <p className="font-medium" data-testid={`text-experience-${candidate.id}`}>
              {candidate.experience ? `${candidate.experience} years` : 'Not specified'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Salary Expectation</p>
            <p className="font-medium" data-testid={`text-salary-${candidate.id}`}>
              {formatSalary(candidate.salaryExpectation ?? undefined)}
            </p>
          </div>
        </div>

        {/* Match Score */}
        {matchScore > 0 && (
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <div className="flex items-center space-x-1">
                <Brain className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">AI Match Score</span>
              </div>
              <span className="font-medium text-chart-2" data-testid={`text-match-score-${candidate.id}`}>
                {matchScore}%
              </span>
            </div>
            <Progress value={matchScore} className="h-2" />
          </div>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">Skills</p>
            <div className="flex flex-wrap gap-1">
              {skills.slice(0, 3).map((skill, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="text-xs"
                  data-testid={`badge-skill-${candidate.id}-${index}`}
                >
                  {skill}
                </Badge>
              ))}
              {skills.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{skills.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">Tags</p>
            <div className="flex flex-wrap gap-1">
              {tags.map((tag, index) => (
                <Badge 
                  key={index} 
                  variant="outline" 
                  className="text-xs"
                  data-testid={`badge-tag-${candidate.id}-${index}`}
                >
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* AI Summary */}
        {candidate.aiSummary && (
          <div className="p-3 bg-accent rounded-lg">
            <div className="flex items-center space-x-2 mb-1">
              <Brain className="w-4 h-4 text-primary" />
              <p className="text-xs text-muted-foreground">AI Summary</p>
            </div>
            <p className="text-sm text-accent-foreground line-clamp-2" data-testid={`text-ai-summary-${candidate.id}`}>
              {candidate.aiSummary}
            </p>
          </div>
        )}

        {/* Last Contacted */}
        <div className="flex items-center text-xs text-muted-foreground">
          <Clock className="w-3 h-3 mr-1" />
          <span>Last contacted: {formatLastContacted(candidate.lastContactedAt ?? undefined)}</span>
        </div>

        {/* Actions */}
        <div className="flex flex-col space-y-2 pt-2">
          <div className="flex space-x-2">
            <Button 
              size="sm" 
              className="flex-1" 
              onClick={() => navigate(`/candidates/${candidate.id}`)}
              data-testid={`button-view-${candidate.id}`}
            >
              <Eye className="w-4 h-4 mr-2" />
              View Profile
            </Button>
            {onViewMatches && (
              <Button
                size="sm"
                variant="secondary"
                className="flex-1"
                onClick={() => onViewMatches(candidate.id)}
                data-testid={`button-view-matches-${candidate.id}`}
              >
                <Brain className="w-4 h-4 mr-2" />
                AI Matches
              </Button>
            )}
          </div>
          <div className="flex space-x-2">
            <Button size="sm" variant="outline" data-testid={`button-message-${candidate.id}`}>
              <MessageSquare className="w-4 h-4" />
            </Button>
            {candidate.resumeUrl ? (
              <Button size="sm" variant="outline" data-testid={`button-resume-${candidate.id}`}>
                <FileText className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={onUploadResume}
                data-testid={`button-upload-resume-${candidate.id}`}
              >
                <Upload className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Last Updated */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          <Calendar className="w-3 h-3 mr-1 inline" />
          Updated {new Date(candidate.updatedAt!).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
}
