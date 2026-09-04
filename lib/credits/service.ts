import { randomUUID } from "node:crypto";
import { creditConfig, currentPeriodKey } from "./config";
import { getFirebaseAdmin } from "../firebase-admin";
import type { AIUsageRecord, CreditAccount, CreditTransaction } from "../../types/credits";

function timestamp() { return Date.now(); }
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
  await accountRef.transaction((value: (CreditAccount & { reservations?: Record<string, { amount: number; createdAt: number }> }) | null) => {
    const account = accountForPeriod(value, currentPeriodKey());
    const reservation = value?.reservations?.[requestId];
    if (reservation) { result = { status: "duplicate", account }; return value; }
    if (account.balance < cost) { result = { status: "insufficient", account }; return value; }
    const freeUsed = Math.min(account.monthlyFreeCredits - account.monthlyFreeUsed, cost);
    account.monthlyFreeUsed += freeUsed;
    account.purchasedCredits -= cost - freeUsed;
    account.balance -= cost;
    account.updatedAt = timestamp();
    result = { status: "reserved", account };
    return { ...account, reservations: { ...(value?.reservations || {}), [requestId]: { amount: cost, createdAt: timestamp() } } };
  });
  return result;
}

export async function finalizeCredits(uid: string, requestId: string, usage: Omit<AIUsageRecord, "usageId" | "userId" | "requestId" | "creditsConsumed" | "createdAt">, creditsConsumed: number) {
  const { database } = getFirebaseAdmin();
  const accountRef = database.ref(`credits/${uid}`);
  let finalized = false;
  await accountRef.transaction((value: CreditAccount & { reservations?: Record<string, { amount: number }> } | null) => {
    if (!value?.reservations?.[requestId]) return value;
    const reservations = { ...(value.reservations || {}) };
    delete reservations[requestId];
    finalized = true;
    return { ...value, totalUsed: (value.totalUsed || 0) + creditsConsumed, updatedAt: timestamp(), reservations };
  });
  if (!finalized) return false;
  const usageId = randomUUID();
  const transactionId = randomUUID();
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
  await accountRef.transaction((value: CreditAccount & { reservations?: Record<string, { amount: number }> } | null) => {
    const reservation = value?.reservations?.[requestId];
    if (!value || !reservation) return value;
    const account = accountForPeriod(value, currentPeriodKey());
    const freeRefund = Math.min(reservation.amount, account.monthlyFreeUsed);
    account.monthlyFreeUsed -= freeRefund;
    account.purchasedCredits += reservation.amount - freeRefund;
    account.balance += reservation.amount;
    const reservations = { ...(value.reservations || {}) };
    delete reservations[requestId];
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
