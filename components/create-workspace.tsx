"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Copy, FilePlus2, RefreshCw, Save, Sparkles, Trash2, Wand2 } from "lucide-react";
import { AppHeader, GoldAILogoLoader, MobileBottomNav } from "./gold-ai-ui";
import { getFirebaseServices } from "../lib/firebase";
import { createTypeOptions } from "../lib/create/config";
import type { Creation } from "../types/create";

function formatDate(timestamp: number) { return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(timestamp); }

export function CreateWorkspace({ initialType = "writing" }: { initialType?: string }) {
  const router = useRouter();
  const [type, setType] = useState(initialType);
  const [prompt, setPrompt] = useState("");
  const [instructions, setInstructions] = useState("");
  const [creation, setCreation] = useState<Creation | null>(null);
  const [recent, setRecent] = useState<Creation[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const token = useCallback(async () => {
    const idToken = await getFirebaseServices().auth.currentUser?.getIdToken();
    if (!idToken) throw new Error("Please log in again.");
    return idToken;
  }, []);

  const loadRecent = useCallback(async () => {
    try {
      const response = await fetch("/api/create", { headers: { Authorization: `Bearer ${await token()}` } });
      const data = await response.json() as { creations?: Creation[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to load creations.");
      setRecent(data.creations || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load creations.");
    } finally {
      setHistoryLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => { void loadRecent(); }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadRecent]);

  async function generate(action: "generate" | "improve" | "regenerate" = "generate") {
    if (!prompt.trim()) { setError("Tell Gold AI what you would like to create."); return; }
    setLoading(true); setError(null); setNotice(null);
    try { const response = await fetch("/api/create", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ requestId: crypto.randomUUID(), action, type, prompt, instructions: instructions || undefined, creationId: creation?.id, content: creation?.content }) }); const data = await response.json() as { creation?: Creation; error?: string }; if (!response.ok || !data.creation) throw new Error(data.error || "Unable to create content."); setCreation(data.creation); setRecent((items) => [data.creation!, ...items.filter((item) => item.id !== data.creation?.id)]); setEditing(false); } catch (generationError) { setError(generationError instanceof Error ? generationError.message : "Unable to create content."); } finally { setLoading(false); }
  }

  async function saveEditedContent() { if (!creation) return; setLoading(true); try { const response = await fetch("/api/create", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ id: creation.id, content: creation.content }) }); if (!response.ok) throw new Error("Unable to save changes."); setNotice("Changes saved."); setEditing(false); } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to save changes."); } finally { setLoading(false); } }
  async function removeCreation(item: Creation) { try { await fetch(`/api/create?id=${encodeURIComponent(item.id)}`, { method: "DELETE", headers: { Authorization: `Bearer ${await token()}` } }); setRecent((items) => items.filter((candidate) => candidate.id !== item.id)); if (creation?.id === item.id) setCreation(null); } catch { setError("Unable to delete this creation."); } }
  async function copyContent() { if (!creation) return; try { await navigator.clipboard.writeText(creation.content); setNotice("Copied to clipboard."); } catch { setError("Clipboard access failed. Select the content and copy it manually."); } }
  function continueInChat() { if (!creation) return; router.push(`/chat?new=true&prompt=${encodeURIComponent(`Continue working on this ${creation.type} creation.\nRequest: ${creation.prompt}\nGenerated content:\n${creation.content}`)}`); }

  return <div className="create-route"><AppHeader onMenu={() => setMenuOpen(!menuOpen)} backToHome />{menuOpen && <div className="mobile-menu-panel"><a href="/chat">Open chat</a><a href="/profile">Profile</a></div>}<main className="create-main"><header className="create-heading"><span className="eyebrow">Make something useful</span><h1>Create</h1><p>Turn a simple idea into writing, notes, study material, and more.</p></header><section className="create-layout"><form className="create-form" onSubmit={(event) => { event.preventDefault(); void generate(); }}><div className="section-title"><div><span className="eyebrow">Your brief</span><h2>What would you like to create?</h2></div><span className="section-rule" /></div><label>Content type<select value={type} onChange={(event) => setType(event.target.value)}>{createTypeOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label><label>Describe what you want<textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="e.g. Write revision notes on Newton's laws" rows={6} /></label><label>Additional instructions <span className="create-optional">Optional</span><textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Tone, length, audience, or formatting preferences" rows={4} /></label><button className="auth-submit create-submit" type="submit" disabled={loading}>{loading ? "Creating..." : "Generate"}<Sparkles size={17} /></button>{error && <p className="form-error" role="alert">{error}</p>}{notice && <p className="form-success" role="status">{notice}</p>}</form><section className="create-result">{loading ? <div className="create-loading"><GoldAILogoLoader size="md" label="Creating your content..." /></div> : creation ? <><div className="create-result-heading"><div><span className="eyebrow">{creation.type.replaceAll("_", " ")}</span><h2>{creation.title}</h2></div><span className="create-credit-note">{creation.creditsUsed} credits</span></div>{editing ? <textarea className="create-editor" value={creation.content} onChange={(event) => setCreation({ ...creation, content: event.target.value })} /> : <article className="create-content">{creation.content}</article>}<div className="create-actions"><button type="button" onClick={() => void copyContent()}><Copy size={15} /> Copy</button><button type="button" onClick={() => editing ? void saveEditedContent() : setEditing(true)}>{editing ? <Save size={15} /> : <Wand2 size={15} />} {editing ? "Save" : "Edit"}</button><button type="button" onClick={() => void generate("improve")}><RefreshCw size={15} /> Improve</button><button type="button" onClick={() => void generate("regenerate")}><RefreshCw size={15} /> Regenerate</button><button type="button" onClick={continueInChat}><ArrowRight size={15} /> Continue in Chat</button></div></> : <div className="create-empty"><FilePlus2 size={24} /><h2>Your creation will appear here</h2><p>Choose a type, describe your idea, and generate something useful.</p></div>}</section></section><section className="create-history"><div className="section-title"><div><span className="eyebrow">Your workspace</span><h2>Recent creations</h2></div><span className="section-rule" /></div>{historyLoading ? <p className="transactions-empty">Loading creations...</p> : recent.length === 0 ? <p className="transactions-empty">Your saved creations will appear here.</p> : <div className="create-history-list">{recent.map((item) => <article className="create-history-item" key={item.id}><button type="button" onClick={() => setCreation(item)}><strong>{item.title}</strong><small>{item.type.replaceAll("_", " ")} <span>•</span> {formatDate(item.updatedAt)}</small></button><button type="button" className="create-delete" onClick={() => void removeCreation(item)} aria-label={`Delete ${item.title}`}><Trash2 size={15} /></button></article>)}</div>}</section></main><MobileBottomNav /></div>;
}
