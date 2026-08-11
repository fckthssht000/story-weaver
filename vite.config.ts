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
  },
  vite: {
    plugins: [
      VitePWA({
        // The served client assets live in .output/public; emit + precache there
        // so /sw.js actually exists on the deployed site.
        outDir: ".output/public",

        includeAssets: ["favicon.ico", "icon.png"],
        manifest: {
          name: "Buklat",
          short_name: "Buklat",
          description: "Offline reader and writer",
          theme_color: "#ffffff",
          background_color: "#ffffff",
          display: "standalone",
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
          globDirectory: ".output/public",
          globPatterns: ["**/*.{js,css,ico,png,svg,webmanifest}"],
          globIgnores: ["favicon.ico", "icon.png", "manifest.webmanifest"],
          navigateFallback: null,
          runtimeCaching: [
            {
              // HTML navigations: always try the network first.
              urlPattern: ({ request, url }) =>
                request.mode === "navigate" && !url.pathname.startsWith("/~oauth"),
              handler: "NetworkFirst",
              options: {
                cacheName: "html-navigations",
                networkTimeoutSeconds: 5,
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
              },
            },
            {
              // Same-origin hashed build assets.
              urlPattern: ({ request, sameOrigin }) =>
                sameOrigin && ["script", "style", "font", "image"].includes(request.destination),
              handler: "CacheFirst",
              options: {
                cacheName: "static-assets",
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),

    ],
    build: {
      rollupOptions: {
        external: ["@capacitor/status-bar", "@capacitor/app"]
      }
    }
  },
});
