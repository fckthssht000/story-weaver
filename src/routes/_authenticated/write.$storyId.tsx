import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Loader2, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useStory, useStoryMutations } from "@/hooks/useStories";
import { useChapterList, useChapterMutations, useChapters } from "@/hooks/useChapters";
import { TiptapEditor } from "@/components/editor/TiptapEditor";
import { ChapterList } from "@/components/editor/ChapterList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  const story = useStory(storyId);
  const { update, remove } = useStoryMutations(userId);
  const summaries = useChapterList(storyId, true);
  const chapters = useChapters(storyId, true);
  const mutations = useChapterMutations(storyId);

  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const [title, setTitle] = useState("");
  const [doc, setDoc] = useState<DocNode>(EMPTY_DOC);
  const [dirty, setDirty] = useState(false);
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

  const save = () => {
    if (!activeId) return;
    mutations.save.mutate(
      { id: activeId, title, content: doc },
      {
        onSuccess: () => {
          setDirty(false);
          toast.success("Chapter saved");
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  const move = (id: string, direction: -1 | 1) => {
    const i = list.findIndex((c) => c.id === id);
    const j = i + direction;
    if (i < 0 || j < 0 || j >= list.length) return;
    const reordered = [...list];
    const [item] = reordered.splice(i, 1);
    reordered.splice(j, 0, item!);
    mutations.reorder.mutate(reordered.map((c, idx) => ({ id: c.id, order_index: idx })));
  };

  const published = story.data?.status === "published";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild aria-label="Back to my stories">
          <Link to="/write">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="min-w-0 flex-1 truncate font-display text-xl font-semibold">
          {story.data?.title ?? "Story"}
        </h1>
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
        <aside className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Chapters
            </h2>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Add chapter"
              onClick={() =>
                mutations.create.mutate(
                  { title: `Chapter ${list.length + 1}`, orderIndex: list.length },
                  { onSuccess: (c) => setActiveId(c.id) },
                )
              }
            >
              <Plus className="size-4" />
            </Button>
          </div>
          <ChapterList
            chapters={list}
            activeId={activeId}
            onSelect={(id) => setActiveId(id)}
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

          <Button
            variant="ghost"
            size="sm"
            className="w-full text-destructive"
            onClick={() => {
              if (!window.confirm("Delete this story and all its chapters?")) return;
              remove.mutate(storyId, { onSuccess: () => navigate({ to: "/write" }) });
            }}
          >
            Delete story
          </Button>
        </aside>

        <section className="space-y-3">
          {activeId ? (
            <>
              <div className="flex gap-2">
                <Input
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setDirty(true);
                  }}
                  placeholder="Chapter title"
                  className="font-display"
                />
                <Button onClick={save} disabled={mutations.save.isPending || !dirty}>
                  {mutations.save.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Save
                </Button>
              </div>
              <TiptapEditor
                content={doc}
                onChange={(next) => {
                  setDoc(next);
                  setDirty(true);
                }}
              />
            </>
          ) : (
            <p className="rounded-lg border border-dashed px-6 py-16 text-center text-sm text-muted-foreground">
              Add a chapter to start writing.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
