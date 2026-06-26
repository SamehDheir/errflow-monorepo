import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"

export interface Profile {
  id: string
  email: string
  name: string
  role: string
  createdAt: string
  updatedAt: string
  organization: {
    id: string
    name: string
    plan: string
    slug: string
  }
  stats: {
    projectsCount: number
    apiKeysCount: number
    errorEventsCount: number
    pullRequestsCount: number
  }
}

export interface UpdateProfileRequest {
  name: string
  email: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: () => api.get<Profile>("/users/me"),
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateProfileRequest) =>
      api.patch<Profile>("/users/me", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] })
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordRequest) =>
      api.patch("/users/me/password", data),
  })
}
