export const creditConfig = {
  monthlyFreeCredits: Math.max(0, Number.parseInt(process.env.MONTHLY_FREE_CREDITS || "10", 10) || 10),
  featureCosts: {
    basicChat: Math.max(1, Number.parseInt(process.env.CREDIT_COST_BASIC_CHAT || "1", 10) || 1),
  },
  consumeMonthlyFirst: true,
};

export function currentPeriodKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
