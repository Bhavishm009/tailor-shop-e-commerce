import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "TailorHub - Custom Stitching and Ready-Made Fashion"
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = "image/png"

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0b2234 0%, #145f8e 55%, #2c7da8 100%)",
          color: "#f8fafc",
          padding: "64px",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 999,
              background: "rgba(255,255,255,0.16)",
              border: "2px solid rgba(255,255,255,0.28)",
            }}
          />
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.8 }}>TailorHub</div>
        </div>

        <div style={{ maxWidth: 920 }}>
          <div style={{ fontSize: 68, lineHeight: 1.06, fontWeight: 800, letterSpacing: -2.1 }}>
            Custom Stitching.
            <br />
            Premium Ready-Made.
          </div>
          <div style={{ marginTop: 20, fontSize: 28, lineHeight: 1.3, color: "rgba(248,250,252,0.94)" }}>
            Expert tailoring, clean ecommerce experience, and perfect fit delivery.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 24, opacity: 0.94 }}>tailorhub.com</div>
          <div
            style={{
              fontSize: 22,
              background: "rgba(255,255,255,0.14)",
              border: "1px solid rgba(255,255,255,0.2)",
              padding: "10px 16px",
              borderRadius: 999,
            }}
          >
            Shop + Stitch
          </div>
        </div>
      </div>
    ),
    size,
  )
}

