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
  sourceType?: "encyclopedic" | "academic" | "technical" | "news" | "official" | "community" | "web";
  relevanceScore?: number;
};

export type WebImage = {
  id: string;
  title: string;
  url: string;
  sourceUrl: string;
  alt: string;
  query?: string;
  relevanceScore?: number;
  attribution?: string;
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
  images: WebImage[];
  createdAt: number;
  updatedAt: number;
};
