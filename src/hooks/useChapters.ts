import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createChapter,
  deleteChapter,
  fetchChapterSummaries,
  fetchChapters,
  reorderChapters,
  saveChapter,
} from "@/services/storyService";
import { listLocalChapters } from "@/lib/offlineDb";
import type { Chapter, DocNode } from "@/types";

/** Chapter list for a story — falls back to the local copy when offline. */
export function useChapterList(storyId: string | undefined, online: boolean) {
  return useQuery({
    queryKey: ["chapter-list", storyId, online],
    enabled: !!storyId,
    queryFn: async () => {
      if (!online) {
        const local = await listLocalChapters(storyId!);
        return local.map((c) => ({
          id: c.id,
          story_id: c.story_id,
          order_index: c.order_index,
          title: c.title,
          content_hash: c.content_hash,
          updated_at: "",
        }));
      }
      return fetchChapterSummaries(storyId!);
    },
  });
}

/** Full chapters, preferring local copies when offline. */
export function useChapters(storyId: string | undefined, online: boolean) {
  return useQuery({
    queryKey: ["chapters", storyId, online],
    enabled: !!storyId,
    queryFn: async (): Promise<Chapter[]> => {
      if (!online) {
        const local = await listLocalChapters(storyId!);
        return local.map((c) => ({
          ...c,
          created_at: "",
          updated_at: "",
        })) as Chapter[];
      }
      return fetchChapters(storyId!);
    },
  });
}

export function useChapterMutations(storyId: string | undefined) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["chapters"] });
    qc.invalidateQueries({ queryKey: ["chapter-list"] });
  };

  const create = useMutation({
    mutationFn: ({ title, orderIndex }: { title: string; orderIndex: number }) =>
      createChapter(storyId!, title, orderIndex),
    onSuccess: invalidate,
  });

  const save = useMutation({
    mutationFn: ({ id, title, content }: { id: string; title?: string; content?: DocNode }) =>
      saveChapter(id, {
        ...(title !== undefined ? { title } : {}),
        ...(content !== undefined ? { content } : {}),
      }),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteChapter(id),
    onSuccess: invalidate,
  });

  const reorder = useMutation({
    mutationFn: (items: { id: string; order_index: number }[]) => reorderChapters(items),
    onSuccess: invalidate,
  });

  return { create, save, remove, reorder };
}
