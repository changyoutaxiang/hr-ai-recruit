import { useMemo, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  TrendingUp,
  AlertCircle
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from "recharts";
import type { CandidateProfile, ProfileData } from "@shared/schema";
import { profileDataSchema } from "@shared/schema";
import { getStageLabel, ProfileDataParser } from "@/lib/profile-utils";

interface OrganizationFitTrendProps {
  profiles: CandidateProfile[];
  currentProfileId?: string;
}

export const OrganizationFitTrend = memo<OrganizationFitTrendProps>(({
  profiles,
  currentProfileId
}) => {
  const parser = useMemo(() => new ProfileDataParser(), []);

  const trendData = useMemo(() => {
    return profiles.map(p => {
      const profileData = parser.parse(p);
      if (!profileData.success) return null;

      const data: ProfileData = profileData.data;
      const orgFit = data.organizationalFit;

      return {
        stage: getStageLabel(p.stage),
        version: p.version,
        culture: orgFit?.cultureAssessment?.overallScore || 0,
        leadership: orgFit?.leadershipAssessment?.overallScore || 0,
        overall: parseFloat(p.overallScore || "0"),
        isCurrent: p.id === currentProfileId,
        date: new Date(p.createdAt).toLocaleDateString("zh-CN")
      };
    }).filter(Boolean);
  }, [profiles, currentProfileId, parser]);

  if (trendData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            组织契合度演化趋势
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              暂无足够的数据生成演化趋势图。需要至少一个画像版本。
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          组织契合度演化趋势
        </CardTitle>
        <CardDescription>
          跟踪文化价值观和领导力评估在各阶段的变化
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCulture" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="colorLeadership" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis
              dataKey="stage"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
              label={{ value: '分数', angle: -90, position: 'insideLeft' }}
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
                      <div className="text-xs text-muted-foreground mb-2">
                        {data.date}
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between gap-4">
                          <span className="text-blue-600">文化契合:</span>
                          <span className="font-medium">{data.culture}分</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-purple-600">领导力:</span>
                          <span className="font-medium">{data.leadership}分</span>
                        </div>
                        <div className="flex justify-between gap-4 pt-1 border-t">
                          <span className="text-green-600">综合评分:</span>
                          <span className="font-medium">{data.overall}分</span>
                        </div>
                      </div>
                      {data.isCurrent && (
                        <div className="text-xs text-primary mt-2 font-medium">
                          当前版本
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="line"
              wrapperStyle={{ fontSize: "14px" }}
            />
            <Area
              type="monotone"
              dataKey="culture"
              stroke="#3b82f6"
              fillOpacity={1}
              fill="url(#colorCulture)"
              strokeWidth={2}
              name="文化契合度"
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Area
              type="monotone"
              dataKey="leadership"
              stroke="#8b5cf6"
              fillOpacity={1}
              fill="url(#colorLeadership)"
              strokeWidth={2}
              name="领导力评分"
              dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="overall"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ fill: '#10b981', strokeWidth: 2, r: 5 }}
              activeDot={{ r: 7 }}
              name="综合评分"
              strokeDasharray="5 5"
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* 趋势分析说明 */}
        {trendData.length > 1 && (
          <div className="mt-6 p-4 bg-muted/50 rounded-lg space-y-3">
            <h4 className="font-medium text-sm">趋势分析</h4>

            {/* 文化契合度趋势 */}
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-muted-foreground">文化契合度:</span>
              <span className="font-medium">
                {(() => {
                  const lastTwo = trendData.slice(-2);
                  const diff = lastTwo[1].culture - lastTwo[0].culture;
                  if (diff > 0) return `上升 ${diff.toFixed(1)} 分 ↑`;
                  if (diff < 0) return `下降 ${Math.abs(diff).toFixed(1)} 分 ↓`;
                  return "保持稳定 →";
                })()}
              </span>
            </div>

            {/* 领导力趋势 */}
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="text-muted-foreground">领导力评分:</span>
              <span className="font-medium">
                {(() => {
                  const lastTwo = trendData.slice(-2);
                  const diff = lastTwo[1].leadership - lastTwo[0].leadership;
                  if (diff > 0) return `上升 ${diff.toFixed(1)} 分 ↑`;
                  if (diff < 0) return `下降 ${Math.abs(diff).toFixed(1)} 分 ↓`;
                  return "保持稳定 →";
                })()}
              </span>
            </div>

            {/* 综合评分趋势 */}
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-muted-foreground">综合评分:</span>
              <span className="font-medium">
                {(() => {
                  const lastTwo = trendData.slice(-2);
                  const diff = lastTwo[1].overall - lastTwo[0].overall;
                  if (diff > 0) return `提升 ${diff.toFixed(1)} 分 ↑`;
                  if (diff < 0) return `下降 ${Math.abs(diff).toFixed(1)} 分 ↓`;
                  return "保持稳定 →";
                })()}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

OrganizationFitTrend.displayName = "OrganizationFitTrend";