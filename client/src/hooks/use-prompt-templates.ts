import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/api";

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

export function usePromptTemplates() {
  return useQuery<PromptTemplate[]>({
    queryKey: ["/api/prompt-templates"],
  });
}

export function usePromptTemplate(id: string) {
  return useQuery<PromptTemplate>({
    queryKey: ["/api/prompt-templates", id],
    enabled: !!id,
  });
}

export function usePromptTemplatesByCategory(category: string) {
  return useQuery<PromptTemplate[]>({
    queryKey: ["/api/prompt-templates", "category", category],
    queryFn: async () => {
      const response = await fetch(`/api/prompt-templates?category=${category}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: !!category,
  });
}

export function useCreatePromptTemplate() {
  return useMutation({
    mutationFn: async (template: Omit<PromptTemplate, "id" | "createdAt" | "updatedAt">) => {
      const response = await apiRequest("POST", "/api/prompt-templates", template);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prompt-templates"] });
    },
  });
}

export function useUpdatePromptTemplate() {
  return useMutation({
    mutationFn: async ({ id, ...template }: Partial<PromptTemplate> & { id: string }) => {
      const response = await apiRequest("PUT", `/api/prompt-templates/${id}`, template);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prompt-templates"] });
    },
  });
}

export function useDeletePromptTemplate() {
  return useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/prompt-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prompt-templates"] });
    },
  });
}
