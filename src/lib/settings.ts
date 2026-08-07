/**
 * App-wide settings. Single source of truth, persisted to localStorage and
 * shared across every component through a tiny external store so the
 * Settings page immediately affects the reader, sync and editor behaviour.
 */
export type ReaderTheme = "paper" | "sepia" | "night";
export type AppTheme = "light" | "dark" | "system";

export interface AppSettings {
  /* appearance */
  appTheme: AppTheme;
  /* reader */
  readerTheme: ReaderTheme;
  readerSize: number;
  readerLeading: number;
  readerWidth: number;
  readerJustify: boolean;
  /* offline + sync */
  autoDownloadOnRead: boolean;
  syncReadingProgress: boolean;
  realtimeUpdates: boolean;
  /* editor */
  autosave: boolean;
  autosaveDelay: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  appTheme: "system",
  readerTheme: "paper",
  readerSize: 18,
  readerLeading: 1.75,
  readerWidth: 62,
  readerJustify: false,
  autoDownloadOnRead: false,
  syncReadingProgress: true,
  realtimeUpdates: true,
  autosave: true,
  autosaveDelay: 2000,
};

const KEY = "storyapp.settings.v1";

let state: AppSettings = DEFAULT_SETTINGS;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function hydrateSettings() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch {
    /* ignore */
  }
  applyAppTheme(state.appTheme);
  emit();
}

export function getSettings(): AppSettings {
  return state;
}

export function getServerSettings(): AppSettings {
  return DEFAULT_SETTINGS;
}

export function setSettings(patch: Partial<AppSettings>) {
  state = { ...state, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  if (patch.appTheme) applyAppTheme(patch.appTheme);
  emit();
}

export function resetSettings() {
  state = DEFAULT_SETTINGS;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  applyAppTheme(state.appTheme);
  emit();
}

export function subscribeSettings(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function applyAppTheme(theme: AppTheme) {
  if (typeof document === "undefined") return;
  const prefersDark =
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = theme === "dark" || (theme === "system" && prefersDark);
  document.documentElement.classList.toggle("dark", dark);
}
