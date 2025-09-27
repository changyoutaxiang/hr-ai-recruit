import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWebSocketContext } from "@/contexts/websocket-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Users, 
  UserPlus, 
  Calendar, 
  Briefcase, 
  FileText,
  Clock,
  Eye
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName: string;
  details?: any;
  createdAt: string;
  userName?: string;
}

const actionIcons: Record<string, any> = {
  'candidate_created': UserPlus,
  'candidate_updated': Users,
  'job_created': Briefcase,
  'job_updated': Briefcase,
  'interview_scheduled': Calendar,
  'interview_updated': Calendar,
  'comment_added': FileText,
  'resume_viewed': Eye,
};

const actionColors: Record<string, string> = {
  'candidate_created': 'bg-green-500',
  'candidate_updated': 'bg-blue-500', 
  'job_created': 'bg-purple-500',
  'job_updated': 'bg-purple-400',
  'interview_scheduled': 'bg-orange-500',
  'interview_updated': 'bg-orange-400',
  'comment_added': 'bg-gray-500',
  'resume_viewed': 'bg-indigo-500',
};

export function TeamActivity() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const queryClient = useQueryClient();

  const { data: activityData } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity"],
  });

  const { isConnected, subscribe } = useWebSocketContext();
  
  // Handle real-time activity updates
  useEffect(() => {
    const unsubscribe = subscribe((message: any) => {
      if (message.type === 'team_activity') {
        const newActivity = message.payload;
        setActivities(prev => [newActivity, ...prev.slice(0, 49)]); // Keep last 50 activities
        
        // Invalidate activity query to refresh
        queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      }
    });
    
    return unsubscribe;
  }, [subscribe, queryClient]);

  useEffect(() => {
    if (activityData) {
      setActivities(activityData.slice(0, 50));
    }
  }, [activityData]);

  const getActivityDescription = (activity: ActivityLog) => {
    const userName = activity.userName || 'Someone';
    
    switch (activity.action) {
      case 'candidate_created':
        return `${userName} added new candidate ${activity.entityName}`;
      case 'candidate_updated':
        return `${userName} updated candidate ${activity.entityName}`;
      case 'job_created':
        return `${userName} posted new job ${activity.entityName}`;
      case 'job_updated':
        return `${userName} updated job ${activity.entityName}`;
      case 'interview_scheduled':
        return `${userName} scheduled interview with ${activity.entityName}`;
      case 'interview_updated':
        return `${userName} updated interview with ${activity.entityName}`;
      case 'comment_added':
        return `${userName} commented on ${activity.entityName}`;
      case 'resume_viewed':
        return `${userName} viewed resume for ${activity.entityName}`;
      default:
        return `${userName} performed ${activity.action} on ${activity.entityName}`;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Team Activity</CardTitle>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-muted-foreground">
            {isConnected ? 'Live' : 'Offline'}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          {activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No recent team activity</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => {
                const IconComponent = actionIcons[activity.action] || FileText;
                const iconColor = actionColors[activity.action] || 'bg-gray-500';
                
                return (
                  <div key={activity.id} className="flex items-start space-x-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                    <div className={`w-8 h-8 rounded-full ${iconColor} flex items-center justify-center flex-shrink-0`}>
                      <IconComponent className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {getActivityDescription(activity)}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {activity.entityType}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}