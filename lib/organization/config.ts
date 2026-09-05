import type { OrganizationRole, OrganizationType } from "../../types/organization";

export const organizationTypeOptions: Array<{ value: OrganizationType; label: string }> = [
  { value: "school", label: "School" }, { value: "university", label: "University" }, { value: "company", label: "Company" }, { value: "ngo", label: "NGO" }, { value: "training", label: "Training institution" }, { value: "business", label: "Business" }, { value: "other", label: "Other" },
];
export const manageableRoles: OrganizationRole[] = ["admin", "manager", "member"];
export function isOrganizationRole(value: string): value is OrganizationRole { return ["owner", "admin", "manager", "member"].includes(value); }
export function isOrganizationType(value: string): value is OrganizationType { return organizationTypeOptions.some((item) => item.value === value); }
