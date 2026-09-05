import OpenAI from "openai";
import { aiConfig } from "../config";
import type { AIProvider } from "../types";

export function createOpenAIProvider(): AIProvider {
  return { name: "openai", async generateResponse({ systemInstruction, message, attachments }) {
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const userContent = attachments?.length ? [{ type: "text" as const, text: message }, ...attachments.filter((attachment) => attachment.fileType === "image").map((attachment) => ({ type: "image_url" as const, image_url: { url: attachment.url } }))] : message;
    const completion = await client.chat.completions.create({ model: aiConfig.openaiModel, messages: [{ role: "system", content: systemInstruction }, { role: "user", content: userContent }] });
    const choice = completion.choices[0];
    return { text: choice?.message?.content?.trim() || "Gold AI could not produce an answer.", provider: "openai", model: completion.model, usage: completion.usage ? { inputTokens: completion.usage.prompt_tokens, outputTokens: completion.usage.completion_tokens, totalTokens: completion.usage.total_tokens } : undefined, finishReason: choice?.finish_reason || undefined };
  } };
}
