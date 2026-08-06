import { supabase } from "@/integrations/supabase/client";
import {
  listLocalStories,
  listUnsyncedProgress,
  markProgressSynced,
  offlineAvailable,
} from "@/lib/offlineDb";
import { refreshDownload } from "@/services/downloadService";

/** Pushes locally-recorded reading progress up to the cloud. */
export async function syncProgress(userId: string | null) {
  if (!userId || !offlineAvailable() || !navigator.onLine) return { pushed: 0 };

  const pending = await listUnsyncedProgress();
  if (!pending.length) return { pushed: 0 };

  const rows = pending.map((p) => ({
    user_id: userId,
    story_id: p.story_id,
    chapter_id: p.chapter_id,
    scroll_position: p.scroll_position,
    updated_at: p.updated_at,
  }));

  const { error } = await supabase.from("reading_progress").upsert(rows, {
    onConflict: "user_id,story_id",
  });
  if (error) return { pushed: 0 };

  await markProgressSynced(pending.map((p) => p.story_id));
  return { pushed: rows.length };
}

/** On app foreground: refresh any downloaded story whose chapters changed. */
export async function syncDownloads() {
  if (!offlineAvailable() || !navigator.onLine) return { refreshed: 0 };
  const stories = await listLocalStories();
  let refreshed = 0;
  for (const s of stories) {
    try {
      const res = await refreshDownload(s.id);
      if (res.updated) refreshed += 1;
    } catch {
      /* story may be unpublished or deleted — keep the local copy */
    }
  }
  return { refreshed };
}
