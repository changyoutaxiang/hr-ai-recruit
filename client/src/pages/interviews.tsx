import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/ui/sidebar";
import { InterviewCard } from "@/components/interview-card";
import { useInterviews } from "@/hooks/use-interviews";
import { 
  Search, 
  Filter, 
  Plus, 
  Calendar,
  Clock,
  Video
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Interviews() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  
  const { 
    data: interviews, 
    isLoading, 
    error 
  } = useInterviews();

  const filteredInterviews = interviews?.filter(interview => {
    const matchesSearch = searchQuery === "" || 
                         interview.candidateId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         interview.jobId.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || interview.status === statusFilter;
    const matchesType = typeFilter === "all" || interview.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  }) || [];

  const interviewStats = {
    total: interviews?.length || 0,
    scheduled: interviews?.filter(i => i.status === "scheduled").length || 0,
    completed: interviews?.filter(i => i.status === "completed").length || 0,
    cancelled: interviews?.filter(i => i.status === "cancelled").length || 0,
    today: interviews?.filter(i => {
      const today = new Date();
      const interviewDate = new Date(i.scheduledDate);
      return interviewDate.toDateString() === today.toDateString();
    }).length || 0,
  };

  if (error) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-destructive">Failed to load interviews</p>
            <Button onClick={() => window.location.reload()} className="mt-2">
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Interviews</h1>
              <p className="text-sm text-muted-foreground">
                Schedule and manage candidate interviews
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button data-testid="button-schedule-interview">
                <Plus className="w-4 h-4 mr-2" />
                Schedule Interview
              </Button>
            </div>
          </div>
        </header>

        {/* Quick Stats */}
        <div className="bg-card border-b border-border px-6 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground" data-testid="text-today-interviews">
                {interviewStats.today}
              </p>
              <p className="text-sm text-muted-foreground">Today</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground" data-testid="text-scheduled-interviews">
                {interviewStats.scheduled}
              </p>
              <p className="text-sm text-muted-foreground">Scheduled</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground" data-testid="text-completed-interviews">
                {interviewStats.completed}
              </p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground" data-testid="text-total-interviews">
                {interviewStats.total}
              </p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search interviews..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                  data-testid="input-search-interviews"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" data-testid="select-status-filter">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="no-show">No Show</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40" data-testid="select-type-filter">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="in-person">In Person</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" data-testid="button-advanced-filters">
                <Filter className="w-4 h-4 mr-2" />
                More Filters
              </Button>
            </div>

            <div className="text-sm text-muted-foreground" data-testid="text-interview-count">
              {filteredInterviews.length} of {interviewStats.total} interviews
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredInterviews.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredInterviews.map((interview) => (
                <InterviewCard 
                  key={interview.id} 
                  interview={interview}
                  data-testid={`card-interview-${interview.id}`}
                />
              ))}
            </div>
          ) : (
            <Card className="h-64">
              <CardContent className="flex flex-col items-center justify-center h-full text-center">
                <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {searchQuery || statusFilter !== "all" || typeFilter !== "all" ? "No interviews found" : "No interviews scheduled"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchQuery || statusFilter !== "all" || typeFilter !== "all"
                    ? "Try adjusting your search or filters" 
                    : "Get started by scheduling your first interview"
                  }
                </p>
                {!searchQuery && statusFilter === "all" && typeFilter === "all" && (
                  <Button data-testid="button-schedule-first-interview">
                    <Plus className="w-4 h-4 mr-2" />
                    Schedule First Interview
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
