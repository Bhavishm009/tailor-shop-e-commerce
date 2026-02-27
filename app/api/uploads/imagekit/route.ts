import { NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  createBlurDataUrlFromImageUrl,
  isImageKitConfigured,
  uploadFileToImageKit,
} from "@/lib/imagekit"
import { getOptimizedImageUrl } from "@/lib/media-url"

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"]
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024
const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!isImageKitConfigured()) {
      return NextResponse.json(
        { error: "ImageKit is not configured on the server." },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const file = formData.get("file")
    const rawFolder = String(formData.get("folder") || "/tailorhub/blog").trim()
    const folder = rawFolder.startsWith("/") ? rawFolder : `/${rawFolder}`

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required." }, { status: 400 })
    }

    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type)
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type)
    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: "Unsupported file type." },
        { status: 400 }
      )
    }
    if (isImage && file.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Image must be less than 10MB." },
        { status: 400 }
      )
    }
    if (isVideo && file.size > MAX_VIDEO_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Video must be less than 100MB." },
        { status: 400 }
      )
    }

    const fileBytes = new Uint8Array(await file.arrayBuffer())
    const uploaded = await uploadFileToImageKit({
      fileBytes,
      fileName: file.name || `upload-${Date.now()}`,
      folder,
    })

    let blurDataUrl: string | null = null
    if (isImage) {
      try {
        blurDataUrl = await createBlurDataUrlFromImageUrl(uploaded.url)
      } catch (blurError) {
        console.warn("[api/uploads/imagekit] blur placeholder generation failed", blurError)
      }
    }

    return NextResponse.json({
      url: uploaded.url,
      variants: isImage
        ? {
            card: getOptimizedImageUrl(uploaded.url, "card"),
            detail: getOptimizedImageUrl(uploaded.url, "detail"),
            thumb: getOptimizedImageUrl(uploaded.url, "thumb"),
            cardThumb: getOptimizedImageUrl(uploaded.url, "cardThumb"),
          }
        : undefined,
      blurDataUrl,
      fileId: uploaded.fileId,
      width: uploaded.width,
      height: uploaded.height,
      name: uploaded.name,
    })
  } catch (error) {
    console.error("[api/uploads/imagekit]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload file." },
      { status: 500 }
    )
  }
}
