"use client";

import { useEffect, useState } from "react";
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
    MobileSideDrawer,
  QuickActionCard,
  quickActions,
} from "../components/gold-ai-ui";

function getTimeGreeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

function getNextGreetingBoundary() {
  const now = new Date();
  const nextBoundary = new Date(now);
  const boundaries = [5, 12, 18];
  const nextHour = boundaries.find((hour) => hour > now.getHours());
  if (nextHour === undefined) nextBoundary.setDate(nextBoundary.getDate() + 1);
  nextBoundary.setHours(nextHour ?? 0, 0, 0, 0);
  return nextBoundary.getTime() - now.getTime();
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [timeGreeting, setTimeGreeting] = useState(getTimeGreeting);
  const { user } = useAuth();
  const { profile } = useProfile();
  const name = getDisplayName(user, profile);
  const greeting = profile?.userGroup === "teacher" ? "What would you like to prepare today?" : profile?.userGroup === "researcher" ? "What would you like to research today?" : profile?.userGroup === "university_student" ? "What are you working on today?" : profile?.userGroup === "general" ? "What can Gold AI help you with?" : "What would you like to learn today?";

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setTimeGreeting(getTimeGreeting()), getNextGreetingBoundary());
    return () => window.clearTimeout(timeoutId);
  }, [timeGreeting]);

  return (
    <div className="app-shell">
      <DesktopSidebar />
      <div className="app-column">
        <AppHeader onMenu={() => setMenuOpen(!menuOpen)} showMenu />
        <MobileSideDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
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
            <div className="section-title"><div><span className="eyebrow">A little inspiration</span><h2>What can I help you with?</h2></div><span className="section-rule" /></div>
          </section>
          <div className="quick-actions">{quickActions.map((action) => <QuickActionCard key={action.label} {...action} />)}</div>
          <div className="home-lower"><ContinueLearningCard /><CreditCard /></div>
        </main>
        <MobileBottomNav />
      </div>
    </div>
  );
}
