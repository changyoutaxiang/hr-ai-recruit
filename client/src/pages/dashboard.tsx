import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sidebar } from "@/components/ui/sidebar";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { 
  Users, 
  Briefcase, 
  Calendar, 
  TrendingUp, 
  ArrowUp, 
  ArrowDown,
  Bot,
  Search,
  Bell,
  Plus,
  Lightbulb,
  BarChart3,
  AlertTriangle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface DashboardMetrics {
  totalCandidates: number;
  activeJobs: number;
  upcomingInterviews: number;
  interviewRate: number;
  hireRate: number;
  funnel: {
    applied: number;
    screening: number;
    interview: number;
    hired: number;
  };
}

export default function Dashboard() {
  const [showAIModal, setShowAIModal] = useState(false);

  const { data: metrics, isLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/dashboard/metrics"],
  });

  const { data: candidates } = useQuery({
    queryKey: ["/api/candidates"],
  });

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  const topCandidates = candidates?.slice(0, 3) || [];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
              <p className="text-sm text-muted-foreground">Welcome back, Sarah! Here's your recruitment overview.</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Input 
                  placeholder="Search candidates, jobs..." 
                  className="w-64 pl-10"
                  data-testid="search-input"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              </div>
              
              <Button data-testid="button-add-candidate">
                <Plus className="w-4 h-4 mr-2" />
                Add Candidate
              </Button>
              
              <Button variant="ghost" size="sm" className="relative" data-testid="button-notifications">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full text-xs flex items-center justify-center text-white">
                  3
                </span>
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card data-testid="card-total-candidates">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Candidates</p>
                    <p className="text-3xl font-bold text-foreground" data-testid="text-total-candidates">
                      {metrics?.totalCandidates || 0}
                    </p>
                    <p className="text-sm text-chart-2 flex items-center">
                      <ArrowUp className="w-4 h-4 mr-1" />
                      12% from last month
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Users className="text-primary w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-active-jobs">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Jobs</p>
                    <p className="text-3xl font-bold text-foreground" data-testid="text-active-jobs">
                      {metrics?.activeJobs || 0}
                    </p>
                    <p className="text-sm text-chart-3 flex items-center">
                      <ArrowUp className="w-4 h-4 mr-1" />
                      3 new this week
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-chart-2/10 rounded-lg flex items-center justify-center">
                    <Briefcase className="text-chart-2 w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-interview-rate">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Interview Rate</p>
                    <p className="text-3xl font-bold text-foreground" data-testid="text-interview-rate">
                      {metrics?.interviewRate || 0}%
                    </p>
                    <p className="text-sm text-chart-2 flex items-center">
                      <ArrowUp className="w-4 h-4 mr-1" />
                      5% improvement
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-chart-3/10 rounded-lg flex items-center justify-center">
                    <Calendar className="text-chart-3 w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-hire-rate">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Hire Rate</p>
                    <p className="text-3xl font-bold text-foreground" data-testid="text-hire-rate">
                      {metrics?.hireRate || 0}%
                    </p>
                    <p className="text-sm text-destructive flex items-center">
                      <ArrowDown className="w-4 h-4 mr-1" />
                      2% from target
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-chart-4/10 rounded-lg flex items-center justify-center">
                    <TrendingUp className="text-chart-4 w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recruitment Funnel */}
            <Card className="lg:col-span-2" data-testid="card-recruitment-funnel">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recruitment Funnel</CardTitle>
                  <select className="border border-border rounded-md px-3 py-1 text-sm bg-background">
                    <option>Last 30 days</option>
                    <option>Last 90 days</option>
                    <option>This year</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-background rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 bg-chart-1 rounded"></div>
                      <span className="text-sm font-medium">Applications Received</span>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold" data-testid="text-applications">
                        {metrics?.totalCandidates || 0}
                      </p>
                      <Progress value={100} className="w-32 h-2" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-background rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 bg-chart-2 rounded"></div>
                      <span className="text-sm font-medium">Screening Passed</span>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold" data-testid="text-screening">
                        {metrics?.funnel?.screening || 0}
                      </p>
                      <Progress value={34} className="w-32 h-2" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-background rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 bg-chart-3 rounded"></div>
                      <span className="text-sm font-medium">Interviews Scheduled</span>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold" data-testid="text-interviews-scheduled">
                        {metrics?.funnel?.interview || 0}
                      </p>
                      <Progress value={15} className="w-32 h-2" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-background rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 bg-chart-5 rounded"></div>
                      <span className="text-sm font-medium">Hired</span>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold" data-testid="text-hired">
                        {metrics?.funnel?.hired || 0}
                      </p>
                      <Progress value={3} className="w-32 h-2" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Right Sidebar */}
            <div className="space-y-6">
              {/* AI Assistant Quick Access */}
              <Card data-testid="card-ai-insights">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                      <Bot className="text-primary-foreground w-4 h-4" />
                    </div>
                    <CardTitle>AI Insights</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 bg-accent rounded-lg">
                      <p className="text-sm text-accent-foreground flex items-start">
                        <Lightbulb className="text-chart-3 w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                        23 candidates match the Senior Developer position requirements
                      </p>
                    </div>
                    
                    <div className="p-3 bg-accent rounded-lg">
                      <p className="text-sm text-accent-foreground flex items-start">
                        <BarChart3 className="text-chart-2 w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                        Interview completion rate increased by 15% this month
                      </p>
                    </div>
                    
                    <div className="p-3 bg-accent rounded-lg">
                      <p className="text-sm text-accent-foreground flex items-start">
                        <AlertTriangle className="text-chart-5 w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                        3 high-priority candidates haven't been contacted yet
                      </p>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full mt-4" 
                    onClick={() => setShowAIModal(true)}
                    data-testid="button-open-ai-assistant"
                  >
                    Open AI Assistant
                  </Button>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card data-testid="card-recent-activity">
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-chart-2 rounded-full flex items-center justify-center flex-shrink-0">
                        <Plus className="text-white w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">
                          <span className="font-medium">John Smith</span> applied for Senior Developer
                        </p>
                        <p className="text-xs text-muted-foreground">2 hours ago</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-chart-3 rounded-full flex items-center justify-center flex-shrink-0">
                        <Calendar className="text-white w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">
                          Interview scheduled with <span className="font-medium">Sarah Wilson</span>
                        </p>
                        <p className="text-xs text-muted-foreground">4 hours ago</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-chart-4 rounded-full flex items-center justify-center flex-shrink-0">
                        <Bot className="text-white w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">
                          AI analyzed resume for <span className="font-medium">Mike Chen</span>
                        </p>
                        <p className="text-xs text-muted-foreground">6 hours ago</p>
                      </div>
                    </div>
                  </div>
                  
                  <Button variant="ghost" className="w-full mt-4 text-center" data-testid="button-view-all-activity">
                    View all activity
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Top Candidates Section */}
          <Card className="mt-8" data-testid="card-top-candidates">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Top Matching Candidates</CardTitle>
                <Button variant="ghost" data-testid="button-view-all-candidates">
                  View all candidates →
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {topCandidates.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-sm font-medium text-muted-foreground py-2">Candidate</th>
                        <th className="text-left text-sm font-medium text-muted-foreground py-2">Position</th>
                        <th className="text-left text-sm font-medium text-muted-foreground py-2">Match Score</th>
                        <th className="text-left text-sm font-medium text-muted-foreground py-2">Status</th>
                        <th className="text-left text-sm font-medium text-muted-foreground py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {topCandidates.map((candidate: any) => (
                        <tr key={candidate.id} data-testid={`row-candidate-${candidate.id}`}>
                          <td className="py-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-sm font-medium text-primary">
                                  {candidate.name?.charAt(0) || 'C'}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground" data-testid={`text-name-${candidate.id}`}>
                                  {candidate.name || 'Unknown'}
                                </p>
                                <p className="text-xs text-muted-foreground" data-testid={`text-email-${candidate.id}`}>
                                  {candidate.email || 'No email'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3">
                            <p className="text-sm text-foreground" data-testid={`text-position-${candidate.id}`}>
                              {candidate.position || 'Not specified'}
                            </p>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center space-x-2">
                              <Progress value={candidate.matchScore || 0} className="w-16 h-2" />
                              <span className="text-sm font-medium text-chart-2" data-testid={`text-match-score-${candidate.id}`}>
                                {candidate.matchScore || 0}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-chart-3/10 text-chart-3" data-testid={`text-status-${candidate.id}`}>
                              {candidate.status || 'Applied'}
                            </span>
                          </td>
                          <td className="py-3">
                            <Button variant="ghost" size="sm" data-testid={`button-view-candidate-${candidate.id}`}>
                              View Profile
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No candidates found</p>
                  <p className="text-sm">Add candidates to see them here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
