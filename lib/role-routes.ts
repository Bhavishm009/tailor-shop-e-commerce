export type AppRole = "ADMIN" | "TAILOR" | "CUSTOMER"

export function getDashboardByRole(role?: string | null) {
  if (role === "ADMIN") return "/admin/dashboard"
  if (role === "TAILOR") return "/tailor/dashboard"
  return "/customer/dashboard"
}
