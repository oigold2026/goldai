import { z } from "zod";
import { verifyFirebaseToken } from "../../../lib/ai/auth-server";
import { getFirebaseAdmin } from "../../../lib/firebase-admin";

export const runtime = "nodejs";

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  photoURL: z.string().trim().max(2000).nullable().optional(),
  country: z.string().trim().max(120).optional(),
  userGroup: z.enum(["student", "university_student", "teacher", "researcher", "general"]).optional(),
  preferredLanguage: z.string().trim().max(80).optional(),
  educationLevel: z.string().trim().max(120).optional(),
  classOrYear: z.string().trim().max(80).optional(),
  institution: z.string().trim().max(120).optional(),
  programme: z.string().trim().max(120).optional(),
  subjects: z.array(z.string().trim().max(120)).max(30).optional(),
  interests: z.string().trim().max(240).optional(),
  researchType: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(1000).optional(),
  onboardingCompleted: z.boolean().optional(),
}).strict();

const protectedProfileFields = new Set(["uid", "email", "createdAt", "updatedAt", "role", "admin", "accountFlags", "credits", "monthlyFreeCredits", "monthlyFreeUsed", "purchasedCredits", "totalUsed", "paymentStatus", "payments", "creditTransactions"]);

function tokenFrom(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) throw new Error("UNAUTHORIZED");
  return authorization.slice(7).trim();
}

function sanitizeProfileInput(input: unknown) {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) throw new Error("INVALID_PROFILE");
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value === undefined) continue;
    if (protectedProfileFields.has(key)) continue;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) continue;
      result[key] = trimmed;
      continue;
    }
    if (Array.isArray(value)) {
      result[key] = value.map((item) => String(item).trim()).filter(Boolean).slice(0, 30);
      continue;
    }
    result[key] = value;
  }
  return result;
}

function friendlyError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message === "UNAUTHORIZED") return Response.json({ error: "Please log in to update your profile." }, { status: 401 });
  if (error instanceof Error && error.message === "INVALID_PROFILE") return Response.json({ error: "Please check your profile details." }, { status: 400 });
  console.error("Gold AI profile API failed", { error: error instanceof Error ? error.message : "unknown error" });
  return Response.json({ error: fallback }, { status: 503 });
}

export async function POST(request: Request) {
  try {
    const idToken = tokenFrom(request);
    const uid = await verifyFirebaseToken(idToken);
    const { database, auth } = getFirebaseAdmin();
    const firebaseUser = await auth.getUser(uid);
    const canonicalEmail = (firebaseUser.email || "").trim().toLowerCase();
    if (!canonicalEmail) return Response.json({ error: "We could not determine your account email." }, { status: 400 });
    const profileRef = database.ref(`users/${uid}`);
    const existing = await profileRef.once("value");
    if (existing.exists()) return Response.json({ profile: existing.val() });
    const payload = sanitizeProfileInput(await request.json());
    const now = Date.now();
    const profile = { ...payload, uid, email: canonicalEmail, createdAt: now, updatedAt: now };
    await profileRef.set(profile);
    return Response.json({ profile }, { status: 201 });
  } catch (error) {
    return friendlyError(error, "Unable to create your profile right now.");
  }
}

export async function PATCH(request: Request) {
  try {
    const uid = await verifyFirebaseToken(tokenFrom(request));
    const { database, auth } = getFirebaseAdmin();
    const firebaseUser = await auth.getUser(uid);
    const canonicalEmail = (firebaseUser.email || "").trim().toLowerCase();
    const parsed = sanitizeProfileInput(await request.json());
    const profileRef = database.ref(`users/${uid}`);
    const existing = await profileRef.once("value");
    if (!existing.exists()) return Response.json({ error: "Your profile has not been created yet." }, { status: 404 });
    const safeProfile = { ...existing.val(), ...parsed, uid, email: canonicalEmail, updatedAt: Date.now() };
    await profileRef.update(safeProfile);
    return Response.json({ profile: safeProfile });
  } catch (error) {
    return friendlyError(error, "Unable to update your profile right now.");
  }
}
