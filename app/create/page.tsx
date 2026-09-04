import { PlaceholderPage } from "../../components/placeholder-page";
import { ProtectedRoute } from "../../components/auth-provider";
import { ProfileRequiredRoute } from "../../components/profile-provider";

export default function CreatePage() {
  return <ProtectedRoute><ProfileRequiredRoute><PlaceholderPage title="Create" message="Turn your ideas into something useful." /></ProfileRequiredRoute></ProtectedRoute>;
}
