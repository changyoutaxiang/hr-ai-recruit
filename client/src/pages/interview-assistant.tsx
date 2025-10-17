/**
 * AI面试助手页面
 * 提供完整的面试辅助功能入口
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useCandidates } from "@/hooks/use-candidates";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InterviewAssistant } from "@/components/interview-assistant";
import type { Candidate, Job, Interview } from "@shared/schema";
import {
  Brain,
  Users,
  Briefcase,
  Calendar,
  ArrowRight,
  Sparkles,
  Target,
  TrendingUp,
  FileText,
  Search
} from "lucide-react";

export default function InterviewAssistantPage() {
  const [, navigate] = useLocation();
  const [selectedCandidate, setSelectedCandidate] = useState<string>("");
  const [selectedJob, setSelectedJob] = useState<string>("");
  const [interviewRound, setInterviewRound] = useState<number>(1);
  const [interviewType, setInterviewType] = useState<string>("behavioral");
  const [showAssistant, setShowAssistant] = useState(false);

  // 获取候选人列表
  const { data: candidates = [] } = useCandidates();

  // 获取职位列表
  const { data: jobs = [] } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
    select: (data = []) => data,
  });

  // 获取即将进行的面试
  const { data: upcomingInterviews = [] } = useQuery<Interview[], Error, Interview[]>({
    queryKey: ["/api/interviews"],
    select: (interviews = []) =>
      interviews
        .filter((interview) => {
          if (!interview.scheduledDate) return false;
          const scheduledAt = new Date(interview.scheduledDate);
          return scheduledAt > new Date() && interview.status === "scheduled";
        })
        .slice(0, 5),
  });

  const selectedCandidateData = candidates.find((candidate) => candidate.id === selectedCandidate);
  const selectedJobData = jobs.find((job) => job.id === selectedJob);

  const startInterview = () => {
    if (selectedCandidate && selectedJob) {
      setShowAssistant(true);
    }
  };

  if (showAssistant && selectedCandidateData && selectedJobData) {
    return (
      <InterviewAssistant
        candidateId={selectedCandidate}
        candidateName={selectedCandidateData.name}
        jobId={selectedJob}
        jobTitle={selectedJobData.title}
        interviewRound={interviewRound}
        interviewType={interviewType}
        onComplete={() => {
          setShowAssistant(false);
          navigate("/interviews");
        }}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Brain className="h-8 w-8" />
          AI 面试助手
        </h1>
        <p className="text-muted-foreground mt-2">
          智能化面试支持，提供个性化问题推荐、实时辅助和专业评估框架
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 左侧：功能介绍 */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                核心功能
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Target className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium">智能问题推荐</h4>
                  <p className="text-sm text-muted-foreground">
                    基于候选人背景和岗位要求，生成个性化问题
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Brain className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <h4 className="font-medium">实时AI辅助</h4>
                  <p className="text-sm text-muted-foreground">
                    提供追问建议、关键点提醒和风险预警
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium">专业评估框架</h4>
                  <p className="text-sm text-muted-foreground">
                    多维度评分体系，确保评估客观公正
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <h4 className="font-medium">智能报告生成</h4>
                  <p className="text-sm text-muted-foreground">
                    自动生成专业的面试评估报告
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 使用统计 */}
          <Card>
            <CardHeader>
              <CardTitle>使用统计</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">本月面试</span>
                  <span className="font-medium">24 场</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">平均用时</span>
                  <span className="font-medium">45 分钟</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">决策准确率</span>
                  <span className="font-medium">92%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">满意度</span>
                  <span className="font-medium">4.8/5.0</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 中间：开始面试 */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>开始新的面试</CardTitle>
              <CardDescription>
                选择候选人和职位，AI助手将为您生成个性化的面试方案
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="candidate">选择候选人</Label>
                  <Select value={selectedCandidate} onValueChange={setSelectedCandidate}>
                    <SelectTrigger id="candidate">
                      <SelectValue placeholder="请选择候选人" />
                    </SelectTrigger>
                    <SelectContent>
                      {candidates?.map((candidate: any) => (
                        <SelectItem key={candidate.id} value={candidate.id}>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>{candidate.name}</span>
                            {candidate.position && (
                              <Badge variant="outline" className="ml-2">
                                {candidate.position}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="job">选择职位</Label>
                  <Select value={selectedJob} onValueChange={setSelectedJob}>
                    <SelectTrigger id="job">
                      <SelectValue placeholder="请选择职位" />
                    </SelectTrigger>
                    <SelectContent>
                      {jobs?.map((job: any) => (
                        <SelectItem key={job.id} value={job.id}>
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4" />
                            <span>{job.title}</span>
                            <Badge variant="outline" className="ml-2">
                              {job.department}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="round">面试轮次</Label>
                  <Select
                    value={interviewRound.toString()}
                    onValueChange={(v) => setInterviewRound(parseInt(v))}
                  >
                    <SelectTrigger id="round">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">第一轮（初试）</SelectItem>
                      <SelectItem value="2">第二轮（复试）</SelectItem>
                      <SelectItem value="3">第三轮（终面）</SelectItem>
                      <SelectItem value="4">第四轮（高管面）</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="type">面试类型</Label>
                  <Select value={interviewType} onValueChange={setInterviewType}>
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="behavioral">行为面试</SelectItem>
                      <SelectItem value="technical">技术面试</SelectItem>
                      <SelectItem value="culture_fit">文化面试</SelectItem>
                      <SelectItem value="competency">能力面试</SelectItem>
                      <SelectItem value="case_study">案例面试</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedCandidateData && selectedJobData && (
                <Alert>
                  <AlertDescription>
                    即将为 <strong>{selectedCandidateData.name}</strong> 进行{" "}
                    <strong>{selectedJobData.title}</strong> 职位的第 {interviewRound} 轮
                    {interviewType === "behavioral" ? "行为" :
                     interviewType === "technical" ? "技术" :
                     interviewType === "culture_fit" ? "文化" :
                     interviewType === "competency" ? "能力" : "案例"}
                    面试
                  </AlertDescription>
                </Alert>
              )}

              <Button
                className="w-full"
                size="lg"
                onClick={startInterview}
                disabled={!selectedCandidate || !selectedJob}
              >
                <Brain className="h-5 w-5 mr-2" />
                启动 AI 面试助手
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* 即将进行的面试 */}
          {upcomingInterviews && upcomingInterviews.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  即将进行的面试
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingInterviews.map((interview: any) => (
                    <div
                      key={interview.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedCandidate(interview.candidateId);
                        setSelectedJob(interview.jobId);
                        setInterviewRound(interview.round);
                      }}
                    >
                      <div>
                        <div className="font-medium">
                          {candidates?.find((c: any) => c.id === interview.candidateId)?.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {jobs?.find((j: any) => j.id === interview.jobId)?.title} ·
                          第 {interview.round} 轮 · {interview.type}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {new Date(interview.scheduledDate).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(interview.scheduledDate).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 最佳实践提示 */}
          <Card>
            <CardHeader>
              <CardTitle>面试最佳实践</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex items-start gap-2">
                  <div className="h-2 w-2 bg-green-600 rounded-full mt-1.5" />
                  <p className="text-sm">准备充分，提前了解候选人背景</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-2 w-2 bg-green-600 rounded-full mt-1.5" />
                  <p className="text-sm">使用STAR法则引导行为问题回答</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-2 w-2 bg-green-600 rounded-full mt-1.5" />
                  <p className="text-sm">保持客观，基于证据评估</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-2 w-2 bg-green-600 rounded-full mt-1.5" />
                  <p className="text-sm">给候选人充分的表达机会</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-2 w-2 bg-red-600 rounded-full mt-1.5" />
                  <p className="text-sm">避免引导性或诱导性问题</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-2 w-2 bg-red-600 rounded-full mt-1.5" />
                  <p className="text-sm">不要基于第一印象下结论</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
