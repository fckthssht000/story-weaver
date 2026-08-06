import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getLocalProgress, offlineAvailable, putLocalProgress } from "@/lib/offlineDb";
import { syncProgress } from "@/services/syncService";
import type { ReadingProgress } from "@/types";

/**
 * Reading progress: always written locally first (instant, offline-safe),
 * then pushed to the cloud on a debounce when a connection is available.
 */
export function useReadingProgress(storyId: string | undefined, userId: string | null) {
  const [progress, setProgress] = useState<ReadingProgress | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!storyId) return;

    (async () => {
      let local: ReadingProgress | null = null;
      if (offlineAvailable()) {
        const row = await getLocalProgress(storyId);
        if (row) {
          local = {
            story_id: row.story_id,
            chapter_id: row.chapter_id,
            scroll_position: row.scroll_position,
            updated_at: row.updated_at,
          };
        }
      }
      if (!local && userId && navigator.onLine) {
        const { data } = await supabase
          .from("reading_progress")
          .select("story_id,chapter_id,scroll_position,updated_at")
          .eq("story_id", storyId)
          .eq("user_id", userId)
          .maybeSingle();
        if (data) local = data as ReadingProgress;
      }
      if (!cancelled) setProgress(local);
    })();

    return () => {
      cancelled = true;
    };
  }, [storyId, userId]);

  const record = useCallback(
    (chapterId: string | null, scrollPosition: number) => {
      if (!storyId) return;
      const row = {
        story_id: storyId,
        chapter_id: chapterId,
        scroll_position: scrollPosition,
        updated_at: new Date().toISOString(),
      };
      setProgress(row);

      if (offlineAvailable()) void putLocalProgress({ ...row, synced: 0 });

      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        void syncProgress(userId);
      }, 3000);
    },
    [storyId, userId],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { progress, record };
}
