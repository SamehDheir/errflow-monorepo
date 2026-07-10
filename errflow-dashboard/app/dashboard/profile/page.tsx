"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { User, Mail, Building, Shield, Calendar, Lock, Loader2, Save, Key } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { useProfile, useUpdateProfile, useChangePassword } from "@/hooks/use-profile"

// ─── Schemas ──────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type ProfileFormData = z.infer<typeof profileSchema>
type PasswordFormData = z.infer<typeof passwordSchema>

// ─── Components ───────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ProfileInfo({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { data: profile, isLoading } = useProfile()
  const updateProfileMutation = useUpdateProfile()
  const changePasswordMutation = useChangePassword()

  const [isEditing, setIsEditing] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: {
      name: profile?.name || "",
      email: profile?.email || "",
    },
  })

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  })

  function handleProfileSubmit(data: ProfileFormData) {
    updateProfileMutation.mutate(data, {
      onSuccess: () => {
        toast.success("Profile updated successfully")
        setIsEditing(false)
      },
      onError: (error: Error) => {
        toast.error(error.message || "Failed to update profile")
      },
    })
  }

  function handlePasswordSubmit(data: PasswordFormData) {
    changePasswordMutation.mutate(
      {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      },
      {
        onSuccess: () => {
          toast.success("Password changed successfully")
          passwordForm.reset()
          setShowPasswordForm(false)
        },
        onError: (error: Error) => {
          toast.error(error.message || "Failed to change password")
        },
      }
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Profile</h1>
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-16 bg-gray-100 animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const stats = profile?.stats

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Projects" value={stats?.projectsCount || 0} icon={Building} />
        <StatCard label="API Keys" value={stats?.apiKeysCount || 0} icon={Key} />
        <StatCard label="Error Events" value={stats?.errorEventsCount || 0} icon={Shield} />
        <StatCard label="Pull Requests" value={stats?.pullRequestsCount || 0} icon={User} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Manage your personal details</CardDescription>
              </div>
              {!isEditing && (
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  Edit Profile
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {isEditing ? (
              <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    {...profileForm.register("name")}
                    placeholder="Your name"
                  />
                  {profileForm.formState.errors.name && (
                    <p className="text-sm text-red-600">{profileForm.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    {...profileForm.register("email")}
                    placeholder="your@email.com"
                  />
                  {profileForm.formState.errors.email && (
                    <p className="text-sm text-red-600">{profileForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-primary/10 text-primary text-xl">
                      {profile?.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-lg">{profile?.name}</h3>
                    <p className="text-muted-foreground">{profile?.email}</p>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <ProfileInfo label="Role" value={profile?.role || "N/A"} icon={Shield} />
                  <ProfileInfo
                    label="Organization"
                    value={profile?.organization?.name || "N/A"}
                    icon={Building}
                  />
                  <ProfileInfo
                    label="Member Since"
                    value={profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "N/A"}
                    icon={Calendar}
                  />
                  <ProfileInfo
                    label="Plan"
                    value={profile?.organization?.plan || "N/A"}
                    icon={Mail}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Organization & Security Card */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization</CardTitle>
              <CardDescription>Your organization details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Building className="h-5 w-5 text-primary" />
                  <span className="font-medium">{profile?.organization?.name}</span>
                </div>
                <Badge variant="secondary" className="mb-2">
                  {profile?.organization?.plan} Plan
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Slug: {profile?.organization?.slug}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Manage your password</CardDescription>
            </CardHeader>
            <CardContent>
              {showPasswordForm ? (
                <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      {...passwordForm.register("currentPassword")}
                    />
                    {passwordForm.formState.errors.currentPassword && (
                      <p className="text-sm text-red-600">
                        {passwordForm.formState.errors.currentPassword.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      {...passwordForm.register("newPassword")}
                    />
                    {passwordForm.formState.errors.newPassword && (
                      <p className="text-sm text-red-600">
                        {passwordForm.formState.errors.newPassword.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      {...passwordForm.register("confirmPassword")}
                    />
                    {passwordForm.formState.errors.confirmPassword && (
                      <p className="text-sm text-red-600">
                        {passwordForm.formState.errors.confirmPassword.message}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowPasswordForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={changePasswordMutation.isPending}
                    >
                      {changePasswordMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Changing...
                        </>
                      ) : (
                        "Change Password"
                      )}
                    </Button>
                  </div>
                </form>
              ) : (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowPasswordForm(true)}
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
