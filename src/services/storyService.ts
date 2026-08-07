import { supabase } from "@/integrations/supabase/client";
import { contentHash } from "@/lib/contentHash";
import type { Chapter, ChapterSummary, DocNode, Story, StoryWithAuthor } from "@/types";
import { EMPTY_DOC } from "@/types";

const STORY_SELECT =
  "id,author_id,title,description,cover_url,status,genre,created_at,updated_at,chapters(count),story_likes(count)";
const AUTHOR_SELECT = "author:profiles!stories_author_id_fkey(id,username,display_name,avatar_url,bio)";

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

function mapStory(story: any): StoryWithAuthor {
  if (!story) return story;
  const chapter_count = Array.isArray(story.chapters) ? story.chapters[0]?.count : story.chapters?.count;
  const like_count = Array.isArray(story.story_likes) ? story.story_likes[0]?.count : story.story_likes?.count;
  return {
    ...story,
    chapter_count: chapter_count ?? 0,
    like_count: like_count ?? 0,
  } as StoryWithAuthor;
}

/* ---------- reads ---------- */

export async function fetchPublishedStories(options?: { genre?: string; search?: string }) {
  let query = supabase
    .from("stories")
    .select(`${STORY_SELECT},${AUTHOR_SELECT}`)
    .eq("status", "published")
    .order("updated_at", { ascending: false })
    .limit(60);

  if (options?.genre) query = query.eq("genre", options.genre);
  if (options?.search) query = query.ilike("title", `%${options.search}%`);

  const data = unwrap(await query) as any[];
  return data.map(mapStory);
}

export async function fetchRecentReads(userId: string) {
  const { data, error } = await supabase
    .from("reading_progress")
    .select(`
      story_id,
      updated_at,
      story:stories(${STORY_SELECT},${AUTHOR_SELECT})
    `)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(10);

  if (error) throw new Error(error.message);
  
  // Unwrap the joined story object, filter out any nulls if a story was deleted
  return data
    .map((d) => mapStory(d.story))
    .filter(Boolean);
}

export async function fetchBookmarks(userId: string) {
  const { data, error } = await supabase
    .from("user_bookmarks" as any)
    .select(`
      story_id,
      created_at,
      story:stories(${STORY_SELECT},${AUTHOR_SELECT})
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  
  return (data as any[])
    .map((d) => mapStory(d.story))
    .filter(Boolean);
}

// Temporary methods for the different sections until we have dedicated backend stats
export async function fetchDiscoverStories() {
  // Just returning oldest stories as "discover" for now
  const data = unwrap(
    await supabase
      .from("stories")
      .select(`${STORY_SELECT},${AUTHOR_SELECT}`)
      .eq("status", "published")
      .order("created_at", { ascending: true })
      .limit(10)
  ) as any[];
  return data.map(mapStory);
}

export async function fetchTopStories() {
  // Sort by title alphabetically as a pseudo-random "top" list
  const data = unwrap(
    await supabase
      .from("stories")
      .select(`${STORY_SELECT},${AUTHOR_SELECT}`)
      .eq("status", "published")
      .order("title", { ascending: true })
      .limit(10)
  ) as any[];
  return data.map(mapStory);
}

export async function fetchStory(id: string) {
  const data = unwrap(
    await supabase.from("stories").select(`${STORY_SELECT},${AUTHOR_SELECT}`).eq("id", id).maybeSingle(),
  );
  return data ? mapStory(data) : null;
}

export async function fetchMyStories(userId: string) {
  const data = unwrap(
    await supabase
      .from("stories")
      .select(`${STORY_SELECT},${AUTHOR_SELECT}`)
      .eq("author_id", userId)
      .order("updated_at", { ascending: false }),
  ) as any[];
  return data.map(mapStory);
}

export async function fetchChapterSummaries(storyId: string) {
  return unwrap(
    await supabase
      .from("chapters")
      .select("id,story_id,order_index,title,content_hash,updated_at")
      .eq("story_id", storyId)
      .order("order_index"),
  ) as unknown as ChapterSummary[];
}

export async function fetchChapters(storyId: string) {
  return unwrap(
    await supabase.from("chapters").select("*").eq("story_id", storyId).order("order_index"),
  ) as unknown as Chapter[];
}

export async function fetchChapter(chapterId: string) {
  const data = unwrap(await supabase.from("chapters").select("*").eq("id", chapterId).maybeSingle());
  return (data ?? null) as unknown as Chapter | null;
}

/* ---------- story writes ---------- */

export async function createStory(input: {
  id?: string;
  author_id: string;
  title: string;
  description?: string | null;
  genre?: string | null;
  cover_url?: string | null;
}) {
  return unwrap(
    await supabase
      .from("stories")
      .upsert({
        id: input.id ?? crypto.randomUUID(),
        author_id: input.author_id,
        title: input.title,
        description: input.description ?? null,
        genre: input.genre ?? null,
        cover_url: input.cover_url ?? null,
        status: "draft",
      }, { onConflict: "id", ignoreDuplicates: false })
      .select(STORY_SELECT)
      .single(),
  ) as unknown as Story;
}

export async function updateStory(id: string, patch: Partial<Story>) {
  return unwrap(
    await supabase.from("stories").update(patch).eq("id", id).select(STORY_SELECT).single(),
  ) as unknown as Story;
}

export async function deleteStory(id: string) {
  const { error } = await supabase.from("stories").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* ---------- chapter writes ---------- */

export async function createChapter(
  storyId: string,
  title: string,
  orderIndex: number,
  id: string = crypto.randomUUID(),
) {
  return unwrap(
    await supabase
      .from("chapters")
      .upsert({
        id,
        story_id: storyId,
        title,
        order_index: orderIndex,
        content: EMPTY_DOC as never,
        content_hash: contentHash(EMPTY_DOC),
      }, { onConflict: "id", ignoreDuplicates: false })
      .select("*")
      .single(),
  ) as unknown as Chapter;
}

export async function saveChapter(id: string, patch: { title?: string | null; content?: DocNode }) {
  const update: { title?: string | null; content?: never; content_hash?: string } = {};
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.content !== undefined) {
    update.content = patch.content as never;
    update.content_hash = contentHash(patch.content);
  }
  return unwrap(
    await supabase.from("chapters").update(update).eq("id", id).select("*").single(),
  ) as unknown as Chapter;
}

export async function deleteChapter(id: string) {
  const { error } = await supabase.from("chapters").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function reorderChapters(chapters: { id: string; order_index: number }[]) {
  for (const c of chapters) {
    const { error } = await supabase
      .from("chapters")
      .update({ order_index: c.order_index })
      .eq("id", c.id);
    if (error) throw new Error(error.message);
  }
}

/* ---------- likes ---------- */

export async function fetchLikeState(storyId: string, userId: string | null) {
  const { count } = await supabase
    .from("story_likes")
    .select("*", { count: "exact", head: true })
    .eq("story_id", storyId);

  let liked = false;
  if (userId) {
    const { data } = await supabase
      .from("story_likes")
      .select("story_id")
      .eq("story_id", storyId)
      .eq("user_id", userId)
      .maybeSingle();
    liked = !!data;
  }
  return { count: count ?? 0, liked };
}

export async function toggleLike(storyId: string, userId: string, liked: boolean) {
  if (liked) {
    const { error } = await supabase
      .from("story_likes")
      .delete()
      .eq("story_id", storyId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("story_likes")
      .upsert({ story_id: storyId, user_id: userId }, { onConflict: "user_id,story_id", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  }
}
