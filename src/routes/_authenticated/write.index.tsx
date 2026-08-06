import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useMyStories, useStoryMutations } from "@/hooks/useStories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { GENRES } from "@/types";

export const Route = createFileRoute("/_authenticated/write/")({
  head: () => ({
    meta: [
      { title: "My stories — StoryApp" },
      { name: "description", content: "Draft, edit and publish your stories." },
      { property: "og:title", content: "My stories — StoryApp" },
      { property: "og:description", content: "Draft, edit and publish your stories." },
    ],
  }),
  component: MyStories,
});

function MyStories() {
  const { userId } = useAuth();
  const navigate = useNavigate();
  const stories = useMyStories(userId);
  const { create } = useStoryMutations(userId);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState<string>("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    create.mutate(
      { title, description, ...(genre ? { genre } : {}) },
      {
        onSuccess: (story) => {
          setOpen(false);
          setTitle("");
          setDescription("");
          navigate({ to: "/write/$storyId", params: { storyId: story.id } });
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">My stories</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Write the words; the reader handles the layout.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" /> New
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">Start a new story</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={submit}>
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
              <Button type="submit" className="w-full" disabled={create.isPending}>
                Create draft
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      {stories.isLoading ? (
        <div className="h-24 animate-pulse rounded-lg bg-muted/60" />
      ) : !stories.data?.length ? (
        <p className="rounded-lg border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
          No stories yet. Start one above.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {stories.data.map((s) => (
            <li key={s.id}>
              <Link
                to="/write/$storyId"
                params={{ storyId: s.id }}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-base font-semibold">{s.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Updated {new Date(s.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={
                    s.status === "published"
                      ? "rounded-full bg-primary/10 px-2 py-0.5 text-[0.65rem] uppercase tracking-wider text-primary"
                      : "rounded-full bg-muted px-2 py-0.5 text-[0.65rem] uppercase tracking-wider text-muted-foreground"
                  }
                >
                  {s.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
