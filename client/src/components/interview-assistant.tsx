/**
 * AI面试助手主界面
 * 提供问题推荐、实时辅助、评分记录等功能
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Brain,
  Sparkles,
  MessageSquare,
  Target,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Mic,
  MicOff,
  Volume2,
  FileText,
  TrendingUp,
  User,
  Briefcase,
  Star,
  RefreshCw,
  Download,
  Send,
  PlusCircle,
  MinusCircle,
  AlertTriangle,
  HelpCircle,
  Lightbulb,
  Activity
} from "lucide-react";

interface InterviewAssistantProps {
  candidateId: string;
  candidateName: string;
  jobId: string;
  jobTitle: string;
  interviewRound: number;
  interviewType: string;
  onComplete?: (report: any) => void;
}

// 问题类型标签颜色
const QUESTION_TYPE_COLORS = {
  behavioral: "bg-blue-100 text-blue-700",
  technical: "bg-purple-100 text-purple-700",
  situational: "bg-green-100 text-green-700",
  culture_fit: "bg-pink-100 text-pink-700",
  motivation: "bg-yellow-100 text-yellow-700",
  competency: "bg-indigo-100 text-indigo-700",
} as const;

// 难度级别颜色
const DIFFICULTY_COLORS = {
  easy: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  hard: "bg-orange-100 text-orange-700",
  expert: "bg-red-100 text-red-700",
} as const;

export function InterviewAssistant({
  candidateId,
  candidateName,
  jobId,
  jobTitle,
  interviewRound,
  interviewType,
  onComplete
}: InterviewAssistantProps) {
  const { toast } = useToast();

  // 状态管理
  const [activeTab, setActiveTab] = useState<"prepare" | "conduct" | "evaluate">("prepare");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [sessionNotes, setSessionNotes] = useState("");
  const [evaluationScores, setEvaluationScores] = useState<Record<string, number>>({});
  const [showStarGuidance, setShowStarGuidance] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [selectedFollowUps, setSelectedFollowUps] = useState<string[]>([]);

  // 获取问题推荐
  const { data: recommendation, isLoading: loadingQuestions } = useQuery({
    queryKey: [`/api/interview-assistant/recommend`, candidateId, jobId, interviewRound],
    queryFn: async () => {
      const response = await fetch(`/api/interview-assistant/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId,
          jobId,
          interviewRound,
          interviewType,
          preferences: {
            maxQuestions: 10,
            focusAreas: []
          }
        })
      });
      if (!response.ok) throw new Error('Failed to get recommendations');
      return response.json();
    }
  });

  // 当前问题
  const currentQuestion = useMemo(() => {
    if (!recommendation?.questions) return null;
    return recommendation.questions[currentQuestionIndex];
  }, [recommendation, currentQuestionIndex]);

  // 进度计算
  const progress = useMemo(() => {
    if (!recommendation?.questions) return 0;
    return ((currentQuestionIndex + 1) / recommendation.questions.length) * 100;
  }, [recommendation, currentQuestionIndex]);

  // 开始面试会话
  const startSession = useCallback(() => {
    setSessionStarted(true);
    setActiveTab("conduct");
    toast({
      title: "面试开始",
      description: "祝您面试顺利！AI助手将全程为您提供支持。",
    });
  }, [toast]);

  // 切换到下一个问题
  const nextQuestion = useCallback(() => {
    if (!recommendation?.questions) return;

    // 保存当前答案
    if (currentAnswer) {
      // TODO: 保存答案到后端
    }

    if (currentQuestionIndex < recommendation.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setCurrentAnswer("");
      setShowFollowUp(false);
      setSelectedFollowUps([]);
    } else {
      // 面试结束
      setActiveTab("evaluate");
      toast({
        title: "面试结束",
        description: "请完成最终评估",
      });
    }
  }, [currentQuestionIndex, currentAnswer, recommendation, toast]);

  // 返回上一个问题
  const prevQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  }, [currentQuestionIndex]);

  // 渲染准备阶段
  const renderPreparePhase = () => (
    <div className="space-y-6">
      {/* 面试概览 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            面试概览
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">候选人</Label>
              <p className="font-medium">{candidateName}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">应聘职位</Label>
              <p className="font-medium">{jobTitle}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">面试轮次</Label>
              <p className="font-medium">第 {interviewRound} 轮</p>
            </div>
            <div>
              <Label className="text-muted-foreground">面试类型</Label>
              <p className="font-medium">{interviewType}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 面试策略 */}
      {recommendation?.strategy && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              面试策略
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">推荐方法</h4>
              <p className="text-sm text-muted-foreground">
                {recommendation.strategy.approach}
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">面试目标</h4>
              <ul className="list-disc list-inside space-y-1">
                {recommendation.strategy.objectives.map((obj: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground">{obj}</li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2 text-green-600">应该做的 ✓</h4>
                <ul className="space-y-1">
                  {recommendation.strategy.doList.map((item: string, i: number) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2 text-red-600">不应该做的 ✗</h4>
                <ul className="space-y-1">
                  {recommendation.strategy.dontList.map((item: string, i: number) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-1">
                      <AlertCircle className="h-3 w-3 text-red-600 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 时间分配 */}
      {recommendation?.timeAllocation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              时间分配建议
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recommendation.timeAllocation.map((section: any, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{section.section}</span>
                      <span className="text-sm text-muted-foreground">
                        {section.duration} 分钟
                      </span>
                    </div>
                    <Progress value={(section.duration / 60) * 100} className="h-2 mt-1" />
                    <p className="text-xs text-muted-foreground mt-1">{section.purpose}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 问题预览 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              推荐问题（{recommendation?.questions?.length || 0}个）
            </span>
            <Button onClick={startSession} disabled={!recommendation}>
              开始面试
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {recommendation?.questions?.map((q: any, i: number) => (
                <div key={q.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-sm font-medium">问题 {i + 1}</span>
                    <div className="flex gap-2">
                      <Badge className={QUESTION_TYPE_COLORS[q.type as keyof typeof QUESTION_TYPE_COLORS] || ""}>
                        {q.type}
                      </Badge>
                      <Badge className={DIFFICULTY_COLORS[q.difficulty as keyof typeof DIFFICULTY_COLORS] || ""}>
                        {q.difficulty}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm mb-2">{q.question}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      {q.purpose}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {q.timeEstimate} 分钟
                    </span>
                  </div>
                  {q.recommendationReason && (
                    <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
                      <span className="font-medium">推荐理由：</span>
                      {q.recommendationReason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );

  // 渲染进行阶段
  const renderConductPhase = () => (
    <div className="space-y-6">
      {/* 进度条 */}
      <div className="flex items-center gap-4">
        <Progress value={progress} className="flex-1" />
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {currentQuestionIndex + 1} / {recommendation?.questions?.length || 0}
        </span>
      </div>

      {/* 当前问题 */}
      {currentQuestion && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>问题 {currentQuestionIndex + 1}</span>
              <div className="flex gap-2">
                <Badge className={QUESTION_TYPE_COLORS[currentQuestion.type as keyof typeof QUESTION_TYPE_COLORS] || ""}>
                  {currentQuestion.type}
                </Badge>
                <Badge className={DIFFICULTY_COLORS[currentQuestion.difficulty as keyof typeof DIFFICULTY_COLORS] || ""}>
                  {currentQuestion.difficulty}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-lg font-medium">{currentQuestion.question}</p>
            </div>

            {/* 个性化背景 */}
            {currentQuestion.personalizedContext && (
              <Alert>
                <Lightbulb className="h-4 w-4" />
                <AlertDescription>
                  <strong>背景：</strong> {currentQuestion.personalizedContext}
                </AlertDescription>
              </Alert>
            )}

            {/* 考察要点 */}
            <div>
              <Label>关键考察点</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {currentQuestion.keyPoints?.map((point: string, i: number) => (
                  <Badge key={i} variant="outline">{point}</Badge>
                ))}
              </div>
            </div>

            {/* STAR引导 */}
            {currentQuestion.starGuidance && (
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowStarGuidance(!showStarGuidance)}
                  className="mb-2"
                >
                  <HelpCircle className="h-4 w-4 mr-2" />
                  STAR引导
                </Button>
                {showStarGuidance && (
                  <Card className="mt-2">
                    <CardContent className="pt-4">
                      <div className="space-y-2 text-sm">
                        <div>
                          <strong>S - 情境：</strong> {currentQuestion.starGuidance.situation}
                        </div>
                        <div>
                          <strong>T - 任务：</strong> {currentQuestion.starGuidance.task}
                        </div>
                        <div>
                          <strong>A - 行动：</strong> {currentQuestion.starGuidance.action}
                        </div>
                        <div>
                          <strong>R - 结果：</strong> {currentQuestion.starGuidance.result}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* 答案记录 */}
            <div>
              <Label>候选人回答</Label>
              <Textarea
                className="mt-2"
                rows={6}
                placeholder="记录候选人的回答..."
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
              />
            </div>

            {/* 追问建议 */}
            {currentQuestion.followUpQuestions?.length > 0 && (
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFollowUp(!showFollowUp)}
                  className="mb-2"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  追问建议
                </Button>
                {showFollowUp && (
                  <Card className="mt-2">
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        {currentQuestion.followUpQuestions.map((q: string, i: number) => (
                          <div key={i} className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              checked={selectedFollowUps.includes(q)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedFollowUps([...selectedFollowUps, q]);
                                } else {
                                  setSelectedFollowUps(selectedFollowUps.filter(f => f !== q));
                                }
                              }}
                            />
                            <label className="text-sm">{q}</label>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* AI实时建议 */}
            <Alert>
              <Brain className="h-4 w-4" />
              <AlertDescription>
                <strong>AI建议：</strong> 注意观察候选人的表达逻辑和具体细节，如需要可以请其提供更具体的案例。
              </AlertDescription>
            </Alert>

            {/* 评分 */}
            <div>
              <Label>快速评分</Label>
              <RadioGroup
                className="flex gap-4 mt-2"
                value={evaluationScores[currentQuestion.id]?.toString()}
                onValueChange={(value) => {
                  setEvaluationScores({
                    ...evaluationScores,
                    [currentQuestion.id]: parseInt(value)
                  });
                }}
              >
                {[1, 2, 3, 4, 5].map(score => (
                  <div key={score} className="flex items-center">
                    <RadioGroupItem value={score.toString()} id={`score-${score}`} />
                    <Label htmlFor={`score-${score}`} className="ml-2">{score}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* 导航按钮 */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={prevQuestion}
                disabled={currentQuestionIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                上一题
              </Button>
              <Button onClick={nextQuestion}>
                {currentQuestionIndex === (recommendation?.questions?.length || 0) - 1 ? '完成' : '下一题'}
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 实时笔记 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            面试笔记
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={4}
            placeholder="记录重要观察、印象和想法..."
            value={sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
          />
        </CardContent>
      </Card>
    </div>
  );

  // 渲染评估阶段
  const renderEvaluatePhase = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>面试评估</CardTitle>
          <CardDescription>请完成各维度评分和总体评价</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 维度评分 */}
          {recommendation?.evaluationFramework?.dimensions?.map((dim: any) => (
            <div key={dim.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{dim.name}</Label>
                <span className="text-sm text-muted-foreground">
                  权重：{(dim.weight * 100).toFixed(0)}%
                </span>
              </div>
              <Slider
                defaultValue={[3]}
                max={5}
                min={1}
                step={0.5}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground">
                {dim.description}
              </div>
            </div>
          ))}

          {/* 总体建议 */}
          <div>
            <Label>录用建议</Label>
            <RadioGroup className="mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="strong_hire" id="strong_hire" />
                <Label htmlFor="strong_hire">强烈推荐录用</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hire" id="hire" />
                <Label htmlFor="hire">推荐录用</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="undecided" id="undecided" />
                <Label htmlFor="undecided">待定</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no_hire" id="no_hire" />
                <Label htmlFor="no_hire">不推荐录用</Label>
              </div>
            </RadioGroup>
          </div>

          {/* 总体评价 */}
          <div>
            <Label>总体评价</Label>
            <Textarea
              rows={4}
              placeholder="请总结候选人的优势、不足和录用建议..."
              className="mt-2"
            />
          </div>

          <Button className="w-full" onClick={() => {
            toast({
              title: "评估完成",
              description: "面试报告已生成",
            });
            if (onComplete) {
              onComplete({
                // 报告数据
              });
            }
          }}>
            <Download className="h-4 w-4 mr-2" />
            生成面试报告
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="h-6 w-6" />
          AI 面试助手
        </h1>
        <p className="text-muted-foreground mt-1">
          智能化面试支持，让每一次面试更高效、更专业
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="prepare" disabled={sessionStarted}>
            <Briefcase className="h-4 w-4 mr-2" />
            准备
          </TabsTrigger>
          <TabsTrigger value="conduct" disabled={!sessionStarted}>
            <MessageSquare className="h-4 w-4 mr-2" />
            进行
          </TabsTrigger>
          <TabsTrigger value="evaluate" disabled={activeTab !== "evaluate"}>
            <TrendingUp className="h-4 w-4 mr-2" />
            评估
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prepare">
          {loadingQuestions ? (
            <Card>
              <CardContent className="py-12 text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p>正在生成个性化面试方案...</p>
              </CardContent>
            </Card>
          ) : (
            renderPreparePhase()
          )}
        </TabsContent>

        <TabsContent value="conduct">
          {renderConductPhase()}
        </TabsContent>

        <TabsContent value="evaluate">
          {renderEvaluatePhase()}
        </TabsContent>
      </Tabs>
    </div>
  );
}