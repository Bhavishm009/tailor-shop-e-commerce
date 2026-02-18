"use client"

import { useState, useCallback } from "react"

interface UseApiOptions {
  method?: string
  headers?: Record<string, string>
}

export function useApi<T = any>(url: string, options?: UseApiOptions) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const execute = useCallback(
    async (body?: any) => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(url, {
          method: options?.method || "GET",
          headers: {
            "Content-Type": "application/json",
            ...options?.headers,
          },
          body: body ? JSON.stringify(body) : undefined,
        })

        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`)
        }

        const result = await response.json()
        setData(result)
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error")
        setError(error)
        throw error
      } finally {
        setLoading(false)
      }
    },
    [url, options],
  )

  return { data, loading, error, execute }
}
