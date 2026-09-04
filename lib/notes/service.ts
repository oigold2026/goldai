import { randomUUID } from "node:crypto";
import { getFirebaseAdmin } from "../firebase-admin";
import type { Note } from "../../types/notes";

export async function listNotes(uid: string) {
  const { database } = getFirebaseAdmin();
  const snapshot = await database.ref(`notes/${uid}`).limitToLast(100).once("value");
  return Object.values((snapshot.val() || {}) as Record<string, Note>).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getNote(uid: string, id: string) {
  const { database } = getFirebaseAdmin();
  const snapshot = await database.ref(`notes/${uid}/${id}`).once("value");
  return snapshot.val() as Note | null;
}

export async function saveNote(uid: string, input: { title: string; content: string }) {
  const { database } = getFirebaseAdmin();
  const now = Date.now();
  const id = randomUUID();
  const note: Note = { id, userId: uid, title: input.title, content: input.content, createdAt: now, updatedAt: now };
  await database.ref(`notes/${uid}/${id}`).set(note);
  return note;
}

export async function updateNote(uid: string, id: string, input: { title: string; content: string }) {
  const { database } = getFirebaseAdmin();
  const note = await getNote(uid, id);
  if (!note) return null;
  const updated = { ...note, title: input.title, content: input.content, updatedAt: Date.now() };
  await database.ref(`notes/${uid}/${id}`).update({ title: updated.title, content: updated.content, updatedAt: updated.updatedAt });
  return updated;
}

export async function deleteNote(uid: string, id: string) {
  const { database } = getFirebaseAdmin();
  await database.ref(`notes/${uid}/${id}`).remove();
}
