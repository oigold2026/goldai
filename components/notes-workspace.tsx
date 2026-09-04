"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, FileText, Plus, Save, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { AppHeader, MobileBottomNav } from "./gold-ai-ui";
import { getFirebaseServices } from "../lib/firebase";
import type { Note } from "../types/notes";

export function NotesWorkspace() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selected, setSelected] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const token = useCallback(async () => {
    const idToken = await getFirebaseServices().auth.currentUser?.getIdToken();
    if (!idToken) throw new Error("Please log in again.");
    return idToken;
  }, []);

  const loadNotes = useCallback(async () => {
    try {
      const response = await fetch("/api/notes", { headers: { Authorization: `Bearer ${await token()}` } });
      const data = await response.json() as { notes?: Note[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to load notes.");
      setNotes(data.notes || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load notes.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => { void loadNotes(); }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadNotes]);

  function selectNote(note: Note) {
    setSelected(note);
    setTitle(note.title);
    setContent(note.content);
    setError(null);
    setNotice(null);
  }

  function startNote() {
    setSelected(null);
    setTitle("");
    setContent("");
    setError(null);
    setNotice(null);
  }

  async function save() {
    if (!title.trim()) { setError("Add a title before saving."); return; }
    setSaving(true); setError(null); setNotice(null);
    try {
      const idToken = await token();
      const response = await fetch(selected ? `/api/notes?id=${encodeURIComponent(selected.id)}` : "/api/notes", { method: selected ? "PATCH" : "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` }, body: JSON.stringify({ title, content }) });
      const data = await response.json() as { note?: Note; error?: string };
      if (!response.ok || !data.note) throw new Error(data.error || "Unable to save this note.");
      setNotes((items) => [data.note!, ...items.filter((item) => item.id !== data.note?.id)]);
      selectNote(data.note);
      setNotice("Saved");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save this note.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!selected || !window.confirm("Delete this note?")) return;
    try {
      const response = await fetch(`/api/notes?id=${encodeURIComponent(selected.id)}`, { method: "DELETE", headers: { Authorization: `Bearer ${await token()}` } });
      if (!response.ok) throw new Error("Unable to delete this note.");
      setNotes((items) => items.filter((item) => item.id !== selected.id));
      startNote();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete this note.");
    }
  }

  const visibleNotes = notes.filter((note) => `${note.title} ${note.content}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="notes-route"><AppHeader onMenu={() => undefined} backToHome /><main className="notes-main"><header className="notes-heading"><Link className="notes-back" href="/create"><ArrowLeft size={16} /> Create</Link><span className="eyebrow">Keep useful thoughts close</span><h1>Notes</h1><p>Capture ideas, organize them, and return when you are ready.</p></header><section className="notes-layout"><aside className="notes-list-panel"><div className="notes-list-heading"><div><span className="section-kicker"><FileText size={14} /> Your notes</span><strong>{notes.length}</strong></div><button className="icon-button" type="button" onClick={startNote} aria-label="Create a new note" title="New note"><Plus size={18} /></button></div><label className="notes-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search notes" aria-label="Search notes" /></label>{loading ? <p className="notes-empty">Loading notes...</p> : visibleNotes.length === 0 ? <p className="notes-empty">No notes yet. Start one to keep an idea.</p> : <div className="notes-list">{visibleNotes.map((note) => <button className={`note-list-item ${note.id === selected?.id ? "active" : ""}`} type="button" key={note.id} onClick={() => selectNote(note)}><strong>{note.title}</strong><small>{note.content.slice(0, 72) || "Empty note"}</small><time>{new Date(note.updatedAt).toLocaleDateString()}</time></button>)}</div>}</aside><section className="note-editor-panel"><div className="note-editor-heading"><div><span className="eyebrow">{selected ? "Edit note" : "New note"}</span><h2>{title || "Untitled note"}</h2></div>{selected && <button className="icon-button" type="button" onClick={() => void remove()} aria-label="Delete note" title="Delete note"><Trash2 size={17} /></button>}</div><label className="note-title-field">Title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Give your note a title" /></label><label className="note-content-field">Content<textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="Write your thoughts here..." rows={14} /></label><div className="note-editor-actions"><button className="auth-submit" type="button" onClick={() => void save()} disabled={saving}><Save size={16} /> {saving ? "Saving..." : "Save note"}</button>{notice && <span className="form-success" role="status">{notice}</span>}</div>{error && <p className="form-error" role="alert">{error}</p>}</section></section></main><MobileBottomNav /></div>;
}
