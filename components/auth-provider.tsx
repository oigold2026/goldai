"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getAuthErrorMessage, loginUser, logoutUser, registerUser, requestPasswordReset } from "../lib/auth";
import { getFirebaseServices } from "../lib/firebase";
import { GoldAILogoLoader } from "./gold-ai-ui";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  error: string | null;
  signUp: (name: string, email: string, password: string) => Promise<User>;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const { auth } = getFirebaseServices();
      return onAuthStateChanged(auth, (nextUser) => {
        setUser(nextUser);
        setLoading(false);
      }, () => {
        setError("Authentication could not be restored. Please refresh and try again.");
        setLoading(false);
      });
    } catch (authError) {
      queueMicrotask(() => {
        setError(getAuthErrorMessage(authError));
        setLoading(false);
      });
      return undefined;
    }
  }, []);

  async function signUp(name: string, email: string, password: string) {
    try {
      setError(null);
      const newUser = await registerUser(name, email, password);
      const token = await newUser.getIdToken();
      await fetch("/api/credits", { headers: { Authorization: `Bearer ${token}` } }).catch(() => undefined);
      return newUser;
    } catch (authError) {
      const message = getAuthErrorMessage(authError);
      setError(message);
      throw new Error(message);
    }
  }

  async function login(email: string, password: string) {
    try {
      setError(null);
      return await loginUser(email, password);
    } catch (authError) {
      const message = getAuthErrorMessage(authError);
      setError(message);
      throw new Error(message);
    }
  }

  async function logout() {
    try {
      setError(null);
      await logoutUser();
    } catch (authError) {
      const message = getAuthErrorMessage(authError);
      setError(message);
      throw new Error(message);
    }
  }

  async function resetPassword(email: string) {
    try {
      setError(null);
      await requestPasswordReset(email);
    } catch (authError) {
      const message = getAuthErrorMessage(authError);
      setError(message);
      throw new Error(message);
    }
  }

  if (loading) {
    return <main className="auth-loading"><GoldAILogoLoader size="lg" label="Checking your account..." /></main>;
  }

  return <AuthContext.Provider value={{ user, loading, error, signUp, login, logout, resetPassword }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, router, user]);

  if (loading || !user) return <main className="auth-loading"><GoldAILogoLoader size="lg" label="Opening your space..." /></main>;
  return <>{children}</>;
}
