import type { User } from "firebase/auth";
import type { UserProfile } from "../types/user";

export function getDisplayName(user: User | null, profile?: UserProfile | null, fallback = "there") {
  return profile?.name?.trim() || user?.displayName?.trim() || user?.email?.split("@")[0] || fallback;
}
