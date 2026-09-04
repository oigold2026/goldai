import type { UserProfile } from "../../types/user";
import { getFirebaseAdmin } from "../firebase-admin";

export async function verifyFirebaseToken(idToken: string) {
  const decodedToken = await getFirebaseAdmin().auth.verifyIdToken(idToken);
  return decodedToken.uid;
}

export async function loadAIProfile(uid: string, idToken: string) {
  const databaseUrl = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
  if (!databaseUrl) return null;
  const response = await fetch(`${databaseUrl.replace(/\/$/, "")}/users/${encodeURIComponent(uid)}.json?access_token=${encodeURIComponent(idToken)}`, { cache: "no-store" });
  if (!response.ok) return null;
  return await response.json() as UserProfile | null;
}
