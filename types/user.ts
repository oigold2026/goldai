export const userGroups = ["student", "university_student", "teacher", "researcher", "general"] as const;
export type UserGroup = (typeof userGroups)[number];

export type UserProfile = {
  uid: string;
  name: string;
  email: string;
  photoURL?: string | null;
  country?: string;
  userGroup?: UserGroup;
  preferredLanguage?: string;
  educationLevel?: string;
  classOrYear?: string;
  institution?: string;
  programme?: string;
  subjects?: string[];
  interests?: string;
  researchType?: string;
  bio?: string;
  onboardingCompleted?: boolean;
  createdAt?: number | object;
  updatedAt?: number | object;
};
