import type { UserFileKind } from "../../types/files";

export const fileConfig: { maxImageSize: number; maxDocumentSize: number; allowed: Record<UserFileKind, string[]> } = {
  maxImageSize: 8 * 1024 * 1024,
  maxDocumentSize: 15 * 1024 * 1024,
  allowed: { image: ["image/jpeg", "image/png", "image/webp"], document: ["application/pdf", "text/plain"] },
};

export function fileKindForMime(mimeType: string): UserFileKind | null {
  if (fileConfig.allowed.image.includes(mimeType)) return "image";
  if (fileConfig.allowed.document.includes(mimeType)) return "document";
  return null;
}
