/** @type {import('next').NextConfig} */
const imageKitUrlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT
const imageRemotePatterns = []

if (imageKitUrlEndpoint) {
  const parsed = new URL(imageKitUrlEndpoint)
  imageRemotePatterns.push({
    protocol: parsed.protocol.replace(":", ""),
    hostname: parsed.hostname,
    pathname: "/**",
  })
}

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: imageRemotePatterns,
  },
}

export default nextConfig
