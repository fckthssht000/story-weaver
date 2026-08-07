import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createStory,
  deleteStory,
  fetchMyStories,
  fetchPublishedStories,
  fetchRecentReads,
  fetchDiscoverStories,
  fetchTopStories,
  fetchStory,
  updateStory,
  fetchBookmarks,
} from "@/services/storyService";
import type { Story } from "@/types";

export function useStories(filters: { genre?: string; search?: string } = {}) {
  return useQuery({
    queryKey: ["stories", filters.genre ?? null, filters.search ?? null],
    queryFn: () => fetchPublishedStories(filters),
  });
}

export function useStory(storyId: string | undefined) {
  return useQuery({
    queryKey: ["story", storyId],
    enabled: !!storyId,
    queryFn: () => fetchStory(storyId!),
  });
}

export function useRecentReads(userId: string | null) {
  return useQuery({
    queryKey: ["recent-reads", userId],
    enabled: !!userId,
    queryFn: () => fetchRecentReads(userId!),
  });
}

export function useDiscoverStories() {
  return useQuery({
    queryKey: ["discover-stories"],
    queryFn: () => fetchDiscoverStories(),
  });
}

export function useTopStories() {
  return useQuery({
    queryKey: ["top-stories"],
    queryFn: () => fetchTopStories(),
  });
}

export function useMyStories(userId: string | null) {
  return useQuery({
    queryKey: ["my-stories", userId],
    enabled: !!userId,
    queryFn: () => fetchMyStories(userId!),
  });
}

export function useBookmarks(userId: string | null) {
  return useQuery({
    queryKey: ["bookmarks", userId],
    enabled: !!userId,
    queryFn: () => fetchBookmarks(userId!),
  });
}

export function useStoryMutations(userId: string | null) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["my-stories"] });
    qc.invalidateQueries({ queryKey: ["stories"] });
    qc.invalidateQueries({ queryKey: ["story"] });
  };

  const create = useMutation({
    mutationFn: (input: {
      title: string;
      description?: string;
      genre?: string;
      cover_url?: string;
    }) => createStory({ author_id: userId!, ...input }),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Story> }) => updateStory(id, patch),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteStory(id),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}
