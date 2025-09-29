import { useState, useMemo, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  DollarSign,
  FileText,
  Calendar,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  User,
  TrendingUp,
  GitCompare,
  Brain,
  ClipboardCheck,
  Loader2,
  Clock,
  AlertCircle
} from "lucide-react";
import { ProfileCard } from "@/components/profile-card";
import { ProfileCardEnhanced } from "@/components/profile-card-enhanced";
import { ProfileEvolutionTimeline } from "@/components/profile-evolution-timeline";
import { ProfileComparison } from "@/components/profile-comparison";
import { OrganizationFitTrend } from "@/components/organization-fit-trend";
import { InterviewerBrief } from "@/components/interviewer-brief";
import { InterviewFormDialog } from "@/components/interview-form-dialog";
import { ErrorBoundary, ChartErrorBoundary } from "@/components/error-boundary";
import type { Candidate, CandidateProfile, Interview } from "@shared/schema";

// 常量定义
const ROUND_LABELS: Record<number, string> = {
  1: "第一轮",
  2: "第二轮",
  3: "第三轮",
  4: "第四轮",
  5: "最终轮"
};

const INTERVIEW_STATUS_CONFIG = {
  scheduled: { label: "已安排", variant: "default" as const },
  completed: { label: "已完成", variant: "secondary" as const },
  cancelled: { label: "已取消", variant: "destructive" as const },
  pending: { label: "待安排", variant: "outline" as const }
} as const;

export default function CandidateDetailPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const candidateId = params.id;

  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [comparisonProfileIds, setComparisonProfileIds] = useState<[string | null, string | null]>([null, null]);
  const [activeTab, setActiveTab] = useState<"overview" | "profiles" | "comparison" | "brief">("overview");
  const [showBrief, setShowBrief] = useState(false);
  const [showDecision, setShowDecision] = useState(false);
  const [currentDecision, setCurrentDecision] = useState<any>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [showInterviewDialog, setShowInterviewDialog] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [showAllInterviews, setShowAllInterviews] = useState(false);

  const { data: candidate, isLoading: isCandidateLoading, error: candidateError } = useQuery<Candidate>({
    queryKey: [`/api/candidates/${candidateId}`],
    enabled: !!candidateId,
  });

  const { data: profiles = [], isLoading: isProfilesLoading, error: profilesError } = useQuery<CandidateProfile[]>({
    queryKey: [`/api/candidates/${candidateId}/profiles`],
    enabled: !!candidateId,
  });

  // 获取职位列表（用于生成决策）
  const { data: jobs = [] } = useQuery<any[]>({
    queryKey: ["/api/jobs"],
  });

  // 获取候选人的面试记录
  const {
    data: interviewsData,
    refetch: refetchInterviews,
    error: interviewsError,
    isLoading: interviewsLoading
  } = useQuery<Interview[]>({
    queryKey: ["/api/interviews", { candidateId }],
    queryFn: async () => {
      const res = await fetch(`/api/interviews?candidateId=${candidateId}`);
      if (!res.ok) throw new Error("Failed to fetch interviews");
      return res.json();
    },
    enabled: !!candidateId,
  });

  const interviews = interviewsData || [];

  const buildProfileMutation = useMutation({
    mutationFn: async (jobId?: string) => {
      const res = await fetch(`/api/candidates/${candidateId}/profiles/build`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "构建画像失败");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/candidates/${candidateId}/profiles`] });
      toast({
        title: "成功",
        description: "候选人画像已生成",
      });
    },
    onError: (error) => {
      toast({
        title: "生成失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    },
  });

  if (!candidateId) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>无效的候选人 ID</AlertDescription>
      </Alert>
    );
  }

  if (candidateError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            加载候选人信息失败: {candidateError instanceof Error ? candidateError.message : "未知错误"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isCandidateLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>未找到候选人信息</AlertDescription>
        </Alert>
      </div>
    );
  }

  useEffect(() => {
    if (profiles.length > 0 && !selectedProfileId) {
      setSelectedProfileId(profiles[profiles.length - 1].id);
    }
  }, [profiles, selectedProfileId]);

  useEffect(() => {
    if (profiles.length >= 2 && !comparisonProfileIds[0] && !comparisonProfileIds[1]) {
      setComparisonProfileIds([
        profiles[profiles.length - 1].id,
        profiles[profiles.length - 2].id
      ]);
    }
  }, [profiles, comparisonProfileIds]);

  const selectedProfile = useMemo(
    () => profiles.find(p => p.id === selectedProfileId),
    [profiles, selectedProfileId]
  );

  const comparisonProfiles = useMemo(() => {
    const profileA = comparisonProfileIds[0] ? profiles.find(p => p.id === comparisonProfileIds[0]) : null;
    const profileB = comparisonProfileIds[1] ? profiles.find(p => p.id === comparisonProfileIds[1]) : null;
    return { profileA, profileB };
  }, [profiles, comparisonProfileIds]);

  const handleBuildProfile = () => {
    buildProfileMutation.mutate(undefined);
  };

  const handleProfileSelect = (profile: CandidateProfile) => {
    setSelectedProfileId(profile.id);
    setActiveTab("overview");
  };

  // 生成面试准备材料
  const generateInterviewPreparationMutation = useMutation({
    mutationFn: async (interviewId: string) => {
      const res = await fetch(`/api/interviews/${interviewId}/preparation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "生成面试准备失败");
      }

      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "成功",
        description: "面试准备材料已生成",
      });
      // 跳转到面试准备页面
      navigate(`/interview-prepare/${data.interviewId}`);
    },
    onError: (error) => {
      toast({
        title: "生成失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    },
  });

  // 生成招聘决策
  const generateHiringDecisionMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await fetch("/api/hiring-decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId, jobId }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "生成招聘决策失败");
      }

      return res.json();
    },
    onSuccess: (data) => {
      setCurrentDecision(data);
      setShowDecision(true);
      toast({
        title: "成功",
        description: "招聘决策已生成",
      });
    },
    onError: (error) => {
      toast({
        title: "生成失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/candidates")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回候选人列表
        </Button>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <User className="h-8 w-8" aria-hidden="true" />
              {candidate.name}
            </h1>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              {candidate.email && (
                <div className="flex items-center gap-1">
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  {candidate.email}
                </div>
              )}
              {candidate.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  {candidate.phone}
                </div>
              )}
              {candidate.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  {candidate.location}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleBuildProfile}
              disabled={buildProfileMutation.isPending || !candidate.resumeText || !candidate.aiSummary}
              variant={profiles.length === 0 ? "default" : "outline"}
              size="sm"
            >
              <Sparkles className="h-4 w-4 mr-2" aria-hidden="true" />
              {buildProfileMutation.isPending ? "生成中..." : profiles.length === 0 ? "生成初始画像" : "重新生成画像"}
            </Button>

            {/* 安排面试按钮 */}
            <Button
              onClick={() => {
                setSelectedInterview(null);
                setShowInterviewDialog(true);
              }}
              variant="outline"
              size="sm"
            >
              <Calendar className="h-4 w-4 mr-2" aria-hidden="true" />
              安排面试
            </Button>

            {/* AI 面试准备按钮 - 只有当有面试安排时显示 */}
            {interviews.filter((i: any) => i.status === "scheduled").length > 0 && (
              <Button
                onClick={() => {
                  const scheduledInterview = interviews.find((i: any) => i.status === "scheduled");
                  if (scheduledInterview) {
                    generateInterviewPreparationMutation.mutate(scheduledInterview.id);
                  }
                }}
                disabled={generateInterviewPreparationMutation.isPending}
                variant="outline"
                size="sm"
              >
                {generateInterviewPreparationMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> 生成中...</>
                ) : (
                  <><Brain className="h-4 w-4 mr-2" /> AI 面试准备</>
                )}
              </Button>
            )}

            {/* AI 招聘决策按钮 */}
            {jobs.length > 0 && (
              <Button
                onClick={() => {
                  // 如果只有一个职位，直接生成；否则让用户选择
                  if (jobs.length === 1) {
                    generateHiringDecisionMutation.mutate(jobs[0].id);
                  } else {
                    // TODO: 显示职位选择对话框
                    const firstJob = jobs[0];
                    generateHiringDecisionMutation.mutate(firstJob.id);
                  }
                }}
                disabled={generateHiringDecisionMutation.isPending}
                variant="outline"
                size="sm"
              >
                {generateHiringDecisionMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> 生成中...</>
                ) : (
                  <><ClipboardCheck className="h-4 w-4 mr-2" /> AI 招聘决策</>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="gap-2">
            <Briefcase className="h-4 w-4" aria-hidden="true" />
            基本信息 & 画像
          </TabsTrigger>
          <TabsTrigger value="profiles" className="gap-2">
            <TrendingUp className="h-4 w-4" aria-hidden="true" />
            画像演进
          </TabsTrigger>
          <TabsTrigger value="comparison" className="gap-2" disabled={profiles.length < 2}>
            <GitCompare className="h-4 w-4" aria-hidden="true" />
            版本对比
          </TabsTrigger>
          <TabsTrigger value="brief" className="gap-2" disabled={profiles.length === 0}>
            <FileText className="h-4 w-4" aria-hidden="true" />
            面试简报
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>基本信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {candidate.position && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">期望职位</div>
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" aria-hidden="true" />
                      <span>{candidate.position}</span>
                    </div>
                  </div>
                )}

                {candidate.experience !== null && candidate.experience !== undefined && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">工作经验</div>
                    <div className="font-medium">{candidate.experience} 年</div>
                  </div>
                )}

                {candidate.education && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">学历</div>
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" aria-hidden="true" />
                      <span>{candidate.education}</span>
                    </div>
                  </div>
                )}

                {candidate.salaryExpectation && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">期望薪资</div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" aria-hidden="true" />
                      <span>{candidate.salaryExpectation.toLocaleString()} 元/月</span>
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-sm text-muted-foreground mb-1">状态</div>
                  <Badge>{candidate.status}</Badge>
                </div>

                {candidate.source && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">来源</div>
                    <Badge variant="outline">{candidate.source}</Badge>
                  </div>
                )}

                {candidate.resumeUrl && (
                  <div>
                    <Button variant="outline" size="sm" asChild className="w-full">
                      <a href={candidate.resumeUrl} target="_blank" rel="noopener noreferrer">
                        <FileText className="h-4 w-4 mr-2" aria-hidden="true" />
                        查看简历
                      </a>
                    </Button>
                  </div>
                )}

                {candidate.createdAt && (
                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" aria-hidden="true" />
                      创建时间: {new Date(candidate.createdAt).toLocaleString("zh-CN")}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 面试记录卡片 */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>面试记录</span>
                  <Badge variant="outline">{interviews.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {interviews.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-3">暂无面试记录</p>
                    <Button
                      onClick={() => {
                        setSelectedInterview(null);
                        setShowInterviewDialog(true);
                      }}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      安排第一次面试
                    </Button>
                  </div>
                ) : interviewsError ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>加载面试记录失败</AlertDescription>
                  </Alert>
                ) : interviewsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span className="text-sm text-muted-foreground">加载中...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {interviews.slice(0, showAllInterviews ? undefined : 3).map((interview) => (
                      <div key={interview.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {ROUND_LABELS[interview.round] || `第${interview.round}轮`}面试
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(interview.scheduledDate).toLocaleString("zh-CN")}
                            </div>
                          </div>
                          <Badge
                            variant={INTERVIEW_STATUS_CONFIG[interview.status as keyof typeof INTERVIEW_STATUS_CONFIG]?.variant || "outline"}
                            className="text-xs"
                          >
                            {INTERVIEW_STATUS_CONFIG[interview.status as keyof typeof INTERVIEW_STATUS_CONFIG]?.label || interview.status}
                          </Badge>
                        </div>
                        {interview.interviewerNotes && (
                          <div className="text-xs text-muted-foreground">
                            备注：{interview.interviewerNotes}
                          </div>
                        )}
                        {interview.status === "scheduled" && (
                          <Button
                            onClick={() => {
                              setSelectedInterview(interview);
                              setShowInterviewDialog(true);
                            }}
                            variant="outline"
                            size="sm"
                            className="w-full text-xs"
                          >
                            编辑面试
                          </Button>
                        )}
                      </div>
                    ))}
                    {interviews.length > 3 && (
                      <Button
                        onClick={() => setShowAllInterviews(!showAllInterviews)}
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs"
                      >
                        {showAllInterviews ? "收起" : `查看全部 ${interviews.length} 条记录`}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="lg:col-span-3 lg:row-start-2">
              {candidate.aiSummary && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5" aria-hidden="true" />
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

              {isProfilesLoading ? (
                <Card>
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-[300px]" />
                  </CardContent>
                </Card>
              ) : profilesError ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    加载画像数据失败: {profilesError instanceof Error ? profilesError.message : "未知错误"}
                  </AlertDescription>
                </Alert>
              ) : profiles.length === 0 ? (
                <Alert>
                  <Sparkles className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p>暂无候选人画像数据。</p>
                      {!candidate.resumeText || !candidate.aiSummary ? (
                        <p className="text-sm text-muted-foreground">
                          请先上传并分析简历，然后生成初始画像。
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          点击右上角"生成初始画像"按钮开始构建候选人画像。
                        </p>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              ) : selectedProfile ? (
                <ProfileCardEnhanced profile={selectedProfile} />
              ) : null}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="profiles" className="space-y-6">
          {isProfilesLoading ? (
            <Card>
              <CardContent className="pt-6">
                <Skeleton className="h-[600px]" />
              </CardContent>
            </Card>
          ) : (
            <>
              <ProfileEvolutionTimeline
                profiles={profiles}
                selectedProfileId={selectedProfileId || undefined}
                onSelectProfile={handleProfileSelect}
                isLoading={isProfilesLoading}
                error={profilesError instanceof Error ? profilesError : null}
              />
              {profiles.length > 0 && (
                <OrganizationFitTrend
                  profiles={profiles}
                  currentProfileId={selectedProfileId || undefined}
                />
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="comparison" className="space-y-6">
          {profiles.length < 2 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                至少需要 2 个画像版本才能进行对比。当前只有 {profiles.length} 个版本。
              </AlertDescription>
            </Alert>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>选择对比版本</CardTitle>
                <CardDescription>选择两个不同的画像版本进行对比分析</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium mb-2 block">版本 A</label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={comparisonProfileIds[0] || ""}
                      onChange={(e) => setComparisonProfileIds([e.target.value || null, comparisonProfileIds[1]])}
                    >
                      <option value="">选择版本...</option>
                      {profiles.map((profile) => (
                        <option key={profile.id} value={profile.id} disabled={profile.id === comparisonProfileIds[1]}>
                          版本 {profile.version} ({profile.stage})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">版本 B</label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={comparisonProfileIds[1] || ""}
                      onChange={(e) => setComparisonProfileIds([comparisonProfileIds[0], e.target.value || null])}
                    >
                      <option value="">选择版本...</option>
                      {profiles.map((profile) => (
                        <option key={profile.id} value={profile.id} disabled={profile.id === comparisonProfileIds[0]}>
                          版本 {profile.version} ({profile.stage})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {comparisonProfiles.profileA && comparisonProfiles.profileB && (
                  <div className="pt-4">
                    <ProfileComparison
                      profileA={comparisonProfiles.profileA}
                      profileB={comparisonProfiles.profileB}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="brief" className="space-y-6">
          {profiles.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                需要先生成候选人画像才能创建面试官简报。
              </AlertDescription>
            </Alert>
          ) : selectedProfile ? (
            <InterviewerBrief
              candidate={candidate}
              profile={selectedProfile}
              jobTitle={candidate.position || undefined}
              interviewRound={1}
              interviewType="behavioral"
            />
          ) : null}
        </TabsContent>
      </Tabs>

      {/* 面试表单对话框 */}
      <InterviewFormDialog
        open={showInterviewDialog}
        onOpenChange={(open) => {
          setShowInterviewDialog(open);
          if (!open) {
            setSelectedInterview(null);
          }
        }}
        candidateId={candidateId}
        candidateName={candidate.name}
        existingInterview={selectedInterview || undefined}
        onSuccess={() => {
          refetchInterviews();
          toast({
            title: "操作成功",
            description: selectedInterview ? "面试信息已更新" : "面试已安排",
          });
        }}
      />

      {/* 招聘决策显示对话框 */}
      {showDecision && currentDecision && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>AI 招聘决策建议</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDecision(false)}
                >
                  ✕
                </Button>
              </CardTitle>
              <CardDescription>
                基于候选人综合评估生成的智能决策建议
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 决策结果 */}
              <div className="flex items-center justify-between p-4 bg-accent rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">决策建议</p>
                  <p className="text-2xl font-bold">
                    {currentDecision.decision === "hire" && "建议录用"}
                    {currentDecision.decision === "reject" && "不建议录用"}
                    {currentDecision.decision === "hold" && "暂缓决定"}
                    {currentDecision.decision === "next-round" && "建议下一轮"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">置信度</p>
                  <p className="text-2xl font-bold">{currentDecision.confidence}%</p>
                </div>
              </div>

              {/* 推荐理由 */}
              <div>
                <h3 className="font-semibold mb-2">推荐理由</h3>
                <p className="text-sm text-muted-foreground">
                  {currentDecision.recommendation}
                </p>
              </div>

              {/* 优势和劣势 */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h3 className="font-semibold mb-2 text-green-600">主要优势</h3>
                  <ul className="space-y-1">
                    {(currentDecision.strengths || []).slice(0, 3).map((strength: string, index: number) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <span className="text-green-600">✓</span>
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-orange-600">需要关注</h3>
                  <ul className="space-y-1">
                    {(currentDecision.weaknesses || []).slice(0, 3).map((weakness: string, index: number) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <span className="text-orange-600">!</span>
                        <span>{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 薪酬建议 */}
              {currentDecision.compensationRange && (
                <div>
                  <h3 className="font-semibold mb-2">薪酬建议</h3>
                  <div className="p-3 bg-accent rounded-lg">
                    <p className="text-sm">
                      建议薪资范围：{currentDecision.compensationRange.minRange?.toLocaleString()} -
                      {currentDecision.compensationRange.maxRange?.toLocaleString()} 元/月
                    </p>
                    <p className="text-sm font-semibold mt-1">
                      目标报价：{currentDecision.compensationRange.targetOffer?.toLocaleString()} 元/月
                    </p>
                  </div>
                </div>
              )}

              {/* 下一步建议 */}
              {currentDecision.nextSteps && currentDecision.nextSteps.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">建议的下一步行动</h3>
                  <ul className="space-y-1">
                    {currentDecision.nextSteps.map((step: string, index: number) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <span className="text-primary">{index + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 时间建议 */}
              {currentDecision.timelineSuggestion && (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    时间建议：{currentDecision.timelineSuggestion}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}