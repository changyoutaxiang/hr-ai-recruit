import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, 
  User, 
  Send, 
  ArrowLeft, 
  Loader2,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Sparkles
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AiChatProps {
  initialMessage?: string;
  onBack?: () => void;
}

export function AiChat({ initialMessage, onBack }: AiChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState(initialMessage || "");
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load conversation history
  const { data: conversationHistory } = useQuery({
    queryKey: ["/api/ai/conversations", sessionId],
    enabled: !initialMessage, // Don't load history if we have an initial message
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", "/api/ai/chat", {
        message,
        sessionId,
        context: getContext(),
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Add assistant response
      setMessages(prev => [
        ...prev,
        {
          id: `assistant_${Date.now()}`,
          role: "assistant",
          content: data.response,
          timestamp: new Date(),
        }
      ]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Initialize with welcome message and initial message if provided
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: "welcome",
        role: "assistant",
        content: "Hello! I'm your AI recruitment assistant. I can help you with candidate analysis, job matching, interview questions, and recruitment insights. How can I assist you today?",
        timestamp: new Date(),
      };

      if (initialMessage) {
        setMessages([welcomeMessage]);
        // Auto-send the initial message
        handleSendMessage(initialMessage);
      } else {
        setMessages([welcomeMessage]);
      }
    }
  }, [initialMessage]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load conversation history
  useEffect(() => {
    if (conversationHistory && conversationHistory.length > 0 && !initialMessage) {
      const historyMessages: Message[] = conversationHistory.flatMap((conv: any) => [
        {
          id: `user_${conv.id}`,
          role: "user" as const,
          content: conv.message,
          timestamp: new Date(conv.createdAt),
        },
        {
          id: `assistant_${conv.id}`,
          role: "assistant" as const,
          content: conv.response,
          timestamp: new Date(conv.createdAt),
        },
      ]);
      setMessages(prev => prev.length === 1 ? [...prev, ...historyMessages] : prev);
    }
  }, [conversationHistory, initialMessage]);

  const getContext = () => {
    // Provide context about the current recruitment state
    return "User is an HR manager working with the AI recruitment system. They may ask about candidates, jobs, interviews, or general recruitment advice.";
  };

  const handleSendMessage = (messageText: string = inputValue) => {
    if (!messageText.trim() || sendMessageMutation.isPending) return;

    // Add user message
    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");

    // Send to AI
    sendMessageMutation.mutate(messageText);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Message copied to clipboard",
    });
  };

  const suggestedPrompts = [
    "Analyze the top candidates for our Senior Developer role",
    "Generate interview questions for a Product Manager position",
    "What are the best practices for remote interviews?",
    "How can I improve our recruitment conversion rates?",
    "Help me write a compelling job description",
    "What should I look for in a candidate's resume?",
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {onBack && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onBack}
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Bot className="text-primary-foreground w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">AI Assistant</h2>
              <p className="text-xs text-muted-foreground">
                {sendMessageMutation.isPending ? "Thinking..." : "Online"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-1">
            <Badge variant="secondary" className="text-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              GPT-5
            </Badge>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start space-x-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                  <Bot className="text-primary-foreground w-4 h-4" />
                </div>
              )}
              
              <div
                className={`max-w-[70%] p-4 rounded-lg ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent text-accent-foreground"
                }`}
                data-testid={`message-${message.role}-${message.id}`}
              >
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
                
                <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                  <span>
                    {message.timestamp.toLocaleTimeString([], { 
                      hour: "2-digit", 
                      minute: "2-digit" 
                    })}
                  </span>
                  
                  {message.role === "assistant" && (
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={() => copyToClipboard(message.content)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                      >
                        <ThumbsUp className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                      >
                        <ThumbsDown className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {message.role === "user" && (
                <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                  <User className="text-secondary-foreground w-4 h-4" />
                </div>
              )}
            </div>
          ))}
          
          {sendMessageMutation.isPending && (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                <Bot className="text-primary-foreground w-4 h-4" />
              </div>
              <div className="bg-accent text-accent-foreground p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Suggested Prompts */}
      {messages.length === 1 && !sendMessageMutation.isPending && (
        <div className="p-4 border-t border-border">
          <p className="text-sm text-muted-foreground mb-3">Try asking about:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {suggestedPrompts.slice(0, 4).map((prompt, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="text-left justify-start text-xs h-auto py-2 px-3"
                onClick={() => handleSendMessage(prompt)}
                data-testid={`button-prompt-${index}`}
              >
                {prompt}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex space-x-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about recruitment..."
            disabled={sendMessageMutation.isPending}
            className="flex-1"
            data-testid="input-message"
          />
          <Button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || sendMessageMutation.isPending}
            data-testid="button-send"
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
