import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Organization, OrganizationUsage, UpdatePlanRequest } from "@/types"

export function useOrganization() {
  return useQuery({
    queryKey: ["organization"],
    queryFn: () => api.get<Organization>("/organization"),
  })
}

export function useOrganizationUsage() {
  return useQuery({
    queryKey: ["organization", "usage"],
    queryFn: () => api.get<OrganizationUsage>("/organization/usage"),
  })
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { name: string }) => api.patch<Organization>("/organization", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization"] })
    },
  })
}

export function useUpdatePlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdatePlanRequest) => api.patch<Organization>("/organization/plan", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization"] })
      queryClient.invalidateQueries({ queryKey: ["organization", "usage"] })
    },
  })
}

export function useDeleteOrganization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { password: string; confirmText: string }) =>
      api.delete("/organization", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization"] })
    },
  })
}
