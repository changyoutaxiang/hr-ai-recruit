import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

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
  const subscribers = useRef<Set<(message: WSMessage) => void>>(new Set());
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;
  const { toast } = useToast();
  const [location] = useLocation();

  // Get the correct WebSocket URL based on current protocol
  const getWebSocketURL = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}`;
  }, []);

  // Calculate reconnection delay with exponential backoff and jitter
  const getReconnectDelay = useCallback((attempt: number) => {
    const baseDelay = Math.min(1000 * Math.pow(2, attempt), 30000); // Max 30 seconds
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    return baseDelay + jitter;
  }, []);

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    try {
      const wsUrl = getWebSocketURL();
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        setIsConnected(true);
        reconnectAttempts.current = 0;
        
        // Authenticate with user ID (mock for now)
        const userId = "hr-user-1"; // In real app, this would come from auth context
        ws.current?.send(JSON.stringify({
          type: 'authenticate',
          payload: { userId }
        }));

        // Send current page
        ws.current?.send(JSON.stringify({
          type: 'page_change',
          payload: { page: location }
        }));
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

      ws.current.onclose = () => {
        setIsConnected(false);
        
        // Attempt to reconnect if auto-connect is enabled
        if (autoConnect && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = getReconnectDelay(reconnectAttempts.current);
          reconnectAttempts.current++;
          
          setTimeout(() => {
            connect();
          }, delay);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setIsConnected(false);
    }
  }, [getWebSocketURL, autoConnect, toast, location, getReconnectDelay]);

  const disconnect = useCallback(() => {
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
  }, []);

  const sendMessage = useCallback((message: WSMessage) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  const subscribe = useCallback((callback: (message: WSMessage) => void) => {
    subscribers.current.add(callback);
    
    // Return unsubscribe function
    return () => {
      subscribers.current.delete(callback);
    };
  }, []);

  // Handle navigation changes
  useEffect(() => {
    if (isConnected) {
      sendMessage({
        type: 'page_change',
        payload: { page: location }
      });
    }
  }, [location, isConnected, sendMessage]);

  // Connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Heartbeat mechanism
  useEffect(() => {
    if (!isConnected) return;

    const heartbeatInterval = setInterval(() => {
      sendMessage({ type: 'ping' });
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