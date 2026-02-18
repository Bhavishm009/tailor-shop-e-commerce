export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  ASSIGNED: "Assigned to Tailor",
  STITCHING: "In Stitching",
  COMPLETED: "Completed",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
}

export const ORDER_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  ASSIGNED: "bg-blue-100 text-blue-800",
  STITCHING: "bg-purple-100 text-purple-800",
  COMPLETED: "bg-green-100 text-green-800",
  DELIVERED: "bg-gray-100 text-gray-800",
  CANCELLED: "bg-red-100 text-red-800",
}

export function getOrderStatusColor(status: string): string {
  return ORDER_STATUS_COLORS[status] || "bg-gray-100 text-gray-800"
}

export function getOrderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status] || status
}

export function calculateEstimatedDelivery(orderDate: Date, orderType: "custom" | "ready-made"): Date {
  const deliveryDays = orderType === "custom" ? 7 : 2
  const date = new Date(orderDate)
  date.setDate(date.getDate() + deliveryDays)
  return date
}
