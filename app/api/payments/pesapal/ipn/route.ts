import { findPaymentByReference, findPaymentByTrackingId, verifyAndCompletePayment } from "../../../../../lib/payments/pesapal";

export const runtime = "nodejs";

type Notification = { OrderTrackingId?: string; OrderMerchantReference?: string };

async function readNotification(request: Request): Promise<Notification> {
  const url = new URL(request.url);
  const values: Notification = {
    OrderTrackingId: url.searchParams.get("OrderTrackingId") || url.searchParams.get("orderTrackingId") || undefined,
    OrderMerchantReference: url.searchParams.get("OrderMerchantReference") || url.searchParams.get("orderMerchantReference") || undefined,
  };
  if (request.method === "GET") return values;
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await request.json() as Notification;
    return { OrderTrackingId: body.OrderTrackingId || values.OrderTrackingId, OrderMerchantReference: body.OrderMerchantReference || values.OrderMerchantReference };
  }
  const form = new URLSearchParams(await request.text());
  return { OrderTrackingId: form.get("OrderTrackingId") || values.OrderTrackingId, OrderMerchantReference: form.get("OrderMerchantReference") || values.OrderMerchantReference };
}

async function handleIpn(request: Request) {
  try {
    const notification = await readNotification(request);
    const trackingId = notification.OrderTrackingId?.trim();
    const merchantReference = notification.OrderMerchantReference?.trim();
    if (!trackingId && !merchantReference) return Response.json({ error: "Invalid payment notification." }, { status: 400 });

    const match = merchantReference ? await findPaymentByReference(merchantReference) : await findPaymentByTrackingId(trackingId || "");
    if (!match) return Response.json({ error: "Payment not found." }, { status: 404 });
    if (trackingId && match.payment.pesapalOrderTrackingId && match.payment.pesapalOrderTrackingId !== trackingId) return Response.json({ error: "Payment notification mismatch." }, { status: 400 });

    const payment = await verifyAndCompletePayment(match.payment.id, trackingId);
    return Response.json({ status: payment.status });
  } catch (error) {
    console.error("Gold AI PesaPal IPN processing failed", { error: error instanceof Error ? error.message : "unknown error" });
    return Response.json({ error: "Payment verification is temporarily unavailable." }, { status: 503 });
  }
}

export async function GET(request: Request) { return handleIpn(request); }
export async function POST(request: Request) { return handleIpn(request); }