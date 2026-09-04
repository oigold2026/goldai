import { PlaceholderPage } from "../../components/placeholder-page";
import { ProtectedRoute } from "../../components/auth-provider";
import { ProfileRequiredRoute } from "../../components/profile-provider";

export default function StudyPage() {
  return <ProtectedRoute><ProfileRequiredRoute><PlaceholderPage title="Study" message="Your learning space will grow with you." /></ProfileRequiredRoute></ProtectedRoute>;
}
