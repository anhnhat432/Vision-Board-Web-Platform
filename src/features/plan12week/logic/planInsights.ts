import { calculateExecutionScore } from "./executionScore";

import type { PlanInsights } from "../types/planInsights";
import type { Plan12Week } from "../types/planTypes";

const DEFAULT_PLAN_INSIGHTS: PlanInsights = {
  averageScore: 0,
  bestWeek: null,
  worstWeek: null,
  consistencyScore: 0,
};

function clampPercentage(value: number): number {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

export function calculatePlanInsights(plan: Plan12Week | null): PlanInsights {
  if (!plan || plan.weeks.length === 0) {
    return DEFAULT_PLAN_INSIGHTS;
  }

  const weekScores = plan.weeks.map((week) => ({
    weekNumber: week.weekNumber,
    score: calculateExecutionScore(week.tasks),
  }));

  const averageScore = Math.round(
    weekScores.reduce((sum, item) => sum + item.score, 0) / weekScores.length,
  );

  const bestWeek = weekScores.reduce((best, current) =>
    current.score > best.score ? current : best,
  );

  const worstWeek = weekScores.reduce((worst, current) =>
    current.score < worst.score ? current : worst,
  );

  const variance =
    weekScores.reduce((sum, item) => sum + (item.score - averageScore) ** 2, 0) /
    weekScores.length;
  const standardDeviation = Math.sqrt(variance);
  const consistencyScore = Math.round(clampPercentage(100 - standardDeviation));

  return {
    averageScore,
    bestWeek: bestWeek.weekNumber,
    worstWeek: worstWeek.weekNumber,
    consistencyScore,
  };
}
