"use client"

import { useEffect } from "react"
import { toast } from "sonner"

type FeedbackToastsProps = {
  error?: string
  success?: string
  info?: string
}

export function FeedbackToasts({ error, success, info }: FeedbackToastsProps) {
  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  useEffect(() => {
    if (success) toast.success(success)
  }, [success])

  useEffect(() => {
    if (info) toast.message(info)
  }, [info])

  return null
}
