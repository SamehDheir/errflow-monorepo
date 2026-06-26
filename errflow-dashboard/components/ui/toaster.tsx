"use client"

import { Toaster as SonnerToaster } from "sonner"

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      expand={false}
      richColors
      closeButton
      toastOptions={{
        className: "bg-background border-border text-foreground",
        descriptionClassName: "text-muted-foreground",
        actionButtonStyle: {
          backgroundColor: "hsl(1 79% 60%)",
          color: "white",
        },
        cancelButtonStyle: {
          backgroundColor: "hsl(220 20% 14%)",
          color: "hsl(220 15% 95%)",
        },
      }}
    />
  )
}
