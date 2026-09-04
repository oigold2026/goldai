import type { UserProfile } from "../../types/user";

export type AIProviderName = "openai" | "gemini";
export type AIRequest = { message: string; language?: string; profile?: Pick<UserProfile, "userGroup" | "country" | "preferredLanguage" | "educationLevel" | "classOrYear" | "programme"> };
export type AIUsage = { inputTokens?: number; outputTokens?: number; totalTokens?: number };
export type AIResponse = { text: string; provider: AIProviderName; model: string; usage?: AIUsage; finishReason?: string };
export type AIProvider = { name: AIProviderName; generateResponse: (request: { systemInstruction: string; message: string }) => Promise<AIResponse>; streamResponse?: (request: { systemInstruction: string; message: string }) => AsyncIterable<string> };
