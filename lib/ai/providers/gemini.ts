import { GoogleGenerativeAI } from "@google/generative-ai";
import { aiConfig } from "../config";
import type { AIProvider } from "../types";

export function createGeminiProvider(): AIProvider {
  return { name: "gemini", async generateResponse({ systemInstruction, message, attachments }) {
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured.");
    const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const modelConfig = { model: aiConfig.geminiModel, systemInstruction } as Parameters<GoogleGenerativeAI["getGenerativeModel"]>[0];
    if (aiConfig.geminiGoogleSearch) {
      (modelConfig as typeof modelConfig & { tools?: unknown[] }).tools = [{ googleSearchRetrieval: { dynamicRetrievalConfig: { mode: "MODE_DYNAMIC", dynamicThreshold: 0.3 } } }];
    }
    const model = client.getGenerativeModel(modelConfig);
    const imageParts = await Promise.all((attachments || []).filter((attachment) => attachment.fileType === "image").map(async (attachment) => {
      const response = await fetch(attachment.url, { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error(`Unable to load image attachment (${response.status}).`);
      const bytes = Buffer.from(await response.arrayBuffer()).toString("base64");
      return { inlineData: { data: bytes, mimeType: attachment.mimeType } };
    }));
    const result = await model.generateContent([{ text: message }, ...imageParts]);
    const response = result.response;
    const usage = response.usageMetadata;
    return { text: response.text().trim(), provider: "gemini", model: aiConfig.geminiModel, usage: usage ? { inputTokens: usage.promptTokenCount, outputTokens: usage.candidatesTokenCount, totalTokens: usage.totalTokenCount } : undefined, finishReason: response.candidates?.[0]?.finishReason };
  } };
}
