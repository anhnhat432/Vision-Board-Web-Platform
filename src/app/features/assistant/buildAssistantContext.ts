/**
 * Build assistant context from localStorage.
 *
 * Reads user data through public storage APIs and surfaces a minimal
 * snapshot for the AI assistant to work with. Falls back to defaults
 * when storage is empty or malformed; never throws.
 */

import { getUserData } from "@/app/utils/storage";
import { APP_STORAGE_KEYS } from "@/app/utils/storage-constants";
import { formatDateInputValue, getCalendarDateKey, parseCalendarDate } from "@/app/utils/storage-date-utils";
import {
  getActiveTwelveWeekGoal,
  getTwelveWeekCurrentWeek,
  getTwelveWeekTodayTasks,
  getTwelveWeekWeekRange,
} from "@/app/utils/storage-twelve-week";
import type {
  Goal,
  TwelveWeekSystem,
  TwelveWeekTaskInstance,
  UniversalDailyCheckIn,
  UniversalWeeklyReview,
} from "@/app/utils/storage-types";

export interface AssistantContext {
  currentWeek: number | null;
  weeksTotal: number;
  goals: Array<{
    id: string;
    title: string;
    progress: number;
  }>;
  todayTasks: Array<{
    id: string;
    title: string;
    done: boolean;
  }>;
  lastReflectionDate: string | null;
  feasibility: {
    readinessScore: number | null;
    bottleneckLabel: string | null;
    bottleneckAction: string | null;
  } | null;
  latestWeeklyReview: {
    weekNumber: number;
    leadCompletionPercent: number | null;
    mainObstacle: string | null;
    nextWeekPriority: string | null;
    workloadDecision: string | null;
    reviewedAt: string | null;
  } | null;
  stuckSignals: {
    latestObstacle: string | null;
    missedCommitments: string[];
    overdueOpenCount: number;
    overdueTasks: Array<{
      id: string;
      title: string;
      scheduledDate: string;
      isCore: boolean;
    }>;
  };
  trend: {
    completionLast4Weeks: number[];
    direction: "up" | "down" | "flat" | "unknown";
  };
  streak: {
    daysWithCompletedTask: number;
  };
  upcomingDeadlines: Array<{
    goalId: string;
    title: string;
    daysUntil: number;
  }>;
}

/**
 * Build context from localStorage.
 *
 * Defaults:
 *   - currentWeek: null (no active 12-week goal)
 *   - weeksTotal: 12
 *   - goals: []
 *   - todayTasks: []
 *   - lastReflectionDate: null
 */
export function buildAssistantContext(referenceDate = new Date()): AssistantContext {
  try {
    const data = getUserData();

    if (!data?.goals || data.goals.length === 0) {
      return emptyContext();
    }

    const activeGoal = getActiveTwelveWeekGoal(data.goals);
    const goals = data.goals.map((goal: Goal) => ({
      id: goal.id,
      title: goal.title,
      progress: calculateGoalProgress(goal),
    }));
    const lastReflectionDate = data.reflections && data.reflections.length > 0 ? data.reflections[0].date : null;

    if (!activeGoal?.twelveWeekSystem) {
      return {
        ...emptyContext(),
        goals,
        lastReflectionDate,
        feasibility: buildFeasibilityContext(data.goals[0]),
      };
    }

    const system = activeGoal.twelveWeekSystem;
    const currentWeek = getTwelveWeekCurrentWeek(system, referenceDate);
    const todayTasks = getTwelveWeekTodayTasks(system, referenceDate);
    const latestWeeklyReview = getLatestWeeklyReview(system.weeklyReviews);

    return {
      currentWeek,
      weeksTotal: system.totalWeeks || 12,
      goals,
      todayTasks: todayTasks.map((task: TwelveWeekTaskInstance) => ({
        id: task.id,
        title: task.title,
        done: task.completed,
      })),
      lastReflectionDate,
      feasibility: buildFeasibilityContext(activeGoal),
      latestWeeklyReview,
      stuckSignals: buildStuckSignals(system, latestWeeklyReview, referenceDate),
      trend: buildTrendContext(system, currentWeek),
      streak: buildStreakContext(system, referenceDate),
      upcomingDeadlines: buildUpcomingDeadlines(data.goals, referenceDate),
    };
  } catch {
    // Storage read error -> safe defaults.
    return emptyContext();
  }
}

function emptyContext(): AssistantContext {
  return {
    currentWeek: null,
    weeksTotal: 12,
    goals: [],
    todayTasks: [],
    lastReflectionDate: null,
    feasibility: null,
    latestWeeklyReview: null,
    stuckSignals: {
      latestObstacle: null,
      missedCommitments: [],
      overdueOpenCount: 0,
      overdueTasks: [],
    },
    trend: {
      completionLast4Weeks: [],
      direction: "unknown",
    },
    streak: {
      daysWithCompletedTask: 0,
    },
    upcomingDeadlines: [],
  };
}

/**
 * Calculate goal progress as percentage (0-100).
 *
 * Uses task completion ratio if tasks exist, otherwise 0.
 */
function calculateGoalProgress(goal: Goal): number {
  if (!goal.tasks || goal.tasks.length === 0) return 0;

  const completed = goal.tasks.filter((task) => task.completed).length;
  return Math.round((completed / goal.tasks.length) * 100);
}

function readPendingFeasibility():
  | { readinessScore?: unknown; bottleneck?: { label?: unknown; action?: unknown } }
  | null {
  const raw = localStorage.getItem(APP_STORAGE_KEYS.pendingFeasibilityResult);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function boundedText(value: unknown, maxLength = 200): string | null {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, maxLength) : null;
}

function boundedNumber(value: unknown, min: number, max: number): number | null {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(min, Math.min(max, numeric));
}

function buildFeasibilityContext(goal: Goal | undefined): AssistantContext["feasibility"] {
  const pending = readPendingFeasibility();
  const readinessScore = boundedNumber(pending?.readinessScore ?? goal?.readinessScore, 0, 20);
  const bottleneckLabel = boundedText(pending?.bottleneck?.label ?? goal?.feasibilityResult);
  const bottleneckAction = boundedText(pending?.bottleneck?.action);

  if (readinessScore === null && !bottleneckLabel && !bottleneckAction) return null;

  return {
    readinessScore,
    bottleneckLabel,
    bottleneckAction,
  };
}

function getLatestWeeklyReview(reviews: UniversalWeeklyReview[]): AssistantContext["latestWeeklyReview"] {
  const latest = reviews
    .filter((review) => review.reviewCompleted)
    .sort((left, right) => {
      const leftReviewedAt = left.lastReviewAt ?? "";
      const rightReviewedAt = right.lastReviewAt ?? "";
      if (leftReviewedAt !== rightReviewedAt) return rightReviewedAt.localeCompare(leftReviewedAt);
      return right.weekNumber - left.weekNumber;
    })[0];

  if (!latest) return null;

  return {
    weekNumber: latest.weekNumber,
    leadCompletionPercent: boundedNumber(latest.leadCompletionPercent, 0, 100),
    mainObstacle: boundedText(latest.mainObstacle),
    nextWeekPriority: boundedText(latest.nextWeekPriority),
    workloadDecision: boundedText(latest.workloadDecision),
    reviewedAt: boundedText(latest.lastReviewAt, 40),
  };
}

function getLatestObstacle(checkIns: UniversalDailyCheckIn[]): string | null {
  return checkIns
    .filter((checkIn) => boundedText(checkIn.obstacleOrIssue))
    .sort((left, right) => right.date.localeCompare(left.date))[0]
    ?.obstacleOrIssue?.trim()
    .slice(0, 200) ?? null;
}

function buildStuckSignals(
  system: TwelveWeekSystem,
  latestWeeklyReview: AssistantContext["latestWeeklyReview"],
  referenceDate: Date,
): AssistantContext["stuckSignals"] {
  const todayKey = formatDateInputValue(referenceDate);
  const overdueTasks = system.taskInstances
    .filter((task) => {
      const scheduledDate = getCalendarDateKey(task.scheduledDate);
      return scheduledDate !== null && scheduledDate < todayKey && !task.completed && !task.skipped;
    })
    .sort((left, right) => left.scheduledDate.localeCompare(right.scheduledDate));

  const missedCommitments = system.weeklyReviews
    .filter((review) => review.reviewCompleted)
    .sort((left, right) => right.weekNumber - left.weekNumber)[0]
    ?.commitmentsMissed?.map((commitment) => commitment.trim().slice(0, 200))
    .filter(Boolean)
    .slice(0, 3) ?? [];

  return {
    latestObstacle: getLatestObstacle(system.dailyCheckIns) ?? latestWeeklyReview?.mainObstacle ?? null,
    missedCommitments,
    overdueOpenCount: overdueTasks.length,
    overdueTasks: overdueTasks.slice(0, 5).map((task) => ({
      id: task.id,
      title: task.title,
      scheduledDate: getCalendarDateKey(task.scheduledDate) ?? task.scheduledDate,
      isCore: task.isCore,
    })),
  };
}

/**
 * Build trend context: completion rate for last 4 weeks and direction.
 */
function buildTrendContext(
  system: TwelveWeekSystem,
  currentWeek: number | null,
): AssistantContext["trend"] {
  if (currentWeek === null) {
    return { completionLast4Weeks: [], direction: "unknown" };
  }

  const weeksToCheck = [currentWeek - 3, currentWeek - 2, currentWeek - 1, currentWeek];
  const completions: number[] = [];

  for (const weekNum of weeksToCheck) {
    if (weekNum < 1) {
      completions.push(NaN); // Mark as missing
      continue;
    }

    const range = getTwelveWeekWeekRange(system, weekNum);
    const startDate = parseCalendarDate(range.start);
    if (!startDate) {
      completions.push(NaN);
      continue;
    }

    const weekTasks = system.taskInstances.filter((task) => task.weekNumber === weekNum && !task.skipped);
    const completedTasks = weekTasks.filter((task) => task.completed).length;
    const totalTasks = weekTasks.length;

    if (totalTasks === 0) {
      completions.push(0);
    } else {
      completions.push(Math.round((completedTasks / totalTasks) * 100));
    }
  }

  // Filter out NaN values for direction calculation
  const validCompletions = completions.filter((val) => !Number.isNaN(val));

  const direction = calculateDirection(validCompletions);

  return {
    completionLast4Weeks: completions.filter((val) => !Number.isNaN(val)),
    direction,
  };
}

/**
 * Calculate trend direction from completion rates.
 */
function calculateDirection(completions: number[]): "up" | "down" | "flat" | "unknown" {
  if (completions.length < 2) return "unknown";

  // Simple linear regression slope
  const count = completions.length;
  const first = completions[0];
  const last = completions[count - 1];
  const slope = (last - first) / count;

  if (slope > 5) return "up";
  if (slope < -5) return "down";
  return "flat";
}

/**
 * Build streak context: consecutive days with at least one completed task.
 */
function buildStreakContext(
  system: TwelveWeekSystem,
  referenceDate: Date,
): AssistantContext["streak"] {
  let streak = 0;

  // Check from today backwards
  for (let daysBack = 0; daysBack < 365; daysBack++) {
    const checkDate = new Date(referenceDate);
    checkDate.setDate(checkDate.getDate() - daysBack);
    const checkDateKey = formatDateInputValue(checkDate);

    // Check if any task was completed on this date
    const hasCompletedTask = system.taskInstances.some(
      (task) => task.completed && getCalendarDateKey(task.completedAt || "") === checkDateKey,
    );

    // Also check daily check-ins
    const hasCheckIn = system.dailyCheckIns.some(
      (checkIn) => checkIn.didWorkToday && checkIn.date === checkDateKey,
    );

    if (hasCompletedTask || hasCheckIn) {
      streak++;
    } else {
      // Streak broken
      break;
    }
  }

  return { daysWithCompletedTask: streak };
}

/**
 * Build upcoming deadlines from goals with deadlines.
 */
function buildUpcomingDeadlines(
  goals: Goal[],
referenceDate: Date,
  ): AssistantContext["upcomingDeadlines"] {
    const _todayKey = formatDateInputValue(referenceDate);
    const deadlines: Array<{ goalId: string; title: string; daysUntil: number }> = [];

  for (const goal of goals) {
    if (!goal.deadline) continue;

    const deadlineDate = parseCalendarDate(goal.deadline);
    if (!deadlineDate) continue;

    const _deadlineKey = formatDateInputValue(deadlineDate);
    const today = new Date(referenceDate);
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(deadlineDate);
    deadline.setHours(0, 0, 0, 0);

    const daysUntil = Math.round((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Skip if already passed by more than a year
    if (daysUntil < -365) continue;

    deadlines.push({
      goalId: goal.id,
      title: goal.title,
      daysUntil,
    });
  }

  // Sort by daysUntil ascending and take top 3
  return deadlines
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 3);
}
