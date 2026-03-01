import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Blog | TailorHub",
  description: "Style tips, tailoring guides, and fabric insights from TailorHub.",
  keywords: ["fashion blog", "tailoring tips", "style guide", "fabric knowledge", "tailorhub journal"],
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Blog | TailorHub",
    description: "Style tips, tailoring guides, and fabric insights from TailorHub.",
    url: "/blog",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "TailorHub blog and style guides" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog | TailorHub",
    description: "Style tips, tailoring guides, and fabric insights from TailorHub.",
    images: ["/twitter-image"],
  },
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children
}
