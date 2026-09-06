import { randomUUID } from "node:crypto";
import { getFirebaseAdmin } from "../firebase-admin";
import type { StudyAction, StudyActivity, StudyPlan } from "../../types/study";

const DAY_MS = 86_400_000;

function cleanRecord(record: Record<string, unknown>) {
  for (const key of Object.keys(record)) {
    if (record[key] === undefined) delete record[key];
  }
  return record;
}

export async function recordStudyActivity(uid: string, activity: Omit<StudyActivity, "id" | "userId" | "createdAt">) {
  const { database } = getFirebaseAdmin();
  const id = randomUUID();
  const record: StudyActivity = {
    ...cleanRecord({ ...activity }) as Omit<StudyActivity, "id" | "userId" | "createdAt">,
    id,
    userId: uid,
    createdAt: Date.now(),
  };
  await database.ref(`studyHistory/${uid}/${id}`).set(record);
  return record;
}

export async function listStudyActivity(uid: string) {
  const { database } = getFirebaseAdmin();
  const snapshot = await database.ref(`studyHistory/${uid}`).limitToLast(30).once("value");
  return Object.values((snapshot.val() || {}) as Record<string, StudyActivity>).sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Recent studies sorted by last access time (most recently opened first).
 * Falls back to createdAt when lastAccessedAt is absent so older records
 * still appear. Lightweight: limited to the latest N per user.
 */
export async function listRecentStudies(uid: string, limit = 10): Promise<StudyActivity[]> {
  const { database } = getFirebaseAdmin();
  const snapshot = await database.ref(`studyHistory/${uid}`).limitToLast(50).once("value");
  const records = Object.values((snapshot.val() || {}) as Record<string, StudyActivity>);
  return records
    .filter((record) => record.action !== "plan")
    .sort((a, b) => (b.lastAccessedAt ?? b.createdAt) - (a.lastAccessedAt ?? a.createdAt))
    .slice(0, limit);
}

/** Remove a single recent-study record. Does NOT touch the Chat conversation. */
export async function deleteStudyActivity(uid: string, studyId: string) {
  const { database } = getFirebaseAdmin();
  await database.ref(`studyHistory/${uid}/${studyId}`).remove();
}

/** Update lastAccessedAt so a reopened study moves to the top of the list. */
export async function touchStudyActivity(uid: string, studyId: string) {
  const { database } = getFirebaseAdmin();
  await database.ref(`studyHistory/${uid}/${studyId}`).update({ lastAccessedAt: Date.now() });
}

export function isStudyAction(value: string): value is StudyAction {
  return ["explain", "practice", "quiz", "summarize", "plan", "check"].includes(value);
}

/**
 * Create a Study Plan. `startDate` is the server's canonical time so progress
 * is consistent regardless of the learner's device timezone. `endDate` is
 * derived from startDate + durationDays — no duplicate date fields.
 */
export async function recordStudyPlan(uid: string, input: { title: string; subject?: string; topic?: string; goal?: string; durationDays: number; conversationId?: string; educationLevel?: string; country?: string; curriculumId?: string; curriculumLabel?: string }) {
  const { database } = getFirebaseAdmin();
  const id = randomUUID();
  const now = Date.now();
  // Strip undefined optional fields before the write — Firebase rejects them.
  const plan = cleanRecord({
    ...input,
    id,
    userId: uid,
    startDate: now,
    endDate: now + input.durationDays * DAY_MS,
    status: "active" as const,
    createdAt: now,
    updatedAt: now,
  }) as StudyPlan;
  await database.ref(`studyPlans/${uid}/${id}`).set(plan);
  return plan;
}

export async function listStudyPlans(uid: string) {
  const { database } = getFirebaseAdmin();
  const snapshot = await database.ref(`studyPlans/${uid}`).limitToLast(50).once("value");
  return Object.values((snapshot.val() || {}) as Record<string, StudyPlan>).sort((a, b) => b.createdAt - a.createdAt);
}

export async function completeStudyPlan(uid: string, planId: string) {
  const { database } = getFirebaseAdmin();
  const reference = database.ref(`studyPlans/${uid}/${planId}`);
  const snapshot = await reference.once("value");
  if (!snapshot.exists()) return null;
  const updatedAt = Date.now();
  await reference.update({ status: "completed", updatedAt });
  return { ...(snapshot.val() as StudyPlan), status: "completed" as const, updatedAt };
}
