export type EcommerceOrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"

export type StitchingOrderStatus =
  | "PENDING"
  | "ASSIGNED"
  | "STITCHING"
  | "QC"
  | "COMPLETED"
  | "DELIVERED"
  | "CANCELLED"

const READY_MADE_FLOW: Record<EcommerceOrderStatus, EcommerceOrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
}

const CUSTOM_FLOW: Record<StitchingOrderStatus, StitchingOrderStatus[]> = {
  PENDING: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["STITCHING", "CANCELLED"],
  STITCHING: ["QC", "CANCELLED"],
  QC: ["COMPLETED", "STITCHING", "CANCELLED"],
  COMPLETED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
}

export function isValidEcommerceTransition(current: EcommerceOrderStatus, next: EcommerceOrderStatus) {
  return READY_MADE_FLOW[current]?.includes(next) ?? false
}

export function isValidCustomTransition(current: StitchingOrderStatus, next: StitchingOrderStatus) {
  return CUSTOM_FLOW[current]?.includes(next) ?? false
}
