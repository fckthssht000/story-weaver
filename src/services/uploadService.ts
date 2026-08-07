import { supabase } from "@/integrations/supabase/client";

export type MediaBucket = "covers" | "avatars";

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Uploads to a public bucket under `<userId>/...` (required by the storage
 * policies). Uses a content-addressed-ish deterministic-per-upload path so a
 * retried upload overwrites instead of piling up orphans.
 */
export async function uploadMedia(bucket: MediaBucket, userId: string, file: File, scope = "item") {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > MAX_BYTES) throw new Error("Images must be 5 MB or smaller.");

  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${userId}/${scope}-${Date.now()}.${ext || "jpg"}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/** Best-effort cleanup of a previously uploaded public URL. */
export async function removeMedia(bucket: MediaBucket, publicUrl: string | null | undefined) {
  if (!publicUrl) return;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;
  const path = publicUrl.slice(idx + marker.length).split("?")[0];
  if (!path) return;
  await supabase.storage.from(bucket).remove([decodeURIComponent(path)]);
}
