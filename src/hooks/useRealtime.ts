import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/hooks/useSettings";

type Table = "stories" | "chapters" | "profiles" | "story_likes";

/**
 * Subscribes to Postgres change streams and invalidates only the query keys
 * that depend on the changed table. Cheap: one channel per mounted scope,
 * torn down on unmount, and gated by the user's realtime setting.
 */
export function useRealtime(
  tables: Table[],
  options: { filter?: string; enabled?: boolean; keys?: string[][]; channel?: string } = {},
) {
  const qc = useQueryClient();
  const { settings } = useSettings();
  const enabled = (options.enabled ?? true) && settings.realtimeUpdates;
  const signature = tables.join(",");
  const filter = options.filter;
  const keys = JSON.stringify(options.keys ?? []);
  const channelName = options.channel ?? `rt:${signature}:${filter ?? "all"}`;

  useEffect(() => {
    if (!enabled) return;
    const channel = supabase.channel(channelName);

    for (const table of signature.split(",") as Table[]) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, ...(filter ? { filter } : {}) },
        () => {
          const explicit = JSON.parse(keys) as string[][];
          if (explicit.length) {
            for (const key of explicit) qc.invalidateQueries({ queryKey: key });
            return;
          }
          if (table === "stories") {
            qc.invalidateQueries({ queryKey: ["stories"] });
            qc.invalidateQueries({ queryKey: ["story"] });
            qc.invalidateQueries({ queryKey: ["my-stories"] });
          } else if (table === "chapters") {
            qc.invalidateQueries({ queryKey: ["chapters"] });
            qc.invalidateQueries({ queryKey: ["chapter-list"] });
          } else if (table === "profiles") {
            qc.invalidateQueries({ queryKey: ["profile"] });
          } else if (table === "story_likes") {
            qc.invalidateQueries({ queryKey: ["likes"] });
          }
        },
      );
    }

    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc, enabled, signature, filter, keys, channelName]);
}
