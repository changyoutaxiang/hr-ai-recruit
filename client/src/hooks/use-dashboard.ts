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

export function useDashboardMetrics() {
  return useQuery<DashboardMetrics>({
    queryKey: ["dashboard", "metrics"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/dashboard/metrics");
      return response.json();
    },
  });
}