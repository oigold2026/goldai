"use client";

import { AppHeader, DesktopSidebar, EmptyState, MobileBottomNav } from "./gold-ai-ui";
import { useAuth } from "./auth-provider";
import { useState } from "react";

function LogoutButton() {
  const { logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try { await logout(); } finally { setLoggingOut(false); }
  }

  return <button className="auth-secondary" type="button" onClick={handleLogout} disabled={loggingOut}>{loggingOut ? "Logging out..." : "Log out"}</button>;
}

export function PlaceholderPage({ title, message }: { title: string; message: string }) {
  return (
    <div className="app-shell">
      <DesktopSidebar />
      <div className="app-column">
        <AppHeader onMenu={() => undefined} />
        <main className="main-content"><section className="welcome-block"><span className="eyebrow">Gold AI workspace</span><h1>{title}</h1><p>{message}</p></section><div style={{ marginTop: "42px" }}><EmptyState title="Coming together soon." message="This space is ready for the next phase of Gold AI." />{title === "Profile" && <LogoutButton />}</div></main>
        <MobileBottomNav />
      </div>
    </div>
  );
}
