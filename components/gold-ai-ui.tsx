"use client";

import {
  ArrowLeft,
  ArrowUp,
  BookOpen,
  Building2,
  Brain,
  CircleUserRound,
  FileText,
  FlaskConical,
  GraduationCap,
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
import { usePathname } from "next/navigation";
import { getDisplayName } from "../lib/display-name";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "./auth-provider";
import { useProfile } from "./profile-provider";
import type { StudyActivity } from "../types/study";

export const quickActions: { label: string; description: string; icon: LucideIcon; href: string }[] = [
  { label: "Learn", description: "Understand a topic", icon: BookOpen, href: "/study" },
  { label: "Research", description: "Explore a question", icon: Search, href: "/research" },
  { label: "Notes", description: "Organize your ideas", icon: FileText, href: "/create/notes" },
  { label: "Practice", description: "Build your confidence", icon: Brain, href: "/study" },
  { label: "Write", description: "Shape your thoughts", icon: PenLine, href: "/create/write" },
  { label: "Create", description: "Bring an idea to life", icon: Sparkles, href: "/create" },
];

const navigation = [
  { label: "Home", href: "/", icon: Home },
  { label: "Chat", href: "/chat", icon: Sparkles },
  { label: "Study", href: "/study", icon: BookOpen },
  { label: "Research", href: "/research", icon: Search },
  { label: "Create", href: "/create", icon: Lightbulb },
  { label: "Teacher Tools", href: "/teacher", icon: GraduationCap },
  { label: "Organizations", href: "/organizations", icon: Building2 },
  { label: "Files", href: "/files", icon: FileText },
  { label: "Profile", href: "/profile", icon: UserRound },
];

const mobileBottomNavigation = navigation.filter(({ label }) => ["Home", "Chat", "Create", "Profile"].includes(label));
const mobileDrawerNavigation = navigation.filter(({ label }) => ["Study", "Research", "Teacher Tools", "Organizations", "Files"].includes(label));

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

export function AppHeader({ onMenu, showMenu = false, backToHome = false, backHref = "/" }: { onMenu: () => void; showMenu?: boolean; backToHome?: boolean; backHref?: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useProfile();
  const name = getDisplayName(user, profile, "Guest");
  const initial = name.charAt(0).toUpperCase();
  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push(backHref);
  }
  return (
    <header className="app-header">
      {backToHome && <button className="icon-button header-back" type="button" onClick={goBack} aria-label="Go back" title="Go back"><ArrowLeft size={19} /></button>}
      {showMenu && <button className="icon-button mobile-menu" type="button" onClick={onMenu} aria-label="Open more navigation" title="More">
        <Menu size={20} />
      </button>}
      <GoldAILogo compact />
      <div className="header-actions">
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
  const pathname = usePathname();
  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {mobileBottomNavigation.map(({ label, href, icon: Icon }) => (
        <a className={`mobile-nav-link ${pathname === href || (href !== "/" && pathname.startsWith(`${href}/`)) ? "active" : ""}`} href={href} key={label}>
          <Icon size={19} /><span>{label}</span>
        </a>
      ))}
    </nav>
  );
}

export function MobileSideDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  useEffect(() => {
    if (!open) return undefined;
    function handleKeyDown(event: KeyboardEvent) { if (event.key === "Escape") onClose(); }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);
  return <div className={`mobile-drawer-layer ${open ? "open" : ""}`} aria-hidden={!open}>{open && <button className="mobile-drawer-overlay" type="button" onClick={onClose} aria-label="Close navigation" />}{open && <aside className="mobile-drawer" aria-label="More navigation" aria-modal="true" role="dialog"><div className="mobile-drawer-header"><GoldAILogo /><button className="icon-button" type="button" onClick={onClose} aria-label="Close navigation"><X size={19} /></button></div><nav className="mobile-drawer-nav">{mobileDrawerNavigation.map(({ label, href, icon: Icon }) => <Link className={pathname === href || pathname.startsWith(`${href}/`) ? "active" : ""} href={href} key={label} onClick={onClose}><Icon size={19} /><span>{label}</span></Link>)}</nav></aside>}</div>;
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
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<{ lang: string; interimResults: boolean; continuous: boolean; onresult: ((event: Event & { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start: () => void; stop: () => void } | null>(null);
  const router = useRouter();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = value.trim();
    if (question) router.push(`/chat?prompt=${encodeURIComponent(question)}`);
  }

  function toggleVoiceInput() {
    if (listening) { recognitionRef.current?.stop(); return; }
    type RecognitionConstructor = new () => NonNullable<typeof recognitionRef.current>;
    const browserWindow = window as Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
    const Recognition = browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;
    if (!Recognition) { setVoiceError("Voice input isn't supported in this browser. You can still type your message."); return; }
    const recognition = new Recognition();
    recognition.lang = navigator.language || "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event) => { const transcript = Array.from(event.results).map((result) => result[0]?.transcript || "").join(""); setValue((current) => current ? `${current} ${transcript}`.trim() : transcript); };
    recognition.onerror = () => { setListening(false); setVoiceError("Microphone access or speech recognition failed. You can continue by typing."); };
    recognition.onend = () => { setListening(false); recognitionRef.current = null; };
    recognitionRef.current = recognition; setVoiceError(null); setListening(true); recognition.start();
  }

  useEffect(() => () => { recognitionRef.current?.stop(); }, [recognitionRef]);

  return (
    <div className="ask-area">
      <form className="ask-box" onSubmit={submit}>
        <textarea value={value} onChange={(event) => setValue(event.target.value)} placeholder="Ask Gold AI anything..." aria-label="Ask Gold AI anything" rows={1} />
        <div className="ask-controls">
          <button className={`ask-tool ${listening ? "voice-listening" : ""}`} type="button" onClick={toggleVoiceInput} aria-label={listening ? "Stop voice input" : "Start voice input"} title={listening ? "Stop listening" : "Start voice input"}><Mic size={19} /></button>
          <button className="send-button" type="submit" disabled={!value.trim()} aria-label="Send question" title="Send question"><ArrowUp size={19} /></button>
        </div>
      </form>
      <p className="ask-hint">{voiceError || "Ask naturally. Gold AI will help you find your way."}</p>
    </div>
  );
}

export function QuickActionCard({ label, description, icon: Icon, href }: (typeof quickActions)[number]) {
  return <Link className="quick-action" href={href}><span className="quick-icon"><Icon size={20} /></span><span><strong>{label}</strong><small>{description}</small></span><span className="quick-arrow">↗</span></Link>;
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

type LearningPreview = Pick<StudyActivity, "action" | "subject" | "topic" | "score" | "total" | "createdAt">;

function getProgress(activity: LearningPreview) {
  if (typeof activity.score !== "number" || typeof activity.total !== "number" || activity.total <= 0) return null;
  return Math.min(100, Math.max(0, Math.round((activity.score / activity.total) * 100)));
}

function getStudyKey(activity: LearningPreview) {
  return [activity.subject || "", activity.topic || "", activity.action].join("|").toLowerCase();
}

export function ContinueLearningCard() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<LearningPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      return undefined;
    }
    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      void user.getIdToken()
        .then((token) => fetch("/api/study", { headers: { Authorization: `Bearer ${token}` } }))
        .then((response) => response.ok ? response.json() as Promise<{ activities?: LearningPreview[] }> : null)
        .then((data) => {
          if (cancelled) return;
          const latestByStudy = new Map<string, LearningPreview>();
          for (const activity of data?.activities || []) {
            const key = getStudyKey(activity);
            const current = latestByStudy.get(key);
            if (!current || activity.createdAt > current.createdAt) latestByStudy.set(key, activity);
          }
          setActivities(Array.from(latestByStudy.values()).sort((a, b) => b.createdAt - a.createdAt).slice(0, 3));
          setLoading(false);
        })
        .catch(() => { if (!cancelled) setLoading(false); });
    }, 0);
    return () => { cancelled = true; window.clearTimeout(timeoutId); };
  }, [user]);

  return <section className="learning-card"><div className="learning-section-heading"><span className="section-kicker">Continue learning</span><Link className="learning-view-all" href="/study">View all <span>→</span></Link></div>{loading ? <p className="learning-empty">Loading your studies...</p> : activities.length === 0 ? <div className="learning-empty"><strong>No studies yet.</strong><span>Start learning to see your progress here.</span><Link className="text-link" href="/study">Start learning <span>→</span></Link></div> : <div className="learning-list">{activities.map((activity) => { const progress = getProgress(activity); return <article className="learning-item" key={getStudyKey(activity)}><div className="learning-item-heading"><div><h2>{activity.subject || "General study"}</h2><p>{activity.topic || "Study session"}</p></div><span className="learning-status">Active</span></div>{progress !== null && <><div className="progress-track" aria-label={`${progress}% complete`}><span style={{ width: `${progress}%` }} /></div><span className="learning-progress">{progress}% complete</span></>}<div className="learning-footer"><span>Last activity {new Date(activity.createdAt).toLocaleDateString()}</span><Link className="text-link" href="/study">Keep going <span>→</span></Link></div></article>; })}</div>}</section>;
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
