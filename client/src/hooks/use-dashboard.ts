import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

export interface DashboardMetrics {
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

export function useDashboardMetrics(timeRange?: string) {
  return useQuery<DashboardMetrics>({
    queryKey: ["dashboard", "metrics", timeRange || "30"],
    queryFn: async () => {
      const url = timeRange
        ? `/api/dashboard/metrics?timeRange=${timeRange}`
        : "/api/dashboard/metrics";
      const response = await apiRequest("GET", url);
      return response.json();
    },
  });
}