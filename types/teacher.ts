export const teacherToolTypes = ["lesson_plan", "teaching_material", "questions", "answer_key", "assessment", "rubric", "classroom_activity", "explain_students"] as const;
export type TeacherToolType = (typeof teacherToolTypes)[number];

export type TeacherMaterial = {
  id: string;
  userId: string;
  type: TeacherToolType;
  title: string;
  subject: string;
  topic: string;
  classLevel?: string;
  content: string;
  createdAt: number;
  updatedAt: number;
};
