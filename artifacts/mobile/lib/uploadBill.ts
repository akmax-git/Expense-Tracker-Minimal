import { supabase } from "@/lib/supabase";

function guessExt(uri: string, mimeType?: string | null): string {
  if (mimeType?.includes("png")) return "png";
  if (mimeType?.includes("webp")) return "webp";
  if (mimeType?.includes("heic")) return "heic";
  if (mimeType?.includes("gif")) return "gif";
  if (mimeType?.includes("pdf")) return "pdf";
  if (mimeType?.includes("wordprocessingml") || mimeType === "application/msword") {
    return mimeType.includes("wordprocessingml") ? "docx" : "doc";
  }
  if (mimeType?.includes("spreadsheetml") || mimeType === "application/vnd.ms-excel") {
    return mimeType.includes("spreadsheetml") ? "xlsx" : "xls";
  }
  if (mimeType?.includes("jpeg") || mimeType?.includes("jpg")) return "jpg";

  const fromUri = uri.split("?")[0].split(".").pop()?.toLowerCase();
  if (fromUri && fromUri.length <= 5) return fromUri;
  return "jpg";
}

function contentTypeFor(ext: string, mimeType?: string | null): string {
  if (mimeType) return mimeType;
  switch (ext) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "heic":
      return "image/heic";
    case "gif":
      return "image/gif";
    case "pdf":
      return "application/pdf";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "xls":
      return "application/vnd.ms-excel";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "jpg":
    case "jpeg":
    default:
      return "image/jpeg";
  }
}

/**
 * Upload a bill/receipt file (image, PDF, or document) to Supabase Storage
 * and return its public URL.
 */
export async function uploadBill(
  userId: string,
  uri: string,
  mimeType?: string | null
): Promise<string> {
  const ext = guessExt(uri, mimeType);
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const contentType = contentTypeFor(ext, mimeType);

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
