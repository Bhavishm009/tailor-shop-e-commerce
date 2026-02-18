export type StitchingService = {
  key: string
  label: string
  customerPrice: number
  tailorRate: number
  tags: string[]
}

export const STITCHING_SERVICES: StitchingService[] = [
  { key: "casual-shirt", label: "Casual Shirt", customerPrice: 500, tailorRate: 300, tags: ["shirt", "casual shirt"] },
  { key: "formal-shirt", label: "Formal Shirt", customerPrice: 600, tailorRate: 350, tags: ["shirt", "formal shirt"] },
  { key: "pants", label: "Pants", customerPrice: 400, tailorRate: 240, tags: ["pants", "trouser"] },
  { key: "saree-blouse", label: "Saree Blouse", customerPrice: 450, tailorRate: 260, tags: ["blouse", "saree blouse"] },
  { key: "kurta", label: "Kurta", customerPrice: 550, tailorRate: 320, tags: ["kurta"] },
]

export function getServiceByKey(serviceKey: string) {
  return STITCHING_SERVICES.find((service) => service.key === serviceKey)
}

