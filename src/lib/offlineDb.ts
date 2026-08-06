/**
 * Local offline database.
 *
 * Mirrors the native SQLite schema from the architecture doc
 * (downloaded_stories / downloaded_chapters / reading_progress with a
 * `synced` flag) using IndexedDB, which is the browser-native equivalent
 * available in this runtime.
 */
import type { Chapter, DocNode, Story } from "@/types";

const DB_NAME = "storyapp";
const DB_VERSION = 1;

export const STORE_STORIES = "downloaded_stories";
export const STORE_CHAPTERS = "downloaded_chapters";
export const STORE_PROGRESS = "reading_progress";

export interface LocalStory {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  genre: string | null;
  author_name: string | null;
  downloaded_at: string;
}

export interface LocalChapter {
  id: string;
  story_id: string;
  order_index: number;
  title: string | null;
  content: DocNode;
  content_hash: string;
}

export interface LocalProgress {
  story_id: string;
  chapter_id: string | null;
  scroll_position: number;
  updated_at: string;
  synced: 0 | 1;
}

let dbPromise: Promise<IDBDatabase> | null = null;

export function offlineAvailable() {
  return typeof indexedDB !== "undefined";
}

function open(): Promise<IDBDatabase> {
  if (!offlineAvailable()) return Promise.reject(new Error("IndexedDB unavailable"));
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_STORIES)) {
          db.createObjectStore(STORE_STORIES, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORE_CHAPTERS)) {
          const s = db.createObjectStore(STORE_CHAPTERS, { keyPath: "id" });
          s.createIndex("story_id", "story_id", { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_PROGRESS)) {
          db.createObjectStore(STORE_PROGRESS, { keyPath: "story_id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function done<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(stores: string[], mode: IDBTransactionMode) {
  const db = await open();
  return db.transaction(stores, mode);
}

/* ---------- stories ---------- */

export async function putLocalStory(story: LocalStory) {
  const t = await tx([STORE_STORIES], "readwrite");
  await done(t.objectStore(STORE_STORIES).put(story));
}

export async function listLocalStories(): Promise<LocalStory[]> {
  const t = await tx([STORE_STORIES], "readonly");
  const rows = await done(t.objectStore(STORE_STORIES).getAll() as IDBRequest<LocalStory[]>);
  return rows.sort((a, b) => (a.downloaded_at < b.downloaded_at ? 1 : -1));
}

export async function getLocalStory(id: string): Promise<LocalStory | undefined> {
  const t = await tx([STORE_STORIES], "readonly");
  return done(t.objectStore(STORE_STORIES).get(id) as IDBRequest<LocalStory | undefined>);
}

export async function removeLocalStory(id: string) {
  const chapters = await listLocalChapters(id);
  const t = await tx([STORE_STORIES, STORE_CHAPTERS], "readwrite");
  t.objectStore(STORE_STORIES).delete(id);
  for (const c of chapters) t.objectStore(STORE_CHAPTERS).delete(c.id);
  await new Promise<void>((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

/* ---------- chapters ---------- */

export async function putLocalChapters(chapters: LocalChapter[]) {
  if (!chapters.length) return;
  const t = await tx([STORE_CHAPTERS], "readwrite");
  const store = t.objectStore(STORE_CHAPTERS);
  for (const c of chapters) store.put(c);
  await new Promise<void>((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

export async function listLocalChapters(storyId: string): Promise<LocalChapter[]> {
  const t = await tx([STORE_CHAPTERS], "readonly");
  const idx = t.objectStore(STORE_CHAPTERS).index("story_id");
  const rows = await done(idx.getAll(storyId) as IDBRequest<LocalChapter[]>);
  return rows.sort((a, b) => a.order_index - b.order_index);
}

/* ---------- progress ---------- */

export async function putLocalProgress(p: LocalProgress) {
  const t = await tx([STORE_PROGRESS], "readwrite");
  await done(t.objectStore(STORE_PROGRESS).put(p));
}

export async function getLocalProgress(storyId: string): Promise<LocalProgress | undefined> {
  const t = await tx([STORE_PROGRESS], "readonly");
  return done(t.objectStore(STORE_PROGRESS).get(storyId) as IDBRequest<LocalProgress | undefined>);
}

export async function listUnsyncedProgress(): Promise<LocalProgress[]> {
  const t = await tx([STORE_PROGRESS], "readonly");
  const rows = await done(t.objectStore(STORE_PROGRESS).getAll() as IDBRequest<LocalProgress[]>);
  return rows.filter((r) => r.synced === 0);
}

export async function markProgressSynced(storyIds: string[]) {
  if (!storyIds.length) return;
  const t = await tx([STORE_PROGRESS], "readwrite");
  const store = t.objectStore(STORE_PROGRESS);
  for (const id of storyIds) {
    const req = store.get(id) as IDBRequest<LocalProgress | undefined>;
    req.onsuccess = () => {
      const row = req.result;
      if (row) store.put({ ...row, synced: 1 });
    };
  }
  await new Promise<void>((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

/* ---------- mappers ---------- */

export function toLocalStory(story: Story, authorName: string | null): LocalStory {
  return {
    id: story.id,
    title: story.title,
    description: story.description,
    cover_url: story.cover_url,
    genre: story.genre,
    author_name: authorName,
    downloaded_at: new Date().toISOString(),
  };
}

export function toLocalChapter(chapter: Chapter): LocalChapter {
  return {
    id: chapter.id,
    story_id: chapter.story_id,
    order_index: chapter.order_index,
    title: chapter.title,
    content: chapter.content,
    content_hash: chapter.content_hash,
  };
}
