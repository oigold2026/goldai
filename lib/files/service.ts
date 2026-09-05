import { randomUUID } from "node:crypto";
import { getFirebaseAdmin } from "../firebase-admin";
import type { UserFile } from "../../types/files";

export async function listUserFiles(uid: string) {
  const snapshot = await getFirebaseAdmin().database.ref(`userFiles/${uid}`).limitToLast(100).once("value");
  return Object.values((snapshot.val() || {}) as Record<string, UserFile>).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function saveUserFile(uid: string, input: Omit<UserFile, "id" | "userId" | "createdAt" | "updatedAt">) {
  const timestamp = Date.now(); const file: UserFile = { ...input, id: randomUUID(), userId: uid, createdAt: timestamp, updatedAt: timestamp };
  await getFirebaseAdmin().database.ref(`userFiles/${uid}/${file.id}`).set(file);
  return file;
}

export async function getUserFile(uid: string, id: string) {
  const snapshot = await getFirebaseAdmin().database.ref(`userFiles/${uid}/${id}`).once("value");
  return snapshot.val() as UserFile | null;
}

export async function deleteUserFile(uid: string, id: string) {
  await getFirebaseAdmin().database.ref(`userFiles/${uid}/${id}`).remove();
}
