import type { Plan12Week } from "../types/planTypes";

const TOTAL_PLAN_WEEKS = 12;

function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function getReviewLeadScore(review: NonNullable<Plan12Week["weeks"][number]["review"]>): number {
  return review.leadScore ?? review.executionScore ?? 0;
}

export function calculateLeadProgress(plan: Plan12Week): number {
  const reviewedWeeks = plan.weeks.filter((week) => Boolean(week.review));
  if (reviewedWeeks.length === 0) return 0;

  const averageLeadScore =
    reviewedWeeks.reduce((sum, week) => sum + clampPercentage(getReviewLeadScore(week.review!)), 0) /
    reviewedWeeks.length;

  return clampPercentage(Math.round(averageLeadScore));
}

export function calculateCycleCompletionRate(plan: Plan12Week): number {
  const completedWeeks = plan.weeks.filter((week) => Boolean(week.review)).length;
  const progress = (completedWeeks / TOTAL_PLAN_WEEKS) * 100;

  return clampPercentage(Math.round(progress));
}

export const calculatePlanProgress = calculateCycleCompletionRate;
