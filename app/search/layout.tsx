import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Search | TailorHub",
  description: "Search TailorHub products and blog posts.",
  alternates: { canonical: "/search" },
  openGraph: {
    title: "Search | TailorHub",
    description: "Search TailorHub products and blog posts.",
    url: "/search",
    type: "website",
  },
}

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children
}
