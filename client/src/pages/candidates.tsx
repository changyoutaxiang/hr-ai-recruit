import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/ui/sidebar";
import { CandidateCard } from "@/components/candidate-card";
import { ResumeUploader } from "@/components/resume-uploader";
import { useCandidates } from "@/hooks/use-candidates";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
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
import type { ResumeAnalysisResult } from "@/types";

export default function Candidates() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCandidateForResume, setSelectedCandidateForResume] = useState<string | null>(null);
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
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      setIsCreateDialogOpen(false);
      setSelectedCandidateForResume(newCandidate.id);
      toast({
        title: "Candidate created",
        description: "New candidate has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create candidate.",
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
      title: "Resume analysis complete",
      description: "Candidate profile has been updated with AI insights.",
    });
  };

  if (error) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-destructive">Failed to load candidates</p>
            <Button onClick={() => window.location.reload()} className="mt-2">
              Retry
            </Button>
          </div>
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
                <h1 className="text-2xl font-semibold text-foreground">Resume Upload</h1>
                <p className="text-sm text-muted-foreground">
                  Upload and analyze candidate resume
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setSelectedCandidateForResume(null)}
                data-testid="button-back-to-candidates"
              >
                <X className="w-4 h-4 mr-2" />
                Back to Candidates
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
              <h1 className="text-2xl font-semibold text-foreground">Candidates</h1>
              <p className="text-sm text-muted-foreground">
                Manage and track your candidate pipeline
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button variant="outline" data-testid="button-import-candidates">
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
              <Button variant="outline" data-testid="button-export-candidates">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-candidate">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Candidate
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Candidate</DialogTitle>
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
                  placeholder="Search candidates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                  data-testid="input-search-candidates"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" data-testid="select-status-filter">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="applied">Applied</SelectItem>
                  <SelectItem value="screening">Screening</SelectItem>
                  <SelectItem value="interview">Interview</SelectItem>
                  <SelectItem value="offer">Offer</SelectItem>
                  <SelectItem value="hired">Hired</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-40" data-testid="select-source-filter">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="job_board">Job Board</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" data-testid="button-advanced-filters">
                <Filter className="w-4 h-4 mr-2" />
                More Filters
              </Button>
            </div>

            <div className="text-sm text-muted-foreground" data-testid="text-candidate-count">
              {filteredCandidates.length} of {candidateStats.total} candidates
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" data-testid="badge-applied">
                Applied: {candidateStats.applied}
              </Badge>
              <Badge variant="secondary" data-testid="badge-screening">
                Screening: {candidateStats.screening}
              </Badge>
              <Badge variant="secondary" data-testid="badge-interview">
                Interview: {candidateStats.interview}
              </Badge>
              <Badge variant="secondary" data-testid="badge-hired">
                Hired: {candidateStats.hired}
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
                  data-testid={`card-candidate-${candidate.id}`}
                />
              ))}
            </div>
          ) : (
            <Card className="h-64">
              <CardContent className="flex flex-col items-center justify-center h-full text-center">
                <Users className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {searchQuery || statusFilter !== "all" || sourceFilter !== "all" ? "No candidates found" : "No candidates yet"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchQuery || statusFilter !== "all" || sourceFilter !== "all"
                    ? "Try adjusting your search or filters" 
                    : "Get started by adding your first candidate"
                  }
                </p>
                {!searchQuery && statusFilter === "all" && sourceFilter === "all" && (
                  <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-add-first-candidate">
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Candidate
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}

interface CandidateFormProps {
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

function CandidateForm({ onSubmit, isLoading }: CandidateFormProps) {
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
          <label className="text-sm font-medium">Name *</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            data-testid="input-candidate-name"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Email *</label>
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
          <label className="text-sm font-medium">Phone</label>
          <Input
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            data-testid="input-candidate-phone"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Position</label>
          <Input
            value={formData.position}
            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
            data-testid="input-candidate-position"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Location</label>
          <Input
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            data-testid="input-candidate-location"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Source</label>
          <Select value={formData.source} onValueChange={(value) => setFormData({ ...formData, source: value })}>
            <SelectTrigger data-testid="select-candidate-source">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="linkedin">LinkedIn</SelectItem>
              <SelectItem value="job_board">Job Board</SelectItem>
              <SelectItem value="referral">Referral</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="submit" disabled={isLoading} data-testid="button-create-candidate">
          {isLoading ? "Creating..." : "Create Candidate"}
        </Button>
      </div>
    </form>
  );
}
