import type { AIUsage } from "../ai/types";
import { creditConfig } from "./config";

export type CreditFeature = keyof typeof creditConfig.featureCosts;

export function calculateCreditCost(feature: CreditFeature, usage?: AIUsage) {
  void usage;
  return creditConfig.featureCosts[feature];
}

export function estimateProviderCost(usage: AIUsage, inputRatePerThousand = 0, outputRatePerThousand = 0) {
  return ((usage.inputTokens || 0) / 1000) * inputRatePerThousand + ((usage.outputTokens || 0) / 1000) * outputRatePerThousand;
}
