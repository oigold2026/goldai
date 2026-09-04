import { aiConfig } from "./config";
import { createGeminiProvider } from "./providers/gemini";
import { createOpenAIProvider } from "./providers/openai";
import type { AIProvider, AIProviderName } from "./types";

const providers: Record<AIProviderName, () => AIProvider> = { openai: createOpenAIProvider, gemini: createGeminiProvider };

export async function routeAIRequest(request: { systemInstruction: string; message: string }) {
  const primary = aiConfig.defaultProvider;
  const fallback = aiConfig.fallbackProvider === primary ? (primary === "openai" ? "gemini" : "openai") : aiConfig.fallbackProvider;
  const errors: string[] = [];
  for (const providerName of [primary, fallback]) {
    try {
      const response = await providers[providerName]().generateResponse(request);
      console.info("Gold AI AI request succeeded", { provider: response.provider, model: response.model, usage: response.usage });
      return response;
    } catch (error) {
      errors.push(`${providerName}: ${error instanceof Error ? error.message : "unknown provider error"}`);
      console.warn("Gold AI AI provider failed", { provider: providerName });
    }
  }
  throw new Error(`All configured AI providers failed: ${errors.join("; ")}`);
}
