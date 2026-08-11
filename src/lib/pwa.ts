/**
 * Single, guarded service-worker registrar.
 *
 * The worker is only ever registered in a real production deployment: never in
 * dev, never inside the Lovable preview iframe, and never when `?sw=off` is
 * present. In any refused context we actively unregister a stale `/sw.js`.
 */
const SW_URL = "/sw.js";

function isRefusedContext(): boolean {
  if (typeof window === "undefined") return true;
  if (!import.meta.env.PROD) return true;
  if (window.top !== window.self) return true;
  if (new URL(window.location.href).searchParams.get("sw") === "off") return true;

  const host = window.location.hostname;
  if (host.startsWith("id-preview--") || host.startsWith("preview--")) return true;
  const blocked = ["lovableproject.com", "lovableproject-dev.com", "beta.lovable.dev"];
  return blocked.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

async function unregisterAppWorker() {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    registrations
      .filter((r) => (r.active?.scriptURL ?? r.installing?.scriptURL ?? "").includes(SW_URL))
      .map((r) => r.unregister()),
  );
}

export function registerServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  if (isRefusedContext()) {
    void unregisterAppWorker();
    return;
  }

  navigator.serviceWorker.register(SW_URL, { scope: "/" }).catch(() => {
    /* offline support is best-effort; the app works fine without it */
  });
}
