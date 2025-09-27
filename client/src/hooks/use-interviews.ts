import { useQuery } from "@tanstack/react-query";
import { type Interview } from "@shared/schema";

export function useInterviews() {
  return useQuery<Interview[]>({
    queryKey: ["/api/interviews"],
  });
}

export function useInterview(id: string) {
  return useQuery<Interview>({
    queryKey: ["/api/interviews", id],
    enabled: !!id,
  });
}

export function useInterviewsByCandidate(candidateId: string) {
  return useQuery<Interview[]>({
    queryKey: ["/api/interviews", "candidate", candidateId],
    queryFn: async () => {
      const response = await fetch(`/api/interviews?candidateId=${candidateId}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: !!candidateId,
  });
}
