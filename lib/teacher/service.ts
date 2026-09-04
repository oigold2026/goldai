import { randomUUID } from "node:crypto";
import { getFirebaseAdmin } from "../firebase-admin";
import type { TeacherMaterial, TeacherToolType } from "../../types/teacher";

export async function listTeacherMaterials(uid: string) {
  const { database } = getFirebaseAdmin();
  const snapshot = await database.ref(`teacherTools/${uid}`).limitToLast(50).once("value");
  return Object.values((snapshot.val() || {}) as Record<string, TeacherMaterial>).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function saveTeacherMaterial(uid: string, input: Omit<TeacherMaterial, "id" | "userId" | "createdAt" | "updatedAt">) {
  const { database } = getFirebaseAdmin();
  const now = Date.now();
  const material: TeacherMaterial = { ...input, id: randomUUID(), userId: uid, createdAt: now, updatedAt: now };
  await database.ref(`teacherTools/${uid}/${material.id}`).set(material);
  return material;
}

export async function updateTeacherMaterial(uid: string, id: string, content: string) {
  const { database } = getFirebaseAdmin();
  const reference = database.ref(`teacherTools/${uid}/${id}`);
  const snapshot = await reference.once("value");
  if (!snapshot.exists()) return null;
  const updatedAt = Date.now();
  await reference.update({ content, updatedAt });
  return { ...(snapshot.val() as TeacherMaterial), content, updatedAt };
}

export async function deleteTeacherMaterial(uid: string, id: string) {
  await getFirebaseAdmin().database.ref(`teacherTools/${uid}/${id}`).remove();
}

export function isTeacherToolType(value: string): value is TeacherToolType {
  return ["lesson_plan", "teaching_material", "questions", "answer_key", "assessment", "rubric", "classroom_activity", "explain_students"].includes(value);
}
