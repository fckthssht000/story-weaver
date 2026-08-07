import { createFileRoute, Link } from "@tanstack/react-router";
import { Bookmark, Download, WifiOff } from "lucide-react";
import { useMemo } from "react";
import { useDownloads } from "@/hooks/useDownloads";
import { useBookmarks } from "@/hooks/useBookmark";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Library — Buklat" },
      {
        name: "description",
        content: "Your saved and downloaded stories, readable anywhere.",
      },
      { property: "og:title", content: "Library — Buklat" },
      { property: "og:description", content: "Saved and downloaded stories." },
    ],
  }),
  component: LibraryPage,
});

type LibraryEntry = {
  id: string;
  title: string;
  cover_url: string | null;
  author: string;
  bookmarked: boolean;
  downloaded: boolean;
};

function LibraryPage() {
  const online = useNetworkStatus();
  const { userId } = useAuth();
  const { library } = useDownloads();
  const bookmarks = useBookmarks(userId);

  /** Merge bookmarks + downloads into one deduplicated list. */
  const entries = useMemo<LibraryEntry[]>(() => {
    const map = new Map<string, LibraryEntry>();

    for (const s of bookmarks.data ?? []) {
      map.set(s.id, {
        id: s.id,
        title: s.title,
        cover_url: s.cover_url ?? null,
        author: s.author?.display_name ?? s.author?.username ?? "Unknown",
        bookmarked: true,
        downloaded: false,
      });
    }

    for (const s of library.data ?? []) {
      const existing = map.get(s.id);
      if (existing) {
        existing.downloaded = true;
      } else {
        map.set(s.id, {
          id: s.id,
          title: s.title,
          cover_url: s.cover_url ?? null,
          author: s.author_name ?? "Unknown",
          bookmarked: false,
          downloaded: true,
        });
      }
    }

    return [...map.values()];
  }, [bookmarks.data, library.data]);

  const loading = bookmarks.isLoading || library.isLoading;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">Library</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your saved and downloaded stories.
        </p>
      </header>

      {!online ? (
        <p className="flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-xs text-accent-foreground">
          <WifiOff className="size-3.5" /> Offline — only downloaded stories are
          available.
        </p>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-[2/3] animate-pulse rounded-md bg-muted/60" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-muted/60" />
            </div>
          ))}
        </div>
      ) : !entries.length ? (
        <p className="rounded-lg border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
          Nothing here yet.{" "}
          {userId ? (
            <>
              Open any story and tap{" "}
              <span className="font-medium text-foreground">Add to Library</span>{" "}
              or{" "}
              <span className="font-medium text-foreground">Download</span>.
            </>
          ) : (
            <>
              <Link
                to="/auth"
                className="text-primary underline underline-offset-2"
              >
                Sign in
              </Link>{" "}
              to save stories, or download one for offline reading.
            </>
          )}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {entries.map((s) => (
            <Link
              key={s.id}
              to="/story/$storyId"
              params={{ storyId: s.id }}
              className="group"
            >
              {/* Cover */}
              <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-accent shadow-sm transition-transform duration-200 group-hover:scale-[1.02]">
                {s.cover_url ? (
                  <img
                    src={s.cover_url}
                    alt={`Cover of ${s.title}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-display text-3xl text-accent-foreground/40">
                    {s.title.charAt(0)}
                  </div>
                )}

                {/* Status badges — top-right corner of the cover */}
                <div className="absolute right-1.5 top-1.5 flex gap-1">
                  {s.bookmarked ? (
                    <span
                      className="flex size-5 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm"
                      title="Saved to Library"
                    >
                      <Bookmark className="size-2.5 fill-primary text-primary" />
                    </span>
                  ) : null}
                  {s.downloaded ? (
                    <span
                      className="flex size-5 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm"
                      title="Downloaded for offline"
                    >
                      <Download className="size-2.5 text-foreground" />
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Title + author */}
              <p className="mt-1.5 line-clamp-2 text-sm font-semibold leading-snug">
                {s.title}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {s.author}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
