import { z } from "zod";
import { generateAIResponse } from "../../../lib/ai";
import { getCurrentFactsContext } from "../../../lib/ai/current-facts";
import { loadAIProfile, verifyFirebaseToken } from "../../../lib/ai/auth-server";
import { creditConfig } from "../../../lib/credits/config";
import { finalizeCredits, refundReservedCredits, reserveCredits } from "../../../lib/credits/service";

const requestSchema = z.object({ requestId: z.string().uuid(), message: z.string().trim().min(1, "Message cannot be empty.").max(12000, "Message is too long."), language: z.string().trim().max(40).optional(), history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(12000) })).max(12).default([]) });

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return Response.json({ error: "Please log in to use Gold AI." }, { status: 401 });
    const idToken = authorization.slice(7);
    const uid = await verifyFirebaseToken(idToken);
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message || "Please check your request." }, { status: 400 });
    const reservation = await reserveCredits(uid, parsed.data.requestId, creditConfig.featureCosts.basicChat);
    if (reservation.status === "duplicate") return Response.json({ error: "This request has already been processed." }, { status: 409 });
    if (reservation.status === "insufficient") return Response.json({ error: "You don't have enough credits for this request." }, { status: 402 });
    const profile = await loadAIProfile(uid, idToken);
    const historyContext = parsed.data.history.length > 0 ? `\n\nRecent conversation context:\n${parsed.data.history.map(({ role, content }) => `${role}: ${content}`).join("\n")}` : "";
    try {
      const currentFactsContext = await getCurrentFactsContext(parsed.data.message, parsed.data.requestId);
      const response = await generateAIResponse({ message: `${parsed.data.message}${historyContext}${currentFactsContext}`, language: parsed.data.language, profile: profile ? { userGroup: profile.userGroup, country: profile.country, preferredLanguage: profile.preferredLanguage, educationLevel: profile.educationLevel, classOrYear: profile.classOrYear, programme: profile.programme } : undefined });
      await finalizeCredits(uid, parsed.data.requestId, { provider: response.provider, model: response.model, inputTokens: response.usage?.inputTokens, outputTokens: response.usage?.outputTokens, totalTokens: response.usage?.totalTokens }, creditConfig.featureCosts.basicChat);
      return Response.json({ ...response, creditsConsumed: creditConfig.featureCosts.basicChat, balance: reservation.account?.balance });
    } catch (providerError) {
      await refundReservedCredits(uid, parsed.data.requestId);
      throw providerError;
    }
  } catch (error) {
    console.error("Gold AI request failed", { error: error instanceof Error ? error.message : "unknown error" });
    return Response.json({ error: "Gold AI is having trouble responding right now. Please try again in a moment." }, { status: 503 });
  }
}
