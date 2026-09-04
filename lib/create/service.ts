import { randomUUID } from "node:crypto";
import { getFirebaseAdmin } from "../firebase-admin";
import type { Creation } from "../../types/create";

function titleFromPrompt(prompt: string, type: Creation["type"]) {
  const words = prompt.trim().replace(/[.!?]+$/, "").split(/\s+/).slice(0, 8).join(" ");
  return words.length > 58 ? `${words.slice(0, 58).trim()}...` : words || `${type} creation`;
}

export async function saveCreation(uid: string, input: Omit<Creation, "id" | "userId" | "title" | "createdAt" | "updatedAt">) {
  const { database } = getFirebaseAdmin();
  const id = randomUUID();
  const now = Date.now();
  const creation: Creation = { ...input, id, userId: uid, title: titleFromPrompt(input.prompt, input.type), createdAt: now, updatedAt: now };
  await database.ref(`creations/${uid}/${id}`).set(creation);
  return creation;
}

export async function listCreations(uid: string) {
  const { database } = getFirebaseAdmin();
  const snapshot = await database.ref(`creations/${uid}`).limitToLast(30).once("value");
  return Object.values((snapshot.val() || {}) as Record<string, Creation>).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getCreation(uid: string, id: string) {
  const { database } = getFirebaseAdmin();
  const snapshot = await database.ref(`creations/${uid}/${id}`).once("value");
  return snapshot.val() as Creation | null;
}

export async function updateCreation(uid: string, id: string, content: string) {
  const { database } = getFirebaseAdmin();
  await database.ref(`creations/${uid}/${id}`).update({ content, updatedAt: Date.now() });
}

export async function deleteCreation(uid: string, id: string) {
  const { database } = getFirebaseAdmin();
  await database.ref(`creations/${uid}/${id}`).remove();
}
