import { ProtectedRoute } from "../../components/auth-provider";
import { OrganizationsWorkspace } from "../../components/organizations-workspace";
export default function OrganizationsPage() { return <ProtectedRoute><OrganizationsWorkspace /></ProtectedRoute>; }
