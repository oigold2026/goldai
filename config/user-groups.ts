import type { LucideIcon } from "lucide-react";
import { BookOpen, GraduationCap, Search, Sparkles, UsersRound } from "lucide-react";
import type { UserGroup } from "../types/user";

export const userGroupOptions: { value: UserGroup; label: string; description: string; icon: LucideIcon }[] = [
  { value: "student", label: "Student", description: "School learning and study support", icon: BookOpen },
  { value: "university_student", label: "University Student", description: "Coursework, research, and writing", icon: GraduationCap },
  { value: "teacher", label: "Teacher", description: "Lessons, notes, and classroom support", icon: UsersRound },
  { value: "researcher", label: "Researcher", description: "Research, analysis, and writing", icon: Search },
  { value: "general", label: "General User", description: "Everyday questions and ideas", icon: Sparkles },
];

export const userGroupLabels: Record<UserGroup, string> = Object.fromEntries(userGroupOptions.map(({ value, label }) => [value, label])) as Record<UserGroup, string>;
