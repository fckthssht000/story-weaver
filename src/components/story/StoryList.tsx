import { StoryCard } from "./StoryCard";
import type { StoryWithAuthor } from "@/types";

interface Props {
  stories: StoryWithAuthor[] | undefined;
  loading?: boolean;
  empty?: string;
}

export function StoryList({ stories, loading, empty = "Nothing here yet." }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-muted/60" />
        ))}
      </div>
    );
  }

  if (!stories?.length) {
    return (
      <p className="rounded-lg border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
        {empty}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {stories.map((s) => (
        <StoryCard key={s.id} story={s} />
      ))}
    </div>
  );
}
