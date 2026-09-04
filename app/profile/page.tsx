import { ProtectedRoute } from "../../components/auth-provider";
import { ProfileForm } from "../../components/profile-form";

export default function ProfilePage() {
  return <ProtectedRoute><ProfileForm /></ProtectedRoute>;
}
