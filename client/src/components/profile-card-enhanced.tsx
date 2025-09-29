import { useMemo, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Brain,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Target,
  Code,
  Users,
  GraduationCap,
  Briefcase,
  Heart,
  Calendar,
  FileText,
  AlertTriangle,
  Shield,
  Crown,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Minus
} from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  LineChart,
  Area,
  AreaChart
} from "recharts";
import type { CandidateProfile } from "@shared/schema";
import { profileDataSchema, type ProfileData } from "@shared/schema";
import { ChartErrorBoundary } from "@/components/error-boundary";

interface ProfileCardEnhancedProps {
  profile: CandidateProfile;
  showCompact?: boolean;
  previousProfile?: CandidateProfile; // 用于对比演化
}

interface OrganizationalFit {
  cultureAssessment?: {
    overallScore: number;
    valueAssessments: Array<{
      valueName: string;
      score: number;
      evidence: string[];
      concerns?: string[];
    }>;
    trajectory?: "improving" | "stable" | "declining";
    confidence: "low" | "medium" | "high";
  };
  leadershipAssessment?: {
    overallScore: number;
    currentLevel: string;
    dimensionScores: Array<{
      dimension: string;
      score: number;
      evidence: string[];
    }>;
    trajectory?: "high_potential" | "steady_growth" | "developing" | "at_risk";
    readinessForNextLevel?: number;
  };
}

const PROFICIENCY_COLORS = {
  expert: "bg-purple-500/10 text-purple-700 border-purple-500/20",
  advanced: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  intermediate: "bg-green-500/10 text-green-700 border-green-500/20",
  beginner: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
} as const;

const CONFIDENCE_COLORS = {
  high: "text-green-600",
  medium: "text-blue-600",
  low: "text-yellow-600"
} as const;

const TRAJECTORY_ICONS = {
  improving: <ArrowUp className="w-4 h-4 text-green-600" />,
  stable: <Minus className="w-4 h-4 text-blue-600" />,
  declining: <ArrowDown className="w-4 h-4 text-red-600" />,
  high_potential: <Sparkles className="w-4 h-4 text-purple-600" />,
  steady_growth: <TrendingUp className="w-4 h-4 text-blue-600" />,
  developing: <Users className="w-4 h-4 text-green-600" />,
  at_risk: <AlertTriangle className="w-4 h-4 text-orange-600" />
} as const;

const getScoreColor = (score: number): string => {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-blue-600";
  if (score >= 40) return "text-yellow-600";
  return "text-red-600";
};

const getStageLabel = (stage: string): string => {
  const stageMap: Record<string, string> = {
    resume: "简历阶段",
    interview_1: "初试后",
    interview_2: "复试后",
    final_evaluation: "终面后",
  };

  if (stageMap[stage]) return stageMap[stage];
  if (stage.startsWith("after_interview_")) {
    const round = stage.split("_")[2];
    return `第 ${round} 轮面试后`;
  }
  return stage;
};

const formatDate = (date?: string | Date): string => {
  if (!date) return "";
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return "日期无效";

  try {
    return parsed.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return parsed.toISOString().split('T')[0];
  }
};

// 文化契合度雷达图组件
const CultureRadarChart = memo<{ assessment: OrganizationalFit['cultureAssessment'] }>(
  ({ assessment }) => {
    if (!assessment) return null;

    const data = assessment.valueAssessments.map(va => ({
      value: va.valueName,
      score: va.score,
      fullMark: 100
    }));

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">文化价值观契合度</h4>
          <div className="flex items-center gap-2">
            <Badge className={CONFIDENCE_COLORS[assessment.confidence]}>
              置信度: {assessment.confidence}
            </Badge>
            {assessment.trajectory && TRAJECTORY_ICONS[assessment.trajectory]}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={data}>
            <PolarGrid stroke="#e5e5e5" />
            <PolarAngleAxis dataKey="value" tick={{ fontSize: 12 }} />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fontSize: 10 }}
              tickCount={6}
            />
            <Radar
              name="契合度"
              dataKey="score"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.6}
            />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">整体契合度</span>
            <span className={`font-bold ${getScoreColor(assessment.overallScore)}`}>
              {assessment.overallScore}分
            </span>
          </div>
          <Progress value={assessment.overallScore} className="h-2" />
        </div>

        {/* 详细评估 */}
        <div className="space-y-3 pt-2">
          {assessment.valueAssessments.map((va) => (
            <div key={va.valueName} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{va.valueName}</span>
                <span className={`text-sm ${getScoreColor(va.score)}`}>
                  {va.score}分
                </span>
              </div>
              {va.evidence.length > 0 && (
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  {va.evidence.slice(0, 2).map((e, i) => (
                    <li key={i} className="pl-4">• {e}</li>
                  ))}
                </ul>
              )}
              {va.concerns && va.concerns.length > 0 && (
                <div className="text-xs text-orange-600 pl-4">
                  ⚠ {va.concerns[0]}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }
);

CultureRadarChart.displayName = "CultureRadarChart";

// 领导力维度条形图组件
const LeadershipBarChart = memo<{ assessment: OrganizationalFit['leadershipAssessment'] }>(
  ({ assessment }) => {
    if (!assessment) return null;

    const data = assessment.dimensionScores.map(ds => ({
      dimension: ds.dimension,
      score: ds.score,
      evidence: ds.evidence
    }));

    const levelMap: Record<string, string> = {
      individual_contributor: "个人贡献者",
      emerging_leader: "新兴领导者",
      developing_leader: "发展中领导者",
      mature_leader: "成熟领导者"
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">领导力框架评估</h4>
          {assessment.trajectory && (
            <div className="flex items-center gap-2">
              {TRAJECTORY_ICONS[assessment.trajectory]}
              <span className="text-sm text-muted-foreground">
                {assessment.trajectory.replace(/_/g, ' ')}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div>
            <div className="text-sm text-muted-foreground">当前层级</div>
            <div className="font-medium flex items-center gap-2">
              <Crown className="w-4 h-4 text-primary" />
              {levelMap[assessment.currentLevel] || assessment.currentLevel}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">总体得分</div>
            <div className={`text-2xl font-bold ${getScoreColor(assessment.overallScore)}`}>
              {assessment.overallScore}
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              dataKey="dimension"
              type="category"
              tick={{ fontSize: 12 }}
              width={80}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload[0]) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-background border rounded-lg p-3 shadow-lg">
                      <div className="font-medium">{data.dimension}</div>
                      <div className="text-sm text-primary">{data.score}分</div>
                      {data.evidence && data.evidence.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {data.evidence[0]}
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="score"
              fill="#8b5cf6"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>

        {assessment.readinessForNextLevel && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">晋升准备度</span>
              <span className={`font-bold ${getScoreColor(assessment.readinessForNextLevel)}`}>
                {assessment.readinessForNextLevel}%
              </span>
            </div>
            <Progress value={assessment.readinessForNextLevel} className="h-2" />
          </div>
        )}

        {/* 维度详情 */}
        <div className="space-y-2 pt-2">
          {assessment.dimensionScores.map((ds) => (
            <details key={ds.dimension} className="group">
              <summary className="cursor-pointer text-sm font-medium flex items-center justify-between">
                <span>{ds.dimension}</span>
                <span className={`${getScoreColor(ds.score)}`}>{ds.score}分</span>
              </summary>
              {ds.evidence.length > 0 && (
                <ul className="mt-2 text-xs text-muted-foreground space-y-1 pl-4">
                  {ds.evidence.map((e, i) => (
                    <li key={i}>• {e}</li>
                  ))}
                </ul>
              )}
            </details>
          ))}
        </div>
      </div>
    );
  }
);

LeadershipBarChart.displayName = "LeadershipBarChart";

// 组织契合度演化趋势图
const OrganizationFitTrend = memo<{
  profiles: CandidateProfile[],
  currentProfileId: string
}>(({ profiles, currentProfileId }) => {
  const trendData = useMemo(() => {
    return profiles.map(p => {
      const profileData = profileDataSchema.safeParse(p.profileData);
      if (!profileData.success) return null;

      const orgFit = (profileData.data as any).organizationalFit as OrganizationalFit | undefined;

      return {
        stage: getStageLabel(p.stage),
        version: p.version,
        culture: orgFit?.cultureAssessment?.overallScore || 0,
        leadership: orgFit?.leadershipAssessment?.overallScore || 0,
        overall: parseFloat(p.overallScore || "0"),
        isCurrent: p.id === currentProfileId
      };
    }).filter(Boolean);
  }, [profiles, currentProfileId]);

  if (trendData.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          组织契合度演化趋势
        </CardTitle>
        <CardDescription>
          跟踪文化价值观和领导力评估的变化
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis
              dataKey="stage"
              tick={{ fontSize: 12 }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload[0]) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-background border rounded-lg p-3 shadow-lg">
                      <div className="font-medium mb-2">
                        {data.stage} (v{data.version})
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between gap-4">
                          <span>文化契合:</span>
                          <span className="font-medium">{data.culture}分</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span>领导力:</span>
                          <span className="font-medium">{data.leadership}分</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span>综合评分:</span>
                          <span className="font-medium">{data.overall}分</span>
                        </div>
                      </div>
                      {data.isCurrent && (
                        <div className="text-xs text-primary mt-2">当前版本</div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="culture"
              stackId="1"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.6}
              name="文化契合度"
            />
            <Area
              type="monotone"
              dataKey="leadership"
              stackId="1"
              stroke="#8b5cf6"
              fill="#8b5cf6"
              fillOpacity={0.6}
              name="领导力评分"
            />
            <Line
              type="monotone"
              dataKey="overall"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: '#10b981', r: 4 }}
              name="综合评分"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});

OrganizationFitTrend.displayName = "OrganizationFitTrend";

// 主组件
export const ProfileCardEnhanced = memo<ProfileCardEnhancedProps>(({
  profile,
  showCompact = false,
  previousProfile
}) => {
  const profileData = useMemo<ProfileData | null>(() => {
    const parseResult = profileDataSchema.safeParse(profile.profileData);
    if (!parseResult.success) {
      console.error("Invalid profile data:", parseResult.error);
      return null;
    }
    return parseResult.data;
  }, [profile.profileData]);

  // 提取组织契合度数据
  const organizationalFit = useMemo<OrganizationalFit | null>(() => {
    if (!profileData) return null;
    return (profileData as any).organizationalFit || null;
  }, [profileData]);

  const strengths = useMemo(() => (profile.strengths as string[]) || [], [profile.strengths]);
  const concerns = useMemo(() => (profile.concerns as string[]) || [], [profile.concerns]);
  const gaps = useMemo(() => (profile.gaps as string[]) || [], [profile.gaps]);
  const dataSources = useMemo(() => (profile.dataSources as string[]) || [], [profile.dataSources]);

  const overallScore = useMemo(() => {
    const score = parseFloat(profile.overallScore ?? "0");
    return isNaN(score) ? 0 : Math.max(0, Math.min(100, score));
  }, [profile.overallScore]);

  if (!profileData) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          画像数据格式错误，无法正常显示。请联系技术支持。
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* 基础信息卡片 */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                候选人画像 - 版本 {profile.version}
              </CardTitle>
              <CardDescription className="mt-2">
                {getStageLabel(profile.stage)} · {formatDate(profile.createdAt)}
              </CardDescription>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-bold ${getScoreColor(overallScore)}`}>
                {overallScore}
              </div>
              <div className="text-sm text-muted-foreground">综合匹配度</div>
              <Progress value={overallScore} className="w-32 mt-2" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dataSources.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {dataSources.map((source) => (
                  <Badge key={source} variant="outline" className="bg-blue-500/10 text-blue-700">
                    <FileText className="w-3 h-3 mr-1" />
                    {source}
                  </Badge>
                ))}
              </div>
            )}

            <Separator />

            <section>
              <div className="flex items-start gap-2">
                <Brain className="w-5 h-5 text-muted-foreground mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-sm text-foreground mb-2">
                    AI 画像总结
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {profile.aiSummary || "暂无 AI 总结"}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </CardContent>
      </Card>

      {/* 增强的标签页 - 包含组织契合度可视化 */}
      <Tabs defaultValue="organizational" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <TabsTrigger value="organizational" className="gap-1">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">组织契合</span>
          </TabsTrigger>
          <TabsTrigger value="technical">
            <Code className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">技术技能</span>
          </TabsTrigger>
          <TabsTrigger value="soft">
            <Users className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">软技能</span>
          </TabsTrigger>
          <TabsTrigger value="experience">
            <Briefcase className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">工作经验</span>
          </TabsTrigger>
          <TabsTrigger value="education">
            <GraduationCap className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">教育背景</span>
          </TabsTrigger>
          <TabsTrigger value="culture">
            <Heart className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">文化适配</span>
          </TabsTrigger>
        </TabsList>

        {/* 组织契合度标签页 - 新增 */}
        <TabsContent value="organizational" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* 文化契合度雷达图 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">文化价值观评估</CardTitle>
                <CardDescription>
                  候选人与公司文化价值观的契合程度
                </CardDescription>
              </CardHeader>
              <CardContent>
                {organizationalFit?.cultureAssessment ? (
                  <ChartErrorBoundary chartName="文化契合度雷达图">
                    <CultureRadarChart assessment={organizationalFit.cultureAssessment} />
                  </ChartErrorBoundary>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      暂无文化契合度评估数据。将在面试过程中逐步完善。
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* 领导力维度条形图 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">领导力框架评估</CardTitle>
                <CardDescription>
                  候选人的领导力潜力和当前水平
                </CardDescription>
              </CardHeader>
              <CardContent>
                {organizationalFit?.leadershipAssessment ? (
                  <ChartErrorBoundary chartName="领导力维度图">
                    <LeadershipBarChart assessment={organizationalFit.leadershipAssessment} />
                  </ChartErrorBoundary>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      暂无领导力评估数据。将随面试深入逐步评估。
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 关键洞察和建议 */}
          <div className="grid gap-6 lg:grid-cols-3 mt-6">
            {strengths.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    优势亮点
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {strengths.map((strength) => (
                      <Badge
                        key={strength}
                        variant="outline"
                        className="bg-green-500/10 text-green-700 border-green-500/20 w-full justify-start"
                      >
                        {strength}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {concerns.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                    潜在顾虑
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {concerns.map((concern) => (
                      <Badge
                        key={concern}
                        variant="outline"
                        className="bg-orange-500/10 text-orange-700 border-orange-500/20 w-full justify-start"
                      >
                        {concern}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {gaps.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-600" />
                    信息缺口
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {gaps.map((gap) => (
                      <Badge
                        key={gap}
                        variant="outline"
                        className="bg-blue-500/10 text-blue-700 border-blue-500/20 w-full justify-start"
                      >
                        {gap}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* 其他标签页内容保持不变... */}
        <TabsContent value="technical" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">技术技能矩阵</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {profileData.technicalSkills?.map((skill) => (
                  <div key={skill.skill} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{skill.skill}</span>
                      <Badge className={PROFICIENCY_COLORS[skill.proficiency as keyof typeof PROFICIENCY_COLORS]}>
                        {skill.proficiency}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      证据来源: {skill.evidenceSource}
                    </p>
                  </div>
                )) || <p className="text-sm text-muted-foreground">暂无技术技能数据</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="soft" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">软技能评估</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {profileData.softSkills?.map((skill) => (
                  <div key={skill.skill} className="space-y-2">
                    <h4 className="font-medium">{skill.skill}</h4>
                    {skill.examples.length > 0 && (
                      <ul className="list-disc list-inside space-y-1">
                        {skill.examples.map((example) => (
                          <li key={example} className="text-sm text-muted-foreground">
                            {example}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )) || <p className="text-sm text-muted-foreground">暂无软技能数据</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="experience" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">工作经验</CardTitle>
              <CardDescription>
                {profileData.experience ? (
                  <>
                    总工作年限: {profileData.experience.totalYears} 年 |
                    相关经验: {profileData.experience.relevantYears} 年
                  </>
                ) : (
                  "暂无工作经验数据"
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {profileData.experience?.positions?.map((position) => (
                  <div key={`${position.title}-${position.duration}`} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{position.title}</h4>
                      <span className="text-sm text-muted-foreground">
                        {position.duration}
                      </span>
                    </div>
                    {position.keyAchievements.length > 0 && (
                      <ul className="list-disc list-inside space-y-1">
                        {position.keyAchievements.map((achievement) => (
                          <li key={achievement} className="text-sm text-muted-foreground">
                            {achievement}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )) || <p className="text-sm text-muted-foreground">暂无工作经验详情</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="education" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">教育背景</CardTitle>
            </CardHeader>
            <CardContent>
              {profileData.education ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-muted-foreground" />
                    <span className="font-medium">{profileData.education.level}</span>
                  </div>
                  <p className="text-sm">
                    专业: <span className="text-muted-foreground">{profileData.education.field}</span>
                  </p>
                  {profileData.education.institution && (
                    <p className="text-sm">
                      学校: <span className="text-muted-foreground">{profileData.education.institution}</span>
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">暂无教育背景数据</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="culture" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">文化适配性评估</CardTitle>
              {profileData.careerTrajectory && (
                <CardDescription>
                  职业稳定性评分: {profileData.careerTrajectory.stabilityScore}/100
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {profileData.culturalFit && (
                  <>
                    <div>
                      <h4 className="font-medium mb-2">工作风格</h4>
                      <p className="text-sm text-muted-foreground">
                        {profileData.culturalFit.workStyle}
                      </p>
                    </div>

                    {profileData.culturalFit.motivations.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">工作动机</h4>
                        <div className="flex flex-wrap gap-2">
                          {profileData.culturalFit.motivations.map((motivation) => (
                            <Badge key={motivation} variant="outline">
                              {motivation}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {profileData.culturalFit.preferences.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">工作偏好</h4>
                        <div className="flex flex-wrap gap-2">
                          {profileData.culturalFit.preferences.map((pref) => (
                            <Badge key={pref} variant="outline">
                              {pref}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {profileData.careerTrajectory && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        职业发展轨迹
                      </h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        {profileData.careerTrajectory.progression}
                      </p>
                      {profileData.careerTrajectory.growthAreas.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium mb-2">成长领域</h5>
                          <div className="flex flex-wrap gap-2">
                            {profileData.careerTrajectory.growthAreas.map((area) => (
                              <Badge key={area} variant="outline" className="bg-purple-500/10 text-purple-700">
                                {area}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="mt-4">
                        <Progress value={profileData.careerTrajectory.stabilityScore} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">
                          职业稳定性指标: {profileData.careerTrajectory.stabilityScore}/100
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
});

ProfileCardEnhanced.displayName = "ProfileCardEnhanced";