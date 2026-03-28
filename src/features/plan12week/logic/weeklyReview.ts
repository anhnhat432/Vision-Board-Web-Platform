import type { Task, Week, WeekReview } from "../types/planTypes";

import { calculateExecutionScore } from "./executionScore";

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function createWeeklyReview(
  week: Pick<Week, "weekNumber">,
  tasks: Task[],
  reflection?: string,
  adjustments?: string,
): WeekReview {
  return {
    weekNumber: week.weekNumber,
    executionScore: calculateExecutionScore(tasks),
    reflection: normalizeOptionalText(reflection),
    adjustments: normalizeOptionalText(adjustments),
  };
}
