import type { ClothType } from "@prisma/client"

export type ClothOption = {
  id: string
  name: string
  clothType: ClothType
  buyRatePerMeter: number
  sellRatePerMeter: number
  stockMeters: number
  image?: string
  description?: string
}

export const CLOTH_OPTIONS: ClothOption[] = [
  { id: "cotton-classic", name: "Classic Cotton", clothType: "COTTON", buyRatePerMeter: 250, sellRatePerMeter: 450, stockMeters: 120, description: "Soft daily-wear cotton" },
  { id: "cotton-premium", name: "Premium Cotton", clothType: "COTTON", buyRatePerMeter: 420, sellRatePerMeter: 700, stockMeters: 90, description: "Premium weave cotton" },
  { id: "linen-breathable", name: "Breathable Linen", clothType: "LINEN", buyRatePerMeter: 540, sellRatePerMeter: 850, stockMeters: 70, description: "Light summer linen" },
  { id: "silk-luxe", name: "Luxe Silk", clothType: "SILK", buyRatePerMeter: 980, sellRatePerMeter: 1400, stockMeters: 45, description: "Occasion-wear silk" },
  { id: "wool-formal", name: "Formal Wool Blend", clothType: "WOOL", buyRatePerMeter: 790, sellRatePerMeter: 1200, stockMeters: 60, description: "Structured formal wool blend" },
  { id: "poly-easy", name: "Easy Care Poly", clothType: "POLYESTER", buyRatePerMeter: 190, sellRatePerMeter: 350, stockMeters: 150, description: "Budget friendly polyester" },
]

export function getClothOptionById(id: string) {
  return CLOTH_OPTIONS.find((item) => item.id === id)
}
