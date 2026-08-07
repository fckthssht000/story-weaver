import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useRealtime } from "@/hooks/useRealtime";
import { useMyStories, useStoryMutations } from "@/hooks/useStories";
import { StoryFormDialog, type StoryDraft } from "@/components/story/StoryFormDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Story } from "@/types";

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
  const { create, update, remove } = useStoryMutations(userId);

  useRealtime(["stories"], { filter: userId ? `author_id=eq.${userId}` : undefined, enabled: !!userId });

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Story | null>(null);
  const [deleting, setDeleting] = useState<Story | null>(null);

  const submitNew = (draft: StoryDraft) => {
    if (!userId) return;
    create.mutate(
      {
        title: draft.title,
        description: draft.description,
        ...(draft.genre ? { genre: draft.genre } : {}),
        ...(draft.cover_url ? { cover_url: draft.cover_url } : {}),
      },
      {
        onSuccess: (story) => {
          setCreateOpen(false);
          navigate({ to: "/write/$storyId", params: { storyId: story.id } });
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const submitEdit = (draft: StoryDraft) => {
    if (!editing) return;
    update.mutate(
      {
        id: editing.id,
        patch: {
          title: draft.title,
          description: draft.description || null,
          genre: draft.genre || null,
          ...(draft.cover_url !== undefined ? { cover_url: draft.cover_url } : {}),
        },
      },
      {
        onSuccess: () => {
          setEditing(null);
          toast.success("Story updated");
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
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" /> New
        </Button>
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
            <li key={s.id} className="flex items-center gap-2 pr-2">
              <Link
                to="/write/$storyId"
                params={{ storyId: s.id }}
                className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted"
              >
                <div className="h-14 w-10 shrink-0 overflow-hidden rounded border bg-muted">
                  {s.cover_url ? (
                    <img src={s.cover_url} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={`Options for ${s.title}`}>
                    <MoreVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setEditing(s)}>
                    <Pencil className="size-4" /> Edit details
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onSelect={() => setDeleting(s)}
                  >
                    <Trash2 className="size-4" /> Delete story
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      )}

      <StoryFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        userId={userId}
        pending={create.isPending}
        onSubmit={submitNew}
      />
      <StoryFormDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        story={editing ?? undefined}
        userId={userId}
        pending={update.isPending}
        onSubmit={submitEdit}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleting?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Every chapter goes with it. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const id = deleting?.id;
                setDeleting(null);
                if (id)
                  remove.mutate(id, {
                    onSuccess: () => toast.success("Story deleted"),
                    onError: (err) => toast.error(err.message),
                  });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
