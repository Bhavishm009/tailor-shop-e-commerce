import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Features | TailorHub",
  description: "Explore TailorHub's ecommerce and custom tailoring features.",
  alternates: { canonical: "/features" },
  openGraph: {
    title: "Features | TailorHub",
    description: "Explore TailorHub's ecommerce and custom tailoring features.",
    url: "/features",
    type: "website",
  },
}

export default function FeaturesLayout({ children }: { children: React.ReactNode }) {
  return children
}
