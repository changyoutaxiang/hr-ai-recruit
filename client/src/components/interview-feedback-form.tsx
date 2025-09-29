import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Star,
  Plus,
  Minus,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Users,
  Brain,
  MessageSquare,
  Target,
  Sparkles,
  Save
} from "lucide-react";
import { InterviewType, getStageLabel } from "@shared/types/interview";
import type { Interview, Candidate } from "@shared/schema";

interface InterviewFeedbackFormProps {
  interview: Interview;
  candidate: Candidate;
  round: number;
  onSubmitSuccess?: () => void;
}

interface SkillValidation {
  skill: string;
  assessed: boolean;
  level: 'exceeded' | 'met' | 'below' | 'not_assessed';
  evidence: string;
}

interface BehavioralEvidence {
  situation: string;
  task: string;
  action: string;
  result: string;
  learnings: string;
}

export function InterviewFeedbackForm({
  interview,
  candidate,
  round,
  onSubmitSuccess
}: InterviewFeedbackFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 评分状态
  const [scores, setScores] = useState({
    technical: 70,
    communication: 70,
    problemSolving: 70,
    cultureFit: 70,
    leadership: 70,
    overall: 70
  });

  // 面试类型
  const [interviewType, setInterviewType] = useState<InterviewType>(InterviewType.TECHNICAL);

  // 观察结果
  const [strengths, setStrengths] = useState<string[]>([]);
  const [weaknesses, setWeaknesses] = useState<string[]>([]);
  const [highlights, setHighlights] = useState<string[]>([]);
  const [redFlags, setRedFlags] = useState<string[]>([]);

  // STAR 行为证据
  const [behavioralEvidence, setBehavioralEvidence] = useState<BehavioralEvidence[]>([]);

  // 技能验证
  const [skillsValidation, setSkillsValidation] = useState<SkillValidation[]>([]);

  // 建议
  const [recommendation, setRecommendation] = useState<string>('lean_hire');
  const [nextSteps, setNextSteps] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // 输入状态
  const [newStrength, setNewStrength] = useState('');
  const [newWeakness, setNewWeakness] = useState('');
  const [newHighlight, setNewHighlight] = useState('');
  const [newRedFlag, setNewRedFlag] = useState('');

  // 提交反馈
  const submitMutation = useMutation({
    mutationFn: async () => {
      const feedbackData = {
        interviewId: interview.id,
        interviewerId: interview.interviewerId,
        round,
        interviewType,
        scores,
        observations: {
          strengths,
          weaknesses,
          redFlags: redFlags.length > 0 ? redFlags : undefined,
          highlights: highlights.length > 0 ? highlights : undefined
        },
        behavioralEvidence,
        skillsValidation: skillsValidation.length > 0 ? skillsValidation : undefined,
        recommendation,
        nextSteps: nextSteps || undefined,
        additionalNotes: additionalNotes || undefined
      };

      const response = await fetch(`/api/interviews/${interview.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedbackData)
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "反馈提交成功",
        description: "候选人画像正在更新中...",
      });

      // 刷新相关数据
      queryClient.invalidateQueries({
        queryKey: [`/api/candidates/${candidate.id}/profiles`]
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/interviews/${interview.id}`]
      });

      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    },
    onError: (error) => {
      toast({
        title: "提交失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive"
      });
    }
  });

  // 添加观察项
  const addItem = (type: 'strength' | 'weakness' | 'highlight' | 'redFlag') => {
    const maps = {
      strength: { list: strengths, set: setStrengths, value: newStrength, setValue: setNewStrength },
      weakness: { list: weaknesses, set: setWeaknesses, value: newWeakness, setValue: setNewWeakness },
      highlight: { list: highlights, set: setHighlights, value: newHighlight, setValue: setNewHighlight },
      redFlag: { list: redFlags, set: setRedFlags, value: newRedFlag, setValue: setNewRedFlag }
    };

    const { list, set, value, setValue } = maps[type];
    if (value.trim()) {
      set([...list, value.trim()]);
      setValue('');
    }
  };

  // 添加 STAR 证据
  const addBehavioralEvidence = () => {
    setBehavioralEvidence([
      ...behavioralEvidence,
      { situation: '', task: '', action: '', result: '', learnings: '' }
    ]);
  };

  // 添加技能验证
  const addSkillValidation = () => {
    setSkillsValidation([
      ...skillsValidation,
      { skill: '', assessed: false, level: 'not_assessed', evidence: '' }
    ]);
  };

  // 计算综合评分
  const calculateOverallScore = () => {
    const weights = {
      technical: 0.3,
      communication: 0.2,
      problemSolving: 0.25,
      cultureFit: 0.15,
      leadership: 0.1
    };

    const weighted = Object.entries(weights).reduce((sum, [key, weight]) => {
      return sum + (scores[key as keyof typeof scores] * weight);
    }, 0);

    setScores(prev => ({ ...prev, overall: Math.round(weighted) }));
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          面试反馈表 - {getStageLabel(`interview_${round}_${interviewType}`, 'zh')}
        </CardTitle>
        <CardDescription>
          候选人：{candidate.name} · 职位：{candidate.position || '未指定'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <Tabs defaultValue="scores" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="scores">评分</TabsTrigger>
            <TabsTrigger value="observations">观察</TabsTrigger>
            <TabsTrigger value="evidence">证据</TabsTrigger>
            <TabsTrigger value="recommendation">建议</TabsTrigger>
          </TabsList>

          {/* 评分标签页 */}
          <TabsContent value="scores" className="space-y-4">
            <div className="space-y-2">
              <Label>面试类型</Label>
              <Select value={interviewType} onValueChange={(v) => setInterviewType(v as InterviewType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={InterviewType.TECHNICAL}>技术面试</SelectItem>
                  <SelectItem value={InterviewType.BEHAVIORAL}>行为面试</SelectItem>
                  <SelectItem value={InterviewType.CULTURAL}>文化面试</SelectItem>
                  <SelectItem value={InterviewType.CASE_STUDY}>案例分析</SelectItem>
                  <SelectItem value={InterviewType.PANEL}>小组面试</SelectItem>
                  <SelectItem value={InterviewType.HR}>HR面试</SelectItem>
                  <SelectItem value={InterviewType.EXECUTIVE}>高管面试</SelectItem>
                  <SelectItem value={InterviewType.DEPARTMENT}>部门面试</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              {Object.entries(scores).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="capitalize">{
                      key === 'technical' ? '技术能力' :
                      key === 'communication' ? '沟通能力' :
                      key === 'problemSolving' ? '解决问题' :
                      key === 'cultureFit' ? '文化契合' :
                      key === 'leadership' ? '领导潜力' :
                      '综合评分'
                    }</Label>
                    <span className="text-sm font-medium">{value} / 100</span>
                  </div>
                  <Slider
                    value={[value]}
                    onValueChange={([v]) => setScores(prev => ({ ...prev, [key]: v }))}
                    max={100}
                    step={5}
                    disabled={key === 'overall'}
                    className="w-full"
                  />
                </div>
              ))}

              <Button
                variant="outline"
                onClick={calculateOverallScore}
                className="w-full"
              >
                计算综合评分
              </Button>
            </div>
          </TabsContent>

          {/* 观察标签页 */}
          <TabsContent value="observations" className="space-y-4">
            {/* 优势 */}
            <div className="space-y-2">
              <Label>核心优势</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="输入观察到的优势..."
                  value={newStrength}
                  onChange={(e) => setNewStrength(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addItem('strength')}
                />
                <Button onClick={() => addItem('strength')} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {strengths.map((s, i) => (
                  <Badge key={i} variant="default" className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    {s}
                    <button
                      onClick={() => setStrengths(strengths.filter((_, idx) => idx !== i))}
                      className="ml-1"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* 不足 */}
            <div className="space-y-2">
              <Label>待改进领域</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="输入观察到的不足..."
                  value={newWeakness}
                  onChange={(e) => setNewWeakness(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addItem('weakness')}
                />
                <Button onClick={() => addItem('weakness')} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {weaknesses.map((w, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">
                    {w}
                    <button
                      onClick={() => setWeaknesses(weaknesses.filter((_, idx) => idx !== i))}
                      className="ml-1"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* 亮点 */}
            <div className="space-y-2">
              <Label>亮点表现</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="输入印象深刻的表现..."
                  value={newHighlight}
                  onChange={(e) => setNewHighlight(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addItem('highlight')}
                />
                <Button onClick={() => addItem('highlight')} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {highlights.map((h, i) => (
                  <Badge key={i} className="gap-1 bg-yellow-100 text-yellow-800">
                    <Star className="h-3 w-3" />
                    {h}
                    <button
                      onClick={() => setHighlights(highlights.filter((_, idx) => idx !== i))}
                      className="ml-1"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* 红旗 */}
            <div className="space-y-2">
              <Label>潜在风险</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="输入需要关注的风险..."
                  value={newRedFlag}
                  onChange={(e) => setNewRedFlag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addItem('redFlag')}
                />
                <Button onClick={() => addItem('redFlag')} size="sm" variant="destructive">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {redFlags.map((r, i) => (
                  <Badge key={i} variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {r}
                    <button
                      onClick={() => setRedFlags(redFlags.filter((_, idx) => idx !== i))}
                      className="ml-1"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* 证据标签页 */}
          <TabsContent value="evidence" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>STAR 行为证据</Label>
                <Button onClick={addBehavioralEvidence} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  添加证据
                </Button>
              </div>

              {behavioralEvidence.map((evidence, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-3">
                    <Input
                      placeholder="情境 (Situation)"
                      value={evidence.situation}
                      onChange={(e) => {
                        const updated = [...behavioralEvidence];
                        updated[index].situation = e.target.value;
                        setBehavioralEvidence(updated);
                      }}
                    />
                    <Input
                      placeholder="任务 (Task)"
                      value={evidence.task}
                      onChange={(e) => {
                        const updated = [...behavioralEvidence];
                        updated[index].task = e.target.value;
                        setBehavioralEvidence(updated);
                      }}
                    />
                    <Input
                      placeholder="行动 (Action)"
                      value={evidence.action}
                      onChange={(e) => {
                        const updated = [...behavioralEvidence];
                        updated[index].action = e.target.value;
                        setBehavioralEvidence(updated);
                      }}
                    />
                    <Input
                      placeholder="结果 (Result)"
                      value={evidence.result}
                      onChange={(e) => {
                        const updated = [...behavioralEvidence];
                        updated[index].result = e.target.value;
                        setBehavioralEvidence(updated);
                      }}
                    />
                    <Input
                      placeholder="学习反思 (可选)"
                      value={evidence.learnings}
                      onChange={(e) => {
                        const updated = [...behavioralEvidence];
                        updated[index].learnings = e.target.value;
                        setBehavioralEvidence(updated);
                      }}
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setBehavioralEvidence(
                          behavioralEvidence.filter((_, i) => i !== index)
                        );
                      }}
                    >
                      删除
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* 建议标签页 */}
          <TabsContent value="recommendation" className="space-y-4">
            <div className="space-y-2">
              <Label>录用建议</Label>
              <Select value={recommendation} onValueChange={setRecommendation}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strong_hire">强烈推荐录用</SelectItem>
                  <SelectItem value="hire">推荐录用</SelectItem>
                  <SelectItem value="lean_hire">倾向录用</SelectItem>
                  <SelectItem value="lean_no">倾向不录用</SelectItem>
                  <SelectItem value="no_hire">不推荐录用</SelectItem>
                  <SelectItem value="strong_no">强烈不推荐</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>下一步建议</Label>
              <Textarea
                placeholder="建议的后续步骤或需要进一步评估的方面..."
                value={nextSteps}
                onChange={(e) => setNextSteps(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>其他备注</Label>
              <Textarea
                placeholder="任何其他观察或想法..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={4}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2">
          <Button
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {submitMutation.isPending ? '提交中...' : '提交反馈并更新画像'}
          </Button>
        </div>

        {submitMutation.isSuccess && (
          <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertDescription>
              反馈已成功提交，候选人画像已更新为第 {round} 轮面试后版本
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}