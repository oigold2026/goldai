import { ProtectedRoute } from "../../components/auth-provider";
import { FilesWorkspace } from "../../components/files-workspace";
export default function FilesPage() { return <ProtectedRoute><FilesWorkspace /></ProtectedRoute>; }
