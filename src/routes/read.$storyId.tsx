import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, List } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useChapters } from "@/hooks/useChapters";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useReaderPrefs } from "@/hooks/useReaderPrefs";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import { useStory } from "@/hooks/useStories";
import { ReaderView } from "@/components/reader/ReaderView";
import { ReaderSettings } from "@/components/reader/ReaderSettings";
import { ProgressBar } from "@/components/reader/ProgressBar";
import { Button } from "@/components/ui/button";
import { readingMinutes, wordCount } from "@/lib/contentRenderer";

export const Route = createFileRoute("/read/$storyId")({
  validateSearch: (search: Record<string, unknown>) => ({
    chapter: typeof search["chapter"] === "string" ? search["chapter"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Reading — StoryApp" },
      { name: "description", content: "A distraction-free, auto-formatted reading view." },
      { property: "og:title", content: "Reading — StoryApp" },
      { property: "og:description", content: "A distraction-free, auto-formatted reading view." },
    ],
  }),
  component: Reader,
});

function Reader() {
  const { storyId } = Route.useParams();
  const { chapter: chapterParam } = Route.useSearch();
  const navigate = useNavigate();
  const online = useNetworkStatus();
  const { userId } = useAuth();
  const { prefs, update } = useReaderPrefs();

  const story = useStory(online ? storyId : undefined);
  const chapters = useChapters(storyId, online);
  const { progress, record } = useReadingProgress(storyId, userId);

  const [ratio, setRatio] = useState(0);
  const restored = useRef(false);

  const list = useMemo(() => chapters.data ?? [], [chapters.data]);
  const index = Math.max(
    0,
    list.findIndex((c) => c.id === (chapterParam ?? progress?.chapter_id ?? list[0]?.id)),
  );
  const current = list[index];

  useEffect(() => {
    if (!chapterParam && current) {
      navigate({
        to: "/read/$storyId",
        params: { storyId },
        search: { chapter: current.id },
        replace: true,
      });
    }
  }, [chapterParam, current, navigate, storyId]);

  // Track scroll → progress
  useEffect(() => {
    if (!current) return;
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const r = max > 0 ? window.scrollY / max : 0;
      setRatio(r);
      record(current.id, r);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [current, record]);

  // Restore scroll position once for the resumed chapter
  useEffect(() => {
    if (restored.current || !current || !progress) return;
    if (progress.chapter_id !== current.id || progress.scroll_position <= 0) return;
    restored.current = true;
    requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo({ top: max * progress.scroll_position });
    });
  }, [current, progress]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    setRatio(0);
  }, [chapterParam]);

  const goto = (i: number) => {
    const next = list[i];
    if (!next) return;
    navigate({ to: "/read/$storyId", params: { storyId }, search: { chapter: next.id } });
  };

  const words = wordCount(current?.content ?? null);

  return (
    <div className={`reader-theme-${prefs.theme} reader-surface min-h-screen`}>
      <div className="fixed inset-x-0 top-0 z-40">
        <div className="reader-surface/95 flex h-14 items-center justify-between border-b border-[var(--reader-rule)] bg-[var(--reader-bg)] px-3">
          <Button variant="ghost" size="icon" asChild aria-label="Back to story">
            <Link to="/story/$storyId" params={{ storyId }}>
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <p className="truncate px-2 text-xs text-[var(--reader-soft)]">
            {story.data?.title ?? ""}
            {list.length ? ` · ${index + 1}/${list.length}` : ""}
          </p>
          <div className="flex items-center">
            <Button variant="ghost" size="icon" asChild aria-label="Chapter list">
              <Link to="/story/$storyId" params={{ storyId }}>
                <List className="size-4" />
              </Link>
            </Button>
            <ReaderSettings prefs={prefs} onChange={update} />
          </div>
        </div>
        <ProgressBar value={ratio} />
      </div>

      <div className="pt-14">
        {chapters.isLoading ? (
          <div className="mx-auto mt-16 h-64 max-w-xl animate-pulse rounded bg-[var(--reader-rule)]/40" />
        ) : !current ? (
          <div className="px-6 py-24 text-center">
            <p className="font-display text-lg">Nothing to read yet</p>
            <p className="mt-2 text-sm text-[var(--reader-soft)]">
              This story has no chapters available{online ? "" : " offline"}.
            </p>
          </div>
        ) : (
          <ReaderView
            storyTitle={story.data?.title ?? undefined}
            title={current.title}
            content={current.content}
            prefs={prefs}
            footer={
              <div className="space-y-6">
                <p className="text-center text-xs text-[var(--reader-soft)]">
                  {words.toLocaleString()} words · {readingMinutes(words)} min read
                </p>
                <div className="flex items-center justify-between gap-3">
                  <Button
                    variant="outline"
                    disabled={index === 0}
                    onClick={() => goto(index - 1)}
                  >
                    <ChevronLeft className="size-4" /> Previous
                  </Button>
                  <Button disabled={index >= list.length - 1} onClick={() => goto(index + 1)}>
                    Next <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            }
          />
        )}
      </div>
    </div>
  );
}
