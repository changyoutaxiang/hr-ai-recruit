import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/ui/sidebar";
import { CandidateCard } from "@/components/candidate-card";
import { ResumeUploader } from "@/components/resume-uploader";
import { BulkResumeUploader } from "@/components/bulk-resume-uploader";
import { CandidateJobMatches } from "@/components/candidate-job-matches";
import { useCandidates } from "@/hooks/use-candidates";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";
import type { Candidate } from "@shared/schema";
import { 
  Search, 
  Filter, 
  Plus, 
  Users,
  Download,
  Upload,
  Brain,
  X
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import type { ResumeAnalysisResult } from "@/types";

export default function Candidates() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [selectedCandidateForResume, setSelectedCandidateForResume] = useState<string | null>(null);
  const [selectedCandidateForMatches, setSelectedCandidateForMatches] = useState<string | null>(null);
  const [candidateToDelete, setCandidateToDelete] = useState<string | null>(null);
  const { toast } = useToast();
  
  const { 
    data: candidates, 
    isLoading, 
    error 
  } = useCandidates(searchQuery);

  const createCandidateMutation = useMutation({
    mutationFn: async (candidateData: any) => {
      const response = await apiRequest("POST", "/api/candidates", candidateData);
      return response.json();
    },
    onSuccess: (newCandidate) => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      setIsCreateDialogOpen(false);
      setSelectedCandidateForResume(newCandidate.id);
      toast({
        title: t('candidates.candidateCreated'),
        description: t('candidates.candidateCreatedDesc'),
      });
    },
    onError: () => {
      toast({
        title: t('error.generic'),
        description: t('candidates.createCandidateError'),
        variant: "destructive",
      });
    },
  });

  const deleteCandidateMutation = useMutation({
    mutationFn: async (candidateId: string) => {
      const response = await apiRequest("DELETE", `/api/candidates/${candidateId}`);
      // 204 No Content 不会有响应体
      if (response.status === 204) {
        return { success: true };
      }
      return response.json();
    },
    // 乐观更新：立即从列表中移除候选人
    onMutate: async (candidateId: string) => {
      // 取消任何正在进行的候选人查询（使用前缀匹配，匹配所有 "candidates" 开头的查询）
      await queryClient.cancelQueries({ queryKey: ["candidates"] });

      // 保存所有候选人查询的快照用于回滚
      const previousData = queryClient.getQueriesData<Candidate[]>({ queryKey: ["candidates"] });

      // 乐观更新：从所有候选人查询中移除该候选人
      queryClient.setQueriesData<Candidate[]>(
        { queryKey: ["candidates"] },
        (old) => old?.filter(c => c.id !== candidateId) ?? []
      );

      // 返回回滚数据
      return { previousData };
    },
    onSuccess: () => {
      // 使所有候选人查询缓存失效（前缀匹配，包括不同的搜索参数）
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      setCandidateToDelete(null);
      toast({
        title: t('candidates.candidateDeleted'),
        description: t('candidates.candidateDeletedDesc'),
      });
    },
    onError: async (error: any, candidateId: string, context) => {
      // 回滚乐观更新：恢复所有候选人查询的快照
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      setCandidateToDelete(null);

      let errorMessage = t('candidates.deleteCandidateError');
      let errorDetails = '';

      try {
        // 尝试解析错误消息中的 JSON 响应
        if (error.message) {
          // apiRequest 抛出的错误格式: "409: {json}"
          const match = error.message.match(/^(\d+):\s*(.+)$/);
          if (match) {
            const [, statusCode, responseText] = match;

            // 只处理 409 Conflict 错误
            if (statusCode === '409') {
              try {
                const errorData = JSON.parse(responseText);

                // 检查是否有详细信息
                if (errorData.details) {
                  const { interviews, jobMatches } = errorData.details;
                  if (typeof interviews === 'number' && typeof jobMatches === 'number') {
                    errorDetails = t('candidates.deleteRelatedRecords', {
                      interviews: interviews.toString(),
                      jobMatches: jobMatches.toString()
                    });
                  }
                }
              } catch (jsonError) {
                console.error('[Delete Candidate] Failed to parse error JSON:', jsonError);
              }
            }
          }
        }
      } catch (parseError) {
        console.error('[Delete Candidate] Failed to parse error message:', parseError);
      }

      toast({
        title: t('error.generic'),
        description: errorDetails ? `${errorMessage}\n${errorDetails}` : errorMessage,
        variant: "destructive",
      });
    },
  });

  const filteredCandidates = candidates?.filter(candidate => {
    const matchesStatus = statusFilter === "all" || candidate.status === statusFilter;
    const matchesSource = sourceFilter === "all" || candidate.source === sourceFilter;
    return matchesStatus && matchesSource;
  }) || [];

  const candidateStats = {
    total: candidates?.length || 0,
    applied: candidates?.filter(c => c.status === "applied").length || 0,
    screening: candidates?.filter(c => c.status === "screening").length || 0,
    interview: candidates?.filter(c => c.status === "interview").length || 0,
    hired: candidates?.filter(c => c.status === "hired").length || 0,
  };

  const handleCreateCandidate = (formData: any) => {
    createCandidateMutation.mutate({
      name: formData.name,
      email: formData.email,
      phone: formData.phone || null,
      position: formData.position || null,
      location: formData.location || null,
      source: formData.source || "manual",
      status: "applied",
    });
  };

  const handleResumeAnalysisComplete = (analysis: ResumeAnalysisResult) => {
    queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
    setSelectedCandidateForResume(null);
    toast({
      title: t('candidates.resumeAnalysisComplete'),
      description: t('candidates.resumeAnalysisCompleteDesc'),
    });
  };

  const handleDeleteCandidate = (candidateId: string) => {
    setCandidateToDelete(candidateId);
  };

  const confirmDeleteCandidate = () => {
    if (candidateToDelete) {
      deleteCandidateMutation.mutate(candidateToDelete);
    }
  };

  if (error) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-destructive">{t('candidates.failedToLoad')}</p>
            <Button onClick={() => window.location.reload()} className="mt-2">
              {t('jobs.retry')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (selectedCandidateForMatches) {
    const selectedCandidate = candidates?.find(c => c.id === selectedCandidateForMatches);

    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-card border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-foreground">
                  Job Matches: {selectedCandidate?.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  AI-ranked positions for this candidate
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setSelectedCandidateForMatches(null)}
                data-testid="button-back-to-candidates"
              >
                <X className="w-4 h-4 mr-2" />
                {t('candidates.backToCandidates')}
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6">
            <CandidateJobMatches candidateId={selectedCandidateForMatches} />
          </main>
        </div>
      </div>
    );
  }

  if (selectedCandidateForResume) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-card border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-foreground">{t('candidates.resumeUpload')}</h1>
                <p className="text-sm text-muted-foreground">
                  {t('candidates.resumeUploadDesc')}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setSelectedCandidateForResume(null)}
                data-testid="button-back-to-candidates"
              >
                <X className="w-4 h-4 mr-2" />
                {t('candidates.backToCandidates')}
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6">
            <ResumeUploader
              candidateId={selectedCandidateForResume}
              onAnalysisComplete={handleResumeAnalysisComplete}
              onCandidateUpdate={(candidate) => {
                queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
              }}
            />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">{t('candidates.pageTitle')}</h1>
              <p className="text-sm text-muted-foreground">
                {t('candidates.pageSubtitle')}
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button 
                variant="outline" 
                data-testid="button-import-candidates"
                onClick={() => setIsBulkUploadOpen(true)}
              >
                <Upload className="w-4 h-4 mr-2" />
                {t('candidates.importCandidates')}
              </Button>
              <Button variant="outline" data-testid="button-export-candidates">
                <Download className="w-4 h-4 mr-2" />
                {t('candidates.exportCandidates')}
              </Button>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-candidate">
                    <Plus className="w-4 h-4 mr-2" />
                    {t('candidates.addCandidate')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('candidates.addNewCandidate')}</DialogTitle>
                  </DialogHeader>
                  <CandidateForm 
                    onSubmit={handleCreateCandidate}
                    isLoading={createCandidateMutation.isPending}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </header>

        {/* Filters and Stats */}
        <div className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder={t('candidates.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                  data-testid="input-search-candidates"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" data-testid="select-status-filter">
                  <SelectValue placeholder={t('jobs.allStatuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('jobs.allStatuses')}</SelectItem>
                  <SelectItem value="applied">{t('candidates.applied')}</SelectItem>
                  <SelectItem value="screening">{t('candidates.screening')}</SelectItem>
                  <SelectItem value="interview">{t('candidates.interview')}</SelectItem>
                  <SelectItem value="offer">Offer</SelectItem>
                  <SelectItem value="hired">{t('candidates.hired')}</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-40" data-testid="select-source-filter">
                  <SelectValue placeholder={t('candidates.allSources')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('candidates.allSources')}</SelectItem>
                  <SelectItem value="manual">{t('candidates.manual')}</SelectItem>
                  <SelectItem value="linkedin">{t('candidates.linkedin')}</SelectItem>
                  <SelectItem value="job_board">{t('candidates.jobBoard')}</SelectItem>
                  <SelectItem value="referral">{t('candidates.referral')}</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" data-testid="button-advanced-filters">
                <Filter className="w-4 h-4 mr-2" />
                {t('jobs.moreFilters')}
              </Button>
            </div>

            <div className="text-sm text-muted-foreground" data-testid="text-candidate-count">
              {t('candidates.candidateCount', { filtered: filteredCandidates.length.toString(), total: candidateStats.total.toString() })}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" data-testid="badge-applied">
                {t('candidates.applied')}: {candidateStats.applied}
              </Badge>
              <Badge variant="secondary" data-testid="badge-screening">
                {t('candidates.screening')}: {candidateStats.screening}
              </Badge>
              <Badge variant="secondary" data-testid="badge-interview">
                {t('candidates.interview')}: {candidateStats.interview}
              </Badge>
              <Badge variant="secondary" data-testid="badge-hired">
                {t('candidates.hired')}: {candidateStats.hired}
              </Badge>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredCandidates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCandidates.map((candidate) => (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  onUploadResume={() => setSelectedCandidateForResume(candidate.id)}
                  onViewMatches={(candidateId) => setSelectedCandidateForMatches(candidateId)}
                  onDelete={() => handleDeleteCandidate(candidate.id)}
                  data-testid={`card-candidate-${candidate.id}`}
                />
              ))}
            </div>
          ) : (
            <Card className="h-64">
              <CardContent className="flex flex-col items-center justify-center h-full text-center">
                <Users className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {searchQuery || statusFilter !== "all" || sourceFilter !== "all" ? t('candidates.noCandidatesFound') : t('candidates.noCandidatesYet')}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchQuery || statusFilter !== "all" || sourceFilter !== "all"
                    ? t('jobs.adjustFilters') 
                    : t('candidates.getStartedCandidate')
                  }
                </p>
                {!searchQuery && statusFilter === "all" && sourceFilter === "all" && (
                  <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-add-first-candidate">
                    <Plus className="w-4 h-4 mr-2" />
                    {t('candidates.addFirstCandidate')}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </main>
      </div>

      {/* Bulk Resume Uploader */}
      <BulkResumeUploader
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        onComplete={(results) => {
          // 刷新候选人列表
          queryClient.invalidateQueries({ queryKey: ["candidates"] });
          setIsBulkUploadOpen(false);

          const successCount = results.filter(r => r.status === 'success').length;
          if (successCount > 0) {
            toast({
              title: "批量导入成功",
              description: `成功导入 ${successCount} 个候选人`,
            });
          }
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!candidateToDelete} onOpenChange={(open) => !open && setCandidateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('candidates.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('candidates.deleteConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('candidates.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteCandidate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCandidateMutation.isPending ? t('common.deleting') : t('candidates.deleteButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface CandidateFormProps {
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

function CandidateForm({ onSubmit, isLoading }: CandidateFormProps) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    position: "",
    location: "",
    source: "manual",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">{t('candidates.formName')}</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            data-testid="input-candidate-name"
          />
        </div>
        <div>
          <label className="text-sm font-medium">{t('candidates.formEmail')}</label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            data-testid="input-candidate-email"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">{t('candidates.formPhone')}</label>
          <Input
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            data-testid="input-candidate-phone"
          />
        </div>
        <div>
          <label className="text-sm font-medium">{t('candidates.formPosition')}</label>
          <Input
            value={formData.position}
            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
            data-testid="input-candidate-position"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">{t('candidates.formLocation')}</label>
          <Input
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            data-testid="input-candidate-location"
          />
        </div>
        <div>
          <label className="text-sm font-medium">{t('candidates.formSource')}</label>
          <Select value={formData.source} onValueChange={(value) => setFormData({ ...formData, source: value })}>
            <SelectTrigger data-testid="select-candidate-source">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">{t('candidates.manual')}</SelectItem>
              <SelectItem value="linkedin">{t('candidates.linkedin')}</SelectItem>
              <SelectItem value="job_board">{t('candidates.jobBoard')}</SelectItem>
              <SelectItem value="referral">{t('candidates.referral')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="submit" disabled={isLoading} data-testid="button-create-candidate">
          {isLoading ? t('candidates.creating') : t('candidates.createCandidate')}
        </Button>
      </div>
    </form>
  );
}
