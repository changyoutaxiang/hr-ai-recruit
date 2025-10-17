import { useQuery } from "@tanstack/react-query";
import { type Job } from "@shared/schema";
import { apiRequest } from "@/lib/api";

export function useJobs() {
  return useQuery<Job[]>({
    queryKey: ["jobs"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/jobs");
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

export function useJob(id: string) {
  return useQuery<Job>({
    queryKey: ["jobs", id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/jobs/${id}`);
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
