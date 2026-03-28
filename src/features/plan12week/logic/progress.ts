import type { Plan12Week } from "../types/planTypes";

const TOTAL_PLAN_WEEKS = 12;

function clampPercentage(value: number): number {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

export function calculatePlanProgress(plan: Plan12Week): number {
  const completedWeeks = plan.weeks.filter((week) => Boolean(week.review)).length;
  const progress = (completedWeeks / TOTAL_PLAN_WEEKS) * 100;

  return clampPercentage(Math.round(progress));
}
