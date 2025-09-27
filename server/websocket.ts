import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { storage } from './storage';
import { InsertActivityLog, InsertNotification, InsertUserSession } from '@shared/schema';
import { randomUUID } from 'crypto';

interface WSClient extends WebSocket {
  userId?: string;
  sessionId?: string;
}

interface WSMessage {
  type: string;
  payload?: any;
}

class CollaborationService {
  private wss: WebSocketServer;
  private clients: Map<string, WSClient> = new Map();
  private userSessions: Map<string, string[]> = new Map(); // userId -> sessionIds[]

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server });
    this.setupWebSocket();
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws: WSClient, req) => {
      const sessionId = randomUUID();
      ws.sessionId = sessionId;
      
      console.log(`New WebSocket connection: ${sessionId}`);

      ws.on('message', async (data) => {
        try {
          const message: WSMessage = JSON.parse(data.toString());
          await this.handleMessage(ws, message);
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
        }
      });

      ws.on('close', async () => {
        if (ws.userId && ws.sessionId) {
          await this.handleUserDisconnect(ws.userId, ws.sessionId);
        }
        this.clients.delete(ws.sessionId!);
        console.log(`WebSocket disconnected: ${ws.sessionId}`);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });

      // Send welcome message
      ws.send(JSON.stringify({ 
        type: 'connected', 
        sessionId,
        message: 'Connected to collaboration service' 
      }));
    });
  }

  private async handleMessage(ws: WSClient, message: WSMessage) {
    switch (message.type) {
      case 'authenticate':
        await this.handleAuthentication(ws, message.payload);
        break;
      case 'activity':
        await this.handleActivity(ws, message.payload);
        break;
      case 'page_change':
        await this.handlePageChange(ws, message.payload);
        break;
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
      default:
        ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
    }
  }

  private async handleAuthentication(ws: WSClient, payload: { userId: string }) {
    const { userId } = payload;
    
    if (!userId) {
      ws.send(JSON.stringify({ type: 'error', message: 'User ID required' }));
      return;
    }

    ws.userId = userId;
    this.clients.set(ws.sessionId!, ws);

    // Update user sessions
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, []);
    }
    this.userSessions.get(userId)!.push(ws.sessionId!);

    // Create user session record
    try {
      const userSession: InsertUserSession = {
        userId,
        isOnline: true,
        currentPage: '/',
        lastActivity: new Date(),
        socketId: ws.sessionId!,
      };
      await storage.createUserSession(userSession);

      // Notify other team members
      await this.broadcastToTeam(userId, {
        type: 'user_online',
        payload: { userId, sessionId: ws.sessionId }
      });

      ws.send(JSON.stringify({ 
        type: 'authenticated', 
        message: 'Successfully authenticated' 
      }));

      // Send current team status
      const onlineUsers = await this.getOnlineUsers();
      ws.send(JSON.stringify({
        type: 'team_status',
        payload: { onlineUsers }
      }));

    } catch (error) {
      console.error('Error creating user session:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Authentication failed' }));
    }
  }

  private async handleActivity(ws: WSClient, payload: {
    action: string;
    entityType: string;
    entityId: string;
    entityName: string;
    details?: any;
  }) {
    if (!ws.userId) {
      ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }));
      return;
    }

    try {
      // Log the activity
      const activity: InsertActivityLog = {
        userId: ws.userId,
        action: payload.action,
        entityType: payload.entityType,
        entityId: payload.entityId,
        entityName: payload.entityName,
        details: payload.details || null,
      };
      await storage.createActivityLog(activity);

      // Broadcast to team members
      await this.broadcastToTeam(ws.userId, {
        type: 'team_activity',
        payload: {
          ...activity,
          userName: await this.getUserName(ws.userId),
          timestamp: new Date().toISOString()
        }
      }, ws.sessionId);

      // Create notifications for relevant team members
      await this.createActivityNotification(activity);

    } catch (error) {
      console.error('Error handling activity:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to log activity' }));
    }
  }

  private async handlePageChange(ws: WSClient, payload: { page: string }) {
    if (!ws.userId) return;

    try {
      await storage.updateUserSession(ws.sessionId!, {
        currentPage: payload.page,
        lastActivity: new Date(),
      });

      // Broadcast page change to team
      await this.broadcastToTeam(ws.userId, {
        type: 'user_page_change',
        payload: {
          userId: ws.userId,
          page: payload.page,
          userName: await this.getUserName(ws.userId)
        }
      }, ws.sessionId);

    } catch (error) {
      console.error('Error updating page:', error);
    }
  }

  private async handleUserDisconnect(userId: string, sessionId: string) {
    try {
      // Update session as offline
      await storage.updateUserSession(sessionId, {
        isOnline: false,
        lastActivity: new Date(),
      });

      // Remove from active sessions
      const sessions = this.userSessions.get(userId);
      if (sessions) {
        const index = sessions.indexOf(sessionId);
        if (index > -1) {
          sessions.splice(index, 1);
        }
        if (sessions.length === 0) {
          this.userSessions.delete(userId);
          
          // Notify team that user went offline
          await this.broadcastToTeam(userId, {
            type: 'user_offline',
            payload: { userId }
          });
        }
      }
    } catch (error) {
      console.error('Error handling user disconnect:', error);
    }
  }

  private async broadcastToTeam(excludeUserId: string, message: WSMessage, excludeSessionId?: string) {
    const messageStr = JSON.stringify(message);
    
    for (const [sessionId, client] of this.clients.entries()) {
      if (client.userId && 
          client.userId !== excludeUserId && 
          sessionId !== excludeSessionId &&
          client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    }
  }

  private async getOnlineUsers(): Promise<any[]> {
    try {
      return await storage.getOnlineUsers();
    } catch (error) {
      console.error('Error getting online users:', error);
      return [];
    }
  }

  private async getUserName(userId: string): Promise<string> {
    try {
      const user = await storage.getUser(userId);
      return user?.name || 'Unknown User';
    } catch (error) {
      return 'Unknown User';
    }
  }

  private async createActivityNotification(activity: InsertActivityLog) {
    try {
      // Get all team members except the actor
      const users = await storage.getUsers();
      const teamMembers = users.filter(user => user.id !== activity.userId);

      // Create notifications for relevant activities
      const notificationTypes = [
        'candidate_updated', 'candidate_created', 
        'interview_scheduled', 'interview_updated',
        'job_created', 'job_updated'
      ];

      if (notificationTypes.includes(activity.action)) {
        for (const member of teamMembers) {
          const notification: InsertNotification = {
            userId: member.id,
            type: 'team_activity',
            title: this.getNotificationTitle(activity.action),
            message: `${await this.getUserName(activity.userId)} ${this.getNotificationMessage(activity.action, activity.entityName)}`,
            entityType: activity.entityType,
            entityId: activity.entityId,
            isRead: false,
          };
          await storage.createNotification(notification);
        }
      }
    } catch (error) {
      console.error('Error creating activity notification:', error);
    }
  }

  private getNotificationTitle(action: string): string {
    const titles: Record<string, string> = {
      'candidate_created': 'New Candidate Added',
      'candidate_updated': 'Candidate Updated',
      'interview_scheduled': 'Interview Scheduled',
      'interview_updated': 'Interview Updated',
      'job_created': 'New Job Posted',
      'job_updated': 'Job Updated',
    };
    return titles[action] || 'Team Activity';
  }

  private getNotificationMessage(action: string, entityName: string): string {
    const messages: Record<string, string> = {
      'candidate_created': `added a new candidate: ${entityName}`,
      'candidate_updated': `updated candidate: ${entityName}`,
      'interview_scheduled': `scheduled an interview with ${entityName}`,
      'interview_updated': `updated an interview with ${entityName}`,
      'job_created': `created a new job: ${entityName}`,
      'job_updated': `updated job: ${entityName}`,
    };
    return messages[action] || `performed an action on ${entityName}`;
  }

  // Public methods for external use
  public async notifyUser(userId: string, notification: WSMessage) {
    const sessions = this.userSessions.get(userId);
    if (sessions) {
      const messageStr = JSON.stringify(notification);
      for (const sessionId of sessions) {
        const client = this.clients.get(sessionId);
        if (client && client.readyState === WebSocket.OPEN) {
          client.send(messageStr);
        }
      }
    }
  }

  public async broadcastToAll(message: WSMessage) {
    const messageStr = JSON.stringify(message);
    for (const [sessionId, client] of this.clients.entries()) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    }
  }
}

export { CollaborationService, WSClient, WSMessage };