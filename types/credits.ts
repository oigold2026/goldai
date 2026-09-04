export const creditTransactionTypes = ["monthly_free", "purchase", "ai_usage", "refund", "adjustment", "bonus"] as const;
export type CreditTransactionType = (typeof creditTransactionTypes)[number];

export type CreditAccount = {
  balance: number;
  monthlyFreeCredits: number;
  monthlyFreeUsed: number;
  purchasedCredits: number;
  totalUsed: number;
  periodKey: string;
  lastResetAt: number;
  createdAt: number;
  updatedAt: number;
};

export type CreditTransaction = {
  id: string;
  type: CreditTransactionType;
  amount: number;
  balanceAfter: number;
  source: string;
  description: string;
  reference?: string;
  createdAt: number;
};

export type AIUsageRecord = {
  usageId: string;
  userId: string;
  requestId: string;
  provider: "openai" | "gemini";
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCost?: number;
  creditsConsumed: number;
  createdAt: number;
};
