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
  AlertTriangle
} from "lucide-react";
import type { CandidateProfile } from "@shared/schema";
import { profileDataSchema, type ProfileData } from "@shared/schema";

interface ProfileCardProps {
  profile: CandidateProfile;
  showCompact?: boolean;
}

const PROFICIENCY_COLORS = {
  expert: "bg-purple-500/10 text-purple-700 border-purple-500/20",
  advanced: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  intermediate: "bg-green-500/10 text-green-700 border-green-500/20",
  beginner: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
} as const;

const STAGE_LABELS: Record<string, string> = {
  resume: "简历阶段",
  after_interview_1: "第 1 轮面试后",
  after_interview_2: "第 2 轮面试后",
  after_interview_3: "第 3 轮面试后",
} as const;

const getProficiencyColor = (proficiency: string): string => {
  return PROFICIENCY_COLORS[proficiency.toLowerCase() as keyof typeof PROFICIENCY_COLORS]
    ?? "bg-gray-500/10 text-gray-700 border-gray-500/20";
};

const getScoreColor = (score: number): string => {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-blue-600";
  if (score >= 40) return "text-yellow-600";
  return "text-red-600";
};

const getStageLabel = (stage: string): string => {
  if (STAGE_LABELS[stage]) return STAGE_LABELS[stage];
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

const ProfileCardCompact = memo<{ profile: CandidateProfile; overallScore: number; profileData: ProfileData | null }>(
  ({ profile, overallScore, profileData }) => {
    const strengths = (profile.strengths as string[]) || [];

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">
                画像版本 {profile.version}
              </CardTitle>
              <CardDescription className="mt-1">
                {getStageLabel(profile.stage)} · {formatDate(profile.createdAt)}
              </CardDescription>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${getScoreColor(overallScore)}`} aria-label={`综合评分 ${overallScore} 分`}>
                {overallScore}
              </div>
              <div className="text-xs text-muted-foreground">综合评分</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-3">
            {profile.aiSummary || "暂无 AI 总结"}
          </p>
          {strengths.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2" role="list" aria-label="候选人优势">
              {strengths.slice(0, 3).map((strength) => (
                <Badge
                  key={strength}
                  variant="outline"
                  className="bg-green-500/10 text-green-700 border-green-500/20"
                  role="listitem"
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" aria-hidden="true" />
                  {strength}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);

ProfileCardCompact.displayName = "ProfileCardCompact";

export const ProfileCard = memo<ProfileCardProps>(({ profile, showCompact = false }) => {
  const profileData = useMemo<ProfileData | null>(() => {
    const parseResult = profileDataSchema.safeParse(profile.profileData);
    if (!parseResult.success) {
      console.error("Invalid profile data:", parseResult.error);
      return null;
    }
    return parseResult.data;
  }, [profile.profileData]);

  const strengths = useMemo(() => (profile.strengths as string[]) || [], [profile.strengths]);
  const concerns = useMemo(() => (profile.concerns as string[]) || [], [profile.concerns]);
  const gaps = useMemo(() => (profile.gaps as string[]) || [], [profile.gaps]);
  const dataSources = useMemo(() => (profile.dataSources as string[]) || [], [profile.dataSources]);

  const overallScore = useMemo(() => {
    const score = parseFloat(profile.overallScore ?? "0");
    return isNaN(score) ? 0 : Math.max(0, Math.min(100, score));
  }, [profile.overallScore]);

  if (showCompact) {
    return <ProfileCardCompact profile={profile} overallScore={overallScore} profileData={profileData} />;
  }

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
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" aria-hidden="true" />
                候选人画像 - 版本 {profile.version}
              </CardTitle>
              <CardDescription className="mt-2">
                {getStageLabel(profile.stage)} · {formatDate(profile.createdAt)}
              </CardDescription>
            </div>
            <div className="text-right">
              <div
                className={`text-3xl font-bold ${getScoreColor(overallScore)}`}
                aria-label={`综合匹配度 ${overallScore} 分`}
              >
                {overallScore}
              </div>
              <div className="text-sm text-muted-foreground">综合匹配度</div>
              <Progress
                value={overallScore}
                className="w-32 mt-2"
                aria-label="综合匹配度进度条"
                aria-valuenow={overallScore}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dataSources.length > 0 && (
              <div className="flex flex-wrap gap-2" role="list" aria-label="数据来源">
                {dataSources.map((source) => (
                  <Badge
                    key={source}
                    variant="outline"
                    className="bg-blue-500/10 text-blue-700"
                    role="listitem"
                  >
                    <FileText className="w-3 h-3 mr-1" aria-hidden="true" />
                    {source}
                  </Badge>
                ))}
              </div>
            )}

            <Separator />

            <section aria-labelledby="ai-summary-heading">
              <div className="flex items-start gap-2">
                <Brain className="w-5 h-5 text-muted-foreground mt-1 flex-shrink-0" aria-hidden="true" />
                <div>
                  <h3 id="ai-summary-heading" className="font-semibold text-sm text-foreground mb-2">
                    AI 画像总结
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {profile.aiSummary || "暂无 AI 总结"}
                  </p>
                </div>
              </div>
            </section>

            <Separator />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {strengths.length > 0 && (
                <section aria-labelledby="strengths-heading">
                  <h4 id="strengths-heading" className="font-semibold text-sm mb-3 flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    优势亮点
                  </h4>
                  <div className="space-y-2" role="list">
                    {strengths.map((strength) => (
                      <Badge
                        key={strength}
                        variant="outline"
                        className="bg-green-500/10 text-green-700 border-green-500/20 w-full justify-start"
                        role="listitem"
                      >
                        {strength}
                      </Badge>
                    ))}
                  </div>
                </section>
              )}

              {concerns.length > 0 && (
                <section aria-labelledby="concerns-heading">
                  <h4 id="concerns-heading" className="font-semibold text-sm mb-3 flex items-center gap-2 text-orange-700">
                    <AlertCircle className="w-4 h-4" aria-hidden="true" />
                    潜在顾虑
                  </h4>
                  <div className="space-y-2" role="list">
                    {concerns.map((concern) => (
                      <Badge
                        key={concern}
                        variant="outline"
                        className="bg-orange-500/10 text-orange-700 border-orange-500/20 w-full justify-start"
                        role="listitem"
                      >
                        {concern}
                      </Badge>
                    ))}
                  </div>
                </section>
              )}

              {gaps.length > 0 && (
                <section aria-labelledby="gaps-heading">
                  <h4 id="gaps-heading" className="font-semibold text-sm mb-3 flex items-center gap-2 text-blue-700">
                    <Target className="w-4 h-4" aria-hidden="true" />
                    信息缺口
                  </h4>
                  <div className="space-y-2" role="list">
                    {gaps.map((gap) => (
                      <Badge
                        key={gap}
                        variant="outline"
                        className="bg-blue-500/10 text-blue-700 border-blue-500/20 w-full justify-start"
                        role="listitem"
                      >
                        {gap}
                      </Badge>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="technical" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <TabsTrigger value="technical">
            <Code className="w-4 h-4 sm:mr-2" aria-hidden="true" />
            <span className="hidden sm:inline">技术技能</span>
          </TabsTrigger>
          <TabsTrigger value="soft">
            <Users className="w-4 h-4 sm:mr-2" aria-hidden="true" />
            <span className="hidden sm:inline">软技能</span>
          </TabsTrigger>
          <TabsTrigger value="experience">
            <Briefcase className="w-4 h-4 sm:mr-2" aria-hidden="true" />
            <span className="hidden sm:inline">工作经验</span>
          </TabsTrigger>
          <TabsTrigger value="education">
            <GraduationCap className="w-4 h-4 sm:mr-2" aria-hidden="true" />
            <span className="hidden sm:inline">教育背景</span>
          </TabsTrigger>
          <TabsTrigger value="culture" className="col-span-2 sm:col-span-1">
            <Heart className="w-4 h-4 sm:mr-2" aria-hidden="true" />
            <span className="hidden sm:inline">文化适配</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="technical" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">技术技能矩阵</CardTitle>
              <CardDescription>基于简历和面试评估的技术能力</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {profileData.technicalSkills && profileData.technicalSkills.length > 0 ? (
                  profileData.technicalSkills.map((skill) => (
                    <div key={skill.skill} className="space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{skill.skill}</span>
                          <Badge
                            className={getProficiencyColor(skill.proficiency)}
                            aria-label={`${skill.proficiency} 级别`}
                          >
                            {skill.proficiency}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        证据来源: {skill.evidenceSource}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">暂无技术技能数据</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="soft" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">软技能评估</CardTitle>
              <CardDescription>团队协作、沟通能力等软技能表现</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {profileData.softSkills && profileData.softSkills.length > 0 ? (
                  profileData.softSkills.map((skill) => (
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
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">暂无软技能数据</p>
                )}
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
                {profileData.experience?.positions && profileData.experience.positions.length > 0 ? (
                  profileData.experience.positions.map((position) => (
                    <div key={`${position.title}-${position.duration}`} className="space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <h4 className="font-medium">{position.title}</h4>
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" aria-hidden="true" />
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
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">暂无工作经验详情</p>
                )}
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
                    <GraduationCap className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
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
                        <TrendingUp className="w-4 h-4" aria-hidden="true" />
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
                        <Progress
                          value={profileData.careerTrajectory.stabilityScore}
                          className="h-2"
                          aria-label="职业稳定性指标"
                          aria-valuenow={profileData.careerTrajectory.stabilityScore}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          职业稳定性指标: {profileData.careerTrajectory.stabilityScore}/100
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {!profileData.culturalFit && !profileData.careerTrajectory && (
                  <p className="text-sm text-muted-foreground">暂无文化适配性数据</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
});

ProfileCard.displayName = "ProfileCard";