import { z } from "zod";
import { generateAIResponse } from "../../../lib/ai";
import { loadAIProfile, verifyFirebaseToken } from "../../../lib/ai/auth-server";
import { creditConfig } from "../../../lib/credits/config";
import { finalizeCredits, refundReservedCredits, reserveCredits } from "../../../lib/credits/service";
import { deleteTeacherMaterial, isTeacherToolType, listTeacherMaterials, saveTeacherMaterial, updateTeacherMaterial } from "../../../lib/teacher/service";
import type { TeacherToolType } from "../../../types/teacher";

export const runtime = "nodejs";

const requestSchema = z.object({ requestId: z.string().uuid(), type: z.string().trim(), subject: z.string().trim().min(1).max(160), topic: z.string().trim().min(1).max(240), classLevel: z.string().trim().max(120).optional(), curriculum: z.string().trim().max(160).optional(), instructions: z.string().trim().max(6000).optional(), duration: z.string().trim().max(80).optional(), objectives: z.string().trim().max(4000).optional(), questionCount: z.number().int().min(1).max(50).optional(), difficulty: z.string().trim().max(60).optional(), questionType: z.string().trim().max(80).optional(), content: z.string().max(30000).optional() });

function authToken(request: Request) { const authorization = request.headers.get("authorization"); if (!authorization?.startsWith("Bearer ")) throw new Error("UNAUTHORIZED"); return authorization.slice(7).trim(); }
function promptFor(input: z.infer<typeof requestSchema>, type: TeacherToolType) {
  const context = `Subject: ${input.subject}\nTopic: ${input.topic}\nClass or level: ${input.classLevel || "not specified"}\nCurriculum or context: ${input.curriculum || "not specified"}\nDuration: ${input.duration || "not specified"}\nLearning objectives: ${input.objectives || "not specified"}\nDifficulty: ${input.difficulty || "not specified"}\nAdditional instructions: ${input.instructions || "none"}`;
  const prompts: Record<TeacherToolType, string> = {
    lesson_plan: "Create a practical structured lesson plan with title, objectives, materials, previous knowledge, introduction, teacher activities, learner activities, guided practice, independent practice, assessment, conclusion, and homework.",
    teaching_material: "Create clear teacher notes or a classroom handout with headings, accurate explanations, examples, key terms, and a short recap.",
    questions: `Create ${input.questionCount || 10} ${input.questionType || "mixed"} questions. Keep questions learner-facing and provide a separate answer key only if requested in the instructions.`,
    answer_key: "Create an answer key for the supplied questions or topic. Number answers clearly and include brief explanations where useful.",
    assessment: `Build a ready-to-use assessment with instructions, sections, ${input.questionCount || 10} questions, marks, and an answer key at the end.`,
    rubric: "Create an editable rubric with criteria, performance levels, descriptions, and a suggested scoring structure.",
    classroom_activity: "Design a classroom activity with title, objective, materials, instructions, teacher role, learner role, expected outcome, timing, and assessment check.",
    explain_students: "Explain the concept for learners using clear language, step-by-step reasoning, examples, common misconceptions, and a quick understanding check.",
  };
  return `${prompts[type]}\n\nTeaching context:\n${context}${input.content ? `\n\nExisting questions or material:\n${input.content}` : ""}\n\nUse inclusive language and do not assume a country-specific curriculum. Return clean, well-structured Markdown.`;
}

export async function GET(request: Request) {
  try { return Response.json({ materials: await listTeacherMaterials(await verifyFirebaseToken(authToken(request))) }); }
  catch (error) { if (error instanceof Error && error.message === "UNAUTHORIZED") return Response.json({ error: "Please log in to view Teacher Tools." }, { status: 401 }); console.error("Gold AI teacher materials list failed", { error: error instanceof Error ? error.message : "unknown error" }); return Response.json({ error: "Unable to load teacher materials right now." }, { status: 503 }); }
}

export async function DELETE(request: Request) {
  try { const uid = await verifyFirebaseToken(authToken(request)); const id = new URL(request.url).searchParams.get("id"); if (!id) return Response.json({ error: "Material not found." }, { status: 400 }); await deleteTeacherMaterial(uid, id); return Response.json({ success: true }); }
  catch (error) { if (error instanceof Error && error.message === "UNAUTHORIZED") return Response.json({ error: "Please log in to continue." }, { status: 401 }); console.error("Gold AI teacher material deletion failed", { error: error instanceof Error ? error.message : "unknown error" }); return Response.json({ error: "Unable to delete this material." }, { status: 503 }); }
}

export async function PATCH(request: Request) {
  try { const uid = await verifyFirebaseToken(authToken(request)); const id = new URL(request.url).searchParams.get("id"); const body = await request.json() as { content?: string }; if (!id || typeof body.content !== "string") return Response.json({ error: "Material content is required." }, { status: 400 }); const material = await updateTeacherMaterial(uid, id, body.content); return material ? Response.json({ material }) : Response.json({ error: "Material not found." }, { status: 404 }); }
  catch (error) { if (error instanceof Error && error.message === "UNAUTHORIZED") return Response.json({ error: "Please log in to continue." }, { status: 401 }); console.error("Gold AI teacher material update failed", { error: error instanceof Error ? error.message : "unknown error" }); return Response.json({ error: "Unable to update this material." }, { status: 503 }); }
}

export async function POST(request: Request) {
  let uid = ""; let requestId = "";
  try {
    const idToken = authToken(request); uid = await verifyFirebaseToken(idToken); const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message || "Please check your teacher request." }, { status: 400 });
    if (!isTeacherToolType(parsed.data.type)) return Response.json({ error: "Choose a valid Teacher Tool." }, { status: 400 });
    requestId = parsed.data.requestId;
    const reservation = await reserveCredits(uid, requestId, creditConfig.featureCosts.teacherTools);
    if (reservation.status === "duplicate") return Response.json({ error: "This request has already been processed." }, { status: 409 });
    if (reservation.status === "insufficient") return Response.json({ error: "You need more credits for this Teacher Tool." }, { status: 402 });
    try {
      const profile = await loadAIProfile(uid, idToken);
      const response = await generateAIResponse({ message: promptFor(parsed.data, parsed.data.type), language: profile?.preferredLanguage, profile: profile ? { userGroup: profile.userGroup, country: profile.country, preferredLanguage: profile.preferredLanguage, educationLevel: profile.educationLevel, classOrYear: profile.classOrYear, programme: profile.programme } : undefined });
      await finalizeCredits(uid, requestId, { provider: response.provider, model: response.model, inputTokens: response.usage?.inputTokens, outputTokens: response.usage?.outputTokens, totalTokens: response.usage?.totalTokens }, creditConfig.featureCosts.teacherTools);
      const material = await saveTeacherMaterial(uid, { type: parsed.data.type, title: `${parsed.data.subject}: ${parsed.data.topic}`, subject: parsed.data.subject, topic: parsed.data.topic, classLevel: parsed.data.classLevel, content: response.text });
      return Response.json({ material, creditsConsumed: creditConfig.featureCosts.teacherTools });
    } catch (generationError) { await refundReservedCredits(uid, requestId); throw generationError; }
  } catch (error) { if (error instanceof Error && error.message === "UNAUTHORIZED") return Response.json({ error: "Please log in to use Teacher Tools." }, { status: 401 }); console.error("Gold AI teacher request failed", { uid: uid || "anonymous", requestId: requestId || "unknown", error: error instanceof Error ? error.message : "unknown error" }); return Response.json({ error: "Gold AI could not prepare that material right now." }, { status: 503 }); }
}
