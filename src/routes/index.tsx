import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { useStories } from "@/hooks/useStories";
import { StoryList } from "@/components/story/StoryList";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GENRES } from "@/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StoryApp — Discover short fiction" },
      {
        name: "description",
        content:
          "Browse published short stories and long-form fiction, beautifully typeset for reading on any screen.",
      },
      { property: "og:title", content: "StoryApp — Discover short fiction" },
      {
        property: "og:description",
        content: "Browse published short stories and long-form fiction, beautifully typeset.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState<string | undefined>(undefined);
  const stories = useStories({ ...(genre ? { genre } : {}), ...(search ? { search } : {}) });

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-display text-3xl font-semibold leading-tight">
          Stories worth sitting with
        </h1>
        <p className="mt-2 max-w-prose text-sm text-muted-foreground">
          Every story here is auto-formatted for reading — consistent type, generous spacing, and
          available offline whenever you want it.
        </p>
      </section>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search titles"
          className="pl-9"
        />
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Button
          variant={genre ? "outline" : "default"}
          size="sm"
          className="shrink-0"
          onClick={() => setGenre(undefined)}
        >
          All
        </Button>
        {GENRES.map((g) => (
          <Button
            key={g}
            size="sm"
            variant={genre === g ? "default" : "outline"}
            className={cn("shrink-0")}
            onClick={() => setGenre(g)}
          >
            {g}
          </Button>
        ))}
      </div>

      <StoryList
        stories={stories.data}
        loading={stories.isLoading}
        empty="No published stories match yet. Be the first to publish one."
      />
    </div>
  );
}
