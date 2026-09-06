import { z } from "zod";
import { generateAIResponse } from "../../../lib/ai";
import { loadAIProfile, verifyFirebaseToken } from "../../../lib/ai/auth-server";
import { creditConfig } from "../../../lib/credits/config";
import { finalizeCredits, refundReservedCredits, reserveCredits } from "../../../lib/credits/service";
import { createResearchSession, deleteResearchSession, getResearchSession, listResearchSessions, updateResearchSession } from "../../../lib/research/service";
import { ResearchSourceProviderError } from "../../../lib/research/provider";
import { retrieveImagesForResponse, retrieveSourceIntelligence, sourceContext } from "../../../lib/source-intelligence";
import type { ResearchType } from "../../../types/research";

export const runtime = "nodejs";

const typeSchema = z.enum(["academic", "general", "business", "technology", "other"]);
const requestSchema = z.object({ requestId: z.string().uuid(), question: z.string().trim().min(8, "Please enter a clearer research question.").max(4000), type: typeSchema.default("general"), sessionId: z.string().uuid().optional(), region: z.string().trim().max(100).optional(), dateRange: z.string().trim().max(100).optional() });

function authToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) throw new Error("UNAUTHORIZED");
  return authorization.slice(7).trim();
}

export async function GET(request: Request) {
  try {
    const uid = await verifyFirebaseToken(authToken(request));
    const sessionId = new URL(request.url).searchParams.get("sessionId");
    if (sessionId) {
      const session = await getResearchSession(uid, sessionId);
      return session ? Response.json({ session }) : Response.json({ error: "Research session not found." }, { status: 404 });
    }
    return Response.json({ sessions: await listResearchSessions(uid) });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return Response.json({ error: "Please log in to use Research." }, { status: 401 });
    console.error("Gold AI research history failed", { error: error instanceof Error ? error.message : "unknown error" });
    return Response.json({ error: "Unable to load research right now." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  try {
    const uid = await verifyFirebaseToken(authToken(request));
    const sessionId = new URL(request.url).searchParams.get("sessionId");
    if (!sessionId) return Response.json({ error: "Research session not found." }, { status: 400 });
    await deleteResearchSession(uid, sessionId);
    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return Response.json({ error: "Please log in to continue." }, { status: 401 });
    console.error("Gold AI research deletion failed", { error: error instanceof Error ? error.message : "unknown error" });
    return Response.json({ error: "Unable to delete this research session." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let uid = "";
  let requestId = "";
  let sessionId = "";
  try {
    const idToken = authToken(request);
    uid = await verifyFirebaseToken(idToken);
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message || "Please check your research question." }, { status: 400 });
    requestId = parsed.data.requestId;
    const session = parsed.data.sessionId ? await getResearchSession(uid, parsed.data.sessionId) : await createResearchSession(uid, parsed.data.question, parsed.data.type as ResearchType);
    if (!session) return Response.json({ error: "Research session not found." }, { status: 404 });
    sessionId = session.id;
    const reservation = await reserveCredits(uid, requestId, creditConfig.featureCosts.research);
    if (reservation.status === "duplicate") return Response.json({ error: "This research request has already been processed." }, { status: 409 });
    if (reservation.status === "insufficient") return Response.json({ error: "You don't have enough credits for research." }, { status: 402 });
    try {
      const intelligence = await retrieveSourceIntelligence(`${parsed.data.question}${parsed.data.region ? ` ${parsed.data.region}` : ""}`, requestId);
      const sources = intelligence.sources;
      if (sources.length === 0) throw new ResearchSourceProviderError("NO_RESULTS", "No reliable research sources were found.");
      const profile = await loadAIProfile(uid, idToken);
      const prompt = `Research question: ${parsed.data.question}\nResearch type: ${parsed.data.type}\n${parsed.data.dateRange ? `Date range: ${parsed.data.dateRange}\n` : ""}Use only the retrieved sources below. Produce a structured synthesis with Overview, Key findings, Evidence, Different perspectives or uncertainty, Conclusion, and Sources. Cite claims with [1], [2], etc. Every citation must match a source URL below. Do not invent facts, sources, dates, or URLs. Distinguish source-supported information from interpretation.\n\n${sourceContext(sources)}`;
      const response = await generateAIResponse({ message: prompt, language: profile?.preferredLanguage, profile: profile ? { userGroup: profile.userGroup, country: profile.country, preferredLanguage: profile.preferredLanguage, educationLevel: profile.educationLevel, classOrYear: profile.classOrYear, programme: profile.programme } : undefined });
      const images = await retrieveImagesForResponse(parsed.data.question, response.text, requestId).catch(() => []);
      await finalizeCredits(uid, requestId, { provider: response.provider, model: response.model, inputTokens: response.usage?.inputTokens, outputTokens: response.usage?.outputTokens, totalTokens: response.usage?.totalTokens }, creditConfig.featureCosts.research);
      await updateResearchSession(uid, sessionId, { status: "completed", result: response.text, sources, images });
      return Response.json({ session: { ...session, status: "completed", result: response.text, sources, images }, creditsConsumed: creditConfig.featureCosts.research });
    } catch (researchError) {
      await refundReservedCredits(uid, requestId);
      await updateResearchSession(uid, sessionId, { status: "failed" });
      throw researchError;
    }
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return Response.json({ error: "Please log in to use Research." }, { status: 401 });
    if (error instanceof ResearchSourceProviderError) {
      const status = error.kind === "NO_RESULTS" || error.kind === "ALL_RESULTS_REJECTED" ? 404 : error.status && error.status < 500 ? 502 : 503;
      console.error("Gold AI research source failure", { uid: uid || "anonymous", requestId: requestId || "unknown", sessionId: sessionId || "unknown", category: error.kind, providerStatus: error.status });
      return Response.json({ error: error.message, category: error.kind }, { status });
    }
    console.error("Gold AI research request failed", { uid: uid || "anonymous", requestId: requestId || "unknown", sessionId: sessionId || "unknown", error: error instanceof Error ? error.message : "unknown error" });
    return Response.json({ error: "We couldn't complete the research right now. Please try again." }, { status: 503 });
  }
}
