import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sidebar } from "@/components/ui/sidebar";
import { useLanguage } from "@/contexts/language-context";
import { TrendingUp, TrendingDown, Users, Calendar, CheckCircle, XCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, FunnelChart, Funnel, Cell, LabelList } from "recharts";
import { apiRequest } from "@/lib/api";

interface FunnelData {
  stage: string;
  count: number;
  rate: number;
  color: string;
}

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

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

export default function FunnelPage() {
  const { t } = useLanguage();
  const [timeRange, setTimeRange] = useState("30");

  const { data: metrics, isLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/dashboard/metrics"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/dashboard/metrics");
      return response.json();
    },
  });

  const funnelData: FunnelData[] = [
    {
      stage: t('funnel.applicationsReceived'),
      count: metrics?.funnel?.applied || 0,
      rate: 100,
      color: COLORS[0]
    },
    {
      stage: t('funnel.screeningPassed'),
      count: metrics?.funnel?.screening || 0,
      rate: metrics?.funnel?.applied ? Math.round((metrics.funnel.screening / metrics.funnel.applied) * 100) : 0,
      color: COLORS[1]
    },
    {
      stage: t('funnel.interviewsScheduled'),
      count: metrics?.funnel?.interview || 0,
      rate: metrics?.funnel?.applied ? Math.round((metrics.funnel.interview / metrics.funnel.applied) * 100) : 0,
      color: COLORS[2]
    },
    {
      stage: t('funnel.hired'),
      count: metrics?.funnel?.hired || 0,
      rate: metrics?.funnel?.applied ? Math.round((metrics.funnel.hired / metrics.funnel.applied) * 100) : 0,
      color: COLORS[3]
    }
  ];

  const conversionRates = [
    {
      from: t('funnel.applicationsReceived'),
      to: t('funnel.screeningPassed'),
      rate: metrics?.funnel?.applied ? Math.round((metrics.funnel.screening / metrics.funnel.applied) * 100) : 0,
      trend: "up"
    },
    {
      from: t('funnel.screeningPassed'),
      to: t('funnel.interviewsScheduled'),
      rate: metrics?.funnel?.screening ? Math.round((metrics.funnel.interview / metrics.funnel.screening) * 100) : 0,
      trend: "down"
    },
    {
      from: t('funnel.interviewsScheduled'),
      to: t('funnel.hired'),
      rate: metrics?.funnel?.interview ? Math.round((metrics.funnel.hired / metrics.funnel.interview) * 100) : 0,
      trend: "up"
    }
  ];

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

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">{t('nav.funnelAnalysis')}</h1>
              <p className="text-sm text-muted-foreground">分析招聘流程的转化率和效率</p>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('nav.funnelAnalysis')}</h1>
            <p className="text-muted-foreground">
              分析招聘流程中各个阶段的转化率和效率
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="选择时间范围" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">最近 7 天</SelectItem>
                <SelectItem value="30">最近 30 天</SelectItem>
                <SelectItem value="90">最近 90 天</SelectItem>
                <SelectItem value="365">最近一年</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">导出报告</Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总申请数</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.funnel?.applied || 0}</div>
              <p className="text-xs text-muted-foreground">
                +12% 相比上月
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">面试转化率</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.interviewRate || 0}%</div>
              <p className="text-xs text-muted-foreground">
                +2% 相比上月
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">录用转化率</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.hireRate || 0}%</div>
              <p className="text-xs text-muted-foreground">
                -1% 相比上月
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">平均招聘周期</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">28天</div>
              <p className="text-xs text-muted-foreground">
                -3天 相比上月
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="funnel" className="space-y-6">
          <TabsList>
            <TabsTrigger value="funnel">漏斗分析</TabsTrigger>
            <TabsTrigger value="conversion">转化率分析</TabsTrigger>
            <TabsTrigger value="trends">趋势分析</TabsTrigger>
          </TabsList>

          <TabsContent value="funnel" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Funnel Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>招聘漏斗</CardTitle>
                  <CardDescription>
                    展示各个招聘阶段的候选人数量和流失情况
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <FunnelChart>
                      <Tooltip />
                      <Funnel
                        dataKey="count"
                        data={funnelData}
                        isAnimationActive
                      >
                        <LabelList position="center" fill="#fff" stroke="none" />
                        {funnelData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Funnel>
                    </FunnelChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Stage Details */}
              <Card>
                <CardHeader>
                  <CardTitle>阶段详情</CardTitle>
                  <CardDescription>
                    各个招聘阶段的详细数据和转化率
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {funnelData.map((stage, index) => (
                    <div key={stage.stage} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: stage.color }}
                        />
                        <div>
                          <p className="font-medium">{stage.stage}</p>
                          <p className="text-sm text-muted-foreground">
                            {stage.count} 人
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={stage.rate > 50 ? "default" : "secondary"}>
                          {stage.rate}%
                        </Badge>
                        <Progress value={stage.rate} className="w-20 mt-1" />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="conversion" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>转化率分析</CardTitle>
                <CardDescription>
                  各个阶段之间的转化率和趋势
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {conversionRates.map((conversion, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm">{conversion.from}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="text-sm">{conversion.to}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={conversion.rate > 30 ? "default" : "destructive"}>
                          {conversion.rate}%
                        </Badge>
                        {conversion.trend === "up" ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>趋势分析</CardTitle>
                <CardDescription>
                  招聘漏斗各阶段的历史趋势
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={funnelData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stage" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}