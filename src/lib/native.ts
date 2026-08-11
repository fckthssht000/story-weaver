/**
 * Native (Capacitor) integration that degrades to a no-op in the browser.
 *
 * Nothing here is imported at module scope by SSR-critical code paths, and all
 * Capacitor plugins are dynamically imported so the plain web build is
 * unaffected when running outside a native shell.
 */

let started = false;

export function isNativeShell(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return !!cap?.isNativePlatform?.();
}

/**
 * Wires up native-only behaviour: status bar styling and the Android hardware
 * back button. Returns a cleanup function.
 */
export function initNative(onBack: () => boolean): () => void {
  if (started || !isNativeShell()) return () => {};
  started = true;

  let dispose: (() => void) | undefined;

  void (async () => {
    try {
      const [{ StatusBar, Style }, { App }] = await Promise.all([
        import("@capacitor/status-bar"),
        import("@capacitor/app"),
      ]);

      const dark = document.documentElement.classList.contains("dark");
      await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });

      const handle = await App.addListener("backButton", () => {
        // onBack returns true when the app handled navigation itself.
        if (!onBack()) void App.exitApp();
      });
      dispose = () => void handle.remove();
    } catch {
      // Plugin unavailable — stay on the web code path.
    }
  })();

  return () => {
    dispose?.();
    started = false;
  };
}
