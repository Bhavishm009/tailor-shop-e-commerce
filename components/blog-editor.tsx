"use client"

import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Image from "@tiptap/extension-image"
import Link from "@tiptap/extension-link"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import Highlight from "@tiptap/extension-highlight"
import { Button } from "@/components/ui/button"
import { isValidImageFile, uploadFile } from "@/lib/file-upload"

type BlogEditorProps = {
  value: string
  onChange: (value: string) => void
}

export function BlogEditor({ value, onChange }: BlogEditorProps) {
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3, 4],
        },
      }),
      Image.configure({ inline: false }),
      Underline,
      Highlight,
      Link.configure({
        openOnClick: true,
        autolink: true,
        protocols: ["http", "https", "mailto"],
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    content: value || "<p></p>",
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    if (value && value !== current) {
      editor.commands.setContent(value)
    }
    if (!value && current !== "<p></p>") {
      editor.commands.setContent("<p></p>")
    }
  }, [value, editor])

  const addImage = useCallback(() => {
    fileInputRef.current?.click()
  }, [editor])

  const addLink = useCallback(() => {
    if (!editor) return
    const previousUrl = editor.getAttributes("link").href || ""
    const url = window.prompt("Link URL", previousUrl)

    if (url === null) return
    if (url.trim() === "") {
      editor.chain().focus().unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run()
  }, [editor])

  const onEditorImagePick = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      if (!editor) return

      const file = event.target.files?.[0]
      event.target.value = ""
      if (!file) return

      setUploadError("")

      if (!isValidImageFile(file)) {
        setUploadError("Please upload a valid image (JPG/PNG/WebP/GIF, max 10MB).")
        return
      }

      setIsUploadingImage(true)
      try {
        const uploaded = await uploadFile(file, "/tailorhub/blog/editor")
        editor.chain().focus().setImage({ src: uploaded.url }).run()
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : "Image upload failed.")
      } finally {
        setIsUploadingImage(false)
      }
    },
    [editor],
  )

  if (!editor) {
    return null
  }

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={onEditorImagePick}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => editor.chain().focus().toggleBold().run()}>
          Bold
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => editor.chain().focus().toggleItalic().run()}>
          Italic
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => editor.chain().focus().toggleUnderline().run()}>
          Underline
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => editor.chain().focus().toggleHighlight().run()}>
          Highlight
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => editor.chain().focus().toggleStrike().run()}>
          Strike
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          H2
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          H3
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}>
          H4
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => editor.chain().focus().toggleBulletList().run()}>
          Bullets
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          Numbered
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          Quote
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
          Code
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => editor.chain().focus().setTextAlign("left").run()}>
          Left
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => editor.chain().focus().setTextAlign("center").run()}>
          Center
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => editor.chain().focus().setTextAlign("right").run()}>
          Right
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={addLink}>
          Link
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={addImage} disabled={isUploadingImage}>
          {isUploadingImage ? "Uploading..." : "Upload Image"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => editor.chain().focus().undo().run()}>
          Undo
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => editor.chain().focus().redo().run()}>
          Redo
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}>
          Clear
        </Button>
      </div>
      {uploadError ? <p className="text-sm text-destructive">{uploadError}</p> : null}
      <div className="min-h-[240px] rounded-md border bg-background px-3 py-2">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
