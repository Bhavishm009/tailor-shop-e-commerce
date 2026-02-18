import { ProductForm } from "@/app/admin/products/product-form"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function AdminProductEditPage({ params }: PageProps) {
  const { id } = await params
  return <ProductForm productId={id} />
}
