import { randomUUID } from "node:crypto";
import { getFirebaseAdmin } from "../firebase-admin";
import type { Organization, OrganizationInvitation, OrganizationMember, OrganizationRole, OrganizationType } from "../../types/organization";

const now = () => Date.now();

export async function listUserOrganizations(uid: string) {
  const { database } = getFirebaseAdmin();
  const memberships = (await database.ref(`organizationMembers`).once("value")).val() as Record<string, Record<string, OrganizationMember>> | null;
  const ids = Object.entries(memberships || {}).filter(([, members]) => members?.[uid]?.status === "active").map(([id]) => id);
  if (ids.length === 0) return [];
  const organizations = await Promise.all(ids.map(async (id) => (await database.ref(`organizations/${id}`).once("value")).val() as Organization | null));
  return organizations.filter((organization): organization is Organization => Boolean(organization));
}

export async function getOrganizationAccess(uid: string, organizationId: string) {
  const { database } = getFirebaseAdmin();
  const [organizationSnapshot, memberSnapshot] = await Promise.all([database.ref(`organizations/${organizationId}`).once("value"), database.ref(`organizationMembers/${organizationId}/${uid}`).once("value")]);
  return { organization: organizationSnapshot.val() as Organization | null, member: memberSnapshot.val() as OrganizationMember | null };
}

export async function createOrganization(uid: string, input: { name: string; type: OrganizationType; country?: string; currency: string }) {
  const { database } = getFirebaseAdmin();
  const id = randomUUID(); const timestamp = now();
  const organization: Organization = { id, name: input.name, type: input.type, ownerId: uid, country: input.country, currency: input.currency, status: "active", createdAt: timestamp, updatedAt: timestamp };
  const member: OrganizationMember = { uid, role: "owner", status: "active", joinedAt: timestamp };
  await database.ref().update({ [`organizations/${id}`]: organization, [`organizationMembers/${id}/${uid}`]: member, [`organizationCredits/${id}`]: { balance: 0, purchasedCredits: 0, totalUsed: 0, createdAt: timestamp, updatedAt: timestamp } });
  return organization;
}

export async function createInvitation(organizationId: string, invitedBy: string, email: string, role: Exclude<OrganizationRole, "owner">) {
  const { database } = getFirebaseAdmin();
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await database.ref(`organizationInvitations/${organizationId}`).once("value");
  const duplicate = Object.values((existing.val() || {}) as Record<string, OrganizationInvitation>).find((item) => item.status === "pending" && item.email === normalizedEmail && item.expiresAt > now());
  if (duplicate) return duplicate;
  const invitation: OrganizationInvitation = { id: randomUUID(), organizationId, email: normalizedEmail, invitedBy, role, status: "pending", createdAt: now(), expiresAt: now() + 7 * 24 * 60 * 60 * 1000 };
  await database.ref(`organizationInvitations/${organizationId}/${invitation.id}`).set(invitation);
  return invitation;
}

export async function listUserInvitations(email: string) {
  const { database } = getFirebaseAdmin();
  const all = (await database.ref("organizationInvitations").once("value")).val() as Record<string, Record<string, OrganizationInvitation>> | null;
  return Object.values(all || {}).flatMap((items) => Object.values(items || {})).filter((item) => item.email === email.toLowerCase() && item.status === "pending" && item.expiresAt > now());
}

export async function acceptInvitation(uid: string, email: string, invitationId: string, organizationId: string) {
  const { database } = getFirebaseAdmin();
  const invitationRef = database.ref(`organizationInvitations/${organizationId}/${invitationId}`);
  const invitation = (await invitationRef.once("value")).val() as OrganizationInvitation | null;
  if (!invitation || invitation.status !== "pending" || invitation.expiresAt <= now() || invitation.email !== email.toLowerCase()) return null;
  const memberRef = database.ref(`organizationMembers/${organizationId}/${uid}`);
  if ((await memberRef.once("value")).exists()) return null;
  const member: OrganizationMember = { uid, role: invitation.role, status: "active", joinedAt: now() };
  await database.ref().update({ [`organizationMembers/${organizationId}/${uid}`]: member, [`organizationInvitations/${organizationId}/${invitationId}/status`]: "accepted" });
  return member;
}
