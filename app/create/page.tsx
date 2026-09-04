import { ProtectedRoute } from "../../components/auth-provider";
import { ProfileRequiredRoute } from "../../components/profile-provider";
import { CreateWorkspace } from "../../components/create-workspace";

export default function CreatePage() {
  return <ProtectedRoute><ProfileRequiredRoute><CreateWorkspace /></ProfileRequiredRoute></ProtectedRoute>;
}
