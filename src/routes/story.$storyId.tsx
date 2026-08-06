import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Check, Download, Heart, Loader2, RefreshCw, Trash2, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useStory } from "@/hooks/useStories";
import { useChapterList } from "@/hooks/useChapters";
import { useDownloads, useIsDownloaded } from "@/hooks/useDownloads";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import { fetchLikeState, toggleLike } from "@/services/storyService";
import { getLocalStory } from "@/lib/offlineDb";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/story/$storyId")({
  head: () => ({
    meta: [
      { title: "Story — StoryApp" },
      { name: "description", content: "Story overview, chapters and offline download." },
      { property: "og:title", content: "Story — StoryApp" },
      { property: "og:description", content: "Story overview, chapters and offline download." },
    ],
  }),
  component: StoryDetail,
});

function StoryDetail() {
  const { storyId } = Route.useParams();
  const navigate = useNavigate();
  const online = useNetworkStatus();
  const { userId } = useAuth();
  const qc = useQueryClient();

  const remote = useStory(online ? storyId : undefined);
  const local = useQuery({
    queryKey: ["local-story", storyId],
    enabled: !online,
    queryFn: () => getLocalStory(storyId),
  });

  const chapters = useChapterList(storyId, online);
  const downloaded = useIsDownloaded(storyId);
  const { download, remove, refresh } = useDownloads();
  const { progress } = useReadingProgress(storyId, userId);

  const likes = useQuery({
    queryKey: ["likes", storyId, userId],
    enabled: online,
    queryFn: () => fetchLikeState(storyId, userId),
  });

  const title = remote.data?.title ?? local.data?.title ?? "";
  const description = remote.data?.description ?? local.data?.description ?? null;
  const genre = remote.data?.genre ?? local.data?.genre ?? null;
  const coverUrl = remote.data?.cover_url ?? local.data?.cover_url ?? null;
  const author =
    remote.data?.author?.display_name ??
    remote.data?.author?.username ??
    local.data?.author_name ??
    "Unknown";

  const loading = online ? remote.isLoading : local.isLoading;
  const missing = !loading && !title;

  const firstChapterId = chapters.data?.[0]?.id;
  const resumeId = progress?.chapter_id ?? firstChapterId;

  if (loading) return <div className="h-64 animate-pulse rounded-lg bg-muted/60" />;

  if (missing) {
    return (
      <div className="py-16 text-center">
        <h1 className="font-display text-xl font-semibold">Story unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {online ? "This story isn't published." : "You haven't downloaded this story."}
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Browse stories</Link>
        </Button>
      </div>
    );
  }

  const onLike = async () => {
    if (!userId) {
      navigate({ to: "/auth" });
      return;
    }
    await toggleLike(storyId, userId, !!likes.data?.liked);
    qc.invalidateQueries({ queryKey: ["likes", storyId] });
  };

  return (
    <div className="space-y-8">
      {!online ? (
        <p className="flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-xs text-accent-foreground">
          <WifiOff className="size-3.5" /> Offline — reading from your downloaded copy.
        </p>
      ) : null}

      <header className="flex gap-4">
        <div className="h-40 w-28 shrink-0 overflow-hidden rounded-md bg-accent shadow-sm">
          {coverUrl ? (
            <img src={coverUrl} alt={`Cover of ${title}`} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-display text-4xl text-accent-foreground/60">
              {title.charAt(0)}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          {genre ? (
            <p className="text-[0.65rem] uppercase tracking-[0.18em] text-primary">{genre}</p>
          ) : null}
          <h1 className="mt-1 font-display text-2xl font-semibold leading-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">by {author}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {chapters.data?.length ?? 0} chapter{(chapters.data?.length ?? 0) === 1 ? "" : "s"}
          </p>
          {online ? (
            <Button variant="ghost" size="sm" className="-ml-2 mt-2" onClick={onLike}>
              <Heart className={likes.data?.liked ? "size-4 fill-primary text-primary" : "size-4"} />
              {likes.data?.count ?? 0}
            </Button>
          ) : null}
        </div>
      </header>

      {description ? (
        <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          disabled={!resumeId}
          onClick={() =>
            resumeId &&
            navigate({
              to: "/read/$storyId",
              params: { storyId },
              search: { chapter: resumeId },
            })
          }
        >
          <BookOpen className="size-4" />
          {progress?.chapter_id ? "Continue reading" : "Start reading"}
        </Button>

        {downloaded ? (
          <>
            <Button variant="outline" disabled>
              <Check className="size-4" /> Downloaded
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Check for updates"
              disabled={!online || refresh.isPending}
              onClick={() =>
                refresh.mutate(storyId, {
                  onSuccess: (r) =>
                    toast.success(r.updated ? `${r.updated} chapter(s) updated` : "Up to date"),
                })
              }
            >
              {refresh.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Remove download"
              onClick={() =>
                remove.mutate(storyId, { onSuccess: () => toast.success("Removed from Library") })
              }
            >
              <Trash2 className="size-4" />
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            disabled={!online || download.isPending}
            onClick={() =>
              download.mutate(storyId, {
                onSuccess: (r) => toast.success(`Saved ${r.chapters} chapter(s) for offline`),
                onError: (e) => toast.error(e.message),
              })
            }
          >
            {download.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Download
          </Button>
        )}
      </div>

      <section>
        <h2 className="font-display text-lg font-semibold">Chapters</h2>
        <ol className="mt-3 divide-y rounded-lg border bg-card">
          {(chapters.data ?? []).map((c, i) => (
            <li key={c.id}>
              <Link
                to="/read/$storyId"
                params={{ storyId }}
                search={{ chapter: c.id }}
                className="flex items-baseline gap-3 px-4 py-3 transition-colors hover:bg-muted"
              >
                <span className="font-display text-sm text-muted-foreground">{i + 1}</span>
                <span className="flex-1 text-sm">{c.title || "Untitled chapter"}</span>
                {progress?.chapter_id === c.id ? (
                  <span className="text-[0.65rem] uppercase tracking-wider text-primary">Reading</span>
                ) : null}
              </Link>
            </li>
          ))}
          {!chapters.data?.length ? (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">
              No chapters published yet.
            </li>
          ) : null}
        </ol>
      </section>
    </div>
  );
}
