import { calculateExecutionScore } from "./executionScore";
import { calculateMetricStreak } from "./streak";

import type { Plan12Week } from "../types/planTypes";

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday"
  | "unknown";

export interface BehaviorInsights {
  bestDayOfWeek: DayOfWeek;
  averageExecutionScore: number;
  longestMetricStreak: number;
  weakestWeek: number | null;
}

const DAY_BY_INDEX: DayOfWeek[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const DEFAULT_BEHAVIOR_INSIGHTS: BehaviorInsights = {
  bestDayOfWeek: "unknown",
  averageExecutionScore: 0,
  longestMetricStreak: 0,
  weakestWeek: null,
};

function getDayOfWeekFromDateString(value: string | undefined): DayOfWeek {
  if (!value) return "unknown";

  const parsedDate = new Date(value);
  const dayIndex = parsedDate.getDay();
  if (Number.isNaN(dayIndex)) return "unknown";

  return DAY_BY_INDEX[dayIndex] ?? "unknown";
}

export function analyzeExecutionPatterns(plan: Plan12Week | null): BehaviorInsights {
  if (!plan || plan.weeks.length === 0) {
    return DEFAULT_BEHAVIOR_INSIGHTS;
  }

  const weekScores = plan.weeks.map((week) => ({
    weekNumber: week.weekNumber,
    score: calculateExecutionScore(week.tasks),
  }));

  const totalScore = weekScores.reduce((sum, item) => sum + item.score, 0);
  const averageExecutionScore = Math.round(totalScore / weekScores.length);

  const weakestWeekEntry = weekScores.reduce((weakest, current) =>
    current.score < weakest.score ? current : weakest,
  );

  const longestMetricStreak = plan.weeks
    .flatMap((week) => week.leadMetrics)
    .reduce((longest, metric) => {
      const streak = calculateMetricStreak(metric.logs).longestStreak;
      return streak > longest ? streak : longest;
    }, 0);

  const completedTaskDayCount = plan.weeks
    .flatMap((week) => week.tasks)
    .filter((task) => task.status === "done")
    .reduce<Record<DayOfWeek, number>>(
      (counts, task) => {
        const day = getDayOfWeekFromDateString(task.scheduledDate);
        counts[day] += 1;
        return counts;
      },
      {
        monday: 0,
        tuesday: 0,
        wednesday: 0,
        thursday: 0,
        friday: 0,
        saturday: 0,
        sunday: 0,
        unknown: 0,
      },
    );

  const bestDayOfWeek = (Object.entries(completedTaskDayCount) as Array<[DayOfWeek, number]>)
    .sort((left, right) => right[1] - left[1])[0]?.[0] ?? "unknown";

  return {
    bestDayOfWeek,
    averageExecutionScore,
    longestMetricStreak,
    weakestWeek: weakestWeekEntry.weekNumber,
  };
}
