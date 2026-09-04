"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Copy, FileText, RefreshCw, Save, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { AppHeader, GoldAILogoLoader, MobileBottomNav } from "./gold-ai-ui";
import { getFirebaseServices } from "../lib/firebase";
import { teacherToolOptions } from "../lib/teacher/config";
import type { TeacherMaterial, TeacherToolType } from "../types/teacher";

export function TeacherWorkspace() {
  const [tool, setTool] = useState<TeacherToolType>("lesson_plan");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [curriculum, setCurriculum] = useState("");
  const [objectives, setObjectives] = useState("");
  const [duration, setDuration] = useState("");
  const [questionCount, setQuestionCount] = useState("10");
  const [questionType, setQuestionType] = useState("mixed");
  const [difficulty, setDifficulty] = useState("Medium");
  const [instructions, setInstructions] = useState("");
  const [content, setContent] = useState("");
  const [material, setMaterial] = useState<TeacherMaterial | null>(null);
  const [recent, setRecent] = useState<TeacherMaterial[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const token = useCallback(async () => {
    const idToken = await getFirebaseServices().auth.currentUser?.getIdToken();
    if (!idToken) throw new Error("Please log in again.");
    return idToken;
  }, []);

  const loadRecent = useCallback(async () => {
    try {
      const response = await fetch("/api/teacher", { headers: { Authorization: `Bearer ${await token()}` } });
      const data = await response.json() as { materials?: TeacherMaterial[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to load teacher materials.");
      setRecent(data.materials || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load teacher materials.");
    } finally { setHistoryLoading(false); }
  }, [token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => { void loadRecent(); }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadRecent]);

  async function generate() {
    if (!subject.trim() || !topic.trim()) { setError("Add a subject and topic first."); return; }
    setLoading(true); setError(null); setNotice(null); setMaterial(null);
    try {
      const response = await fetch("/api/teacher", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ requestId: crypto.randomUUID(), type: tool, subject, topic, classLevel: classLevel || undefined, curriculum: curriculum || undefined, objectives: objectives || undefined, duration: duration || undefined, questionCount: Number(questionCount) || 10, questionType, difficulty, instructions: instructions || undefined, content: content || undefined }) });
      const data = await response.json() as { material?: TeacherMaterial; error?: string };
      if (!response.ok || !data.material) throw new Error(data.error || "Unable to prepare this material.");
      setMaterial(data.material); setRecent((items) => [data.material!, ...items]);
    } catch (generationError) { setError(generationError instanceof Error ? generationError.message : "Unable to prepare this material."); }
    finally { setLoading(false); }
  }

  async function copyContent() { if (!material) return; try { await navigator.clipboard.writeText(material.content); setNotice("Copied"); } catch { setError("Copy is unavailable in this browser."); } }
  async function saveContent() {
    if (!material) return; setLoading(true); setError(null);
    try { const response = await fetch(`/api/teacher?id=${encodeURIComponent(material.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ content: material.content }) }); const data = await response.json() as { material?: TeacherMaterial; error?: string }; if (!response.ok || !data.material) throw new Error(data.error || "Unable to save changes."); setMaterial(data.material); setRecent((items) => items.map((item) => item.id === data.material?.id ? data.material! : item)); setEditing(false); setNotice("Saved"); } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to save changes."); } finally { setLoading(false); }
  }
  async function deleteMaterial(item: TeacherMaterial) { if (!window.confirm("Delete this material?")) return; try { const response = await fetch(`/api/teacher?id=${encodeURIComponent(item.id)}`, { method: "DELETE", headers: { Authorization: `Bearer ${await token()}` } }); if (!response.ok) throw new Error("Unable to delete this material."); setRecent((items) => items.filter((candidate) => candidate.id !== item.id)); if (material?.id === item.id) setMaterial(null); } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Unable to delete this material."); } }

  function openMaterial(item: TeacherMaterial) { setMaterial(item); setSubject(item.subject); setTopic(item.topic); setClassLevel(item.classLevel || ""); setEditing(false); setNotice(null); setError(null); }
  const selectedTool = teacherToolOptions.find((item) => item.value === tool);
  const needsQuestions = ["questions", "assessment"].includes(tool);
  return <div className="teacher-route"><AppHeader onMenu={() => undefined} backToHome /><main className="teacher-main"><header className="teacher-heading"><Link className="teacher-back" href="/"><ArrowLeft size={16} /> Home</Link><span className="eyebrow">Prepare with confidence</span><h1>Teacher Tools</h1><p>Plan lessons, create assessments, and prepare useful learning materials.</p></header><section className="teacher-layout"><aside className="teacher-tools-panel"><div className="section-title"><div><span className="eyebrow">Choose a tool</span><h2>{selectedTool?.label}</h2></div><span className="section-rule" /></div><div className="teacher-tool-list">{teacherToolOptions.map((item) => <button className={item.value === tool ? "active" : ""} type="button" key={item.value} onClick={() => { setTool(item.value); setMaterial(null); setError(null); }}><span><strong>{item.label}</strong><small>{item.description}</small></span></button>)}</div><div className="teacher-form-grid"><label>Subject<input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="e.g. Biology" /></label><label>Topic<input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="e.g. Cell structure" /></label><label>Class / level<input value={classLevel} onChange={(event) => setClassLevel(event.target.value)} placeholder="Optional" /></label><label>Curriculum / context<input value={curriculum} onChange={(event) => setCurriculum(event.target.value)} placeholder="Optional" /></label>{needsQuestions && <><label>Questions<input type="number" min="1" max="50" value={questionCount} onChange={(event) => setQuestionCount(event.target.value)} /></label><label>Question type<select value={questionType} onChange={(event) => setQuestionType(event.target.value)}><option>mixed</option><option>multiple choice</option><option>short answer</option><option>structured</option><option>essay</option><option>true/false</option></select></label></>}{["lesson_plan", "classroom_activity"].includes(tool) && <label>Duration<input value={duration} onChange={(event) => setDuration(event.target.value)} placeholder="e.g. 60 minutes" /></label>}{["questions", "assessment", "explain_students"].includes(tool) && <label>Difficulty<select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option>Easy</option><option>Medium</option><option>Advanced</option></select></label>}<label className="teacher-full-field">Additional instructions<textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Optional teaching context or requirements" rows={4} /></label></div><button className="auth-submit teacher-submit" type="button" disabled={loading} onClick={() => void generate()}>{loading ? "Preparing..." : `Generate ${selectedTool?.label || "material"}`}<Sparkles size={17} /></button>{error && <p className="form-error" role="alert">{error}</p>}</aside><section className="teacher-result-panel">{loading ? <div className="teacher-loading"><GoldAILogoLoader size="md" label="Preparing your teaching material..." /></div> : material ? <><div className="teacher-result-heading"><div><span className="eyebrow">{selectedTool?.label || material.type.replaceAll("_", " ")}</span><h2>{material.title}</h2></div><button className="icon-button" type="button" onClick={() => void deleteMaterial(material)} aria-label="Delete material" title="Delete material"><Trash2 size={17} /></button></div>{editing ? <textarea className="teacher-editor" value={material.content} onChange={(event) => setMaterial({ ...material, content: event.target.value })} /> : <article className="teacher-content">{material.content}</article>}<div className="teacher-actions"><button type="button" onClick={() => void copyContent()}><Copy size={15} /> Copy</button><button type="button" onClick={() => editing ? void saveContent() : setEditing(true)}>{editing ? <Save size={15} /> : <FileText size={15} />} {editing ? "Save" : "Edit"}</button><button type="button" onClick={() => void generate()} disabled={loading}><RefreshCw size={15} /> Regenerate</button></div>{notice && <p className="form-success" role="status">{notice}</p>}</> : <div className="teacher-empty"><Sparkles size={24} /><h2>Your material will appear here</h2><p>Choose a tool, add your teaching context, and generate.</p></div>}</section></section><section className="teacher-history"><div className="section-title"><div><span className="eyebrow">Your workspace</span><h2>Recent materials</h2></div><span className="section-rule" /></div>{historyLoading ? <p className="transactions-empty">Loading materials...</p> : recent.length === 0 ? <p className="transactions-empty">Saved teaching materials will appear here.</p> : <div className="teacher-history-list">{recent.map((item) => <article className="teacher-history-item" key={item.id}><button type="button" onClick={() => openMaterial(item)}><strong>{item.title}</strong><small>{item.type.replaceAll("_", " ")} <span>•</span> {new Date(item.updatedAt).toLocaleDateString()}</small></button><button className="teacher-delete" type="button" onClick={() => void deleteMaterial(item)} aria-label={`Delete ${item.title}`}><Trash2 size={15} /></button></article>)}</div>}</section></main><MobileBottomNav /></div>;
}
