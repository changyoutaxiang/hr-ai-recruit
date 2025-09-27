import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useWebSocketContext } from "@/contexts/websocket-context";
import { useQuery } from "@tanstack/react-query";
import { Users, Circle } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function OnlineUsers() {
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);

  const { data: onlineData } = useQuery<User[]>({
    queryKey: ["/api/team/online"],
  });

  const { isConnected, subscribe } = useWebSocketContext();
  
  // Handle real-time user status updates
  useEffect(() => {
    const unsubscribe = subscribe((message: any) => {
      if (message.type === 'user_online') {
        // Refetch online users when someone comes online
        // In a real app, we could add the user directly to avoid refetch
      } else if (message.type === 'user_offline') {
        // Remove user from online list
        setOnlineUsers(prev => prev.filter(user => user.id !== message.payload.userId));
      } else if (message.type === 'team_status') {
        // Update full team status
        setOnlineUsers(message.payload.onlineUsers || []);
      }
    });
    
    return unsubscribe;
  }, [subscribe]);

  useEffect(() => {
    if (onlineData) {
      setOnlineUsers(onlineData);
    }
  }, [onlineData]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'hr_manager':
        return 'bg-blue-500';
      case 'recruiter':
        return 'bg-green-500';
      case 'admin':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Team Online</CardTitle>
        <div className="flex items-center space-x-2">
          <Circle className="w-2 h-2 fill-green-500 text-green-500" />
          <span className="text-xs text-muted-foreground">
            {onlineUsers.length} online
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {onlineUsers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No one is online</p>
          </div>
        ) : (
          <div className="space-y-3">
            {onlineUsers.map((user) => (
              <div key={user.id} className="flex items-center space-x-3">
                <div className="relative">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className={`text-xs font-medium text-white ${getRoleColor(user.role)}`}>
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user.name}
                  </p>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-xs">
                      {user.role.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}