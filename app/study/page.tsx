import { ProtectedRoute } from "../../components/auth-provider";
import { ProfileRequiredRoute } from "../../components/profile-provider";
import { StudyWorkspace } from "../../components/study-workspace";

export default function StudyPage() {
  return <ProtectedRoute><ProfileRequiredRoute><StudyWorkspace /></ProfileRequiredRoute></ProtectedRoute>;
}
