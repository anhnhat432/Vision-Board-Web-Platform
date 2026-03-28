import type { Plan12Week } from "@/features/plan12week/types/planTypes";

export interface GoalProgressSnapshot {
  completedTasks: number;
  totalTasks: number;
  percent: number;
}

export interface WeekExecutionSnapshot {
  weekNumber: number | null;
  completedTasks: number;
  totalTasks: number;
  executionScore: number;
}

export interface WeeklyProgressPoint {
  weekNumber: number;
  completedTasks: number;
  totalTasks: number;
  executionScore: number;
}

export type MetricTrend = "up" | "down" | "flat";

export interface MetricSummaryItem {
  name: string;
  totalValue: number;
  trend: MetricTrend;
  currentWeekValue: number;
  previousWeekValue: number;
}

function toPercent(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((completed / total) * 100);
}

function sortByWeekNumber<T extends { weekNumber: number }>(items: T[]): T[] {
  return [...items].sort((left, right) => left.weekNumber - right.weekNumber);
}

function resolveActiveWeekNumber(plan: Plan12Week): number | null {
  const sortedWeeks = sortByWeekNumber(plan.weeks);
  if (sortedWeeks.length === 0) return null;

  for (let index = sortedWeeks.length - 1; index >= 0; index -= 1) {
    const week = sortedWeeks[index];
    const hasTasks = week.tasks.length > 0;
    const hasReview = Boolean(week.review);
    const hasMetricLogs = week.leadMetrics.some((metric) => metric.logs.length > 0);

    if (hasTasks || hasReview || hasMetricLogs) {
      return week.weekNumber;
    }
  }

  return sortedWeeks[0]?.weekNumber ?? null;
}

export function buildGoalProgressSnapshot(plan: Plan12Week | null): GoalProgressSnapshot {
  const tasks = plan?.weeks.flatMap((week) => week.tasks) ?? [];
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.status === "done").length;

  return {
    completedTasks,
    totalTasks,
    percent: toPercent(completedTasks, totalTasks),
  };
}

export function buildWeeklyProgressPoints(plan: Plan12Week | null): WeeklyProgressPoint[] {
  if (!plan) return [];

  return sortByWeekNumber(plan.weeks).map((week) => {
    const totalTasks = week.tasks.length;
    const completedTasks = week.tasks.filter((task) => task.status === "done").length;

    return {
      weekNumber: week.weekNumber,
      completedTasks,
      totalTasks,
      executionScore: toPercent(completedTasks, totalTasks),
    };
  });
}

export function buildCurrentWeekExecutionSnapshot(plan: Plan12Week | null): WeekExecutionSnapshot {
  if (!plan) {
    return {
      weekNumber: null,
      completedTasks: 0,
      totalTasks: 0,
      executionScore: 0,
    };
  }

  const activeWeekNumber = resolveActiveWeekNumber(plan);
  const activeWeek = plan.weeks.find((week) => week.weekNumber === activeWeekNumber);

  if (!activeWeek) {
    return {
      weekNumber: activeWeekNumber,
      completedTasks: 0,
      totalTasks: 0,
      executionScore: 0,
    };
  }

  const totalTasks = activeWeek.tasks.length;
  const completedTasks = activeWeek.tasks.filter((task) => task.status === "done").length;

  return {
    weekNumber: activeWeek.weekNumber,
    completedTasks,
    totalTasks,
    executionScore: toPercent(completedTasks, totalTasks),
  };
}

export function calculateWeeklyStreak(points: WeeklyProgressPoint[], threshold = 70): number {
  let longestStreak = 0;
  let runningStreak = 0;

  for (const point of sortByWeekNumber(points)) {
    if (point.executionScore >= threshold) {
      runningStreak += 1;
      longestStreak = Math.max(longestStreak, runningStreak);
    } else {
      runningStreak = 0;
    }
  }

  return longestStreak;
}

export function buildLeadMetricsSummary(plan: Plan12Week | null): MetricSummaryItem[] {
  if (!plan) return [];

  const activeWeekNumber = resolveActiveWeekNumber(plan);
  const previousWeekNumber =
    activeWeekNumber && activeWeekNumber > 1 ? activeWeekNumber - 1 : null;

  const metricTotals = new Map<string, number>();
  const metricWeeklyTotals = new Map<string, Map<number, number>>();

  for (const week of plan.weeks) {
    for (const metric of week.leadMetrics) {
      const metricName = metric.name.trim();
      if (!metricName) continue;

      const metricTotal = metric.logs.reduce((sum, log) => sum + log.value, 0);
      metricTotals.set(metricName, (metricTotals.get(metricName) ?? 0) + metricTotal);

      const perWeek = metricWeeklyTotals.get(metricName) ?? new Map<number, number>();
      perWeek.set(week.weekNumber, (perWeek.get(week.weekNumber) ?? 0) + metricTotal);
      metricWeeklyTotals.set(metricName, perWeek);
    }
  }

  return Array.from(metricTotals.entries())
    .map(([name, totalValue]) => {
      const perWeek = metricWeeklyTotals.get(name) ?? new Map<number, number>();
      const currentWeekValue = activeWeekNumber ? perWeek.get(activeWeekNumber) ?? 0 : 0;
      const previousWeekValue = previousWeekNumber ? perWeek.get(previousWeekNumber) ?? 0 : 0;

      let trend: MetricTrend = "flat";
      if (currentWeekValue > previousWeekValue) trend = "up";
      else if (currentWeekValue < previousWeekValue) trend = "down";

      return {
        name,
        totalValue,
        trend,
        currentWeekValue,
        previousWeekValue,
      };
    })
    .sort((left, right) => right.totalValue - left.totalValue);
}
