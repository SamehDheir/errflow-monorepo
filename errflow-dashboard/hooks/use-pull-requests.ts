import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { PullRequest } from "@/types"

export function usePullRequests(status?: string) {
  const queryString = new URLSearchParams()
  if (status) queryString.append("status", status)

  return useQuery({
    queryKey: ["pull-requests", status],
    queryFn: () => api.get<{ pullRequests: PullRequest[]; stats: { total: number; merged: number; open: number; avgConfidence: number } }>(`/pull-requests?${queryString.toString()}`),
    staleTime: 0, // Always consider data stale to ensure fresh data
    gcTime: 1000 * 60 * 5, // Keep in garbage collector for 5 minutes
    refetchInterval: 10000, // Check for updates every 10 seconds
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  })
}
