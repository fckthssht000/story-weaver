import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChapterSummary } from "@/types";

interface Props {
  chapters: ChapterSummary[];
  activeId?: string | undefined;
  onSelect: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onDelete: (id: string) => void;
}

export function ChapterList({ chapters, activeId, onSelect, onMove, onDelete }: Props) {
  if (!chapters.length) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
        No chapters yet.
      </p>
    );
  }

  return (
    <ul className="space-y-1">
      {chapters.map((c, i) => (
        <li
          key={c.id}
          className={cn(
            "group flex items-center gap-1 rounded-md border px-2 py-1.5 transition-colors",
            activeId === c.id ? "border-primary/40 bg-accent" : "border-transparent hover:bg-muted",
          )}
        >
          <button
            type="button"
            onClick={() => onSelect(c.id)}
            className="flex-1 truncate text-left text-sm"
          >
            <span className="mr-2 font-display text-xs text-muted-foreground">{i + 1}</span>
            {c.title || "Untitled chapter"}
          </button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Move up"
            disabled={i === 0}
            onClick={() => onMove(c.id, -1)}
          >
            <ArrowUp className="size-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Move down"
            disabled={i === chapters.length - 1}
            onClick={() => onMove(c.id, 1)}
          >
            <ArrowDown className="size-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Delete chapter"
            onClick={() => onDelete(c.id)}
          >
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
