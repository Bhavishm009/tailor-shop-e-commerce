import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Search | TailorHub",
  description: "Search TailorHub products and blog posts.",
  keywords: ["search products", "tailorhub search", "find clothing", "tailoring blog search"],
  alternates: { canonical: "/search" },
  openGraph: {
    title: "Search | TailorHub",
    description: "Search TailorHub products and blog posts.",
    url: "/search",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Search TailorHub" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Search | TailorHub",
    description: "Search TailorHub products and blog posts.",
    images: ["/twitter-image"],
  },
}

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children
}
