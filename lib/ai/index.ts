import { buildSystemInstruction } from "./system-instructions";
import { routeAIRequest } from "./router";
import type { AIRequest } from "./types";

export async function generateAIResponse(request: AIRequest) {
  return routeAIRequest({ systemInstruction: buildSystemInstruction(request), message: request.message, attachments: request.attachments });
}

export type { AIProvider, AIProviderName, AIRequest, AIResponse, AIUsage } from "./types";
