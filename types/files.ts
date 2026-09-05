export type UserFileKind = "image" | "document";
export type UserFile = {
  id: string;
  userId: string;
  fileName: string;
  fileType: UserFileKind;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  imageKitFileId?: string;
  createdAt: number;
  updatedAt: number;
};
