import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  List,
  ListOrdered,
  Minus,
  Quote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DocNode } from "@/types";

interface Props {
  content: DocNode;
  onChange: (doc: DocNode) => void;
}

/**
 * Constrained editor. Structure only — no font sizes, colours, alignment
 * or inline styles are exposed. Layout is the reader's job.
 */
export function TiptapEditor({ content, onChange }: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        code: false,
        strike: false,
        link: false,
        underline: false,
      }),
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder: "Begin your chapter…" }),
    ],
    content: content as never,
    editorProps: {
      attributes: { class: "editor-prose min-h-[50vh]" },
    },
    onUpdate: ({ editor: e }) => onChange(e.getJSON() as DocNode),
  });

  useEffect(() => {
    if (!editor) return;
    const current = JSON.stringify(editor.getJSON());
    if (current !== JSON.stringify(content)) {
      editor.commands.setContent(content as never, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, content]);

  if (!editor) return <div className="min-h-[50vh] animate-pulse rounded-md bg-muted/50" />;

  const btn = (active: boolean) => (active ? "secondary" : "ghost") as const;

  return (
    <div className="rounded-lg border bg-card">
      <div className="sticky top-14 z-10 flex flex-wrap items-center gap-0.5 border-b bg-card/95 px-2 py-1.5 backdrop-blur">
        <Button
          type="button"
          size="icon"
          variant={btn(editor.isActive("bold"))}
          aria-label="Bold"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant={btn(editor.isActive("italic"))}
          aria-label="Italic"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-4" />
        </Button>
        <span className="mx-1 h-5 w-px bg-border" />
        <Button
          type="button"
          size="icon"
          variant={btn(editor.isActive("heading", { level: 2 }))}
          aria-label="Section heading"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant={btn(editor.isActive("heading", { level: 3 }))}
          aria-label="Sub heading"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="size-4" />
        </Button>
        <span className="mx-1 h-5 w-px bg-border" />
        <Button
          type="button"
          size="icon"
          variant={btn(editor.isActive("bulletList"))}
          aria-label="Bullet list"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant={btn(editor.isActive("orderedList"))}
          aria-label="Numbered list"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant={btn(editor.isActive("blockquote"))}
          aria-label="Quote"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="size-4" />
        </Button>
        <span className="mx-1 h-5 w-px bg-border" />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Scene break"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Insert image"
          onClick={() => {
            const src = window.prompt("Image URL");
            if (src) editor.chain().focus().setImage({ src }).run();
          }}
        >
          <ImageIcon className="size-4" />
        </Button>
      </div>
      <div className="px-5 py-6">
        <EditorContent editor={editor} />
      </div>
      <p className="border-t px-5 py-2.5 text-xs text-muted-foreground">
        Structure only — the reader decides font, size and spacing so every story reads consistently.
      </p>
    </div>
  );
}
