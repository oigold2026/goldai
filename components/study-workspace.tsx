"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, BookOpen, Brain, CalendarDays, CheckCircle2, FileText, GraduationCap, History, Sparkles, Trash2, UserRound, X, type LucideIcon } from "lucide-react";
import { getFirebaseServices } from "../lib/firebase";
import { createConversation } from "../lib/chat/conversations";
import { curriculumsFor } from "../config/curriculums";
import { sanitizeStudyContext, studyActivityFields, studyPromptFor } from "../lib/study/context";
import { studyPlanProgress } from "../lib/study/plan";
import { AppHeader, GoldAILogoLoader } from "./gold-ai-ui";
import { useProfile } from "./profile-provider";
import { useAuth } from "./auth-provider";
import type { StudyAction, StudyActivity, StudyContext, StudyPlan } from "../types/study";
import { explanationDepths, questionStyles } from "../types/study";

type StudyMode = {
  id: StudyAction;
  label: string;
  description: string;
  actionLabel: string;
  loadingLabel: string;
  icon: LucideIcon;
};

const modes: StudyMode[] = [
  { id: "explain", label: "Explain a topic", description: "Get a clear, step-by-step explanation at your level and curriculum.", actionLabel: "Start Learning", loadingLabel: "Preparing your lesson...", icon: BookOpen },
  { id: "practice", label: "Practice questions", description: "Practice with structured or real-world scenario questions, one at a time.", actionLabel: "Start Practice", loadingLabel: "Starting practice...", icon: Brain },
  { id: "quiz", label: "Quiz me", description: "Test yourself with an interactive quiz hosted in Chat.", actionLabel: "Start Quiz", loadingLabel: "Preparing your quiz...", icon: GraduationCap },
  { id: "summarize", label: "Summarize", description: "Turn learning material into revision notes you can act on.", actionLabel: "Summarize", loadingLabel: "Summarizing your material...", icon: FileText },
  { id: "plan", label: "Study plan", description: "Build a realistic plan around your goal, time, and target date.", actionLabel: "Create Study Plan", loadingLabel: "Building your study plan...", icon: CalendarDays },
  { id: "check", label: "Check my answer", description: "Get feedback on your answer: what was right, what to improve, and how.", actionLabel: "Check Answer", loadingLabel: "Checking your answer...", icon: CheckCircle2 },
];

const recentMode: StudyMode = {
  id: "recent" as StudyAction,
  label: "Recent studies",
  description: "Continue any study session you've started.",
  actionLabel: "Continue",
  loadingLabel: "Loading recent studies...",
  icon: History,
};

const difficulties = ["Easy", "Medium", "Hard", "Mixed"];
const questionCounts = [5, 10, 15, 20];
const summaryStyles = ["Revision notes", "Concise summary", "Detailed notes", "Key points", "Exam-focused summary"];

function relativeTime(timestamp: number): string {
  const seconds = Math.round((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(timestamp).toLocaleDateString();
}

function studyTypeLabel(action: StudyAction): string {
  return modes.find((mode) => mode.id === action)?.label ?? action.replaceAll("_", " ");
}

export function StudyWorkspace() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<StudyAction>("explain");
  const [view, setView] = useState<"recent" | "tools" | "select-action">("recent");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRecentStudy, setSelectedRecentStudy] = useState<StudyActivity | null>(null);

  // Shared inputs. Subject is derived from the profile unless the learner overrides it.
  const [topic, setTopic] = useState("");
  const [subjectOverride, setSubjectOverride] = useState<string | null>(null);

  // Explain
  const [explanationDepth, setExplanationDepth] = useState<"simple" | "detailed" | "advanced">("detailed");
  const [includeExamples, setIncludeExamples] = useState(true);
  const [goal, setGoal] = useState("");

  // Practice / Quiz
  const [questionStyle, setQuestionStyle] = useState<"structured" | "scenario" | "mixed">("structured");
  const [difficulty, setDifficulty] = useState("Medium");
  const [questionCount, setQuestionCount] = useState(10);
  const [examOriented, setExamOriented] = useState(false);

  // Summarize
  const [summaryStyle, setSummaryStyle] = useState(summaryStyles[0]);
  const [learningMaterial, setLearningMaterial] = useState("");

  // Plan
  const [planDays, setPlanDays] = useState(30);
  const [availableStudyTime, setAvailableStudyTime] = useState("");
  const [preferredSchedule, setPreferredSchedule] = useState("");

  // Check
  const [learnerAnswer, setLearnerAnswer] = useState("");
  const [markingScheme, setMarkingScheme] = useState("");

  // Session state
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // History, recent studies & plans
  const [activities, setActivities] = useState<StudyActivity[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [recentStudies, setRecentStudies] = useState<StudyActivity[] | null>(null);
  const [recentLoading, setRecentLoading] = useState(true);
  const [plans, setPlans] = useState<StudyPlan[] | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const profileContext = useMemo(() => {
    const country = profile?.country && profile.country !== "Other" ? profile.country : undefined;
    const curriculum = curriculumsFor(country)[0];
    const educationLevel = profile?.educationLevel && profile.educationLevel !== "Other" ? profile.educationLevel : undefined;
    const subjects = Array.isArray(profile?.subjects) ? profile.subjects.filter((item) => typeof item === "string" && item.trim()) : [];
    return {
      country,
      curriculumId: curriculum?.id,
      curriculumLabel: curriculum?.label,
      educationLevel,
      defaultSubject: subjects[0] || "",
      contextParts: [country, educationLevel].filter((item): item is string => Boolean(item)),
    };
  }, [profile]);

  const subject = subjectOverride ?? profileContext.defaultSubject;

  const token = useCallback(async () => {
    const currentUser = getFirebaseServices().auth.currentUser;
    const idToken = await currentUser?.getIdToken();
    if (!idToken) throw new Error("Please log in again.");
    return idToken;
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const response = await fetch("/api/study", { headers: { Authorization: `Bearer ${await token()}` } });
      const data = await response.json() as { activities?: StudyActivity[]; error?: string };
      if (response.ok) setActivities(data.activities || []);
    } catch { /* The main study workflow remains usable if history is unavailable. */ }
    finally { setHistoryLoading(false); }
  }, [token]);

  const loadRecentStudies = useCallback(async () => {
    try {
      const response = await fetch("/api/study?recent=1&limit=10", { headers: { Authorization: `Bearer ${await token()}` } });
      const data = await response.json() as { studies?: StudyActivity[]; error?: string };
      if (response.ok) setRecentStudies(data.studies || []);
    } catch { setRecentStudies([]); }
    finally { setRecentLoading(false); }
  }, [token]);

  const loadPlans = useCallback(async () => {
    try {
      const response = await fetch("/api/study/plans", { headers: { Authorization: `Bearer ${await token()}` } });
      const data = await response.json() as { plans?: StudyPlan[]; error?: string };
      if (response.ok) setPlans(data.plans || []);
    } catch { setPlans((current) => current || []); }
  }, [token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => { void loadHistory(); }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadHistory]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => { void loadRecentStudies(); }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadRecentStudies]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => { void loadPlans(); }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadPlans]);

  // Handle URL parameter for Recent Studies view from Home "View all"
  useEffect(() => {
    if (searchParams.get("view") === "recent") {
      setView("recent");
    }
  }, [searchParams]);

  async function deleteRecentStudy(studyId: string) {
    setRecentStudies((current) => (current || []).filter((study) => study.id !== studyId));
    try {
      await fetch(`/api/study/${encodeURIComponent(studyId)}`, { method: "DELETE", headers: { Authorization: `Bearer ${await token()}` } });
    } catch {
      void loadRecentStudies();
    }
  }

  async function completePlan(planId: string) {
    try {
      const response = await fetch("/api/study/plans", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ planId }) });
      if (response.ok) setPlans((current) => (current || []).map((plan) => (plan.id === planId ? { ...plan, status: "completed" as const } : plan)));
    } catch { /* Keep the current list; the learner can retry. */ }
  }

  useEffect(() => {
    if (!drawerOpen) return undefined;
    function handleKeyDown(event: globalThis.KeyboardEvent) { if (event.key === "Escape") setDrawerOpen(false); }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawerOpen]);

  function getActiveStudyView(): "recent" | StudyAction {
    return view === "tools" ? mode : "recent";
  }

  function selectMode(next: StudyAction) {
    setMode(next);
    setView("tools");
    setError(null);
    setDrawerOpen(false);
    setSelectedRecentStudy(null);
  }

  function selectRecent() {
    setView("recent");
    setSelectedRecentStudy(null);
    setDrawerOpen(false);
  }

  function openRecentStudyActionSelection(study: StudyActivity) {
    setSelectedRecentStudy(study);
    setView("select-action");
    setDrawerOpen(false);
  }

  function startStudyFromRecent(selectedMode: StudyAction) {
    if (!selectedRecentStudy) return;
    setMode(selectedMode);
    setTopic(selectedRecentStudy.topic || "");
    setSubjectOverride(selectedRecentStudy.subject || null);
    setView("tools");
    setSelectedRecentStudy(null);
  }

  const activeMode = view === "recent" ? recentMode : view === "select-action" ? { ...recentMode, label: "Select a learning mode", description: "Choose how you'd like to study this topic" } : modes.find((item) => item.id === mode) || modes[0];
  const visibleRecentStudies = (recentStudies || []).slice(0, 5);
  const pendingDeleteStudy = pendingDelete ? (recentStudies || []).find((study) => study.id === pendingDelete) ?? null : null;

  function validate(): string | null {
    switch (mode) {
      case "explain":
      case "practice":
      case "quiz":
        return topic.trim() ? null : "Please enter a topic to continue.";
      case "summarize":
        return learningMaterial.trim() || topic.trim() ? null : "Paste the material you'd like to summarize (or enter a topic).";
      case "plan":
        return goal.trim() || topic.trim() ? null : "Describe your study goal to continue.";
      case "check":
        if (!learningMaterial.trim() && !topic.trim()) return "Enter the question or problem first.";
        return learnerAnswer.trim() ? null : "Add your answer so Gold AI can check it.";
    }
  }

  function buildStudyContext(): StudyContext {
    const context: StudyContext = { mode, country: profileContext.country, curriculumId: profileContext.curriculumId, curriculumLabel: profileContext.curriculumLabel, educationLevel: profileContext.educationLevel, subject: subject.trim() || undefined, topic: topic.trim() || undefined };
    switch (mode) {
      case "explain":
        context.explanationDepth = explanationDepth;
        context.includeExamples = includeExamples;
        if (goal.trim()) context.goal = goal.trim();
        break;
      case "practice":
        context.questionStyle = questionStyle;
        context.difficulty = difficulty;
        context.questionCount = questionCount;
        context.examOriented = examOriented;
        break;
      case "quiz":
        context.questionStyle = questionStyle;
        context.difficulty = difficulty;
        context.questionCount = questionCount;
        break;
      case "summarize":
        if (learningMaterial.trim()) context.learningMaterial = learningMaterial.trim();
        context.summaryStyle = summaryStyle;
        break;
      case "plan":
        if (goal.trim()) context.goal = goal.trim();
        context.studyDuration = `${planDays} days`;
        if (availableStudyTime.trim()) context.availableStudyTime = availableStudyTime.trim();
        if (preferredSchedule.trim()) context.preferredSchedule = preferredSchedule.trim();
        break;
      case "check":
        if (learningMaterial.trim()) context.learningMaterial = learningMaterial.trim();
        if (learnerAnswer.trim()) context.learnerAnswer = learnerAnswer.trim();
        if (markingScheme.trim()) context.markingScheme = markingScheme.trim();
        break;
    }
    return sanitizeStudyContext(context) || { mode };
  }

  async function startStudy() {
    if (launching) return;
    if (!user) { setError("Please log in to start a study session."); return; }
    const invalid = validate();
    if (invalid) { setError(invalid); return; }
    setLaunching(true);
    setError(null);
    try {
      const studyContext = buildStudyContext();
      const prompt = studyPromptFor(studyContext);
      const titleTopic = studyContext.topic || studyContext.subject || activeMode.label;
      const conversation = await createConversation(user.uid, `${activeMode.label} — ${titleTopic}`.slice(0, 90));

      try {
        const activityPayload = { action: studyContext.mode, title: titleTopic, lastAccessedAt: Date.now(), ...studyActivityFields(studyContext, conversation.id) };
        await fetch("/api/study/activity", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}` }, body: JSON.stringify(activityPayload) });
      } catch (activityError) {
        console.warn("Gold AI study activity recording failed", { error: activityError instanceof Error ? activityError.message : "unknown error" });
      }

      if (studyContext.mode === "plan") {
        try {
          const planPayload = { title: (studyContext.goal || studyContext.topic || studyContext.subject || "Study plan").slice(0, 200), subject: studyContext.subject, topic: studyContext.topic, goal: studyContext.goal, durationDays: planDays, conversationId: conversation.id, educationLevel: studyContext.educationLevel, country: studyContext.country, curriculumId: studyContext.curriculumId, curriculumLabel: studyContext.curriculumLabel };
          await fetch("/api/study/plans", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}` }, body: JSON.stringify(planPayload) });
        } catch (planError) {
          console.warn("Gold AI study plan recording failed", { error: planError instanceof Error ? planError.message : "unknown error" });
        }
      }

      const query = new URLSearchParams({ conversation: conversation.id, prompt, study: JSON.stringify(studyContext) });
      router.push(`/chat?${query.toString()}`);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Unable to start this study session. Please try again.");
      setLaunching(false);
    }
  }

  function renderModeForm() {
    switch (mode) {
      case "explain":
        return (<div className="study-form-grid"><label className="study-full-field">Topic or question<input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="e.g. Photosynthesis" /></label><label>Subject <span className="study-optional">(from your profile)</span><input value={subject} onChange={(event) => setSubjectOverride(event.target.value)} placeholder="e.g. Biology" /></label><label>Explanation depth<select value={explanationDepth} onChange={(event) => setExplanationDepth(event.target.value as "simple" | "detailed" | "advanced")}>{explanationDepths.map((depth) => <option key={depth} value={depth}>{depth === "simple" ? "Simple" : depth === "detailed" ? "Detailed" : "Advanced"}</option>)}</select></label><div className="study-full-field"><span className="study-field-label">Include examples</span><div className="study-radio-group" role="radiogroup" aria-label="Include examples"><label className={`study-radio-option ${includeExamples ? "selected" : ""}`}><input type="radio" name="include-examples" checked={includeExamples} onChange={() => setIncludeExamples(true)} /><span>Yes, with examples</span></label><label className={`study-radio-option ${!includeExamples ? "selected" : ""}`}><input type="radio" name="include-examples" checked={!includeExamples} onChange={() => setIncludeExamples(false)} /><span>No examples</span></label></div></div><label className="study-full-field">Learning goal <span className="study-optional">(optional)</span><input value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="e.g. Understand this for the end-of-term exam" /></label></div>);
      case "practice":
        return (<div className="study-form-grid"><label className="study-full-field">Topic<input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="e.g. Photosynthesis" /></label><label>Subject <span className="study-optional">(from your profile)</span><input value={subject} onChange={(event) => setSubjectOverride(event.target.value)} placeholder="e.g. Biology" /></label><div className="study-full-field"><span className="study-field-label">Question style</span><div className="study-radio-group" role="radiogroup" aria-label="Question style">{questionStyles.map((style) => (<label key={style} className={`study-radio-option ${questionStyle === style ? "selected" : ""}`}><input type="radio" name="question-style" value={style} checked={questionStyle === style} onChange={() => setQuestionStyle(style)} /><span>{style === "structured" ? "Structured questions" : style === "scenario" ? "Scenario-based questions" : "Mixed"}</span></label>))}</div>{questionStyle === "scenario" && <p className="study-field-hint">Scenario questions put you in realistic situations — a farm, a lab, an experiment — and ask you to apply knowledge, reason, and make decisions.</p>}</div><label>Difficulty<select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>{difficulties.map((item) => <option key={item}>{item}</option>)}</select></label><label>Number of questions<select value={String(questionCount)} onChange={(event) => setQuestionCount(Number(event.target.value))}>{questionCounts.map((count) => <option key={count} value={count}>{count}</option>)}</select></label><div className="study-full-field"><span className="study-field-label">Session mode</span><div className="study-radio-group" role="radiogroup" aria-label="Session mode"><label className={`study-radio-option ${!examOriented ? "selected" : ""}`}><input type="radio" name="practice-session-mode" checked={!examOriented} onChange={() => setExamOriented(false)} /><span>Practice mode</span></label><label className={`study-radio-option ${examOriented ? "selected" : ""}`}><input type="radio" name="practice-session-mode" checked={examOriented} onChange={() => setExamOriented(true)} /><span>Exam-style mode</span></label></div></div></div>);
      case "quiz":
        return (<div className="study-form-grid"><label className="study-full-field">Topic<input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="e.g. Newton's Laws" /></label><label>Subject <span className="study-optional">(from your profile)</span><input value={subject} onChange={(event) => setSubjectOverride(event.target.value)} placeholder="e.g. Physics" /></label><div className="study-full-field"><span className="study-field-label">Question style</span><div className="study-radio-group" role="radiogroup" aria-label="Question style">{questionStyles.map((style) => (<label key={style} className={`study-radio-option ${questionStyle === style ? "selected" : ""}`}><input type="radio" name="quiz-question-style" value={style} checked={questionStyle === style} onChange={() => setQuestionStyle(style)} /><span>{style === "structured" ? "Multiple choice" : style === "scenario" ? "Scenario-based" : "Mixed"}</span></label>))}</div></div><label>Difficulty<select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>{difficulties.map((item) => <option key={item}>{item}</option>)}</select></label><label>Number of questions<select value={String(questionCount)} onChange={(event) => setQuestionCount(Number(event.target.value))}>{questionCounts.map((count) => <option key={count} value={count}>{count}</option>)}</select></label></div>);
      case "summarize":
        return (<div className="study-form-grid"><label className="study-full-field">Material to summarize<textarea value={learningMaterial} onChange={(event) => setLearningMaterial(event.target.value)} placeholder="Paste notes, a chapter, or any text you want summarized for revision..." rows={6} /></label><label>Summary style<select value={summaryStyle} onChange={(event) => setSummaryStyle(event.target.value)}>{summaryStyles.map((item) => <option key={item}>{item}</option>)}</select></label><label>Topic <span className="study-optional">(optional)</span><input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="e.g. Photosynthesis notes" /></label><p className="study-field-hint study-full-field">You can also attach a document inside Chat after your session opens.</p></div>);
      case "plan":
        return (<div className="study-form-grid"><label className="study-full-field">Learning goal<textarea value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="What do you want to achieve? e.g. Master Chemistry S4 by the end of term" rows={3} /></label><label>Subject or topics <span className="study-optional">(optional)</span><input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="e.g. Chemistry — Moles, Acids, Electrolysis" /></label><label>Available study time<input value={availableStudyTime} onChange={(event) => setAvailableStudyTime(event.target.value)} placeholder="e.g. 45 minutes per day" /></label><label>Plan length<select value={String(planDays)} onChange={(event) => setPlanDays(Number(event.target.value))}>{[7, 14, 30, 60, 90].map((days) => <option key={days} value={days}>{days} days</option>)}</select></label><label>Preferred schedule <span className="study-optional">(optional)</span><input value={preferredSchedule} onChange={(event) => setPreferredSchedule(event.target.value)} placeholder="e.g. Weekday evenings, Saturday mornings" /></label></div>);
      case "check":
        return (<div className="study-form-grid"><label className="study-full-field">Question or problem<textarea value={learningMaterial} onChange={(event) => setLearningMaterial(event.target.value)} placeholder="What question are you answering?" rows={3} /></label><label className="study-full-field">Your answer<textarea value={learnerAnswer} onChange={(event) => setLearnerAnswer(event.target.value)} placeholder="Write your answer here..." rows={5} /></label><label className="study-full-field">Marking scheme or context <span className="study-optional">(optional)</span><textarea value={markingScheme} onChange={(event) => setMarkingScheme(event.target.value)} placeholder="Expected points or marks breakdown, if you have them..." rows={3} /></label></div>);
    }
  }

  function renderModeButton(modeItem: StudyMode, onSelect: () => void) {
    const Icon = modeItem.icon;
    const isActive = getActiveStudyView() === modeItem.id;
    return (<button key={modeItem.id} type="button" className={isActive ? "active" : ""} aria-current={isActive ? "true" : undefined} onClick={onSelect}><Icon size={18} /><span>{modeItem.label}</span></button>);
  }

  function renderRecentStudiesButton() {
    const isActive = getActiveStudyView() === "recent";
    return (<button key="recent" type="button" className={isActive ? "active" : ""} aria-current={isActive ? "true" : undefined} onClick={selectRecent}><History size={18} /><span>Recent studies</span></button>);
  }



  return (
    <>
      <AppHeader onMenu={() => setDrawerOpen(true)} showMenu backToHome />
      <div className="app-shell">
        <aside className="study-sidebar">
          <div className="study-sidebar-brand"><Sparkles size={18} /><span>Study & Learn</span></div>
          <nav className="study-tools" aria-label="Study modes">
            <span className="study-tools-heading">Study & Learn</span>
            {renderRecentStudiesButton()}
            <div className="study-tools-divider" />
            {modes.map((modeItem) => renderModeButton(modeItem, () => selectMode(modeItem.id)))}
          </nav>
        </aside>
        <main className="study-main">
          {view === "recent" ? (
            <>
              <header className="study-mode-header">
                <span className="eyebrow">Study & Learn</span>
                <h1>{activeMode.label}</h1>
                <p>{activeMode.description}</p>
              </header>
              <section className="study-form-panel" aria-label="Recent studies">
                {recentLoading ? (
                  <p className="recent-studies-empty">Loading recent studies...</p>
                ) : (recentStudies || []).length === 0 ? (
                  <div className="recent-studies-empty-state">
                    <p className="recent-studies-empty-title">No recent studies yet</p>
                    <p className="recent-studies-empty-message">Start a study session and it will appear here.</p>
                  </div>
                ) : (
                  <div className="recent-studies-list">
                    {(recentStudies || []).map((study) => (
                      <article className="recent-study-card" key={study.id}>
                        <div className="recent-study-card-content">
                          <button className="recent-study-card-main" type="button" onClick={() => openRecentStudyActionSelection(study)} aria-label={`Continue studying ${study.title || study.topic || study.action}`}>
                            <h3>{study.title || study.topic || studyTypeLabel(study.action)}</h3>
                            <p>{studyTypeLabel(study.action)}</p>
                            <span className="recent-study-card-time">Last studied: {relativeTime(study.lastAccessedAt ?? study.createdAt)}</span>
                          </button>
                          <button className="icon-button recent-study-card-delete" type="button" onClick={(e) => { e.stopPropagation(); setPendingDelete(study.id); }} aria-label="Delete recent study" title="Delete recent study"><Trash2 size={16} /></button>
                        </div>
                        <button className="recent-study-card-continue" type="button" onClick={() => openRecentStudyActionSelection(study)}>Continue <ArrowRight size={14} /></button>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : view === "select-action" ? (
            <>
              <header className="study-mode-header">
                <span className="eyebrow">Study & Learn</span>
                <h1>{selectedRecentStudy?.title || selectedRecentStudy?.topic || "Select a learning mode"}</h1>
                <p>What would you like to do with this topic?</p>
              </header>
              <section className="study-form-panel" aria-label="Select a learning mode">
                <div className="study-action-grid">
                  {modes.map((modeItem) => {
                    const Icon = modeItem.icon;
                    return (
                      <button
                        key={modeItem.id}
                        type="button"
                        className="study-action-card"
                        onClick={() => startStudyFromRecent(modeItem.id)}
                        aria-label={`Start ${modeItem.label.toLowerCase()}`}
                      >
                        <span className="study-action-icon"><Icon size={24} /></span>
                        <strong>{modeItem.label}</strong>
                        <small>{modeItem.description}</small>
                      </button>
                    );
                  })}
                </div>
                <button
                  className="auth-secondary"
                  type="button"
                  onClick={selectRecent}
                  style={{ marginTop: "28px" }}
                >
                  ← Back to Recent Studies
                </button>
              </section>
            </>
          ) : (
            <>
              <header className="study-mode-header">
                <span className="eyebrow">Study & Learn</span>
                <h1>{activeMode.label}</h1>
                <p>{activeMode.description}</p>
                <div className="study-context-indicator" role="note">
                  <UserRound size={15} />
                  {profileContext.contextParts.length > 0 ? (<span>Personalized for your profile{profileContext.contextParts.length ? ` • ${profileContext.contextParts.join(" • ")}` : ""}</span>) : (<span>Using general learning context. <Link href="/profile">Add your education details in Profile</Link> for more personalized study support.</span>)}
                </div>
              </header>
              <section className="study-form-panel" aria-label={`${activeMode.label} setup`}>
                {renderModeForm()}
                {error && <p className="form-error study-start-error" role="alert">{error}</p>}
                <button className="auth-submit study-submit" type="button" disabled={launching} onClick={() => void startStudy()} aria-label={activeMode.actionLabel}>{launching ? <GoldAILogoLoader size="sm" label={activeMode.loadingLabel} /> : <>{activeMode.actionLabel} <ArrowRight size={15} /></>}</button>
                <p className="study-action-note"><Sparkles size={14} /> Opens a new Chat session with your study settings applied automatically.</p>
              </section>
              <section className="study-plans">
                <div className="section-title"><div><span className="eyebrow">Time progress</span><h2>Your study plans</h2></div><span className="section-rule" /></div>
                {plans === null ? <p className="transactions-empty">Loading your plans...</p> : plans.length === 0 ? <p className="transactions-empty">No study plans yet. Create one above and its time progress will appear here.</p> : <div className="study-plans-list">{plans.map((plan) => { const progress = studyPlanProgress(plan); const statusLabel = plan.status === "completed" ? "Completed" : progress.status === "expired" ? "Ended" : progress.status === "upcoming" ? "Upcoming" : "Active"; return <article className="study-plan-row" key={plan.id}><div className="study-plan-top"><div><h3>{plan.title}</h3><p>{plan.topic || plan.subject || plan.goal || "Study plan"}</p></div><span className={`study-plan-status ${plan.status !== "completed" && progress.status === "active" ? "active" : ""}`}>{statusLabel}</span></div><div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent} aria-label={`${progress.percent}% of the plan period elapsed`}><span style={{ width: `${progress.percent}%` }} /></div><div className="study-plan-meta"><span>{progress.percent}% · Day {progress.day} of {progress.totalDays}</span><span>Ends {new Date(plan.endDate).toLocaleDateString()}</span></div><div className="study-plan-actions"><Link href={plan.conversationId ? `/chat?conversation=${encodeURIComponent(plan.conversationId)}` : "/study"}>Continue →</Link>{plan.status === "active" && progress.status === "active" && <button type="button" onClick={() => void completePlan(plan.id)}>Mark completed</button>}</div></article>; })}</div>}
              </section>
            </>
          )}
        </main>
      </div>
      <div className={`mobile-drawer-layer ${drawerOpen ? "open" : ""}`} aria-hidden={!drawerOpen}>
        {drawerOpen && (<>
          <button className="mobile-drawer-overlay" type="button" onClick={() => setDrawerOpen(false)} aria-label="Close study navigation" />
          <aside className="mobile-drawer" role="dialog" aria-modal="true" aria-label="Study modes">
            <div className="mobile-drawer-header"><div className="study-sidebar-brand"><Sparkles size={18} /><span>Study & Learn</span></div><button className="icon-button" type="button" onClick={() => setDrawerOpen(false)} aria-label="Close study navigation"><X size={18} /></button></div>
            <nav className="study-drawer-nav" aria-label="Study modes"><span className="study-tools-heading">Study & Learn</span>{renderRecentStudiesButton()}<div className="study-tools-divider" />{modes.map((modeItem) => renderModeButton(modeItem, () => selectMode(modeItem.id)))}</nav>
          </aside>
        </>)}
      </div>
      {pendingDeleteStudy && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Delete recent study">
          <div className="modal-card">
            <h3>Delete this recent study?</h3>
            <p>This removes "{pendingDeleteStudy.title || pendingDeleteStudy.topic || studyTypeLabel(pendingDeleteStudy.action)}" from your recent studies. Your chat conversation will not be deleted.</p>
            <div className="modal-actions">
              <button className="auth-secondary" type="button" onClick={() => setPendingDelete(null)}>Cancel</button>
              <button className="auth-submit modal-submit" type="button" onClick={() => { if (pendingDelete) { void deleteRecentStudy(pendingDelete); setPendingDelete(null); } }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}