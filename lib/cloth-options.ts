import type { ClothType } from "@prisma/client"

export type ClothOption = {
  id: string
  name: string
  clothType: ClothType
  price: number
  description?: string
}

export const CLOTH_OPTIONS: ClothOption[] = [
  { id: "cotton-classic", name: "Classic Cotton", clothType: "COTTON", price: 450, description: "Soft daily-wear cotton" },
  { id: "cotton-premium", name: "Premium Cotton", clothType: "COTTON", price: 700, description: "Premium weave cotton" },
  { id: "linen-breathable", name: "Breathable Linen", clothType: "LINEN", price: 850, description: "Light summer linen" },
  { id: "silk-luxe", name: "Luxe Silk", clothType: "SILK", price: 1400, description: "Occasion-wear silk" },
  { id: "wool-formal", name: "Formal Wool Blend", clothType: "WOOL", price: 1200, description: "Structured formal wool blend" },
  { id: "poly-easy", name: "Easy Care Poly", clothType: "POLYESTER", price: 350, description: "Budget friendly polyester" },
]

export function getClothOptionById(id: string) {
  return CLOTH_OPTIONS.find((item) => item.id === id)
}

