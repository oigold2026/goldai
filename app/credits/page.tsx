import { ProtectedRoute } from "../../components/auth-provider";
import { CreditsPage } from "../../components/credits-page";

export default function CreditsRoute() {
  return <ProtectedRoute><CreditsPage /></ProtectedRoute>;
}
