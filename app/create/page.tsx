import { ProtectedRoute } from "../../components/auth-provider";
import { ProfileRequiredRoute } from "../../components/profile-provider";
import { CreateHome } from "../../components/create-home";

export default function CreatePage() {
  return <ProtectedRoute><ProfileRequiredRoute><CreateHome /></ProfileRequiredRoute></ProtectedRoute>;
}
