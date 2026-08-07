import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { MoreHorizontal, Pencil, Plus, Trash2, PenTool, SlidersHorizontal, Clock } from "lucide-react";
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
      { title: "My stories — Buklat" },
      { name: "description", content: "Draft, edit and publish your stories." },
      { property: "og:title", content: "My stories — Buklat" },
      { property: "og:description", content: "Draft, edit and publish your stories." },
    ],
  }),
  component: MyStories,
});

function StoryListItem({ s, setEditing, setDeleting, update }: { s: any; setEditing: any; setDeleting: any; update: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="rounded-2xl border bg-card p-4 flex flex-col gap-4 shadow-sm transition-all">
      <div className="flex gap-4">
        <div className="h-20 w-16 shrink-0 overflow-hidden rounded-md bg-muted border">
          {s.cover_url && (
            <img src={s.cover_url} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between">
            <h3 className="truncate font-display text-[1.1rem] font-bold leading-tight pt-0.5">{s.title}</h3>
            <Button variant="ghost" size="icon" className="-mt-1.5 -mr-2" onClick={() => setExpanded(!expanded)}>
              <MoreHorizontal className="size-5 text-muted-foreground" />
            </Button>
          </div>
          <span
            className={
              s.status === "published"
                ? "inline-block mt-1.5 rounded bg-emerald-100/80 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-widest text-emerald-700"
                : "inline-block mt-1.5 rounded bg-muted px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground"
            }
          >
            {s.status}
          </span>
          {s.description && (
            <p className="mt-1.5 text-[0.8rem] text-muted-foreground line-clamp-1">
              {s.description}
            </p>
          )}
          <p className="mt-1 text-[0.7rem] text-muted-foreground font-medium">
            {s.genre || "No genre"} &bull; {s.chapter_count ?? 0} chapters
          </p>
        </div>
      </div>
      
      {expanded && (
        <div className="flex gap-1.5 pt-2 border-t mt-1">
          <Button variant="outline" size="sm" onClick={() => setEditing(s)} className="flex-1 h-9 rounded-xl px-2 min-w-0">
            <SlidersHorizontal className="size-3.5 mr-1.5 shrink-0 text-muted-foreground" /> 
            <span className="truncate">Edit</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => update.mutate({ id: s.id, patch: { status: s.status === 'published' ? 'draft' : 'published' }})}
            className="flex-1 h-9 rounded-xl px-2 min-w-0"
            disabled={update.isPending}
          >
            <Clock className="size-3.5 mr-1.5 shrink-0 text-muted-foreground" /> 
            <span className="truncate">{s.status === 'published' ? "Unpublish" : "Publish"}</span>
          </Button>
          <Button size="sm" asChild className="flex-1 h-9 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 px-2 min-w-0">
            <Link to="/write/$storyId" params={{ storyId: s.id }}>
              <Pencil className="size-3.5 mr-1.5 shrink-0 fill-current" /> 
              <span className="truncate">Chapters</span>
            </Link>
          </Button>
          <Button variant="outline" size="icon" onClick={() => setDeleting(s)} className="h-9 w-9 rounded-xl shrink-0 text-muted-foreground hover:text-red-600">
            <Trash2 className="size-4" />
          </Button>
        </div>
      )}
    </li>
  );
}

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
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <PenTool className="size-5" /> Writer Studio
          </h1>
          <p className="mt-1 text-[0.85rem] text-muted-foreground max-w-[280px] leading-snug">
            Manage your drafts, edit details, upload cover artwork, and publish story chapters
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="shrink-0 bg-zinc-900 text-white rounded-xl shadow-sm hover:bg-zinc-800">
          <Plus className="mr-1.5 size-4" /> New
        </Button>
      </header>

      {stories.isLoading ? (
        <div className="h-24 animate-pulse rounded-lg bg-muted/60" />
      ) : !stories.data?.length ? (
        <p className="rounded-lg border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
          No stories yet. Start one above.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {stories.data.map((s) => (
            <StoryListItem 
              key={s.id} 
              s={s} 
              setEditing={setEditing} 
              setDeleting={setDeleting} 
              update={update} 
            />
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
