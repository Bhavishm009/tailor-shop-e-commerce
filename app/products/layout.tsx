import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Products | TailorHub",
  description: "Browse ready-made shirts, pants, and dresses. Add to cart and shop from TailorHub's premium collection.",
  alternates: { canonical: "/products" },
  openGraph: {
    title: "Products | TailorHub",
    description: "Browse ready-made shirts, pants, and dresses. Add to cart and shop from TailorHub's premium collection.",
    url: "/products",
    type: "website",
  },
}

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return children
}
