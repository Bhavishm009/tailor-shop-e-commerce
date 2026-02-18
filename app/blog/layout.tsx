import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Blog | TailorHub",
  description: "Style tips, tailoring guides, and fabric insights from TailorHub.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Blog | TailorHub",
    description: "Style tips, tailoring guides, and fabric insights from TailorHub.",
    url: "/blog",
    type: "website",
  },
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children
}
