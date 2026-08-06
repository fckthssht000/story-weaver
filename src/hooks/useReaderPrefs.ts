import { useEffect, useState } from "react";

export type ReaderTheme = "paper" | "sepia" | "night";

export interface ReaderPrefs {
  theme: ReaderTheme;
  size: number; // px
  leading: number;
  width: number; // ch
}

const KEY = "storyapp.reader.prefs";

export const DEFAULT_PREFS: ReaderPrefs = { theme: "paper", size: 18, leading: 1.75, width: 62 };

export function useReaderPrefs() {
  const [prefs, setPrefs] = useState<ReaderPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setPrefs({ ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<ReaderPrefs>) });
    } catch {
      /* ignore */
    }
  }, []);

  const update = (patch: Partial<ReaderPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return { prefs, update };
}
