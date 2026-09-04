"use client";

import { ProtectedRoute } from "../../components/auth-provider";
import { ProfileRequiredRoute } from "../../components/profile-provider";
import { AppHeader, MobileBottomNav } from "../../components/gold-ai-ui";
import { StudyWorkspace } from "../../components/study-workspace";

export default function StudyPage() {
   return <ProtectedRoute><ProfileRequiredRoute><div className="study-route-shell"><AppHeader onMenu={() => undefined} backToHome /><StudyWorkspace /><MobileBottomNav /></div></ProfileRequiredRoute></ProtectedRoute>;
}
