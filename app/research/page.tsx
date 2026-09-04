"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ExternalLink, Search, Trash2 } from "lucide-react";
import { ProtectedRoute } from "../../components/auth-provider";
import { ProfileRequiredRoute } from "../../components/profile-provider";
import { AppHeader, GoldAILogoLoader, MobileBottomNav } from "../../components/gold-ai-ui";
import { getFirebaseServices } from "../../lib/firebase";
import type { ResearchSession, ResearchSource, ResearchType } from "../../types/research";

const types: Array<{ value: ResearchType; label: string }> = [
  { value: "general", label: "General research" },
  { value: "academic", label: "Academic" },
  { value: "business", label: "Business" },
  { value: "technology", label: "Technology" },
  { value: "other", label: "Other" },
];

function formatDate(timestamp: number) { return Number.isFinite(timestamp) ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(timestamp) : "Date unavailable"; }

function ResearchWorkspace() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [type, setType] = useState<ResearchType>("general");
  const [region, setRegion] = useState("");
  const [dateRange, setDateRange] = useState("");
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [selected, setSelected] = useState<ResearchSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [researching, setResearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getToken = useCallback(async () => {
    const token = await getFirebaseServices().auth.currentUser?.getIdToken();
    if (!token) throw new Error("Please log in again.");
    return token;
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      const response = await fetch("/api/research", { headers: { Authorization: `Bearer ${await getToken()}` } });
      const data = await response.json() as { sessions?: ResearchSession[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to load research.");
      setSessions(data.sessions || []);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Unable to load research."); }
    finally { setLoading(false); }
  }, [getToken]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => { void loadSessions(); }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadSessions]);

  async function startResearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question.trim()) return;
    setResearching(true); setError(null); setSelected(null);
    try {
      const response = await fetch("/api/research", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await getToken()}` }, body: JSON.stringify({ requestId: crypto.randomUUID(), question, type, region: region || undefined, dateRange: dateRange || undefined }) });
      const data = await response.json() as { session?: ResearchSession; error?: string };
      if (!response.ok || !data.session) throw new Error(data.error || "We couldn't complete the research right now.");
      setSelected(data.session); setSessions((items) => [data.session!, ...items.filter((item) => item.id !== data.session?.id)]); setQuestion("");
    } catch (researchError) { setError(researchError instanceof Error ? researchError.message : "We couldn't complete the research right now."); }
    finally { setResearching(false); }
  }

  async function removeSession(sessionId: string) {
    try {
      const response = await fetch(`/api/research?sessionId=${encodeURIComponent(sessionId)}`, { method: "DELETE", headers: { Authorization: `Bearer ${await getToken()}` } });
      if (!response.ok) throw new Error("Unable to delete this research session.");
      setSessions((items) => items.filter((item) => item.id !== sessionId));
      if (selected?.id === sessionId) setSelected(null);
    } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Unable to delete this research session."); }
  }

  function continueInChat(session: ResearchSession) {
    const prompt = `Continue this research session. Question: ${session.question}\nResearch type: ${session.type}\nExisting synthesis:\n${session.result || "No synthesis yet."}\n\nPlease help me investigate further and clearly distinguish source-supported information from interpretation.`;
    router.push(`/chat?new=true&prompt=${encodeURIComponent(prompt)}`);
  }

  return <div className="research-route"><AppHeader onMenu={() => undefined} backToHome /><main className="research-main"><header className="research-heading"><Link className="research-back" href="/"><ArrowLeft size={17} /> Home</Link><span className="eyebrow">Evidence-led exploration</span><h1>Research</h1><p>Explore questions, compare information, and understand the evidence.</p></header><section className="research-start"><div className="section-title"><div><span className="eyebrow">Start a session</span><h2>What would you like to research?</h2></div><span className="section-rule" /></div><form className="research-form" onSubmit={startResearch}><textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="What would you like to research?" aria-label="Research question" rows={4} /><div className="research-form-row"><label>Research type<select value={type} onChange={(event) => setType(event.target.value as ResearchType)}>{types.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label><label>Region or context<input value={region} onChange={(event) => setRegion(event.target.value)} placeholder="Optional" /></label><label>Date range<input value={dateRange} onChange={(event) => setDateRange(event.target.value)} placeholder="Optional" /></label></div><button className="auth-submit research-submit" type="submit" disabled={researching || !question.trim()}>{researching ? "Researching..." : "Start research"}<Search size={17} /></button></form>{error && <p className="form-error" role="alert">{error}</p>}</section>{researching && <div className="research-loading"><GoldAILogoLoader size="md" label="Finding sources and preparing your research..." /></div>}{selected && <ResearchResult session={selected} onContinue={() => continueInChat(selected)} /> }<section className="research-history"><div className="section-title"><div><span className="eyebrow">Your workspace</span><h2>Recent research</h2></div><span className="section-rule" /></div>{loading ? <p className="transactions-empty">Loading research sessions...</p> : sessions.length === 0 ? <p className="transactions-empty">Your saved research sessions will appear here.</p> : <div className="research-session-list">{sessions.map((session) => <article className="research-session" key={session.id}><button type="button" onClick={() => setSelected(session)}><strong>{session.title}</strong><small>{session.type} <span>•</span> {formatDate(session.updatedAt)}</small><p>{session.question}</p></button><button className="research-delete" type="button" onClick={() => void removeSession(session.id)} aria-label={`Delete ${session.title}`}><Trash2 size={15} /></button></article>)}</div>}</section></main><MobileBottomNav /></div>;
}

function ResearchResult({ session, onContinue }: { session: ResearchSession; onContinue: () => void }) {
  return <section className="research-result"><div className="research-result-heading"><div><span className="eyebrow">Research result</span><h2>{session.title}</h2></div><span className="research-status">{session.status}</span></div><div className="research-result-text">{session.result}</div><div className="research-actions"><button className="auth-submit" type="button" onClick={onContinue}>Discuss in Chat <ArrowRight size={16} /></button></div><div className="research-sources"><div className="section-title"><div><span className="eyebrow">Retrieved sources</span><h3>Sources</h3></div><span className="section-rule" /></div>{session.sources.map((source, index) => <SourceCard key={source.id} source={source} index={index} />)}</div></section>;
}

function SourceCard({ source, index }: { source: ResearchSource; index: number }) {
  return <article className="research-source"><span className="research-source-number">[{index + 1}]</span><div><a href={source.url} target="_blank" rel="noreferrer"><strong>{source.title}</strong><ExternalLink size={14} /></a><small>{source.domain}{source.publishedAt ? ` • ${formatDate(Date.parse(source.publishedAt))}` : ""}</small><p>{source.snippet}</p></div></article>;
}

export default function ResearchPage() { return <ProtectedRoute><ProfileRequiredRoute><ResearchWorkspace /></ProfileRequiredRoute></ProtectedRoute>; }
