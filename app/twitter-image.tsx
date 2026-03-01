import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "TailorHub - Tailoring and Fashion Commerce"
export const size = {
  width: 1200,
  height: 600,
}
export const contentType = "image/png"

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(130deg, #102a43 0%, #1f6f9b 65%, #8fbcd4 100%)",
          color: "#f8fafc",
          padding: "48px 56px",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div style={{ fontSize: 32, fontWeight: 700 }}>TailorHub</div>
        <div style={{ fontSize: 62, lineHeight: 1.08, fontWeight: 800, maxWidth: 940 }}>
          Custom Stitching and Ready-Made Fashion
        </div>
        <div style={{ fontSize: 24, opacity: 0.95 }}>
          Better fit. Better style. Better buying experience.
        </div>
      </div>
    ),
    size,
  )
}

