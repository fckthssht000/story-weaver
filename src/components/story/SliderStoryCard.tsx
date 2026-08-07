import { Link } from "@tanstack/react-router";
import type { StoryWithAuthor } from "@/types";
import { BookOpen, Heart } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export function SliderStoryCard({ story }: { story: StoryWithAuthor }) {
  const author = story.author?.display_name ?? story.author?.username ?? "Unknown";

  return (
    <div className="group relative aspect-[4/5] w-[220px] sm:w-[260px] shrink-0 overflow-hidden rounded-2xl bg-muted border border-border/10 shadow-sm">
      {/* Cover Image */}
      {story.cover_url ? (
        <img
          src={story.cover_url}
          alt={`Cover of ${story.title}`}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-accent text-accent-foreground">
          <span className="font-display text-5xl opacity-20">{story.title.charAt(0)}</span>
        </div>
      )}

      {/* Full card hit area */}
      <Link
        to="/story/$storyId"
        params={{ storyId: story.id }}
        className="absolute inset-0 z-10"
        aria-label={`View details for ${story.title}`}
      />

      {/* Content Overlay */}
      <div className="absolute inset-0 z-20 flex flex-col p-4 sm:p-5 bg-gradient-to-t from-black/95 via-black/60 to-black/20 pointer-events-none">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-auto">
          {story.genre && (
            <div className="flex items-center bg-black/60 backdrop-blur-sm text-white border border-white/20 px-2.5 py-1 rounded-full text-[0.65rem] font-medium tracking-wide uppercase">
              {story.genre}
            </div>
          )}
        </div>

        {/* Title and Description */}
        <div className="mt-auto flex flex-col gap-1.5">
          <h3 className="font-display text-[1.1rem] sm:text-lg font-bold leading-[1.15] text-white line-clamp-2">
            {story.title}
          </h3>
          <p className="text-xs text-white/80 line-clamp-2 leading-snug">
            {story.description || `Read this amazing story by ${author}.`}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/20 text-[0.65rem] font-medium text-white/70">
          <div className="flex items-center gap-1.5">
            <Avatar className="h-4 w-4 border border-white/20">
              <AvatarImage src={story.author?.avatar_url || undefined} />
              <AvatarFallback className="text-[0.4rem] bg-white/20 text-white">
                {author.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="truncate max-w-[80px]">{author}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1">
              <BookOpen className="h-3 w-3 opacity-70" />
              <span>{story.chapter_count ?? 0} ch</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="h-3 w-3 text-red-500/80" />
              <span>{story.like_count ?? 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
