"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useDeleteOrganization, useOrganization } from "@/hooks/use-organization"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

const deleteOrgSchema = z.object({
  password: z.string().min(1, "Password is required"),
  confirmText: z.string().min(1, "Confirmation text is required"),
})

type DeleteOrgFormData = z.infer<typeof deleteOrgSchema>

export function DeleteOrganizationDialog() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { data: session } = useSession()
  const deleteOrganizationMutation = useDeleteOrganization()
  const { data: org } = useOrganization()
  const deleteForm = useForm<DeleteOrgFormData>({
    resolver: zodResolver(deleteOrgSchema),
  })
  const { register, formState, watch } = deleteForm
  const confirmTextValue = watch("confirmText", "")

  // Debug: Log user role and organization data
  console.log("Current session:", session)
  console.log("Current organization:", org)
  console.log("User role:", org?.members?.find(m => m.email === session?.user?.email)?.role)

  const isConfirmValid = confirmTextValue.toLowerCase().trim() === "delete my organization"
  const canDelete = formState.isValid && isConfirmValid

  function handleDeleteOrganization(data: DeleteOrgFormData) {
    if (!isConfirmValid) return

    deleteOrganizationMutation.mutate(data, {
      onSuccess: () => {
        toast.success("Organization deleted successfully")
        setOpen(false)
        deleteForm.reset()
        router.push("/login")
      },
      onError: (error: Error) => {
        console.error("Delete organization error:", error)
        toast.error(`Failed to delete organization: ${error.message}`)
      },
    })
  }

  function handleClose() {
    setOpen(false)
    deleteForm.reset()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete Organization</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-red-600 dark:text-red-400">Delete Organization</DialogTitle>
          <DialogDescription className="text-red-600/80 dark:text-red-400/80">
            ⚠️ This action is permanent and cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            <p className="font-medium">This will permanently delete:</p>
            <ul className="mt-2 list-disc pl-4 space-y-1">
              <li>All projects and their data</li>
              <li>All API keys</li>
              <li>All error events and fix history</li>
              <li>All user accounts</li>
              <li>All pull requests</li>
            </ul>
          </div>

          <form onSubmit={deleteForm.handleSubmit(handleDeleteOrganization)}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Enter your password to confirm</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Your password"
                  {...register("password")}
                />
                {formState.errors.password && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmText">
                  Type <strong>delete my organization</strong> to confirm
                </Label>
                <Input
                  id="confirmText"
                  placeholder="delete my organization"
                  {...register("confirmText")}
                />
                {formState.errors.confirmText && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {formState.errors.confirmText.message}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter className="gap-3 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={deleteOrganizationMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={deleteOrganizationMutation.isPending || !canDelete}
                className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
              >
                {deleteOrganizationMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current dark:border-white mr-2" />
                    Deleting...
                  </>
                ) : (
                  "Delete Organization"
                )}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
