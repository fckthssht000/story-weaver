import { X, Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { useTTS } from "@/hooks/useTTS";

interface Props {
  tts: ReturnType<typeof useTTS>;
  onClose: () => void;
}

export function TTSPlayer({ tts, onClose }: Props) {
  if (!tts.isPlaying && !tts.isPaused) return null;

  const cycleRate = () => {
    const rates = [1, 1.25, 1.5, 1.75, 2];
    const nextIdx = (rates.indexOf(tts.rate) + 1) % rates.length;
    tts.setRate(rates[nextIdx] ?? 1);
  };

  const percent = Math.round(tts.progress * 100);

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom-full pb-safe">
      <div className="mx-auto max-w-xl border-x border-t border-[var(--reader-rule)] bg-[var(--reader-bg)] text-[var(--reader-fg)] shadow-xl sm:rounded-t-xl">
        {/* Progress bar */}
        <div className="h-1 w-full bg-[var(--reader-rule)]/40">
          <div
            className="h-full bg-primary transition-all duration-300 ease-linear"
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="flex flex-col p-3 gap-2">
          {/* Voice selector and Close button */}
          <div className="flex items-center justify-between gap-3">
            <Select value={tts.selectedVoice} onValueChange={tts.setSelectedVoice}>
              <SelectTrigger className="h-8 flex-1 text-xs border-[var(--reader-rule)] bg-transparent">
                <SelectValue placeholder="Select a voice" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {tts.voices.map((v) => (
                  <SelectItem key={v.name} value={v.name} className="text-xs">
                    {v.name} <span className="opacity-50">({v.lang})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => {
                tts.stop();
                onClose();
              }}
              aria-label="Stop reading"
            >
              <X className="size-4" />
            </Button>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-between mt-1">
            <div className="flex-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-16 font-display font-semibold"
                onClick={cycleRate}
              >
                {tts.rate}x
              </Button>
            </div>

            <div className="flex items-center gap-1 sm:gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={tts.prev}
                disabled={tts.progress === 0}
                aria-label="Previous sentence"
              >
                <SkipBack className="size-4" />
              </Button>

              <Button
                variant="secondary"
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={tts.isPaused ? tts.resume : tts.pause}
                aria-label={tts.isPaused ? "Resume reading" : "Pause reading"}
              >
                {tts.isPaused ? (
                  <Play className="size-5 ml-1" />
                ) : (
                  <Pause className="size-5" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={tts.next}
                disabled={tts.progress >= 0.99}
                aria-label="Next sentence"
              >
                <SkipForward className="size-4" />
              </Button>
            </div>

            <div className="flex-1" />
          </div>
        </div>
      </div>
    </div>
  );
}
