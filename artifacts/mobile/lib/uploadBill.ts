import { supabase } from "@/lib/supabase";

function guessExt(uri: string, mimeType?: string | null): string {
  if (mimeType?.includes("png")) return "png";
  if (mimeType?.includes("webp")) return "webp";
  if (mimeType?.includes("heic")) return "heic";
  if (mimeType?.includes("pdf")) return "pdf";
  const fromUri = uri.split("?")[0].split(".").pop()?.toLowerCase();
  if (fromUri && fromUri.length <= 5) return fromUri;
  return "jpg";
}

/**
 * Upload a bill/receipt image to Supabase Storage and return its public URL.
 */
export async function uploadBill(
  userId: string,
  uri: string,
  mimeType?: string | null
): Promise<string> {
  const ext = guessExt(uri, mimeType);
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const contentType = mimeType || `image/${ext === "jpg" ? "jpeg" : ext}`;

  const response = await fetch(uri);
  const blob = await response.blob();

  const { error } = await supabase.storage.from("bills").upload(path, blob, {
    contentType,
    upsert: false,
  });

  if (error) {
    throw new Error(error.message || "Failed to upload bill");
  }

  const { data } = supabase.storage.from("bills").getPublicUrl(path);
  return data.publicUrl;
}
