import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FileText,
  MessageSquare,
  Shield,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Link2,
  Eye,
  Search,
  Filter,
  Quote,
  Calendar,
  User,
  Lightbulb,
  TrendingUp,
  GitBranch,
  Layers
} from "lucide-react";
import type {
  Evidence,
  Claim,
  EvidenceChain,
  EvidenceSource,
  EvidenceStrength,
  ClaimType
} from "@shared/types/evidence";

interface EvidenceViewerProps {
  claims: Claim[];
  onEvidenceClick?: (evidence: Evidence) => void;
  showFilters?: boolean;
  compact?: boolean;
}

// 证据来源图标映射
const SOURCE_ICONS = {
  resume: FileText,
  interview: MessageSquare,
  behavior: Eye,
  test: Shield,
  reference: User,
  work_sample: Layers,
  ai_analysis: Lightbulb,
  public: Search,
  certification: Shield,
  portfolio: Layers
};

// 证据强度颜色
const STRENGTH_COLORS = {
  direct: "bg-green-100 text-green-800 border-green-300",
  strong: "bg-blue-100 text-blue-800 border-blue-300",
  moderate: "bg-yellow-100 text-yellow-800 border-yellow-300",
  weak: "bg-orange-100 text-orange-800 border-orange-300",
  inferential: "bg-purple-100 text-purple-800 border-purple-300"
};

// 证据强度标签
const STRENGTH_LABELS = {
  direct: "直接证据",
  strong: "强证据",
  moderate: "中等证据",
  weak: "弱证据",
  inferential: "推理证据"
};

export function EvidenceViewer({
  claims,
  onEvidenceClick,
  showFilters = true,
  compact = false
}: EvidenceViewerProps) {
  const [expandedClaims, setExpandedClaims] = useState<Set<string>>(new Set());
  const [selectedSource, setSelectedSource] = useState<EvidenceSource | 'all'>('all');
  const [selectedStrength, setSelectedStrength] = useState<EvidenceStrength | 'all'>('all');
  const [selectedImportance, setSelectedImportance] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // 过滤声明
  const filteredClaims = useMemo(() => {
    return claims.filter(claim => {
      // 重要性过滤
      if (selectedImportance !== 'all' && claim.importance !== selectedImportance) {
        return false;
      }

      // 搜索过滤
      if (searchTerm && !claim.statement.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // 证据来源过滤
      if (selectedSource !== 'all') {
        const hasSource = claim.supportingEvidence.some(e => e.source === selectedSource);
        if (!hasSource) return false;
      }

      // 证据强度过滤
      if (selectedStrength !== 'all') {
        const hasStrength = claim.supportingEvidence.some(e => e.strength === selectedStrength);
        if (!hasStrength) return false;
      }

      return true;
    });
  }, [claims, selectedSource, selectedStrength, selectedImportance, searchTerm]);

  // 统计信息
  const stats = useMemo(() => {
    const totalEvidence = claims.reduce((sum, c) => sum + c.supportingEvidence.length, 0);
    const avgConfidence = claims.reduce((sum, c) => sum + c.confidenceScore, 0) / claims.length;

    const byType = claims.reduce((acc, c) => {
      const category = c.category;
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { totalEvidence, avgConfidence, byType };
  }, [claims]);

  const toggleClaim = (claimId: string) => {
    const newExpanded = new Set(expandedClaims);
    if (newExpanded.has(claimId)) {
      newExpanded.delete(claimId);
    } else {
      newExpanded.add(claimId);
    }
    setExpandedClaims(newExpanded);
  };

  const renderEvidence = (evidence: Evidence, index: number) => {
    const Icon = SOURCE_ICONS[evidence.source as keyof typeof SOURCE_ICONS] || FileText;

    return (
      <div
        key={evidence.id}
        className={`border rounded-lg p-3 space-y-2 hover:shadow-md transition-shadow cursor-pointer ${
          STRENGTH_COLORS[evidence.strength as keyof typeof STRENGTH_COLORS]
        }`}
        onClick={() => onEvidenceClick?.(evidence)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <span className="font-medium text-sm">证据 {index + 1}</span>
            <Badge variant="outline" className="text-xs">
              {STRENGTH_LABELS[evidence.strength as keyof typeof STRENGTH_LABELS]}
            </Badge>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Shield className="h-3 w-3" />
            {evidence.confidence}%
          </div>
        </div>

        <div className="relative">
          <Quote className="h-3 w-3 absolute -top-1 -left-1 text-muted-foreground" />
          <p className="text-sm pl-4 italic">
            {evidence.highlightedText || evidence.originalText}
          </p>
        </div>

        {evidence.sourceDetails && (
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {evidence.sourceDetails.section && (
              <span className="flex items-center gap-1">
                <Layers className="h-3 w-3" />
                {evidence.sourceDetails.section}
              </span>
            )}
            {evidence.sourceDetails.interviewerId && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                面试官ID: {evidence.sourceDetails.interviewerId}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(evidence.sourceDetails.timestamp).toLocaleDateString('zh-CN')}
            </span>
          </div>
        )}

        {evidence.verificationStatus && (
          <div className="flex items-center gap-1">
            {evidence.verificationStatus === 'verified' && (
              <Badge variant="success" className="text-xs gap-1">
                <CheckCircle className="h-3 w-3" />
                已验证
              </Badge>
            )}
            {evidence.verificationStatus === 'unverified' && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Info className="h-3 w-3" />
                待验证
              </Badge>
            )}
            {evidence.verificationStatus === 'disputed' && (
              <Badge variant="destructive" className="text-xs gap-1">
                <XCircle className="h-3 w-3" />
                有争议
              </Badge>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderClaim = (claim: Claim) => {
    const isExpanded = expandedClaims.has(claim.id);
    const importanceColors = {
      critical: "text-red-600 bg-red-50",
      high: "text-orange-600 bg-orange-50",
      medium: "text-yellow-600 bg-yellow-50",
      low: "text-green-600 bg-green-50"
    };

    return (
      <Card key={claim.id} className="overflow-hidden">
        <CardHeader
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => toggleClaim(claim.id)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <Badge
                  variant="outline"
                  className={`text-xs ${importanceColors[claim.importance]}`}
                >
                  {claim.importance === 'critical' ? '关键' :
                   claim.importance === 'high' ? '重要' :
                   claim.importance === 'medium' ? '中等' : '一般'}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {claim.category}
                </Badge>
              </div>

              <p className="font-medium">{claim.statement}</p>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Layers className="h-3 w-3" />
                  {claim.supportingEvidence.length} 条证据
                </span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  置信度 {claim.confidenceScore}%
                </span>
              </div>
            </div>

            <div className="ml-4">
              <Progress value={claim.confidenceScore} className="w-20 h-2" />
            </div>
          </div>
        </CardHeader>

        <Collapsible open={isExpanded}>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {/* 证据摘要 */}
              <Alert className="mb-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  {claim.evidenceSummary}
                </AlertDescription>
              </Alert>

              {/* 推理过程 */}
              {claim.reasoning && (
                <div className="mb-4 p-3 bg-muted/50 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 font-medium text-sm">
                    <GitBranch className="h-4 w-4" />
                    推理过程
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-muted-foreground">
                      方法: {claim.reasoning.method}
                    </p>
                    {claim.reasoning.steps.map((step, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-muted-foreground">{i + 1}.</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 证据列表 */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  支撑证据
                </h4>
                <div className="grid gap-3">
                  {claim.supportingEvidence.map((evidence, index) =>
                    renderEvidence(evidence, index)
                  )}
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  };

  if (claims.length === 0) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          暂无评价声明和证据数据
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* 统计概览 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            证据统计
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{claims.length}</div>
              <div className="text-xs text-muted-foreground">评价声明</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.totalEvidence}</div>
              <div className="text-xs text-muted-foreground">支撑证据</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.avgConfidence.toFixed(0)}%</div>
              <div className="text-xs text-muted-foreground">平均置信度</div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(stats.byType).map(([type, count]) => (
              <Badge key={type} variant="outline">
                {type}: {count}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 过滤器 */}
      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="搜索评价内容..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>

              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value as EvidenceSource | 'all')}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">所有来源</option>
                <option value="resume">简历</option>
                <option value="interview">面试反馈</option>
                <option value="behavior">行为观察</option>
                <option value="test">测试结果</option>
              </select>

              <select
                value={selectedStrength}
                onChange={(e) => setSelectedStrength(e.target.value as EvidenceStrength | 'all')}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">所有强度</option>
                <option value="direct">直接证据</option>
                <option value="strong">强证据</option>
                <option value="moderate">中等证据</option>
                <option value="weak">弱证据</option>
              </select>

              <select
                value={selectedImportance}
                onChange={(e) => setSelectedImportance(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">所有重要性</option>
                <option value="critical">关键</option>
                <option value="high">重要</option>
                <option value="medium">中等</option>
                <option value="low">一般</option>
              </select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 声明列表 */}
      <div className="space-y-3">
        {filteredClaims.map(claim => renderClaim(claim))}
      </div>

      {filteredClaims.length === 0 && claims.length > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            没有符合筛选条件的评价声明
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}