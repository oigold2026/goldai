import { z } from "zod";
import { verifyFirebaseToken } from "../../../../lib/ai/auth-server";
import { recordStudyActivity } from "../../../../lib/study/service";

export const runtime = "nodejs";

const activitySchema = z.object({
  action: z.enum(["explain", "practice", "quiz", "summarize", "plan", "check"]),
  subject: z.string().trim().max(120).optional(),
  topic: z.string().trim().max(240).optional(),
});

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return Response.json({ error: "Please log in to start a study task." }, { status: 401 });
    const uid = await verifyFirebaseToken(authorization.slice(7).trim());
    const parsed = activitySchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Please choose a valid study task." }, { status: 400 });
    const activity = await recordStudyActivity(uid, parsed.data);
    return Response.json({ activity }, { status: 201 });
  } catch (error) {
    console.error("Gold AI study activity failed", { error: error instanceof Error ? error.message : "unknown error" });
    return Response.json({ error: "Unable to start this study task right now." }, { status: 503 });
  }
}
