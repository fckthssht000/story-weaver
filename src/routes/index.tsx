import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useStories, useRecentReads, useDiscoverStories, useTopStories } from "@/hooks/useStories";
import { StoryList } from "@/components/story/StoryList";
import { StorySlider } from "@/components/story/StorySlider";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Sparkles, BookOpen, Clock, Flame, Compass, TrendingUp } from "lucide-react";
import { GENRES } from "@/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")(({
  validateSearch: (search: Record<string, unknown>): { search?: string } => {
    const s = typeof search["search"] === "string" ? search["search"] : undefined;
    return s !== undefined ? { search: s } : {};
  },
  head: () => ({
    meta: [
      { title: "Buklat — Discover short fiction" },
      {
        name: "description",
        content:
          "Browse published short stories and long-form fiction, beautifully typeset for reading on any screen.",
      },
      { property: "og:title", content: "Buklat — Discover short fiction" },
      {
        property: "og:description",
        content: "Browse published short stories and long-form fiction, beautifully typeset.",
      },
    ],
  }),
  component: Home,
}));

function Home() {
  const { search: searchParam } = Route.useSearch();
  const [genre, setGenre] = useState<string | undefined>(undefined);
  const { user } = useAuth();

  const stories = useStories({
    ...(genre ? { genre } : {}),
    ...(searchParam ? { search: searchParam } : {}),
  });

  const recentReads = useRecentReads(user?.id ?? null);
  const discoverStories = useDiscoverStories();
  const topStories = useTopStories();

  const isFiltering = !!genre || !!searchParam;

  return (
    <div className="space-y-6">
      {/* Featured Carousel */}
      {!isFiltering && stories.data && stories.data.length > 0 && (
        <section className="-mx-4 sm:mx-0">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            plugins={[
              Autoplay({
                delay: 6000,
                stopOnInteraction: true,
              }),
            ]}
            className="w-full"
          >
            <CarouselContent className="ml-0 sm:-ml-4 pl-4 sm:pl-0 pr-4 sm:pr-0">
              {stories.data.slice(0, 5).map((story) => {
                const author = story.author?.display_name ?? story.author?.username ?? "Unknown";
                return (
                  <CarouselItem key={story.id} className="pl-0 sm:pl-4 basis-[85%] sm:basis-[60%] md:basis-[45%] lg:basis-[35%] mr-3 sm:mr-0">
                    <div className="group relative aspect-[4/5] sm:aspect-[3/4] overflow-hidden rounded-2xl bg-muted border border-border/10 shadow-lg">
                      {story.cover_url ? (
                        <img
                          src={story.cover_url}
                          alt={story.title}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-accent text-accent-foreground">
                          <span className="font-display text-7xl opacity-20">
                            {story.title.charAt(0)}
                          </span>
                        </div>
                      )}

                      {/* Full card hit area for View Details */}
                      <Link to="/story/$storyId" params={{ storyId: story.id }} className="absolute inset-0 z-10" aria-label={`View details for ${story.title}`} />

                      {/* Content Overlay */}
                      <div className="absolute inset-0 z-20 flex flex-col p-5 sm:p-6 bg-gradient-to-t from-black/95 via-black/60 to-black/20 pointer-events-none">

                        {/* Top Badges */}
                        <div className="flex flex-wrap items-center gap-2 mb-auto">
                          <div className="flex items-center gap-1.5 bg-white text-black px-2.5 py-1 rounded-full text-[0.65rem] font-bold tracking-[0.05em] uppercase">
                            <Sparkles className="w-3 h-3" />
                            Featured Story
                          </div>
                          {story.genre && (
                            <div className="flex items-center bg-black/60 backdrop-blur-sm text-white border border-white/20 px-2.5 py-1 rounded-full text-[0.65rem] font-medium tracking-wide">
                              {story.genre}
                            </div>
                          )}
                        </div>

                        {/* Title and Description */}
                        <div className="mt-auto mb-5">
                          <h3 className="font-display text-2xl sm:text-[1.75rem] font-bold leading-[1.1] text-white mb-2 line-clamp-3">
                            {story.title}
                          </h3>
                          <p className="text-sm text-white/80 line-clamp-2 leading-snug">
                            {story.description || `Read this amazing story by ${author}.`}
                          </p>
                        </div>

                        {/* Buttons */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 relative z-30 pointer-events-auto">
                          <Link
                            to="/read/$storyId"
                            params={{ storyId: story.id }}
                            search={{ chapter: undefined }}
                            className="flex-1"
                          >
                            <Button variant="secondary" className="w-full bg-white text-black hover:bg-white/90 font-semibold rounded-xl h-10">
                              <BookOpen className="w-4 h-4 mr-2" />
                              Read Story
                            </Button>
                          </Link>
                          <Link
                            to="/story/$storyId"
                            params={{ storyId: story.id }}
                            className="flex-1"
                          >
                            <Button variant="outline" className="w-full bg-black/50 text-white border-white/20 hover:bg-black/70 hover:text-white font-semibold rounded-xl h-10">
                              View Details
                            </Button>
                          </Link>
                        </div>

                      </div>
                    </div>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            <div className="hidden sm:block">
              <CarouselPrevious className="-left-4" />
              <CarouselNext className="-right-4" />
            </div>
          </Carousel>
        </section>
      )}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide">
        <Button
          variant={genre ? "outline" : "default"}
          size="sm"
          className="shrink-0 rounded-full px-5"
          onClick={() => setGenre(undefined)}
        >
          All
        </Button>

        {GENRES.map((g) => (
          <Button
            key={g}
            size="sm"
            variant={genre === g ? "default" : "outline"}
            className={cn("shrink-0 rounded-full px-5", genre !== g && "text-muted-foreground")}
            onClick={() => setGenre(g)}
          >
            {g}
          </Button>
        ))}
      </div>

      {isFiltering ? (
        <StoryList
          stories={stories.data}
          loading={stories.isLoading}
          empty="No published stories match yet. Be the first to publish one."
        />
      ) : (
        <div className="flex flex-col gap-10 mt-8 pb-12">
          {user && recentReads.data && recentReads.data.length > 0 && (
            <StorySlider
              title="Recent Reads"
              icon={<Clock className="h-5 w-5 text-primary" />}
              stories={recentReads.data}
            />
          )}

          <StorySlider
            title="Latest Releases"
            icon={<Flame className="h-5 w-5 text-orange-500" />}
            stories={stories.data}
            loading={stories.isLoading}
          />

          <StorySlider
            title="Discover Stories"
            icon={<Compass className="h-5 w-5 text-blue-500" />}
            stories={discoverStories.data}
            loading={discoverStories.isLoading}
          />

          <StorySlider
            title="Most Read"
            icon={<TrendingUp className="h-5 w-5 text-green-500" />}
            stories={topStories.data}
            loading={topStories.isLoading}
          />

          {/* Popular Genres Sliders */}
          <StorySlider
            title="Top in Fantasy"
            stories={stories.data?.filter(s => s.genre === 'Fantasy')}
          />
          <StorySlider
            title="Top in Sci-Fi"
            stories={stories.data?.filter(s => s.genre === 'Sci-Fi')}
          />
          <StorySlider
            title="Top in Mystery"
            stories={stories.data?.filter(s => s.genre === 'Mystery')}
          />
        </div>
      )}
    </div>
  );
}
