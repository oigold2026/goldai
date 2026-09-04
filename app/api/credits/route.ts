import { listCreditData, getOrCreateCreditAccount } from "../../../lib/credits/service";
import { verifyFirebaseToken } from "../../../lib/ai/auth-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return Response.json({ error: "Please log in to view your credits." }, { status: 401 });
    const uid = await verifyFirebaseToken(authorization.slice(7));
    await getOrCreateCreditAccount(uid);
    const data = await listCreditData(uid);
    return Response.json(data);
  } catch (error) {
    console.error("Gold AI credits request failed", { error: error instanceof Error ? error.message : "unknown error" });
    return Response.json({ error: "Unable to verify your credits right now. Please try again." }, { status: 503 });
  }
}
