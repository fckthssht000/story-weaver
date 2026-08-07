import { Minus, Plus, Type } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import type { ReaderPrefs, ReaderTheme } from "@/hooks/useReaderPrefs";

const THEMES: { id: ReaderTheme; label: string }[] = [
  { id: "paper", label: "Paper" },
  { id: "sepia", label: "Sepia" },
  { id: "night", label: "Night" },
];

interface Props {
  prefs: ReaderPrefs;
  onChange: (patch: Partial<ReaderPrefs>) => void;
}

export function ReaderSettings({ prefs, onChange }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Reading settings">
          <Type className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Text size
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                aria-label="Decrease text size"
                onClick={() => onChange({ size: Math.max(15, prefs.size - 1) })}
              >
                <Minus className="size-3.5" />
              </Button>
              <span className="flex-1 text-center font-display text-sm">{prefs.size}px</span>
              <Button
                variant="outline"
                size="icon"
                aria-label="Increase text size"
                onClick={() => onChange({ size: Math.min(26, prefs.size + 1) })}
              >
                <Plus className="size-3.5" />
              </Button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Line spacing
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {[1.55, 1.75, 2].map((l) => (
                <Button
                  key={l}
                  variant={prefs.leading === l ? "default" : "outline"}
                  size="sm"
                  onClick={() => onChange({ leading: l })}
                >
                  {l === 1.55 ? "Tight" : l === 1.75 ? "Normal" : "Airy"}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Width
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {[50, 62, 75].map((w) => (
                <Button
                  key={w}
                  variant={prefs.width === w ? "default" : "outline"}
                  size="sm"
                  onClick={() => onChange({ width: w })}
                >
                  {w === 50 ? "Narrow" : w === 62 ? "Normal" : "Wide"}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Alignment
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {[false, true].map((j) => (
                <Button
                  key={String(j)}
                  variant={prefs.justify === j ? "default" : "outline"}
                  size="sm"
                  onClick={() => onChange({ justify: j })}
                >
                  {j ? "Justify" : "Left"}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Font
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: "serif", label: "Serif" },
                { id: "sans", label: "Sans" },
                { id: "dyslexic", label: "Dyslexic" },
              ].map((f) => (
                <Button
                  key={f.id}
                  variant={prefs.font === f.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => onChange({ font: f.id as any })}
                >
                  {f.label}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Theme
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {THEMES.map((t) => (
                <Button
                  key={t.id}
                  variant={prefs.theme === t.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => onChange({ theme: t.id })}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
