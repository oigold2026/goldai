import { z } from "zod";
import { verifyFirebaseToken } from "../../../../lib/ai/auth-server";
import { deleteStudyActivity, touchStudyActivity } from "../../../../lib/study/service";

export const runtime = "nodejs";

const patchSchema = z.object({
  lastAccessed: z.boolean().optional(),
});

export async function DELETE(request: Request, { params }: { params: Promise<{ studyId: string }> }) {
  try {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return Response.json({ error: "Please log in to delete a recent study." }, { status: 401 });
    const uid = await verifyFirebaseToken(authorization.slice(7).trim());
    const { studyId } = await params;
    if (typeof studyId !== "string" || !studyId.trim()) return Response.json({ error: "Invalid study." }, { status: 400 });
    await deleteStudyActivity(uid, studyId);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Gold AI delete recent study failed", { error: error instanceof Error ? error.message : "unknown error" });
    return Response.json({ error: "Unable to delete this recent study right now." }, { status: 503 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ studyId: string }> }) {
  try {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return Response.json({ error: "Please log in to update a recent study." }, { status: 401 });
    const uid = await verifyFirebaseToken(authorization.slice(7).trim());
    const { studyId } = await params;
    if (typeof studyId !== "string" || !studyId.trim()) return Response.json({ error: "Invalid study." }, { status: 400 });
    const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));
    if (parsed.success && parsed.data.lastAccessed !== false) {
      await touchStudyActivity(uid, studyId);
    }
    return Response.json({ success: true });
  } catch (error) {
    console.error("Gold AI touch recent study failed", { error: error instanceof Error ? error.message : "unknown error" });
    return Response.json({ error: "Unable to update this recent study right now." }, { status: 503 });
  }
}