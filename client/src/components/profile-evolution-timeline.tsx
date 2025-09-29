import React, { memo, useMemo, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  FileText,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  ChevronRight,
  Calendar,
  Target,
  Loader2,
  Phone,
  Users,
  Building,
  BrainCircuit,
  UserCheck,
  Coffee
} from "lucide-react";
import type { CandidateProfile } from "@shared/schema";
import { InterviewType, parseStageId, getStageLabel } from "@shared/types/interview";

interface ProfileEvolutionTimelineProps {
  profiles: CandidateProfile[];
  onSelectProfile?: (profile: CandidateProfile) => void;
  selectedProfileId?: string;
  className?: string;
  isLoading?: boolean;
  error?: Error | null;
}

// 面试类型与图标映射
const INTERVIEW_TYPE_ICONS = {
  [InterviewType.RESUME]: FileText,
  [InterviewType.PHONE_SCREEN]: Phone,
  [InterviewType.TECHNICAL]: BrainCircuit,
  [InterviewType.BEHAVIORAL]: UserCheck,
  [InterviewType.CULTURAL]: Users,
  [InterviewType.CASE_STUDY]: FileText,
  [InterviewType.PANEL]: Users,
  [InterviewType.EXECUTIVE]: Building,
  [InterviewType.HR]: UserCheck,
  [InterviewType.DEPARTMENT]: Building,
  [InterviewType.CROSS_TEAM]: Users,
  [InterviewType.FINAL]: Target,
  [InterviewType.INFORMAL]: Coffee
};

// 面试轮次颜色配置系统
const ROUND_COLORS = [
  { color: "bg-blue-500", lightColor: "bg-blue-100", textColor: "text-blue-700" },
  { color: "bg-purple-500", lightColor: "bg-purple-100", textColor: "text-purple-700" },
  { color: "bg-indigo-500", lightColor: "bg-indigo-100", textColor: "text-indigo-700" },
  { color: "bg-violet-500", lightColor: "bg-violet-100", textColor: "text-violet-700" },
  { color: "bg-pink-500", lightColor: "bg-pink-100", textColor: "text-pink-700" },
  { color: "bg-orange-500", lightColor: "bg-orange-100", textColor: "text-orange-700" },
  { color: "bg-teal-500", lightColor: "bg-teal-100", textColor: "text-teal-700" },
  { color: "bg-cyan-500", lightColor: "bg-cyan-100", textColor: "text-cyan-700" },
];

// 获取阶段配置 - 支持弹性轮次
const getStageConfig = (stage: string) => {
  const parsed = parseStageId(stage);

  if (!parsed) {
    console.warn(`Unknown stage format: ${stage}`);
    return {
      label: stage,
      icon: FileText,
      color: "bg-gray-500",
      lightColor: "bg-gray-100",
      textColor: "text-gray-700",
    };
  }

  const { round, type } = parsed;
  const icon = type ? INTERVIEW_TYPE_ICONS[type] : MessageSquare;
  const colorConfig = round === 0
    ? { color: "bg-blue-500", lightColor: "bg-blue-100", textColor: "text-blue-700" }
    : ROUND_COLORS[Math.min(round - 1, ROUND_COLORS.length - 1)];

  return {
    label: getStageLabel(stage, 'zh'),
    icon,
    ...colorConfig
  };
};

const isStringArray = (value: unknown): value is string[] => {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
};

const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return "未知日期";

  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "无效日期";

    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return "日期错误";
  }
};

const calculateScoreDelta = (currentScore: number, previousScore: number | null): {
  delta: number;
  percentage: string;
  trend: "up" | "down" | "stable";
} => {
  if (previousScore === null || previousScore === 0) {
    return { delta: 0, percentage: "0%", trend: "stable" };
  }

  const delta = currentScore - previousScore;
  const percentage = ((Math.abs(delta) / previousScore) * 100).toFixed(1);

  let trend: "up" | "down" | "stable" = "stable";
  if (Math.abs(delta) >= 0.5) {
    trend = delta > 0 ? "up" : "down";
  }

  return { delta, percentage: `${percentage}%`, trend };
};

const parseScore = (score: string | number | null | undefined, profileId: string): number => {
  if (score === null || score === undefined) return 0;

  const numericScore = typeof score === 'string' ? parseFloat(score) : score;

  if (isNaN(numericScore)) {
    console.warn(`Invalid score for profile ${profileId}:`, score);
    return 0;
  }

  return Math.max(0, Math.min(100, numericScore));
};

interface TimelineNodeProps {
  profile: CandidateProfile;
  previousScore: number | null;
  isLatest: boolean;
  isSelected: boolean;
  onSelect: () => void;
  isFirst: boolean;
  isLast: boolean;
  nodeRef: (el: HTMLDivElement | null) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

const TimelineNode = memo<TimelineNodeProps>(({
  profile,
  previousScore,
  isLatest,
  isSelected,
  onSelect,
  isFirst,
  isLast,
  nodeRef,
  onKeyDown,
}) => {
  const stageConfig = getStageConfig(profile.stage);
  const StageIcon = stageConfig.icon;

  const currentScore = useMemo(() => {
    return parseScore(profile.overallScore, profile.id);
  }, [profile.overallScore, profile.id]);

  const scoreDelta = useMemo(
    () => calculateScoreDelta(currentScore, previousScore),
    [currentScore, previousScore]
  );

  const TrendIcon = scoreDelta.trend === "up"
    ? TrendingUp
    : scoreDelta.trend === "down"
    ? TrendingDown
    : Minus;

  const trendColor = scoreDelta.trend === "up"
    ? "text-green-600"
    : scoreDelta.trend === "down"
    ? "text-red-600"
    : "text-gray-500";

  const strengthsCount = useMemo(() => {
    return profile.strengths && isStringArray(profile.strengths)
      ? profile.strengths.length
      : 0;
  }, [profile.strengths]);

  const concernsCount = useMemo(() => {
    return profile.concerns && isStringArray(profile.concerns)
      ? profile.concerns.length
      : 0;
  }, [profile.concerns]);

  const gapsCount = useMemo(() => {
    return profile.gaps && isStringArray(profile.gaps)
      ? profile.gaps.length
      : 0;
  }, [profile.gaps]);

  return (
    <div
      className="relative flex gap-2 sm:gap-4"
      role="listitem"
      aria-label={`画像版本 ${profile.version} - ${stageConfig.label}`}
    >
      <div className="flex flex-col items-center">
        <div
          className={`
            relative z-10 flex items-center justify-center rounded-full
            h-10 w-10 sm:h-12 sm:w-12
            ${isSelected ? stageConfig.color : stageConfig.lightColor}
            ${isSelected ? "ring-2 sm:ring-4 ring-offset-1 sm:ring-offset-2 ring-blue-300" : ""}
            transition-all duration-200
          `}
          aria-hidden="true"
        >
          <StageIcon
            className={`h-5 w-5 sm:h-6 sm:w-6 ${isSelected ? "text-white" : stageConfig.textColor}`}
          />
        </div>

        {!isLast && (
          <div
            className="w-0.5 flex-1 bg-gray-300 min-h-[40px] sm:min-h-[60px]"
            aria-hidden="true"
          />
        )}
      </div>

      <div className="flex-1 pb-6 sm:pb-8">
        <Card
          ref={nodeRef}
          className={`
            cursor-pointer transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500
            ${isSelected ? "border-blue-500 border-2 shadow-md" : ""}
            ${isLatest ? "bg-blue-50" : ""}
          `}
          onClick={onSelect}
          role="button"
          tabIndex={0}
          aria-pressed={isSelected}
          aria-label={`选择版本 ${profile.version}`}
          onKeyDown={onKeyDown}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2 flex-wrap">
                  <span className="truncate">{stageConfig.label}</span>
                  {isLatest && (
                    <Badge variant="default" className="text-xs shrink-0">
                      最新
                    </Badge>
                  )}
                  <span className="text-sm text-muted-foreground font-normal shrink-0">
                    v{profile.version}
                  </span>
                </CardTitle>
                <CardDescription className="flex items-center gap-1 mt-1 text-xs sm:text-sm">
                  <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
                  {formatDate(profile.createdAt)}
                </CardDescription>
              </div>

              <ChevronRight
                className={`h-5 w-5 text-muted-foreground shrink-0 transition-transform ${
                  isSelected ? "rotate-90" : ""
                }`}
                aria-hidden="true"
              />
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-baseline gap-2">
                <span
                  className="text-xl sm:text-2xl lg:text-3xl font-bold"
                  aria-label={`分数 ${currentScore.toFixed(1)} 分`}
                >
                  {currentScore.toFixed(1)}
                </span>
                <span className="text-sm text-muted-foreground">/ 100</span>
              </div>

              {!isFirst && (
                <div
                  className={`flex items-center gap-1 ${trendColor}`}
                  aria-label={`分数变化: ${scoreDelta.delta > 0 ? "上升" : scoreDelta.delta < 0 ? "下降" : "持平"} ${Math.abs(scoreDelta.delta).toFixed(1)} 分`}
                >
                  <TrendIcon className="h-4 w-4" aria-hidden="true" />
                  <span className="text-sm font-medium">
                    {scoreDelta.delta > 0 ? "+" : ""}
                    {scoreDelta.delta.toFixed(1)}
                  </span>
                  <span className="text-xs">
                    ({scoreDelta.percentage})
                  </span>
                </div>
              )}
            </div>

            {profile.aiSummary && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {profile.aiSummary}
              </p>
            )}

            <div className="flex gap-2 flex-wrap text-xs" role="list" aria-label="画像统计">
              {strengthsCount > 0 && (
                <Badge variant="secondary" className="text-green-700 bg-green-100" role="listitem">
                  {strengthsCount} 个优势
                </Badge>
              )}
              {concernsCount > 0 && (
                <Badge variant="secondary" className="text-amber-700 bg-amber-100" role="listitem">
                  {concernsCount} 个顾虑
                </Badge>
              )}
              {gapsCount > 0 && (
                <Badge variant="secondary" className="text-blue-700 bg-blue-100" role="listitem">
                  {gapsCount} 个信息缺口
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

TimelineNode.displayName = "TimelineNode";

export const ProfileEvolutionTimeline = memo<ProfileEvolutionTimelineProps>(({
  profiles,
  onSelectProfile,
  selectedProfileId,
  className = "",
  isLoading = false,
  error = null,
}) => {
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const timelineData = useMemo(() => {
    const sorted = [...profiles].sort((a, b) => a.version - b.version);

    const withScores = sorted.map((profile, index) => {
      const previousScore = index > 0
        ? parseScore(sorted[index - 1].overallScore, sorted[index - 1].id)
        : null;

      return {
        profile,
        previousScore: previousScore !== null ? previousScore : null,
        isLatest: index === sorted.length - 1,
        isFirst: index === 0,
        isLast: index === sorted.length - 1,
      };
    });

    const latestProfileId = sorted.length > 0 ? sorted[sorted.length - 1].id : null;

    return { items: withScores, latestProfileId, sorted };
  }, [profiles]);

  const handleKeyNavigation = useCallback((
    e: React.KeyboardEvent,
    currentIndex: number
  ) => {
    const { sorted } = timelineData;

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelectProfile?.(sorted[currentIndex]);
    } else if (e.key === "ArrowDown" && currentIndex < sorted.length - 1) {
      e.preventDefault();
      const nextProfile = sorted[currentIndex + 1];
      nodeRefs.current.get(nextProfile.id)?.focus();
    } else if (e.key === "ArrowUp" && currentIndex > 0) {
      e.preventDefault();
      const prevProfile = sorted[currentIndex - 1];
      nodeRefs.current.get(prevProfile.id)?.focus();
    }
  }, [timelineData, onSelectProfile]);

  if (isLoading) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">加载画像数据...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          加载画像数据失败: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (profiles.length === 0) {
    return (
      <Alert className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          暂无画像数据。请先为候选人生成初始画像。
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div
      className={className}
      role="list"
      aria-label="候选人画像演进时间线"
    >
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">画像演进历程</h3>
        <p className="text-sm text-muted-foreground">
          共 {profiles.length} 个版本 · 跟踪候选人在招聘流程中的画像变化
        </p>
      </div>

      <div className="space-y-0">
        {timelineData.items.map(({ profile, previousScore, isLatest, isFirst, isLast }, index) => (
          <TimelineNode
            key={profile.id}
            profile={profile}
            previousScore={previousScore}
            isLatest={isLatest}
            isSelected={profile.id === selectedProfileId}
            onSelect={() => onSelectProfile?.(profile)}
            isFirst={isFirst}
            isLast={isLast}
            nodeRef={(el) => {
              if (el) {
                nodeRefs.current.set(profile.id, el);
              } else {
                nodeRefs.current.delete(profile.id);
              }
            }}
            onKeyDown={(e) => handleKeyNavigation(e, index)}
          />
        ))}
      </div>
    </div>
  );
});

ProfileEvolutionTimeline.displayName = "ProfileEvolutionTimeline";