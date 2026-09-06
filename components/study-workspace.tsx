"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, Brain, CalendarDays, CheckCircle2, FileText, GraduationCap, Sparkles } from "lucide-react";
import { getFirebaseServices } from "../lib/firebase";
import { createConversation } from "../lib/chat/conversations";
import { curriculumsFor, levelsFor, subjectsFor } from "../config/curriculums";
import { countries } from "../config/countries";
import { sanitizeStudyContext, studyActivityFields, studyPromptFor } from "../lib/study/context";
import { GoldAILogoLoader } from "./gold-ai-ui";
import { useProfile } from "./profile-provider";
import { useAuth } from "./auth-provider";
import type { StudyAction, StudyActivity, StudyContext } from "../types/study";
import { questionStyles, explanationDepths } from "../types/study";

const tools: Array<{ id: StudyAction; label: string; description: string; icon: typeof BookOpen }> = [
  { id: "explain", label: "Explain a topic", description: "Break down a difficult idea clearly.", icon: BookOpen },
  { id: "practice", label: "Practice questions", description: "Build confidence with guided practice.", icon: Brain },
  { id: "quiz", label: "Quiz me", description: "Test your understanding and get feedback.", icon: GraduationCap },
  { id: "summarize", label: "Summarize", description: "Turn learning material into revision notes.", icon: FileText },
  { id: "plan", label: "Study plan", description: "Create a realistic plan for your goal.", icon: CalendarDays },
  { id: "check", label: "Check my answer", description: "Understand mistakes and improve your approach.", icon: CheckCircle2 },
];

const difficulties = ["Easy", "Medium", "Hard"];
const timedOptions = ["No", "Yes"];
const summaryTypes = ["Revision notes", "Key points", "Definitions", "I have my own material"];

type Step = "mode" | "context" | "settings" | "start";

export function StudyWorkspace() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const router = useRouter();

  // Step 1 — mode
  const [mode, setMode] = useState<StudyAction>("explain");
  const [step, setStep] = useState<Step>("mode");

  // Step 2 — educational context
  const [country, setCountry] = useState<string>(profile?.country && profile.country !== "Other" ? profile.country : countries[0] === "Uganda" ? "Uganda" : profile?.country || "Uganda");
  const [curriculumId, setCurriculumId] = useState<string>("ug-ncdc");
  const [educationLevel, setEducationLevel] = useState<string>("s1-4");
  const [subject, setSubject] = useState<string>("Mathematics");
  const [topic, setTopic] = useState<string>("");

  // Step 3 — mode-specific settings
  const [explanationDepth, setExplanationDepth] = useState<"simple" | "detailed" | "advanced">("detailed");
  const [goal, setGoal] = useState("");
  const [questionStyle, setQuestionStyle] = useState<"structured" | "scenario" | "mixed">("structured");
  const [difficulty, setDifficulty] = useState("Medium");
  const [questionCount, setQuestionCount] = useState("5");
  const [examOriented, setExamOriented] = useState(false);
  const [timed, setTimed] = useState(false);
  const [learningMaterial, setLearningMaterial] = useState("");
  const [learnerAnswer, setLearnerAnswer] = useState("");
  const [markingScheme, setMarkingScheme] = useState("");
  const [studyDuration, setStudyDuration] = useState("");
  const [availableStudyTime, setAvailableStudyTime] = useState("");
  const [targetDate, setTargetDate] = useState("");

  // Activity/history state
  const [activities, setActivities] = useState<StudyActivity[]>([]);
  const [launching, setLaunching] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const availableCurriculums = useMemo(() => curriculumsFor(country), [country]);
  const availableLevels = useMemo(() => levelsFor(curriculumId), [curriculumId]);
  const availableSubjects = useMemo(() => subjectsFor(curriculumId, educationLevel), [curriculumId, educationLevel]);

  // Sync curriculum/level/subject when country or level changes.
  useEffect(() => {
    if (!availableCurriculums.some((curriculum) => curriculum.id === curriculumId)) {
      const fallback = availableCurriculums[0];
      if (fallback) {
        setCurriculumId(fallback.id);
        setEducationLevel(fallback.levels[0]?.id || "");
        setSubject(fallback.levels[0]?.subjects[0] || "");
        return;
      }
    }
    if (!availableLevels.some((level) => level.id === educationLevel)) {
      setEducationLevel(availableLevels[0]?.id || "");
      setSubject(availableLevels[0]?.subjects[0] || "");
      return;
    }
    if (!availableSubjects.includes(subject)) {
      setSubject(availableSubjects[0] || "");
    }
  }, [availableCurriculums, availableLevels, availableSubjects, curriculumId, educationLevel, subject]);

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

  useEffect(() => {
    const timeoutId = window.setTimeout(() => { void loadHistory(); }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadHistory]);

  function validationError(): string | null {
    if (step === "context" || step === "mode") return null;
    if (["explain", "practice", "quiz"].includes(mode) && !topic.trim()) return "Please enter a topic for this session.";
    if (mode === "summarize" && !topic.trim() && !learningMaterial.trim()) return "Please enter a topic or paste the material to summarize.";
    if (mode === "plan" && !goal.trim() && !subject) return "Please describe your study goal or choose a subject.";
    if (mode === "check" && !topic.trim() && !learningMaterial.trim()) return "Please enter the question or reference material.";
    if (mode === "check" && !learnerAnswer.trim()) return "Please provide your answer so Gold AI can check it.";
    return null;
  }

  function nextStep() {
    if (step === "mode") { setStep("context"); return; }
    if (step === "context") { setStep("settings"); return; }
    if (step === "settings") {
      const invalid = validationError();
      if (invalid) { setError(invalid); return; }
      setStep("start");
    }
  }

  function backStep() {
    setError(null);
    if (step === "start") { setStep("settings"); return; }
    if (step === "settings") { setStep("context"); return; }
    if (step === "context") { setStep("mode"); return; }
  }

  function buildStudyContext(): StudyContext {
    const curriculum = availableCurriculums.find((item) => item.id === curriculumId);
    const levelLabel = availableLevels.find((item) => item.id === educationLevel)?.label || "";
    const context: StudyContext = { mode, country: country === "Other" ? undefined : country, curriculumId, curriculumLabel: curriculum?.label, educationLevel: levelLabel || undefined, subject: subject || undefined, topic: topic.trim() || undefined };
    switch (mode) {
      case "explain":
        context.explanationDepth = explanationDepth;
        if (goal.trim()) context.goal = goal.trim();
        break;
      case "practice":
        context.questionStyle = questionStyle;
        context.difficulty = difficulty;
        context.questionCount = Math.min(20, Math.max(1, Number(questionCount) || 5));
        context.examOriented = examOriented;
        break;
      case "quiz":
        context.questionStyle = questionStyle;
        context.difficulty = difficulty;
        context.questionCount = Math.min(20, Math.max(1, Number(questionCount) || 5));
        context.examOriented = examOriented;
        context.timed = timed;
        break;
      case "summarize":
        if (learningMaterial.trim()) context.learningMaterial = learningMaterial.trim();
        if (goal.trim()) context.goal = goal.trim();
        break;
      case "plan":
        if (goal.trim()) context.goal = goal.trim();
        if (studyDuration.trim()) context.studyDuration = studyDuration.trim();
        if (availableStudyTime.trim()) context.availableStudyTime = availableStudyTime.trim();
        if (targetDate.trim()) context.targetDate = targetDate.trim();
        break;
      case "check":
        if (learningMaterial.trim()) context.learningMaterial = learningMaterial.trim();
        if (learnerAnswer.trim()) context.learnerAnswer = learnerAnswer.trim();
        if (markingScheme.trim()) context.markingScheme = markingScheme.trim();
        break;
    }
    const sanitized = sanitizeStudyContext(context);
    return sanitized || { mode };
  }

  async function startLearning() {
    if (!user) { setError("Please log in to start a study session."); return; }
    const invalid = validationError();
    if (invalid) { setError(invalid); return; }
    setLaunching(true);
    setError(null);
    let conversationId: string | undefined;
    try {
      // 1. Create a NEW conversation for this study session.
      const studyContext = buildStudyContext();
      const prompt = studyPromptFor(studyContext);
      const conversation = await createConversation(user.uid, `${studyContext.subject || studyContext.mode}${studyContext.topic ? ` — ${studyContext.topic}` : ""}`);
      conversationId = conversation.id;

      // 2. Record the study activity (server-side) so Home/Continue Learning reflects it.
      try {
        const activityPayload = { action: studyContext.mode, ...studyActivityFields(studyContext, conversationId) };
        await fetch("/api/study/activity", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}` }, body: JSON.stringify(activityPayload) });
      } catch (activityError) {
        console.warn("Gold AI study activity recording failed", { error: activityError instanceof Error ? activityError.message : "unknown error" });
      }

      // 3. Open Chat with the new conversation, the Study prompt, and structured context.
      const query = new URLSearchParams({ conversation: conversationId, prompt, study: JSON.stringify(studyContext) });
      router.push(`/chat?${query.toString()}`);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Unable to start this study session. Please try again.");
      setLaunching(false);
    }
  }

  const selectedTool = tools.find((tool) => tool.id === mode) || tools[0];

  // Mode-specific settings UI
  function renderModeSettings() {
    switch (mode) {
      case "explain":
        return (
          <div className="study-form-grid">
            <label>Explanation depth
              <select value={explanationDepth} onChange={(event) => setExplanationDepth(event.target.value as "simple" | "detailed" | "advanced")}>
                {explanationDepths.map((depth) => <option key={depth} value={depth}>{depth === "simple" ? "Simple" : depth === "detailed" ? "Detailed" : "Advanced"}</option>)}
              </select>
            </label>
            <label>Learning goal <span className="study-optional">(optional)</span>
              <input value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="e.g. Understand photosynthesis for the national exam" />
            </label>
          </div>
        );
      case "practice":
      case "quiz":
        return (
          <div className="study-form-grid">
            <label>Question style
              <select value={questionStyle} onChange={(event) => setQuestionStyle(event.target.value as "structured" | "scenario" | "mixed")}>
                {questionStyles.map((style) => <option key={style} value={style}>{style === "structured" ? "Structured questions" : style === "scenario" ? "Scenario-based questions" : "Mixed"}</option>)}
              </select>
            </label>
            {mode === "practice" && <label>Difficulty
              <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
                {difficulties.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>}
            <label>Number of questions
              <input type="number" min="1" max="20" value={questionCount} onChange={(event) => setQuestionCount(event.target.value)} />
            </label>
            <label>{mode === "quiz" ? "Timed quiz" : "Exam-oriented"} <span className="study-optional">({mode === "practice" ? "marks/instructions like an exam" : "timed quiz experience"})</span>
              <select value={mode === "practice" ? (examOriented ? "Yes" : "No") : (timed ? "Yes" : "No")} onChange={(event) => { const value = event.target.value === "Yes"; if (mode === "practice") setExamOriented(value); else setTimed(value); }}>
                {timedOptions.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
          </div>
        );
      case "summarize":
        return (
          <div className="study-form-grid">
            <label className="study-full-field">Material to summarize
              <textarea value={learningMaterial} onChange={(event) => setLearningMaterial(event.target.value)} placeholder="Paste notes, a chapter, or any text to summarise for revision..." rows={5} />
            </label>
            <label>Summary type <span className="study-optional">(shapes the output)</span>
              <select>
                {summaryTypes.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>Learning goal <span className="study-optional">(optional)</span>
              <input value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="e.g. Prepare for a class revision test" />
            </label>
          </div>
        );
      case "plan":
        return (
          <div className="study-form-grid">
            <label className="study-full-field">Learning goal
              <textarea value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="What do you want to achieve? e.g. Master all of Chemistry S4 by the end of term" rows={3} />
            </label>
            <label>Study duration <span className="study-optional">(overall)</span>
              <input value={studyDuration} onChange={(event) => setStudyDuration(event.target.value)} placeholder="e.g. 3 weeks or 1 term" />
            </label>
            <label>Available study time
              <input value={availableStudyTime} onChange={(event) => setAvailableStudyTime(event.target.value)} placeholder="e.g. 45 minutes per day" />
            </label>
            <label>Target date
              <input value={targetDate} onChange={(event) => setTargetDate(event.target.value)} placeholder="e.g. 30 June" />
            </label>
          </div>
        );
      case "check":
        return (
          <div className="study-form-grid">
            <label className="study-full-field">Question or reference material
              <textarea value={learningMaterial} onChange={(event) => setLearningMaterial(event.target.value)} placeholder="What question are you answering?" rows={4} />
            </label>
            <label className="study-full-field">Your answer
              <textarea value={learnerAnswer} onChange={(event) => setLearnerAnswer(event.target.value)} placeholder="Write your answer here..." rows={5} />
            </label>
            <label className="study-full-field">Marking scheme / context <span className="study-optional">(optional)</span>
              <textarea value={markingScheme} onChange={(event) => setMarkingScheme(event.target.value)} placeholder="Attach marks breakdown or expected points if available..." rows={3} />
            </label>
          </div>
        );
    }
  }

  function renderSummary() {
    const curriculum = availableCurriculums.find((item) => item.id === curriculumId);
    const levelLabel = availableLevels.find((item) => item.id === educationLevel)?.label || "";
    const items: Array<{ label: string; value: string }> = [{ label: "Mode", value: selectedTool.label }];
    if (country && country !== "Other") items.push({ label: "Country", value: country });
    if (curriculum?.label) items.push({ label: "Curriculum", value: curriculum.label });
    if (levelLabel) items.push({ label: "Level", value: levelLabel });
    if (subject) items.push({ label: "Subject", value: subject });
    if (topic.trim()) items.push({ label: "Topic", value: topic.trim() });
    if (mode === "practice" || mode === "quiz") items.push({ label: "Questions", value: `${questionCount} ${questionStyle === "structured" ? "structured" : questionStyle === "scenario" ? "scenario-based" : "mixed"}${difficulty ? ` · ${difficulty}` : ""}` });
    if (mode === "explain" && explanationDepth) items.push({ label: "Depth", value: explanationDepth === "simple" ? "Simple" : explanationDepth === "detailed" ? "Detailed" : "Advanced" });
    if (mode === "plan" && goal.trim()) items.push({ label: "Goal", value: goal.trim() });
    if (mode === "summarize" && learningMaterial.trim()) items.push({ label: "Material", value: `${learningMaterial.trim().length} characters` });
    return (
      <div className="study-summary-panel">
        <span className="eyebrow">Your session</span>
        <h2>Ready to learn</h2>
        <div className="study-summary-list">
          {items.map((item) => <div className="study-summary-row" key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>)}
        </div>
        <button className="auth-submit study-submit" type="button" disabled={launching} onClick={() => void startLearning()} aria-label="Start this study session">
          {launching ? <GoldAILogoLoader size="sm" label="Creating your session..." /> : <><Sparkles size={16} /> Start Learning</>}
        </button>
        {error && <p className="form-error study-start-error" role="alert">{error}</p>}
      </div>
    );
  }

  return <div className="app-shell"><aside className="study-sidebar"><div className="study-sidebar-brand"><Sparkles size={18} /><span>Study & Learn</span></div><nav className="study-tools" aria-label="Study tools">{tools.map(({ id, label, icon: Icon }) => <button className={id === mode ? "active" : ""} type="button" key={id} onClick={() => { setMode(id); setStep("mode"); setError(null); }}><Icon size={18} /><span>{label}</span></button>)}</nav></aside><main className="study-main">
    <header className="study-heading">
      <span className="eyebrow">Learn at your pace</span>
      <h1>Study & Learn</h1>
      <p>Choose what you want to do, set your educational context, and start learning in Chat.</p>
      <a className="study-ask-link" href="/chat">Ask AI directly in chat <ArrowRight size={15} /></a>
    </header>

    <section className="study-tool-grid" aria-label="Study tools">
      {tools.map(({ id, label, description, icon: Icon }) => <button className={`study-tool-card ${id === mode ? "active" : ""}`} type="button" key={id} onClick={() => { setMode(id); setStep("mode"); setError(null); }}><span className="study-tool-icon"><Icon size={20} /></span><span><strong>{label}</strong><small>{description}</small></span><ArrowRight size={16} /></button>)}
    </section>

    <div className="study-stepper" aria-label="Study setup progress">
      <span className={`study-step ${step === "mode" ? "active" : ""} ${step === "context" || step === "settings" || step === "start" ? "done" : ""}`}><span className="study-step-dot">1</span>Choose</span>
      <span className="study-step-rule" />
      <span className={`study-step ${step === "context" ? "active" : ""} ${step === "settings" || step === "start" ? "done" : ""}`}><span className="study-step-dot">2</span>Context</span>
      <span className="study-step-rule" />
      <span className={`study-step ${step === "settings" ? "active" : ""} ${step === "start" ? "done" : ""}`}><span className="study-step-dot">3</span>Settings</span>
      <span className="study-step-rule" />
      <span className={`study-step ${step === "start" ? "active" : ""}`}><span className="study-step-dot">4</span>Start</span>
    </div>

    <section className="study-workspace">
      <div className="study-form-panel">
        {step === "mode" && <div className="study-form-step">
          <div className="section-title"><div><span className="eyebrow">Choose what you want to do</span><h2>Select a study mode</h2></div><span className="section-rule" /></div>
          <p className="study-step-hint">Pick the mode you'd like to start. You can change it any time.</p>
        </div>}

        {step === "context" && <div className="study-form-step">
          <div className="study-form-step-heading"><button className="icon-button" type="button" onClick={backStep} aria-label="Back to modes"><ArrowLeft size={18} /></button>
            <div><span className="eyebrow">Step 2 of 4 — Educational context</span><h2>Where are you learning?</h2></div>
          </div>
          <div className="study-form-grid">
            <label>Country / Curriculum
              <select value={country} onChange={(event) => setCountry(event.target.value)}>
                {countries.map((item) => <option key={item}>{item}</option>)}
                {profile?.country && !countries.includes(profile.country as (typeof countries)[number]) && <option>{profile.country}</option>}
              </select>
            </label>
            <label>Curriculum
              <select value={curriculumId} onChange={(event) => { setCurriculumId(event.target.value); setEducationLevel(levelsFor(event.target.value)[0]?.id || ""); setSubject(subjectsFor(event.target.value, levelsFor(event.target.value)[0]?.id || "")[0] || ""); }}>
                {availableCurriculums.map((curriculum) => <option key={curriculum.id} value={curriculum.id}>{curriculum.label}</option>)}
              </select>
            </label>
            <label>Education level
              <select value={educationLevel} onChange={(event) => { setEducationLevel(event.target.value); setSubject(subjectsFor(curriculumId, event.target.value)[0] || ""); }}>
                {availableLevels.map((level) => <option key={level.id} value={level.id}>{level.label}</option>)}
              </select>
            </label>
            <label>Subject
              <select value={subject} onChange={(event) => setSubject(event.target.value)}>
                {availableSubjects.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="study-full-field">Topic
              <input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="e.g. Photosynthesis, Quadratic Equations, The Constitution..." />
            </label>
          </div>
        </div>}

        {step === "settings" && <div className="study-form-step">
          <div className="study-form-step-heading"><button className="icon-button" type="button" onClick={backStep} aria-label="Back to context"><ArrowLeft size={18} /></button>
            <div><span className="eyebrow">Step 3 of 4 — {selectedTool.label}</span><h2>Configure your session</h2></div>
          </div>
          {renderModeSettings()}
          {error && <p className="form-error study-start-error" role="alert">{error}</p>}
        </div>}

        {step === "start" && <div className="study-form-step">
          <div className="study-form-step-heading"><button className="icon-button" type="button" onClick={backStep} aria-label="Back to settings"><ArrowLeft size={18} /></button>
            <div><span className="eyebrow">Step 4 of 4 — Ready</span><h2>Review and start</h2></div>
          </div>
          {renderSummary()}
        </div>}

        {step !== "start" && <button className="auth-submit study-submit" type="button" onClick={nextStep} aria-label={step === "mode" ? "Continue to educational context" : step === "context" ? "Continue to session settings" : "Continue to review"}>
          {step === "mode" ? "Continue" : step === "context" ? "Continue to settings" : "Review session"} <ArrowRight size={15} />
        </button>}
      </div>

      {step === "start" ? renderSummary() : <div className="study-preview"><span className="eyebrow">Preview</span><h3>{selectedTool.label}</h3><p>{selectedTool.description}</p><div className="study-preview-context">
        {step === "context" || step === "settings" ? <>
          <span>{country && country !== "Other" ? country : "General"}</span>
          {topic.trim() && <span>{topic.trim()}</span>}
          {(mode === "practice" || mode === "quiz") && <span>{questionCount} questions · {questionStyle === "structured" ? "structured" : questionStyle === "scenario" ? "scenario" : "mixed"} · {difficulty}</span>}
          {mode === "explain" && <span>{explanationDepth === "simple" ? "Simple explanation" : explanationDepth === "detailed" ? "Detailed explanation" : "Advanced explanation"}</span>}
          {mode === "plan" && <span>{goal.trim() || "Study plan"}</span>}
          {mode === "summarize" && <span>{learningMaterial.trim() ? "Material provided" : "Topic summary"}</span>}
          {mode === "check" && <span>{learnerAnswer.trim() ? "Answer ready for review" : "Answer check"}</span>}
        </> : <span>Pick a mode to begin.</span>}
      </div><div className="study-preview-note"><Sparkles size={15} /><span>A new Chat conversation will open with your settings automatically.</span></div></div>}
    </section>

    <section className="study-history">
      <div className="section-title"><div><span className="eyebrow">Your progress</span><h2>Recent study activity</h2></div><span className="section-rule" /></div>
      {historyLoading ? <p className="transactions-empty">Loading history...</p> : activities.length === 0 ? <p className="transactions-empty">Your study activity will appear here.</p> : activities.slice(0, 8).map((activity) => <div className="study-history-row" key={activity.id}><span>{activity.action.replaceAll("_", " ")}</span><strong>{activity.topic || activity.subject || "Study session"}</strong><small>{new Date(activity.createdAt).toLocaleDateString()}</small></div>)}
    </section>
  </main></div>;
}