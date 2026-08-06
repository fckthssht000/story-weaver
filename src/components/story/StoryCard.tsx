import { Link } from "@tanstack/react-router";
import type { StoryWithAuthor } from "@/types";

export function StoryCard({ story }: { story: StoryWithAuthor }) {
  const author = story.author?.display_name ?? story.author?.username ?? "Unknown";

  return (
    <Link
      to="/story/$storyId"
      params={{ storyId: story.id }}
      className="group flex gap-4 rounded-lg border bg-card p-3 transition-colors hover:border-primary/40"
    >
      <div className="h-28 w-20 shrink-0 overflow-hidden rounded bg-accent">
        {story.cover_url ? (
          <img
            src={story.cover_url}
            alt={`Cover of ${story.title}`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-display text-2xl text-accent-foreground/60">
            {story.title.charAt(0)}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        {story.genre ? (
          <p className="text-[0.65rem] uppercase tracking-[0.18em] text-primary">{story.genre}</p>
        ) : null}
        <h3 className="mt-1 truncate font-display text-lg font-semibold leading-snug">
          {story.title}
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">by {author}</p>
        {story.description ? (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{story.description}</p>
        ) : null}
      </div>
    </Link>
  );
}
