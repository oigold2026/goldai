import { ChatWorkspace } from "../../components/chat-workspace";
import { ProtectedRoute } from "../../components/auth-provider";
import { ProfileRequiredRoute } from "../../components/profile-provider";

export default function ChatPage() {
  return <ProtectedRoute><ProfileRequiredRoute><ChatWorkspace /></ProfileRequiredRoute></ProtectedRoute>;
}
