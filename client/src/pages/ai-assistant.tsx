import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/ui/sidebar";
import { AiChat } from "@/components/ai-chat";
import { useLanguage } from "@/contexts/language-context";
import { 
  Bot, 
  MessageCircle, 
  Lightbulb, 
  FileText, 
  Users, 
  Briefcase,
  BarChart3
} from "lucide-react";

const useQuickActions = () => {
  const { t } = useLanguage();
  return [
    {
      title: t('assistant.analyzeResume'),
      description: t('assistant.analyzeResumeDesc'),
      icon: FileText,
      action: "analyze-resume",
    },
    {
      title: t('assistant.matchCandidates'),
      description: t('assistant.matchCandidatesDesc'),
      icon: Users,
      action: "match-candidates",
    },
    {
      title: t('assistant.generateQuestions'),
      description: t('assistant.generateQuestionsDesc'),
      icon: MessageCircle,
      action: "generate-questions",
    },
    {
      title: t('assistant.jobDescription'),
      description: t('assistant.jobDescriptionDesc'),
      icon: Briefcase,
      action: "optimize-job",
    },
    {
      title: t('assistant.recruitmentInsights'),
      description: t('assistant.recruitmentInsightsDesc'),
      icon: BarChart3,
      action: "insights",
    },
    {
      title: t('assistant.bestPractices'),
      description: t('assistant.bestPracticesDesc'),
      icon: Lightbulb,
      action: "best-practices",
    },
  ];
};

export default function AIAssistant() {
  const { t } = useLanguage();
  const quickActions = useQuickActions();
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [chatStarted, setChatStarted] = useState(false);

  const handleQuickAction = (action: string) => {
    setSelectedAction(action);
    setChatStarted(true);
  };

  const getActionPrompt = (action: string) => {
    switch (action) {
      case "analyze-resume":
        return t('assistant.initialPromptAnalyze');
      case "match-candidates":
        return t('assistant.initialPromptMatch');
      case "generate-questions":
        return t('assistant.initialPromptQuestions');
      case "optimize-job":
        return t('assistant.initialPromptOptimize');
      case "insights":
        return t('assistant.initialPromptInsights');
      case "best-practices":
        return t('assistant.initialPromptPractices');
      default:
        return t('assistant.welcomeMessage');
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Bot className="text-primary-foreground w-4 h-4" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">{t('assistant.pageTitle')}</h1>
              <p className="text-sm text-muted-foreground">
                {t('assistant.pageSubtitle')}
              </p>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          {!chatStarted ? (
            <div className="h-full p-6 overflow-y-auto">
              {/* Welcome Section */}
              <Card className="mb-8" data-testid="card-welcome">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bot className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    {t('assistant.pageTitle')}
                  </h2>
                  <p className="text-muted-foreground max-w-2xl mx-auto">
                    {t('assistant.welcomeMessage')}
                  </p>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {quickActions.map((action) => (
                  <Card 
                    key={action.action}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleQuickAction(action.action)}
                    data-testid={`card-action-${action.action}`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <action.icon className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground mb-1">
                            {action.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {action.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Recent Conversations */}
              <Card data-testid="card-recent-conversations">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MessageCircle className="w-5 h-5" />
                    <span>{t('assistant.history')}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 bg-accent rounded-lg cursor-pointer hover:bg-accent/80 transition-colors">
                      <p className="text-sm font-medium text-accent-foreground">
                        {t('assistant.generateQuestions')} - Senior Developer
                      </p>
                      <p className="text-xs text-muted-foreground">2 {t('dashboard.last30Days')}</p>
                    </div>
                    <div className="p-3 bg-accent rounded-lg cursor-pointer hover:bg-accent/80 transition-colors">
                      <p className="text-sm font-medium text-accent-foreground">
                        {t('assistant.matchCandidates')} - Product Manager
                      </p>
                      <p className="text-xs text-muted-foreground">{t('dashboard.last30Days')}</p>
                    </div>
                    <div className="p-3 bg-accent rounded-lg cursor-pointer hover:bg-accent/80 transition-colors">
                      <p className="text-sm font-medium text-accent-foreground">
                        {t('assistant.analyzeResume')} - {t('assistant.bestPractices')}
                      </p>
                      <p className="text-xs text-muted-foreground">3 {t('dashboard.last30Days')}</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    className="w-full mt-4"
                    data-testid="button-view-all-conversations"
                  >
                    {t('assistant.history')}
                  </Button>
                </CardContent>
              </Card>

              {/* Start New Chat */}
              <div className="mt-8 text-center">
                <Button 
                  onClick={() => setChatStarted(true)}
                  size="lg"
                  data-testid="button-start-new-chat"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  {t('assistant.send')}
                </Button>
              </div>
            </div>
          ) : (
            <AiChat 
              initialMessage={selectedAction ? getActionPrompt(selectedAction) : ""}
              onBack={() => {
                setChatStarted(false);
                setSelectedAction(null);
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
