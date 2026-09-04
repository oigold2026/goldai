export const creditConfig = {
  monthlyFreeCredits: Math.max(0, Number.parseInt(process.env.MONTHLY_FREE_CREDITS || "10", 10) || 10),
  featureCosts: {
    basicChat: Math.max(1, Number.parseInt(process.env.CREDIT_COST_BASIC_CHAT || "1", 10) || 1),
    studyExplain: Math.max(1, Number.parseInt(process.env.CREDIT_COST_STUDY_EXPLAIN || "1", 10) || 1),
    studyPractice: Math.max(1, Number.parseInt(process.env.CREDIT_COST_STUDY_PRACTICE || "2", 10) || 2),
    studyQuiz: Math.max(1, Number.parseInt(process.env.CREDIT_COST_STUDY_QUIZ || "3", 10) || 3),
    studySummary: Math.max(1, Number.parseInt(process.env.CREDIT_COST_STUDY_SUMMARY || "2", 10) || 2),
    studyPlan: Math.max(1, Number.parseInt(process.env.CREDIT_COST_STUDY_PLAN || "2", 10) || 2),
    studyCheck: Math.max(1, Number.parseInt(process.env.CREDIT_COST_STUDY_CHECK || "1", 10) || 1),
    research: Math.max(1, Number.parseInt(process.env.CREDIT_COST_RESEARCH || "3", 10) || 3),
  },
  consumeMonthlyFirst: true,
};

export function currentPeriodKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
