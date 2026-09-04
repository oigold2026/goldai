export const studyActions = ["explain", "practice", "quiz", "summarize", "plan", "check"] as const;
export type StudyAction = (typeof studyActions)[number];

export type StudyActivity = {
  id: string;
  userId: string;
  action: StudyAction;
  subject?: string;
  topic?: string;
  score?: number;
  total?: number;
  createdAt: number;
};

export type StudyQuestion = {
  prompt: string;
  type: "multiple_choice" | "short_answer" | "true_false" | "structured" | "open_ended";
  options?: string[];
  answer?: string;
  explanation?: string;
};