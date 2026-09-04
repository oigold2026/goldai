"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowUp, Copy, Menu, MessageSquare, Plus, Sparkles, Trash2, X } from "lucide-react";
import { useAuth } from "./auth-provider";
import { useProfile } from "./profile-provider";
import { getFirebaseServices } from "../lib/firebase";
import { createConversation, deleteConversation, listConversations, updateConversation } from "../lib/chat/conversations";
import { listMessages, saveMessage } from "../lib/chat/messages";
import type { ChatMessage, Conversation } from "../types/chat";
import { GoldAILogo, GoldAILogoLoader, ThemeToggle } from "./gold-ai-ui";

const Send = ArrowUp;

const suggestions = ["Explain a difficult topic", "Help me research something", "Write something for me", "Help me study", "Create something"];

function titleFromMessage(message: string) {
  const words = message.trim().replace(/[.!?]+$/, "").split(/\s+/).slice(0, 6).join(" ");
  return words.length > 36 ? `${words.slice(0, 36).trim()}...` : words || "New conversation";
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(timestamp);
}

export function ChatWorkspace() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [retryContent, setRetryContent] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const promptHandledRef = useRef(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedConversationId = searchParams.get("conversation");

  useEffect(() => {
    if (!user) return undefined;
    const frame = window.requestAnimationFrame(() => {
      void listConversations(user.uid).then((items) => {
        setConversations(items);
        setLoading(false);
        const requestedConversation = requestedConversationId ? items.find((item) => item.id === requestedConversationId) : undefined;
        const initialConversation = requestedConversation || (!searchParams.get("prompt") && !searchParams.get("new") ? items[0] : undefined);
        if (initialConversation) {
          setConversation(initialConversation);
          void listMessages(user.uid, initialConversation.id).then(setMessages).catch(() => setError("We couldn't load this conversation. Please try again."));
        }
      }).catch(() => { setError("We couldn't load your conversations. Please check your connection and try again."); setLoading(false); });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [requestedConversationId, searchParams, user]);

  useEffect(() => { if (!loading) endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, generating, loading]);

  async function selectConversation(next: Conversation) {
    if (!user) return;
    router.push(`/chat?conversation=${encodeURIComponent(next.id)}`);
    setConversation(next); setDrawerOpen(false); setError(null);
    try { setMessages(await listMessages(user.uid, next.id)); }
    catch { setError("We couldn't load this conversation. Please try again."); }
  }

  function startNewChat() { router.push("/chat?new=true"); setConversation(null); setMessages([]); setRetryContent(null); setError(null); setDrawerOpen(false); }

  async function sendMessage(content = draft, forceNewConversation = false) {
    if (!user || generating || !content.trim()) return;
    const text = content.trim(); setDraft(""); setRetryContent(null); setError(null); setGenerating(true); abortRef.current = new AbortController();
    try {
      const activeConversation = forceNewConversation || !conversation ? await createConversation(user.uid, titleFromMessage(text)) : conversation;
      if (forceNewConversation || !conversation) { router.push(`/chat?conversation=${encodeURIComponent(activeConversation.id)}`); setConversation(activeConversation); setConversations((items) => [activeConversation, ...items]); }
      else if (messages.length === 0) await updateConversation(user.uid, activeConversation.id, titleFromMessage(text));
      const userMessage = await saveMessage(user.uid, activeConversation.id, { role: "user", content: text });
      setMessages((items) => [...items, userMessage]);
      const auth = getFirebaseServices().auth;
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Please log in again.");
      const response = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ requestId: crypto.randomUUID(), message: text, language: profile?.preferredLanguage, history: (forceNewConversation ? [] : messages.slice(-12)).map(({ role, content: messageContent }) => ({ role, content: messageContent })) }), signal: abortRef.current.signal });
      const data = await response.json() as { text?: string; provider?: "openai" | "gemini"; model?: string; usage?: ChatMessage["usage"]; error?: string };
      if (!response.ok || !data.text) throw new Error(data.error || "Gold AI could not complete that response.");
      const assistantMessage = await saveMessage(user.uid, activeConversation.id, { role: "assistant", content: data.text, provider: data.provider, model: data.model, usage: data.usage });
      setMessages((items) => [...items, assistantMessage]);
      setConversations((items) => items.map((item) => item.id === activeConversation.id ? { ...item, title: item.title === "New conversation" ? titleFromMessage(text) : item.title, updatedAt: Date.now() } : item));
    } catch (sendError) {
      if ((sendError as Error).name !== "AbortError") { setError(sendError instanceof Error ? sendError.message : "Gold AI couldn't complete that response. Please try again."); setRetryContent(text); }
    } finally { setGenerating(false); abortRef.current = null; }
  }

  useEffect(() => {
    const prompt = searchParams.get("prompt")?.trim();
    if (!prompt || loading || promptHandledRef.current) return;
    promptHandledRef.current = true;
    void sendMessage(prompt, true);
  }, [loading, searchParams]);

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }
  async function copyMessage(message: ChatMessage) { await navigator.clipboard.writeText(message.content); setCopiedId(message.id); window.setTimeout(() => setCopiedId(null), 1400); }
  async function removeConversation() { if (!user || !conversation || !window.confirm("Delete this conversation?")) return; await deleteConversation(user.uid, conversation.id); setConversations((items) => items.filter((item) => item.id !== conversation.id)); startNewChat(); }

  return <div className="chat-shell">
    <header className="chat-header"><button className="icon-button chat-menu-button" type="button" onClick={() => setDrawerOpen(true)} aria-label="Open chat history"><Menu size={20} /></button><GoldAILogo compact /><div className="chat-header-actions"><ThemeToggle /><button className="new-chat-button" type="button" onClick={startNewChat}><Plus size={16} /> <span>New Chat</span></button></div></header>
    <div className="chat-layout">
      <aside className={`chat-history ${drawerOpen ? "open" : ""}`}><div className="chat-history-heading"><span>Recent chats</span><button className="icon-button chat-close" type="button" onClick={() => setDrawerOpen(false)} aria-label="Close chat history"><X size={18} /></button></div><button className="new-chat-button history-new" type="button" onClick={startNewChat}><Plus size={16} /> New conversation</button><div className="history-list">{conversations.map((item) => <button className={`history-item ${item.id === conversation?.id ? "active" : ""}`} type="button" key={item.id} onClick={() => void selectConversation(item)}><MessageSquare size={15} /><span><strong>{item.title}</strong><small>{formatDate(item.updatedAt)}</small></span></button>)}{conversations.length === 0 && <p className="history-empty">Your conversations will appear here.</p>}</div></aside>
      <main className="chat-main"><div className="chat-messages" aria-live="polite">{loading ? <div className="chat-centered"><GoldAILogoLoader size="lg" label="Loading your conversations..." /></div> : messages.length === 0 ? <div className="chat-centered welcome-chat"><span className="chat-spark"><Sparkles size={22} /></span><h1>What can I help you with?</h1><p>Ask anything. Learn something. Make something.</p><div className="suggestion-grid">{suggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => { setDraft(suggestion); }}>{suggestion}<span>↗</span></button>)}</div></div> : <div className="message-list">{messages.map((message) => <article className={`chat-message ${message.role}`} key={message.id}>{message.role === "assistant" && <div className="message-avatar"><Image src="/images/logo1.png" alt="" width={28} height={28} /></div>}<div className="message-body"><div className="message-meta">{message.role === "assistant" ? "Gold AI" : "You"}</div><div className="message-content"><ReactMarkdown>{message.content}</ReactMarkdown></div>{message.role === "assistant" && <div className="message-actions"><button type="button" onClick={() => void copyMessage(message)}><Copy size={13} /> {copiedId === message.id ? "Copied" : "Copy"}</button></div>}</div></article>)}{generating && <div className="chat-message assistant"><div className="message-avatar"><Image src="/images/logo1.png" alt="" width={28} height={28} /></div><GoldAILogoLoader size="sm" label="Thinking..." /></div>}<div ref={endRef} /></div>}{error && <div className="chat-error" role="alert"><span>{error}</span>{retryContent && <button type="button" onClick={() => void sendMessage(retryContent)}>Try again</button>}</div>}</div><form className="chat-composer" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void sendMessage(); }}><textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleComposerKeyDown} placeholder="Ask Gold AI anything..." aria-label="Message Gold AI" rows={1} disabled={generating} /><button className="send-button" type="submit" disabled={generating || !draft.trim()} aria-label="Send message"><Send size={18} /></button></form><p className="composer-note">Gold AI can make mistakes. Check important information.</p></main>
    </div>
    {conversation && <button className="delete-chat-button" type="button" onClick={() => void removeConversation()} aria-label="Delete current conversation" title="Delete conversation"><Trash2 size={15} /></button>}
  </div>;
}
