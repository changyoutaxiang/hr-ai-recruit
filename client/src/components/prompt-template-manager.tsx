import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Copy, 
  FileText,
  Brain,
  Users,
  MessageSquare,
  Filter,
  Search
} from "lucide-react";

interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: "resume_analysis" | "job_matching" | "interview_questions" | "candidate_screening" | "general";
  template: string;
  variables: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const categoryIcons = {
  resume_analysis: FileText,
  job_matching: Users,
  interview_questions: MessageSquare,
  candidate_screening: Filter,
  general: Brain,
};

const categoryLabels = {
  resume_analysis: "Resume Analysis",
  job_matching: "Job Matching",
  interview_questions: "Interview Questions",
  candidate_screening: "Candidate Screening",
  general: "General",
};

export function PromptTemplateManager() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const { toast } = useToast();

  const { data: templates, isLoading } = useQuery<PromptTemplate[]>({
    queryKey: ["/api/prompt-templates"],
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (template: Omit<PromptTemplate, "id" | "createdAt" | "updatedAt">) => {
      const response = await apiRequest("POST", "/api/prompt-templates", template);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prompt-templates"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Template created",
        description: "Prompt template has been created successfully.",
      });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, ...template }: Partial<PromptTemplate> & { id: string }) => {
      const response = await apiRequest("PUT", `/api/prompt-templates/${id}`, template);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prompt-templates"] });
      setEditingTemplate(null);
      toast({
        title: "Template updated",
        description: "Prompt template has been updated successfully.",
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/prompt-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prompt-templates"] });
      toast({
        title: "Template deleted",
        description: "Prompt template has been deleted successfully.",
      });
    },
  });

  const filteredTemplates = templates?.filter(template => {
    const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  }) || [];

  const handleDeleteTemplate = (id: string) => {
    if (window.confirm("Are you sure you want to delete this template?")) {
      deleteTemplateMutation.mutate(id);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Template copied to clipboard",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="w-5 h-5" />
                <span>Prompt Templates</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage AI prompt templates for consistent and effective interactions
              </p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-template">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Prompt Template</DialogTitle>
                </DialogHeader>
                <TemplateForm 
                  onSubmit={(data) => createTemplateMutation.mutate(data)}
                  isLoading={createTemplateMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-templates"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48" data-testid="select-category-filter">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredTemplates.map((template) => {
            const IconComponent = categoryIcons[template.category];
            return (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <IconComponent className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground" data-testid={`text-template-name-${template.id}`}>
                          {template.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {template.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Badge 
                        variant={template.isActive ? "default" : "secondary"}
                        data-testid={`badge-status-${template.id}`}
                      >
                        {template.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div>
                    <Badge variant="outline" className="text-xs">
                      {categoryLabels[template.category]}
                    </Badge>
                  </div>

                  {/* Variables */}
                  {template.variables.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Variables:</p>
                      <div className="flex flex-wrap gap-1">
                        {template.variables.map((variable, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {`{{${variable}}}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Template Preview */}
                  <div className="p-3 bg-accent rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Template Preview</p>
                    <p className="text-sm text-accent-foreground line-clamp-3" data-testid={`text-template-preview-${template.id}`}>
                      {template.template.substring(0, 200)}...
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(template.template)}
                      data-testid={`button-copy-${template.id}`}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingTemplate(template)}
                      data-testid={`button-edit-${template.id}`}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteTemplate(template.id)}
                      disabled={deleteTemplateMutation.isPending}
                      data-testid={`button-delete-${template.id}`}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>

                  <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                    Updated {new Date(template.updatedAt).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {filteredTemplates.length === 0 && !isLoading && (
        <Card className="h-64">
          <CardContent className="flex flex-col items-center justify-center h-full text-center">
            <Brain className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {searchQuery || selectedCategory !== "all" ? "No templates found" : "No templates yet"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery || selectedCategory !== "all" 
                ? "Try adjusting your search or filters" 
                : "Create your first prompt template to get started"
              }
            </p>
            {!searchQuery && selectedCategory === "all" && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Template
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Template Dialog */}
      {editingTemplate && (
        <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Prompt Template</DialogTitle>
            </DialogHeader>
            <TemplateForm 
              template={editingTemplate}
              onSubmit={(data) => updateTemplateMutation.mutate({ ...data, id: editingTemplate.id })}
              isLoading={updateTemplateMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

interface TemplateFormProps {
  template?: PromptTemplate;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

function TemplateForm({ template, onSubmit, isLoading }: TemplateFormProps) {
  const [formData, setFormData] = useState({
    name: template?.name || "",
    description: template?.description || "",
    category: template?.category || "general",
    template: template?.template || "",
    isActive: template?.isActive ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Extract variables from template
    const regex = /{{([^}]+)}}/g;
    const variables: string[] = [];
    let match;
    
    while ((match = regex.exec(formData.template)) !== null) {
      const variable = match[1].trim();
      if (!variables.includes(variable)) {
        variables.push(variable);
      }
    }

    onSubmit({
      ...formData,
      variables,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Name</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            data-testid="input-template-name"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Category</label>
          <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value as any })}>
            <SelectTrigger data-testid="select-template-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(categoryLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Description</label>
        <Input
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
          data-testid="input-template-description"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Template</label>
        <Textarea
          value={formData.template}
          onChange={(e) => setFormData({ ...formData, template: e.target.value })}
          rows={10}
          placeholder="Enter your prompt template. Use {{variableName}} for variables."
          required
          data-testid="textarea-template-content"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Use double curly braces for variables: {`{{variableName}}`}
        </p>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="isActive"
          checked={formData.isActive}
          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
          data-testid="checkbox-template-active"
        />
        <label htmlFor="isActive" className="text-sm font-medium">
          Active
        </label>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="submit" disabled={isLoading} data-testid="button-save-template">
          {isLoading ? "Saving..." : "Save Template"}
        </Button>
      </div>
    </form>
  );
}
