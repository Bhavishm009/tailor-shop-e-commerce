import { getMeasurementGuideMeta } from "@/lib/measurement-guide-meta"
import type { MeasurementField } from "@/lib/measurement-presets"

type MeasurementGuidePanelProps = {
  measurementType?: string | null
  fields: MeasurementField[]
  imageSrc?: string | null
  title?: string
}

export function MeasurementGuidePanel({ measurementType, fields, imageSrc, title }: MeasurementGuidePanelProps) {
  const guide = getMeasurementGuideMeta(measurementType)
  const finalImage = imageSrc || guide.imageSrc

  return (
    <aside className="rounded-md border bg-muted/20 p-3">
      <p className="text-sm font-semibold">{title || guide.title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{guide.hint}</p>
      {finalImage ? (
        <img
          src={finalImage}
          alt={title || guide.title}
          className="mt-3 h-56 w-full rounded border bg-background object-contain p-2 md:h-64"
        />
      ) : (
        <div className="mt-3 flex h-56 items-center justify-center rounded border bg-background text-xs text-muted-foreground md:h-64">
          Add a guide image for this service
        </div>
      )}
      {fields.length > 0 ? (
        <ol className="mt-3 space-y-1 text-xs text-muted-foreground">
          {fields.map((field, index) => (
            <li key={field.key}>
              {index + 1}. {field.label}
              {field.unit ? ` (${field.unit})` : ""}
            </li>
          ))}
        </ol>
      ) : null}
    </aside>
  )
}
