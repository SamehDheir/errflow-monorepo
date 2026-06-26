"use client";

import { useState } from "react"
import React from "react"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

interface UseConfirmOptions {
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive"
}

export function useConfirm() {
  const [confirmState, setConfirmState] = useState<{
    open: boolean
    options: UseConfirmOptions
    onConfirm?: () => void | Promise<void>
  }>({
    open: false,
    options: {},
  })

  const confirm = (options: UseConfirmOptions & { onConfirm: () => void | Promise<void> }) => {
    setConfirmState({
      open: true,
      options,
      onConfirm: options.onConfirm,
    })
  }

  const handleConfirm = async () => {
    if (confirmState.onConfirm) {
      await confirmState.onConfirm()
    }
    setConfirmState(prev => ({ ...prev, open: false }))
  }

  const handleCancel = () => {
    setConfirmState(prev => ({ ...prev, open: false }))
  }

  const ConfirmComponent: React.FC = () => (
    <ConfirmDialog
      open={confirmState.open}
      onOpenChange={handleCancel}
      title={confirmState.options.title || "Are you sure?"}
      description={confirmState.options.description || "This action cannot be undone."}
      confirmText={confirmState.options.confirmText}
      cancelText={confirmState.options.cancelText}
      variant={confirmState.options.variant}
      onConfirm={handleConfirm}
    />
  )

  return {
    confirm,
    ConfirmComponent,
  }
}
