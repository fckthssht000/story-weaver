import { Link } from "@tanstack/react-router";
import type { StoryWithAuthor } from "@/types";
import { SliderStoryCard } from "./SliderStoryCard";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { RefreshCw } from "lucide-react";

interface Props {
  title: string;
  icon?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
  stories: StoryWithAuthor[] | undefined;
  loading?: boolean;
}

export function StorySlider({ title, icon, actionText, onAction, stories, loading }: Props) {
  if (loading) {
    return (
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-foreground">
            {icon}
            <h2 className="font-display text-xl font-bold">{title}</h2>
          </div>
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="aspect-[4/5] w-[220px] sm:w-[260px] shrink-0 animate-pulse rounded-2xl bg-muted/60"
            />
          ))}
        </div>
      </section>
    );
  }

  if (!stories || stories.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-foreground">
          {icon}
          <h2 className="font-display text-xl font-bold">{title}</h2>
        </div>
        {actionText && onAction && (
          <button
            onClick={onAction}
            className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            {actionText}
          </button>
        )}
      </div>

      <Carousel
        opts={{
          align: "start",
          loop: false,
          dragFree: true,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-4">
          {stories.map((story) => (
            <CarouselItem key={story.id} className="pl-4 basis-auto">
              <SliderStoryCard story={story} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <div className="hidden sm:block">
          <CarouselPrevious className="-left-4 bg-background/80 backdrop-blur" />
          <CarouselNext className="-right-4 bg-background/80 backdrop-blur" />
        </div>
      </Carousel>
    </section>
  );
}
