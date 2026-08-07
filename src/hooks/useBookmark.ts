import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addBookmark,
  checkBookmark,
  fetchBookmarkedStories,
  removeBookmark,
} from "@/services/bookmarkService";

/** Check + toggle a single story's bookmark state for the current user. */
export function useBookmark(storyId: string | undefined, userId: string | null) {
  const qc = useQueryClient();

  const state = useQuery({
    queryKey: ["bookmark", storyId, userId],
    enabled: !!storyId && !!userId,
    queryFn: () => checkBookmark(userId!, storyId!),
    staleTime: 30_000,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["bookmark", storyId] });
    void qc.invalidateQueries({ queryKey: ["bookmarks"] });
  };

  const add = useMutation({
    mutationFn: () => addBookmark(userId!, storyId!),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: () => removeBookmark(userId!, storyId!),
    onSuccess: invalidate,
  });

  return {
    bookmarked: state.data ?? false,
    loading: state.isLoading,
    add,
    remove,
  };
}

/** All bookmarked stories for the Library page. */
export function useBookmarks(userId: string | null) {
  return useQuery({
    queryKey: ["bookmarks", userId],
    enabled: !!userId,
    queryFn: () => fetchBookmarkedStories(userId!),
    staleTime: 30_000,
  });
}
