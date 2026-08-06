/**
 * Stable, dependency-free fingerprint of a chapter document.
 * Used to detect which downloaded chapters changed upstream.
 */
export function contentHash(doc: unknown): string {
  const json = stableStringify(doc);
  let h1 = 0x811c9dc5;
  let h2 = 0x1000193;
  for (let i = 0; i < json.length; i++) {
    const c = json.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 + c, 2246822519) >>> 0;
  }
  return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : 1));
  return "{" + entries.map(([k, v]) => JSON.stringify(k) + ":" + stableStringify(v)).join(",") + "}";
}
