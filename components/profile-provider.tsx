"use client";

import { useEffect, useState, createContext, useContext, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-provider";
import { getProfileErrorMessage, getUserProfile, updateUserProfile } from "../lib/profile";
import type { UserProfile } from "../types/user";
import { GoldAILogoLoader } from "./gold-ai-ui";

type ProfileContextValue = { profile: UserProfile | null; loading: boolean; error: string | null; saveProfile: (values: Partial<UserProfile>) => Promise<void>; refreshProfile: () => Promise<void> };
const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refreshProfile() {
    if (!user) { setProfile(null); setLoading(false); return; }
    setLoading(true);
    try { setError(null); setProfile(await getUserProfile(user.uid)); }
    catch (profileError) { setError(getProfileErrorMessage(profileError)); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (authLoading) return undefined;
    const frame = window.requestAnimationFrame(() => {
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      void getUserProfile(user.uid).then(setProfile).catch((profileError) => setError(getProfileErrorMessage(profileError))).finally(() => setLoading(false));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [authLoading, user]);

  async function saveProfile(values: Partial<UserProfile>) {
    if (!user) throw new Error("You must be logged in to update your profile.");
    try { setError(null); await updateUserProfile(user.uid, values); await refreshProfile(); }
    catch (profileError) { const message = getProfileErrorMessage(profileError); setError(message); throw new Error(message); }
  }

  if (authLoading || (user && loading)) return <main className="auth-loading"><GoldAILogoLoader size="lg" label="Loading your profile..." /></main>;
  return <ProfileContext.Provider value={{ profile, loading, error, saveProfile, refreshProfile }}>{children}</ProfileContext.Provider>;
}

export function useProfile() { const context = useContext(ProfileContext); if (!context) throw new Error("useProfile must be used inside ProfileProvider"); return context; }

export function ProfileRequiredRoute({ children }: { children: ReactNode }) {
  const { profile, loading } = useProfile();
  const router = useRouter();
  useEffect(() => { if (!loading && (!profile || !profile.onboardingCompleted)) router.replace("/onboarding"); }, [loading, profile, router]);
  if (loading || !profile || !profile.onboardingCompleted) return <main className="auth-loading"><GoldAILogoLoader size="lg" label="Preparing your space..." /></main>;
  return <>{children}</>;
}
