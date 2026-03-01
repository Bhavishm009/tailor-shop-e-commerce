import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Products | TailorHub",
  description: "Browse ready-made shirts, pants, and dresses. Add to cart and shop from TailorHub's premium collection.",
  keywords: ["ready-made clothing", "online fashion store", "tailorhub products", "shop garments online"],
  alternates: { canonical: "/products" },
  openGraph: {
    title: "Products | TailorHub",
    description: "Browse ready-made shirts, pants, and dresses. Add to cart and shop from TailorHub's premium collection.",
    url: "/products",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "TailorHub ready-made products" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Products | TailorHub",
    description: "Browse ready-made shirts, pants, and dresses from TailorHub's premium collection.",
    images: ["/twitter-image"],
  },
}

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return children
}
