"use client"
import { ChangeEvent, useId, useState } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { isValidImageFile, isValidVideoFile, uploadFile } from "@/lib/file-upload"
import { FeedbackToasts } from "@/components/feedback-toasts"

type MediaItem = {
  kind: "image" | "video"
  url: string
}

type Props = {
  value: MediaItem[]
  onChange: (next: MediaItem[]) => void
  folder?: string
}

export function MediaUploader({ value, onChange, folder = "/tailorhub/products" }: Props) {
  const fileInputId = useId()
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentFileName, setCurrentFileName] = useState("")
  const [completedCount, setCompletedCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [error, setError] = useState("")
  const [pendingPreviews, setPendingPreviews] = useState<MediaItem[]>([])

  const onSelectFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target
    const files = input.files
    if (!files || files.length === 0) {
      setError("No files selected.")
      return
    }
    // Copy file list before clearing input — clearing empties the live FileList in some browsers
    const fileList = Array.from(files)
    input.value = ""
    setError("")
    setUploading(true)
    setProgress(0)
    setCompletedCount(0)
    setTotalCount(fileList.length)
    setCurrentFileName("")
    // Yield so React paints "Uploading..." before we block on the network
    await new Promise((r) => setTimeout(r, 0))
    const localPreviews: MediaItem[] = fileList
      .map((file) => {
        const isImage = isValidImageFile(file)
        const isVideo = isValidVideoFile(file)
        if (!isImage && !isVideo) return null
        return {
          kind: isVideo ? "video" as const : "image" as const,
          url: URL.createObjectURL(file),
        }
      })
      .filter((item): item is MediaItem => item !== null)
    setPendingPreviews(localPreviews)

    try {
      const results: MediaItem[] = []
      const fileErrors: string[] = []
      for (let i = 0; i < fileList.length; i += 1) {
        const file = fileList[i]
        setCurrentFileName(file.name)
        const isImage = isValidImageFile(file)
        const isVideo = isValidVideoFile(file)
        if (!isImage && !isVideo) {
          fileErrors.push(`${file.name}: unsupported type or size`)
          setCompletedCount((prev) => prev + 1)
          continue
        }
        try {
          const uploaded = await uploadFile(file, folder, (percent) => {
            const base = Math.floor((i / fileList.length) * 100)
            const normalized = Math.min(100, Math.floor(base + percent / fileList.length))
            setProgress(normalized)
          })
          results.push({
            kind: isVideo ? "video" : "image",
            url: uploaded.url,
          })
          setCompletedCount((prev) => prev + 1)
        } catch (fileError) {
          const message = fileError instanceof Error ? fileError.message : "Upload failed."
          fileErrors.push(`${file.name}: ${message}`)
          setCompletedCount((prev) => prev + 1)
        }
      }

      const deduped = Array.from(new Map([...value, ...results].map((item) => [`${item.kind}-${item.url}`, item])).values())
      onChange(deduped)
      if (fileErrors.length > 0) {
        setError(fileErrors.join(" | "))
      }
      if (results.length === 0 && fileErrors.length > 0) {
        setError(fileErrors.length === fileList.length ? "No valid files. Use JPG, PNG, WebP or GIF under 10MB, or MP4/WebM video under 100MB." : fileErrors.join(" | "))
      }
      setProgress(100)
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Failed to upload media."
      setError(message)
    } finally {
      setUploading(false)
      setCurrentFileName("")
      setPendingPreviews((prev) => {
        for (const item of prev) {
          URL.revokeObjectURL(item.url)
        }
        return []
      })
    }
  }

  const remove = (item: MediaItem) => {
    onChange(value.filter((entry) => entry.url !== item.url || entry.kind !== item.kind))
  }

  return (
    <div className="space-y-3">
      <FeedbackToasts error={error} />
      <input
        id={fileInputId}
        type="file"
        className="sr-only"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
        onChange={onSelectFiles}
        disabled={uploading}
        tabIndex={-1}
      />
      <div className="flex items-center gap-2">
        <label
          htmlFor={fileInputId}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "cursor-pointer",
            uploading && "pointer-events-none opacity-50"
          )}
        >
          {uploading ? "Uploading..." : "Upload Images / Videos"}
        </label>
      </div>
      {uploading ? (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            Uploading {completedCount}/{totalCount} files{currentFileName ? ` - ${currentFileName}` : ""} ({progress}%)
          </p>
          <Progress value={progress} />
        </div>
      ) : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {pendingPreviews.length > 0 ? (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Preview while uploading</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingPreviews.map((item, index) => (
              <div key={`${item.kind}-${item.url}-${index}`} className="border rounded-md p-2 space-y-2 opacity-80">
                {item.kind === "image" ? (
                  <img src={item.url} alt="Pending upload" className="h-32 w-full rounded object-cover" />
                ) : (
                  <video src={item.url} controls className="h-32 w-full rounded object-cover bg-black" />
                )}
                <p className="text-xs text-muted-foreground uppercase">{item.kind} - uploading...</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {value.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {value.map((item) => (
            <div key={`${item.kind}-${item.url}`} className="border rounded-md p-2 space-y-2">
              {item.kind === "image" ? (
                <img src={item.url} alt="Media" className="h-32 w-full rounded object-cover" />
              ) : (
                <video src={item.url} controls className="h-32 w-full rounded object-cover bg-black" />
              )}
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground uppercase">{item.kind}</p>
                <Button type="button" variant="destructive" size="sm" onClick={() => remove(item)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
