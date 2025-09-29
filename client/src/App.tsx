import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WebSocketProvider } from "@/contexts/websocket-context";
import { LanguageProvider } from "@/contexts/language-context";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import Dashboard from "@/pages/dashboard";
import Candidates from "@/pages/candidates";
import CandidateDetail from "@/pages/candidate-detail";
import Jobs from "@/pages/jobs";
import Interviews from "@/pages/interviews";
import AIAssistant from "@/pages/ai-assistant";
import Templates from "@/pages/templates";
import InterviewAssistantPage from "@/pages/interview-assistant";
import InterviewPreparePage from "@/pages/interview-prepare";
import InterviewDetail from "@/pages/interview-detail";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/candidates/:id">
        <ProtectedRoute>
          <CandidateDetail />
        </ProtectedRoute>
      </Route>
      <Route path="/candidates">
        <ProtectedRoute>
          <Candidates />
        </ProtectedRoute>
      </Route>
      <Route path="/jobs">
        <ProtectedRoute>
          <Jobs />
        </ProtectedRoute>
      </Route>
      <Route path="/interviews/:id">
        <ProtectedRoute>
          <InterviewDetail />
        </ProtectedRoute>
      </Route>
      <Route path="/interviews">
        <ProtectedRoute>
          <Interviews />
        </ProtectedRoute>
      </Route>
      <Route path="/interview-assistant">
        <ProtectedRoute>
          <InterviewAssistantPage />
        </ProtectedRoute>
      </Route>
      <Route path="/interview-prepare/:id">
        <ProtectedRoute>
          <InterviewPreparePage />
        </ProtectedRoute>
      </Route>
      <Route path="/ai-assistant">
        <ProtectedRoute>
          <AIAssistant />
        </ProtectedRoute>
      </Route>
      <Route path="/templates">
        <ProtectedRoute allowedRoles={['admin', 'recruitment_lead']}>
          <Templates />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          <WebSocketProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </WebSocketProvider>
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
