import { ProtectedRoute } from "../../../components/auth-provider";
import { OrganizationDashboard } from "../../../components/organization-dashboard";
export default function OrganizationPage() { return <ProtectedRoute><OrganizationDashboard /></ProtectedRoute>; }
