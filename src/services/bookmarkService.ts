import { supabase } from "@/integrations/supabase/client";
import type { StoryWithAuthor } from "@/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export async function addBookmark(userId: string, storyId: string): Promise<void> {
  const { error } = await db
    .from("user_bookmarks")
    .upsert({ user_id: userId, story_id: storyId }, { onConflict: "user_id,story_id", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}

export async function removeBookmark(userId: string, storyId: string): Promise<void> {
  const { error } = await db
    .from("user_bookmarks")
    .delete()
    .eq("user_id", userId)
    .eq("story_id", storyId);
  if (error) throw new Error(error.message);
}

export async function checkBookmark(userId: string, storyId: string): Promise<boolean> {
  const { data } = await db
    .from("user_bookmarks")
    .select("story_id")
    .eq("user_id", userId)
    .eq("story_id", storyId)
    .maybeSingle();
  return !!data;
}

export async function fetchBookmarkedStories(userId: string): Promise<StoryWithAuthor[]> {
  const { data, error } = await db
    .from("user_bookmarks")
    .select(
      "story_id, created_at, story:stories!inner(id,author_id,title,description,cover_url,status,genre,created_at,updated_at,author:profiles!stories_author_id_fkey(id,username,display_name,avatar_url))",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data as { story: StoryWithAuthor }[]) ?? []).map((row) => row.story);
}
