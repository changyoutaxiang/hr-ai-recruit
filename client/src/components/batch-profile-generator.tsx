import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Users,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Sparkles,
  Clock,
  BarChart3
} from "lucide-react";
import type { Candidate, Job } from "@shared/schema";

interface BatchProfileGeneratorProps {
  onComplete?: () => void;
}

interface BatchJobStatus {
  candidateId: string;
  candidateName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  profileId?: string;
  profileVersion?: number;
  startTime?: Date;
  endTime?: Date;
}

export function BatchProfileGenerator({ onComplete }: BatchProfileGeneratorProps) {
  const { toast } = useToast();

  // 状态管理
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [batchStatus, setBatchStatus] = useState<BatchJobStatus[]>([]);
  const [concurrency, setConcurrency] = useState(3); // 并发数

  // 获取候选人列表
  const { data: candidates = [], isLoading: isLoadingCandidates } = useQuery<Candidate[]>({
    queryKey: ['/api/candidates'],
  });

  // 获取职位列表
  const { data: jobs = [], isLoading: isLoadingJobs } = useQuery<Job[]>({
    queryKey: ['/api/jobs'],
  });

  // 过滤没有画像的候选人
  const candidatesWithoutProfiles = candidates.filter(c => !c.resumeUrl);

  // 批量生成画像
  const generateBatch = async () => {
    if (!selectedJobId || selectedCandidates.length === 0) {
      toast({
        title: "参数错误",
        description: "请选择职位和至少一个候选人",
        variant: "destructive"
      });
      return;
    }

    setIsRunning(true);
    setIsPaused(false);

    // 初始化批次状态
    const initialStatus: BatchJobStatus[] = selectedCandidates.map(candidateId => {
      const candidate = candidates.find(c => c.id === candidateId);
      return {
        candidateId,
        candidateName: candidate?.name || '未知',
        status: 'pending' as const
      };
    });
    setBatchStatus(initialStatus);

    // 处理队列
    const queue = [...selectedCandidates];
    const activeJobs = new Map<string, Promise<void>>();

    const processNext = async () => {
      if (isPaused || queue.length === 0) return;

      const candidateId = queue.shift()!;

      // 更新状态为处理中
      setBatchStatus(prev => prev.map(s =>
        s.candidateId === candidateId
          ? { ...s, status: 'processing' as const, startTime: new Date() }
          : s
      ));

      try {
        // 调用API生成画像
        const response = await fetch(`/api/candidates/${candidateId}/profiles/build`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId: selectedJobId })
        });

        if (!response.ok) {
          throw new Error(`Failed to generate profile: ${response.statusText}`);
        }

        const result = await response.json();

        // 更新状态为完成
        setBatchStatus(prev => prev.map(s =>
          s.candidateId === candidateId
            ? {
                ...s,
                status: 'completed' as const,
                profileId: result.profileId,
                profileVersion: result.version,
                endTime: new Date()
              }
            : s
        ));

      } catch (error) {
        // 更新状态为失败
        setBatchStatus(prev => prev.map(s =>
          s.candidateId === candidateId
            ? {
                ...s,
                status: 'failed' as const,
                error: error instanceof Error ? error.message : '未知错误',
                endTime: new Date()
              }
            : s
        ));
      } finally {
        activeJobs.delete(candidateId);

        // 继续处理下一个
        if (!isPaused && queue.length > 0) {
          processNext();
        }

        // 检查是否全部完成
        if (activeJobs.size === 0 && queue.length === 0) {
          setIsRunning(false);
          toast({
            title: "批量生成完成",
            description: `成功生成 ${batchStatus.filter(s => s.status === 'completed').length} 个画像`,
          });

          if (onComplete) {
            onComplete();
          }
        }
      }
    };

    // 启动并发处理
    for (let i = 0; i < Math.min(concurrency, queue.length); i++) {
      processNext();
    }
  };

  // 暂停/恢复处理
  const togglePause = () => {
    setIsPaused(!isPaused);
    if (!isPaused) {
      toast({
        title: "已暂停",
        description: "批量生成已暂停，点击恢复继续处理",
      });
    }
  };

  // 重试失败的任务
  const retryFailed = () => {
    const failedCandidates = batchStatus
      .filter(s => s.status === 'failed')
      .map(s => s.candidateId);

    setSelectedCandidates(failedCandidates);
    setBatchStatus([]);
    generateBatch();
  };

  // 计算进度
  const progress = useMemo(() => {
    if (batchStatus.length === 0) return 0;
    const completed = batchStatus.filter(s =>
      s.status === 'completed' || s.status === 'failed'
    ).length;
    return (completed / batchStatus.length) * 100;
  }, [batchStatus]);

  // 统计信息
  const stats = useMemo(() => {
    const completed = batchStatus.filter(s => s.status === 'completed').length;
    const failed = batchStatus.filter(s => s.status === 'failed').length;
    const processing = batchStatus.filter(s => s.status === 'processing').length;
    const pending = batchStatus.filter(s => s.status === 'pending').length;

    // 计算平均处理时间
    const completedWithTime = batchStatus.filter(s =>
      s.status === 'completed' && s.startTime && s.endTime
    );
    const avgTime = completedWithTime.length > 0
      ? completedWithTime.reduce((sum, s) => {
          const duration = (s.endTime!.getTime() - s.startTime!.getTime()) / 1000;
          return sum + duration;
        }, 0) / completedWithTime.length
      : 0;

    return { completed, failed, processing, pending, avgTime };
  }, [batchStatus]);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          批量生成候选人画像
        </CardTitle>
        <CardDescription>
          选择候选人和职位，批量生成AI驱动的候选人画像
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 参数选择 */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* 职位选择 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">选择职位</label>
            <Select value={selectedJobId} onValueChange={setSelectedJobId}>
              <SelectTrigger>
                <SelectValue placeholder="选择目标职位" />
              </SelectTrigger>
              <SelectContent>
                {jobs.map(job => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.title} - {job.department}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 并发数设置 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">并发处理数</label>
            <Select value={concurrency.toString()} onValueChange={(v) => setConcurrency(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 (顺序处理)</SelectItem>
                <SelectItem value="3">3 (推荐)</SelectItem>
                <SelectItem value="5">5 (快速)</SelectItem>
                <SelectItem value="10">10 (最快)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 候选人选择 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">
              选择候选人 ({selectedCandidates.length}/{candidatesWithoutProfiles.length})
            </label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (selectedCandidates.length === candidatesWithoutProfiles.length) {
                  setSelectedCandidates([]);
                } else {
                  setSelectedCandidates(candidatesWithoutProfiles.map(c => c.id));
                }
              }}
            >
              {selectedCandidates.length === candidatesWithoutProfiles.length ? '取消全选' : '全选'}
            </Button>
          </div>

          <ScrollArea className="h-[200px] border rounded-md p-4">
            <div className="space-y-2">
              {candidatesWithoutProfiles.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    所有候选人都已有画像，无需批量生成
                  </AlertDescription>
                </Alert>
              ) : (
                candidatesWithoutProfiles.map(candidate => (
                  <div key={candidate.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={candidate.id}
                      checked={selectedCandidates.includes(candidate.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedCandidates([...selectedCandidates, candidate.id]);
                        } else {
                          setSelectedCandidates(selectedCandidates.filter(id => id !== candidate.id));
                        }
                      }}
                      disabled={isRunning}
                    />
                    <label
                      htmlFor={candidate.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1"
                    >
                      {candidate.name} - {candidate.position || '未指定职位'}
                    </label>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* 进度显示 */}
        {batchStatus.length > 0 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>总体进度</span>
                <span>{progress.toFixed(0)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>

            {/* 统计信息 */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2 bg-muted rounded">
                <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                <div className="text-xs text-muted-foreground">已完成</div>
              </div>
              <div className="p-2 bg-muted rounded">
                <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
                <div className="text-xs text-muted-foreground">处理中</div>
              </div>
              <div className="p-2 bg-muted rounded">
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <div className="text-xs text-muted-foreground">等待中</div>
              </div>
              <div className="p-2 bg-muted rounded">
                <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                <div className="text-xs text-muted-foreground">失败</div>
              </div>
            </div>

            {stats.avgTime > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                平均处理时间: {stats.avgTime.toFixed(1)}秒
              </div>
            )}

            {/* 详细状态 */}
            <ScrollArea className="h-[200px] border rounded-md p-4">
              <div className="space-y-2">
                {batchStatus.map(status => (
                  <div key={status.candidateId} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{status.candidateName}</span>
                    <div className="flex items-center gap-2">
                      {status.status === 'pending' && (
                        <Badge variant="secondary">
                          <Clock className="h-3 w-3 mr-1" />
                          等待中
                        </Badge>
                      )}
                      {status.status === 'processing' && (
                        <Badge variant="default">
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          处理中
                        </Badge>
                      )}
                      {status.status === 'completed' && (
                        <Badge variant="success" className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          完成 v{status.profileVersion}
                        </Badge>
                      )}
                      {status.status === 'failed' && (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          失败
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex justify-between gap-2">
          <div className="flex gap-2">
            {!isRunning ? (
              <Button
                onClick={generateBatch}
                disabled={selectedCandidates.length === 0 || !selectedJobId}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                开始生成
              </Button>
            ) : (
              <Button
                onClick={togglePause}
                variant={isPaused ? "default" : "secondary"}
                className="gap-2"
              >
                {isPaused ? (
                  <>
                    <Play className="h-4 w-4" />
                    恢复
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4" />
                    暂停
                  </>
                )}
              </Button>
            )}

            {stats.failed > 0 && !isRunning && (
              <Button
                onClick={retryFailed}
                variant="outline"
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                重试失败 ({stats.failed})
              </Button>
            )}
          </div>

          {batchStatus.length > 0 && !isRunning && (
            <Button
              onClick={() => {
                setBatchStatus([]);
                setSelectedCandidates([]);
              }}
              variant="outline"
            >
              清除结果
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}