import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { StatsOverview, TimelineEntry } from "@/types"

export function useStatsOverview() {
  return useQuery({
    queryKey: ["stats", "overview"],
    queryFn: async () => {
      console.log("Fetching stats overview...")
      const result = await api.get<StatsOverview>("/stats/overview")
      console.log("Stats overview result:", result)
      return result
    },
    staleTime: 30000,
    refetchInterval: 30000,
  })
}

export function useTimeline(days: number = 30) {
  return useQuery({
    queryKey: ["stats", "timeline", days],
    queryFn: () => api.get<TimelineEntry[]>(`/stats/timeline?days=${days}`),
    staleTime: 30000,
    refetchInterval: 30000,
  })
}
