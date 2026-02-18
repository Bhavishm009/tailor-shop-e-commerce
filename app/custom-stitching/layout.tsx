import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Custom Stitching | TailorHub",
  description: "Book custom stitching with expert tailors. Share measurements and get a perfect fit.",
  alternates: { canonical: "/custom-stitching" },
  openGraph: {
    title: "Custom Stitching | TailorHub",
    description: "Book custom stitching with expert tailors. Share measurements and get a perfect fit.",
    url: "/custom-stitching",
    type: "website",
  },
}

export default function CustomStitchingLayout({ children }: { children: React.ReactNode }) {
  return children
}
