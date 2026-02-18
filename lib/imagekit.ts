import ImageKit, { toFile } from "@imagekit/nodejs"

const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY
const IMAGEKIT_PUBLIC_KEY = process.env.IMAGEKIT_PUBLIC_KEY
const IMAGEKIT_URL_ENDPOINT = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT

function getImageKitClient() {
  if (!IMAGEKIT_PRIVATE_KEY || !IMAGEKIT_PUBLIC_KEY || !IMAGEKIT_URL_ENDPOINT) {
    throw new Error("ImageKit is not configured. Set IMAGEKIT_PRIVATE_KEY, IMAGEKIT_PUBLIC_KEY, and NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT.")
  }

  return new ImageKit({
    privateKey: IMAGEKIT_PRIVATE_KEY,
  })
}

export async function uploadImageToImageKit(args: {
  fileBytes: Uint8Array
  fileName: string
  folder?: string
}) {
  const imageKit = getImageKitClient()
  const { fileBytes, fileName, folder } = args

  const uploaded = await imageKit.files.upload({
    file: await toFile(fileBytes, fileName),
    fileName,
    folder: folder || "/tailorhub/blog",
    useUniqueFileName: true,
  })

  if (!uploaded.url) {
    throw new Error("ImageKit upload did not return a URL.")
  }

  return {
    url: uploaded.url,
    fileId: uploaded.fileId,
    name: uploaded.name,
    width: uploaded.width,
    height: uploaded.height,
  }
}

export async function createBlurDataUrlFromImageUrl(url: string) {
  const imageKit = getImageKitClient()
  const tinyBlurUrl = imageKit.helper.buildSrc({
    urlEndpoint: IMAGEKIT_URL_ENDPOINT!,
    src: url,
    transformation: [{ width: 24, height: 24, quality: 20, blur: 40 }],
  })

  const response = await fetch(tinyBlurUrl)
  if (!response.ok) {
    throw new Error("Unable to generate blur placeholder from ImageKit URL.")
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  const contentType = response.headers.get("content-type") || "image/jpeg"
  return `data:${contentType};base64,${buffer.toString("base64")}`
}

export function isImageKitConfigured() {
  return Boolean(IMAGEKIT_PRIVATE_KEY && IMAGEKIT_PUBLIC_KEY && IMAGEKIT_URL_ENDPOINT)
}
