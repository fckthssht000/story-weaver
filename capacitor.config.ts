import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor shell for the StoryApp web build.
 *
 * The web app is the single source of truth; Capacitor only wraps the built
 * client bundle. Build with `bun run build`, then `npx cap sync`.
 */
const config: CapacitorConfig = {
  appId: "app.buklat.story",
  appName: "Buklat",
  // TanStack Start emits the static client assets here.
  webDir: ".output/public",
  android: {
    backgroundColor: "#FFFFFF",
  },
  ios: {
    contentInset: "always",
  },
};

export default config;
