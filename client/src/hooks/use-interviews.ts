import { useQuery } from "@tanstack/react-query";
import { type Interview } from "@shared/schema";
import { apiRequest } from "@/lib/api";

export function useInterviews() {
  return useQuery<Interview[]>({
    queryKey: ["interviews"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/interviews");
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2分钟缓存时间
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // 对于认证错误不重试
      if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

export function useInterview(id: string) {
  return useQuery<Interview>({
    queryKey: ["interviews", id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/interviews/${id}`);
      return response.json();
    },
    enabled: !!id, // 只有在有ID时才执行查询
    staleTime: 5 * 60 * 1000, // 5分钟缓存时间
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // 对于认证错误不重试
      if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

export function useInterviewsByCandidate(candidateId: string) {
  return useQuery<Interview[]>({
    queryKey: ["interviews", "candidate", candidateId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/interviews?candidateId=${candidateId}`);
      return response.json();
    },
    enabled: !!candidateId, // 只有在有candidateId时才执行查询
    staleTime: 3 * 60 * 1000, // 3分钟缓存时间
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // 对于认证错误不重试
      if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
        return false;
      }
      return failureCount < 2;
    },
  });
}
