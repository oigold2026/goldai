import type { AIProviderName } from "./types";

export const aiConfig = {
  defaultProvider: (process.env.AI_DEFAULT_PROVIDER === "gemini" ? "gemini" : "openai") as AIProviderName,
  fallbackProvider: (process.env.AI_FALLBACK_PROVIDER === "openai" ? "openai" : "gemini") as AIProviderName,
  openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
  geminiModel: process.env.GEMINI_MODEL || "gemini-2.0-flash",
};
