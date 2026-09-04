import { ProtectedRoute } from "../../components/auth-provider";
import { ProfileForm } from "../../components/profile-form";

export default function OnboardingPage() {
  return <ProtectedRoute><ProfileForm onboarding /></ProtectedRoute>;
}