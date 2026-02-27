type ImageUploadResponse = {
  url: string
  blurDataUrl: string | null
  fileId: string
  width?: number
  height?: number
  name?: string
}

type UploadProgressCallback = (percent: number) => void

export function uploadFile(
  file: File,
  folder = "/tailorhub/blog",
  onProgress?: UploadProgressCallback,
): Promise<ImageUploadResponse> {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("folder", folder)

    const xhr = new XMLHttpRequest()
    xhr.open("POST", "/api/uploads/imagekit", true)
    xhr.withCredentials = true
    xhr.timeout = 120_000

    xhr.upload.onprogress = (event) => {
      if (onProgress && event.lengthComputable) {
        const percent = Math.min(99, Math.round((event.loaded / event.total) * 100))
        onProgress(percent)
      }
    }

    xhr.onload = () => {
      try {
        const responseJson = xhr.responseText ? JSON.parse(xhr.responseText) : {}
        if (xhr.status < 200 || xhr.status >= 300) {
          const message = (responseJson as { error?: string }).error ?? `Upload failed (HTTP ${xhr.status}).`
          reject(new Error(message))
          return
        }
        onProgress?.(100)
        const data = responseJson as ImageUploadResponse
        if (!data || typeof data.url !== "string") {
          reject(new Error("Invalid response from server."))
          return
        }
        resolve(data)
      } catch {
        reject(new Error(xhr.responseText?.trim() || `Upload failed (HTTP ${xhr.status}).`))
      }
    }

    xhr.onerror = () => reject(new Error("Network error. Check your connection and try again."))
    xhr.ontimeout = () => reject(new Error("Upload timed out. Please try again."))
    xhr.send(formData)
  })
}

export function isValidImageFile(file: File): boolean {
  const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]
  const maxSize = 10 * 1024 * 1024 // 10MB

  return validTypes.includes(file.type) && file.size <= maxSize
}

export function isValidVideoFile(file: File): boolean {
  const validTypes = ["video/mp4", "video/webm", "video/quicktime"]
  const maxSize = 100 * 1024 * 1024 // 100MB
  return validTypes.includes(file.type) && file.size <= maxSize
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}
