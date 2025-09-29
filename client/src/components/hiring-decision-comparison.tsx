import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Trophy,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Target,
  Brain,
  Sparkles
} from "lucide-react";

interface HiringDecision {
  id: string;
  candidateId: string;
  jobId: string;
  decision: "hire" | "next_round" | "hold" | "reject";
  confidence: number;
  finalScore: number;
  interviewScore: number | null;
  overallMatchScore: number | null;
  technicalMatchScore: number | null;
  culturalFitScore: number | null;
  risks: any;
  strengths: any;
  analysis: any;
  interviewerRecommendations: any;
  recommendation: string | null;
  salaryExpectation: any;
  competitorOffers: any;
  growthPotential: any;
  createdAt: string;
  updatedAt: string;
  candidate?: {
    id: string;
    name: string;
    position: string;
    email: string;
    experience?: number;
    skills?: string[];
  };
}

interface Props {
  jobId: string;
}

export function HiringDecisionComparison({ jobId }: Props) {
  const [selectedView, setSelectedView] = useState<"table" | "cards">("table");
  const [sortBy, setSortBy] = useState<"score" | "confidence" | "name">("score");
  const [filterDecision, setFilterDecision] = useState<string>("all");

  // 获取所有候选人的决策数据
  const { data: decisions = [], isLoading, error } = useQuery<HiringDecision[]>({
    queryKey: ["hiring-decisions", "job", jobId],
    queryFn: async () => {
      const response = await fetch(`/api/hiring-decisions/job/${jobId}`);
      if (!response.ok) throw new Error("Failed to fetch decisions");
      return response.json();
    },
  });

  // 排序和过滤决策
  const sortedDecisions = [...decisions]
    .filter(d => filterDecision === "all" || d.decision === filterDecision)
    .sort((a, b) => {
      switch (sortBy) {
        case "score":
          return (b.finalScore || 0) - (a.finalScore || 0);
        case "confidence":
          return (b.confidence || 0) - (a.confidence || 0);
        case "name":
          return (a.candidate?.name || "").localeCompare(b.candidate?.name || "");
        default:
          return 0;
      }
    });

  // 计算统计数据
  const stats = {
    total: decisions.length,
    hire: decisions.filter(d => d.decision === "hire").length,
    nextRound: decisions.filter(d => d.decision === "next_round").length,
    hold: decisions.filter(d => d.decision === "hold").length,
    reject: decisions.filter(d => d.decision === "reject").length,
    avgScore: decisions.reduce((sum, d) => sum + (d.finalScore || 0), 0) / (decisions.length || 1),
    avgConfidence: decisions.reduce((sum, d) => sum + (d.confidence || 0), 0) / (decisions.length || 1),
  };

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case "hire": return "bg-green-100 text-green-800";
      case "next_round": return "bg-blue-100 text-blue-800";
      case "hold": return "bg-yellow-100 text-yellow-800";
      case "reject": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getDecisionIcon = (decision: string) => {
    switch (decision) {
      case "hire": return <CheckCircle className="w-4 h-4" />;
      case "next_round": return <Clock className="w-4 h-4" />;
      case "hold": return <Minus className="w-4 h-4" />;
      case "reject": return <XCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-blue-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-destructive">加载决策数据失败</p>
        </CardContent>
      </Card>
    );
  }

  if (decisions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-64 text-center">
          <Brain className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">暂无决策数据</h3>
          <p className="text-sm text-muted-foreground">
            请先为候选人生成招聘决策分析
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 统计概览 */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">推荐录用</p>
                <p className="text-2xl font-bold text-green-600">{stats.hire}</p>
              </div>
              <Trophy className="w-8 h-8 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">进入下轮</p>
                <p className="text-2xl font-bold text-blue-600">{stats.nextRound}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">平均得分</p>
                <p className="text-2xl font-bold">{stats.avgScore.toFixed(1)}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">平均信心度</p>
                <p className="text-2xl font-bold">{stats.avgConfidence.toFixed(0)}%</p>
              </div>
              <Target className="w-8 h-8 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 控制栏 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              候选人决策对比
            </CardTitle>
            <div className="flex items-center gap-4">
              <select
                className="px-3 py-1 border rounded-md text-sm"
                value={filterDecision}
                onChange={(e) => setFilterDecision(e.target.value)}
              >
                <option value="all">所有决策</option>
                <option value="hire">推荐录用</option>
                <option value="next_round">进入下轮</option>
                <option value="hold">暂缓决定</option>
                <option value="reject">不予考虑</option>
              </select>
              <select
                className="px-3 py-1 border rounded-md text-sm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="score">按得分排序</option>
                <option value="confidence">按信心度排序</option>
                <option value="name">按姓名排序</option>
              </select>
              <div className="flex gap-1 bg-muted p-1 rounded-md">
                <Button
                  size="sm"
                  variant={selectedView === "table" ? "default" : "ghost"}
                  onClick={() => setSelectedView("table")}
                >
                  表格
                </Button>
                <Button
                  size="sm"
                  variant={selectedView === "cards" ? "default" : "ghost"}
                  onClick={() => setSelectedView("cards")}
                >
                  卡片
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {selectedView === "table" ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>候选人</TableHead>
                  <TableHead>决策建议</TableHead>
                  <TableHead>综合得分</TableHead>
                  <TableHead>信心度</TableHead>
                  <TableHead>面试分数</TableHead>
                  <TableHead>技术匹配</TableHead>
                  <TableHead>文化契合</TableHead>
                  <TableHead>主要优势</TableHead>
                  <TableHead>主要风险</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDecisions.map((decision) => (
                  <TableRow key={decision.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{decision.candidate?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {decision.candidate?.position}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getDecisionColor(decision.decision)}>
                        <span className="flex items-center gap-1">
                          {getDecisionIcon(decision.decision)}
                          {decision.decision === "hire" && "推荐录用"}
                          {decision.decision === "next_round" && "进入下轮"}
                          {decision.decision === "hold" && "暂缓决定"}
                          {decision.decision === "reject" && "不予考虑"}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${getScoreColor(decision.finalScore)}`}>
                          {decision.finalScore.toFixed(0)}
                        </span>
                        <Progress value={decision.finalScore} className="w-16" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{decision.confidence}%</span>
                        <Progress value={decision.confidence} className="w-16" />
                      </div>
                    </TableCell>
                    <TableCell>
                      {decision.interviewScore ? (
                        <span className={getScoreColor(decision.interviewScore)}>
                          {decision.interviewScore.toFixed(0)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {decision.technicalMatchScore ? (
                        <span className={getScoreColor(decision.technicalMatchScore)}>
                          {decision.technicalMatchScore.toFixed(0)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {decision.culturalFitScore ? (
                        <span className={getScoreColor(decision.culturalFitScore)}>
                          {decision.culturalFitScore.toFixed(0)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <div className="max-w-[150px] truncate text-sm">
                              {decision.strengths?.main?.[0] || "查看详情"}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <ul className="space-y-1">
                              {decision.strengths?.main?.map((strength: string, idx: number) => (
                                <li key={idx} className="text-sm">• {strength}</li>
                              ))}
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <div className="max-w-[150px] truncate text-sm">
                              {decision.risks?.main?.[0] || "查看详情"}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <ul className="space-y-1">
                              {decision.risks?.main?.map((risk: string, idx: number) => (
                                <li key={idx} className="text-sm">• {risk}</li>
                              ))}
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedDecisions.map((decision) => (
                <Card key={decision.id} className="overflow-hidden">
                  <div className={`h-2 ${getDecisionColor(decision.decision).split(' ')[0]}`} />
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{decision.candidate?.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {decision.candidate?.position}
                        </p>
                      </div>
                      <Badge className={getDecisionColor(decision.decision)}>
                        {getDecisionIcon(decision.decision)}
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">综合得分</span>
                        <span className={`font-bold ${getScoreColor(decision.finalScore)}`}>
                          {decision.finalScore.toFixed(0)}
                        </span>
                      </div>
                      <Progress value={decision.finalScore} />

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">决策信心</span>
                        <span className="font-medium">{decision.confidence}%</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t">
                        <div>
                          <p className="text-xs text-muted-foreground">面试</p>
                          <p className={`text-sm font-medium ${getScoreColor(decision.interviewScore || 0)}`}>
                            {decision.interviewScore?.toFixed(0) || "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">技术</p>
                          <p className={`text-sm font-medium ${getScoreColor(decision.technicalMatchScore || 0)}`}>
                            {decision.technicalMatchScore?.toFixed(0) || "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">文化</p>
                          <p className={`text-sm font-medium ${getScoreColor(decision.culturalFitScore || 0)}`}>
                            {decision.culturalFitScore?.toFixed(0) || "-"}
                          </p>
                        </div>
                      </div>

                      {decision.recommendation && (
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground mb-1">AI 建议</p>
                          <p className="text-sm line-clamp-2">{decision.recommendation}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}