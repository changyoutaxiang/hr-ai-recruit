import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

interface DashboardMetrics {
  totalCandidates: number;
  activeJobs: number;
  upcomingInterviews: number;
  interviewRate: number;
  hireRate: number;
  funnel: {
    applied: number;
    screening: number;
    interview: number;
    hired: number;
  };
}

export function useReports() {
  return useQuery<DashboardMetrics>({
    queryKey: ["reports", "metrics"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/dashboard/metrics");
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      // 不重试认证错误
      if (error?.message?.includes('401')) return false;
      return failureCount < 3;
    },
  });
}