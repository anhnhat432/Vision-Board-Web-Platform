import type {
  CoachInsight,
  CoachTask,
  PersonalCoachContext,
} from "@shared/personalCoachSchema";
import { formatDateInputValue } from "@/app/utils/storage-date-utils";
import { getTwelveWeekMissedTasks } from "@/app/utils/storage";
import type {
  Goal,
  TwelveWeekSystem,
  TwelveWeekTaskInstance,
  UniversalWeeklyReview,
} from "@/app/utils/storage-types";
import { buildDashboardDailyExecutionSnapshot } from "@/features/dashboard/helpers/dashboardDailyExecution";
import { getExecutionInsights } from "@/features/plan12week/logic/executionInsights";
import { getWeeklyReviewEvidence } from "@/features/plan12week/logic/weeklyReviewEvidence";

const MAX_TODAY_TASKS = 8;
const MAX_OVERDUE_TASKS = 3;
const MAX_COMMITMENTS = 3;
const MAX_INSIGHTS = 3;

function toCoachTask(task: TwelveWeekTaskInstance): CoachTask {
  return {
    id: task.id,
    title: task.title,
    scheduledDate: task.scheduledDate,
    isCore: task.isCore,
  };
}

function getCompletionPercent(tasks: TwelveWeekTaskInstance[]): number | undefined {
  if (tasks.length === 0) return undefined;
  const completed = tasks.filter((task) => task.completed).length;
  return Math.round((completed / tasks.length) * 100);
}

function getLatestCompletedReview(
  reviews: UniversalWeeklyReview[],
  currentWeek: number,
): UniversalWeeklyReview | undefined {
  return reviews
    .filter((review) => review.reviewCompleted && review.weekNumber <= currentWeek)
    .sort((left, right) => right.weekNumber - left.weekNumber)[0];
}

function toCoachInsights(system: TwelveWeekSystem, weekNumber: number, dateKey: string): CoachInsight[] {
  return getExecutionInsights(system, { weekNumber, todayDateKey: dateKey })
    .slice(0, MAX_INSIGHTS)
    .map((insight) => ({
      id: insight.id,
      severity: insight.severity,
      headline: insight.headline,
      metrics: insight.metrics,
    }));
}

function prioritizeOverdueTasks(tasks: TwelveWeekTaskInstance[]): TwelveWeekTaskInstance[] {
  return [...tasks].sort((left, right) => {
    if (left.isCore !== right.isCore) return left.isCore ? -1 : 1;
    return left.scheduledDate.localeCompare(right.scheduledDate);
  });
}

export function buildPersonalCoachContext(input: {
  goal: Goal;
  system: TwelveWeekSystem;
  referenceDate?: Date;
}): PersonalCoachContext {
  const referenceDate = input.referenceDate ?? new Date();
  const dateKey = formatDateInputValue(referenceDate);
  const dailyExecution = buildDashboardDailyExecutionSnapshot(input.system, referenceDate);
  const currentWeek = dailyExecution.currentWeek;
  const currentWeekTasks = input.system.taskInstances.filter(
    (task) => task.weekNumber === currentWeek && !task.skipped,
  );
  const executionToDateTasks = currentWeekTasks.filter((task) => task.scheduledDate <= dateKey);
  const executionToDateCoreTasks = executionToDateTasks.filter((task) => task.isCore);
  const weeklyEvidence = getWeeklyReviewEvidence(input.system, currentWeek, referenceDate);
  const latestReview = getLatestCompletedReview(input.system.weeklyReviews, currentWeek);
  const overdueTasks = prioritizeOverdueTasks(
    getTwelveWeekMissedTasks(input.system, referenceDate).filter((task) => !task.completed),
  );
  const openTodayTasks = dailyExecution.openScheduledTodayTasks.slice(0, MAX_TODAY_TASKS);
  const primaryTask = dailyExecution.homePrimaryTask
    ? toCoachTask(dailyExecution.homePrimaryTask)
    : undefined;
  const weeklyFocus = input.system.weeklyPlans.find((plan) => plan.weekNumber === currentWeek)?.focus.trim();
  const outcome = input.system.week12Outcome.trim() || input.system.vision12Week.trim() || undefined;

  return {
    goal: {
      id: input.goal.id,
      title: input.goal.title,
      outcome,
    },
    cycle: {
      currentWeek,
      totalWeeks: input.system.totalWeeks,
      phase: currentWeek >= input.system.totalWeeks ? "final_week" : "active",
    },
    today: {
      date: dateKey,
      primaryTask,
      openTasks: openTodayTasks.map(toCoachTask),
      scheduledCount: dailyExecution.todayTotalCount,
      completedCount: dailyExecution.todayCompletedCount,
      allScheduledComplete:
        dailyExecution.todayTotalCount > 0 &&
        dailyExecution.todayCompletedCount >= dailyExecution.todayTotalCount,
    },
    week: {
      focus: weeklyFocus || undefined,
      completionToDate: getCompletionPercent(executionToDateTasks),
      wholeWeekCompletion: weeklyEvidence.completion.isEmpty
        ? undefined
        : weeklyEvidence.completion.percent,
      coreCompletionToDate: getCompletionPercent(executionToDateCoreTasks),
      overdueCount: dailyExecution.overdueOpenCount,
      overdueTasks: overdueTasks.slice(0, MAX_OVERDUE_TASKS).map(toCoachTask),
      carryOverCount: weeklyEvidence.carryOverCount,
      checkInDays: weeklyEvidence.checkIns.days,
      possibleCheckInDays: weeklyEvidence.checkIns.possibleDays,
      reviewDueToday: dailyExecution.reviewDueToday,
    },
    reflection: latestReview
      ? {
          weekNumber: latestReview.weekNumber,
          keepTactic: latestReview.keepTactic?.trim() || undefined,
          mainObstacle: latestReview.mainObstacle.trim() || undefined,
          nextWeekPriority: latestReview.nextWeekPriority.trim() || undefined,
          nextWeekCommitments: latestReview.nextWeekCommitments
            ?.map((commitment) => commitment.trim())
            .filter(Boolean)
            .slice(0, MAX_COMMITMENTS),
          reduceTactic: latestReview.reduceTactic?.trim() || undefined,
          workloadDecision: latestReview.workloadDecision || undefined,
        }
      : undefined,
    deterministicInsights: toCoachInsights(input.system, currentWeek, dateKey),
    lagMetric: {
      name: input.system.lagMetric.name,
      unit: input.system.lagMetric.unit,
      target: input.system.lagMetric.target,
      currentValue: input.system.lagMetric.currentValue,
    },
  };
}

export function getPersonalCoachContextSignature(context: PersonalCoachContext): string {
  const serialized = JSON.stringify(context);
  let hash = 0x811c9dc5;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `coach_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
