import { get, push, ref, remove, serverTimestamp, update } from "firebase/database";
import { getFirebaseServices } from "../firebase";
import type { Conversation } from "../../types/chat";

function now() {
  return Date.now();
}

export async function listConversations(uid: string) {
  const { database } = getFirebaseServices();
  const snapshot = await get(ref(database, `conversations/${uid}`));
  if (!snapshot.exists()) return [];
  return Object.entries(snapshot.val() as Record<string, Omit<Conversation, "id">>).map(([id, value]) => ({ id, ...value })).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function createConversation(uid: string, title = "New conversation") {
  const { database } = getFirebaseServices();
  const conversationRef = push(ref(database, `conversations/${uid}`));
  const timestamp = now();
  const conversation = { id: conversationRef.key || "", title, createdAt: timestamp, updatedAt: timestamp };
  await update(conversationRef, { ...conversation, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return conversation;
}

export async function updateConversation(uid: string, conversationId: string, title: string) {
  const { database } = getFirebaseServices();
  await update(ref(database, `conversations/${uid}/${conversationId}`), { title, updatedAt: serverTimestamp() });
}

export async function deleteConversation(uid: string, conversationId: string) {
  const { database } = getFirebaseServices();
  await Promise.all([
    remove(ref(database, `conversations/${uid}/${conversationId}`)),
    remove(ref(database, `messages/${uid}/${conversationId}`)),
  ]);
}
