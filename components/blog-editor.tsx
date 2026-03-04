"use client"

import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Image from "@tiptap/extension-image"
import Link from "@tiptap/extension-link"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import Highlight from "@tiptap/extension-highlight"
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Highlighter,
  Strikethrough,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  Quote,
  Code2,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link2,
  Link2Off,
  ImagePlus,
  Undo2,
  Redo2,
  Eraser,
} from "lucide-react"
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

  const words = editor.getText().trim().split(/\s+/).filter(Boolean).length
  const characters = editor.getText().length

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={onEditorImagePick}
      />
      <div className="sticky top-0 z-10 rounded-md border bg-background/95 p-2 backdrop-blur">
        <div className="flex flex-wrap gap-2">
          <ToolbarButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()}><Highlighter className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton active={editor.isActive("heading", { level: 4 })} onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}><Heading4 className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}><Code2 className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}><AlignLeft className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}><AlignCenter className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}><AlignRight className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={addLink}><Link2 className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().unsetLink().run()}><Link2Off className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={addImage} disabled={isUploadingImage}><ImagePlus className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().undo().run()}><Undo2 className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().redo().run()}><Redo2 className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}><Eraser className="h-4 w-4" /></ToolbarButton>
        </div>
      </div>
      {uploadError ? <p className="text-sm text-destructive">{uploadError}</p> : null}
      <div className="rounded-md border bg-background px-3 py-2">
        <EditorContent editor={editor} className="blog-editor-content" />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Rich editor enabled: headings, lists, links, media, alignment, code</span>
        <span>{words} words • {characters} chars</span>
      </div>
    </div>
  )
}

function ToolbarButton({
  children,
  onClick,
  active = false,
  disabled = false,
}: {
  children: React.ReactNode
  onClick: () => void
  active?: boolean
  disabled?: boolean
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "outline"}
      onClick={onClick}
      disabled={disabled}
      className="h-8 w-8 p-0"
    >
      {children}
    </Button>
  )
}
