export type MeasurementGuideMeta = {
  imageSrc: string
  title: string
  hint: string
}

const GUIDE_META: Record<string, MeasurementGuideMeta> = {
  SHIRT: {
    imageSrc: "/measurement-guides/shirt.svg",
    title: "Shirt Measurement Guide",
    hint: "Take measurements with a tape on a relaxed standing posture.",
  },
  PANT: {
    imageSrc: "/measurement-guides/pant.svg",
    title: "Pant Measurement Guide",
    hint: "Keep tape snug but not tight while measuring waist and lengths.",
  },
  KURTA: {
    imageSrc: "/measurement-guides/kurta.svg",
    title: "Kurta Measurement Guide",
    hint: "Measure from shoulder points for accurate top length and sleeve.",
  },
  BLOUSE: {
    imageSrc: "/measurement-guides/blouse.svg",
    title: "Blouse Measurement Guide",
    hint: "Use close-fit measurements, especially bust and armhole.",
  },
  SALWAR: {
    imageSrc: "/measurement-guides/salwar.svg",
    title: "Salwar Suit Measurement Guide",
    hint: "Measure top and bottom separately for better fitting.",
  },
  GENERIC: {
    imageSrc: "/measurement-guides/generic.svg",
    title: "Measurement Guide",
    hint: "Provide all values in centimeters for consistency.",
  },
}

export function getMeasurementGuideMeta(measurementType?: string | null): MeasurementGuideMeta {
  const key = (measurementType || "GENERIC").toUpperCase()
  return GUIDE_META[key] || GUIDE_META.GENERIC
}
