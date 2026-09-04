import { randomUUID } from "node:crypto";
import { getFirebaseAdmin } from "../firebase-admin";
import type { StudyAction, StudyActivity } from "../../types/study";

export async function recordStudyActivity(uid: string, activity: Omit<StudyActivity, "id" | "userId" | "createdAt">) {
  const { database } = getFirebaseAdmin();
  const id = randomUUID();
  const record: StudyActivity = { ...activity, id, userId: uid, createdAt: Date.now() };
  await database.ref(`studyHistory/${uid}/${id}`).set(record);
  return record;
}

export async function listStudyActivity(uid: string) {
  const { database } = getFirebaseAdmin();
  const snapshot = await database.ref(`studyHistory/${uid}`).limitToLast(30).once("value");
  return Object.values((snapshot.val() || {}) as Record<string, StudyActivity>).sort((a, b) => b.createdAt - a.createdAt);
}

export function isStudyAction(value: string): value is StudyAction {
  return ["explain", "practice", "quiz", "summarize", "plan", "check"].includes(value);
}