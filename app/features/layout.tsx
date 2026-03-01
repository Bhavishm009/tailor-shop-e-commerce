import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Features | TailorHub",
  description: "Explore TailorHub's ecommerce and custom tailoring features.",
  keywords: ["TailorHub features", "tailoring platform", "fashion ecommerce", "custom stitching software"],
  alternates: { canonical: "/features" },
  openGraph: {
    title: "Features | TailorHub",
    description: "Explore TailorHub's ecommerce and custom tailoring features.",
    url: "/features",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "TailorHub features" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Features | TailorHub",
    description: "Explore TailorHub's ecommerce and custom tailoring features.",
    images: ["/twitter-image"],
  },
}

export default function FeaturesLayout({ children }: { children: React.ReactNode }) {
  return children
}
