import { useQuery } from "@tanstack/react-query";
import { type Job } from "@shared/schema";

export function useJobs() {
  return useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });
}

export function useJob(id: string) {
  return useQuery<Job>({
    queryKey: ["/api/jobs", id],
    enabled: !!id,
  });
}
