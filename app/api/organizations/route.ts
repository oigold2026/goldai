import { z } from "zod";
import { verifyFirebaseToken } from "../../../lib/ai/auth-server";
import { createOrganization, listUserOrganizations } from "../../../lib/organization/service";
import { isOrganizationType } from "../../../lib/organization/config";
import type { OrganizationType } from "../../../types/organization";

export const runtime = "nodejs";
const schema = z.object({ name: z.string().trim().min(2).max(160), type: z.string(), country: z.string().trim().max(120).optional(), currency: z.string().trim().length(3).default("UGX") });
function token(request: Request) { const authorization = request.headers.get("authorization"); if (!authorization?.startsWith("Bearer ")) throw new Error("UNAUTHORIZED"); return authorization.slice(7).trim(); }
function errorResponse(error: unknown, fallback: string) { if (error instanceof Error && error.message === "UNAUTHORIZED") return Response.json({ error: "Please log in to continue." }, { status: 401 }); console.error("Gold AI organization request failed", { error: error instanceof Error ? error.message : "unknown error" }); return Response.json({ error: fallback }, { status: 503 }); }
export async function GET(request: Request) { try { return Response.json({ organizations: await listUserOrganizations(await verifyFirebaseToken(token(request))) }); } catch (error) { return errorResponse(error, "Unable to load your organizations right now."); } }
export async function POST(request: Request) { try { const uid = await verifyFirebaseToken(token(request)); const parsed = schema.safeParse(await request.json()); if (!parsed.success || !isOrganizationType(parsed.data.type)) return Response.json({ error: "Please provide a valid organization name and type." }, { status: 400 }); return Response.json({ organization: await createOrganization(uid, { ...parsed.data, type: parsed.data.type as OrganizationType }) }, { status: 201 }); } catch (error) { return errorResponse(error, "Unable to create this organization right now."); } }
