import { useQuery } from "@tanstack/react-query";
import { type Candidate } from "@shared/schema";

export function useCandidates(searchQuery?: string) {
  return useQuery<Candidate[]>({
    queryKey: ["/api/candidates", { search: searchQuery }],
    queryFn: async ({ queryKey }) => {
      const [url, params] = queryKey as [string, { search?: string }];
      const searchParams = new URLSearchParams();
      
      if (params.search) {
        searchParams.append("search", params.search);
      }
      
      const fullUrl = searchParams.toString() ? `${url}?${searchParams}` : url;
      const response = await fetch(fullUrl, { credentials: "include" });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
  });
}

export function useCandidate(id: string) {
  return useQuery<Candidate>({
    queryKey: ["/api/candidates", id],
    enabled: !!id,
  });
}
