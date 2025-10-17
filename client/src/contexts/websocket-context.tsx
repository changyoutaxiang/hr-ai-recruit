import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';

interface WSMessage {
  type: string;
  payload?: any;
}

interface WebSocketContextType {
  isConnected: boolean;
  sendMessage: (message: WSMessage) => void;
  subscribe: (callback: (message: WSMessage) => void) => () => void;
  lastMessage: WSMessage | null;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: ReactNode;
  autoConnect?: boolean;
}

export function WebSocketProvider({ children, autoConnect = true }: WebSocketProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const subscribers = useRef<Set<(message: WSMessage) => void>>(new Set());
  const messageQueue = useRef<WSMessage[]>([]);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnecting = useRef(false);
  const shouldConnect = useRef(false);
  const connectionLock = useRef(false); // 添加连接锁
  const lastUserId = useRef<string | null>(null); // 记录上次连接的用户ID
  const { toast } = useToast();
  const [location] = useLocation();
  const { user, profile, loading } = useAuth();

  // Get the correct WebSocket URL based on current protocol
  const getWebSocketURL = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // In development, connect to backend server on port 3000
    const isDevelopment = import.meta.env.DEV;
    const host = isDevelopment ? 'localhost:3000' : window.location.host;
    return `${protocol}//${host}`;
  }, []);

  // Calculate reconnection delay with exponential backoff and jitter
  const getReconnectDelay = useCallback((attempt: number) => {
    const baseDelay = Math.min(1000 * Math.pow(2, attempt), 30000); // Max 30 seconds
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    return baseDelay + jitter;
  }, []);

  // Send queued messages when connection is established
  const processMessageQueue = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN && messageQueue.current.length > 0) {
      const messages = [...messageQueue.current];
      messageQueue.current = [];
      
      messages.forEach(message => {
        try {
          ws.current?.send(JSON.stringify(message));
        } catch (error) {
          console.error('Error sending queued message:', error);
          // Re-queue the message if sending fails
          messageQueue.current.push(message);
        }
      });
    }
  }, []);

  // Clear any pending reconnection attempts
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    // 检查连接锁
    if (connectionLock.current) {
      console.log('[WebSocket] Connection locked, skipping connect attempt');
      return;
    }

    // Only connect if user is authenticated and should connect
    if (!user || !profile || loading || !shouldConnect.current) {
      return;
    }

    // 检查是否是同一个用户，如果是且已连接则跳过
    if (lastUserId.current === user.id && ws.current?.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Already connected for user:', user.id);
      return;
    }

    // Prevent multiple simultaneous connection attempts
    if (isConnecting.current) {
      console.log('[WebSocket] Already connecting, skipping');
      return;
    }

    // Don't create new connection if already connected
    if (ws.current?.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Already connected');
      return;
    }

    // Don't create new connection if already connecting
    if (ws.current?.readyState === WebSocket.CONNECTING) {
      console.log('[WebSocket] Already connecting');
      return;
    }

    // 设置连接锁
    connectionLock.current = true;
    
    // Clear any pending reconnection attempts
    clearReconnectTimeout();

    // Set connecting flag
    isConnecting.current = true;

    // Close existing connection if it exists and is not already closed
    if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
      ws.current.close();
      ws.current = null;
    }

    try {
      const wsUrl = getWebSocketURL();
      console.log('[WebSocket] Connecting to:', wsUrl, 'for user:', user.id);
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('[WebSocket] Connected successfully for user:', user.id);
        setIsConnected(true);
        reconnectAttempts.current = 0;
        isConnecting.current = false;
        connectionLock.current = false; // 释放连接锁
        lastUserId.current = user.id; // 记录当前用户ID
        
        // Wait a bit to ensure connection is fully established
        setTimeout(() => {
          if (ws.current?.readyState === WebSocket.OPEN && shouldConnect.current) {
            // Authenticate with real user ID
            try {
              ws.current.send(JSON.stringify({
                type: 'authenticate',
                payload: { userId: user!.id }
              }));

              // Send current page
              ws.current.send(JSON.stringify({
                type: 'page_change',
                payload: { page: location }
              }));

              // Process any queued messages
              processMessageQueue();
            } catch (error) {
              console.error('Error sending initial messages:', error);
            }
          }
        }, 100); // Small delay to ensure connection is stable
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          setLastMessage(message);
          
          // Notify all subscribers
          subscribers.current.forEach(callback => {
            try {
              callback(message);
            } catch (error) {
              console.error('Error in WebSocket message subscriber:', error);
            }
          });

          // Handle global message types
          switch (message.type) {
            case 'notification':
              toast({
                title: message.payload.title,
                description: message.payload.message,
              });
              break;
            case 'pong':
              // Heartbeat response - connection is alive
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.current.onclose = (event) => {
        console.log('[WebSocket] Connection closed for user:', lastUserId.current);
        setIsConnected(false);
        isConnecting.current = false;
        connectionLock.current = false; // 释放连接锁
        
        // Only attempt to reconnect if auto-connect is enabled, should connect, and we haven't exceeded max attempts
        if (autoConnect && shouldConnect.current && reconnectAttempts.current < maxReconnectAttempts && user && profile && !loading) {
          const delay = getReconnectDelay(reconnectAttempts.current);
          reconnectAttempts.current++;
          
          console.log(`[WebSocket] Scheduling reconnect attempt ${reconnectAttempts.current} in ${delay}ms`);
          reconnectTimeoutRef.current = setTimeout(() => {
            if (shouldConnect.current) {
              connect();
            }
          }, delay);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
        isConnecting.current = false;
        connectionLock.current = false; // 释放连接锁
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setIsConnected(false);
      isConnecting.current = false;
      connectionLock.current = false; // 释放连接锁
    }
  }, [getWebSocketURL, autoConnect, processMessageQueue, getReconnectDelay, clearReconnectTimeout, toast]);

  const disconnect = useCallback(() => {
    console.log('[WebSocket] Disconnecting...');
    shouldConnect.current = false;
    clearReconnectTimeout();
    isConnecting.current = false;
    connectionLock.current = false; // 释放连接锁
    lastUserId.current = null; // 清除用户ID记录
    
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    setIsConnected(false);
    messageQueue.current = []; // Clear message queue on disconnect
  }, [clearReconnectTimeout]);

  const sendMessage = useCallback((message: WSMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      try {
        ws.current.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        // Queue the message for retry
        messageQueue.current.push(message);
      }
    } else if (ws.current?.readyState === WebSocket.CONNECTING) {
      // Queue message if still connecting
      messageQueue.current.push(message);
    } else {
      // Queue the message for when connection is re-established
      messageQueue.current.push(message);
    }
  }, []);

  const subscribe = useCallback((callback: (message: WSMessage) => void) => {
    subscribers.current.add(callback);
    
    // Return unsubscribe function
    return () => {
      subscribers.current.delete(callback);
    };
  }, []);

  // Auto-connect when user is authenticated - 使用稳定的依赖项
  useEffect(() => {
    if (autoConnect && user?.id && profile?.id && !loading) {
      // 只有当用户ID变化时才重新连接
      if (lastUserId.current !== user.id) {
        console.log('[WebSocket] User changed, connecting for:', user.id);
        shouldConnect.current = true;
        connect();
      } else if (!isConnected && !isConnecting.current && !connectionLock.current) {
        // 如果是同一用户但未连接，则连接
        console.log('[WebSocket] Same user but not connected, connecting for:', user.id);
        shouldConnect.current = true;
        connect();
      }
    } else if (!user || loading) {
      // Disconnect if user is not authenticated
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, user?.id, profile?.id, loading]); // 只依赖稳定的ID值

  // Handle page changes separately without reconnecting
  useEffect(() => {
    if (isConnected && ws.current?.readyState === WebSocket.OPEN) {
      try {
        ws.current.send(JSON.stringify({
          type: 'page_change',
          payload: { page: location }
        }));
      } catch (error) {
        console.error('Error sending page change message:', error);
      }
    }
  }, [location, isConnected]);

  // Heartbeat mechanism - only send ping when connection is confirmed open
  useEffect(() => {
    if (!isConnected || ws.current?.readyState !== WebSocket.OPEN) return;

    const heartbeatInterval = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN && shouldConnect.current) {
        sendMessage({ type: 'ping' });
      }
    }, 30000); // Send ping every 30 seconds

    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [isConnected, sendMessage]);

  const contextValue: WebSocketContextType = {
    isConnected,
    sendMessage,
    subscribe,
    lastMessage,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
}