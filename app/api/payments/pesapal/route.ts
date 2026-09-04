import { getFirebaseAdmin } from "../../../../lib/firebase-admin";
import { createPesapalPayment, listPayments, PaymentServiceError, verifyAndCompletePayment } from "../../../../lib/payments/pesapal";
import { verifyFirebaseToken } from "../../../../lib/ai/auth-server";

export const runtime = "nodejs";

async function authenticatedUid(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) throw new Error("UNAUTHORIZED");
  const token = authorization.slice(7).trim();
  if (!token) throw new Error("UNAUTHORIZED");
  try { return await verifyFirebaseToken(token); }
  catch { throw new Error("UNAUTHORIZED"); }
}

function failureResponse(error: unknown, fallback: string) {
  if (error instanceof Error && error.message === "UNAUTHORIZED") return Response.json({ error: "Please log in to continue." }, { status: 401 });
  if (error instanceof PaymentServiceError) return Response.json({ error: error.status === 400 || error.status === 500 ? error.message : fallback }, { status: error.status });
  return Response.json({ error: fallback }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const uid = await authenticatedUid(request);
    const paymentId = new URL(request.url).searchParams.get("paymentId");
    if (paymentId) {
      const ownedPayment = (await listPayments(uid)).find((payment) => payment.id === paymentId);
      if (!ownedPayment) return Response.json({ error: "Payment not found." }, { status: 404 });
      const result = await verifyAndCompletePayment(paymentId);
      return Response.json({ payment: result });
    }
    return Response.json({ payments: await listPayments(uid) });
  } catch (error) {
    console.error("Gold AI payment status request failed", { error: error instanceof Error ? error.message : "unknown error" });
    return failureResponse(error, "Unable to verify this payment right now.");
  }
}

export async function POST(request: Request) {
  try {
    const uid = await authenticatedUid(request);
    const body = await request.json() as { packageId?: string };
    if (!body.packageId) return Response.json({ error: "Choose a credit package first." }, { status: 400 });
    const { auth } = getFirebaseAdmin();
    const user = await auth.getUser(uid);
    const result = await createPesapalPayment(uid, body.packageId, { email: user.email || "", firstName: user.displayName?.split(" ")[0], lastName: user.displayName?.split(" ").slice(1).join(" ") });
    return Response.json(result, { status: 201 });
  } catch (error) {
    console.error("Gold AI payment creation failed", { error: error instanceof Error ? error.message : "unknown error" });
    return failureResponse(error, "Unable to start payment right now. Please try again.");
  }
}
