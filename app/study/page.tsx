import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProtectedRoute } from "../../components/auth-provider";
import { ProfileRequiredRoute } from "../../components/profile-provider";
import { StudyWorkspace } from "../../components/study-workspace";

export default function StudyPage() {
  return <ProtectedRoute><ProfileRequiredRoute><div className="study-page-wrap"><Link className="icon-button study-page-home" href="/" aria-label="Back to home" title="Back to home"><ArrowLeft size={19} /></Link><StudyWorkspace /></div></ProfileRequiredRoute></ProtectedRoute>;
}
