import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Custom Stitching | TailorHub",
  description: "Book custom stitching with expert tailors. Share measurements and get a perfect fit.",
  keywords: ["custom stitching", "tailor service", "made to measure", "tailoring online"],
  alternates: { canonical: "/custom-stitching" },
  openGraph: {
    title: "Custom Stitching | TailorHub",
    description: "Book custom stitching with expert tailors. Share measurements and get a perfect fit.",
    url: "/custom-stitching",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "TailorHub custom stitching" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Custom Stitching | TailorHub",
    description: "Book custom stitching with expert tailors. Share measurements and get a perfect fit.",
    images: ["/twitter-image"],
  },
}

export default function CustomStitchingLayout({ children }: { children: React.ReactNode }) {
  return children
}
