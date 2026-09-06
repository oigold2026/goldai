import { z } from "zod";
import { verifyFirebaseToken } from "../../../../lib/ai/auth-server";
import { completeStudyPlan, listStudyPlans, recordStudyPlan } from "../../../../lib/study/service";

export const runtime = "nodejs";

const createSchema = z.object({
  title: z.string().trim().min(1, "Please name your study plan.").max(200),
  subject: z.string().trim().max(200).optional(),
  topic: z.string().trim().max(240).optional(),
  goal: z.string().trim().max(1000).optional(),
  durationDays: z.number().int().min(1).max(365),
  conversationId: z.string().trim().max(200).optional(),
  educationLevel: z.string().trim().max(200).optional(),
  country: z.string().trim().max(200).optional(),
  curriculumId: z.string().trim().max(120).optional(),
  curriculumLabel: z.string().trim().max(200).optional(),
});

const patchSchema = z.object({ planId: z.string().trim().min(1).max(200) });

export async function GET(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return Response.json({ error: "Please log in to view your study plans." }, { status: 401 });
    const uid = await verifyFirebaseToken(authorization.slice(7).trim());
    return Response.json({ plans: await listStudyPlans(uid) });
  } catch (error) {
    console.error("Gold AI study plans list failed", { error: error instanceof Error ? error.message : "unknown error" });
    return Response.json({ error: "Unable to load your study plans right now." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return Response.json({ error: "Please log in to create a study plan." }, { status: 401 });
    const uid = await verifyFirebaseToken(authorization.slice(7).trim());
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message || "Please check your study plan." }, { status: 400 });
    const plan = await recordStudyPlan(uid, parsed.data);
    return Response.json({ plan }, { status: 201 });
  } catch (error) {
    console.error("Gold AI study plan creation failed", { error: error instanceof Error ? error.message : "unknown error" });
    return Response.json({ error: "Unable to create this study plan right now." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return Response.json({ error: "Please log in to update a study plan." }, { status: 401 });
    const uid = await verifyFirebaseToken(authorization.slice(7).trim());
    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Please choose a valid study plan." }, { status: 400 });
    const plan = await completeStudyPlan(uid, parsed.data.planId);
    if (!plan) return Response.json({ error: "That study plan was not found." }, { status: 404 });
    return Response.json({ plan });
  } catch (error) {
    console.error("Gold AI study plan update failed", { error: error instanceof Error ? error.message : "unknown error" });
    return Response.json({ error: "Unable to update this study plan right now." }, { status: 503 });
  }
}