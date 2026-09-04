export const researchTypes = ["academic", "general", "business", "technology", "other"] as const;
export type ResearchType = (typeof researchTypes)[number];
export type ResearchStatus = "idle" | "researching" | "completed" | "failed";

export type ResearchSource = {
  id: string;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  publishedAt?: string;
  retrievedAt: number;
};

export type ResearchSession = {
  id: string;
  userId: string;
  title: string;
  question: string;
  type: ResearchType;
  status: ResearchStatus;
  result?: string;
  sources: ResearchSource[];
  createdAt: number;
  updatedAt: number;
};
