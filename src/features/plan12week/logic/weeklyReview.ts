import type { Task, Week, WeekReview } from "../types/planTypes";

import { calculateLagScore, calculateLeadScore, type LagMetric } from "./executionScore";

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function createWeeklyReview(
  week: Pick<Week, "weekNumber">,
  tasks: Task[],
  reflection?: string,
  adjustments?: string,
  lagMetric?: LagMetric,
  totalWeeks = 12,
): WeekReview {
  const leadScore = calculateLeadScore(tasks);
  const lagScore = lagMetric ? calculateLagScore(lagMetric, week.weekNumber, totalWeeks) : undefined;

  return {
    weekNumber: week.weekNumber,
    leadScore,
    lagScore,
    executionScore: leadScore,
    reflection: normalizeOptionalText(reflection),
    adjustments: normalizeOptionalText(adjustments),
  };
}
