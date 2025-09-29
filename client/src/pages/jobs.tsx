import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/ui/sidebar";
import { JobCard } from "@/components/job-card";
import { JobCandidateMatches } from "@/components/job-candidate-matches";
import { HiringDecisionComparison } from "@/components/hiring-decision-comparison";
import { useJobs } from "@/hooks/use-jobs";
import { useLanguage } from "@/contexts/language-context";
import {
  Search,
  Filter,
  Plus,
  Briefcase,
  MapPin,
  DollarSign,
  X
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Jobs() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [selectedJobForMatches, setSelectedJobForMatches] = useState<string | null>(null);
  const [selectedJobForComparison, setSelectedJobForComparison] = useState<string | null>(null);
  
  const { 
    data: jobs, 
    isLoading, 
    error 
  } = useJobs();

  const filteredJobs = jobs?.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.location.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    const matchesDepartment = departmentFilter === "all" || job.department === departmentFilter;
    
    return matchesSearch && matchesStatus && matchesDepartment;
  }) || [];

  const departments = Array.from(new Set(jobs?.map(job => job.department) || []));
  
  const jobStats = {
    total: jobs?.length || 0,
    active: jobs?.filter(j => j.status === "active").length || 0,
    paused: jobs?.filter(j => j.status === "paused").length || 0,
    closed: jobs?.filter(j => j.status === "closed").length || 0,
  };

  if (error) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-destructive">{t('jobs.failedToLoad')}</p>
            <Button onClick={() => window.location.reload()} className="mt-2">
              {t('jobs.retry')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (selectedJobForMatches) {
    const selectedJob = jobs?.find(j => j.id === selectedJobForMatches);

    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-card border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-foreground">
                  Candidate Matches: {selectedJob?.title}
                </h1>
                <p className="text-sm text-muted-foreground">
                  AI-ranked candidates for this position
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setSelectedJobForMatches(null)}
                data-testid="button-back-to-jobs"
              >
                <X className="w-4 h-4 mr-2" />
                Back to Jobs
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6">
            <JobCandidateMatches jobId={selectedJobForMatches} />
          </main>
        </div>
      </div>
    );
  }

  if (selectedJobForComparison) {
    const selectedJob = jobs?.find(j => j.id === selectedJobForComparison);

    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-card border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-foreground">
                  招聘决策对比: {selectedJob?.title}
                </h1>
                <p className="text-sm text-muted-foreground">
                  AI 驱动的候选人决策分析对比
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setSelectedJobForComparison(null)}
                data-testid="button-back-to-jobs"
              >
                <X className="w-4 h-4 mr-2" />
                返回职位列表
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6">
            <HiringDecisionComparison jobId={selectedJobForComparison} />
          </main>
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
              <h1 className="text-2xl font-semibold text-foreground">{t('jobs.pageTitle')}</h1>
              <p className="text-sm text-muted-foreground">
                {t('jobs.pageSubtitle')}
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button data-testid="button-create-job">
                <Plus className="w-4 h-4 mr-2" />
                {t('jobs.createJob')}
              </Button>
            </div>
          </div>
        </header>

        {/* Filters and Stats */}
        <div className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder={t('jobs.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                  data-testid="input-search-jobs"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" data-testid="select-status-filter">
                  <SelectValue placeholder={t('jobs.allStatuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('jobs.allStatuses')}</SelectItem>
                  <SelectItem value="active">{t('jobs.active')}</SelectItem>
                  <SelectItem value="paused">{t('jobs.paused')}</SelectItem>
                  <SelectItem value="closed">{t('jobs.closed')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-40" data-testid="select-department-filter">
                  <SelectValue placeholder={t('jobs.allDepartments')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('jobs.allDepartments')}</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" data-testid="button-advanced-filters">
                <Filter className="w-4 h-4 mr-2" />
                {t('jobs.moreFilters')}
              </Button>
            </div>

            <div className="text-sm text-muted-foreground" data-testid="text-job-count">
              {t('jobs.jobCount', { filtered: filteredJobs.length.toString(), total: jobStats.total.toString() })}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" data-testid="badge-active">
                {t('jobs.active')}: {jobStats.active}
              </Badge>
              <Badge variant="secondary" data-testid="badge-paused">
                {t('jobs.paused')}: {jobStats.paused}
              </Badge>
              <Badge variant="secondary" data-testid="badge-closed">
                {t('jobs.closed')}: {jobStats.closed}
              </Badge>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredJobs.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onViewMatches={(jobId) => setSelectedJobForMatches(jobId)}
                  onViewComparison={(jobId) => setSelectedJobForComparison(jobId)}
                  data-testid={`card-job-${job.id}`}
                />
              ))}
            </div>
          ) : (
            <Card className="h-64">
              <CardContent className="flex flex-col items-center justify-center h-full text-center">
                <Briefcase className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {searchQuery || statusFilter !== "all" || departmentFilter !== "all" ? t('jobs.noJobsFound') : t('jobs.noJobsYet')}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchQuery || statusFilter !== "all" || departmentFilter !== "all"
                    ? t('jobs.adjustFilters') 
                    : t('jobs.getStartedHint')
                  }
                </p>
                {!searchQuery && statusFilter === "all" && departmentFilter === "all" && (
                  <Button data-testid="button-create-first-job">
                    <Plus className="w-4 h-4 mr-2" />
                    {t('jobs.createFirstJob')}
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
