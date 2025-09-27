import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Clock, 
  Video, 
  Phone, 
  MapPin,
  User,
  Building,
  Edit,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import { type Interview } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface InterviewCardProps {
  interview: Interview;
}

export function InterviewCard({ interview }: InterviewCardProps) {
  const { toast } = useToast();

  // Fetch candidate and job details
  const { data: candidate } = useQuery<any>({
    queryKey: ["/api/candidates", interview.candidateId],
    enabled: !!interview.candidateId,
  });

  const { data: job } = useQuery<any>({
    queryKey: ["/api/jobs", interview.jobId],
    enabled: !!interview.jobId,
  });

  const updateInterviewMutation = useMutation({
    mutationFn: async (data: Partial<Interview>) => {
      const response = await apiRequest("PUT", `/api/interviews/${interview.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interviews"] });
      toast({
        title: "Interview updated",
        description: "Interview has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update interview.",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-500/10 text-blue-700 border-blue-500/20";
      case "completed":
        return "bg-green-500/10 text-green-700 border-green-500/20";
      case "cancelled":
        return "bg-red-500/10 text-red-700 border-red-500/20";
      case "no-show":
        return "bg-gray-500/10 text-gray-700 border-gray-500/20";
      default:
        return "bg-gray-500/10 text-gray-700 border-gray-500/20";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return Video;
      case "phone":
        return Phone;
      case "in-person":
        return MapPin;
      default:
        return Video;
    }
  };

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(date));
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const isUpcoming = new Date(interview.scheduledDate) > new Date();
  const isPast = new Date(interview.scheduledDate) < new Date();
  const TypeIcon = getTypeIcon(interview.type);

  const handleStatusUpdate = (status: string) => {
    updateInterviewMutation.mutate({ status });
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <TypeIcon className="w-4 h-4 text-muted-foreground" />
              <Badge 
                className={getStatusColor(interview.status)}
                data-testid={`badge-status-${interview.id}`}
              >
                {interview.status}
              </Badge>
              {interview.round > 1 && (
                <Badge variant="outline" className="text-xs">
                  Round {interview.round}
                </Badge>
              )}
            </div>
            
            <h3 className="font-semibold text-foreground" data-testid={`text-title-${interview.id}`}>
              {candidate?.name || 'Unknown Candidate'}
            </h3>
            <p className="text-sm text-muted-foreground" data-testid={`text-job-${interview.id}`}>
              {job?.title || 'Unknown Position'}
            </p>
          </div>
          
          {interview.rating && (
            <div className="text-right">
              <div className="flex items-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full ${
                      i < interview.rating! ? "bg-yellow-400" : "bg-gray-200"
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {interview.rating}/5
              </p>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Date and Time */}
        <div className="space-y-2">
          <div className="flex items-center text-sm">
            <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
            <span data-testid={`text-datetime-${interview.id}`}>
              {formatDateTime(interview.scheduledDate)}
            </span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="w-4 h-4 mr-2" />
            <span data-testid={`text-duration-${interview.id}`}>
              {formatDuration(interview.duration)}
            </span>
          </div>
        </div>

        {/* Location/Link */}
        {interview.type === "video" && interview.meetingLink && (
          <div className="p-3 bg-accent rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Meeting Link</p>
            <a 
              href={interview.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
              data-testid={`link-meeting-${interview.id}`}
            >
              Join Video Call
            </a>
          </div>
        )}

        {interview.type === "in-person" && interview.location && (
          <div className="flex items-center text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 mr-2" />
            <span data-testid={`text-location-${interview.id}`}>{interview.location}</span>
          </div>
        )}

        {/* Interviewer */}
        {interview.interviewerId && (
          <div className="flex items-center text-sm text-muted-foreground">
            <User className="w-4 h-4 mr-2" />
            <span>Interviewer assigned</span>
          </div>
        )}

        {/* Feedback */}
        {interview.feedback && (
          <div className="p-3 bg-accent rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Feedback</p>
            <p className="text-sm text-accent-foreground line-clamp-3" data-testid={`text-feedback-${interview.id}`}>
              {interview.feedback}
            </p>
          </div>
        )}

        {/* Recommendation */}
        {interview.recommendation && (
          <div className="flex items-center space-x-2">
            {interview.recommendation === "hire" && (
              <CheckCircle className="w-4 h-4 text-green-600" />
            )}
            {interview.recommendation === "reject" && (
              <XCircle className="w-4 h-4 text-red-600" />
            )}
            {interview.recommendation === "next-round" && (
              <AlertCircle className="w-4 h-4 text-yellow-600" />
            )}
            <span className="text-sm capitalize" data-testid={`text-recommendation-${interview.id}`}>
              {interview.recommendation.replace("-", " ")}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-2 pt-2 border-t">
          {interview.status === "scheduled" && isUpcoming && (
            <>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleStatusUpdate("completed")}
                disabled={updateInterviewMutation.isPending}
                data-testid={`button-complete-${interview.id}`}
              >
                Mark Complete
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleStatusUpdate("cancelled")}
                disabled={updateInterviewMutation.isPending}
                data-testid={`button-cancel-${interview.id}`}
              >
                Cancel
              </Button>
            </>
          )}
          
          {interview.status === "scheduled" && isPast && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleStatusUpdate("no-show")}
              disabled={updateInterviewMutation.isPending}
              data-testid={`button-no-show-${interview.id}`}
            >
              Mark No Show
            </Button>
          )}

          <Button 
            size="sm" 
            className="flex-1"
            data-testid={`button-view-${interview.id}`}
          >
            <Edit className="w-4 h-4 mr-2" />
            View Details
          </Button>
        </div>

        {/* Time indicator */}
        <div className="text-xs text-center text-muted-foreground">
          {isUpcoming && interview.status === "scheduled" && (
            <span className="text-blue-600">
              Upcoming • {new Date(interview.scheduledDate) > new Date() ? 'In future' : 'Past due'}
            </span>
          )}
          {interview.status === "completed" && (
            <span className="text-green-600">Completed</span>
          )}
          {interview.status === "cancelled" && (
            <span className="text-red-600">Cancelled</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
