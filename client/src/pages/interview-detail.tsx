/**
 * 面试详情页
 * 展示完整的面试信息，包括基本信息、候选人资料、面试反馈、准备材料等
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sidebar } from "@/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  Users,
  Video,
  Phone,
  Building,
  MessageSquare,
  FileText,
  Brain,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Star,
  Sparkles,
  Edit,
  Trash2,
  Download,
  Share2,
  Mail,
  Briefcase,
  GraduationCap,
  DollarSign,
  Target,
  ChevronRight,
  ExternalLink,
  Mic,
  Keyboard,
  Bot,
  Info,
  ClipboardCheck,
  Award,
  BarChart3,
  Loader2
} from "lucide-react";
import { InterviewFormDialog } from "@/components/interview-form-dialog";
import { InterviewFeedbackEnhanced } from "@/components/interview-feedback-enhanced";
import { InterviewerBrief } from "@/components/interviewer-brief";
import { ProfileCard } from "@/components/profile-card";
import { useLanguage } from "@/contexts/language-context";
import { INTERVIEW_TYPE_MAP, TRANSCRIPTION_METHOD_MAP } from "@/constants/interview";
import type { Interview, Candidate, Job, User as UserType, CandidateProfile } from "@shared/schema";

export default function InterviewDetailPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  const interviewId = params.id;

  // 状态管理
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  // 获取面试详情
  const {
    data: interview,
    isLoading: isInterviewLoading,
    error: interviewError,
    refetch: refetchInterview
  } = useQuery<Interview>({
    queryKey: [`/api/interviews/${interviewId}`],
    enabled: !!interviewId,
  });

  // 获取候选人信息
  const {
    data: candidate,
    isLoading: isCandidateLoading
  } = useQuery<Candidate>({
    queryKey: [`/api/candidates/${interview?.candidateId}`],
    enabled: !!interview?.candidateId,
  });

  // 获取职位信息
  const {
    data: job,
    isLoading: isJobLoading
  } = useQuery<Job>({
    queryKey: [`/api/jobs/${interview?.jobId}`],
    enabled: !!interview?.jobId,
  });

  // 获取面试官信息
  const {
    data: interviewer,
    isLoading: isInterviewerLoading
  } = useQuery<UserType>({
    queryKey: [`/api/users/${interview?.interviewerId}`],
    enabled: !!interview?.interviewerId,
  });

  // 获取候选人画像
  const {
    data: profiles = [],
    isLoading: isProfilesLoading
  } = useQuery<CandidateProfile[]>({
    queryKey: [`/api/candidates/${interview?.candidateId}/profiles`],
    enabled: !!interview?.candidateId,
  });

  // 获取面试准备材料
  const {
    data: preparation,
    isLoading: isPreparationLoading,
    refetch: refetchPreparation
  } = useQuery({
    queryKey: [`/api/interviews/${interviewId}/preparation`],
    enabled: !!interviewId && interview?.status === "scheduled",
  });

  // 删除面试
  const deleteMutation = useMutation({
    mutationFn: async () => {
      try {
        const res = await fetch(`/api/interviews/${interviewId}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.message || "删除失败");
        }
        return res.json();
      } catch (error) {
        console.error("Delete interview error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "删除成功",
        description: "面试记录已删除",
      });
      navigate("/interviews");
    },
    onError: (error) => {
      toast({
        title: "删除失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 生成面试准备材料
  const generatePreparationMutation = useMutation({
    mutationFn: async () => {
      try {
        const res = await fetch(`/api/interviews/${interviewId}/preparation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ candidateId: interview?.candidateId }),
        });
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.message || "生成失败");
        }
        return res.json();
      } catch (error) {
        console.error("Generate preparation error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "生成成功",
        description: "面试准备材料已生成",
      });
      refetchPreparation();
    },
    onError: (error) => {
      toast({
        title: "生成失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 分享面试信息
  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/interviews/${interviewId}`;
    const shareText = `面试信息 - ${candidate?.name} | ${job?.title}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareText,
          text: `查看${candidate?.name}的${job?.title}面试详情`,
          url: shareUrl,
        });
      } catch (error) {
        console.error("分享失败:", error);
      }
    } else {
      // 复制链接到剪贴板
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "链接已复制",
        description: "面试详情链接已复制到剪贴板",
      });
    }
  };

  // 下载面试报告
  const handleDownloadReport = () => {
    // TODO: 实现面试报告下载功能
    toast({
      title: "功能开发中",
      description: "面试报告下载功能即将推出",
    });
  };

  // 计算面试进度
  const calculateProgress = useCallback(() => {
    if (!interview) return 0;

    let progress = 25; // 基础进度：已创建
    if (interview.status === "scheduled") progress = 50; // 已安排
    if (interview.feedback) progress = 75; // 已反馈
    if (interview.status === "completed") progress = 100; // 已完成

    return progress;
  }, [interview]);

  // 获取最新的候选人画像
  const latestProfile = useMemo(() => {
    return profiles.length > 0 ? profiles[profiles.length - 1] : null;
  }, [profiles]);

  // 获取面试类型信息
  const interviewType = useMemo(() => {
    if (!interview?.type) return INTERVIEW_TYPE_MAP.screening;
    return INTERVIEW_TYPE_MAP[interview.type] || INTERVIEW_TYPE_MAP.screening;
  }, [interview?.type]);

  // 加载状态
  if (!interviewId) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>错误</AlertTitle>
        <AlertDescription>无效的面试ID</AlertDescription>
      </Alert>
    );
  }

  if (isInterviewLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (interviewError || !interview) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 p-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>加载失败</AlertTitle>
            <AlertDescription>
              {interviewError?.message || "无法加载面试信息"}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const interviewStatus = useMemo(() => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      scheduled: { label: "已安排", variant: "default" },
      completed: { label: "已完成", variant: "secondary" },
      cancelled: { label: "已取消", variant: "destructive" },
      pending: { label: "待安排", variant: "outline" },
    };
    return statusMap[interview.status] || statusMap.scheduled;
  }, [interview.status]);

  const transcriptionMethod = useMemo(() => {
    return interview.transcriptionMethod ?
      TRANSCRIPTION_METHOD_MAP[interview.transcriptionMethod] : null;
  }, [interview.transcriptionMethod]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/interviews")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回列表
              </Button>

              <Separator orientation="vertical" className="h-6" />

              <div>
                <h1 className="text-2xl font-semibold flex items-center gap-2">
                  {React.createElement(interviewType.icon, { className: "h-6 w-6" })}
                  面试详情
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {candidate?.name} · {job?.title} · 第{interview.round}轮
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4 mr-2" />
                分享
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadReport}
              >
                <Download className="h-4 w-4 mr-2" />
                下载报告
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEditDialog(true)}
                disabled={interview.status === "completed"}
              >
                <Edit className="h-4 w-4 mr-2" />
                编辑
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                删除
              </Button>
            </div>
          </div>

          {/* 进度条 */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">面试进度</span>
              <span className="text-sm font-medium">{calculateProgress()}%</span>
            </div>
            <Progress value={calculateProgress()} className="h-2" />
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* 状态卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">状态</p>
                      <Badge variant={interviewStatus.variant} className="mt-1">
                        {interviewStatus.label}
                      </Badge>
                    </div>
                    <Calendar className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">面试时间</p>
                      <p className="text-lg font-medium mt-1">
                        {new Date(interview.scheduledDate).toLocaleString("zh-CN")}
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">面试类型</p>
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium mt-1 ${interviewType.color}`}>
                        <interviewType.icon className="h-3 w-3" />
                        {interviewType.label}
                      </div>
                    </div>
                    <Brain className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">面试轮次</p>
                      <p className="text-2xl font-bold mt-1">第 {interview.round} 轮</p>
                    </div>
                    <Target className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 多Tab内容区域 */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">概览</TabsTrigger>
                <TabsTrigger value="candidate">候选人</TabsTrigger>
                <TabsTrigger value="preparation">准备材料</TabsTrigger>
                <TabsTrigger value="feedback">反馈评价</TabsTrigger>
                <TabsTrigger value="notes">备注记录</TabsTrigger>
              </TabsList>

              {/* 概览Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 基本信息 */}
                  <Card>
                    <CardHeader>
                      <CardTitle>基本信息</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">候选人</span>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback>{candidate?.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{candidate?.name}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">职位</span>
                        <span className="font-medium">{job?.title}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">部门</span>
                        <span className="font-medium">{job?.department}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">面试官</span>
                        <span className="font-medium">{interviewer?.name || "待定"}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">时长</span>
                        <span className="font-medium">{interview.duration} 分钟</span>
                      </div>

                      {interview.location && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">地点</span>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span className="font-medium">{interview.location}</span>
                          </div>
                        </div>
                      )}

                      {interview.meetingLink && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">会议链接</span>
                          <a
                            href={interview.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <Video className="h-4 w-4" />
                            <span>加入会议</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* 面试评分（如果有） */}
                  {interview.rating && (
                    <Card>
                      <CardHeader>
                        <CardTitle>面试评分</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-center py-4">
                          <div className="text-center">
                            <div className="text-4xl font-bold mb-2">{interview.rating}/5</div>
                            <div className="flex items-center gap-1 justify-center">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-5 w-5 ${
                                    i < interview.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>

                        {transcriptionMethod && (
                          <div className="flex items-center justify-between pt-4 border-t">
                            <span className="text-sm text-muted-foreground">记录方式</span>
                            <div className="flex items-center gap-2">
                              {React.createElement(transcriptionMethod.icon, { className: "h-4 w-4" })}
                              <span className="font-medium">{transcriptionMethod.label}</span>
                            </div>
                          </div>
                        )}

                        <Button
                          className="w-full"
                          onClick={() => setShowFeedbackDialog(true)}
                          disabled={interview.status !== "scheduled" && interview.status !== "completed"}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          {interview.feedback ? "查看反馈" : "填写反馈"}
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* AI 关键发现 */}
                  {interview.aiKeyFindings && interview.aiKeyFindings.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Sparkles className="h-5 w-5" />
                          AI 关键发现
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {interview.aiKeyFindings.map((finding, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                              <span className="text-sm">{finding}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* AI 关注领域 */}
                  {interview.aiConcernAreas && interview.aiConcernAreas.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <AlertCircle className="h-5 w-5" />
                          需要关注
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {interview.aiConcernAreas.map((concern, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <Info className="h-4 w-4 text-orange-500 mt-0.5" />
                              <span className="text-sm">{concern}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* 候选人Tab */}
              <TabsContent value="candidate" className="space-y-6">
                {isCandidateLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : candidate ? (
                  <div className="space-y-6">
                    {/* 候选人基本信息 */}
                    <Card>
                      <CardHeader>
                        <CardTitle>候选人信息</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{candidate.email}</span>
                          </div>
                          {candidate.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span>{candidate.phone}</span>
                            </div>
                          )}
                          {candidate.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span>{candidate.location}</span>
                            </div>
                          )}
                          {candidate.position && (
                            <div className="flex items-center gap-2">
                              <Briefcase className="h-4 w-4 text-muted-foreground" />
                              <span>{candidate.position}</span>
                            </div>
                          )}
                          {candidate.experience !== null && (
                            <div className="flex items-center gap-2">
                              <Award className="h-4 w-4 text-muted-foreground" />
                              <span>{candidate.experience} 年经验</span>
                            </div>
                          )}
                          {candidate.education && (
                            <div className="flex items-center gap-2">
                              <GraduationCap className="h-4 w-4 text-muted-foreground" />
                              <span>{candidate.education}</span>
                            </div>
                          )}
                          {candidate.salaryExpectation && (
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <span>{candidate.salaryExpectation.toLocaleString()} 元/月</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Info className="h-4 w-4 text-muted-foreground" />
                            <Badge>{candidate.status}</Badge>
                          </div>
                        </div>

                        {candidate.resumeUrl && (
                          <div className="pt-4 border-t">
                            <Button variant="outline" asChild>
                              <a href={candidate.resumeUrl} target="_blank" rel="noopener noreferrer">
                                <FileText className="h-4 w-4 mr-2" />
                                查看简历
                              </a>
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* AI 简历分析 */}
                    {candidate.aiSummary && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Brain className="h-5 w-5" />
                            AI 简历分析
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {candidate.aiSummary}
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {/* 候选人画像 */}
                    {latestProfile && (
                      <ProfileCard profile={latestProfile} />
                    )}
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>无法加载候选人信息</AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              {/* 准备材料Tab */}
              <TabsContent value="preparation" className="space-y-6">
                {interview.status === "scheduled" ? (
                  preparation ? (
                    <InterviewerBrief
                      candidate={candidate!}
                      profile={latestProfile!}
                      jobTitle={job?.title}
                      interviewRound={interview.round}
                      interviewType={interview.type as "screening" | "technical" | "behavioral" | "final" | "onsite"}
                    />
                  ) : (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center py-8">
                          <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                          <h3 className="text-lg font-medium mb-2">暂无准备材料</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            AI 可以帮您生成面试准备材料
                          </p>
                          <Button
                            onClick={() => generatePreparationMutation.mutate()}
                            disabled={generatePreparationMutation.isPending}
                          >
                            {generatePreparationMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                生成中...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-4 w-4 mr-2" />
                                生成准备材料
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                ) : (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      准备材料仅在面试安排后可用
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              {/* 反馈评价Tab */}
              <TabsContent value="feedback" className="space-y-6">
                {interview.feedback ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>面试反馈</CardTitle>
                      <CardDescription>
                        面试时间：{new Date(interview.scheduledDate).toLocaleString("zh-CN")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* 显示现有反馈 */}
                      <div className="prose prose-sm max-w-none">
                        <p className="whitespace-pre-wrap">{interview.feedback}</p>
                      </div>

                      {/* 转录内容 */}
                      {interview.transcription && (
                        <div className="space-y-2">
                          <h4 className="font-medium">面试记录</h4>
                          <ScrollArea className="h-48 w-full rounded-md border p-4">
                            <p className="text-sm whitespace-pre-wrap">{interview.transcription}</p>
                          </ScrollArea>
                        </div>
                      )}

                      <Button
                        onClick={() => setShowFeedbackDialog(true)}
                        variant="outline"
                        className="w-full"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        编辑反馈
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center py-8">
                        <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">暂无反馈</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          面试完成后，请及时填写反馈评价
                        </p>
                        <Button
                          onClick={() => setShowFeedbackDialog(true)}
                          disabled={interview.status !== "scheduled" && interview.status !== "completed"}
                        >
                          <ClipboardCheck className="h-4 w-4 mr-2" />
                          填写反馈
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* 备注记录Tab */}
              <TabsContent value="notes" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>备注记录</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {interview.interviewerNotes ? (
                      <p className="text-sm whitespace-pre-wrap">{interview.interviewerNotes}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">暂无备注</p>
                    )}
                  </CardContent>
                </Card>

                {/* 面试时间线 */}
                <Card>
                  <CardHeader>
                    <CardTitle>面试时间线</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-full bg-primary/10 p-2">
                          <Calendar className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">面试创建</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(interview.createdAt!).toLocaleString("zh-CN")}
                          </p>
                        </div>
                      </div>

                      {interview.status === "scheduled" && (
                        <div className="flex items-start gap-3">
                          <div className="rounded-full bg-blue-100 p-2">
                            <Clock className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">已安排</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(interview.scheduledDate).toLocaleString("zh-CN")}
                            </p>
                          </div>
                        </div>
                      )}

                      {interview.status === "completed" && (
                        <div className="flex items-start gap-3">
                          <div className="rounded-full bg-green-100 p-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">已完成</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(interview.updatedAt!).toLocaleString("zh-CN")}
                            </p>
                          </div>
                        </div>
                      )}

                      {interview.status === "cancelled" && (
                        <div className="flex items-start gap-3">
                          <div className="rounded-full bg-red-100 p-2">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">已取消</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(interview.updatedAt!).toLocaleString("zh-CN")}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      {/* 编辑对话框 */}
      {showEditDialog && (
        <InterviewFormDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          existingInterview={interview}
          candidateId={interview.candidateId}
          candidateName={candidate?.name}
          onSuccess={() => {
            refetchInterview();
            setShowEditDialog(false);
          }}
        />
      )}

      {/* 反馈对话框 */}
      {showFeedbackDialog && (
        <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <InterviewFeedbackEnhanced
              interview={interview}
              candidate={candidate!}
              onSubmitSuccess={() => {
                refetchInterview();
                setShowFeedbackDialog(false);
              }}
              onClose={() => setShowFeedbackDialog(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除这条面试记录吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  删除中...
                </>
              ) : (
                "确认删除"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}