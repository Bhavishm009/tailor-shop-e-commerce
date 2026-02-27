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

function toImageKitFilePath(url: string) {
  if (!IMAGEKIT_URL_ENDPOINT) return null

  try {
    const endpoint = new URL(IMAGEKIT_URL_ENDPOINT)
    const target = new URL(url)
    if (endpoint.host !== target.host) return null

    const endpointPath = endpoint.pathname.replace(/\/+$/, "")
    let filePath = target.pathname

    if (endpointPath && endpointPath !== "/") {
      if (filePath === endpointPath) {
        return null
      }
      if (!filePath.startsWith(`${endpointPath}/`)) {
        return null
      }
      filePath = filePath.slice(endpointPath.length)
    }

    // Ignore transformed delivery URLs and keep the original file path.
    filePath = filePath.replace(/^\/tr:[^/]+/, "")
    if (!filePath.startsWith("/")) filePath = `/${filePath}`
    if (filePath === "/" || filePath.length < 2) return null
    return filePath
  } catch {
    return null
  }
}

export async function uploadFileToImageKit(args: {
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

export async function deleteImageKitFileByUrl(url: string) {
  if (!url || !isImageKitConfigured()) return false

  const filePath = toImageKitFilePath(url)
  if (!filePath) return false

  const imageKit = getImageKitClient()
  const escaped = filePath.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
  const assets = await imageKit.assets.list({
    type: "file",
    limit: 1,
    searchQuery: `filePath = "${escaped}"`,
  })
  let fileId: string | null = null
  for (const asset of assets) {
    if (asset.type === "file" && "fileId" in asset && typeof asset.fileId === "string") {
      fileId = asset.fileId
      break
    }
  }
  if (!fileId) return false

  await imageKit.files.delete(fileId)
  return true
}

export async function deleteManyImageKitFilesByUrls(urls: Array<string | null | undefined>) {
  const uniqueUrls = Array.from(new Set(urls.filter((url): url is string => typeof url === "string" && url.trim().length > 0)))
  if (!uniqueUrls.length || !isImageKitConfigured()) return

  await Promise.all(
    uniqueUrls.map(async (url) => {
      try {
        await deleteImageKitFileByUrl(url)
      } catch (error) {
        console.warn("[imagekit/delete]", { url, error })
      }
    }),
  )
}

export function isImageKitConfigured() {
  return Boolean(IMAGEKIT_PRIVATE_KEY && IMAGEKIT_PUBLIC_KEY && IMAGEKIT_URL_ENDPOINT)
}
