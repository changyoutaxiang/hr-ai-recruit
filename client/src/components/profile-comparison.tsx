import React, { memo, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Code,
  Users,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Plus,
  MinusCircle,
  Target
} from "lucide-react";
import { profileDataSchema, type ProfileData, type CandidateProfile } from "@shared/schema";

interface ProfileComparisonProps {
  profileA: CandidateProfile | null;
  profileB: CandidateProfile | null;
  className?: string;
}

interface ScoreComparison {
  scoreA: number;
  scoreB: number;
  delta: number;
  percentage: string;
  trend: "up" | "down" | "stable";
}

interface SkillComparison {
  skill: string;
  statusA: "present" | "absent";
  statusB: "present" | "absent";
  proficiencyA?: string;
  proficiencyB?: string;
  change: "added" | "removed" | "improved" | "degraded" | "unchanged";
}

const SCORE_STABILITY_THRESHOLD = 0.5;
const MIN_SCORE = 0;
const MAX_SCORE = 100;

const PROFICIENCY_ORDER = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
  expert: 4,
} as const;

const CHANGE_PRIORITY: Record<SkillComparison["change"], number> = {
  added: 0,
  improved: 1,
  degraded: 2,
  removed: 3,
  unchanged: 4,
} as const;

const parseProfileData = (profile: CandidateProfile): ProfileData | null => {
  const parseResult = profileDataSchema.safeParse(profile.profileData);
  if (!parseResult.success) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Invalid profile data', {
        profileId: profile.id,
        errors: parseResult.error.issues,
      });
    }
    return null;
  }
  return parseResult.data;
};

const parseScore = (score: string | number | null | undefined, profileId: string): number => {
  if (score === null || score === undefined) return 0;

  const numericScore = typeof score === 'string' ? parseFloat(score) : score;

  if (isNaN(numericScore)) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Invalid score for profile ${profileId}:`, score);
    }
    return 0;
  }

  return Math.max(MIN_SCORE, Math.min(MAX_SCORE, numericScore));
};

const calculateScoreComparison = (
  scoreA: number,
  scoreB: number
): ScoreComparison => {
  const delta = scoreB - scoreA;
  const percentage = scoreA > 0
    ? ((Math.abs(delta) / scoreA) * 100).toFixed(1)
    : "0.0";

  let trend: "up" | "down" | "stable" = "stable";
  if (Math.abs(delta) >= SCORE_STABILITY_THRESHOLD) {
    trend = delta > 0 ? "up" : "down";
  }

  return {
    scoreA,
    scoreB,
    delta,
    percentage: `${percentage}%`,
    trend,
  };
};

const getProficiencyLevel = (proficiency?: string): number => {
  if (!proficiency) return 0;
  return PROFICIENCY_ORDER[proficiency as keyof typeof PROFICIENCY_ORDER] ?? 0;
};

const compareTechnicalSkills = (
  dataA: ProfileData | null,
  dataB: ProfileData | null
): SkillComparison[] => {
  const skillsA = dataA?.technicalSkills || [];
  const skillsB = dataB?.technicalSkills || [];

  const skillMap = new Map<string, SkillComparison>();

  skillsA.forEach((skillObj) => {
    skillMap.set(skillObj.skill, {
      skill: skillObj.skill,
      statusA: "present",
      statusB: "absent",
      proficiencyA: skillObj.proficiency,
      change: "removed",
    });
  });

  skillsB.forEach((skillObj) => {
    const existing = skillMap.get(skillObj.skill);
    if (existing) {
      const profA = getProficiencyLevel(existing.proficiencyA);
      const profB = getProficiencyLevel(skillObj.proficiency);

      let change: SkillComparison["change"] = "unchanged";
      if (profB > profA) {
        change = "improved";
      } else if (profB < profA) {
        change = "degraded";
      }

      skillMap.set(skillObj.skill, {
        ...existing,
        statusB: "present",
        proficiencyB: skillObj.proficiency,
        change,
      });
    } else {
      skillMap.set(skillObj.skill, {
        skill: skillObj.skill,
        statusA: "absent",
        statusB: "present",
        proficiencyB: skillObj.proficiency,
        change: "added",
      });
    }
  });

  return Array.from(skillMap.values()).sort((a, b) => {
    return CHANGE_PRIORITY[a.change] - CHANGE_PRIORITY[b.change];
  });
};

const isStringArray = (value: unknown): value is string[] => {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
};

const compareArrayFields = (
  arrayA: unknown,
  arrayB: unknown
): { added: string[]; removed: string[]; unchanged: string[] } => {
  const arrA = isStringArray(arrayA) ? arrayA : [];
  const arrB = isStringArray(arrayB) ? arrayB : [];

  const setA = new Set(arrA);
  const setB = new Set(arrB);

  const added = arrB.filter(item => !setA.has(item));
  const removed = arrA.filter(item => !setB.has(item));
  const unchanged = arrA.filter(item => setB.has(item));

  return { added, removed, unchanged };
};

const ScoreComparisonCard = memo<{ comparison: ScoreComparison; labelA: string; labelB: string }>(
  ({ comparison, labelA, labelB }) => {
    const TrendIcon = comparison.trend === "up"
      ? TrendingUp
      : comparison.trend === "down"
      ? TrendingDown
      : Minus;

    const trendColor = comparison.trend === "up"
      ? "text-green-600"
      : comparison.trend === "down"
      ? "text-red-600"
      : "text-gray-500";

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">综合匹配分数</CardTitle>
          <CardDescription>两个版本画像的总体评分对比</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex-1 text-center">
              <div className="text-xs text-muted-foreground mb-1">{labelA}</div>
              <div className="text-3xl font-bold">{comparison.scoreA.toFixed(1)}</div>
            </div>

            <div className={`flex flex-col items-center ${trendColor}`}>
              <TrendIcon className="h-6 w-6" aria-hidden="true" />
              <span className="text-sm font-medium">
                {comparison.delta > 0 ? "+" : ""}
                {comparison.delta.toFixed(1)}
              </span>
              <span className="text-xs">({comparison.percentage})</span>
            </div>

            <div className="flex-1 text-center">
              <div className="text-xs text-muted-foreground mb-1">{labelB}</div>
              <div className="text-3xl font-bold">{comparison.scoreB.toFixed(1)}</div>
            </div>
          </div>

          {comparison.trend === "up" && (
            <Alert className="bg-green-50 border-green-200">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                画像评分提升 {Math.abs(comparison.delta).toFixed(1)} 分，候选人匹配度有所改善
              </AlertDescription>
            </Alert>
          )}

          {comparison.trend === "down" && (
            <Alert className="bg-amber-50 border-amber-200">
              <TrendingDown className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                画像评分下降 {Math.abs(comparison.delta).toFixed(1)} 分，可能需要进一步评估
              </AlertDescription>
            </Alert>
          )}

          {comparison.trend === "stable" && (
            <Alert>
              <Minus className="h-4 w-4" />
              <AlertDescription>
                画像评分基本保持稳定，变化不明显
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }
);

ScoreComparisonCard.displayName = "ScoreComparisonCard";

const TechnicalSkillsComparison = memo<{
  dataA: ProfileData | null;
  dataB: ProfileData | null;
}>(({ dataA, dataB }) => {
  const skillComparisons = useMemo(
    () => compareTechnicalSkills(dataA, dataB),
    [dataA, dataB]
  );

  if (skillComparisons.length === 0) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>两个版本均无技术技能数据</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      {skillComparisons.map((comparison, index) => (
        <Card key={`skill-${comparison.skill}-${index}`} className="overflow-hidden">
          <CardContent className="pt-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium truncate">{comparison.skill}</span>
                  {comparison.change === "added" && (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-200">
                      <Plus className="h-3 w-3 mr-1" aria-hidden="true" />
                      新增
                    </Badge>
                  )}
                  {comparison.change === "removed" && (
                    <Badge className="bg-red-100 text-red-700 hover:bg-red-200">
                      <MinusCircle className="h-3 w-3 mr-1" aria-hidden="true" />
                      移除
                    </Badge>
                  )}
                  {comparison.change === "improved" && (
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">
                      <TrendingUp className="h-3 w-3 mr-1" aria-hidden="true" />
                      提升
                    </Badge>
                  )}
                  {comparison.change === "degraded" && (
                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200">
                      <TrendingDown className="h-3 w-3 mr-1" aria-hidden="true" />
                      下降
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm">
                  {comparison.statusA === "present" && comparison.proficiencyA && (
                    <Badge variant="outline" className="capitalize">
                      {comparison.proficiencyA}
                    </Badge>
                  )}
                  {comparison.statusA === "present" && comparison.statusB === "present" && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  )}
                  {comparison.statusB === "present" && comparison.proficiencyB && (
                    <Badge
                      variant="outline"
                      className={`capitalize ${
                        comparison.change === "improved"
                          ? "border-blue-500 text-blue-700"
                          : comparison.change === "degraded"
                          ? "border-amber-500 text-amber-700"
                          : ""
                      }`}
                    >
                      {comparison.proficiencyB}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
});

TechnicalSkillsComparison.displayName = "TechnicalSkillsComparison";

const ArrayFieldComparison = memo<{
  label: string;
  icon: React.ElementType;
  arrayA: unknown;
  arrayB: unknown;
  emptyMessage?: string;
}>(({ label, icon: Icon, arrayA, arrayB, emptyMessage = "无数据" }) => {
  const comparison = useMemo(
    () => compareArrayFields(arrayA, arrayB),
    [arrayA, arrayB]
  );

  const hasData = comparison.added.length > 0 ||
                  comparison.removed.length > 0 ||
                  comparison.unchanged.length > 0;

  if (!hasData) {
    return (
      <Alert>
        <Icon className="h-4 w-4" />
        <AlertDescription>{emptyMessage}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {comparison.added.length > 0 && (
        <div>
          <h4 className="text-sm font-medium flex items-center gap-2 mb-2 text-green-700">
            <Plus className="h-4 w-4" aria-hidden="true" />
            新增项 ({comparison.added.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {comparison.added.map((item, index) => (
              <Badge
                key={`added-${index}-${item}`}
                className="bg-green-100 text-green-700 hover:bg-green-200"
              >
                {item}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {comparison.removed.length > 0 && (
        <div>
          <h4 className="text-sm font-medium flex items-center gap-2 mb-2 text-red-700">
            <MinusCircle className="h-4 w-4" aria-hidden="true" />
            移除项 ({comparison.removed.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {comparison.removed.map((item, index) => (
              <Badge
                key={`removed-${index}-${item}`}
                className="bg-red-100 text-red-700 hover:bg-red-200"
              >
                {item}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {comparison.unchanged.length > 0 && (
        <div>
          <h4 className="text-sm font-medium flex items-center gap-2 mb-2 text-gray-600">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            保持不变 ({comparison.unchanged.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {comparison.unchanged.map((item, index) => (
              <Badge key={`unchanged-${index}-${item}`} variant="secondary">
                {item}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

ArrayFieldComparison.displayName = "ArrayFieldComparison";

export const ProfileComparison = memo<ProfileComparisonProps>(({
  profileA,
  profileB,
  className = "",
}) => {
  if (!profileA || !profileB) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          缺少必要的画像数据，无法进行对比
        </AlertDescription>
      </Alert>
    );
  }

  const dataA = useMemo(() => parseProfileData(profileA), [profileA]);
  const dataB = useMemo(() => parseProfileData(profileB), [profileB]);

  const scoreComparison = useMemo(() => {
    const scoreA = parseScore(profileA.overallScore, profileA.id);
    const scoreB = parseScore(profileB.overallScore, profileB.id);
    return calculateScoreComparison(scoreA, scoreB);
  }, [profileA, profileB]);

  const softSkillsA = useMemo(
    () => dataA?.softSkills?.map(s => s.skill) ?? [],
    [dataA]
  );

  const softSkillsB = useMemo(
    () => dataB?.softSkills?.map(s => s.skill) ?? [],
    [dataB]
  );

  if (!dataA || !dataB) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <p className="mb-2">画像数据格式错误，无法进行对比</p>
          <ul className="text-xs list-disc list-inside space-y-1">
            {!dataA && <li>版本 {profileA.version} 数据格式不正确</li>}
            {!dataB && <li>版本 {profileB.version} 数据格式不正确</li>}
          </ul>
        </AlertDescription>
      </Alert>
    );
  }

  const labelA = `版本 ${profileA.version} (${profileA.stage})`;
  const labelB = `版本 ${profileB.version} (${profileB.stage})`;

  return (
    <div className={className}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">画像版本对比</h3>
        <p className="text-sm text-muted-foreground">
          对比 {labelA} 与 {labelB} 的差异
        </p>
      </div>

      <div className="space-y-6">
        <ScoreComparisonCard
          comparison={scoreComparison}
          labelA={labelA}
          labelB={labelB}
        />

        <Tabs defaultValue="technical" className="w-full">
          <TabsList className="w-full flex overflow-x-auto gap-2 sm:grid sm:grid-cols-3 lg:grid-cols-6">
            <TabsTrigger value="technical" aria-label="技术技能对比">
              <Code className="w-4 h-4 sm:mr-2" aria-hidden="true" />
              <span className="hidden sm:inline">技术技能</span>
              <span className="sr-only sm:hidden">技术技能</span>
            </TabsTrigger>
            <TabsTrigger value="soft" aria-label="软技能对比">
              <Users className="w-4 h-4 sm:mr-2" aria-hidden="true" />
              <span className="hidden sm:inline">软技能</span>
              <span className="sr-only sm:hidden">软技能</span>
            </TabsTrigger>
            <TabsTrigger value="strengths" aria-label="优势对比">
              <CheckCircle2 className="w-4 h-4 sm:mr-2" aria-hidden="true" />
              <span className="hidden sm:inline">优势</span>
              <span className="sr-only sm:hidden">优势</span>
            </TabsTrigger>
            <TabsTrigger value="concerns" aria-label="顾虑对比">
              <AlertCircle className="w-4 h-4 sm:mr-2" aria-hidden="true" />
              <span className="hidden sm:inline">顾虑</span>
              <span className="sr-only sm:hidden">顾虑</span>
            </TabsTrigger>
            <TabsTrigger value="gaps" aria-label="信息缺口对比">
              <Target className="w-4 h-4 sm:mr-2" aria-hidden="true" />
              <span className="hidden sm:inline">信息缺口</span>
              <span className="sr-only sm:hidden">信息缺口</span>
            </TabsTrigger>
            <TabsTrigger value="summary" aria-label="AI 总结对比">
              <Briefcase className="w-4 h-4 sm:mr-2" aria-hidden="true" />
              <span className="hidden sm:inline">AI 总结</span>
              <span className="sr-only sm:hidden">AI 总结</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="technical" className="mt-4">
            <TechnicalSkillsComparison dataA={dataA} dataB={dataB} />
          </TabsContent>

          <TabsContent value="soft" className="mt-4">
            <ArrayFieldComparison
              label="软技能"
              icon={Users}
              arrayA={softSkillsA}
              arrayB={softSkillsB}
              emptyMessage="两个版本均无软技能数据"
            />
          </TabsContent>

          <TabsContent value="strengths" className="mt-4">
            <ArrayFieldComparison
              label="候选人优势"
              icon={CheckCircle2}
              arrayA={profileA.strengths}
              arrayB={profileB.strengths}
              emptyMessage="两个版本均无优势数据"
            />
          </TabsContent>

          <TabsContent value="concerns" className="mt-4">
            <ArrayFieldComparison
              label="潜在顾虑"
              icon={AlertCircle}
              arrayA={profileA.concerns}
              arrayB={profileB.concerns}
              emptyMessage="两个版本均无顾虑数据"
            />
          </TabsContent>

          <TabsContent value="gaps" className="mt-4">
            <ArrayFieldComparison
              label="信息缺口"
              icon={Target}
              arrayA={profileA.gaps}
              arrayB={profileB.gaps}
              emptyMessage="两个版本均无信息缺口数据"
            />
          </TabsContent>

          <TabsContent value="summary" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{labelA}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {profileA.aiSummary || "无 AI 总结"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{labelB}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {profileB.aiSummary || "无 AI 总结"}
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
});

ProfileComparison.displayName = "ProfileComparison";