import { randomUUID } from "node:crypto";
import { getFirebaseAdmin } from "../firebase-admin";
import type { ResearchSession, ResearchSource, ResearchStatus, ResearchType } from "../../types/research";

function titleFromQuestion(question: string) {
  const words = question.trim().replace(/[.!?]+$/, "").split(/\s+/).slice(0, 8).join(" ");
  return words.length > 54 ? `${words.slice(0, 54).trim()}...` : words || "New research";
}

export async function createResearchSession(uid: string, question: string, type: ResearchType) {
  const { database } = getFirebaseAdmin();
  const id = randomUUID();
  const now = Date.now();
  const session: ResearchSession = { id, userId: uid, title: titleFromQuestion(question), question, type, status: "researching", sources: [], createdAt: now, updatedAt: now };
  await database.ref(`researchSessions/${uid}/${id}`).set(session);
  return session;
}

export async function updateResearchSession(uid: string, sessionId: string, update: Partial<Pick<ResearchSession, "status" | "result" | "sources">>) {
  const { database } = getFirebaseAdmin();
  await database.ref(`researchSessions/${uid}/${sessionId}`).update({ ...update, updatedAt: Date.now() });
}

export async function getResearchSession(uid: string, sessionId: string) {
  const { database } = getFirebaseAdmin();
  const snapshot = await database.ref(`researchSessions/${uid}/${sessionId}`).once("value");
  return snapshot.val() as ResearchSession | null;
}

export async function listResearchSessions(uid: string) {
  const { database } = getFirebaseAdmin();
  const snapshot = await database.ref(`researchSessions/${uid}`).limitToLast(30).once("value");
  return Object.values((snapshot.val() || {}) as Record<string, ResearchSession>).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deleteResearchSession(uid: string, sessionId: string) {
  const { database } = getFirebaseAdmin();
  await database.ref(`researchSessions/${uid}/${sessionId}`).remove();
}

export function researchUpdate(status: ResearchStatus, result: string | undefined, sources: ResearchSource[]) {
  return { status, result, sources };
}
