export const organizationTypes = ["school", "university", "company", "ngo", "training", "business", "other"] as const;
export type OrganizationType = (typeof organizationTypes)[number];
export const organizationRoles = ["owner", "admin", "manager", "member"] as const;
export type OrganizationRole = (typeof organizationRoles)[number];
export type OrganizationStatus = "active" | "suspended";

export type Organization = {
  id: string;
  name: string;
  type: OrganizationType;
  ownerId: string;
  country?: string;
  currency: string;
  status: OrganizationStatus;
  createdAt: number;
  updatedAt: number;
};

export type OrganizationMember = { uid: string; role: OrganizationRole; status: "active" | "invited"; joinedAt: number };
export type OrganizationInvitation = { id: string; organizationId: string; email: string; invitedBy: string; role: Exclude<OrganizationRole, "owner">; status: "pending" | "accepted" | "cancelled"; createdAt: number; expiresAt: number };
export type OrganizationCreditAccount = { balance: number; purchasedCredits: number; totalUsed: number; createdAt: number; updatedAt: number };
export type OrganizationCreditTransaction = { id: string; type: "purchase" | "usage" | "refund" | "adjustment" | "allocation"; amount: number; balanceAfter: number; source: string; description: string; createdAt: number };
export type OrganizationUsage = { usageId: string; userId: string; requestId: string; provider: string; model: string; creditsConsumed: number; createdAt: number };
