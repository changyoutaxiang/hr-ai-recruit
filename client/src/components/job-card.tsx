import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Calendar, 
  DollarSign,
  Users,
  Clock,
  Building,
  Edit,
  Eye,
  Pause,
  Play,
  X
} from "lucide-react";
import { type Job } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface JobCardProps {
  job: Job;
}

export function JobCard({ job }: JobCardProps) {
  const { toast } = useToast();

  const updateJobMutation = useMutation({
    mutationFn: async (data: Partial<Job>) => {
      const response = await apiRequest("PUT", `/api/jobs/${job.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({
        title: "Job updated",
        description: "Job status has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update job status.",
        variant: "destructive",
      });
    },
  });

  const deleteJobMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/jobs/${job.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({
        title: "Job deleted",
        description: "Job has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete job.",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/10 text-green-700 border-green-500/20";
      case "paused":
        return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20";
      case "closed":
        return "bg-red-500/10 text-red-700 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-700 border-gray-500/20";
    }
  };

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return "Not specified";
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });
    if (min && max) {
      return `${formatter.format(min)} - ${formatter.format(max)}`;
    }
    return formatter.format(min || max || 0);
  };

  const requirements = job.requirements as string[] || [];

  const handleStatusToggle = () => {
    const newStatus = job.status === "active" ? "paused" : "active";
    updateJobMutation.mutate({ status: newStatus });
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this job?")) {
      deleteJobMutation.mutate();
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-foreground text-lg mb-1" data-testid={`text-title-${job.id}`}>
              {job.title}
            </h3>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center">
                <Building className="w-4 h-4 mr-1" />
                <span data-testid={`text-department-${job.id}`}>{job.department}</span>
              </div>
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-1" />
                <span data-testid={`text-location-${job.id}`}>{job.location}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge 
              className={getStatusColor(job.status)}
              data-testid={`badge-status-${job.id}`}
            >
              {job.status}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Job Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Type</p>
            <p className="font-medium capitalize" data-testid={`text-type-${job.id}`}>
              {job.type.replace("-", " ")}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Salary</p>
            <p className="font-medium" data-testid={`text-salary-${job.id}`}>
              {formatSalary(job.salaryMin, job.salaryMax)}
            </p>
          </div>
        </div>

        {/* Description */}
        <div>
          <p className="text-sm text-muted-foreground line-clamp-3" data-testid={`text-description-${job.id}`}>
            {job.description}
          </p>
        </div>

        {/* Requirements */}
        {requirements.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">Requirements</p>
            <div className="flex flex-wrap gap-1">
              {requirements.slice(0, 3).map((req, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="text-xs"
                  data-testid={`badge-requirement-${job.id}-${index}`}
                >
                  {req}
                </Badge>
              ))}
              {requirements.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{requirements.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-1" />
              <span>0 applicants</span>
            </div>
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              <span>Posted {new Date(job.createdAt!).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-2 pt-2">
          <Button size="sm" className="flex-1" data-testid={`button-view-${job.id}`}>
            <Eye className="w-4 h-4 mr-2" />
            View Details
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={handleStatusToggle}
            disabled={updateJobMutation.isPending}
            data-testid={`button-toggle-status-${job.id}`}
          >
            {job.status === "active" ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            data-testid={`button-edit-${job.id}`}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={handleDelete}
            disabled={deleteJobMutation.isPending}
            data-testid={`button-delete-${job.id}`}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
