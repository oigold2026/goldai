import { GoogleGenerativeAI } from "@google/generative-ai";
import { aiConfig } from "../config";
import type { AIProvider } from "../types";

export function createGeminiProvider(): AIProvider {
  return { name: "gemini", async generateResponse({ systemInstruction, message }) {
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured.");
    const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = client.getGenerativeModel({ model: aiConfig.geminiModel, systemInstruction });
    const result = await model.generateContent(message);
    const response = result.response;
    const usage = response.usageMetadata;
    return { text: response.text().trim(), provider: "gemini", model: aiConfig.geminiModel, usage: usage ? { inputTokens: usage.promptTokenCount, outputTokens: usage.candidatesTokenCount, totalTokens: usage.totalTokenCount } : undefined, finishReason: response.candidates?.[0]?.finishReason };
  } };
}
