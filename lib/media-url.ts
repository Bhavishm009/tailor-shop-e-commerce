export type ImageVariant = "card" | "detail" | "thumb" | "cardThumb"

const imageKitEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT?.replace(/\/$/, "") || ""

function getTransform(variant: ImageVariant) {
  switch (variant) {
    case "card":
      return "tr=w-640,h-800,c-maintain_ratio,f-auto,q-75"
    case "detail":
      return "tr=w-1400,h-1400,c-maintain_ratio,f-auto,q-80"
    case "thumb":
      return "tr=w-220,h-160,c-maintain_ratio,f-auto,q-65"
    case "cardThumb":
      return "tr=w-120,h-120,c-maintain_ratio,f-auto,q-60"
    default:
      return "tr=f-auto,q-75"
  }
}

export function getOptimizedImageUrl(url: string, variant: ImageVariant = "detail") {
  if (!url) return url
  if (!imageKitEndpoint || !url.startsWith(imageKitEndpoint)) return url

  const [base, query] = url.split("?")
  const params = new URLSearchParams(query || "")
  params.set("tr", getTransform(variant).replace(/^tr=/, ""))
  return `${base}?${params.toString()}`
}
