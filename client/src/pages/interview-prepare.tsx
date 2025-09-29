import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Target,
  AlertCircle,
  MessageSquare,
  Lightbulb,
  Star,
  Clock,
  User,
  Briefcase,
  ChevronRight,
  FileText,
  Brain,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { Interview, InterviewPreparation, Candidate, Job } from "@shared/schema";
import type {
  CandidateContext,
  SuggestedQuestion,
  FocusArea,
  RATING_SCALE
} from "@shared/types/interview-preparation";

interface PreparationWithDetails extends InterviewPreparation {
  interview?: Interview;
  candidate?: Candidate;
  job?: Job;
}

export default function InterviewPreparePage() {
  const { id: interviewId } = useParams();
  const [, navigate] = useLocation();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  // 获取面试准备材料
  const { data: preparation, isLoading, error, refetch } = useQuery<PreparationWithDetails>({
    queryKey: [`/api/interviews/${interviewId}/preparation`],
    enabled: !!interviewId,
  });

  // 获取面试详情
  const { data: interview } = useQuery<Interview>({
    queryKey: [`/api/interviews/${interviewId}`],
    enabled: !!interviewId,
  });

  // 获取候选人详情
  const { data: candidate } = useQuery<Candidate>({
    queryKey: [`/api/candidates/${interview?.candidateId}`],
    enabled: !!interview?.candidateId,
  });

  // 获取职位详情
  const { data: job } = useQuery<Job>({
    queryKey: [`/api/jobs/${interview?.jobId}`],
    enabled: !!interview?.jobId,
  });

  // 提交反馈
  const feedbackMutation = useMutation({
    mutationFn: async (data: { rating: number; comment: string }) => {
      const res = await fetch(`/api/interviews/${interviewId}/preparation/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to submit feedback");
      return res.json();
    },
    onSuccess: () => {
      refetch();
    },
  });

  // 生成面试准备材料
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!interview?.candidateId) throw new Error("Missing candidate ID");

      const res = await fetch(`/api/interviews/${interviewId}/preparation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: interview.candidateId,
        }),
      });
      if (!res.ok) throw new Error("Failed to generate preparation");
      return res.json();
    },
    onSuccess: () => {
      refetch();
    },
  });

  // 解析 JSONB 数据（使用类型安全的转换）
  const candidateContext = (preparation?.candidateContext as CandidateContext) || {};
  const suggestedQuestions = (preparation?.suggestedQuestions as SuggestedQuestion[]) || [];
  const focusAreas = (preparation?.focusAreas as FocusArea[]) || [];
  const previousGaps = (preparation?.previousGaps as string[]) || [];
  const interviewerTips = (preparation?.interviewerTips as string[]) || [];

  // 根据优先级获取颜色
  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "outline";
    }
  };

  // 根据类别获取图标
  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case "technical":
        return <Brain className="h-4 w-4" />;
      case "behavioral":
        return <User className="h-4 w-4" />;
      case "situational":
        return <Briefcase className="h-4 w-4" />;
      case "cultural":
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error || (!preparation && !generateMutation.isPending)) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>面试准备材料未生成</AlertTitle>
          <AlertDescription>
            {interview ? (
              <div className="mt-4">
                <p className="mb-4">该面试还没有生成准备材料。点击下方按钮生成。</p>
                <Button
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending}
                >
                  {generateMutation.isPending ? "生成中..." : "生成面试准备材料"}
                </Button>
              </div>
            ) : (
              "无法加载面试信息"
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">面试准备材料</h1>
          <p className="text-muted-foreground mt-2">
            为 {candidate?.name || "候选人"} 的{" "}
            {interview?.type || "面试"} 准备
          </p>
        </div>
        <div className="flex items-center gap-4">
          {preparation?.confidence && (
            <Badge variant="outline" className="px-3 py-1">
              置信度: {preparation.confidence}%
            </Badge>
          )}
          {preparation?.status && (
            <Badge
              variant={preparation.status === "completed" ? "default" : "secondary"}
            >
              {preparation.status === "completed" ? "已完成" : "生成中"}
            </Badge>
          )}
          <Button
            variant="outline"
            onClick={() => navigate(`/interviews/${interviewId}`)}
          >
            返回面试详情
          </Button>
        </div>
      </div>

      {/* 候选人状态摘要 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            候选人当前状态
          </CardTitle>
          <CardDescription>基于 AI 分析的候选人综合评估</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">总体摘要</p>
            <p>{candidateContext.summary || "暂无摘要"}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground mb-2">当前评分</p>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold">
                  {candidateContext.currentScore || 0}
                </div>
                <span className="text-muted-foreground">/ 100</span>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">面试轮次</p>
              <div className="text-2xl font-bold">
                第 {interview?.round || 1} 轮
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                已验证的优势
              </p>
              <div className="space-y-1">
                {candidateContext.strengths?.map((strength, index) => (
                  <Badge key={index} variant="outline" className="mr-2">
                    {strength}
                  </Badge>
                )) || <span className="text-muted-foreground">暂无</span>}
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                需要关注的点
              </p>
              <div className="space-y-1">
                {candidateContext.concerns?.map((concern, index) => (
                  <Badge key={index} variant="outline" className="mr-2">
                    {concern}
                  </Badge>
                )) || <span className="text-muted-foreground">暂无</span>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* AI 建议的问题 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              建议的面试问题
            </CardTitle>
            <CardDescription>基于候选人背景定制的问题</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {suggestedQuestions.map((q, index) => (
                <AccordionItem key={index} value={`question-${index}`}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-start gap-2 text-left">
                      {getCategoryIcon(q.category)}
                      <span>{q.question}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pl-6">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          评估目的
                        </p>
                        <p className="text-sm">{q.purpose}</p>
                      </div>
                      {q.probing && q.probing.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            追问建议
                          </p>
                          <ul className="text-sm space-y-1">
                            {q.probing.map((probe, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <ChevronRight className="h-3 w-3 mt-0.5 text-muted-foreground" />
                                <span>{probe}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* 重点考察领域 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              重点考察领域
            </CardTitle>
            <CardDescription>需要深入评估的关键领域</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {focusAreas.map((area, index) => (
              <div key={index} className="space-y-2 pb-4 border-b last:border-0">
                <div className="flex items-start justify-between">
                  <h4 className="font-medium">{area.area}</h4>
                  <Badge variant={getPriorityColor(area.priority)}>
                    {area.priority === "high" ? "高" :
                     area.priority === "medium" ? "中" : "低"}优先级
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{area.why}</p>
                <div className="space-y-1">
                  <p className="text-sm font-medium">关键信号：</p>
                  {area.signals?.map((signal, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-3 w-3 mt-0.5 text-muted-foreground" />
                      <span>{signal}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 前轮未覆盖的点 */}
        {previousGaps.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                待评估领域
              </CardTitle>
              <CardDescription>前几轮面试未充分覆盖的方面</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {previousGaps.map((gap, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <span>{gap}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* 面试官提示 */}
        {interviewerTips.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                面试技巧提示
              </CardTitle>
              <CardDescription>提高面试效果的建议</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {interviewerTips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Star className="h-4 w-4 mt-0.5 text-yellow-500" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 反馈区域 */}
      <Card>
        <CardHeader>
          <CardTitle>准备材料反馈</CardTitle>
          <CardDescription>
            您觉得这份准备材料对面试有帮助吗？
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {preparation?.feedbackRating ? (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>感谢您的反馈！</AlertTitle>
              <AlertDescription>
                您的评分: {preparation.feedbackRating}/5
                {preparation.feedbackComment && (
                  <p className="mt-2">评论: {preparation.feedbackComment}</p>
                )}
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div>
                <p className="text-sm font-medium mb-2">评分</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Button
                      key={star}
                      variant={rating >= star ? "default" : "outline"}
                      size="sm"
                      onClick={() => setRating(star)}
                    >
                      <Star
                        className={`h-4 w-4 ${
                          rating >= star ? "fill-current" : ""
                        }`}
                      />
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">评论（可选）</p>
                <Textarea
                  placeholder="请分享您的建议..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                />
              </div>
              <Button
                onClick={() => feedbackMutation.mutate({ rating, comment })}
                disabled={!rating || feedbackMutation.isPending}
              >
                {feedbackMutation.isPending ? "提交中..." : "提交反馈"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}