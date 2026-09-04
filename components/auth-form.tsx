"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { getAuthErrorMessage } from "../lib/auth";
import { useAuth } from "./auth-provider";
import { GoldAILogo, GoldAILogoLoader, ThemeToggle } from "./gold-ai-ui";

const signUpSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(80, "Please use a shorter name."),
  email: z.string().trim().email("Please enter a valid email address."),
  password: z.string().min(6, "Please choose a password with at least 6 characters."),
  confirmPassword: z.string(),
}).refine((values) => values.password === values.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match." });

const loginSchema = z.object({ email: z.string().trim().email("Please enter a valid email address."), password: z.string().min(1, "Please enter your password.") });
const resetSchema = z.object({ email: z.string().trim().email("Please enter a valid email address.") });

type AuthMode = "login" | "signup" | "reset";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const { login, signUp, resetPassword, error: authError } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setFieldError(null);
    const result = mode === "signup"
      ? signUpSchema.safeParse({ name, email, password, confirmPassword })
      : mode === "reset" ? resetSchema.safeParse({ email }) : loginSchema.safeParse({ email, password });
    if (!result.success) {
      setFieldError(result.error.issues[0]?.message || "Please check your details.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "signup") await signUp(name.trim(), email.trim(), password);
      else if (mode === "reset") {
        await resetPassword(email.trim());
        setMessage("If an account uses that email, a reset link is on its way.");
        setSubmitting(false);
        return;
      } else await login(email.trim(), password);
      router.replace("/");
    } catch (error) {
      setFieldError(error instanceof Error ? error.message : getAuthErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  const title = mode === "signup" ? "Create your account" : mode === "reset" ? "Reset your password" : "Welcome back";
  return (
    <main className="auth-page">
      <div className="auth-topbar"><GoldAILogo compact /><ThemeToggle /></div>
      <section className="auth-panel" aria-labelledby="auth-title">
        <span className="eyebrow">Ask naturally. Learn intelligently.</span>
        <h1 id="auth-title">{title}</h1>
        <p className="auth-intro">{mode === "signup" ? "A simple space for your questions, ideas, and learning." : mode === "reset" ? "We will help you get back into your Gold AI space." : "Pick up where your ideas left off."}</p>
        {authError && <p className="form-error" role="alert">{authError}</p>}
        {fieldError && <p className="form-error" role="alert">{fieldError}</p>}
        {message && <p className="form-success" role="status">{message}</p>}
        <form className="auth-form" onSubmit={submit} noValidate>
          {mode === "signup" && <label>Name<input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} /></label>}
          <label>Email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          {mode !== "reset" && <label>Password<input type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} /></label>}
          {mode === "signup" && <label>Confirm password<input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>}
          <button className="auth-submit" type="submit" disabled={submitting}>{submitting ? <GoldAILogoLoader size="sm" label={mode === "reset" ? "Sending..." : mode === "signup" ? "Creating account..." : "Logging in..."} /> : mode === "signup" ? "Create Account" : mode === "reset" ? "Send Reset Link" : "Log In"}</button>
        </form>
        <div className="auth-links">
          {mode === "login" && <Link href="/reset-password">Forgot password?</Link>}
          {mode === "signup" && <span>Already have an account? <Link href="/login">Log in</Link></span>}
          {mode === "login" && <span>Don&apos;t have an account? <Link href="/signup">Create account</Link></span>}
          {mode === "reset" && <span>Remember your password? <Link href="/login">Log in</Link></span>}
        </div>
      </section>
    </main>
  );
}
