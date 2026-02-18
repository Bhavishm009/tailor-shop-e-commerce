export type MeasurementField = {
  key: string
  label: string
  unit?: string
}

export type MeasurementPreset = {
  type: string
  label: string
  fields: MeasurementField[]
}

const PRESETS: Record<string, MeasurementPreset> = {
  SHIRT: {
    type: "SHIRT",
    label: "Shirt",
    fields: [
      { key: "chest", label: "Chest", unit: "cm" },
      { key: "waist", label: "Waist", unit: "cm" },
      { key: "shoulder", label: "Shoulder", unit: "cm" },
      { key: "sleeveLength", label: "Sleeve Length", unit: "cm" },
      { key: "garmentLength", label: "Garment Length", unit: "cm" },
      { key: "neck", label: "Neck", unit: "cm" },
    ],
  },
  PANT: {
    type: "PANT",
    label: "Pant",
    fields: [
      { key: "waist", label: "Waist", unit: "cm" },
      { key: "hip", label: "Hip", unit: "cm" },
      { key: "inseam", label: "Inseam", unit: "cm" },
      { key: "outseam", label: "Outseam", unit: "cm" },
      { key: "thigh", label: "Thigh", unit: "cm" },
      { key: "bottom", label: "Bottom Opening", unit: "cm" },
    ],
  },
  KURTA: {
    type: "KURTA",
    label: "Kurta",
    fields: [
      { key: "chest", label: "Chest", unit: "cm" },
      { key: "waist", label: "Waist", unit: "cm" },
      { key: "hip", label: "Hip", unit: "cm" },
      { key: "shoulder", label: "Shoulder", unit: "cm" },
      { key: "sleeveLength", label: "Sleeve Length", unit: "cm" },
      { key: "garmentLength", label: "Kurta Length", unit: "cm" },
    ],
  },
  BLOUSE: {
    type: "BLOUSE",
    label: "Blouse",
    fields: [
      { key: "bust", label: "Bust", unit: "cm" },
      { key: "waist", label: "Waist", unit: "cm" },
      { key: "shoulder", label: "Shoulder", unit: "cm" },
      { key: "sleeveLength", label: "Sleeve Length", unit: "cm" },
      { key: "blouseLength", label: "Blouse Length", unit: "cm" },
      { key: "armhole", label: "Armhole", unit: "cm" },
    ],
  },
  SALWAR: {
    type: "SALWAR",
    label: "Salwar Suit",
    fields: [
      { key: "bust", label: "Bust", unit: "cm" },
      { key: "waist", label: "Waist", unit: "cm" },
      { key: "hip", label: "Hip", unit: "cm" },
      { key: "topLength", label: "Top Length", unit: "cm" },
      { key: "sleeveLength", label: "Sleeve Length", unit: "cm" },
      { key: "bottomLength", label: "Bottom Length", unit: "cm" },
    ],
  },
  GENERIC: {
    type: "GENERIC",
    label: "Generic Custom",
    fields: [
      { key: "chest", label: "Chest", unit: "cm" },
      { key: "waist", label: "Waist", unit: "cm" },
      { key: "hip", label: "Hip", unit: "cm" },
      { key: "shoulder", label: "Shoulder", unit: "cm" },
      { key: "sleeveLength", label: "Sleeve Length", unit: "cm" },
      { key: "garmentLength", label: "Garment Length", unit: "cm" },
    ],
  },
}

function normalizeValue(value: string) {
  return value.trim().toUpperCase().replace(/[\s-]+/g, "_")
}

export function resolveMeasurementType(serviceKey?: string | null, serviceName?: string | null) {
  const key = normalizeValue(serviceKey || "")
  if (PRESETS[key]) return key

  const name = normalizeValue(serviceName || "")
  if (name.includes("SHIRT")) return "SHIRT"
  if (name.includes("PANT") || name.includes("TROUSER")) return "PANT"
  if (name.includes("KURTA")) return "KURTA"
  if (name.includes("BLOUSE")) return "BLOUSE"
  if (name.includes("SALWAR") || name.includes("SUIT")) return "SALWAR"
  return "GENERIC"
}

export function getMeasurementPreset(type: string): MeasurementPreset {
  return PRESETS[type] || PRESETS.GENERIC
}

export function getAllMeasurementPresets() {
  return Object.values(PRESETS)
}

