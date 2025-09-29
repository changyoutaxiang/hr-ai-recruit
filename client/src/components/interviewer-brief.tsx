import { memo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  FileText,
  Download,
  Printer,
  User,
  Target,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  GraduationCap,
  Star,
  MessageSquare,
  Shield,
  Crown,
  Brain,
  Lightbulb,
  Calendar,
  Mail,
  Phone,
  MapPin
} from "lucide-react";
import type { Candidate, CandidateProfile, ProfileData } from "@shared/schema";
import { profileDataSchema } from "@shared/schema";
import { getScoreBgColor, getScoreLabel, formatShortDate } from "@/lib/profile-utils";

interface InterviewerBriefProps {
  candidate: Candidate;
  profile: CandidateProfile;
  jobTitle?: string;
  interviewRound?: number;
  interviewType?: "technical" | "behavioral" | "cultural" | "final";
}

export const InterviewerBrief = memo<InterviewerBriefProps>(({
  candidate,
  profile,
  jobTitle,
  interviewRound = 1,
  interviewType = "behavioral"
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const profileData = profileDataSchema.safeParse(profile.profileData);
  if (!profileData.success) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>画像数据格式错误，无法生成简报。</AlertDescription>
      </Alert>
    );
  }

  const data: ProfileData = profileData.data;
  const organizationalFit = data.organizationalFit;
  const overallScore = parseFloat(profile.overallScore || "0");
  const strengths = (profile.strengths as string[]) || [];
  const concerns = (profile.concerns as string[]) || [];
  const gaps = (profile.gaps as string[]) || [];

  // 生成面试问题建议
  const generateInterviewQuestions = () => {
    const questions = [];

    // 基于面试类型生成问题
    if (interviewType === "technical") {
      // 技术面试问题
      if (data.technicalSkills) {
        const topSkills = data.technicalSkills.slice(0, 2);
        topSkills.forEach(skill => {
          questions.push({
            category: "技术深度",
            question: `请详细介绍您在${skill.skill}方面的实践经验，特别是${skill.evidenceSource}`,
            purpose: "验证技术掌握深度"
          });
        });
      }

      if (gaps.length > 0) {
        questions.push({
          category: "技术缺口",
          question: `我们注意到您在${gaps[0]}方面的经验较少，您如何看待这个技术栈？`,
          purpose: "评估学习能力和意愿"
        });
      }
    } else if (interviewType === "behavioral") {
      // 行为面试问题
      questions.push({
        category: "团队协作",
        question: "请分享一个您与困难同事成功合作的经历",
        purpose: "评估团队协作能力"
      });

      questions.push({
        category: "问题解决",
        question: "描述一次您面对重大挑战时的处理过程和结果",
        purpose: "评估抗压能力和解决问题能力"
      });

      if (data.culturalFit?.workStyle) {
        questions.push({
          category: "工作风格",
          question: `您提到自己${data.culturalFit.workStyle}，能举个具体例子吗？`,
          purpose: "验证工作风格匹配度"
        });
      }
    } else if (interviewType === "cultural") {
      // 文化契合面试问题
      if (organizationalFit?.cultureAssessment) {
        const lowestValue = organizationalFit.cultureAssessment.valueAssessments
          .sort((a, b) => a.score - b.score)[0];
        if (lowestValue) {
          questions.push({
            category: "价值观",
            question: `您如何理解${lowestValue.valueName}在工作中的重要性？`,
            purpose: `评估${lowestValue.valueName}价值观契合度`
          });
        }
      }

      questions.push({
        category: "团队文化",
        question: "您理想的团队文化是什么样的？",
        purpose: "评估文化偏好匹配度"
      });
    } else if (interviewType === "final") {
      // 终面问题
      questions.push({
        category: "职业规划",
        question: "未来3-5年，您希望达到什么样的职业目标？",
        purpose: "评估长期发展匹配度"
      });

      questions.push({
        category: "动机",
        question: "是什么吸引您加入我们公司？",
        purpose: "评估加入动机真实性"
      });

      if (concerns.length > 0) {
        questions.push({
          category: "顾虑澄清",
          question: `关于${concerns[0]}，您能详细解释一下情况吗？`,
          purpose: "澄清潜在顾虑"
        });
      }
    }

    return questions;
  };

  const interviewQuestions = generateInterviewQuestions();

  // 打印功能 - 修复内存泄漏
  const handlePrint = () => {
    if (printRef.current) {
      const printContent = printRef.current.innerHTML;
      const printWindow = window.open("", "", "width=800,height=600");
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>面试官简报 - ${candidate.name}</title>
              <style>
                body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; }
                h1 { color: #333; font-size: 24px; }
                h2 { color: #555; font-size: 18px; margin-top: 20px; }
                h3 { color: #666; font-size: 16px; margin-top: 15px; }
                .section { margin-bottom: 20px; }
                .badge { display: inline-block; padding: 4px 8px; margin: 2px; background: #f0f0f0; border-radius: 4px; font-size: 12px; }
                .score { font-weight: bold; font-size: 20px; }
                .divider { border-top: 1px solid #e0e0e0; margin: 15px 0; }
                @media print { body { margin: 0; } }
              </style>
            </head>
            <body>${printContent}</body>
          </html>
        `);
        printWindow.document.close();

        // 添加打印后关闭窗口的处理
        printWindow.onafterprint = () => {
          printWindow.close();
        };

        printWindow.print();

        // 设置超时自动关闭，防止用户取消打印后窗口留存
        setTimeout(() => {
          if (!printWindow.closed) {
            printWindow.close();
          }
        }, 60000); // 60秒后自动关闭
      }
    }
  };

  // 下载为PDF（简化版，实际项目中可使用jsPDF等库）
  const handleDownload = () => {
    const content = document.createElement("div");
    content.innerHTML = printRef.current?.innerHTML || "";
    const blob = new Blob([content.outerHTML], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `interviewer-brief-${candidate.name}-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* 操作按钮 */}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          打印简报
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          下载简报
        </Button>
      </div>

      {/* 简报内容 */}
      <div ref={printRef}>
        <Card className="print:shadow-none">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <FileText className="h-6 w-6" />
                  面试官简报
                </CardTitle>
                <CardDescription className="mt-2">
                  第 {interviewRound} 轮面试 · {formatShortDate(new Date())}
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-sm">
                {interviewType === "technical" && "技术面试"}
                {interviewType === "behavioral" && "行为面试"}
                {interviewType === "cultural" && "文化面试"}
                {interviewType === "final" && "终面"}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* 候选人基本信息 */}
            <section className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />
                候选人信息
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">姓名：</span>
                  <span className="font-medium ml-2">{candidate.name}</span>
                </div>
                {jobTitle && (
                  <div>
                    <span className="text-muted-foreground">应聘职位：</span>
                    <span className="font-medium ml-2">{jobTitle}</span>
                  </div>
                )}
                {candidate.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">邮箱：</span>
                    <span className="ml-2">{candidate.email}</span>
                  </div>
                )}
                {candidate.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">电话：</span>
                    <span className="ml-2">{candidate.phone}</span>
                  </div>
                )}
                {candidate.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">地点：</span>
                    <span className="ml-2">{candidate.location}</span>
                  </div>
                )}
                {candidate.experience != null && (
                  <div className="flex items-center gap-1">
                    <Briefcase className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">经验：</span>
                    <span className="ml-2">{candidate.experience} 年</span>
                  </div>
                )}
                {candidate.education && (
                  <div className="flex items-center gap-1">
                    <GraduationCap className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">学历：</span>
                    <span className="ml-2">{candidate.education}</span>
                  </div>
                )}
              </div>
            </section>

            <Separator />

            {/* 综合评分 */}
            <section className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2 text-lg">
                <Target className="h-5 w-5" />
                综合评估
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className={`text-2xl font-bold`}>
                    {overallScore}
                  </div>
                  <div className="text-xs text-muted-foreground">综合匹配度</div>
                  <Badge className={`mt-2 ${getScoreBgColor(overallScore)}`}>
                    {getScoreLabel(overallScore)}
                  </Badge>
                </div>

                {organizationalFit?.cultureAssessment && (
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className={`text-2xl font-bold`}>
                      {organizationalFit.cultureAssessment.overallScore}
                    </div>
                    <div className="text-xs text-muted-foreground">文化契合度</div>
                    <Badge className={`mt-2 ${getScoreBgColor(organizationalFit.cultureAssessment.overallScore)}`}>
                      {getScoreLabel(organizationalFit.cultureAssessment.overallScore)}
                    </Badge>
                  </div>
                )}

                {organizationalFit?.leadershipAssessment && (
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className={`text-2xl font-bold`}>
                      {organizationalFit.leadershipAssessment.overallScore}
                    </div>
                    <div className="text-xs text-muted-foreground">领导力潜力</div>
                    <Badge className={`mt-2 ${getScoreBgColor(organizationalFit.leadershipAssessment.overallScore)}`}>
                      {getScoreLabel(organizationalFit.leadershipAssessment.overallScore)}
                    </Badge>
                  </div>
                )}
              </div>
            </section>

            <Separator />

            {/* 关键洞察 */}
            <section className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2 text-lg">
                <Brain className="h-5 w-5" />
                关键洞察
              </h3>

              <div className="grid md:grid-cols-3 gap-4">
                {strengths.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-1 text-green-700">
                      <CheckCircle2 className="h-4 w-4" />
                      核心优势
                    </h4>
                    <ul className="text-sm space-y-1">
                      {strengths.slice(0, 3).map((strength, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-green-600 mt-0.5">•</span>
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {concerns.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-1 text-orange-700">
                      <AlertCircle className="h-4 w-4" />
                      需要关注
                    </h4>
                    <ul className="text-sm space-y-1">
                      {concerns.slice(0, 3).map((concern, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-orange-600 mt-0.5">•</span>
                          <span>{concern}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {gaps.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-1 text-blue-700">
                      <Lightbulb className="h-4 w-4" />
                      待验证
                    </h4>
                    <ul className="text-sm space-y-1">
                      {gaps.slice(0, 3).map((gap, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-blue-600 mt-0.5">•</span>
                          <span>{gap}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>

            <Separator />

            {/* 核心技能快照 */}
            {data.technicalSkills && data.technicalSkills.length > 0 && (
              <>
                <section className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2 text-lg">
                    <Star className="h-5 w-5" />
                    核心技能
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {data.technicalSkills.slice(0, 6).map((skill) => (
                      <Badge key={skill.skill} variant="secondary">
                        {skill.skill} · {skill.proficiency}
                      </Badge>
                    ))}
                  </div>
                </section>
                <Separator />
              </>
            )}

            {/* 建议面试问题 */}
            <section className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2 text-lg">
                <MessageSquare className="h-5 w-5" />
                建议面试问题
              </h3>
              <div className="space-y-3">
                {interviewQuestions.map((q, i) => (
                  <div key={i} className="p-3 bg-muted/30 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {q.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        目的: {q.purpose}
                      </span>
                    </div>
                    <p className="text-sm font-medium">
                      {i + 1}. {q.question}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <Separator />

            {/* 面试提醒 */}
            <section className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5" />
                面试要点
              </h3>
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-1">重点考察</h4>
                  <ul className="text-blue-800 space-y-1">
                    {interviewType === "technical" && (
                      <>
                        <li>• 技术深度和广度</li>
                        <li>• 问题解决思路</li>
                        <li>• 代码质量意识</li>
                      </>
                    )}
                    {interviewType === "behavioral" && (
                      <>
                        <li>• 团队协作能力</li>
                        <li>• 沟通表达能力</li>
                        <li>• 抗压和适应能力</li>
                      </>
                    )}
                    {interviewType === "cultural" && (
                      <>
                        <li>• 价值观契合度</li>
                        <li>• 工作动机真实性</li>
                        <li>• 长期发展意愿</li>
                      </>
                    )}
                    {interviewType === "final" && (
                      <>
                        <li>• 综合素质评估</li>
                        <li>• 薪资期望合理性</li>
                        <li>• 入职意愿强度</li>
                      </>
                    )}
                  </ul>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <h4 className="font-medium text-amber-900 mb-1">注意事项</h4>
                  <ul className="text-amber-800 space-y-1">
                    <li>• 保持客观公正的态度</li>
                    <li>• 给候选人充分表达机会</li>
                    <li>• 记录具体事例而非印象</li>
                    {concerns.length > 0 && (
                      <li className="font-medium">• 特别关注: {concerns[0]}</li>
                    )}
                  </ul>
                </div>
              </div>
            </section>

            {/* AI 总结 */}
            {profile.aiSummary && (
              <>
                <Separator />
                <section className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2 text-lg">
                    <Brain className="h-5 w-5" />
                    AI 总结
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {profile.aiSummary}
                  </p>
                </section>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

InterviewerBrief.displayName = "InterviewerBrief";