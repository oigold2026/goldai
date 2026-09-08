import { randomUUID } from "node:crypto";
import { creditConfig, currentPeriodKey } from "./config";
import { getFirebaseAdmin } from "../firebase-admin";
import type { AIUsageRecord, CreditAccount, CreditTransaction } from "../../types/credits";

function timestamp() { return Date.now(); }
function normalizedReservation(value: unknown): { amount: number; freeCreditsUsed: number; purchasedCreditsUsed: number; periodKey: string; createdAt: number; status: "reserved" | "completed" | "refunded" | "expired"; completedAt?: number } | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const amount = Number(record.amount ?? 0);
  const freeCreditsUsed = Number(record.freeCreditsUsed ?? 0);
  const purchasedCreditsUsed = Number(record.purchasedCreditsUsed ?? 0);
  const periodKey = typeof record.periodKey === "string" ? record.periodKey : currentPeriodKey();
  const createdAt = Number(record.createdAt ?? timestamp());
  const status = record.status === "completed" || record.status === "refunded" || record.status === "expired" ? record.status : "reserved";
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return { amount, freeCreditsUsed, purchasedCreditsUsed, periodKey, createdAt, status };
}

function accountForPeriod(existing: Partial<CreditAccount> | null, periodKey: string): CreditAccount {
  const now = timestamp();
  const account = existing || {};
  const isNewPeriod = account.periodKey !== periodKey;
  const monthlyFreeCredits = creditConfig.monthlyFreeCredits;
  const monthlyFreeUsed = isNewPeriod ? 0 : Math.max(0, account.monthlyFreeUsed || 0);
  const monthlyRemaining = Math.max(0, monthlyFreeCredits - monthlyFreeUsed);
  const purchasedCredits = Math.max(0, account.purchasedCredits || 0);
  return { balance: monthlyRemaining + purchasedCredits, monthlyFreeCredits, monthlyFreeUsed, purchasedCredits, totalUsed: Math.max(0, account.totalUsed || 0), periodKey, lastResetAt: isNewPeriod || !account.lastResetAt ? now : account.lastResetAt, createdAt: account.createdAt || now, updatedAt: now };
}

export async function getOrCreateCreditAccount(uid: string) {
  const { database } = getFirebaseAdmin();
  const accountRef = database.ref(`credits/${uid}`);
  const result = await accountRef.transaction((value: Partial<CreditAccount> | null) => accountForPeriod(value, currentPeriodKey()));
  return result.snapshot.val() as CreditAccount;
}

export async function reserveCredits(uid: string, requestId: string, cost = creditConfig.featureCosts.basicChat) {
  const { database } = getFirebaseAdmin();
  const accountRef = database.ref(`credits/${uid}`);
  let result: { status: "reserved" | "duplicate" | "insufficient"; account?: CreditAccount } = { status: "insufficient" };
  await accountRef.transaction((value: (CreditAccount & { reservations?: Record<string, { amount: number; freeCreditsUsed: number; purchasedCreditsUsed: number; periodKey: string; createdAt: number; status: "reserved" | "completed" | "refunded" | "expired" }> }) | null) => {
    const account = accountForPeriod(value, currentPeriodKey());
    const reservation = normalizedReservation(value?.reservations?.[requestId]);
    if (reservation && reservation.status === "reserved") { result = { status: "duplicate", account }; return value; }
    if (reservation && (reservation.status === "completed" || reservation.status === "refunded" || reservation.status === "expired")) { result = { status: "duplicate", account }; return value; }
    if (account.balance < cost) { result = { status: "insufficient", account }; return value; }
    const freeUsed = Math.min(account.monthlyFreeCredits - account.monthlyFreeUsed, cost);
    const purchasedUsed = cost - freeUsed;
    account.monthlyFreeUsed += freeUsed;
    account.purchasedCredits -= purchasedUsed;
    account.balance -= cost;
    account.updatedAt = timestamp();
    const createdAt = timestamp();
    result = { status: "reserved", account };
    return { ...account, reservations: { ...(value?.reservations || {}), [requestId]: { requestId, amount: cost, freeCreditsUsed: freeUsed, purchasedCreditsUsed: purchasedUsed, periodKey: currentPeriodKey(), createdAt, status: "reserved" } } };
  });
  return result;
}

export async function finalizeCredits(uid: string, requestId: string, usage: Omit<AIUsageRecord, "usageId" | "userId" | "requestId" | "creditsConsumed" | "createdAt">, creditsConsumed: number) {
  const { database } = getFirebaseAdmin();
  const accountRef = database.ref(`credits/${uid}`);
  let finalized = false;
  await accountRef.transaction((value: (CreditAccount & { reservations?: Record<string, { requestId: string; amount: number; freeCreditsUsed: number; purchasedCreditsUsed: number; periodKey: string; createdAt: number; status: "reserved" | "completed" | "refunded" | "expired"; completedAt?: number }> }) | null) => {
    const reservation = normalizedReservation(value?.reservations?.[requestId]);
    if (!reservation) return value;
    if (reservation.status === "completed") {
      return value;
    }
    const reservations = { ...(value?.reservations || {}) };
    reservations[requestId] = { ...reservations[requestId], requestId, status: "completed", completedAt: timestamp() };
    finalized = true;
    return { ...value, totalUsed: (value.totalUsed || 0) + creditsConsumed, updatedAt: timestamp(), reservations };
  });
  if (!finalized) return false;
  const usageId = `usage_${requestId}`;
  const transactionId = `txn_${requestId}`;
  const account = (await accountRef.once("value")).val() as CreditAccount;
  const createdAt = timestamp();
  const transaction: CreditTransaction = { id: transactionId, type: "ai_usage", amount: -creditsConsumed, balanceAfter: account.balance, source: "ai", description: "AI usage", reference: requestId, createdAt };
  const record: AIUsageRecord = { ...usage, usageId, userId: uid, requestId, creditsConsumed, createdAt };
  await database.ref().update({ [`creditTransactions/${uid}/${transactionId}`]: transaction, [`usage/${uid}/${usageId}`]: record });
  return true;
}

export async function refundReservedCredits(uid: string, requestId: string) {
  const { database } = getFirebaseAdmin();
  const accountRef = database.ref(`credits/${uid}`);
  let refunded = false;
  await accountRef.transaction((value: (CreditAccount & { reservations?: Record<string, { amount: number; freeCreditsUsed: number; purchasedCreditsUsed: number; periodKey: string; createdAt: number; status: "reserved" | "completed" | "refunded" | "expired" }> }) | null) => {
    const reservation = normalizedReservation(value?.reservations?.[requestId]);
    if (!value || !reservation || reservation.status !== "reserved") return value;
    const account = accountForPeriod(value, currentPeriodKey());
    const freeRefund = Math.min(reservation.amount, account.monthlyFreeUsed);
    account.monthlyFreeUsed -= freeRefund;
    account.purchasedCredits += reservation.amount - freeRefund;
    account.balance += reservation.amount;
    const reservations = { ...(value.reservations || {}) };
    reservations[requestId] = { ...reservations[requestId], status: "refunded", completedAt: timestamp() };
    refunded = true;
    return { ...account, reservations };
  });
  return refunded;
}

export async function listCreditData(uid: string) {
  const { database } = getFirebaseAdmin();
  const [accountSnapshot, transactionsSnapshot, usageSnapshot] = await Promise.all([database.ref(`credits/${uid}`).once("value"), database.ref(`creditTransactions/${uid}`).limitToLast(30).once("value"), database.ref(`usage/${uid}`).limitToLast(30).once("value")]);
  return { account: accountSnapshot.val() as CreditAccount | null, transactions: transactionsSnapshot.val() || {}, usage: usageSnapshot.val() || {} };
}
