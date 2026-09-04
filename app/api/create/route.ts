import { z } from "zod";
import { generateAIResponse } from "../../../lib/ai";
import { loadAIProfile, verifyFirebaseToken } from "../../../lib/ai/auth-server";
import { creditConfig } from "../../../lib/credits/config";
import { finalizeCredits, refundReservedCredits, reserveCredits } from "../../../lib/credits/service";
import { getCreateType } from "../../../lib/create/config";
import { deleteCreation, getCreation, listCreations, saveCreation, updateCreation } from "../../../lib/create/service";
import type { CreateType } from "../../../types/create";

export const runtime = "nodejs";

const requestSchema = z.object({ requestId: z.string().uuid(), action: z.enum(["generate", "improve", "regenerate"]).default("generate"), type: z.string().trim().optional(), prompt: z.string().trim().min(3, "Tell Gold AI what you would like to create.").max(12000), instructions: z.string().trim().max(6000).optional(), creationId: z.string().uuid().optional(), content: z.string().max(30000).optional() });

function authToken(request: Request) { const authorization = request.headers.get("authorization"); if (!authorization?.startsWith("Bearer ")) throw new Error("UNAUTHORIZED"); return authorization.slice(7).trim(); }
function buildPrompt(type: CreateType, prompt: string, instructions?: string, currentContent?: string) { const definition = getCreateType(type); return `${definition?.instruction || "Create useful content matching the request."}\nUser request: ${prompt}${instructions ? `\nAdditional instructions: ${instructions}` : ""}${currentContent ? `\nExisting content to improve or regenerate:\n${currentContent}` : ""}\nReturn only the finished content, with clean Markdown where useful.`; }

export async function GET(request: Request) {
  try { return Response.json({ creations: await listCreations(await verifyFirebaseToken(authToken(request))) }); }
  catch (error) { if (error instanceof Error && error.message === "UNAUTHORIZED") return Response.json({ error: "Please log in to view your creations." }, { status: 401 }); console.error("Gold AI creations list failed", { error: error instanceof Error ? error.message : "unknown error" }); return Response.json({ error: "Unable to load creations right now." }, { status: 503 }); }
}

export async function DELETE(request: Request) {
  try { const uid = await verifyFirebaseToken(authToken(request)); const id = new URL(request.url).searchParams.get("id"); if (!id) return Response.json({ error: "Creation not found." }, { status: 400 }); await deleteCreation(uid, id); return Response.json({ success: true }); }
  catch (error) { if (error instanceof Error && error.message === "UNAUTHORIZED") return Response.json({ error: "Please log in to continue." }, { status: 401 }); console.error("Gold AI creation deletion failed", { error: error instanceof Error ? error.message : "unknown error" }); return Response.json({ error: "Unable to delete this creation." }, { status: 503 }); }
}

export async function PATCH(request: Request) {
  try { const uid = await verifyFirebaseToken(authToken(request)); const body = await request.json() as { id?: string; content?: string }; if (!body.id || typeof body.content !== "string") return Response.json({ error: "Creation content is required." }, { status: 400 }); if (!await getCreation(uid, body.id)) return Response.json({ error: "Creation not found." }, { status: 404 }); await updateCreation(uid, body.id, body.content); return Response.json({ success: true }); }
  catch (error) { if (error instanceof Error && error.message === "UNAUTHORIZED") return Response.json({ error: "Please log in to continue." }, { status: 401 }); console.error("Gold AI creation update failed", { error: error instanceof Error ? error.message : "unknown error" }); return Response.json({ error: "Unable to save this creation." }, { status: 503 }); }
}

export async function POST(request: Request) {
  let uid = ""; let requestId = "";
  try {
    const idToken = authToken(request); uid = await verifyFirebaseToken(idToken);
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message || "Please check your creation request." }, { status: 400 });
    requestId = parsed.data.requestId;
    const type = getCreateType(parsed.data.type || "general");
    if (!type) return Response.json({ error: "Choose a valid content type." }, { status: 400 });
    const current = parsed.data.creationId ? await getCreation(uid, parsed.data.creationId) : null;
    if (parsed.data.creationId && !current) return Response.json({ error: "Creation not found." }, { status: 404 });
    const reservation = await reserveCredits(uid, requestId, creditConfig.featureCosts.create);
    if (reservation.status === "duplicate") return Response.json({ error: "This creation request has already been processed." }, { status: 409 });
    if (reservation.status === "insufficient") return Response.json({ error: "You don't have enough credits to create this content." }, { status: 402 });
    try {
      const profile = await loadAIProfile(uid, idToken);
      const response = await generateAIResponse({ message: buildPrompt(type.value, parsed.data.prompt, parsed.data.instructions, parsed.data.action === "improve" || parsed.data.action === "regenerate" ? parsed.data.content || current?.content : undefined), language: profile?.preferredLanguage, profile: profile ? { userGroup: profile.userGroup, country: profile.country, preferredLanguage: profile.preferredLanguage, educationLevel: profile.educationLevel, classOrYear: profile.classOrYear, programme: profile.programme } : undefined });
      await finalizeCredits(uid, requestId, { provider: response.provider, model: response.model, inputTokens: response.usage?.inputTokens, outputTokens: response.usage?.outputTokens, totalTokens: response.usage?.totalTokens }, creditConfig.featureCosts.create);
      const creation = current ? (await updateCreation(uid, current.id, response.text), { ...current, content: response.text, updatedAt: Date.now(), creditsUsed: current.creditsUsed + creditConfig.featureCosts.create }) : await saveCreation(uid, { type: type.value, prompt: parsed.data.prompt, instructions: parsed.data.instructions, content: response.text, creditsUsed: creditConfig.featureCosts.create });
      return Response.json({ creation, provider: response.provider, model: response.model, creditsConsumed: creditConfig.featureCosts.create });
    } catch (generationError) { await refundReservedCredits(uid, requestId); throw generationError; }
  } catch (error) { if (error instanceof Error && error.message === "UNAUTHORIZED") return Response.json({ error: "Please log in to create content." }, { status: 401 }); console.error("Gold AI create request failed", { uid: uid || "anonymous", requestId: requestId || "unknown", error: error instanceof Error ? error.message : "unknown error" }); return Response.json({ error: "Gold AI could not create that content right now. Please try again." }, { status: 503 }); }
}
