import { getFirebaseAdmin } from "../firebase-admin";
import type { OrganizationCreditAccount } from "../../types/organization";
import type { OrganizationCreditTransaction, OrganizationUsage } from "../../types/organization";

export async function getOrganizationCredits(organizationId: string) {
  const snapshot = await getFirebaseAdmin().database.ref(`organizationCredits/${organizationId}`).once("value");
  return snapshot.val() as OrganizationCreditAccount | null;
}

export async function reserveOrganizationCredits(organizationId: string, amount: number) {
  if (!Number.isInteger(amount) || amount < 1) throw new Error("INVALID_AMOUNT");
  const reference = getFirebaseAdmin().database.ref(`organizationCredits/${organizationId}`);
  let allowed = false;
  await reference.transaction((value: OrganizationCreditAccount | null) => {
    if (!value || value.balance < amount) return value;
    allowed = true;
    return { ...value, balance: value.balance - amount, totalUsed: value.totalUsed + amount, updatedAt: Date.now() };
  });
  return allowed;
}

export async function recordOrganizationCreditTransaction(organizationId: string, transaction: OrganizationCreditTransaction) {
  await getFirebaseAdmin().database.ref(`organizationCreditTransactions/${organizationId}/${transaction.id}`).set(transaction);
}

export async function recordOrganizationUsage(organizationId: string, usage: OrganizationUsage) {
  await getFirebaseAdmin().database.ref(`organizationUsage/${organizationId}/${usage.usageId}`).set(usage);
}
