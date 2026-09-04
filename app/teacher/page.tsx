import { ProtectedRoute } from "../../components/auth-provider";
import { ProfileRequiredRoute } from "../../components/profile-provider";
import { TeacherWorkspace } from "../../components/teacher-workspace";

export default function TeacherPage() {
  return <ProtectedRoute><ProfileRequiredRoute><TeacherWorkspace /></ProfileRequiredRoute></ProtectedRoute>;
}
