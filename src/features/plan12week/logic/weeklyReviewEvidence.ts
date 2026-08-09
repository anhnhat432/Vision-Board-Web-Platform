import {
  formatDateInputValue,
  getCalendarDateKey,
  isCalendarDateKeyOnOrAfter,
  isCalendarDateKeyOnOrBefore,
} from "@/app/utils/storage-date-utils";
import { getTwelveWeekWeekRange, getWeekTaskBreakdown } from "@/app/utils/storage-twelve-week";
import type { TwelveWeekSystem } from "@/app/utils/storage-types";
import type { ExecutionInsight } from "./executionInsights";

export interface WeeklyReviewRatio {
  completed: number;
  total: number;
  percent: number;
}

export interface WeeklyReviewEvidence {
  weekNumber: number;
  totalWeeks: number;
  dateRange: { start: string; end: string };
  completion: WeeklyReviewRatio & { isEmpty: boolean };
  core: WeeklyReviewRatio | null;
  optional: WeeklyReviewRatio | null;
  checkIns: { days: number; possibleDays: number };
  overdueOpenCount: number;
  carryOverCount: number;
  onTime: { completed: number; total: number } | null;
  previousWeek: (WeeklyReviewRatio & { deltaPoints: number }) | null;
}

export interface WeeklyReviewViewModel {
  evidence: WeeklyReviewEvidence;
  insights: ReadonlyArray<ExecutionInsight>;
}

function getRatio(completed: number, total: number): WeeklyReviewRatio {
  return {
    completed,
    total,
    percent: Math.round((completed / total) * 100),
  };
}

function belongsToRange(dateKey: string | null, range: { start: string; end: string }): boolean {
  return Boolean(
    dateKey &&
      isCalendarDateKeyOnOrAfter(dateKey, range.start) &&
      isCalendarDateKeyOnOrBefore(dateKey, range.end),
  );
}

export function getWeeklyReviewEvidence(
  system: TwelveWeekSystem,
  weekNumber: number,
  referenceDate = new Date(),
): WeeklyReviewEvidence {
  const safeWeekNumber = Math.max(1, Math.min(weekNumber, system.totalWeeks));
  const dateRange = getTwelveWeekWeekRange(system, safeWeekNumber);
  const breakdown = getWeekTaskBreakdown(system, safeWeekNumber);
  const referenceDateKey = formatDateInputValue(referenceDate);
  const checkInDays = new Set(
    system.dailyCheckIns
      .map((entry) => getCalendarDateKey(entry.date))
      .filter((dateKey): dateKey is string => belongsToRange(dateKey, dateRange)),
  );
  const completedTasks = breakdown.tasks.filter((task) => task.completed);
  const completedDateKeys = completedTasks.map((task) => getCalendarDateKey(task.completedAt ?? ""));
  const hasReliableCompletionDates = completedTasks.length > 0 && completedDateKeys.every(Boolean);
  const previousBreakdown = safeWeekNumber > 1 ? getWeekTaskBreakdown(system, safeWeekNumber - 1) : null;

  return {
    weekNumber: safeWeekNumber,
    totalWeeks: system.totalWeeks,
    dateRange,
    completion: {
      completed: breakdown.completed,
      total: breakdown.total,
      percent: breakdown.overallPercent,
      isEmpty: breakdown.isEmpty,
    },
    core: breakdown.coreTotal > 0 ? getRatio(breakdown.coreCompleted, breakdown.coreTotal) : null,
    optional:
      breakdown.optionalTotal > 0 ? getRatio(breakdown.optionalCompleted, breakdown.optionalTotal) : null,
    checkIns: {
      days: checkInDays.size,
      possibleDays: 7,
    },
    overdueOpenCount: breakdown.tasks.filter(
      (task) => !task.completed && task.scheduledDate < referenceDateKey,
    ).length,
    carryOverCount: system.taskInstances.filter(
      (task) =>
        task.weekNumber > safeWeekNumber &&
        belongsToRange(getCalendarDateKey(task.rescheduledFrom ?? ""), dateRange),
    ).length,
    onTime: hasReliableCompletionDates
      ? {
          completed: completedTasks.filter((task, index) =>
            isCalendarDateKeyOnOrBefore(completedDateKeys[index] as string, task.scheduledDate),
          ).length,
          total: completedTasks.length,
        }
      : null,
    previousWeek:
      previousBreakdown && !breakdown.isEmpty && !previousBreakdown.isEmpty
        ? {
            ...getRatio(previousBreakdown.completed, previousBreakdown.total),
            deltaPoints: breakdown.overallPercent - previousBreakdown.overallPercent,
          }
        : null,
  };
}
