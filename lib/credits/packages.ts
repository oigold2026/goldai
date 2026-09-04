export type CreditPackage = {
  id: string;
  name: string;
  credits: number;
  amount: number;
  currency: string;
  active: boolean;
};

export const creditPackages: CreditPackage[] = [
  { id: "starter", name: "Starter", credits: 25, amount: 500, currency: "UGX", active: true },
  { id: "plus", name: "Plus", credits: 70, amount: 1000, currency: "UGX", active: true },
  { id: "pro", name: "Pro", credits: 160, amount: 2000, currency: "UGX", active: true },
];

export function getCreditPackage(packageId: string) {
  return creditPackages.find((creditPackage) => creditPackage.id === packageId && creditPackage.active) || null;
}
