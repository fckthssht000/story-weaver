import { useSettings } from "@/hooks/useSettings";
import type { ReaderTheme } from "@/lib/settings";

export type { ReaderTheme };

export interface ReaderPrefs {
  theme: ReaderTheme;
  size: number;
  leading: number;
  width: number;
  justify: boolean;
}

export const DEFAULT_PREFS: ReaderPrefs = {
  theme: "paper",
  size: 18,
  leading: 1.75,
  width: 62,
  justify: false,
};

/** Reader typography, backed by the shared app settings store. */
export function useReaderPrefs() {
  const { settings, update: updateSettings } = useSettings();

  const prefs: ReaderPrefs = {
    theme: settings.readerTheme,
    size: settings.readerSize,
    leading: settings.readerLeading,
    width: settings.readerWidth,
    justify: settings.readerJustify,
  };

  const update = (patch: Partial<ReaderPrefs>) =>
    updateSettings({
      ...(patch.theme !== undefined ? { readerTheme: patch.theme } : {}),
      ...(patch.size !== undefined ? { readerSize: patch.size } : {}),
      ...(patch.leading !== undefined ? { readerLeading: patch.leading } : {}),
      ...(patch.width !== undefined ? { readerWidth: patch.width } : {}),
      ...(patch.justify !== undefined ? { readerJustify: patch.justify } : {}),
    });

  return { prefs, update };
}
