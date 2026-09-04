import { randomUUID } from "node:crypto";
import { getFirebaseAdmin } from "../firebase-admin";
import { getCreditPackage } from "../credits/packages";
import { getOrCreateCreditAccount } from "../credits/service";
import type { CreditAccount, CreditTransaction } from "../../types/credits";
import type { PaymentRecord, PaymentStatus } from "../../types/payments";

const sandboxUrl = "https://cybqa.pesapal.com/pesapalv3";
const productionUrl = "https://pay.pesapal.com/v3";

type PesaPalEnvironment = "sandbox" | "live";
type PesaPalConfig = { baseUrl: string; environment: PesaPalEnvironment; key: string; secret: string; ipnUrl: string };
type PesaPalStatus = { payment_status_description?: string; payment_status_code?: number | string; status_code?: number | string };
export class PaymentServiceError extends Error { constructor(message: string, public readonly status: 400 | 502 | 503 | 500) { super(message); } }
class PesaPalApiError extends PaymentServiceError { constructor(message: string, status: 502 | 503, public readonly providerStatus: number, public readonly providerMessage?: unknown) { super(message, status); } }

const sensitiveResponseKeys = /token|secret|password|authorization|consumer[_-]?key|access[_-]?key|api[_-]?key/i;

function redactSensitiveResponse(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitiveResponse);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, sensitiveResponseKeys.test(key) ? "[REDACTED]" : redactSensitiveResponse(entry)]));
  }
  if (typeof value === "string") return value.length > 500 ? `${value.slice(0, 500)}...[truncated]` : value;
  return value;
}

function safeResponseBody(responseText: string) {
  try { return redactSensitiveResponse(JSON.parse(responseText)); }
  catch { return responseText.replace(/(token|secret|password|authorization|consumer[_-]?key|access[_-]?key|api[_-]?key)\s*[:=]\s*[^,\s}]+/gi, "$1=[REDACTED]").slice(0, 500); }
}

function config(): PesaPalConfig {
  const key = process.env.PESAPAL_CONSUMER_KEY?.trim();
  const secret = process.env.PESAPAL_CONSUMER_SECRET?.trim();
  const ipnUrl = process.env.PESAPAL_IPN_URL?.trim();
  const requestedEnvironment = process.env.PESAPAL_ENVIRONMENT?.trim().toLowerCase();
  if (!key || !secret || !ipnUrl) throw new PaymentServiceError("PesaPal is not configured.", 500);
  if (requestedEnvironment && requestedEnvironment !== "sandbox" && requestedEnvironment !== "live") throw new PaymentServiceError("PESAPAL_ENVIRONMENT must be sandbox or live.", 500);
  let parsedUrl: URL;
  try { parsedUrl = new URL(ipnUrl); } catch { throw new PaymentServiceError("PesaPal IPN URL is invalid.", 500); }
  if (parsedUrl.protocol !== "https:" && process.env.NODE_ENV === "production") throw new PaymentServiceError("PesaPal IPN URL must use HTTPS in production.", 500);
  if (["localhost", "127.0.0.1", "::1"].includes(parsedUrl.hostname)) throw new PaymentServiceError("PesaPal IPN URL must be publicly reachable.", 500);
  const baseUrl = process.env.PESAPAL_BASE_URL?.trim() || (requestedEnvironment === "live" ? productionUrl : sandboxUrl);
  let parsedBaseUrl: URL;
  try { parsedBaseUrl = new URL(baseUrl); } catch { throw new PaymentServiceError("PESAPAL_BASE_URL is invalid.", 500); }
  const sandboxHostname = new URL(sandboxUrl).hostname;
  const productionHostname = new URL(productionUrl).hostname;
  if (![sandboxHostname, productionHostname].includes(parsedBaseUrl.hostname)) throw new PaymentServiceError("PESAPAL_BASE_URL must use the official PesaPal API host.", 500);
  const baseEnvironment: PesaPalEnvironment = parsedBaseUrl.hostname === productionHostname ? "live" : "sandbox";
  if (requestedEnvironment && requestedEnvironment !== baseEnvironment) throw new PaymentServiceError("PESAPAL_ENVIRONMENT and PESAPAL_BASE_URL do not match.", 500);
  const environment: PesaPalEnvironment = requestedEnvironment === "live" || baseEnvironment === "live" ? "live" : "sandbox";
  const expectedHostname = environment === "live" ? new URL(productionUrl).hostname : new URL(sandboxUrl).hostname;
  if (parsedBaseUrl.hostname !== expectedHostname) throw new PaymentServiceError("PESAPAL_ENVIRONMENT and PESAPAL_BASE_URL do not match.", 500);
  return { baseUrl, environment, key, secret, ipnUrl };
}

async function pesapalRequest<T>(path: string, init: RequestInit, token?: string) {
  const settings = config();
  let response: Response;
  try {
    response = await fetch(`${settings.baseUrl.replace(/\/$/, "")}${path}`, { ...init, headers: { Accept: "application/json", "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers } });
  } catch (error) {
    console.error("Gold AI PesaPal network request failed", { path, environment: settings.environment, hostname: new URL(settings.baseUrl).hostname, error: error instanceof Error ? error.message : "unknown error" });
    throw new PaymentServiceError("PesaPal service is unavailable.", 503);
  }
  if (!response.ok) {
    const responseText = await response.text();
    const safeBody = safeResponseBody(responseText);
    const providerMessage = typeof safeBody === "object" && safeBody !== null ? Object.entries(safeBody as Record<string, unknown>).filter(([key]) => /message|error|status|description|detail|code/i.test(key)).slice(0, 8) : safeBody;
    console.error("Gold AI PesaPal request failed", { path, status: response.status, statusText: response.statusText || undefined, environment: settings.environment, hostname: new URL(settings.baseUrl).hostname, providerMessage, responseBody: safeBody });
    throw new PesaPalApiError("PesaPal service rejected the request.", response.status >= 500 ? 503 : 502, response.status, providerMessage);
  }
  return await response.json() as T;
}

async function requestToken() {
  const settings = config();
  const endpointPath = "/api/Auth/RequestToken";
  const data = await pesapalRequest<{ token?: string; error?: string; status?: string | number; message?: string }>(endpointPath, { method: "POST", body: JSON.stringify({ consumer_key: settings.key, consumer_secret: settings.secret }) });
  if (!data.token) {
    console.error("Gold AI PesaPal authentication returned no token", { httpStatus: 200, statusText: "OK", environment: settings.environment, hostname: new URL(settings.baseUrl).hostname, endpointPath, consumerKeyConfigured: Boolean(settings.key), consumerSecretConfigured: Boolean(settings.secret), providerStatus: data.status, providerMessage: data.message || data.error, responseKeys: Object.keys(data), response: redactSensitiveResponse(data) });
    throw new PaymentServiceError("PesaPal authentication failed.", 502);
  }
  console.info("Gold AI PesaPal authentication succeeded", { environment: settings.environment, hostname: new URL(settings.baseUrl).hostname });
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
    const configuredIpnId = process.env.PESAPAL_IPN_ID?.trim();
    const ipn = configuredIpnId ? { ipn_id: configuredIpnId } : await pesapalRequest<{ ipn_id?: string }>("/api/URLSetup/RegisterIPN", { method: "POST", body: JSON.stringify({ url: settings.ipnUrl, ipn_notification_type: "POST" }) }, token);
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
