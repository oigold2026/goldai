import { z } from "zod";
import { generateAIResponse } from "../../../lib/ai";
import { loadAIProfile, verifyFirebaseToken } from "../../../lib/ai/auth-server";
import { creditConfig } from "../../../lib/credits/config";
import { finalizeCredits, refundReservedCredits, reserveCredits } from "../../../lib/credits/service";
import { listStudyActivity, recordStudyActivity } from "../../../lib/study/service";
import type { StudyAction } from "../../../types/study";

export const runtime = "nodejs";

const requestSchema = z.object({
  requestId: z.string().uuid(),
  action: z.enum(["explain", "practice", "quiz", "summarize", "plan", "check"]),
  subject: z.string().trim().max(120).optional(),
  topic: z.string().trim().max(240).optional(),
  level: z.string().trim().max(80).optional(),
  difficulty: z.string().trim().max(40).optional(),
  questionCount: z.number().int().min(1).max(20).optional(),
  questionType: z.string().trim().max(40).optional(),
  content: z.string().trim().max(16000).optional(),
  answer: z.string().trim().max(8000).optional(),
  goal: z.string().trim().max(4000).optional(),
  availableTime: z.string().trim().max(120).optional(),
  targetDate: z.string().trim().max(80).optional(),
});

const actionPrompts: Record<StudyAction, (input: z.infer<typeof requestSchema>) => string> = {
  explain: (input) => `Explain ${input.topic || "this topic"}${input.subject ? ` in ${input.subject}` : ""}${input.level ? ` for a ${input.level} learner` : ""}. Structure the answer with a simple explanation, key ideas, a step-by-step explanation, an example, one common mistake, and a quick check.`,
  practice: (input) => `Create ${input.questionCount || 5} ${input.questionType || "mixed"} practice questions about ${input.topic || "the topic"}${input.subject ? ` in ${input.subject}` : ""}${input.level ? ` for ${input.level}` : ""}${input.difficulty ? ` at ${input.difficulty} difficulty` : ""}. Return numbered questions and include an answer key with brief explanations.`,
  quiz: (input) => `Create a quiz of ${input.questionCount || 5} multiple-choice questions about ${input.topic || "the topic"}${input.subject ? ` in ${input.subject}` : ""}${input.level ? ` for ${input.level}` : ""}${input.difficulty ? ` at ${input.difficulty} difficulty` : ""}. Clearly number each question, give four options, then provide an answer key and explanations.`,
  summarize: (input) => `Summarize the following learning material for revision. Include a short summary, key points, important terms, and revision points.\n\n${input.content || "No learning material was provided."}`,
  plan: (input) => `Create a practical study plan. Goal: ${input.goal || "improve understanding"}. Subject: ${input.subject || "general study"}. Topics: ${input.topic || "not specified"}. Available time: ${input.availableTime || "not specified"}. Target date: ${input.targetDate || "not specified"}. Include realistic sessions with topics and durations.`,
  check: (input) => `Check this learner answer. Topic: ${input.topic || "not specified"}. Question or reference material: ${input.content || "not specified"}. Learner answer: ${input.answer || "not provided"}. Say whether it is correct, explain why, show the correct approach, identify mistakes, and give a useful hint.`,
};

const costs: Record<StudyAction, number> = {
  explain: creditConfig.featureCosts.studyExplain,
  practice: creditConfig.featureCosts.studyPractice,
  quiz: creditConfig.featureCosts.studyQuiz,
  summarize: creditConfig.featureCosts.studySummary,
  plan: creditConfig.featureCosts.studyPlan,
  check: creditConfig.featureCosts.studyCheck,
};

export async function POST(request: Request) {
  let uid = "";
  let requestId = "";
  try {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return Response.json({ error: "Please log in to use Study." }, { status: 401 });
    const idToken = authorization.slice(7).trim();
    uid = await verifyFirebaseToken(idToken);
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message || "Please check your study request." }, { status: 400 });
    requestId = parsed.data.requestId;
    const cost = costs[parsed.data.action];
    const reservation = await reserveCredits(uid, requestId, cost);
    if (reservation.status === "duplicate") return Response.json({ error: "This study request has already been processed." }, { status: 409 });
    if (reservation.status === "insufficient") return Response.json({ error: "You don't have enough credits for this study request." }, { status: 402 });
    try {
      const profile = await loadAIProfile(uid, idToken);
      const response = await generateAIResponse({ message: actionPrompts[parsed.data.action](parsed.data), language: profile?.preferredLanguage, profile: profile ? { userGroup: profile.userGroup, country: profile.country, preferredLanguage: profile.preferredLanguage, educationLevel: profile.educationLevel, classOrYear: profile.classOrYear, programme: profile.programme } : undefined });
      await finalizeCredits(uid, requestId, { provider: response.provider, model: response.model, inputTokens: response.usage?.inputTokens, outputTokens: response.usage?.outputTokens, totalTokens: response.usage?.totalTokens }, cost);
      const activity = await recordStudyActivity(uid, { action: parsed.data.action, subject: parsed.data.subject, topic: parsed.data.topic });
      return Response.json({ ...response, activity, creditsConsumed: cost, balance: reservation.account?.balance });
    } catch (providerError) {
      await refundReservedCredits(uid, requestId);
      throw providerError;
    }
  } catch (error) {
    console.error("Gold AI study request failed", { uid: uid || "anonymous", requestId: requestId || "unknown", error: error instanceof Error ? error.message : "unknown error" });
    return Response.json({ error: "Gold AI could not complete this study request. Please try again." }, { status: 503 });
  }
}

export async function GET(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return Response.json({ error: "Please log in to view study history." }, { status: 401 });
    const uid = await verifyFirebaseToken(authorization.slice(7).trim());
    return Response.json({ activities: await listStudyActivity(uid) });
  } catch (error) {
    console.error("Gold AI study history failed", { error: error instanceof Error ? error.message : "unknown error" });
    return Response.json({ error: "Unable to load study history right now." }, { status: 503 });
  }
}