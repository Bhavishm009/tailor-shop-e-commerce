import "dotenv/config"
import { uploadFileToImageKit, isImageKitConfigured } from "../lib/imagekit"

const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7bYlQAAAAASUVORK5CYII="

async function main() {
  console.log("configured", isImageKitConfigured())
  const bytes = Uint8Array.from(Buffer.from(pngBase64, "base64"))
  const uploaded = await uploadFileToImageKit({
    fileBytes: bytes,
    fileName: `health-${Date.now()}.png`,
    folder: "/tailorhub/health",
  })
  console.log(uploaded)
}

main().catch((error) => {
  console.error("upload test failed", error)
  process.exit(1)
})
