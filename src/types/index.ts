export type StoryStatus = "draft" | "published";

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

export interface Story {
  id: string;
  author_id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  status: StoryStatus;
  genre: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoryWithAuthor extends Story {
  author: Pick<Profile, "id" | "username" | "display_name" | "avatar_url" | "bio"> | null;
  chapter_count?: number;
  like_count?: number;
}

/** Constrained Tiptap document. Structure only — never styles. */
export interface DocNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: DocNode[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
}

export interface Chapter {
  id: string;
  story_id: string;
  order_index: number;
  title: string | null;
  content: DocNode;
  content_hash: string;
  created_at: string;
  updated_at: string;
}

export type ChapterSummary = Pick<
  Chapter,
  "id" | "story_id" | "order_index" | "title" | "content_hash" | "updated_at"
>;

export interface ReadingProgress {
  story_id: string;
  chapter_id: string | null;
  scroll_position: number;
  updated_at: string;
}

export const EMPTY_DOC: DocNode = { type: "doc", content: [{ type: "paragraph" }] };

export const GENRES = [
  "Literary",
  "Fantasy",
  "Science Fiction",
  "Romance",
  "Mystery",
  "Horror",
  "Historical",
  "Poetry",
  "Non-fiction",
] as const;
