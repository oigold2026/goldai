"use client";

import {
  ArrowUp,
  BookOpen,
  Brain,
  CircleUserRound,
  FileText,
  FlaskConical,
  Home,
  Lightbulb,
  Menu,
  Mic,
  Moon,
  PenLine,
  Search,
  Sparkles,
  Sun,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getDisplayName } from "../lib/display-name";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "./auth-provider";
import { useProfile } from "./profile-provider";

export const quickActions: { label: string; description: string; icon: LucideIcon }[] = [
  { label: "Learn", description: "Understand a topic", icon: BookOpen },
  { label: "Research", description: "Explore a question", icon: Search },
  { label: "Notes", description: "Organize your ideas", icon: FileText },
  { label: "Practice", description: "Build your confidence", icon: Brain },
  { label: "Write", description: "Shape your thoughts", icon: PenLine },
  { label: "Create", description: "Bring an idea to life", icon: Sparkles },
];

const navigation = [
  { label: "Home", href: "/", icon: Home },
  { label: "Chat", href: "/chat", icon: Sparkles },
  { label: "Study", href: "/study", icon: BookOpen },
  { label: "Create", href: "/create", icon: Lightbulb },
  { label: "Profile", href: "/profile", icon: UserRound },
];

export function GoldAILogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link className={`brand ${compact ? "brand-compact" : ""}`} href="/" aria-label="Gold AI home">
      <span className="brand-mark"><Image src="/images/logo1.png" alt="" width={compact ? 29 : 32} height={compact ? 29 : 32} priority /></span>
      <span className="brand-name">GOLD <strong>AI</strong></span>
    </Link>
  );
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("gold-ai-theme");
    const nextTheme = savedTheme === "dark" ? "dark" : "light";
    const frame = window.requestAnimationFrame(() => {
      setTheme(nextTheme);
      document.documentElement.dataset.theme = nextTheme;
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("gold-ai-theme", nextTheme);
  }

  return (
    <button className="icon-button" type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`} title="Change theme">
      {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}

export function AppHeader({ onMenu }: { onMenu: () => void }) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const name = getDisplayName(user, profile, "Guest");
  const initial = name.charAt(0).toUpperCase();
  return (
    <header className="app-header">
      <button className="icon-button mobile-menu" type="button" onClick={onMenu} aria-label="Open navigation">
        <Menu size={20} />
      </button>
      <GoldAILogo compact />
      <div className="header-actions">
        <div className="header-credits"><Sparkles size={15} /> <span>10 credits</span></div>
        <ThemeToggle />
        {user ? <a className="avatar" href="/profile" aria-label="Open profile">{initial}</a> : <Link className="login-link" href="/login">Log in</Link>}
      </div>
    </header>
  );
}

export function DesktopSidebar() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const name = getDisplayName(user, profile, "Guest");
  const initial = name.charAt(0).toUpperCase();
  return (
    <aside className="desktop-sidebar">
      <GoldAILogo />
      <nav className="side-nav" aria-label="Main navigation">
        {navigation.map(({ label, href, icon: Icon }, index) => (
          <a className={`nav-link ${index === 0 ? "active" : ""}`} href={href} key={label}>
            <Icon size={19} /> <span>{label}</span>
          </a>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-note"><Sparkles size={16} /><span>Small steps.<br />Bright ideas.</span></div>
        {user ? <a className="profile-mini" href="/profile"><span className="avatar">{initial}</span><span><strong>{name}</strong><small>Personal space</small></span><ChevronRight /></a> : <a className="profile-mini" href="/login"><span className="avatar">?</span><span><strong>Log in</strong><small>Open your space</small></span><ChevronRight /></a>}
      </div>
    </aside>
  );
}

function ChevronRight() {
  return <span className="chevron" aria-hidden="true">›</span>;
}

export function MobileBottomNav() {
  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {navigation.map(({ label, href, icon: Icon }, index) => (
        <a className={`mobile-nav-link ${index === 0 ? "active" : ""}`} href={href} key={label}>
          <Icon size={19} /><span>{label}</span>
        </a>
      ))}
    </nav>
  );
}

export function GoldAILogoLoader({ size = "md", label = "Gold AI is thinking..." }: { size?: "sm" | "md" | "lg"; label?: string }) {
  return (
    <div className={`loader-wrap loader-${size}`} role="status" aria-live="polite">
      <div className="gold-logo-loader" aria-hidden="true"><Image src="/images/logo1.png" alt="" width={58} height={58} priority /></div>
      {label && <span>{label}</span>}
    </div>
  );
}

export function AskGoldAI() {
  const [value, setValue] = useState("");
  const router = useRouter();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = value.trim();
    if (question) router.push(`/chat?prompt=${encodeURIComponent(question)}`);
  }

  return (
    <div className="ask-area">
      <form className="ask-box" onSubmit={submit}>
        <textarea value={value} onChange={(event) => setValue(event.target.value)} placeholder="Ask Gold AI anything..." aria-label="Ask Gold AI anything" rows={1} />
        <div className="ask-controls">
          <button className="ask-tool" type="button" aria-label="Use voice input" title="Voice input is coming soon"><Mic size={19} /></button>
          <button className="send-button" type="submit" disabled={!value.trim()} aria-label="Send question" title="Send question"><ArrowUp size={19} /></button>
        </div>
      </form>
      <p className="ask-hint">Ask naturally. Gold AI will help you find your way.</p>
    </div>
  );
}

export function QuickActionCard({ label, description, icon: Icon }: (typeof quickActions)[number]) {
  return <a className="quick-action" href={label === "Create" ? "/create" : "/chat"}><span className="quick-icon"><Icon size={20} /></span><span><strong>{label}</strong><small>{description}</small></span><span className="quick-arrow">↗</span></a>;
}

export function CreditCard() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    void user.getIdToken().then((token) => fetch("/api/credits", { headers: { Authorization: `Bearer ${token}` } })).then((response) => response.ok ? response.json() as Promise<{ account?: { balance: number } }> : null).then((data) => { if (!cancelled) setBalance(data?.account?.balance ?? null); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [user]);
  return <section className="credit-card"><div><span className="section-kicker"><Sparkles size={14} /> Your credits</span><strong className="credit-number">{user ? (balance === null ? "-" : balance) : "-"}</strong><span className="credit-caption">{user ? "available now" : "Log in to view balance"}</span></div><a className="text-link" href={user ? "/credits" : "/login"}>{user ? "View details" : "Log in"} <span>→</span></a></section>;
}

export function ContinueLearningCard() {
  const { user } = useAuth();
  const [activity, setActivity] = useState<{ subject?: string; topic?: string; createdAt?: number } | null>(null);
  useEffect(() => {
    if (!user) return undefined;
    const timeoutId = window.setTimeout(() => { void user.getIdToken().then((token) => fetch("/api/study", { headers: { Authorization: `Bearer ${token}` } })).then((response) => response.ok ? response.json() as Promise<{ activities?: Array<{ subject?: string; topic?: string; createdAt?: number }> }> : null).then((data) => setActivity(data?.activities?.[0] || null)).catch(() => undefined); }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [user]);
  const subject = activity?.subject || "Start a new subject";
  const topic = activity?.topic || "Choose a Study tool to begin";
  return <section className="learning-card"><div className="learning-heading"><div><span className="section-kicker">Continue learning</span><h2>{subject}</h2><p>{topic}</p></div><span className="progress-value">{activity ? "Active" : "Start"}</span></div><div className="progress-track"><span style={{ width: activity ? "60%" : "8%" }} /></div><div className="learning-footer"><span>{activity?.createdAt ? `Last activity ${new Date(activity.createdAt).toLocaleDateString()}` : "Your next lesson starts here"}</span><a href="/study">Keep going <span>→</span></a></div></section>;
}

export function EmptyState({ title = "Nothing here yet.", message = "Your learning activity will appear here." }: { title?: string; message?: string }) {
  return <div className="empty-state"><span className="empty-icon"><FlaskConical size={22} /></span><h2>{title}</h2><p>{message}</p></div>;
}

export function ErrorState() {
  return <div className="error-state"><span><X size={18} /></span><div><strong>Something went wrong.</strong><p>Please try again.</p></div><button className="text-link" type="button">Retry</button></div>;
}

export function ProfileIcon() {
  return <CircleUserRound size={20} />;
}
