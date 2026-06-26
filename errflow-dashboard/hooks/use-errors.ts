import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ErrorEvent } from "@/types"

export function useErrors(params?: {
  limit?: number
  status?: string
  severity?: string
  search?: string
  page?: number
  projectId?: string
}) {
  const queryString = new URLSearchParams()
  if (params?.limit) queryString.append("limit", String(params.limit))
  if (params?.status) queryString.append("status", params.status)
  if (params?.severity) queryString.append("severity", params.severity)
  if (params?.search) queryString.append("search", params.search)
  if (params?.page) queryString.append("page", String(params.page))
  if (params?.projectId) queryString.append("projectId", params.projectId)

  return useQuery({
    queryKey: ["errors", params],
    queryFn: () => api.get<{ data: ErrorEvent[]; total: number; page: number; limit: number }>(`/errors?${queryString.toString()}`),
    staleTime: 15000,
    refetchInterval: 15000,
  })
}

export function useError(id: string) {
  return useQuery({
    queryKey: ["error", id],
    queryFn: () => api.get<ErrorEvent>(`/errors/${id}`),
    staleTime: 5000,
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
  })
}

export function useIgnoreError() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.patch(`/errors/${id}/ignore`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["errors"] })
    },
  })
}

export function useCreatePrAnyway() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (errorId: string) => 
      api.post<{ message: string; prNumber: number; prUrl: string }>(`/errors/${errorId}/create-pr-anyway`),
    onSuccess: (data, errorId) => {
      queryClient.invalidateQueries({ queryKey: ["error", errorId] })
      queryClient.invalidateQueries({ queryKey: ["errors"] })
    },
  })
}

export function useRetryFix() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (errorId: string) => 
      api.post<{ message: string }>(`/errors/${errorId}/retry-fix`),
    onSuccess: (data, errorId) => {
      queryClient.invalidateQueries({ queryKey: ["error", errorId] })
      queryClient.invalidateQueries({ queryKey: ["errors"] })
    },
  })
}
