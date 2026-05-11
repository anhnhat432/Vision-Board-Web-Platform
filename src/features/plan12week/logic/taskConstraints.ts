const MIN_RECOMMENDED_TASKS = 3;
const MAX_RECOMMENDED_TASKS = 5;

export type WeeklyTaskLoadPreference = "lighter" | "balanced" | "push";

export interface WeeklyTaskLoadInput {
  tacticLoadPreference?: WeeklyTaskLoadPreference | string | null;
  dailyTimeBudget?: string | null;
}

const MAX_WEEKLY_TASKS_BY_LOAD: Record<WeeklyTaskLoadPreference, number> = {
  lighter: 4,
  balanced: 5,
  push: 6,
};

const MAX_TASKS_PER_TACTIC_BY_LOAD: Record<WeeklyTaskLoadPreference, number> = {
  lighter: 1,
  balanced: 2,
  push: 3,
};

const MAX_WEEKLY_TASKS_BY_TIME_BUDGET: Record<string, number> = {
  "30min": 4,
  "1h": 5,
  "1.5h": 6,
  "2h+": 6,
};

const MAX_TASKS_PER_TACTIC_BY_TIME_BUDGET: Record<string, number> = {
  "30min": 1,
  "1h": 2,
  "1.5h": 2,
  "2h+": 3,
};

function normalizeLoadPreference(value: WeeklyTaskLoadInput["tacticLoadPreference"]): WeeklyTaskLoadPreference {
  return value === "lighter" || value === "push" ? value : "balanced";
}

export function getMaxWeeklyTaskCount(input: WeeklyTaskLoadInput = {}): number {
  const loadPreference = normalizeLoadPreference(input.tacticLoadPreference);
  const loadLimit = MAX_WEEKLY_TASKS_BY_LOAD[loadPreference];
  const timeBudgetLimit = input.dailyTimeBudget ? MAX_WEEKLY_TASKS_BY_TIME_BUDGET[input.dailyTimeBudget] : undefined;

  return Math.min(loadLimit, timeBudgetLimit ?? loadLimit);
}

export function getMaxTasksPerTactic(input: WeeklyTaskLoadInput = {}): number {
  const loadPreference = normalizeLoadPreference(input.tacticLoadPreference);
  const loadLimit = MAX_TASKS_PER_TACTIC_BY_LOAD[loadPreference];
  const timeBudgetLimit = input.dailyTimeBudget
    ? MAX_TASKS_PER_TACTIC_BY_TIME_BUDGET[input.dailyTimeBudget]
    : undefined;

  return Math.min(loadLimit, timeBudgetLimit ?? loadLimit);
}

export function getWeeklyTaskWarning(taskCount: number): string | null {
  if (taskCount > MAX_RECOMMENDED_TASKS) {
    return "Khuyến nghị mỗi tuần chỉ nên có 3-5 việc. Bạn đang vượt quá 5 việc.";
  }

  return null;
}

export function isTaskCountInRecommendedRange(taskCount: number): boolean {
  return taskCount >= MIN_RECOMMENDED_TASKS && taskCount <= MAX_RECOMMENDED_TASKS;
}
