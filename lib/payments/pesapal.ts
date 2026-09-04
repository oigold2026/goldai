import { randomUUID } from "node:crypto";
import { getFirebaseAdmin } from "../firebase-admin";
import { getCreditPackage } from "../credits/packages";
import { getOrCreateCreditAccount } from "../credits/service";
import type { CreditAccount, CreditTransaction } from "../../types/credits";
import type { PaymentRecord, PaymentStatus } from "../../types/payments";

const sandboxUrl = "https://cybqa.pesapal.com/pesapalv3";
const productionUrl = "https://pay.pesapal.com/v3";

type PesaPalConfig = { baseUrl: string; key: string; secret: string; ipnUrl: string };
type PesaPalStatus = { payment_status_description?: string; payment_status_code?: number | string; status_code?: number | string };
export class PaymentServiceError extends Error { constructor(message: string, public readonly status: 400 | 502 | 503 | 500) { super(message); } }

function config(): PesaPalConfig {
  const key = process.env.PESAPAL_CONSUMER_KEY?.trim();
  const secret = process.env.PESAPAL_CONSUMER_SECRET?.trim();
  const ipnUrl = process.env.PESAPAL_IPN_URL?.trim();
  if (!key || !secret || !ipnUrl) throw new PaymentServiceError("PesaPal is not configured.", 500);
  let parsedUrl: URL;
  try { parsedUrl = new URL(ipnUrl); } catch { throw new PaymentServiceError("PesaPal IPN URL is invalid.", 500); }
  if (parsedUrl.protocol !== "https:" && process.env.NODE_ENV === "production") throw new PaymentServiceError("PesaPal IPN URL must use HTTPS in production.", 500);
  if (["localhost", "127.0.0.1", "::1"].includes(parsedUrl.hostname)) throw new PaymentServiceError("PesaPal IPN URL must be publicly reachable.", 500);
  const baseUrl = process.env.PESAPAL_BASE_URL?.trim() || (process.env.NODE_ENV === "production" ? productionUrl : sandboxUrl);
  return { baseUrl, key, secret, ipnUrl };
}

async function pesapalRequest<T>(path: string, init: RequestInit, token?: string) {
  const settings = config();
  let response: Response;
  try {
    response = await fetch(`${settings.baseUrl.replace(/\/$/, "")}${path}`, { ...init, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers } });
  } catch (error) {
    console.error("Gold AI PesaPal network request failed", { path, error: error instanceof Error ? error.message : "unknown error" });
    throw new PaymentServiceError("PesaPal service is unavailable.", 503);
  }
  if (!response.ok) {
    const responseText = await response.text();
    console.error("Gold AI PesaPal request failed", { path, status: response.status, response: responseText.slice(0, 300) });
    throw new PaymentServiceError("PesaPal service rejected the request.", response.status >= 500 ? 503 : 502);
  }
  return await response.json() as T;
}

async function requestToken() {
  const settings = config();
  const data = await pesapalRequest<{ token?: string }>("/api/Auth/RequestToken", { method: "POST", body: JSON.stringify({ consumer_key: settings.key, consumer_secret: settings.secret }) });
  if (!data.token) throw new PaymentServiceError("PesaPal authentication failed.", 502);
  return data.token;
}

function mapStatus(data: PesaPalStatus): PaymentStatus {
  const description = String(data.payment_status_description || "").toLowerCase();
  const code = String(data.payment_status_code ?? data.status_code ?? "");
  if (code === "1" || description.includes("completed") || description.includes("success")) return "completed";
  if (description.includes("cancel")) return "cancelled";
  if (description.includes("fail") || description.includes("invalid")) return "failed";
  return "pending";
}

export async function createPesapalPayment(uid: string, packageId: string, customer: { email: string; firstName?: string; lastName?: string; phone?: string }) {
  const creditPackage = getCreditPackage(packageId);
  if (!creditPackage) throw new PaymentServiceError("That credit package is unavailable.", 400);
  const settings = config();
  console.info("Gold AI payment request received", { uid, packageId, packageFound: true });
  const { database } = getFirebaseAdmin();
  const paymentId = randomUUID();
  const merchantReference = `GOLD-${randomUUID().replaceAll("-", "").slice(0, 20).toUpperCase()}`;
  const now = Date.now();
  const payment: PaymentRecord = { id: paymentId, userId: uid, packageId: creditPackage.id, amount: creditPackage.amount, currency: creditPackage.currency, credits: creditPackage.credits, status: "pending", merchantReference, createdAt: now, updatedAt: now };
  await database.ref(`payments/${uid}/${paymentId}`).set(payment);
  console.info("Gold AI pending payment record created", { uid, paymentId });
  try {
    const token = await requestToken();
    const ipn = process.env.PESAPAL_IPN_ID ? { ipn_id: process.env.PESAPAL_IPN_ID } : await pesapalRequest<{ ipn_id?: string }>("/api/URLSetup/RegisterIPN", { method: "POST", body: JSON.stringify({ url: settings.ipnUrl, ipn_notification_type: "POST" }) }, token);
    if (!ipn.ipn_id) throw new PaymentServiceError("PesaPal notification setup failed.", 502);
    const order = await pesapalRequest<{ order_tracking_id?: string; redirect_url?: string }>("/api/Transactions/SubmitOrderRequest", { method: "POST", body: JSON.stringify({ id: merchantReference, currency: creditPackage.currency, amount: creditPackage.amount, description: `${creditPackage.name} credit package`, callback_url: settings.ipnUrl, notification_id: ipn.ipn_id, billing_address: { email_address: customer.email, first_name: customer.firstName || "Gold AI", last_name: customer.lastName || "User", phone_number: customer.phone || undefined } }) }, token);
    if (!order.order_tracking_id || !order.redirect_url) throw new PaymentServiceError("PesaPal did not provide a checkout link.", 502);
    await database.ref(`payments/${uid}/${paymentId}`).update({ pesapalOrderTrackingId: order.order_tracking_id, updatedAt: Date.now() });
    return { success: true, paymentId, redirectUrl: order.redirect_url };
  } catch (error) {
    await database.ref(`payments/${uid}/${paymentId}`).update({ status: "failed", updatedAt: Date.now() });
    throw error;
  }
}

async function verifyWithPesapal(trackingId: string) {
  const token = await requestToken();
  return await pesapalRequest<PesaPalStatus>(`/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(trackingId)}`, { method: "GET" }, token);
}

export async function verifyAndCompletePayment(paymentId: string, trackingId?: string) {
  const { database } = getFirebaseAdmin();
  let uid = "";
  let record: PaymentRecord | null = null;
  const paymentsSnapshot = await database.ref("payments").once("value");
  for (const [candidateUid, candidatePayments] of Object.entries((paymentsSnapshot.val() || {}) as Record<string, Record<string, PaymentRecord>>)) {
    if (candidatePayments[paymentId]) { uid = candidateUid; record = candidatePayments[paymentId]; break; }
  }
  if (!uid || !record) throw new Error("Payment not found.");
  const actualTrackingId = trackingId || record.pesapalOrderTrackingId;
  if (!actualTrackingId) throw new Error("Payment tracking information is missing.");
  if (record.status === "completed") return record;
  const providerStatus = await verifyWithPesapal(actualTrackingId);
  const status = mapStatus(providerStatus);
  if (status !== "completed") {
    await database.ref(`payments/${uid}/${paymentId}`).update({ status, pesapalStatus: providerStatus.payment_status_description || String(providerStatus.payment_status_code || "pending"), updatedAt: Date.now() });
    return { ...record, status };
  }
  const account = await getOrCreateCreditAccount(uid);
  const accountRef = database.ref(`credits/${uid}`);
  let allocated = false;
  await accountRef.transaction((value: CreditAccount | null) => {
    const current = value || account;
    const processed = (current as CreditAccount & { processedPayments?: Record<string, boolean> }).processedPayments || {};
    if (processed[paymentId]) return current;
    allocated = true;
    return { ...current, balance: current.balance + record!.credits, purchasedCredits: current.purchasedCredits + record!.credits, updatedAt: Date.now(), processedPayments: { ...processed, [paymentId]: true } };
  });
  const completedPayment = { ...record, status: "completed" as const, pesapalOrderTrackingId: actualTrackingId, pesapalStatus: providerStatus.payment_status_description || "Completed", updatedAt: Date.now() };
  if (allocated) {
    const updatedAccount = (await accountRef.once("value")).val() as CreditAccount;
    const transactionId = randomUUID();
    const transaction: CreditTransaction = { id: transactionId, type: "purchase", amount: record.credits, balanceAfter: updatedAccount.balance, source: "pesapal", description: `${record.credits} credits purchased`, reference: paymentId, createdAt: Date.now() };
    await database.ref().update({ [`payments/${uid}/${paymentId}`]: completedPayment, [`creditTransactions/${uid}/${transactionId}`]: transaction });
  } else {
    await database.ref(`payments/${uid}/${paymentId}`).update(completedPayment);
  }
  return completedPayment;
}

export async function findPaymentByReference(merchantReference: string) {
  const { database } = getFirebaseAdmin();
  const snapshot = await database.ref("payments").once("value");
  for (const [uid, candidatePayments] of Object.entries((snapshot.val() || {}) as Record<string, Record<string, PaymentRecord>>)) {
    const payment = Object.values(candidatePayments).find((candidate) => candidate.merchantReference === merchantReference);
    if (payment) return { uid, payment };
  }
  return null;
}

export async function findPaymentByTrackingId(trackingId: string) {
  const { database } = getFirebaseAdmin();
  const snapshot = await database.ref("payments").once("value");
  for (const [uid, candidatePayments] of Object.entries((snapshot.val() || {}) as Record<string, Record<string, PaymentRecord>>)) {
    const payment = Object.values(candidatePayments).find((candidate) => candidate.pesapalOrderTrackingId === trackingId);
    if (payment) return { uid, payment };
  }
  return null;
}

export async function listPayments(uid: string) {
  const { database } = getFirebaseAdmin();
  const snapshot = await database.ref(`payments/${uid}`).once("value");
  return Object.values((snapshot.val() || {}) as Record<string, PaymentRecord>).sort((a, b) => b.createdAt - a.createdAt).slice(0, 30);
}

export { verifyWithPesapal, mapStatus };
