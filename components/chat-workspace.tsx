"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowLeft, ArrowUp, Copy, Menu, MessageSquare, Paperclip, Plus, Sparkles, Trash2, X } from "lucide-react";
import { useAuth } from "./auth-provider";
import { useProfile } from "./profile-provider";
import { getFirebaseServices } from "../lib/firebase";
import { createConversation, deleteConversation, listConversations, updateConversation } from "../lib/chat/conversations";
import { listMessages, saveMessage } from "../lib/chat/messages";
import type { ChatMessage, Conversation } from "../types/chat";
import type { MessageAttachment } from "../types/multimodal";
import { GoldAILogo, GoldAILogoLoader, ThemeToggle } from "./gold-ai-ui";
import { voiceLanguageFor } from "../config/voice-languages";

const Send = ArrowUp;

const suggestions = ["Explain a difficult topic", "Help me research something", "Write something for me", "Help me study", "Create something"];

type SpeechRecognitionEventLike = Event & { results: { [index: number]: { [index: number]: { transcript: string } } } };
type SpeechRecognitionLike = { lang: string; continuous: boolean; interimResults: boolean; onresult: ((event: SpeechRecognitionEventLike) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start: () => void; stop: () => void };
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

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
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [voiceState, setVoiceState] = useState<"idle" | "listening" | "error">("idle");
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);
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
        const initialConversation = requestedConversation;
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

  function leaveChat() {
    router.push("/");
  }

  const sendMessage = useCallback(async (content = draft, forceNewConversation = false, messageAttachments = attachments) => {
    if (!user || generating || !content.trim()) return;
    const text = content.trim(); setDraft(""); setRetryContent(null); setError(null); setGenerating(true); abortRef.current = new AbortController();
    try {
      const activeConversation = forceNewConversation || !conversation ? await createConversation(user.uid, titleFromMessage(text)) : conversation;
      if (forceNewConversation || !conversation) { router.push(`/chat?conversation=${encodeURIComponent(activeConversation.id)}`); setConversation(activeConversation); setConversations((items) => [activeConversation, ...items]); }
      else if (messages.length === 0) await updateConversation(user.uid, activeConversation.id, titleFromMessage(text));
      const userMessage = await saveMessage(user.uid, activeConversation.id, { role: "user", content: text, attachments: messageAttachments });
      setMessages((items) => [...items, userMessage]);
      const auth = getFirebaseServices().auth;
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Please log in again.");
      const response = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ requestId: crypto.randomUUID(), message: text, language: profile?.preferredLanguage, attachmentIds: messageAttachments.map((attachment) => attachment.id), history: (forceNewConversation ? [] : messages.slice(-12)).map(({ role, content: messageContent }) => ({ role, content: messageContent })) }), signal: abortRef.current.signal });
      const data = await response.json() as { text?: string; provider?: "openai" | "gemini"; model?: string; usage?: ChatMessage["usage"]; error?: string };
      if (!response.ok || !data.text) throw new Error(data.error || "Gold AI could not complete that response.");
      const assistantMessage = await saveMessage(user.uid, activeConversation.id, { role: "assistant", content: data.text, provider: data.provider, model: data.model, usage: data.usage });
      setMessages((items) => [...items, assistantMessage]); setAttachments([]);
      setConversations((items) => items.map((item) => item.id === activeConversation.id ? { ...item, title: item.title === "New conversation" ? titleFromMessage(text) : item.title, updatedAt: Date.now() } : item));
    } catch (sendError) {
      if ((sendError as Error).name !== "AbortError") { setError(sendError instanceof Error ? sendError.message : "Gold AI couldn't complete that response. Please try again."); setRetryContent(text); }
    } finally { setGenerating(false); abortRef.current = null; }
  }, [attachments, conversation, draft, generating, messages, profile, router, user]);

  async function uploadAttachment(file: File) {
    setUploading(true); setError(null);
    try { const form = new FormData(); form.append("file", file); const token = await getFirebaseServices().auth.currentUser?.getIdToken(); if (!token) throw new Error("Please log in again."); const response = await fetch("/api/files", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form }); const data = await response.json() as { file?: MessageAttachment; error?: string }; if (!response.ok || !data.file) throw new Error(data.error || "Unable to upload this file."); setAttachments((items) => [...items, data.file!]); } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : "Unable to upload this file."); } finally { setUploading(false); }
  }

  function toggleVoiceInput() {
    if (voiceState === "listening") { recognitionRef.current?.stop(); return; }
    const Recognition = (window as Window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition || (window as Window & { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition;
    if (!Recognition) { setError("Voice input isn't supported on this browser. You can still type your message."); return; }
    const recognition = new Recognition(); const language = voiceLanguageFor(profile?.preferredLanguage);
    if (language.speechInput === "unavailable") { setError(`Voice input for ${language.name} isn't currently supported here.`); return; }
    recognition.lang = language.locale; recognition.continuous = false; recognition.interimResults = false;
    recognition.onresult = (event) => { const transcript = event.results[0]?.[0]?.transcript?.trim(); if (transcript) setDraft((value) => value ? `${value} ${transcript}` : transcript); };
    recognition.onerror = () => { setVoiceState("error"); setError("I didn't catch that. Please try again."); };
    recognition.onend = () => { setVoiceState("idle"); recognitionRef.current = null; };
    recognitionRef.current = recognition; setError(null); setVoiceState("listening"); recognition.start();
  }

  function toggleSpeech(message: ChatMessage) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) { setError("Voice output isn't supported on this browser."); return; }
    if (speakingId === message.id) { window.speechSynthesis.cancel(); setSpeakingId(null); return; }
    window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(message.content); utterance.lang = voiceLanguageFor(profile?.preferredLanguage).locale; utterance.onend = () => setSpeakingId(null); utterance.onerror = () => { setSpeakingId(null); setError("Unable to read this response aloud."); }; setSpeakingId(message.id); speechSynthesisRef.current = window.speechSynthesis; window.speechSynthesis.speak(utterance);
  }

  const latestAssistant = [...messages].reverse().find((message) => message.role === "assistant");

  useEffect(() => () => { recognitionRef.current?.stop(); speechSynthesisRef.current?.cancel(); }, []);

  useEffect(() => {
    const prompt = searchParams.get("prompt")?.trim();
    if (!prompt || loading || promptHandledRef.current) return;
    promptHandledRef.current = true;
    void sendMessage(prompt, true);
  }, [loading, searchParams, sendMessage]);

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }
  async function copyMessage(message: ChatMessage) { await navigator.clipboard.writeText(message.content); setCopiedId(message.id); window.setTimeout(() => setCopiedId(null), 1400); }
  async function removeConversation() { if (!user || !conversation || !window.confirm("Delete this conversation?")) return; await deleteConversation(user.uid, conversation.id); setConversations((items) => items.filter((item) => item.id !== conversation.id)); startNewChat(); }

  return <div className="chat-shell"><div className="voice-shortcuts"><button type="button" className={`voice-button ${voiceState === "listening" ? "listening" : ""}`} onClick={toggleVoiceInput} aria-label={voiceState === "listening" ? "Stop voice input" : "Start voice input"} title={voiceState === "listening" ? "Stop listening" : "Start voice input"}>🎤</button>{latestAssistant && <button type="button" className="voice-read-button" onClick={() => toggleSpeech(latestAssistant)} aria-label={speakingId === latestAssistant.id ? "Stop reading" : "Read latest response aloud"}>{speakingId === latestAssistant.id ? "Stop" : "Read aloud"}</button>}</div>
    <header className="chat-header"><div className="chat-header-leading"><Link className="icon-button chat-home-button" href="/" aria-label="Back to home" title="Back to home"><ArrowLeft size={19} /></Link><button className="icon-button chat-menu-button" type="button" onClick={() => setDrawerOpen(true)} aria-label="Open chat history"><Menu size={20} /></button><GoldAILogo compact /></div><div className="chat-header-actions"><ThemeToggle /><button className="icon-button mobile-back-button" type="button" onClick={leaveChat} aria-label="Go back" title="Go back"><ArrowLeft size={19} /></button><button className="new-chat-button" type="button" onClick={startNewChat}><Plus size={16} /> <span>New Chat</span></button></div></header>
    <div className="chat-layout">
      <aside className={`chat-history ${drawerOpen ? "open" : ""}`}><div className="chat-history-heading"><span>Recent chats</span><button className="icon-button chat-close" type="button" onClick={() => setDrawerOpen(false)} aria-label="Close chat history"><X size={18} /></button></div><button className="new-chat-button history-new" type="button" onClick={startNewChat}><Plus size={16} /> New conversation</button><div className="history-list">{conversations.map((item) => <button className={`history-item ${item.id === conversation?.id ? "active" : ""}`} type="button" key={item.id} onClick={() => void selectConversation(item)}><MessageSquare size={15} /><span><strong>{item.title}</strong><small>{formatDate(item.updatedAt)}</small></span></button>)}{conversations.length === 0 && <p className="history-empty">Your conversations will appear here.</p>}</div></aside>
      <main className="chat-main"><div className="chat-messages" aria-live="polite">{loading ? <div className="chat-centered"><GoldAILogoLoader size="lg" label="Loading your conversations..." /></div> : messages.length === 0 ? <div className="chat-centered welcome-chat"><span className="chat-spark"><Sparkles size={22} /></span><h1>What can I help you with?</h1><p>Ask anything. Learn something. Make something.</p><div className="suggestion-grid">{suggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => { setDraft(suggestion); }}>{suggestion}<span>↗</span></button>)}</div></div> : <div className="message-list">{messages.map((message) => <article className={`chat-message ${message.role}`} key={message.id}>{message.role === "assistant" && <div className="message-avatar"><Image src="/images/logo1.png" alt="" width={28} height={28} /></div>}<div className="message-body"><div className="message-meta">{message.role === "assistant" ? "Gold AI" : "You"}</div>{message.attachments?.map((attachment) => <div className="message-attachment" key={attachment.id} style={{ maxWidth: 100, width: "fit-content" }}>{attachment.fileType === "image" ? <img src={attachment.thumbnailUrl || attachment.url} alt={attachment.fileName} style={{ display: "block", width: "100px", maxWidth: "100px", height: "auto", maxHeight: "72px", objectFit: "cover" }} /> : <span style={{ maxWidth: 100, width: 100 }}>{attachment.fileName}</span>}</div>)}<div className="message-content"><ReactMarkdown>{message.content}</ReactMarkdown></div>{message.role === "assistant" && <div className="message-actions"><button type="button" onClick={() => void copyMessage(message)}><Copy size={13} /> {copiedId === message.id ? "Copied" : "Copy"}</button></div>}</div></article>)}{generating && <div className="chat-message assistant"><div className="message-avatar"><Image src="/images/logo1.png" alt="" width={28} height={28} /></div><GoldAILogoLoader size="sm" label="Thinking..." /></div>}<div ref={endRef} /></div>}{error && <div className="chat-error" role="alert"><span>{error}</span>{retryContent && <button type="button" onClick={() => void sendMessage(retryContent)}>Try again</button>}</div>}</div><form className="chat-composer" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void sendMessage(); }}><div className="chat-attachments">{attachments.map((attachment) => <span className="chat-attachment-chip" key={attachment.id}>{attachment.fileType === "image" ? <img src={attachment.thumbnailUrl || attachment.url} alt={attachment.fileName} /> : <span>{attachment.fileName}</span>}<button type="button" onClick={() => setAttachments((items) => items.filter((item) => item.id !== attachment.id))} aria-label={`Remove ${attachment.fileName}`}>×</button></span>)}<label className="attach-button" title="Attach an image or document" aria-label="Attach a file"><Paperclip size={17} /><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf,text/plain" disabled={generating || uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAttachment(file); event.currentTarget.value = ""; }} /></label></div><textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleComposerKeyDown} placeholder="Ask Gold AI anything..." aria-label="Message Gold AI" rows={1} disabled={generating} /><button className="send-button" type="submit" disabled={generating || uploading || (!draft.trim() && attachments.length === 0)} aria-label="Send message"><Send size={18} /></button></form><p className="composer-note">Gold AI can make mistakes. Check important information.</p></main>
    </div>
    {conversation && <button className="delete-chat-button" type="button" onClick={() => void removeConversation()} aria-label="Delete current conversation" title="Delete conversation"><Trash2 size={15} /></button>}
  </div>;
}
