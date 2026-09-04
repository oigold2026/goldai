import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { ref, serverTimestamp, set } from "firebase/database";
import { getFirebaseServices } from "./firebase";

export async function registerUser(name: string, email: string, password: string) {
  const { auth, database } = getFirebaseServices();
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName: name });
  await set(ref(database, `users/${credential.user.uid}`), {
    uid: credential.user.uid,
    name,
    email: credential.user.email,
    onboardingCompleted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return credential.user;
}

export async function loginUser(email: string, password: string) {
  const { auth } = getFirebaseServices();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function logoutUser() {
  const { auth } = getFirebaseServices();
  await signOut(auth);
}

export async function requestPasswordReset(email: string) {
  const { auth } = getFirebaseServices();
  await sendPasswordResetEmail(auth, email);
}

export function getUserName(user: User | null) {
  return user?.displayName?.trim() || user?.email?.split("@")[0] || "there";
}

export function getAuthErrorMessage(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  if (code.includes("email-already-in-use")) return "An account with this email already exists.";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) return "The email or password is incorrect.";
  if (code.includes("weak-password")) return "Please choose a stronger password.";
  if (code.includes("invalid-email")) return "Please enter a valid email address.";
  if (code.includes("too-many-requests")) return "Too many attempts. Please try again later.";
  if (code.includes("configuration") || code.includes("api-key")) return "Authentication is not configured yet. Add the Firebase environment variables and try again.";
  return "Sorry, Gold AI could not complete that request. Please try again.";
}
