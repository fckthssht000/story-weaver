import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Headphones, List } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useChapters } from "@/hooks/useChapters";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useReaderPrefs } from "@/hooks/useReaderPrefs";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import { useStory } from "@/hooks/useStories";
import { ReaderView } from "@/components/reader/ReaderView";
import { ReaderSettings } from "@/components/reader/ReaderSettings";
import { TTSPlayer } from "@/components/reader/TTSPlayer";
import { ProgressBar } from "@/components/reader/ProgressBar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { docToChunks, readingMinutes, wordCount } from "@/lib/contentRenderer";
import { useTTS } from "@/hooks/useTTS";

export const Route = createFileRoute("/read/$storyId")({
  validateSearch: (search: Record<string, unknown>) => ({
    chapter: typeof search["chapter"] === "string" ? search["chapter"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Reading — Buklat" },
      { name: "description", content: "A distraction-free, auto-formatted reading view." },
      { property: "og:title", content: "Reading — Buklat" },
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
  const [isChapterListOpen, setIsChapterListOpen] = useState(false);
  const restored = useRef(false);

  const list = useMemo(() => chapters.data ?? [], [chapters.data]);
  const index = Math.max(
    0,
    list.findIndex((c) => c.id === (chapterParam ?? progress?.chapter_id ?? list[0]?.id)),
  );
  const current = list[index];

  const tts = useTTS();

  const onListen = () => {
    if (tts.isPlaying || tts.isPaused) {
      tts.stop();
    } else {
      const chunks = docToChunks(current?.content ?? null);
      if (chunks.length > 0) tts.start(chunks);
    }
  };

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
    tts.stop();
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
          <Button
            variant="ghost"
            size="icon"
            aria-label="Back to story"
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                navigate({ to: "/story/$storyId", params: { storyId } });
              }
            }}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <p className="truncate px-2 text-xs text-[var(--reader-soft)]">
            {story.data?.title ?? ""}
            {list.length ? ` · ${index + 1}/${list.length}` : ""}
          </p>
          <div className="flex items-center">
            {tts.supported ? (
              <Button
                variant={tts.isPlaying || tts.isPaused ? "default" : "ghost"}
                size="icon"
                aria-label="Listen to chapter"
                onClick={onListen}
              >
                <Headphones className="size-4" />
              </Button>
            ) : null}
            <Sheet open={isChapterListOpen} onOpenChange={setIsChapterListOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Chapter list">
                  <List className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 flex flex-col p-0 sm:max-w-sm">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle className="text-left font-display">Chapters</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto">
                  {list.map((ch, i) => (
                    <Button
                      key={ch.id}
                      variant="ghost"
                      className={`w-full justify-start rounded-none px-4 py-3 h-auto text-left ${i === index ? "bg-accent" : ""}`}
                      onClick={() => {
                        goto(i);
                        setIsChapterListOpen(false);
                      }}
                    >
                      <div className="flex flex-col items-start gap-1">
                        <span className="font-medium text-sm leading-tight">
                          {i + 1}. {ch.title}
                        </span>
                        {i === index && (
                          <span className="text-xs text-primary font-semibold tracking-wider">
                            READING
                          </span>
                        )}
                      </div>
                    </Button>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
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
      {/* Floating TTS Player */}
      <TTSPlayer tts={tts} onClose={tts.stop} />
    </div>
  );
}
