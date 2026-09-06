import type { StudyPlan } from "../../types/study";

/**
 * Time-based progress for a Study Plan.
 *
 * The Home "Continue Learning" progress bar answers:
 * "How far are we through the period the learner gave themselves?"
 *
 * It is calculated from the plan's canonical epoch-millisecond timestamps:
 *
 *   totalDuration  = endDate - startDate
 *   elapsed        = now - startDate
 *   percent        = clamp(elapsed / totalDuration * 100, 0, 100)
 *
 * Learning/completion progress (lessons or questions finished) is a separate
 * concept and is intentionally NOT used here.
 */

const DAY_MS = 86_400_000;

export type StudyPlanTimeStatus = "upcoming" | "active" | "expired";

export type StudyPlanProgress = {
  status: StudyPlanTimeStatus;
  /** 0–100, clamped. */
  percent: number;
  /** Current calendar day of the plan, 1-based ("Day X of Y"). */
  day: number;
  totalDays: number;
};

export function studyPlanProgress(plan: Pick<StudyPlan, "startDate" | "endDate">, now: number = Date.now()): StudyPlanProgress {
  const totalMs = plan.endDate - plan.startDate;
  const totalDays = Math.max(1, Math.round(totalMs / DAY_MS));

  // Missing or inverted dates: fall back to 0% rather than crashing.
  if (!Number.isFinite(plan.startDate) || !Number.isFinite(plan.endDate) || totalMs <= 0) {
    return { status: "active", percent: 0, day: 1, totalDays };
  }

  const elapsedMs = now - plan.startDate;
  const clampedMs = Math.min(totalMs, Math.max(0, elapsedMs));
  const percent = Math.round((clampedMs / totalMs) * 100);
  const day = Math.min(totalDays, Math.floor(clampedMs / DAY_MS) + 1);
  const status: StudyPlanTimeStatus = now < plan.startDate ? "upcoming" : now <= plan.endDate ? "active" : "expired";

  return { status, percent, day, totalDays };
}

/** True when a plan should appear as an active Continue Learning item. */
export function isActiveStudyPlan(plan: Pick<StudyPlan, "status" | "startDate" | "endDate">, now: number = Date.now()): boolean {
  return plan.status !== "completed" && studyPlanProgress(plan, now).status === "active";
}