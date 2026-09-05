import { get, push, ref, serverTimestamp, update } from "firebase/database";
import { getFirebaseServices } from "../firebase";
import type { ChatMessage, MessageRole } from "../../types/chat";
import type { MessageAttachment } from "../../types/multimodal";
import type { ResearchSource, WebImage } from "../../types/research";

function sanitizeAttachment(attachment: MessageAttachment): MessageAttachment {
  const sanitized: MessageAttachment = {
    id: attachment.id,
    fileName: attachment.fileName,
    fileType: attachment.fileType,
    mimeType: attachment.mimeType,
    size: attachment.size,
    url: attachment.url,
  };
  if (attachment.thumbnailUrl !== undefined) sanitized.thumbnailUrl = attachment.thumbnailUrl;
  if (attachment.imageKitFileId !== undefined) sanitized.imageKitFileId = attachment.imageKitFileId;
  return sanitized;
}

function sanitizeUsage(usage: ChatMessage["usage"]): ChatMessage["usage"] {
  if (!usage) return undefined;
  const sanitized: NonNullable<ChatMessage["usage"]> = {};
  if (usage.inputTokens !== undefined) sanitized.inputTokens = usage.inputTokens;
  if (usage.outputTokens !== undefined) sanitized.outputTokens = usage.outputTokens;
  if (usage.totalTokens !== undefined) sanitized.totalTokens = usage.totalTokens;
  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

function findUndefinedPath(value: unknown, path: string): string | null {
  if (value === undefined) return path;
  if (value === null || typeof value !== "object") return null;
  for (const [key, child] of Object.entries(value)) {
    const childPath = findUndefinedPath(child, path ? `${path}.${key}` : key);
    if (childPath) return childPath;
  }
  return null;
}

function sanitizeSource(source: ResearchSource): ResearchSource {
  const sanitized: ResearchSource = { id: source.id, title: source.title, url: source.url, domain: source.domain, snippet: source.snippet, retrievedAt: source.retrievedAt };
  if (source.publishedAt !== undefined) sanitized.publishedAt = source.publishedAt;
  return sanitized;
}

function sanitizeImage(image: WebImage): WebImage {
  const sanitized: WebImage = { id: image.id, title: image.title, url: image.url, sourceUrl: image.sourceUrl, alt: image.alt };
  if (image.attribution !== undefined) sanitized.attribution = image.attribution;
  return sanitized;
}

export async function listMessages(uid: string, conversationId: string) {
  const { database } = getFirebaseServices();
  const snapshot = await get(ref(database, `messages/${uid}/${conversationId}`));
  if (!snapshot.exists()) return [];
  return Object.entries(snapshot.val() as Record<string, Omit<ChatMessage, "id">>).map(([id, value]) => ({ id, ...value })).sort((a, b) => a.createdAt - b.createdAt);
}

export async function saveMessage(uid: string, conversationId: string, message: Pick<ChatMessage, "role" | "content"> & Partial<Pick<ChatMessage, "provider" | "model" | "usage" | "attachments" | "sources" | "images">>) {
  const { database } = getFirebaseServices();
  const messageRef = push(ref(database, `messages/${uid}/${conversationId}`));
  const savedMessage: ChatMessage = { id: messageRef.key || "", role: message.role as MessageRole, content: message.content, attachments: (message.attachments || []).map(sanitizeAttachment), createdAt: Date.now() };
  if (message.sources !== undefined) savedMessage.sources = message.sources.map(sanitizeSource);
  if (message.images !== undefined) savedMessage.images = message.images.map(sanitizeImage);
  if (message.provider) savedMessage.provider = message.provider;
  if (message.model) savedMessage.model = message.model;
  const usage = sanitizeUsage(message.usage);
  if (usage) savedMessage.usage = usage;
  const payload = { ...savedMessage, createdAt: serverTimestamp() };
  if (process.env.NODE_ENV !== "production") {
    const undefinedPath = findUndefinedPath(payload, `messages/${uid}/${conversationId}/${messageRef.key || ""}`);
    if (undefinedPath) throw new Error(`Invalid chat message payload: ${undefinedPath} is undefined.`);
  }
  await update(messageRef, payload);
  return savedMessage;
}
