import type { Task, Week, WeekReview } from "../types/planTypes";

import { calculateLagScore, calculateLeadScore, type LagMetric } from "./executionScore";

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizeTextList(values: readonly string[] | undefined): string[] {
  if (!Array.isArray(values)) return [];
  return values.map((value) => value.trim()).filter(Boolean);
}

interface CreateWeeklyReviewInput {
  week: Pick<Week, "weekNumber">;
  tasks: Task[];
  lagMetric?: LagMetric;
  totalWeeks?: number;
  commitmentsKept: string[];
  commitmentsMissed: string[];
  insights?: string;
  nextWeekCommitments: string[];
}

function buildWeeklyReview({
  week,
  tasks,
  lagMetric,
  totalWeeks = 12,
  commitmentsKept,
  commitmentsMissed,
  insights,
  nextWeekCommitments,
}: CreateWeeklyReviewInput): WeekReview {
  const leadScore = calculateLeadScore(tasks);
  const lagScore = lagMetric ? calculateLagScore(lagMetric, week.weekNumber, totalWeeks) : undefined;
  const normalizedInsights = normalizeOptionalText(insights);
  const normalizedNextWeekCommitments = normalizeTextList(nextWeekCommitments);

  return {
    weekNumber: week.weekNumber,
    leadScore,
    lagScore,
    commitmentsKept: normalizeTextList(commitmentsKept),
    commitmentsMissed: normalizeTextList(commitmentsMissed),
    insights: normalizedInsights,
    nextWeekCommitments: normalizedNextWeekCommitments,
    executionScore: leadScore,
    reflection: normalizedInsights,
    adjustments: normalizedNextWeekCommitments[0],
  };
}

export function createWeeklyReview(input: CreateWeeklyReviewInput): WeekReview;
export function createWeeklyReview(
  week: Pick<Week, "weekNumber">,
  tasks: Task[],
  reflection?: string,
  adjustments?: string,
  lagMetric?: LagMetric,
  totalWeeks?: number,
): WeekReview;
export function createWeeklyReview(
  inputOrWeek: CreateWeeklyReviewInput | Pick<Week, "weekNumber">,
  tasks?: Task[],
  reflection?: string,
  adjustments?: string,
  lagMetric?: LagMetric,
  totalWeeks = 12,
): WeekReview {
  if ("week" in inputOrWeek) {
    return buildWeeklyReview(inputOrWeek);
  }

  const normalizedAdjustment = normalizeOptionalText(adjustments);
  return buildWeeklyReview({
    week: inputOrWeek,
    tasks: tasks ?? [],
    lagMetric,
    totalWeeks,
    commitmentsKept: [],
    commitmentsMissed: [],
    insights: reflection,
    nextWeekCommitments: normalizedAdjustment ? [normalizedAdjustment] : [],
  });
}
