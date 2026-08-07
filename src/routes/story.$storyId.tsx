import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookmarkCheck,
  BookmarkPlus,
  BookOpen,
  Check,
  Download,
  Heart,
  Loader2,
  RefreshCw,
  Trash2,
  WifiOff,
  Play,
  Share2,
  PlayCircle,
  Book,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useStory } from "@/hooks/useStories";
import { useChapterList } from "@/hooks/useChapters";
import { useDownloads, useIsDownloaded } from "@/hooks/useDownloads";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import { useBookmark } from "@/hooks/useBookmark";
import { fetchLikeState, toggleLike } from "@/services/storyService";
import { getLocalStory } from "@/lib/offlineDb";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/story/$storyId")({
  head: () => ({
    meta: [
      { title: "Story — Buklat" },
      { name: "description", content: "Story overview, chapters and offline download." },
      { property: "og:title", content: "Story — Buklat" },
      { property: "og:description", content: "Story overview, chapters and offline download." },
    ],
  }),
  component: StoryDetail,
});

function StoryDetail() {
  const { storyId } = Route.useParams();
  const navigate = useNavigate();
  const [descExpanded, setDescExpanded] = useState(false);
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
  const { bookmarked, add: addBookmark, remove: removeBookmark } = useBookmark(storyId, userId);

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
  const avatarUrl = remote.data?.author?.avatar_url ?? null;
  const authorBio = remote.data?.author?.bio || "Avid reader & storyteller on Buklat.";

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
          <Link to="/" search={{ search: "" }}>
            Browse stories
          </Link>
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
    <div className="space-y-8 pb-12">
      {/* 1. Header Banner */}
      <header className="relative -mt-6 -mx-4 sm:mx-0 sm:mt-0 aspect-[4/3] sm:aspect-[21/9] bg-muted overflow-hidden">
        {coverUrl ? (
          <img src={coverUrl} alt={`Cover of ${title}`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-display text-7xl text-accent-foreground/20">
            {title.charAt(0)}
          </div>
        )}

        {/* Top Controls Overlay */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-10">
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="icon"
              className="rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm border-0"
              onClick={() => {
                if (window.history.length > 1) {
                  window.history.back();
                } else {
                  navigate({ to: "/", search: { search: "" } });
                }
              }}
            >
              <ArrowLeft className="size-5" />
            </Button>
            {genre && (
              <div className="bg-white/90 text-black px-3 py-1 rounded-sm text-xs font-bold tracking-widest uppercase shadow-sm">
                {genre}
              </div>
            )}
          </div>

          {online && (
            <Button
              variant="secondary"
              size="icon"
              className={`rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm border-0 ${bookmarked ? "text-primary" : ""}`}
              disabled={bookmarked ? removeBookmark.isPending : addBookmark.isPending}
              onClick={() => {
                if (!userId) {
                  navigate({ to: "/auth" });
                  return;
                }
                if (bookmarked) {
                  removeBookmark.mutate(undefined, {
                    onSuccess: () => toast.success("Removed from Library"),
                    onError: (e) => toast.error(e.message),
                  });
                } else {
                  addBookmark.mutate(undefined, {
                    onSuccess: () => toast.success("Added to Library"),
                    onError: (e) => toast.error(e.message),
                  });
                }
              }}
            >
              {addBookmark.isPending || removeBookmark.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : bookmarked ? (
                <BookmarkCheck className="size-5" />
              ) : (
                <BookmarkPlus className="size-5" />
              )}
            </Button>
          )}
        </div>

        {/* Gradient and Title */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-4 sm:p-6">
          <h1 className="font-display text-4xl sm:text-5xl font-bold leading-tight text-white mb-2 max-w-2xl">
            {title}
          </h1>
        </div>
      </header>

      {/* 2. Author & Description Section */}
      <div className="px-2">
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="size-12 border shadow-sm">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {author.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold">{author}</p>
            <p className="text-[0.8rem] text-muted-foreground mt-0.5">{authorBio}</p>
          </div>
        </div>

        <div className="h-px bg-border/60 w-full mb-6" />

        {description && (
          <div className="relative">
            <p
              className={`whitespace-pre-line text-[0.95rem] leading-relaxed text-foreground/90 ${
                !descExpanded ? "line-clamp-3" : ""
              }`}
            >
              {description}
            </p>
            {description.length > 150 && (
              <button
                onClick={() => setDescExpanded(!descExpanded)}
                className="text-primary text-sm font-medium mt-1 hover:underline inline-flex items-center"
              >
                {descExpanded ? "Show less" : "Show more"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3. Action Buttons */}
      <div className="px-2 flex flex-col gap-3">
        <Button
          size="lg"
          className="w-full text-base font-semibold h-14 bg-zinc-900 text-white hover:bg-zinc-800 rounded-xl"
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
          <Play className="size-5 mr-2 fill-current" />
          {progress?.chapter_id ? "Continue Reading" : "Start Chapter 1"}
        </Button>

        <div className="flex gap-2 w-full">
          <div className="flex-1">
            {downloaded ? (
              <div className="flex gap-2 w-full h-12">
                <Button
                  variant="secondary"
                  className="flex-1 rounded-xl bg-muted font-medium border border-border"
                  disabled
                >
                  <Check className="size-4 mr-2" /> Downloaded
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-xl h-12 w-12 shrink-0"
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
                    <RefreshCw className="size-4 text-muted-foreground" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-xl h-12 w-12 shrink-0 hover:text-red-500"
                  aria-label="Remove download"
                  onClick={() =>
                    remove.mutate(storyId, {
                      onSuccess: () => toast.success("Removed from offline"),
                    })
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="secondary"
                className="w-full h-12 rounded-xl bg-muted font-medium hover:bg-muted/80"
                disabled={!online || download.isPending}
                onClick={() =>
                  download.mutate(storyId, {
                    onSuccess: (r) => toast.success(`Saved ${r.chapters} chapter(s) for offline`),
                    onError: (e) => toast.error(e.message),
                  })
                }
              >
                {download.isPending ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <Download className="size-4 mr-2" />
                )}
                Download Offline
              </Button>
            )}
          </div>

          {online && (
            <Button
              variant="secondary"
              className="h-12 px-5 rounded-xl bg-muted hover:bg-muted/80 shrink-0"
              onClick={onLike}
            >
              <Heart
                className={`size-4 mr-2 ${likes.data?.liked ? "fill-red-500 text-red-500" : ""}`}
              />
              {likes.data?.count ?? 0}
            </Button>
          )}

          <Button
            variant="secondary"
            className="h-12 px-4 rounded-xl bg-muted hover:bg-muted/80 shrink-0"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast.success("Link copied to clipboard");
            }}
          >
            <Share2 className="size-4" />
          </Button>
        </div>
      </div>

      {/* 4. Table of Contents Card */}
      <div className="px-2 mt-4">
        <div className="rounded-3xl border bg-card p-1 pb-2 shadow-sm">
          <div className="flex items-start justify-between p-4 sm:p-5 pb-2">
            <div className="flex items-center gap-3">
              <Book className="size-5 text-foreground" />
              <h2 className="font-display text-xl font-bold leading-tight">
                Table of
                <br />
                Contents ({chapters.data?.length ?? 0})
              </h2>
            </div>
          </div>

          <ol className="mt-2 p-2 flex flex-col gap-2">
            {(chapters.data ?? []).map((c, i) => (
              <li key={c.id}>
                <Link
                  to="/read/$storyId"
                  params={{ storyId }}
                  search={{ chapter: c.id }}
                  className="flex items-center gap-4 p-3 sm:px-4 rounded-2xl border border-border/50 bg-background transition-all hover:bg-muted group shadow-sm"
                >
                  <div className="flex items-center justify-center size-9 rounded-full bg-accent text-accent-foreground font-semibold text-sm">
                    {i + 1}
                  </div>
                  <span className="flex-1 text-[0.95rem] font-medium truncate">
                    {c.title || "Untitled chapter"}
                  </span>
                  {progress?.chapter_id === c.id ? (
                    <span className="text-[0.65rem] uppercase tracking-widest text-primary font-bold">
                      Reading
                    </span>
                  ) : (
                    <PlayCircle className="size-5 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
                  )}
                </Link>
              </li>
            ))}
            {!chapters.data?.length ? (
              <li className="p-8 text-center text-sm text-muted-foreground border rounded-2xl border-dashed">
                No chapters published yet.
              </li>
            ) : null}
          </ol>
        </div>
      </div>

      {!online ? (
        <div className="px-2 mt-4">
          <p className="flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm text-accent-foreground">
            <WifiOff className="size-4" /> Offline — reading from your downloaded copy.
          </p>
        </div>
      ) : null}
    </div>
  );
}
