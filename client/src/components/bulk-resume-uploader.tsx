import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase";
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Loader2,
  X,
  Users
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BulkResumeUploaderProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (results: any[]) => void;
}

interface UploadResult {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  candidate?: any;
  error?: string;
  progress?: number;
}

export function BulkResumeUploader({ isOpen, onClose, onComplete }: BulkResumeUploaderProps) {
  const supabase = getSupabaseClient();
  const [files, setFiles] = useState<File[]>([]);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [currentUploadIndex, setCurrentUploadIndex] = useState(0);
  const { toast } = useToast();

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length !== selectedFiles.length) {
      toast({
        title: "文件类型错误",
        description: "只支持PDF格式的简历文件",
        variant: "destructive",
      });
    }
    
    setFiles(pdfFiles);
    setUploadResults(pdfFiles.map(file => ({ file, status: 'pending' })));
  }, [toast]);

  const uploadSingleResume = async (
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<any> => {
    const formData = new FormData();
    formData.append("resumes", file);

    // 获取当前 session 的 JWT token
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // 上传进度监听
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          onProgress?.(percentComplete);
        }
      };

      // 请求完成
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new Error('解析响应失败'));
          }
        } else {
          reject(new Error(`${xhr.status}: ${xhr.responseText || xhr.statusText}`));
        }
      };

      // 请求错误
      xhr.onerror = () => {
        reject(new Error('网络错误，上传失败'));
      };

      // 请求超时
      xhr.ontimeout = () => {
        reject(new Error('上传超时，请重试'));
      };

      // 配置请求
      xhr.open('POST', '/api/candidates/bulk-upload');
      xhr.timeout = 60000; // 60秒超时

      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.withCredentials = true;
      xhr.send(formData);
    });
  };

  const bulkUploadMutation = useMutation({
    mutationFn: async () => {
      setIsUploading(true);
      const results: UploadResult[] = [...uploadResults];

      // 并发上传配置：同时最多上传 3 个文件
      const CONCURRENT_UPLOADS = 3;
      const chunks: File[][] = [];

      // 将文件分组
      for (let i = 0; i < files.length; i += CONCURRENT_UPLOADS) {
        chunks.push(files.slice(i, i + CONCURRENT_UPLOADS));
      }

      // 逐组并发上传
      for (const chunk of chunks) {
        const chunkPromises = chunk.map((file, chunkIndex) => {
          const globalIndex = files.indexOf(file);

          return uploadSingleResume(file, (progress) => {
            // 实时更新进度
            results[globalIndex].progress = progress;
            setUploadResults([...results]);
          })
            .then((candidate) => {
              results[globalIndex].status = 'success';
              results[globalIndex].candidate = candidate;
              results[globalIndex].progress = 100;
              return { index: globalIndex, status: 'success' as const, candidate };
            })
            .catch((error: any) => {
              results[globalIndex].status = 'error';
              results[globalIndex].error = error.message || '上传失败';
              results[globalIndex].progress = 0;
              return { index: globalIndex, status: 'error' as const, error: error.message };
            });
        });

        // 等待当前组所有文件上传完成（无论成功或失败）
        results[files.indexOf(chunk[0])].status = 'uploading';
        setUploadResults([...results]);

        await Promise.allSettled(chunkPromises);

        // 更新 UI
        setUploadResults([...results]);
      }

      return results;
    },
    onSuccess: (results) => {
      setIsUploading(false);
      const successCount = results.filter(r => r.status === 'success').length;
      const errorCount = results.filter(r => r.status === 'error').length;
      
      toast({
        title: "批量导入完成",
        description: `成功导入 ${successCount} 个候选人，失败 ${errorCount} 个`,
        variant: successCount > 0 ? "default" : "destructive",
      });
      
      onComplete?.(results);
    },
    onError: (error: any) => {
      setIsUploading(false);
      toast({
        title: "批量导入失败",
        description: error.message || "请稍后重试",
        variant: "destructive",
      });
    },
  });

  const handleUpload = () => {
    if (files.length === 0) {
      toast({
        title: "请选择文件",
        description: "请先选择要上传的简历文件",
        variant: "destructive",
      });
      return;
    }
    
    bulkUploadMutation.mutate();
  };

  const handleClose = () => {
    if (!isUploading) {
      setFiles([]);
      setUploadResults([]);
      setCurrentUploadIndex(0);
      onClose();
    }
  };

  const getStatusIcon = (status: UploadResult['status']) => {
    switch (status) {
      case 'pending':
        return <FileText className="w-4 h-4 text-muted-foreground" />;
      case 'uploading':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: UploadResult['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">等待中</Badge>;
      case 'uploading':
        return <Badge variant="default">上传中</Badge>;
      case 'success':
        return <Badge variant="default" className="bg-green-500">成功</Badge>;
      case 'error':
        return <Badge variant="destructive">失败</Badge>;
    }
  };

  const overallProgress = files.length > 0 ? 
    (uploadResults.filter(r => r.status === 'success' || r.status === 'error').length / files.length) * 100 : 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            批量导入简历
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 文件选择区域 */}
          {files.length === 0 && (
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">选择简历文件</h3>
              <p className="text-sm text-muted-foreground mb-4">
                支持批量选择PDF格式的简历文件
              </p>
              <input
                type="file"
                multiple
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
                id="bulk-file-input"
                disabled={isUploading}
              />
              <label htmlFor="bulk-file-input">
                <Button asChild disabled={isUploading}>
                  <span>选择文件</span>
                </Button>
              </label>
            </div>
          )}

          {/* 文件列表和进度 */}
          {files.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">
                  已选择 {files.length} 个文件
                </h3>
                {!isUploading && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFiles([]);
                      setUploadResults([]);
                    }}
                  >
                    <X className="w-4 h-4 mr-2" />
                    清空
                  </Button>
                )}
              </div>

              {/* 总体进度 */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>总体进度</span>
                    <span>{Math.round(overallProgress)}%</span>
                  </div>
                  <Progress value={overallProgress} />
                </div>
              )}

              {/* 文件列表 */}
              <ScrollArea className="h-64 border rounded-lg p-4">
                <div className="space-y-3">
                  {uploadResults.map((result, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        result.status === 'uploading' ? 'bg-blue-50 border-blue-200' : 
                        result.status === 'success' ? 'bg-green-50 border-green-200' :
                        result.status === 'error' ? 'bg-red-50 border-red-200' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {getStatusIcon(result.status)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {result.file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(result.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                          {result.error && (
                            <p className="text-xs text-red-500 mt-1">
                              {result.error}
                            </p>
                          )}
                          {result.candidate && (
                            <p className="text-xs text-green-600 mt-1">
                              已创建候选人: {result.candidate.name}
                            </p>
                          )}
                          {result.status === 'uploading' && result.progress !== undefined && (
                            <div className="mt-2">
                              <Progress value={result.progress} className="h-1" />
                              <p className="text-xs text-muted-foreground mt-1">
                                {result.progress}%
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(result.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* 操作按钮 */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {uploadResults.filter(r => r.status === 'success').length} 成功, {' '}
                  {uploadResults.filter(r => r.status === 'error').length} 失败
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleClose}
                    disabled={isUploading}
                  >
                    {isUploading ? '上传中...' : '关闭'}
                  </Button>
                  {!isUploading && uploadResults.every(r => r.status === 'pending') && (
                    <Button onClick={handleUpload}>
                      开始导入
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 提示信息 */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              系统将自动解析简历内容并创建候选人档案。请确保简历文件格式正确且内容清晰。
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  );
}
