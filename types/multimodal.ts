import type { UserFile } from "./files";
export type MessageAttachment = Pick<UserFile, "id" | "fileName" | "fileType" | "mimeType" | "size" | "url" | "thumbnailUrl" | "imageKitFileId">;
