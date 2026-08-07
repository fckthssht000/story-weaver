import { useEffect, useSyncExternalStore } from "react";
import {
  applyAppTheme,
  getServerSettings,
  getSettings,
  hydrateSettings,
  resetSettings,
  setSettings,
  subscribeSettings,
  type AppSettings,
} from "@/lib/settings";

export function useSettings() {
  const settings = useSyncExternalStore(subscribeSettings, getSettings, getServerSettings);

  useEffect(() => {
    hydrateSettings();
  }, []);

  useEffect(() => {
    if (settings.appTheme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyAppTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [settings.appTheme]);

  const update = (patch: Partial<AppSettings>) => setSettings(patch);
  return { settings, update, reset: resetSettings };
}
