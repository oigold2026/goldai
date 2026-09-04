"use client";

import { useMemo, useState } from "react";
import { useAuth } from "../components/auth-provider";
import { useProfile } from "../components/profile-provider";
import { userGroupLabels } from "../config/user-groups";
import { getDisplayName } from "../lib/display-name";
import {
  AppHeader,
  AskGoldAI,
  ContinueLearningCard,
  CreditCard,
  DesktopSidebar,
  GoldAILogo,
  MobileBottomNav,
  QuickActionCard,
  quickActions,
} from "../components/gold-ai-ui";

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();
  const { profile } = useProfile();
  const name = getDisplayName(user, profile);
  const timeGreeting = useMemo(() => {
    const hour = new Intl.DateTimeFormat("en", { hour: "numeric", hour12: false }).formatToParts(new Date()).find((part) => part.type === "hour")?.value;
    const localHour = Number(hour);
    return localHour >= 5 && localHour < 12 ? "Good morning" : localHour >= 12 && localHour < 17 ? "Good afternoon" : localHour >= 17 && localHour < 22 ? "Good evening" : "Good night";
  }, []);
  const greeting = profile?.userGroup === "teacher" ? "What would you like to prepare today?" : profile?.userGroup === "researcher" ? "What would you like to research today?" : profile?.userGroup === "university_student" ? "What are you working on today?" : profile?.userGroup === "general" ? "What can Gold AI help you with?" : "What would you like to learn today?";

  return (
    <div className="app-shell">
      <DesktopSidebar />
      <div className="app-column">
        <AppHeader onMenu={() => setMenuOpen(!menuOpen)} />
        {menuOpen && <div className="mobile-menu-panel"><GoldAILogo /><a href="/chat">Open chat</a><a href="/profile">Profile</a></div>}
        <main className="main-content">
          <section className="welcome-block">
            <span className="eyebrow">Your intelligent companion</span>
            <h1>{timeGreeting}, <em>{name}</em>.</h1>
            <p>{greeting}</p>
            {profile?.userGroup && <span className="role-badge">{userGroupLabels[profile.userGroup]}</span>}
            {!user && <p className="auth-cta"><a className="text-link" href="/login">Log in</a> to keep your learning space close.</p>}
          </section>
          <AskGoldAI />
          <section className="section-block">
            <div className="section-title"><div><span className="eyebrow">A little inspiration</span><h2>What can I help with?</h2></div><span className="section-rule" /></div>
          </section>
          <div className="quick-actions">{quickActions.map((action) => <QuickActionCard key={action.label} {...action} />)}</div>
          <div className="home-lower"><ContinueLearningCard /><CreditCard /></div>
        </main>
        <MobileBottomNav />
      </div>
    </div>
  );
}
