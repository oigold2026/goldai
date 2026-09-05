import { ProtectedRoute } from "../../../components/auth-provider";
import { ProfileRequiredRoute } from "../../../components/profile-provider";
import { CreateWorkspace } from "../../../components/create-workspace";

export default function WritePage() {
  return <ProtectedRoute><ProfileRequiredRoute><CreateWorkspace initialType="writing" /></ProfileRequiredRoute></ProtectedRoute>;
}
