import type { UserProfile } from "../../types/user";
import type { MessageAttachment } from "../../types/multimodal";

export type AIProviderName = "openai" | "gemini";
export type AIRequest = { message: string; language?: string; profile?: Pick<UserProfile, "userGroup" | "country" | "preferredLanguage" | "educationLevel" | "classOrYear" | "programme">; attachments?: MessageAttachment[] };
export type AIUsage = { inputTokens?: number; outputTokens?: number; totalTokens?: number };
export type AIResponse = { text: string; provider: AIProviderName; model: string; usage?: AIUsage; finishReason?: string };
export type AIProvider = { name: AIProviderName; generateResponse: (request: { systemInstruction: string; message: string; attachments?: MessageAttachment[] }) => Promise<AIResponse>; streamResponse?: (request: { systemInstruction: string; message: string }) => AsyncIterable<string> };
