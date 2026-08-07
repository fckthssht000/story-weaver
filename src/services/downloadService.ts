import {
  listLocalChapters,
  putLocalChapters,
  putLocalStory,
  removeLocalStory,
  toLocalChapter,
  toLocalStory,
  offlineAvailable,
} from "@/lib/offlineDb";
import { fetchChapters, fetchChapterSummaries, fetchStory } from "@/services/storyService";
import { supabase } from "@/integrations/supabase/client";
import type { Chapter } from "@/types";

/** Pulls a story and every chapter into the local database. */
export async function downloadStory(storyId: string) {
  if (!offlineAvailable()) throw new Error("Offline storage is not available in this browser.");

  const story = await fetchStory(storyId);
  if (!story) throw new Error("Story not found");
  const chapters = await fetchChapters(storyId);

  await putLocalStory(
    toLocalStory(story, story.author?.display_name ?? story.author?.username ?? null),
  );
  await putLocalChapters(chapters.map(toLocalChapter));
  return { chapters: chapters.length };
}

export async function removeDownload(storyId: string) {
  await removeLocalStory(storyId);
}

/**
 * Compares local content hashes against the server and re-downloads only the
 * chapters that actually changed.
 */
export async function refreshDownload(storyId: string) {
  const local = await listLocalChapters(storyId);
  const remote = await fetchChapterSummaries(storyId);

  const localMap = new Map(local.map((c) => [c.id, c.content_hash]));
  const staleIds = remote.filter((r) => localMap.get(r.id) !== r.content_hash).map((r) => r.id);
  const removedIds = local.filter((l) => !remote.some((r) => r.id === l.id)).map((l) => l.id);

  if (!staleIds.length && !removedIds.length) return { updated: 0 };

  if (staleIds.length) {
    const { data, error } = await supabase.from("chapters").select("*").in("id", staleIds);
    if (error) throw new Error(error.message);
    await putLocalChapters((data as unknown as Chapter[]).map(toLocalChapter));
  }

  const story = await fetchStory(storyId);
  if (story) {
    await putLocalStory(
      toLocalStory(story, story.author?.display_name ?? story.author?.username ?? null),
    );
  }
  return { updated: staleIds.length };
}
