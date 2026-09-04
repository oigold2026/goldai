import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";

export function getFirebaseAdmin() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
  if (!projectId || !clientEmail || !privateKey || !databaseURL) throw new Error("Firebase Admin configuration is incomplete.");
  const app = getApps().length ? getApp() : initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), databaseURL });
  return { auth: getAuth(app), database: getDatabase(app) };
}
