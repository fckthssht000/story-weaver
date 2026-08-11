// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    nitro: {
      preset: "vercel-edge",
      vercel: {
        config: {
          regions: ["iad1"],
        },
      },
    },
  },
  vite: {
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        outDir: ".output/public",
        includeAssets: ["favicon.ico", "icon.png"],
        manifest: {
          name: "Buklat",
          short_name: "Buklat",
          description: "Offline reader and writer",
          theme_color: "#ffffff",
          icons: [
            {
              src: "icon.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "icon.png",
              sizes: "512x512",
              type: "image/png",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,ico,png,svg}"],
          globDirectory: ".output/public",
          navigateFallback: null,
        },
        devOptions: {
          enabled: true,
        },
      }),
    ],
  },
});
