import type { TeacherToolType } from "../../types/teacher";

export const teacherToolOptions: Array<{ value: TeacherToolType; label: string; description: string }> = [
  { value: "lesson_plan", label: "Lesson plan", description: "Plan a structured lesson." },
  { value: "teaching_material", label: "Teaching material", description: "Create notes and handouts." },
  { value: "questions", label: "Questions", description: "Generate learner questions." },
  { value: "answer_key", label: "Answer key", description: "Create answers and explanations." },
  { value: "assessment", label: "Assessment", description: "Build a ready-to-use assessment." },
  { value: "rubric", label: "Rubric", description: "Create clear marking criteria." },
  { value: "classroom_activity", label: "Classroom activity", description: "Design an engaging activity." },
  { value: "explain_students", label: "Explain for students", description: "Make a difficult concept clear." },
];

export function getTeacherTool(type: string) {
  return teacherToolOptions.find((item) => item.value === type);
}
