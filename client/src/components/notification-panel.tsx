import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWebSocketContext } from "@/contexts/websocket-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Bell, 
  BellRing,
  X,
  Check,
  AlertCircle,
  Info,
  CheckCircle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  createdAt: string;
}

const notificationIcons: Record<string, any> = {
  'team_activity': Info,
  'candidate_update': AlertCircle,
  'interview_reminder': BellRing,
  'system': CheckCircle,
};

const notificationColors: Record<string, string> = {
  'team_activity': 'text-blue-500',
  'candidate_update': 'text-orange-500',
  'interview_reminder': 'text-purple-500',
  'system': 'text-green-500',
};

export function NotificationPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  // Mock user ID - in real app this would come from auth context
  const userId = "hr-user-1";

  const { data: notificationData } = useQuery<Notification[]>({
    queryKey: ["/api/notifications", userId],
    queryFn: async () => {
      const response = await fetch(`/api/notifications?userId=${userId}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return apiRequest("PATCH", `/api/notifications/${notificationId}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications", userId] });
    },
  });

  const { isConnected, subscribe } = useWebSocketContext();
  
  // Handle real-time notifications
  useEffect(() => {
    const unsubscribe = subscribe((message: any) => {
      if (message.type === 'notification') {
        const newNotification = message.payload;
        setNotifications(prev => [newNotification, ...prev]);
        
        // Invalidate notifications query to refresh
        queryClient.invalidateQueries({ queryKey: ["/api/notifications", userId] });
      }
    });
    
    return unsubscribe;
  }, [subscribe, queryClient, userId]);

  useEffect(() => {
    if (notificationData) {
      setNotifications(notificationData);
    }
  }, [notificationData]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = (notificationId: string) => {
    markAsReadMutation.mutate(notificationId);
    
    // Optimistically update local state
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, isRead: true } : n
      )
    );
  };

  const handleMarkAllAsRead = () => {
    const unreadNotifications = notifications.filter(n => !n.isRead);
    unreadNotifications.forEach(notification => {
      markAsReadMutation.mutate(notification.id);
    });
    
    // Optimistically update local state
    setNotifications(prev => 
      prev.map(n => ({ ...n, isRead: true }))
    );
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
        data-testid="button-notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <Card className="absolute right-0 top-full mt-2 w-80 z-50 shadow-lg border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notifications</CardTitle>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="text-xs"
                >
                  Mark all read
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-80">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No notifications</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((notification) => {
                    const IconComponent = notificationIcons[notification.type] || Info;
                    const iconColor = notificationColors[notification.type] || 'text-gray-500';
                    
                    return (
                      <div 
                        key={notification.id} 
                        className={`p-3 border-b border-border hover:bg-accent/50 transition-colors ${
                          !notification.isRead ? 'bg-accent/30' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <IconComponent className={`w-4 h-4 mt-1 ${iconColor}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-foreground">
                                {notification.title}
                              </p>
                              {!notification.isRead && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMarkAsRead(notification.id)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Check className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {notification.message}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <Badge variant="outline" className="text-xs">
                                {notification.type.replace('_', ' ')}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                              </span>
                            </div>
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
      )}
    </div>
  );
}