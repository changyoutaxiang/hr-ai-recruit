import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/ui/sidebar";
import { InterviewCard } from "@/components/interview-card";
import { useInterviews } from "@/hooks/use-interviews";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/language-context";
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
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  
  const { 
    data: interviews, 
    isLoading, 
    error 
  } = useInterviews();

  // Fetch candidates and jobs for enhanced search
  const { data: candidates } = useQuery<any[]>({
    queryKey: ["/api/candidates"],
  });

  const { data: jobs } = useQuery<any[]>({
    queryKey: ["/api/jobs"],
  });

  const filteredInterviews = interviews?.filter(interview => {
    let matchesSearch = searchQuery === "";
    
    if (searchQuery && !matchesSearch) {
      const query = searchQuery.toLowerCase();
      
      // Search by candidate name
      const candidate = candidates?.find(c => c.id === interview.candidateId);
      const candidateMatch = candidate?.name?.toLowerCase().includes(query);
      
      // Search by job title
      const job = jobs?.find(j => j.id === interview.jobId);
      const jobMatch = job?.title?.toLowerCase().includes(query);
      
      // Also search original fields for backwards compatibility
      const idMatch = interview.candidateId.toLowerCase().includes(query) ||
                     interview.jobId.toLowerCase().includes(query);
      
      matchesSearch = candidateMatch || jobMatch || idMatch;
    }
    
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
            <p className="text-destructive">{t('interviews.failedToLoad')}</p>
            <Button onClick={() => window.location.reload()} className="mt-2">
              {t('jobs.retry')}
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
              <h1 className="text-2xl font-semibold text-foreground">{t('interviews.pageTitle')}</h1>
              <p className="text-sm text-muted-foreground">
                {t('interviews.pageSubtitle')}
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button data-testid="button-schedule-interview">
                <Plus className="w-4 h-4 mr-2" />
                {t('interviews.scheduleInterview')}
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
              <p className="text-sm text-muted-foreground">{t('interviews.today')}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground" data-testid="text-scheduled-interviews">
                {interviewStats.scheduled}
              </p>
              <p className="text-sm text-muted-foreground">{t('interviews.scheduled')}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground" data-testid="text-completed-interviews">
                {interviewStats.completed}
              </p>
              <p className="text-sm text-muted-foreground">{t('interviews.completed')}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground" data-testid="text-total-interviews">
                {interviewStats.total}
              </p>
              <p className="text-sm text-muted-foreground">{t('interviews.total')}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder={t('interviews.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                  data-testid="input-search-interviews"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" data-testid="select-status-filter">
                  <SelectValue placeholder={t('jobs.allStatuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('jobs.allStatuses')}</SelectItem>
                  <SelectItem value="scheduled">{t('interviews.scheduled')}</SelectItem>
                  <SelectItem value="completed">{t('interviews.completed')}</SelectItem>
                  <SelectItem value="cancelled">{t('interviews.cancelled')}</SelectItem>
                  <SelectItem value="no-show">{t('interviews.noShow')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40" data-testid="select-type-filter">
                  <SelectValue placeholder={t('interviews.allTypes')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('interviews.allTypes')}</SelectItem>
                  <SelectItem value="phone">{t('interviews.phone')}</SelectItem>
                  <SelectItem value="video">{t('interviews.video')}</SelectItem>
                  <SelectItem value="in-person">{t('interviews.inPerson')}</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" data-testid="button-advanced-filters">
                <Filter className="w-4 h-4 mr-2" />
                {t('jobs.moreFilters')}
              </Button>
            </div>

            <div className="text-sm text-muted-foreground" data-testid="text-interview-count">
              {t('interviews.interviewCount', { filtered: filteredInterviews.length.toString(), total: interviewStats.total.toString() })}
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
                  {searchQuery || statusFilter !== "all" || typeFilter !== "all" ? t('interviews.noInterviewsFound') : t('interviews.noInterviewsScheduled')}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchQuery || statusFilter !== "all" || typeFilter !== "all"
                    ? t('jobs.adjustFilters') 
                    : t('interviews.getStartedInterview')
                  }
                </p>
                {!searchQuery && statusFilter === "all" && typeFilter === "all" && (
                  <Button data-testid="button-schedule-first-interview">
                    <Plus className="w-4 h-4 mr-2" />
                    {t('interviews.scheduleFirstInterview')}
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
