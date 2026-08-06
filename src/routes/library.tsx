import { createFileRoute, Link } from "@tanstack/react-router";
import { WifiOff } from "lucide-react";
import { useDownloads } from "@/hooks/useDownloads";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Library — StoryApp" },
      {
        name: "description",
        content: "Your downloaded stories, readable anywhere with or without a connection.",
      },
      { property: "og:title", content: "Library — StoryApp" },
      { property: "og:description", content: "Your downloaded stories, readable offline." },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const { library } = useDownloads();
  const online = useNetworkStatus();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">Library</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Downloaded stories live on this device and read fully offline.
        </p>
      </header>

      {!online ? (
        <p className="flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-xs text-accent-foreground">
          <WifiOff className="size-3.5" /> You're offline — only these stories are available.
        </p>
      ) : null}

      {library.isLoading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted/60" />
          ))}
        </div>
      ) : !library.data?.length ? (
        <p className="rounded-lg border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
          Nothing downloaded yet. Open any story and tap Download to keep it here.
        </p>
      ) : (
        <div className="space-y-3">
          {library.data.map((s) => (
            <Link
              key={s.id}
              to="/story/$storyId"
              params={{ storyId: s.id }}
              className="flex gap-4 rounded-lg border bg-card p-3 transition-colors hover:border-primary/40"
            >
              <div className="h-24 w-16 shrink-0 overflow-hidden rounded bg-accent">
                {s.cover_url ? (
                  <img src={s.cover_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-display text-xl text-accent-foreground/60">
                    {s.title.charAt(0)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-display text-base font-semibold">{s.title}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  by {s.author_name ?? "Unknown"}
                </p>
                <p className="mt-2 text-[0.7rem] text-muted-foreground">
                  Saved {new Date(s.downloaded_at).toLocaleDateString()}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
