import { get, push, ref, serverTimestamp, update } from "firebase/database";
import { getFirebaseServices } from "../firebase";
import type { ChatMessage, MessageRole } from "../../types/chat";

export async function listMessages(uid: string, conversationId: string) {
  const { database } = getFirebaseServices();
  const snapshot = await get(ref(database, `messages/${uid}/${conversationId}`));
  if (!snapshot.exists()) return [];
  return Object.entries(snapshot.val() as Record<string, Omit<ChatMessage, "id">>).map(([id, value]) => ({ id, ...value })).sort((a, b) => a.createdAt - b.createdAt);
}

export async function saveMessage(uid: string, conversationId: string, message: Pick<ChatMessage, "role" | "content"> & Partial<Pick<ChatMessage, "provider" | "model" | "usage">>) {
  const { database } = getFirebaseServices();
  const messageRef = push(ref(database, `messages/${uid}/${conversationId}`));
  const savedMessage: ChatMessage = { id: messageRef.key || "", role: message.role as MessageRole, content: message.content, createdAt: Date.now() };
  if (message.provider) savedMessage.provider = message.provider;
  if (message.model) savedMessage.model = message.model;
  if (message.usage) savedMessage.usage = message.usage;
  await update(messageRef, { ...savedMessage, createdAt: serverTimestamp() });
  return savedMessage;
}
