import * as DocumentPicker from "expo-document-picker";

/** Images, PDF, and common office docs accepted as bill attachments. */
export const BILL_MIME_TYPES = [
  "image/*",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

export type PickedBill = {
  uri: string;
  mimeType: string | null;
  name: string | null;
};

export async function pickBillFile(): Promise<PickedBill | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [...BILL_MIME_TYPES],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    mimeType: asset.mimeType ?? null,
    name: asset.name ?? null,
  };
}

export function isImageBill(
  uri: string | null | undefined,
  mimeType?: string | null
): boolean {
  if (mimeType?.startsWith("image/")) return true;
  if (!uri) return false;
  const path = uri.split("?")[0].toLowerCase();
  return /\.(jpe?g|png|gif|webp|heic|bmp)$/.test(path);
}

export function billDisplayName(
  uri: string | null | undefined,
  name?: string | null
): string {
  if (name) return name;
  if (!uri) return "Attached file";
  const fromUri = decodeURIComponent(uri.split("?")[0].split("/").pop() || "");
  return fromUri || "Attached file";
}
