export const createTypes = ["writing", "notes", "summary", "study_material", "questions", "quiz", "explanation", "essay", "report", "presentation", "business", "social", "general"] as const;
export type CreateType = (typeof createTypes)[number];

export type Creation = {
  id: string;
  userId: string;
  type: CreateType;
  title: string;
  prompt: string;
  instructions?: string;
  content: string;
  creditsUsed: number;
  createdAt: number;
  updatedAt: number;
};
