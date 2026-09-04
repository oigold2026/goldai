"use client";

import { FileText, PenLine, Sparkles } from "lucide-react";
import Link from "next/link";
import { AppHeader, MobileBottomNav } from "./gold-ai-ui";

export function CreateHome() {
  return <div className="create-route"><AppHeader onMenu={() => undefined} backToHome /><main className="create-home-main"><header className="create-heading"><span className="eyebrow">Make something useful</span><h1>Create</h1><p>Turn ideas into clear writing and organized notes.</p></header><section className="create-choice-grid" aria-label="Create tools"><Link className="create-choice-card" href="/create/write"><span className="create-choice-icon"><PenLine size={22} /></span><span><strong>Write</strong><small>Shape your thoughts into clear writing.</small></span><span className="quick-arrow">↗</span></Link><Link className="create-choice-card" href="/create/notes"><span className="create-choice-icon"><FileText size={22} /></span><span><strong>Notes</strong><small>Capture and organize your ideas.</small></span><span className="quick-arrow">↗</span></Link></section><section className="create-home-note"><Sparkles size={18} /><p>Choose a workspace to start making something useful with Gold AI.</p></section></main><MobileBottomNav /></div>;
}
