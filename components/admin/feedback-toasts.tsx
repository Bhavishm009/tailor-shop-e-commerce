"use client"

import { useEffect } from "react"
import { toast } from "sonner"

type FeedbackToastsProps = {
  error?: string
  success?: string
}

export function FeedbackToasts({ error, success }: FeedbackToastsProps) {
  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  useEffect(() => {
    if (success) toast.success(success)
  }, [success])

  return null
}
