import { BlogForm } from "@/app/admin/blogs/blog-form"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function AdminBlogEditPage({ params }: PageProps) {
  const { id } = await params
  return <BlogForm blogId={id} />
}
