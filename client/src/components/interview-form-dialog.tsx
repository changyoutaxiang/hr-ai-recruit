/**
 * 面试创建/编辑表单对话框
 * 提供完整的面试信息管理功能
 */

import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { retryFetchJSON } from "@/lib/retry-fetch";
import { getUserFriendlyErrorMessage } from "@/lib/error-handling";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calendar,
  Clock,
  MapPin,
  User as UserIcon,
  Users,
  Video,
  Phone,
  Building,
  ChevronRight,
  Plus,
  Edit,
  Loader2,
  CheckCircle,
  AlertCircle,
  Trash2,
  Save,
  X
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Interview, Candidate, Job, User } from "@shared/schema";

// 常量定义
const INTERVIEW_TYPES = [
  { value: 'screening', label: '电话筛选', icon: Phone },
  { value: 'technical', label: '技术面试', icon: Video },
  { value: 'behavioral', label: '行为面试', icon: Users },
  { value: 'final', label: '终面', icon: CheckCircle },
  { value: 'onsite', label: '现场面试', icon: Building },
] as const;

const INTERVIEW_ROUNDS = [
  { value: 1, label: '第一轮' },
  { value: 2, label: '第二轮' },
  { value: 3, label: '第三轮' },
  { value: 4, label: '第四轮' },
  { value: 5, label: '最终轮' },
] as const;

const INTERVIEW_DURATIONS = [
  { value: 30, label: '30分钟' },
  { value: 45, label: '45分钟' },
  { value: 60, label: '1小时' },
  { value: 90, label: '1.5小时' },
  { value: 120, label: '2小时' },
] as const;

// 辅助函数
function isValidUrl(string: string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

interface InterviewFormDialogProps {
  interview?: Interview;
  candidateId?: string;
  candidateName?: string;
  jobId?: string;
  trigger?: React.ReactNode;
  onSuccess?: (interview: Interview) => void;
  onCancel?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  existingInterview?: Interview;
}

export function InterviewFormDialog({
  interview: interviewProp,
  candidateId,
  candidateName,
  jobId,
  trigger,
  onSuccess,
  onCancel,
  open: openProp,
  onOpenChange,
  existingInterview,
}: InterviewFormDialogProps) {
  const interview = existingInterview || interviewProp;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp !== undefined ? openProp : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isEditing = !!interview;

  // 初始表单状态
  const getInitialFormData = () => ({
    candidateId: candidateId || interview?.candidateId || "",
    jobId: jobId || interview?.jobId || "",
    type: interview?.type || "screening",
    round: interview?.round || 1,
    scheduledDate: interview?.scheduledDate ?
      new Date(interview.scheduledDate).toISOString().slice(0, 16) : "",
    duration: interview?.duration || 60,
    location: interview?.location || "",
    meetingLink: interview?.meetingLink || "",
    interviewerId: interview?.interviewerId || "",
    notes: interview?.interviewerNotes || "",
    status: interview?.status || "scheduled",
  });

  // 表单状态
  const [formData, setFormData] = useState(getInitialFormData());

  // 重置表单
  const resetForm = () => {
    setFormData(getInitialFormData());
  };

  // 获取候选人列表
  const { data: candidates } = useQuery<Candidate[]>({
    queryKey: ["/api/candidates"],
  });

  // 获取职位列表
  const { data: jobs } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  // 获取用户列表（面试官）
  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // 创建面试
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return retryFetchJSON("/api/interviews", {
        method: "POST",
        body: JSON.stringify(data),
      }, {
        maxRetries: 3,
        retryDelay: 1000,
        exponentialBackoff: true,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/interviews"] });
      toast({
        title: "创建成功",
        description: "面试已成功安排",
      });
      onSuccess?.(data);
      resetForm();
      setOpen(false);
    },
    onError: (error) => {
      toast({
        title: "创建失败",
        description: getUserFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  // 更新面试
  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return retryFetchJSON(`/api/interviews/${interview?.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }, {
        maxRetries: 3,
        retryDelay: 1000,
        exponentialBackoff: true,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/interviews"] });
      toast({
        title: "更新成功",
        description: "面试信息已更新",
      });
      onSuccess?.(data);
      resetForm();
      setOpen(false);
    },
    onError: (error) => {
      toast({
        title: "更新失败",
        description: getUserFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  // 取消面试
  const cancelMutation = useMutation({
    mutationFn: async () => {
      return retryFetchJSON(`/api/interviews/${interview?.id}/cancel`, {
        method: "POST",
      }, {
        maxRetries: 2,
        retryDelay: 500,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interviews"] });
      toast({
        title: "取消成功",
        description: "面试已取消",
      });
      onCancel?.();
      resetForm();
      setOpen(false);
      setShowCancelDialog(false);
    },
    onError: (error) => {
      toast({
        title: "取消失败",
        description: getUserFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  // 表单验证
  const validateForm = () => {
    const errors = [];

    // 检查必填字段
    if (!formData.candidateId) errors.push("请选择候选人");
    if (!formData.jobId) errors.push("请选择职位");
    if (!formData.scheduledDate) errors.push("请选择面试时间");

    // 检查日期是否在未来
    if (formData.scheduledDate && !isEditing) {
      const scheduledTime = new Date(formData.scheduledDate);
      if (scheduledTime < new Date()) {
        errors.push("面试时间不能在过去");
      }
    }

    // 验证会议链接
    if (formData.meetingLink && !isValidUrl(formData.meetingLink)) {
      errors.push("请输入有效的会议链接");
    }

    if (errors.length > 0) {
      toast({
        title: "验证失败",
        description: errors.join("、"),
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (isEditing) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleCancel = () => {
    if (interview) {
      setShowCancelDialog(true);
    }
  };

  const confirmCancel = () => {
    cancelMutation.mutate();
  };

  // 使用 useMemo 优化计算
  const selectedCandidate = useMemo(
    () => candidates?.find(c => c.id === formData.candidateId),
    [candidates, formData.candidateId]
  );

  const selectedJob = useMemo(
    () => jobs?.find(j => j.id === formData.jobId),
    [jobs, formData.jobId]
  );

  const selectedInterviewer = useMemo(
    () => users?.find((u) => u.id === formData.interviewerId),
    [users, formData.interviewerId]
  );

  const isLoading = createMutation.isPending || updateMutation.isPending || cancelMutation.isPending;
  const isDataLoading = !candidates || !jobs || !users;

  return (
    <>
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) resetForm();
    }}>
      {trigger ? (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      ) : null}
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "编辑面试信息" : "安排新面试"}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? "更新面试的详细信息" : "为候选人安排一场新的面试"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] px-1">
          {isDataLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">加载数据中...</span>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-6 pr-4">
            {/* 候选人和职位选择 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="candidate">候选人 *</Label>
                <Select
                  value={formData.candidateId}
                  onValueChange={(value) => setFormData({ ...formData, candidateId: value })}
                  disabled={!!candidateId}
                >
                  <SelectTrigger id="candidate">
                    <SelectValue placeholder="选择候选人">
                      {selectedCandidate && (
                        <div className="flex items-center gap-2">
                          <UserIcon className="h-4 w-4" />
                          <span>{selectedCandidate.name}</span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {candidates?.map((candidate) => (
                      <SelectItem key={candidate.id} value={candidate.id}>
                        <div className="flex items-center gap-2">
                          <span>{candidate.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {candidate.status}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="job">职位 *</Label>
                <Select
                  value={formData.jobId}
                  onValueChange={(value) => setFormData({ ...formData, jobId: value })}
                  disabled={!!jobId}
                >
                  <SelectTrigger id="job">
                    <SelectValue placeholder="选择职位">
                      {selectedJob && (
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          <span>{selectedJob.title}</span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {jobs?.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        <div className="flex flex-col">
                          <span>{job.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {job.department} · {job.location}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 面试类型和轮次 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">面试类型</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVIEW_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          <span>{type.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="round">面试轮次</Label>
                <Select
                  value={formData.round.toString()}
                  onValueChange={(value) => setFormData({ ...formData, round: parseInt(value) })}
                >
                  <SelectTrigger id="round">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVIEW_ROUNDS.map((round) => (
                      <SelectItem key={round.value} value={round.value.toString()}>
                        {round.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 时间和时长 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scheduledDate">面试时间 *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="scheduledDate"
                    type="datetime-local"
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">预计时长</Label>
                <Select
                  value={formData.duration.toString()}
                  onValueChange={(value) => setFormData({ ...formData, duration: parseInt(value) })}
                >
                  <SelectTrigger id="duration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVIEW_DURATIONS.map((duration) => (
                      <SelectItem key={duration.value} value={duration.value.toString()}>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{duration.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 地点和链接 */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="location">面试地点</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="location"
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="例如：会议室A / 线上"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="meetingLink">会议链接</Label>
                <div className="relative">
                  <Video className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="meetingLink"
                    type="url"
                    value={formData.meetingLink}
                    onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                    placeholder="https://zoom.us/..."
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* 面试官 */}
            <div className="space-y-2">
              <Label htmlFor="interviewer">面试官</Label>
              <Select
                value={formData.interviewerId}
                onValueChange={(value) => setFormData({ ...formData, interviewerId: value })}
              >
                <SelectTrigger id="interviewer">
                  <SelectValue placeholder="选择面试官">
                    {selectedInterviewer && (
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4" />
                        <span>{selectedInterviewer.name}</span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {users?.map((user: any) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <span>{user.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {user.role}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 备注 */}
            <div className="space-y-2">
              <Label htmlFor="notes">备注</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="添加面试相关的备注信息..."
                rows={3}
              />
            </div>

            {/* 状态提示 */}
            {interview?.status === "completed" && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  这场面试已完成，修改信息不会影响面试记录
                </AlertDescription>
              </Alert>
            )}

            {/* 操作按钮 */}
            <div className="flex justify-between pt-4">
              <div>
                {isEditing && interview?.status === "scheduled" && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleCancel}
                    disabled={isLoading}
                  >
                    {cancelMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        取消中...
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 mr-2" />
                        取消面试
                      </>
                    )}
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isLoading}
                >
                  关闭
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {isEditing ? "保存更改" : "创建面试"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>

    {/* 取消确认对话框 */}
    <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认取消面试</AlertDialogTitle>
          <AlertDialogDescription>
            确定要取消这场面试吗？此操作不可撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>返回</AlertDialogCancel>
          <AlertDialogAction onClick={confirmCancel}>
            确认取消
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}