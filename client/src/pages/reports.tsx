import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Sidebar } from "@/components/ui/sidebar";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Calendar, 
  Download,
  FileText,
  PieChart,
  Target,
  Clock,
  CheckCircle,
  Loader2
} from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { useReports } from "@/hooks/use-reports";

export default function Reports() {
  const { t } = useLanguage();
  const [timeRange, setTimeRange] = useState("30");
  const [reportType, setReportType] = useState("overview");
  
  const { data: reportsData, isLoading, error } = useReports();

  // 模拟数据用于演示其他功能
  const mockData = {
    sources: [
      { name: "LinkedIn", count: 45, percentage: 28.8 },
      { name: "内推", count: 38, percentage: 24.4 },
      { name: "招聘网站", count: 32, percentage: 20.5 },
      { name: "校园招聘", count: 25, percentage: 16.0 },
      { name: "其他", count: 16, percentage: 10.3 }
    ],
    positions: [
      { name: "前端工程师", applications: 45, hires: 8 },
      { name: "后端工程师", applications: 38, hires: 6 },
      { name: "产品经理", applications: 28, hires: 4 },
      { name: "UI/UX设计师", applications: 25, hires: 3 },
      { name: "数据分析师", applications: 20, hires: 2 }
    ]
  };

  const handleDownloadReport = () => {
    // TODO: 实现报告下载功能
    console.log("下载报告");
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>加载报告数据中...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-2">加载报告数据失败</p>
            <p className="text-gray-600">请稍后重试</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">招聘报告</h1>
              <p className="text-gray-600">查看招聘数据统计和分析报告</p>
            </div>
            <div className="flex items-center gap-4">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">最近 7 天</SelectItem>
                  <SelectItem value="30">最近 30 天</SelectItem>
                  <SelectItem value="90">最近 90 天</SelectItem>
                  <SelectItem value="365">最近一年</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleDownloadReport} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                下载报告
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* 概览卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">总候选人</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportsData?.totalCandidates || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-600">+12%</span> 较上月
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">面试率</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportsData?.interviewRate?.toFixed(1) || 0}%</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-600">+5.2%</span> 较上月
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">录用率</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportsData?.hireRate?.toFixed(1) || 0}%</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-red-600">-2.1%</span> 较上月
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">面试率</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportsData?.interviewRate?.toFixed(1) || 0}%</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-600">+3.2%</span> 较上月
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* 详细报告 */}
            <Tabs defaultValue="funnel" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="funnel">招聘漏斗</TabsTrigger>
                <TabsTrigger value="sources">候选人来源</TabsTrigger>
                <TabsTrigger value="positions">职位分析</TabsTrigger>
                <TabsTrigger value="trends">趋势分析</TabsTrigger>
              </TabsList>

              <TabsContent value="funnel" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      招聘漏斗分析
                    </CardTitle>
                    <CardDescription>
                      展示从简历投递到最终录用的转化情况
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                       {[
                         { stage: "简历投递", count: reportsData?.funnel?.applied || 0, rate: 100 },
                         { stage: "简历筛选", count: reportsData?.funnel?.screening || 0, rate: reportsData?.funnel?.applied ? (reportsData.funnel.screening / reportsData.funnel.applied * 100) : 0 },
                         { stage: "面试邀请", count: reportsData?.funnel?.interview || 0, rate: reportsData?.funnel?.applied ? (reportsData.funnel.interview / reportsData.funnel.applied * 100) : 0 },
                         { stage: "成功入职", count: reportsData?.funnel?.hired || 0, rate: reportsData?.funnel?.applied ? (reportsData.funnel.hired / reportsData.funnel.applied * 100) : 0 }
                       ].map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                            <span className="font-medium">{item.stage}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <Progress value={item.rate} className="w-32" />
                            <span className="text-sm text-muted-foreground w-12">{typeof item.rate === 'number' ? item.rate.toFixed(1) : '0.0'}%</span>
                            <Badge variant="outline">{item.count} 人</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="sources" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5" />
                      候选人来源分析
                    </CardTitle>
                    <CardDescription>
                      分析不同渠道的候选人质量和数量
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {mockData.sources.map((source, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span className="font-medium">{source.name}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <Progress value={source.percentage} className="w-32" />
                            <span className="text-sm text-muted-foreground w-12">{source.percentage}%</span>
                            <Badge variant="outline">{source.count} 人</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="positions" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      职位招聘效果
                    </CardTitle>
                    <CardDescription>
                      各职位的申请量和录用情况对比
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {mockData.positions.map((position, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <h4 className="font-medium">{position.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              录用率: {((position.hires / position.applications) * 100).toFixed(1)}%
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <div className="text-lg font-bold">{position.applications}</div>
                              <div className="text-xs text-muted-foreground">申请</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-green-600">{position.hires}</div>
                              <div className="text-xs text-muted-foreground">录用</div>
                            </div>
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
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      趋势分析
                    </CardTitle>
                    <CardDescription>
                      招聘数据的时间趋势和预测
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12">
                      <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">图表功能开发中</h3>
                      <p className="text-muted-foreground">
                        趋势图表功能正在开发中，敬请期待
                      </p>
                    </div>
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