import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WebSocketProvider } from "@/contexts/websocket-context";
import Dashboard from "@/pages/dashboard";
import Candidates from "@/pages/candidates";
import Jobs from "@/pages/jobs";
import Interviews from "@/pages/interviews";
import AIAssistant from "@/pages/ai-assistant";
import Templates from "@/pages/templates";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/candidates" component={Candidates} />
      <Route path="/jobs" component={Jobs} />
      <Route path="/interviews" component={Interviews} />
      <Route path="/ai-assistant" component={AIAssistant} />
      <Route path="/templates" component={Templates} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WebSocketProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </WebSocketProvider>
    </QueryClientProvider>
  );
}

export default App;
