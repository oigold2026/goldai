import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProtectedRoute } from "../../components/auth-provider";
import { ProfileRequiredRoute } from "../../components/profile-provider";
import { GoldAILogo } from "../../components/gold-ai-ui";
import { StudyWorkspace } from "../../components/study-workspace";

export default function StudyPage() {
   return <ProtectedRoute><ProfileRequiredRoute><div className="study-page-wrap"><div className="study-brand-row"><Link className="icon-button study-home-link" href="/" aria-label="Back to home" title="Back to home"><ArrowLeft size={18} /></Link><GoldAILogo compact /></div><StudyWorkspace /></div></ProfileRequiredRoute></ProtectedRoute>;
}
