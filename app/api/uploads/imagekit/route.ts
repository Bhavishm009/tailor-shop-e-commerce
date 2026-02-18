import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"
import { createBlurDataUrlFromImageUrl, isImageKitConfigured, uploadImageToImageKit } from "@/lib/imagekit"

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

export async function POST(request: Request) {
  try {
    const { response } = await requireAuth()
    if (response) return response

    if (!isImageKitConfigured()) {
      return NextResponse.json(
        { error: "ImageKit is not configured on the server." },
        { status: 500 },
      )
    }

    const formData = await request.formData()
    const file = formData.get("file")
    const folder = String(formData.get("folder") || "/tailorhub/blog")

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Image file is required." }, { status: 400 })
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Unsupported image type." }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "Image must be less than 10MB." }, { status: 400 })
    }

    const bytes = new Uint8Array(await file.arrayBuffer())
    const uploaded = await uploadImageToImageKit({
      fileBytes: bytes,
      fileName: file.name,
      folder,
    })
    const blurDataUrl = await createBlurDataUrlFromImageUrl(uploaded.url)

    return NextResponse.json({
      url: uploaded.url,
      blurDataUrl,
      fileId: uploaded.fileId,
      width: uploaded.width,
      height: uploaded.height,
      name: uploaded.name,
    })
  } catch (error) {
    console.error("[uploads/imagekit]", error)
    return NextResponse.json({ error: "Failed to upload image." }, { status: 500 })
  }
}
