import { findPaymentByReference, verifyAndCompletePayment } from "../../../../../lib/payments/pesapal";

export const runtime = "nodejs";

async function handleCallback(request: Request) {
  const url = new URL(request.url);
  let body: { OrderTrackingId?: string; OrderMerchantReference?: string } = {};
  if (request.method === "POST") {
    try { body = await request.json() as typeof body; } catch { body = {}; }
  }
  const trackingId = body.OrderTrackingId || url.searchParams.get("OrderTrackingId") || url.searchParams.get("orderTrackingId") || undefined;
  const merchantReference = body.OrderMerchantReference || url.searchParams.get("OrderMerchantReference") || url.searchParams.get("orderMerchantReference") || undefined;
  if (!merchantReference) return Response.json({ error: "Invalid payment notification." }, { status: 400 });
  try {
    const match = await findPaymentByReference(merchantReference);
    if (!match || (trackingId && match.payment.pesapalOrderTrackingId && match.payment.pesapalOrderTrackingId !== trackingId)) return Response.json({ error: "Payment not found." }, { status: 404 });
    const payment = await verifyAndCompletePayment(match.payment.id, trackingId);
    if (request.method === "GET") return Response.redirect(new URL(`/credits?payment=${encodeURIComponent(payment.id)}`, request.url));
    return Response.json({ status: payment.status });
  } catch (error) {
    console.error("Gold AI payment callback failed", { error: error instanceof Error ? error.message : "unknown error" });
    return Response.json({ error: "Payment verification is temporarily unavailable." }, { status: 503 });
  }
}

export async function GET(request: Request) { return handleCallback(request); }
export async function POST(request: Request) { return handleCallback(request); }
