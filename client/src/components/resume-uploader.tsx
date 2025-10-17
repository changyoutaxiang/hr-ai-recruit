import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import ObjectUploader from "@/components/ObjectUploader";
import { ResumeAnalysis } from "@/components/resume-analysis";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { retryFetch, retryPost } from "@/lib/retry-fetch";
import { getUserFriendlyErrorMessage } from "@/lib/error-handling";
import { apiRequest } from "@/lib/api";
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Brain,
  Loader2
} from "lucide-react";
import type { ResumeAnalysisResult } from "@/types";

interface ResumeUploaderProps {
  candidateId: string;
  onAnalysisComplete?: (analysis: ResumeAnalysisResult) => void;
  onCandidateUpdate?: (candidate: any) => void;
}

export function ResumeUploader({ 
  candidateId, 
  onAnalysisComplete, 
  onCandidateUpdate 
}: ResumeUploaderProps) {
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "processing" | "complete" | "error">("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<ResumeAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const processResumeMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("resume", file);

      const response = await retryFetch(`/api/candidates/${candidateId}/resume`, {
        method: "POST",
        body: formData,
        credentials: "include",
      }, {
        maxRetries: 3,
        retryDelay: 2000,
        exponentialBackoff: true,
        timeout: 60000, // 文件上传需要更长超时时间
      });

      return response.json();
    },
    onSuccess: (data: ResumeAnalysisResult & { profile?: { id: string; version: number; generated: boolean }; profileError?: string }) => {
      setAnalysisResult(data);
      setUploadStatus("complete");
      onAnalysisComplete?.(data);
      onCandidateUpdate?.(data.candidate);

      if (data.profile?.generated) {
        toast({
          title: "简历分析完成",
          description: `AI 分析已完成，初始画像（版本 ${data.profile.version}）已自动生成！`,
        });
      } else if (data.profileError) {
        toast({
          title: "简历分析完成",
          description: "AI 分析已完成，但画像生成失败。您可以稍后在候选人详情页手动生成。",
          variant: "default",
        });
      } else {
        toast({
          title: "简历分析完成",
          description: "AI 分析已完成，请查看下方分析结果。",
        });
      }
    },
    onError: (error: Error) => {
      setUploadStatus("error");
      const friendlyMessage = getUserFriendlyErrorMessage(error);
      setError(friendlyMessage);
      toast({
        title: "简历处理失败",
        description: friendlyMessage,
        variant: "destructive",
      });
    },
  });

  const analyzeUploadedResumeMutation = useMutation({
    mutationFn: async (filePath: string) => {
      const response = await retryFetch(`/api/candidates/${candidateId}/analyze-uploaded-resume`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filePath }),
        credentials: "include",
      }, {
        maxRetries: 3,
        retryDelay: 2000,
        exponentialBackoff: true,
        timeout: 60000,
      });

      return response.json();
    },
    onSuccess: (data: ResumeAnalysisResult & { profile?: { id: string; version: number; generated: boolean }; profileError?: string }) => {
      setAnalysisResult(data);
      setUploadStatus("complete");
      onAnalysisComplete?.(data);
      onCandidateUpdate?.(data.candidate);

      if (data.profile?.generated) {
        toast({
          title: "简历分析完成",
          description: `AI 分析已完成，初始画像（版本 ${data.profile.version}）已自动生成！`,
        });
      } else if (data.profileError) {
        toast({
          title: "简历分析完成",
          description: "AI 分析已完成，但画像生成失败。您可以稍后在候选人详情页手动生成。",
          variant: "default",
        });
      } else {
        toast({
          title: "简历分析完成",
          description: "AI 分析已完成，请查看下方分析结果。",
        });
      }
    },
    onError: (error: Error) => {
      setUploadStatus("error");
      const friendlyMessage = getUserFriendlyErrorMessage(error);
      setError(friendlyMessage);
      toast({
        title: "简历处理失败",
        description: friendlyMessage,
        variant: "destructive",
      });
    },
  });



  const handleFileUpload = async (result: any) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      setUploadStatus("processing");
      setUploadProgress(100);
      
      // The proxy endpoint returns the analysis result directly
      // Check if we have response data from the proxy endpoint
      if (uploadedFile.response && uploadedFile.response.body) {
        try {
          const responseData = uploadedFile.response.body;
          if (responseData.analysis) {
            // Direct analysis result from proxy endpoint
            setAnalysisResult(responseData.analysis);
            setUploadStatus("complete");
            onAnalysisComplete?.(responseData.analysis);
            onCandidateUpdate?.(responseData.analysis.candidate);
            
            if (responseData.profile?.generated) {
              toast({
                title: "简历分析完成",
                description: `AI 分析已完成，初始画像（版本 ${responseData.profile.version}）已自动生成！`,
              });
            } else {
              toast({
                title: "简历分析完成",
                description: "AI 分析已完成，请查看下方分析结果。",
              });
            }
            return;
          }
        } catch (parseError) {
          console.error('Failed to parse response:', parseError);
        }
      }
      
      // Fallback: if no direct analysis, extract file path and analyze separately
      const uploadUrl = uploadedFile.uploadURL || uploadedFile.url;
      if (uploadUrl) {
        const urlParts = uploadUrl.split('/');
        const bucketIndex = urlParts.indexOf('resumes');
        if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
          const filePath = urlParts.slice(bucketIndex + 1).join('/');
          console.log('Extracted file path:', filePath);
          analyzeUploadedResumeMutation.mutate(filePath);
        } else {
          console.error('Could not extract file path from upload URL:', uploadUrl);
          setUploadStatus("error");
          setError("无法从上传结果中提取文件路径");
        }
      } else {
        console.error('No upload URL found in result:', uploadedFile);
        setUploadStatus("error");
        setError("上传结果中缺少文件URL");
      }
    }
  };

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case "uploading":
        return <Loader2 className="w-5 h-5 animate-spin text-blue-600" />;
      case "processing":
        return <Brain className="w-5 h-5 text-purple-600" />;
      case "complete":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <FileText className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    switch (uploadStatus) {
      case "uploading":
        return "Uploading resume...";
      case "processing":
        return "Processing with AI...";
      case "complete":
        return "Analysis complete";
      case "error":
        return "Upload failed";
      default:
        return "Ready to upload";
    }
  };

  if (analysisResult) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span>Resume Analysis Complete</span>
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAnalysisResult(null);
                  setUploadStatus("idle");
                  setError(null);
                }}
                data-testid="button-upload-another"
              >
                Upload Another Resume
              </Button>
            </div>
          </CardHeader>
        </Card>
        
        <ResumeAnalysis analysis={analysisResult} />
      </div>
    );
  }

  return (
    <Card data-testid="card-resume-uploader">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="w-5 h-5" />
          <span>Resume Upload & Analysis</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Status */}
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div className="flex-1">
            <p className="text-sm font-medium" data-testid="text-upload-status">
              {getStatusText()}
            </p>
            {(uploadStatus === "uploading" || uploadStatus === "processing") && (
              <Progress value={uploadProgress} className="mt-2" />
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-destructive" />
              <p className="text-sm text-destructive" data-testid="text-error">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* Upload Instructions */}
        {uploadStatus === "idle" && (
          <div className="text-center space-y-4">
            <div className="p-8 border-2 border-dashed border-border rounded-lg">
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Upload Resume for AI Analysis
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Support for PDF and text files. Maximum file size: 10MB
              </p>
              
              <ObjectUploader
                maxNumberOfFiles={1}
                maxFileSize={10 * 1024 * 1024} // 10MB
                candidateId={candidateId}
                onComplete={handleFileUpload}
                buttonClassName="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose Resume File
              </ObjectUploader>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <Brain className="w-8 h-8 text-primary mx-auto mb-2" />
                <h4 className="font-medium">AI Analysis</h4>
                <p className="text-muted-foreground">
                  Extract skills, experience, and insights
                </p>
              </div>
              <div className="text-center">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <h4 className="font-medium">Auto-Population</h4>
                <p className="text-muted-foreground">
                  Automatically fill candidate profile
                </p>
              </div>
              <div className="text-center">
                <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <h4 className="font-medium">Smart Matching</h4>
                <p className="text-muted-foreground">
                  Match to relevant job positions
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Processing Status */}
        {(uploadStatus === "uploading" || uploadStatus === "processing") && (
          <div className="text-center space-y-4">
            <div className="p-8 bg-accent rounded-lg">
              {uploadStatus === "uploading" ? (
                <>
                  <Upload className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Uploading Resume
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Secure upload in progress...
                  </p>
                </>
              ) : (
                <>
                  <Brain className="w-12 h-12 text-purple-600 mx-auto mb-4 animate-pulse" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    AI Analysis in Progress
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Extracting skills, experience, and generating insights...
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
