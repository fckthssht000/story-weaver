import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { downloadStory, refreshDownload, removeDownload } from "@/services/downloadService";
import { getLocalStory, listLocalStories, offlineAvailable } from "@/lib/offlineDb";

export function useDownloads() {
  const qc = useQueryClient();

  const library = useQuery({
    queryKey: ["library"],
    queryFn: () => (offlineAvailable() ? listLocalStories() : Promise.resolve([])),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["library"] });
    qc.invalidateQueries({ queryKey: ["downloaded"] });
  };

  const download = useMutation({
    mutationFn: (storyId: string) => downloadStory(storyId),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (storyId: string) => removeDownload(storyId),
    onSuccess: invalidate,
  });

  const refresh = useMutation({
    mutationFn: (storyId: string) => refreshDownload(storyId),
    onSuccess: invalidate,
  });

  return { library, download, remove, refresh };
}

export function useIsDownloaded(storyId: string | undefined) {
  const [downloaded, setDownloaded] = useState(false);
  const qc = useQueryClient();

  const check = useCallback(async () => {
    if (!storyId || !offlineAvailable()) return;
    setDownloaded(!!(await getLocalStory(storyId)));
  }, [storyId]);

  useEffect(() => {
    void check();
  }, [check, qc]);

  const query = useQuery({
    queryKey: ["downloaded", storyId],
    enabled: !!storyId,
    queryFn: async () => {
      if (!storyId || !offlineAvailable()) return false;
      return !!(await getLocalStory(storyId));
    },
  });

  return query.data ?? downloaded;
}
