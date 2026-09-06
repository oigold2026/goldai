import { z } from "zod";
import { generateAIResponse } from "../../../lib/ai";
import { planSourceQuery, retrieveImagesForResponse, retrieveSourceIntelligence, sourceContext } from "../../../lib/source-intelligence";
import { loadAIProfile, verifyFirebaseToken } from "../../../lib/ai/auth-server";
import { creditConfig } from "../../../lib/credits/config";
import { finalizeCredits, refundReservedCredits, reserveCredits } from "../../../lib/credits/service";
import { getUserFile } from "../../../lib/files/service";
import { sanitizeStudyContext } from "../../../lib/study/context";
import type { MessageAttachment } from "../../../types/multimodal";
import type { StudyContext } from "../../../types/study";

const requestSchema = z.object({ requestId: z.string().uuid(), message: z.string().trim().min(1, "Message cannot be empty.").max(12000, "Message is too long."), language: z.string().trim().max(40).optional(), history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(12000) })).max(12).default([]), attachmentIds: z.array(z.string().uuid()).max(4).default([]), studyContext: z.record(z.string(), z.unknown()).optional() });

function queryWithConversationContext(message: string, history: Array<{ role: "user" | "assistant"; content: string }>) {
  if (!/\b(about him|about her|about them|about that|he is|she is|they are|what happened|any news|latest news|more about|additional context)\b/i.test(message)) return message;
  const context = history.slice().reverse().find((item) => item.role === "user" && item.content.trim());
  return context ? `${message} (The person or subject is from the earlier question: ${context.content.slice(0, 500)})` : message;
}

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return Response.json({ error: "Please log in to use Gold AI." }, { status: 401 });
    const idToken = authorization.slice(7);
    const uid = await verifyFirebaseToken(idToken);
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message || "Please check your request." }, { status: 400 });
    const ownedFiles = await Promise.all(parsed.data.attachmentIds.map((id) => getUserFile(uid, id)));
    if (ownedFiles.some((file) => !file)) return Response.json({ error: "One or more attachments are unavailable." }, { status: 400 });
    const attachments = ownedFiles.filter((file): file is NonNullable<typeof file> => Boolean(file)).map((file) => ({ id: file.id, fileName: file.fileName, fileType: file.fileType, mimeType: file.mimeType, size: file.size, url: file.url, thumbnailUrl: file.thumbnailUrl, imageKitFileId: file.imageKitFileId })) satisfies MessageAttachment[];
    const documents = attachments.filter((attachment) => attachment.fileType === "document");
    if (documents.some((document) => document.mimeType === "application/pdf")) return Response.json({ error: "PDF analysis is not available yet. Upload an image or text file instead." }, { status: 400 });
    const textDocuments = await Promise.all(documents.filter((document) => document.mimeType === "text/plain").map(async (document) => { const response = await fetch(document.url); return response.ok ? `${document.fileName}:\n${(await response.text()).slice(0, 12000)}` : ""; }));
    const documentContext = textDocuments.filter(Boolean).length ? `\n\nUploaded text files:\n${textDocuments.filter(Boolean).join("\n\n")}` : "";
    const creditCost = attachments.length ? creditConfig.featureCosts.multimodalChat : creditConfig.featureCosts.basicChat;
    const reservation = await reserveCredits(uid, parsed.data.requestId, creditCost);
    if (reservation.status === "duplicate") return Response.json({ error: "This request has already been processed." }, { status: 409 });
    if (reservation.status === "insufficient") return Response.json({ error: "You don't have enough credits for this request." }, { status: 402 });
    const profile = await loadAIProfile(uid, idToken);
    const studyContext: StudyContext | undefined = parsed.data.studyContext ? sanitizeStudyContext(parsed.data.studyContext) : undefined;
    const historyContext = parsed.data.history.length > 0 ? `\n\nRecent conversation context:\n${parsed.data.history.map(({ role, content }) => `${role}: ${content}`).join("\n")}` : "";
    try {
      const researchQuery = queryWithConversationContext(parsed.data.message, parsed.data.history);
      const plan = planSourceQuery(researchQuery);
      const shouldRetrieve = plan.requiresFreshness || plan.imageSearchUseful || ["academic", "technical", "health", "finance", "news", "people", "business"].includes(plan.queryType);
      const intelligence = shouldRetrieve ? await retrieveSourceIntelligence(researchQuery, parsed.data.requestId).catch((retrievalError) => { console.warn("Gold AI optional retrieval failed", { requestId: parsed.data.requestId, error: retrievalError instanceof Error ? retrievalError.message : "unknown error" }); return { plan, sources: [], images: [] }; }) : { plan, sources: [], images: [] };
      if (process.env.NODE_ENV !== "production") console.info("[Gold AI Source Intelligence]", { requestId: parsed.data.requestId, query: researchQuery, classification: plan.queryType, requiresFreshness: plan.requiresFreshness, sourcesFound: intelligence.sources.length, imagesFound: intelligence.images.length });
      const retrievalContext = intelligence.sources.length > 0 ? `\n\nRetrieved web research for this query on ${new Date().toISOString().slice(0, 10)}. Prefer these sources over remembered knowledge. Use only source-supported current claims, include publication/retrieval dates when discussing wealth, prices, roles, or other changing facts, cite claims as [1], [2], and explicitly explain disagreements rather than silently merging estimates. Image results are visual context only, not factual evidence.\n\n${sourceContext(intelligence.sources)}` : intelligence.plan.requiresFreshness ? `\n\nCurrent information could not be retrieved reliably. Be transparent about uncertainty and do not present remembered information as verified current fact. The current date is ${new Date().toISOString().slice(0, 10)}.` : "";
      const response = await generateAIResponse({ message: `${parsed.data.message}${historyContext}${retrievalContext}${documentContext}`, language: parsed.data.language, attachments, profile: profile ? { userGroup: profile.userGroup, country: profile.country, preferredLanguage: profile.preferredLanguage, educationLevel: profile.educationLevel, classOrYear: profile.classOrYear, programme: profile.programme } : undefined, studyContext });
      const responseImages = await retrieveImagesForResponse(researchQuery, response.text, parsed.data.requestId).catch((imageError) => { console.warn("Gold AI optional response image retrieval failed", { requestId: parsed.data.requestId, error: imageError instanceof Error ? imageError.message : "unknown error" }); return []; });
      try { await finalizeCredits(uid, parsed.data.requestId, { provider: response.provider, model: response.model, inputTokens: response.usage?.inputTokens, outputTokens: response.usage?.outputTokens, totalTokens: response.usage?.totalTokens }, creditCost); }
      catch (creditError) { console.error("Gold AI credit finalization failed", { requestId: parsed.data.requestId, error: creditError instanceof Error ? creditError.message : "unknown error" }); }
      return Response.json({ ...response, sources: intelligence.sources, images: responseImages, creditsConsumed: creditCost, balance: reservation.account?.balance });
    } catch (providerError) {
      try { await refundReservedCredits(uid, parsed.data.requestId); }
      catch (refundError) { console.error("Gold AI credit refund failed", { requestId: parsed.data.requestId, error: refundError instanceof Error ? refundError.message : "unknown error" }); }
      throw providerError;
    }
  } catch (error) {
    console.error("Gold AI request failed", { error: error instanceof Error ? error.message : "unknown error" });
    return Response.json({ error: "Gold AI is having trouble responding right now. Please try again in a moment." }, { status: 503 });
  }
}
