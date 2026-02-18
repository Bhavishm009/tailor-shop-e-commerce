"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { getDashboardByRole } from "@/lib/role-routes"

export function useAuth(requiredRole?: string) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }

    if (status === "authenticated" && requiredRole && session?.user?.role !== requiredRole) {
      router.push(getDashboardByRole(session?.user?.role))
    }
  }, [status, session, requiredRole, router])

  return { session, isLoading: status === "loading", isAuthenticated: status === "authenticated" }
}
