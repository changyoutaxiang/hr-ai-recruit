/**
 * 增强版面试反馈表单
 * 支持三种转录方式：手动输入、音频转文字、AI辅助
 */

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
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
  Save,
  Mic,
  MicOff,
  Upload,
  FileAudio,
  Keyboard,
  Bot,
  Loader2,
  PlayCircle,
  PauseCircle,
  RotateCcw,
  Download,
  Volume2,
  Zap,
  Info,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import type { Interview, Candidate } from "@shared/schema";

// 转录方式枚举
enum TranscriptionMethod {
  MANUAL = "manual",
  AUDIO = "audio",
  AI_ASSISTED = "ai_assisted"
}

// 音频录制状态
enum RecordingState {
  IDLE = "idle",
  RECORDING = "recording",
  PAUSED = "paused",
  PROCESSING = "processing",
  COMPLETED = "completed"
}

// AI 问题模板
const AI_QUESTION_TEMPLATES = {
  technical: [
    "请描述一个你最近解决的技术难题",
    "你如何看待代码质量和技术债务？",
    "介绍一个你主导的技术架构设计",
    "你如何保持技术的持续学习？"
  ],
  behavioral: [
    "描述一次你处理团队冲突的经历",
    "你如何管理多个优先级不同的任务？",
    "给我一个你失败但学到很多的例子",
    "你如何影响没有直接汇报关系的同事？"
  ],
  cultural: [
    "你理想的工作环境是什么样的？",
    "你如何定义成功？",
    "团队合作对你意味着什么？",
    "你的职业目标是什么？"
  ],
  leadership: [
    "你如何激励团队成员？",
    "描述你培养他人的一个例子",
    "你如何做出困难的决策？",
    "你如何处理团队中的低绩效者？"
  ]
};

interface InterviewFeedbackEnhancedProps {
  interview: Interview;
  candidate: Candidate;
  onSubmitSuccess?: () => void;
  onClose?: () => void;
}

export function InterviewFeedbackEnhanced({
  interview,
  candidate,
  onSubmitSuccess,
  onClose
}: InterviewFeedbackEnhancedProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 转录方式状态
  const [transcriptionMethod, setTranscriptionMethod] = useState<TranscriptionMethod>(TranscriptionMethod.MANUAL);
  const [showMethodGuide, setShowMethodGuide] = useState(true);

  // 音频录制相关状态
  const [recordingState, setRecordingState] = useState<RecordingState>(RecordingState.IDLE);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // AI 辅助状态
  const [aiAssistantActive, setAiAssistantActive] = useState(false);
  const [currentAiQuestion, setCurrentAiQuestion] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiQuestionCategory, setAiQuestionCategory] = useState<keyof typeof AI_QUESTION_TEMPLATES>("technical");

  // 转录内容
  const [transcription, setTranscription] = useState("");
  const [manualNotes, setManualNotes] = useState("");

  // 评分状态
  const [scores, setScores] = useState({
    technical: 70,
    communication: 70,
    problemSolving: 70,
    cultureFit: 70,
    leadership: 70,
    overall: 70
  });

  // 观察结果
  const [strengths, setStrengths] = useState<string[]>([]);
  const [weaknesses, setWeaknesses] = useState<string[]>([]);
  const [highlights, setHighlights] = useState<string[]>([]);
  const [redFlags, setRedFlags] = useState<string[]>([]);

  // AI 提取的关键发现
  const [aiKeyFindings, setAiKeyFindings] = useState<string[]>([]);
  const [aiConcernAreas, setAiConcernAreas] = useState<string[]>([]);

  // 建议
  const [recommendation, setRecommendation] = useState<string>('lean_hire');
  const [nextSteps, setNextSteps] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // 输入状态
  const [newStrength, setNewStrength] = useState('');
  const [newWeakness, setNewWeakness] = useState('');
  const [newHighlight, setNewHighlight] = useState('');
  const [newRedFlag, setNewRedFlag] = useState('');

  // 获取支持的音频格式
  const getAudioMimeType = () => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return 'audio/webm';
  };

  // 开始录音
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getAudioMimeType();
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mimeType = getAudioMimeType();
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(audioBlob);

        // 撤销旧的URL以防内存泄漏
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }

        const newUrl = URL.createObjectURL(audioBlob);
        if (isMountedRef.current) {
          setAudioUrl(newUrl);
        } else {
          URL.revokeObjectURL(newUrl);
        }
        setRecordingState(RecordingState.COMPLETED);

        // 停止所有音轨
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start();
      setRecordingState(RecordingState.RECORDING);

      // 开始计时
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      let errorMessage = "无法访问麦克风";

      if (error instanceof DOMException) {
        switch (error.name) {
          case 'NotAllowedError':
            errorMessage = "麦克风权限被拒绝，请在浏览器设置中允许访问麦克风";
            break;
          case 'NotFoundError':
            errorMessage = "未找到麦克风设备，请检查设备连接";
            break;
          case 'NotReadableError':
            errorMessage = "麦克风被其他应用占用，请关闭其他应用后重试";
            break;
          default:
            errorMessage = `录音错误：${error.message}`;
        }
      }

      toast({
        title: "录音失败",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  // 停止录音
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  // 暂停/恢复录音
  const togglePauseRecording = () => {
    if (mediaRecorderRef.current) {
      if (recordingState === RecordingState.RECORDING) {
        mediaRecorderRef.current.pause();
        setRecordingState(RecordingState.PAUSED);
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
        }
      } else if (recordingState === RecordingState.PAUSED) {
        mediaRecorderRef.current.resume();
        setRecordingState(RecordingState.RECORDING);
        recordingTimerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      }
    }
  };

  // 重置录音
  const resetRecording = () => {
    setRecordingState(RecordingState.IDLE);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setTranscriptionProgress(0);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  // 转录音频
  const transcribeAudio = async () => {
    if (!audioBlob) return;

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 创建新的 AbortController
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setRecordingState(RecordingState.PROCESSING);
    setTranscriptionProgress(0);

    // 模拟转录进度
    const progressInterval = setInterval(() => {
      if (isMountedRef.current) {
        setTranscriptionProgress(prev => Math.min(prev + 10, 90));
      }
    }, 500);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'interview-recording.wav');
      formData.append('interviewId', interview.id);

      const response = await apiRequest('POST', '/api/interviews/transcribe', formData, {
        signal: abortController.signal,
      });

      const data = await response.json();

      // 检查组件是否还挂载
      if (isMountedRef.current) {
        setTranscription(data.transcription);
        setAiKeyFindings(data.keyFindings || []);
        setAiConcernAreas(data.concernAreas || []);
        setTranscriptionProgress(100);
      }

      clearInterval(progressInterval);

      toast({
        title: "转录成功",
        description: "音频已成功转换为文字",
      });

    } catch (error) {
      clearInterval(progressInterval);
      console.error('Transcription error:', error);
      toast({
        title: "转录失败",
        description: "无法转录音频，请重试",
        variant: "destructive"
      });
      setRecordingState(RecordingState.COMPLETED);
    }
  };

  // 生成AI问题
  const generateAiQuestion = () => {
    const questions = AI_QUESTION_TEMPLATES[aiQuestionCategory];
    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
    setCurrentAiQuestion(randomQuestion);
    return randomQuestion;
  };

  // AI 辅助分析
  const analyzeWithAi = async () => {
    if (!transcription && !manualNotes) {
      toast({
        title: "无内容可分析",
        description: "请先输入或转录面试内容",
        variant: "destructive"
      });
      return;
    }

    setAiAssistantActive(true);

    try {
      const response = await apiRequest('POST', '/api/interviews/ai-analyze', {
        interviewId: interview.id,
        content: transcription || manualNotes,
        candidateInfo: {
          name: candidate.name,
          position: candidate.position,
          experience: candidate.experience
        }
      });

      const data = await response.json();

      // 更新AI建议
      setAiSuggestions(data.suggestions || []);
      setStrengths(prev => Array.from(new Set([...prev, ...(data.strengths || [])])));
      setWeaknesses(prev => Array.from(new Set([...prev, ...(data.weaknesses || [])])));
      setAiKeyFindings(data.keyFindings || []);
      setAiConcernAreas(data.concernAreas || []);

      // 更新评分建议
      if (data.suggestedScores) {
        setScores(prev => ({
          ...prev,
          ...data.suggestedScores
        }));
      }

      toast({
        title: "AI分析完成",
        description: "已生成智能建议和评分",
      });

    } catch (error) {
      console.error('AI analysis error:', error);
      toast({
        title: "AI分析失败",
        description: "无法完成智能分析，请重试",
        variant: "destructive"
      });
    } finally {
      setAiAssistantActive(false);
    }
  };

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 提交反馈
  const submitMutation = useMutation({
    mutationFn: async () => {
      const feedbackData = {
        interviewId: interview.id,
        interviewerId: interview.interviewerId,
        round: interview.round,
        interviewType: interview.type,
        transcriptionMethod,
        transcription: transcription || manualNotes,
        audioUrl: audioUrl,
        scores,
        observations: {
          strengths,
          weaknesses,
          redFlags: redFlags.length > 0 ? redFlags : undefined,
          highlights: highlights.length > 0 ? highlights : undefined
        },
        aiKeyFindings: aiKeyFindings.length > 0 ? aiKeyFindings : undefined,
        aiConcernAreas: aiConcernAreas.length > 0 ? aiConcernAreas : undefined,
        recommendation,
        nextSteps: nextSteps || undefined,
        additionalNotes: additionalNotes || undefined
      };

      const response = await apiRequest('POST', `/api/interviews/${interview.id}/feedback`, feedbackData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "反馈提交成功",
        description: "面试评价已保存，候选人画像已更新",
      });

      // 刷新相关数据
      queryClient.invalidateQueries({
        queryKey: [`/api/candidates/${candidate.id}/profiles`]
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/interviews/${interview.id}`]
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/interviews", { candidateId: candidate.id }]
      });

      if (onSubmitSuccess) {
        onSubmitSuccess();
      }

      if (onClose) {
        setTimeout(onClose, 1500);
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

  // 波形高度缓存
  const waveHeights = useMemo(() =>
    Array.from({ length: 20 }, () => Math.random() * 40 + 10),
    [recordingState]
  );

  // 清理资源
  useEffect(() => {
    return () => {
      isMountedRef.current = false;

      // 取消正在进行的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // 清理音频 URL
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }

      // 清理定时器
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      // 清理 MediaStream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      // 停止录音
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
      }
    };
  }, [audioUrl]);

  return (
    <Card className="max-w-6xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              增强版面试反馈表
            </CardTitle>
            <CardDescription>
              候选人：{candidate.name} · 职位：{candidate.position || '未指定'} · 第{interview.round}轮
            </CardDescription>
          </div>

          {/* 转录方式选择器 */}
          <Select value={transcriptionMethod} onValueChange={(v) => setTranscriptionMethod(v as TranscriptionMethod)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TranscriptionMethod.MANUAL}>
                <div className="flex items-center gap-2">
                  <Keyboard className="h-4 w-4" />
                  手动输入
                </div>
              </SelectItem>
              <SelectItem value={TranscriptionMethod.AUDIO}>
                <div className="flex items-center gap-2">
                  <Mic className="h-4 w-4" />
                  音频转文字
                </div>
              </SelectItem>
              <SelectItem value={TranscriptionMethod.AI_ASSISTED}>
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  AI辅助
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 方式指南 */}
        {showMethodGuide && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>转录方式说明</AlertTitle>
            <AlertDescription className="space-y-2 mt-2">
              {transcriptionMethod === TranscriptionMethod.MANUAL && (
                <p>手动输入模式：直接在文本框中输入面试记录和观察</p>
              )}
              {transcriptionMethod === TranscriptionMethod.AUDIO && (
                <p>音频转文字模式：录制或上传面试音频，自动转换为文字记录</p>
              )}
              {transcriptionMethod === TranscriptionMethod.AI_ASSISTED && (
                <p>AI辅助模式：使用AI提供的问题模板，智能分析候选人回答</p>
              )}
            </AlertDescription>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => setShowMethodGuide(false)}
            >
              <ChevronUp className="h-4 w-4 mr-1" />
              隐藏说明
            </Button>
          </Alert>
        )}

        {/* 根据不同转录方式显示不同界面 */}
        {transcriptionMethod === TranscriptionMethod.MANUAL && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>面试记录</Label>
              <Textarea
                placeholder="输入面试过程中的对话、观察和重要信息..."
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                rows={8}
                className="font-mono"
              />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {manualNotes.length} 字符
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={analyzeWithAi}
                  disabled={!manualNotes || aiAssistantActive}
                >
                  <Brain className="h-4 w-4 mr-2" />
                  AI分析
                </Button>
              </div>
            </div>
          </div>
        )}

        {transcriptionMethod === TranscriptionMethod.AUDIO && (
          <div className="space-y-4">
            {/* 录音控制 */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center space-x-4">
                  {recordingState === RecordingState.IDLE && (
                    <Button
                      size="lg"
                      onClick={startRecording}
                      className="gap-2"
                      aria-label="开始录制面试音频"
                    >
                      <Mic className="h-5 w-5" />
                      开始录音
                    </Button>
                  )}

                  {(recordingState === RecordingState.RECORDING || recordingState === RecordingState.PAUSED) && (
                    <>
                      <Button
                        size="lg"
                        variant={recordingState === RecordingState.PAUSED ? "default" : "secondary"}
                        onClick={togglePauseRecording}
                      >
                        {recordingState === RecordingState.PAUSED ? (
                          <><PlayCircle className="h-5 w-5 mr-2" /> 继续</>
                        ) : (
                          <><PauseCircle className="h-5 w-5 mr-2" /> 暂停</>
                        )}
                      </Button>
                      <Button
                        size="lg"
                        variant="destructive"
                        onClick={stopRecording}
                      >
                        <MicOff className="h-5 w-5 mr-2" />
                        停止录音
                      </Button>
                      <div className="text-2xl font-mono">
                        {formatTime(recordingTime)}
                      </div>
                    </>
                  )}

                  {recordingState === RecordingState.COMPLETED && (
                    <>
                      <audio controls src={audioUrl || undefined} className="w-64" />
                      <Button
                        variant="default"
                        onClick={transcribeAudio}
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        转录音频
                      </Button>
                      <Button
                        variant="outline"
                        onClick={resetRecording}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        重新录制
                      </Button>
                    </>
                  )}

                  {recordingState === RecordingState.PROCESSING && (
                    <div className="w-full max-w-md space-y-2">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>正在转录音频...</span>
                      </div>
                      <Progress
                        value={transcriptionProgress}
                        className="w-full"
                        role="progressbar"
                        aria-valuenow={transcriptionProgress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label="转录进度"
                      />
                    </div>
                  )}
                </div>

                {/* 录音波形可视化 */}
                {recordingState === RecordingState.RECORDING && (
                  <div className="mt-4 flex items-center justify-center space-x-1" role="img" aria-label="录音波形">
                    {waveHeights.map((height, i) => (
                      <div
                        key={i}
                        className="w-1 bg-primary animate-pulse"
                        style={{
                          height: `${height}px`,
                          animationDelay: `${i * 0.05}s`
                        }}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 转录结果 */}
            {transcription && (
              <div className="space-y-2">
                <Label>转录文本</Label>
                <ScrollArea className="h-48 w-full rounded-md border p-4">
                  <p className="text-sm whitespace-pre-wrap">{transcription}</p>
                </ScrollArea>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={analyzeWithAi}
                  disabled={aiAssistantActive}
                >
                  <Brain className="h-4 w-4 mr-2" />
                  AI深度分析
                </Button>
              </div>
            )}
          </div>
        )}

        {transcriptionMethod === TranscriptionMethod.AI_ASSISTED && (
          <div className="space-y-4">
            {/* AI 问题类别选择 */}
            <div className="space-y-2">
              <Label>问题类别</Label>
              <Select
                value={aiQuestionCategory}
                onValueChange={(v) => setAiQuestionCategory(v as keyof typeof AI_QUESTION_TEMPLATES)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technical">技术问题</SelectItem>
                  <SelectItem value="behavioral">行为问题</SelectItem>
                  <SelectItem value="cultural">文化契合</SelectItem>
                  <SelectItem value="leadership">领导力</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 当前AI问题 */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Label className="text-base">当前问题</Label>
                      <p className="mt-2 text-lg font-medium">
                        {currentAiQuestion || "点击生成问题开始"}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={generateAiQuestion}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      生成问题
                    </Button>
                  </div>

                  {/* 候选人回答记录 */}
                  {currentAiQuestion && (
                    <div className="space-y-2">
                      <Label>候选人回答</Label>
                      <Textarea
                        placeholder="记录候选人的回答..."
                        value={aiResponse}
                        onChange={(e) => setAiResponse(e.target.value)}
                        rows={4}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* AI 建议的后续问题 */}
            {aiSuggestions.length > 0 && (
              <div className="space-y-2">
                <Label>AI 建议的后续问题</Label>
                <div className="space-y-2">
                  {aiSuggestions.map((suggestion, i) => (
                    <Card key={i} className="p-3 cursor-pointer hover:bg-accent"
                      onClick={() => setCurrentAiQuestion(suggestion)}>
                      <p className="text-sm">{suggestion}</p>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* AI 提取的关键发现 */}
        {(aiKeyFindings.length > 0 || aiConcernAreas.length > 0) && (
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Brain className="h-4 w-4" />
              AI 智能分析
            </h3>

            {aiKeyFindings.length > 0 && (
              <div className="space-y-2">
                <Label className="text-green-600">关键发现</Label>
                <div className="flex flex-wrap gap-2">
                  {aiKeyFindings.map((finding, i) => (
                    <Badge key={i} variant="outline" className="gap-1 border-green-200 bg-green-50">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      {finding}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {aiConcernAreas.length > 0 && (
              <div className="space-y-2">
                <Label className="text-orange-600">关注领域</Label>
                <div className="flex flex-wrap gap-2">
                  {aiConcernAreas.map((concern, i) => (
                    <Badge key={i} variant="outline" className="gap-1 border-orange-200 bg-orange-50">
                      <AlertCircle className="h-3 w-3 text-orange-600" />
                      {concern}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* 评分和观察标签页 */}
        <Tabs defaultValue="scores" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="scores">评分</TabsTrigger>
            <TabsTrigger value="observations">观察</TabsTrigger>
            <TabsTrigger value="recommendation">建议</TabsTrigger>
          </TabsList>

          {/* 评分标签页 */}
          <TabsContent value="scores" className="space-y-4">
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

        <div className="flex justify-between gap-2">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending || (!transcription && !manualNotes && !aiResponse)}
            className="gap-2"
          >
            {submitMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                提交中...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                提交反馈
              </>
            )}
          </Button>
        </div>

        {submitMutation.isSuccess && (
          <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertDescription>
              反馈已成功提交，候选人画像已更新为第 {interview.round} 轮面试后版本
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}