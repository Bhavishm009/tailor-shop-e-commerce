type ImageUploadResponse = {
  url: string
  blurDataUrl: string
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

    xhr.upload.onprogress = (event) => {
      if (!onProgress || !event.lengthComputable) return
      const percent = Math.round((event.loaded / event.total) * 100)
      onProgress(percent)
    }

    xhr.onload = () => {
      try {
        const responseJson = xhr.responseText ? JSON.parse(xhr.responseText) : {}
        if (xhr.status < 200 || xhr.status >= 300) {
          reject(new Error(responseJson.error || "Image upload failed."))
          return
        }
        onProgress?.(100)
        resolve(responseJson as ImageUploadResponse)
      } catch {
        reject(new Error("Image upload failed."))
      }
    }

    xhr.onerror = () => reject(new Error("Image upload failed."))
    xhr.send(formData)
  })
}

export function isValidImageFile(file: File): boolean {
  const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
  const maxSize = 10 * 1024 * 1024 // 10MB

  return validTypes.includes(file.type) && file.size <= maxSize
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}
