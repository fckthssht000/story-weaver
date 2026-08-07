import { useEffect, useRef } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
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
  Loader2,
  Minus,
  Quote,
  Redo2,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DocNode } from "@/types";

interface Props {
  content: DocNode;
  onChange: (doc: DocNode) => void;
  /**
   * "card" keeps the toolbar attached to the top of the editor card.
   * "immersive" pins it to the bottom of the viewport on small screens,
   * where it replaces the app's bottom navigation.
   */
  variant?: "card" | "immersive";
  /** Optional uploader; when present the image button opens a file picker. */
  uploadImage?: ((file: File) => Promise<string>) | undefined;
  uploading?: boolean;
}

function Toolbar({
  editor,
  onPickImage,
  uploading,
  className,
}: {
  editor: Editor;
  onPickImage: () => void;
  uploading: boolean;
  className?: string;
}) {
  const btn = (active: boolean): "secondary" | "ghost" => (active ? "secondary" : "ghost");
  const Sep = () => <span className="mx-1 h-5 w-px shrink-0 bg-border" />;

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 overflow-x-auto px-2 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
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
      <Sep />
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
      <Sep />
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
      <Sep />
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
        disabled={uploading}
        onClick={onPickImage}
      >
        {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImageIcon className="size-4" />}
      </Button>
      <Sep />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label="Undo"
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 className="size-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label="Redo"
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 className="size-4" />
      </Button>
    </div>
  );
}

/**
 * Constrained editor. Structure only — no font sizes, colours, alignment
 * or inline styles are exposed. Layout is the reader's job.
 */
export function TiptapEditor({
  content,
  onChange,
  variant = "card",
  uploadImage,
  uploading = false,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

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

  const pickImage = () => {
    if (uploadImage) {
      fileRef.current?.click();
      return;
    }
    const src = window.prompt("Image URL");
    if (src) editor.chain().focus().setImage({ src }).run();
  };

  const immersive = variant === "immersive";

  return (
    <div className={cn("rounded-lg border bg-card", immersive && "border-x-0 sm:border-x")}>
      {immersive ? null : (
        <Toolbar
          editor={editor}
          onPickImage={pickImage}
          uploading={uploading}
          className="sticky top-14 z-10 flex-wrap border-b bg-card/95 backdrop-blur"
        />
      )}

      <div className={cn("px-5 py-6", immersive && "px-4 pb-24 sm:pb-6")}>
        <EditorContent editor={editor} />
      </div>

      {immersive ? (
        <Toolbar
          editor={editor}
          onPickImage={pickImage}
          uploading={uploading}
          className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:static sm:border-b sm:border-t-0 sm:bg-card/95 sm:pb-1.5"
        />
      ) : (
        <p className="border-t px-5 py-2.5 text-xs text-muted-foreground">
          Structure only — the reader decides font, size and spacing so every story reads
          consistently.
        </p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file || !uploadImage) return;
          const src = await uploadImage(file);
          if (src) editor.chain().focus().setImage({ src }).run();
        }}
      />
    </div>
  );
}
