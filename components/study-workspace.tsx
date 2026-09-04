"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, Brain, CalendarDays, CheckCircle2, FileText, GraduationCap, Sparkles } from "lucide-react";
import { getFirebaseServices } from "../lib/firebase";
import { GoldAILogoLoader } from "./gold-ai-ui";
import type { StudyAction, StudyActivity } from "../types/study";

const tools: Array<{ id: StudyAction; label: string; description: string; icon: typeof BookOpen }> = [
  { id: "explain", label: "Explain a topic", description: "Break down a difficult idea clearly.", icon: BookOpen },
  { id: "practice", label: "Practice questions", description: "Build confidence with guided practice.", icon: Brain },
  { id: "quiz", label: "Quiz me", description: "Test your understanding and get feedback.", icon: GraduationCap },
  { id: "summarize", label: "Summarize", description: "Turn learning material into revision notes.", icon: FileText },
  { id: "plan", label: "Study plan", description: "Create a realistic plan for your goal.", icon: CalendarDays },
  { id: "check", label: "Check my answer", description: "Understand mistakes and improve your approach.", icon: CheckCircle2 },
];

const levels = ["General", "Primary", "Secondary", "Advanced Secondary", "University", "Professional"];

export function StudyWorkspace() {
  const [action, setAction] = useState<StudyAction>("explain");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("General");
  const [difficulty, setDifficulty] = useState("Medium");
  const [questionCount, setQuestionCount] = useState("5");
  const [content, setContent] = useState("");
  const [answer, setAnswer] = useState("");
  const [goal, setGoal] = useState("");
  const [availableTime, setAvailableTime] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [activities, setActivities] = useState<StudyActivity[]>([]);
  const [launching, setLaunching] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const result = "";
  const loading = launching;
  const setResult = (_value: string) => undefined;
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => { void loadHistory(); }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  async function token() {
    const currentUser = getFirebaseServices().auth.currentUser;
    const idToken = await currentUser?.getIdToken();
    if (!idToken) throw new Error("Please log in again.");
    return idToken;
  }

  async function loadHistory() {
    try {
      const response = await fetch("/api/study", { headers: { Authorization: `Bearer ${await token()}` } });
      const data = await response.json() as { activities?: StudyActivity[]; error?: string };
      if (response.ok) setActivities(data.activities || []);
    } catch { /* The main study workflow remains usable if history is unavailable. */ }
    finally { setHistoryLoading(false); }
  }

  async function submit() {
    setLaunching(true); setError(null);
    try {
      const context = [`Study tool: ${action}`, subject && `Subject: ${subject}`, topic && `Topic: ${topic}`, level && `Learning level: ${level}`, difficulty && `Difficulty: ${difficulty}`, questionCount && `Questions: ${questionCount}`, content && `Learning material or reference:\n${content}`, answer && `Learner answer:\n${answer}`, goal && `Learning goal: ${goal}`, availableTime && `Available time: ${availableTime}`, targetDate && `Target date: ${targetDate}`].filter(Boolean).join("\n");
      const response = await fetch("/api/study/activity", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ action, subject: subject || undefined, topic: topic || undefined }) });
      const data = await response.json() as { activity?: StudyActivity; error?: string };
      if (!response.ok) throw new Error(data.error || "Study task could not be started.");
      if (data.activity) setActivities((items) => [data.activity!, ...items]);
      router.push(`/chat?new=true&prompt=${encodeURIComponent(`I want to study using this Gold AI study context:\n${context}\n\nPlease guide me through this task in a clear, educational way.`)}`);
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Study request could not be completed."); }
    finally { setLaunching(false); }
  }

  const needsMaterial = action === "summarize";
  const needsAnswer = action === "check";
  return <div className="app-shell"><aside className="study-sidebar"><div className="study-sidebar-brand"><Sparkles size={18} /><span>Study & Learn</span></div><nav className="study-tools" aria-label="Study tools">{tools.map(({ id, label, icon: Icon }) => <button className={id === action ? "active" : ""} type="button" key={id} onClick={() => { setAction(id); setResult(""); setError(null); }}><Icon size={18} /><span>{label}</span></button>)}</nav></aside><main className="study-main"><header className="study-heading"><span className="eyebrow">Learn at your pace</span><h1>Study & Learn</h1><p>Understand, practise, and keep moving forward.</p><a className="study-ask-link" href="/chat">Ask AI in chat <ArrowRight size={15} /></a></header><section className="study-tool-grid" aria-label="Study tools">{tools.map(({ id, label, description, icon: Icon }) => <button className={`study-tool-card ${id === action ? "active" : ""}`} type="button" key={id} onClick={() => { setAction(id); setResult(""); setError(null); }}><span className="study-tool-icon"><Icon size={20} /></span><span><strong>{label}</strong><small>{description}</small></span><ArrowRight size={16} /></button>)}</section><section className="study-workspace"><div className="study-form-panel"><div className="section-title"><div><span className="eyebrow">{tools.find((tool) => tool.id === action)?.label}</span><h2>What are you working on?</h2></div><span className="section-rule" /></div><div className="study-form-grid"><label>Subject<input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="e.g. Physics" /></label><label>Topic<input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="e.g. Motion" /></label><label>Learning level<select value={level} onChange={(event) => setLevel(event.target.value)}>{levels.map((item) => <option key={item}>{item}</option>)}</select></label>{["practice", "quiz"].includes(action) && <><label>Difficulty<select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option>Easy</option><option>Medium</option><option>Hard</option></select></label><label>Questions<input type="number" min="1" max="20" value={questionCount} onChange={(event) => setQuestionCount(event.target.value)} /></label></>}{needsMaterial && <label className="study-full-field">Learning material<textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="Paste notes or text to summarize..." rows={7} /></label>}{needsAnswer && <><label className="study-full-field">Question or reference<textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="What question are you answering?" rows={4} /></label><label className="study-full-field">Your answer<textarea value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Write your answer here..." rows={5} /></label></>}{action === "plan" && <><label className="study-full-field">Learning goal<textarea value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="What do you want to achieve?" rows={3} /></label><label>Available time<input value={availableTime} onChange={(event) => setAvailableTime(event.target.value)} placeholder="e.g. 45 minutes per day" /></label><label>Target date<input value={targetDate} onChange={(event) => setTargetDate(event.target.value)} placeholder="e.g. 30 June" /></label></>}</div><button className="auth-submit study-submit" type="button" disabled={loading} onClick={() => void submit()}>{loading ? "Gold AI is thinking..." : "Start study"}</button>{error && <p className="form-error" role="alert">{error}</p>}</div><div className="study-result-panel">{loading ? <div className="study-loading"><GoldAILogoLoader size="md" label="Preparing your lesson..." /></div> : result ? <article className="study-result"><h2>Your learning result</h2><div className="study-result-text">{result}</div></article> : <div className="study-result-empty"><Sparkles size={22} /><h2>Your result will appear here</h2><p>Choose a tool, add a topic, and start learning.</p></div>}</div></section><section className="study-history"><div className="section-title"><div><span className="eyebrow">Your progress</span><h2>Recent study activity</h2></div><span className="section-rule" /></div>{historyLoading ? <p className="transactions-empty">Loading history...</p> : activities.length === 0 ? <p className="transactions-empty">Your study activity will appear here.</p> : activities.slice(0, 8).map((activity) => <div className="study-history-row" key={activity.id}><span>{activity.action.replaceAll("_", " ")}</span><strong>{activity.topic || activity.subject || "Study session"}</strong><small>{new Date(activity.createdAt).toLocaleDateString()}</small></div>)}</section></main></div>;
}