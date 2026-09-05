import { get, ref } from "firebase/database";
import { getFirebaseServices } from "./firebase";
import type { UserProfile } from "../types/user";

export async function getUserProfile(uid: string) {
  const { database } = getFirebaseServices();
  const snapshot = await get(ref(database, `users/${uid}`));
  return snapshot.exists() ? snapshot.val() as UserProfile : null;
}

export async function updateUserProfile(uid: string, profile: Partial<UserProfile>) {
  const safeProfile: Partial<UserProfile> = {
    name: profile.name,
    photoURL: profile.photoURL,
    country: profile.country,
    userGroup: profile.userGroup,
    preferredLanguage: profile.preferredLanguage,
    educationLevel: profile.educationLevel,
    classOrYear: profile.classOrYear,
    institution: profile.institution,
    programme: profile.programme,
    subjects: profile.subjects,
    interests: profile.interests,
    researchType: profile.researchType,
    bio: profile.bio,
    onboardingCompleted: profile.onboardingCompleted,
  };
  Object.keys(safeProfile).forEach((key) => safeProfile[key as keyof UserProfile] === undefined && delete safeProfile[key as keyof UserProfile]);
  const token = await getFirebaseServices().auth.currentUser?.getIdToken();
  if (!token) throw new Error("You must be logged in to update your profile.");
  const response = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(safeProfile) });
  if (!response.ok) throw new Error("Unable to update your profile right now.");
}

export async function createProfileIfMissing(uid: string, profile: Pick<UserProfile, "name" | "email">) {
  const existing = await getUserProfile(uid);
  if (existing) return existing;
  const token = await getFirebaseServices().auth.currentUser?.getIdToken();
  if (!token) throw new Error("You must be logged in to create your profile.");
  const response = await fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(profile) });
  if (!response.ok) throw new Error("Unable to create your profile right now.");
  const data = await response.json() as { profile: UserProfile };
  return data.profile;
}

export function getProfileErrorMessage(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  if (code.includes("permission-denied")) return "We couldn't update your profile. Please check your account permissions.";
  if (code.includes("network")) return "We couldn't reach Gold AI. Please check your connection and try again.";
  if (code.includes("configuration") || code.includes("api-key")) return "Profile services are not configured yet. Add the Firebase environment variables and try again.";
  return "We couldn't update your profile. Please check your connection and try again.";
}
