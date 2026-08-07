import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { uploadMedia } from "@/services/uploadService";
import { GENRES, type Story } from "@/types";

export interface StoryDraft {
  title: string;
  description: string;
  genre: string;
  /** undefined = leave the existing cover untouched. */
  cover_url?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Existing story when editing; omitted when creating. */
  story?: Story | undefined;
  userId: string | null;
  pending?: boolean;
  onSubmit: (draft: StoryDraft) => void;
}

export function StoryFormDialog({ open, onOpenChange, story, userId, pending, onSubmit }: Props) {
  const editing = !!story;
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("");
  const [cover, setCover] = useState<string | null>(null);
  const [coverTouched, setCoverTouched] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(story?.title ?? "");
    setDescription(story?.description ?? "");
    setGenre(story?.genre ?? "");
    setCover(story?.cover_url ?? null);
    setCoverTouched(false);
  }, [open, story]);

  const pickCover = async (file: File | undefined) => {
    if (!file || !userId) return;
    setUploading(true);
    try {
      const url = await uploadMedia("covers", userId, file, "cover");
      setCover(url);
      setCoverTouched(true);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      genre,
      // Editing without touching the image leaves the cover exactly as it was.
      ...(editing && !coverTouched ? {} : { cover_url: cover }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            {editing ? "Story details" : "Start a new story"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the cover, blurb or genre. Skip the image to keep the current one."
              : "You can change any of this later."}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label>Cover image</Label>
            <div className="flex items-start gap-3">
              <div className="relative h-32 w-24 shrink-0 overflow-hidden rounded-md border bg-muted">
                {cover ? (
                  <img
                    src={cover}
                    alt="Story cover preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <ImagePlus className="size-5" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ImagePlus className="size-4" />
                  )}
                  {cover ? "Replace" : "Upload"}
                </Button>
                {cover ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setCover(null);
                      setCoverTouched(true);
                    }}
                  >
                    <X className="size-4" /> Remove
                  </Button>
                ) : null}
                <p className="max-w-[16rem] text-xs text-muted-foreground">
                  Portrait images look best. JPG or PNG, up to 5 MB.
                </p>
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void pickCover(e.target.files?.[0])}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short blurb for readers browsing Discover."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="genre">Genre</Label>
            <select
              id="genre"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Unspecified</option>
              {GENRES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <Button type="submit" className="w-full" disabled={pending || uploading}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {editing ? "Save changes" : "Create draft"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
