import { supabase } from "@/integrations/supabase/client";
import { contentHash } from "@/lib/contentHash";
import type { Chapter, ChapterSummary, DocNode, Story, StoryWithAuthor } from "@/types";
import { EMPTY_DOC } from "@/types";

const STORY_SELECT =
  "id,author_id,title,description,cover_url,status,genre,created_at,updated_at";
const AUTHOR_SELECT = "author:profiles!stories_author_id_fkey(id,username,display_name,avatar_url)";

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
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

  return unwrap(await query) as unknown as StoryWithAuthor[];
}

export async function fetchStory(id: string) {
  const data = unwrap(
    await supabase.from("stories").select(`${STORY_SELECT},${AUTHOR_SELECT}`).eq("id", id).maybeSingle(),
  );
  return (data ?? null) as unknown as StoryWithAuthor | null;
}

export async function fetchMyStories(userId: string) {
  return unwrap(
    await supabase
      .from("stories")
      .select(STORY_SELECT)
      .eq("author_id", userId)
      .order("updated_at", { ascending: false }),
  ) as unknown as Story[];
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
        ...(input.cover_url ? { cover_url: input.cover_url } : {}),
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
