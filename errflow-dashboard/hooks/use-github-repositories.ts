import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"

export interface GitHubRepository {
  id: number
  name: string
  full_name: string
  owner: string
  default_branch: string
  private: boolean
  description: string | null
  language: string | null
  updated_at: string
  permissions: {
    admin: boolean
    maintain: boolean
    push: boolean
    triage: boolean
    pull: boolean
  }
}

export function useGitHubRepositories() {
  return useQuery({
    queryKey: ["github-repositories"],
    queryFn: () => api.get<{ success: boolean; data: GitHubRepository[] }>("/github/repositories"),
    enabled: false, // Don't fetch automatically, only when triggered
  })
}
