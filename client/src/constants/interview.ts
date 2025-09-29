import { User2, Video, Brain, Users, Building2, Mic, FileAudio, Bot } from "lucide-react";

export const INTERVIEW_TYPE_MAP: Record<string, { label: string; icon: any; color: string; bgColor: string }> = {
  screening: {
    label: "初筛面试",
    icon: User2,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  technical: {
    label: "技术面试",
    icon: Brain,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
  behavioral: {
    label: "行为面试",
    icon: Users,
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  final: {
    label: "终面",
    icon: Building2,
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
  onsite: {
    label: "现场面试",
    icon: Video,
    color: "text-orange-600",
    bgColor: "bg-orange-100",
  },
};

export const INTERVIEW_STATUS_MAP: Record<string, { label: string; color: string; bgColor: string }> = {
  scheduled: {
    label: "已安排",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  completed: {
    label: "已完成",
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  cancelled: {
    label: "已取消",
    color: "text-gray-600",
    bgColor: "bg-gray-100",
  },
  no_show: {
    label: "未出席",
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
};

export const TRANSCRIPTION_METHOD_MAP: Record<string, { label: string; icon: any }> = {
  audio: {
    label: "音频记录",
    icon: Mic,
  },
  file: {
    label: "上传文件",
    icon: FileAudio,
  },
  ai: {
    label: "AI生成",
    icon: Bot,
  },
};

export const INTERVIEW_ROUNDS = [
  { value: 1, label: "第一轮" },
  { value: 2, label: "第二轮" },
  { value: 3, label: "第三轮" },
  { value: 4, label: "第四轮" },
  { value: 5, label: "最终轮" },
];