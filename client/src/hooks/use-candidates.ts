import { useQuery } from "@tanstack/react-query";
import { type Candidate } from "@shared/schema";
import { apiRequest } from "@/lib/api";

export function useCandidates(searchQuery?: string) {
  return useQuery<Candidate[]>({
    queryKey: ["candidates", { search: searchQuery }],
    queryFn: async ({ queryKey }) => {
      const [, params] = queryKey as [string, { search?: string }];
      const searchParams = new URLSearchParams();
      
      if (params.search) {
        searchParams.append("search", params.search);
      }
      
      const url = searchParams.toString() ? `/api/candidates?${searchParams}` : "/api/candidates";
      const response = await apiRequest("GET", url);
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

export function useCandidate(id: string) {
  return useQuery<Candidate>({
    queryKey: ["candidates", id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/candidates/${id}`);
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
