import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Layers, Loader2, Plus, Save, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import { useRealtime } from "@/hooks/useRealtime";
import { useStory, useStoryMutations } from "@/hooks/useStories";
import { useChapterList, useChapterMutations, useChapters } from "@/hooks/useChapters";
import { TiptapEditor } from "@/components/editor/TiptapEditor";
import { ChapterList } from "@/components/editor/ChapterList";
import { StoryFormDialog, type StoryDraft } from "@/components/story/StoryFormDialog";
import { uploadMedia } from "@/services/uploadService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
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
import { EMPTY_DOC, type DocNode } from "@/types";

export const Route = createFileRoute("/_authenticated/write/$storyId")({
  head: () => ({
    meta: [
      { title: "Editor — StoryApp" },
      { name: "description", content: "Write chapters in a constrained, structure-only editor." },
      { property: "og:title", content: "Editor — StoryApp" },
      { property: "og:description", content: "Write chapters in a structure-only editor." },
    ],
  }),
  component: Editor,
});

function Editor() {
  const { storyId } = Route.useParams();
  const navigate = useNavigate();
  const { userId } = useAuth();
  const { settings } = useSettings();

  const story = useStory(storyId);
  const { update, remove } = useStoryMutations(userId);
  const summaries = useChapterList(storyId, true);
  const chapters = useChapters(storyId, true);
  const mutations = useChapterMutations(storyId);

  useRealtime(["chapters"], { filter: `story_id=eq.${storyId}` });
  useRealtime(["stories"], { filter: `id=eq.${storyId}` });

  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const [title, setTitle] = useState("");
  const [doc, setDoc] = useState<DocNode>(EMPTY_DOC);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploading, setUploading] = useState(false);
  const loadedFor = useRef<string | undefined>(undefined);

  const list = useMemo(() => summaries.data ?? [], [summaries.data]);
  const active = chapters.data?.find((c) => c.id === activeId);

  useEffect(() => {
    if (!activeId && list.length) setActiveId(list[0]!.id);
  }, [activeId, list]);

  useEffect(() => {
    if (!active || loadedFor.current === active.id) return;
    loadedFor.current = active.id;
    setTitle(active.title ?? "");
    setDoc(active.content ?? EMPTY_DOC);
    setDirty(false);
  }, [active]);

  const save = useCallback(
    (silent = false) => {
      if (!activeId) return;
      mutations.save.mutate(
        { id: activeId, title, content: doc },
        {
          onSuccess: () => {
            setDirty(false);
            setSavedAt(Date.now());
            if (!silent) toast.success("Chapter saved");
          },
          onError: (e) => toast.error(e.message),
        },
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeId, title, doc],
  );

  // Autosave: debounced, and only when the settings switch is on.
  useEffect(() => {
    if (!settings.autosave || !dirty || !activeId) return;
    const t = setTimeout(() => save(true), settings.autosaveDelay);
    return () => clearTimeout(t);
  }, [settings.autosave, settings.autosaveDelay, dirty, activeId, title, doc, save]);

  const move = (id: string, direction: -1 | 1) => {
    const i = list.findIndex((c) => c.id === id);
    const j = i + direction;
    if (i < 0 || j < 0 || j >= list.length) return;
    const reordered = [...list];
    const [item] = reordered.splice(i, 1);
    reordered.splice(j, 0, item!);
    mutations.reorder.mutate(reordered.map((c, idx) => ({ id: c.id, order_index: idx })));
  };

  const addChapter = () =>
    mutations.create.mutate(
      { title: `Chapter ${list.length + 1}`, orderIndex: list.length },
      {
        onSuccess: (c) => {
          setActiveId(c.id);
          setDrawerOpen(false);
        },
      },
    );

  const published = story.data?.status === "published";

  const saveDetails = (draft: StoryDraft) =>
    update.mutate(
      {
        id: storyId,
        patch: {
          title: draft.title,
          description: draft.description || null,
          genre: draft.genre || null,
          ...(draft.cover_url !== undefined ? { cover_url: draft.cover_url } : {}),
        },
      },
      {
        onSuccess: () => {
          setDetailsOpen(false);
          toast.success("Story updated");
        },
        onError: (e) => toast.error(e.message),
      },
    );

  const uploadInlineImage = async (file: File) => {
    if (!userId) return "";
    setUploading(true);
    try {
      return await uploadMedia("covers", userId, file, `inline-${storyId}`);
    } catch (err) {
      toast.error((err as Error).message);
      return "";
    } finally {
      setUploading(false);
    }
  };

  const chapterPanel = (
    <>
      <ChapterList
        chapters={list}
        activeId={activeId}
        onSelect={(id) => {
          setActiveId(id);
          setDrawerOpen(false);
        }}
        onMove={move}
        onDelete={(id) =>
          mutations.remove.mutate(id, {
            onSuccess: () => {
              if (id === activeId) setActiveId(undefined);
              loadedFor.current = undefined;
            },
          })
        }
      />
      <Button variant="outline" size="sm" className="w-full" onClick={addChapter}>
        <Plus className="size-4" /> Add chapter
      </Button>
    </>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5">
        <Button variant="ghost" size="icon" asChild aria-label="Back to my stories">
          <Link to="/write">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="min-w-0 flex-1 truncate font-display text-lg font-semibold">
          {story.data?.title ?? "Story"}
        </h1>

        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Chapters" className="md:hidden">
              <Layers className="size-4" />
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle className="font-display">
                Chapters <span className="text-muted-foreground">({list.length})</span>
              </DrawerTitle>
            </DrawerHeader>
            <div className="space-y-3 px-4 pb-8">{chapterPanel}</div>
          </DrawerContent>
        </Drawer>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Story details"
          onClick={() => setDetailsOpen(true)}
        >
          <Settings2 className="size-4" />
        </Button>
        <Button
          variant={published ? "outline" : "default"}
          size="sm"
          onClick={() =>
            update.mutate(
              { id: storyId, patch: { status: published ? "draft" : "published" } },
              {
                onSuccess: () =>
                  toast.success(published ? "Moved back to draft" : "Story published"),
              },
            )
          }
        >
          {published ? "Unpublish" : "Publish"}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
        <aside className="hidden space-y-3 md:block">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Chapters
          </h2>
          {chapterPanel}
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-destructive"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="size-4" /> Delete story
          </Button>
        </aside>

        <section className="space-y-3">
          {activeId ? (
            <>
              <div className="sticky top-14 z-20 flex gap-2 bg-background/95 py-2 backdrop-blur">
                <Input
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setDirty(true);
                  }}
                  placeholder="Chapter title"
                  className="font-display"
                />
                <Button onClick={() => save()} disabled={mutations.save.isPending || !dirty}>
                  {mutations.save.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : dirty ? (
                    <Save className="size-4" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  {dirty ? "Save" : "Saved"}
                </Button>
              </div>
              {settings.autosave && savedAt ? (
                <p className="text-right text-xs text-muted-foreground">
                  Autosaved {new Date(savedAt).toLocaleTimeString()}
                </p>
              ) : null}
              <TiptapEditor
                variant="immersive"
                content={doc}
                uploading={uploading}
                uploadImage={uploadInlineImage}
                onChange={(next) => {
                  setDoc(next);
                  setDirty(true);
                }}
              />
            </>
          ) : (
            <div className="space-y-3 rounded-lg border border-dashed px-6 py-16 text-center">
              <p className="text-sm text-muted-foreground">Add a chapter to start writing.</p>
              <Button size="sm" onClick={addChapter}>
                <Plus className="size-4" /> New chapter
              </Button>
            </div>
          )}
        </section>
      </div>

      <StoryFormDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        story={story.data ?? undefined}
        userId={userId}
        pending={update.isPending}
        onSubmit={saveDetails}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this story?</AlertDialogTitle>
            <AlertDialogDescription>
              Every chapter goes with it. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                remove.mutate(storyId, {
                  onSuccess: () => {
                    toast.success("Story deleted");
                    navigate({ to: "/write" });
                  },
                })
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
