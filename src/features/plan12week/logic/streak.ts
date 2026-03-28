import type { LeadMetricLog } from "../types/planTypes";

export interface MetricStreak {
  currentStreak: number;
  longestStreak: number;
}

function compareByDateAsc(left: LeadMetricLog, right: LeadMetricLog): number {
  const leftDate = new Date(left.date).getTime();
  const rightDate = new Date(right.date).getTime();

  if (leftDate === rightDate) return 0;
  return leftDate > rightDate ? 1 : -1;
}

export function calculateMetricStreak(logs: LeadMetricLog[]): MetricStreak {
  if (logs.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const sortedLogs = [...logs].sort(compareByDateAsc);

  let longestStreak = 0;
  let runningStreak = 0;

  for (const log of sortedLogs) {
    if (log.completed) {
      runningStreak += 1;
      if (runningStreak > longestStreak) {
        longestStreak = runningStreak;
      }
    } else {
      runningStreak = 0;
    }
  }

  let currentStreak = 0;
  for (let index = sortedLogs.length - 1; index >= 0; index -= 1) {
    if (!sortedLogs[index]?.completed) {
      break;
    }
    currentStreak += 1;
  }

  return { currentStreak, longestStreak };
}
