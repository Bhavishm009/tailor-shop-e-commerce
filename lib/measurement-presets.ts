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
      { key: "chest", label: "Chest", unit: "in" },
      { key: "waist", label: "Waist", unit: "in" },
      { key: "shoulder", label: "Shoulder", unit: "in" },
      { key: "sleeveLength", label: "Sleeve Length", unit: "in" },
      { key: "garmentLength", label: "Garment Length", unit: "in" },
      { key: "neck", label: "Neck", unit: "in" },
    ],
  },
  PANT: {
    type: "PANT",
    label: "Pant",
    fields: [
      { key: "waist", label: "Waist", unit: "in" },
      { key: "hip", label: "Hip", unit: "in" },
      { key: "inseam", label: "Inseam", unit: "in" },
      { key: "outseam", label: "Outseam", unit: "in" },
      { key: "thigh", label: "Thigh", unit: "in" },
      { key: "bottom", label: "Bottom Opening", unit: "in" },
    ],
  },
  KURTA: {
    type: "KURTA",
    label: "Kurta",
    fields: [
      { key: "chest", label: "Chest", unit: "in" },
      { key: "waist", label: "Waist", unit: "in" },
      { key: "hip", label: "Hip", unit: "in" },
      { key: "shoulder", label: "Shoulder", unit: "in" },
      { key: "sleeveLength", label: "Sleeve Length", unit: "in" },
      { key: "garmentLength", label: "Kurta Length", unit: "in" },
    ],
  },
  BLOUSE: {
    type: "BLOUSE",
    label: "Blouse",
    fields: [
      { key: "bust", label: "Bust", unit: "in" },
      { key: "waist", label: "Waist", unit: "in" },
      { key: "shoulder", label: "Shoulder", unit: "in" },
      { key: "sleeveLength", label: "Sleeve Length", unit: "in" },
      { key: "blouseLength", label: "Blouse Length", unit: "in" },
      { key: "armhole", label: "Armhole", unit: "in" },
    ],
  },
  SALWAR: {
    type: "SALWAR",
    label: "Salwar Suit",
    fields: [
      { key: "bust", label: "Bust", unit: "in" },
      { key: "waist", label: "Waist", unit: "in" },
      { key: "hip", label: "Hip", unit: "in" },
      { key: "topLength", label: "Top Length", unit: "in" },
      { key: "sleeveLength", label: "Sleeve Length", unit: "in" },
      { key: "bottomLength", label: "Bottom Length", unit: "in" },
    ],
  },
  GENERIC: {
    type: "GENERIC",
    label: "Generic Custom",
    fields: [
      { key: "chest", label: "Chest", unit: "in" },
      { key: "waist", label: "Waist", unit: "in" },
      { key: "hip", label: "Hip", unit: "in" },
      { key: "shoulder", label: "Shoulder", unit: "in" },
      { key: "sleeveLength", label: "Sleeve Length", unit: "in" },
      { key: "garmentLength", label: "Garment Length", unit: "in" },
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
