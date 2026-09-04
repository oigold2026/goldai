import { ProtectedRoute } from "../../../components/auth-provider";
import { ProfileRequiredRoute } from "../../../components/profile-provider";
import { NotesWorkspace } from "../../../components/notes-workspace";

export default function NotesPage() {
  return <ProtectedRoute><ProfileRequiredRoute><NotesWorkspace /></ProfileRequiredRoute></ProtectedRoute>;
}
