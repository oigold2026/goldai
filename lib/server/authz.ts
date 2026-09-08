import { getFirebaseAdmin } from "../firebase-admin";
import type { UserProfile } from "../../types/user";

export class AuthorizationError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

export async function requireAuth(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new AuthorizationError("Authentication required.", 401);
  }

  const token = authorization.slice(7).trim();
  if (!token) {
    throw new AuthorizationError("Authentication required.", 401);
  }

  const uid = await getFirebaseAdmin().auth.verifyIdToken(token).then((decoded) => decoded.uid).catch(() => {
    throw new AuthorizationError("Authentication required.", 401);
  });

  return uid;
}

export async function requireProfile(uid: string): Promise<UserProfile> {
  const snapshot = await getFirebaseAdmin().database.ref(`users/${uid}`).once("value");
  const profile = snapshot.val() as UserProfile | null;
  if (!profile) throw new AuthorizationError("Profile is missing. Please complete onboarding.", 404);
  return profile;
}

export async function requireTeacher(request: Request) {
  const uid = await requireAuth(request);
  const profile = await requireProfile(uid);
  if (profile.userGroup !== "teacher") {
    throw new AuthorizationError("Teacher Tools are available only to teacher accounts.", 403);
  }
  return { uid, profile };
}

export async function requireOrganizationMember(request: Request, organizationId: string, options?: { allowRoles?: string[] }) {
  const uid = await requireAuth(request);
  const snapshot = await getFirebaseAdmin().database.ref(`organizationMembers/${organizationId}/${uid}`).once("value");
  const member = snapshot.val() as { role?: string; status?: string } | null;
  if (!member || member.status !== "active") throw new AuthorizationError("You are not an active member of this organization.", 403);
  if (options?.allowRoles && !options.allowRoles.includes(member.role ?? "")) {
    throw new AuthorizationError("You do not have permission to do this.", 403);
  }
  return { uid, member };
}
