"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useDeleteProject } from "@/hooks/use-projects"
import { toast } from "sonner"

interface DeleteProjectButtonProps {
  projectId: string
}

export function DeleteProjectButton({ projectId }: DeleteProjectButtonProps) {
  const [open, setOpen] = useState(false)
  const deleteProjectMutation = useDeleteProject()

  function handleConfirm() {
    deleteProjectMutation.mutate(projectId, {
      onSuccess: () => {
        toast.success("Project deleted successfully")
        setOpen(false)
      },
      onError: (error: Error) => {
        toast.error(`Failed to delete project: ${error.message}`)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-red-600 dark:text-red-400">Delete Project</DialogTitle>
          <DialogDescription className="text-red-600/80 dark:text-white">
            Are you sure you want to delete this project? This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleteProjectMutation.isPending}
            className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
          >
            {deleteProjectMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
