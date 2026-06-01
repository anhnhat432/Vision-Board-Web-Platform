import { getCalendarDateKey } from "@/app/utils/storage-date-utils";
import { getTwelveWeekCurrentWeek } from "@/app/utils/storage-twelve-week";
import type { TwelveWeekSystem, TwelveWeekTaskInstance } from "@/app/utils/storage-types";
import type {
  BulkSyncMetricLogInput,
  BulkSyncRequest,
  BulkSyncReviewInput,
  BulkSyncTaskInput,
  BulkSyncWeekInput,
} from "@/types/bulkSync";
import type { PlanDetails, WeekDetails } from "@/types/plan";
import { DAILY_CHECKIN_METRIC_NAME } from "../constants/progressMetrics";
import {
  getRemoteTaskIdForGoal,
  getTaskRemoteRevision,
  getWeekIdForGoal,
  getWeekRemoteRevision,
} from "./planLinkStore";
import { getUniversalWeeklyReviewExecutionScore } from "./reviewExecutionScore";

function toIsoDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.valueOf())) return undefined;
  return parsed.toISOString();
}

function getTaskDateKey(value: string | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  const isoLikePrefixMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})(?:$|T)/);
  if (isoLikePrefixMatch) return isoLikePrefixMatch[1] ?? "";
  return getCalendarDateKey(trimmed) ?? "";
}

function getTaskStatus(completed: boolean): "done" | "todo" {
  return completed ? "done" : "todo";
}

function findWeekDetails(details: PlanDetails, weekNumber: number): WeekDetails | null {
  return details.weeks.find((week) => week.weekNumber === weekNumber) ?? null;
}

function hasReviewContent(review: TwelveWeekSystem["weeklyReviews"][number]): boolean {
  return Boolean(
    review.reviewCompleted ||
      review.lagProgressValue.trim() ||
      review.biggestOutputThisWeek.trim() ||
      review.mainObstacle.trim() ||
      review.nextWeekPriority.trim(),
  );
}

function buildWeekInputs(system: TwelveWeekSystem, details: PlanDetails, goalId: string): BulkSyncWeekInput[] {
  const inputs: BulkSyncWeekInput[] = [];

  for (const weekPlan of system.weeklyPlans) {
    const week = findWeekDetails(details, weekPlan.weekNumber);
    if (!week) continue;

    const focus = weekPlan.focus.trim();
    const expectedOutput = weekPlan.milestone.trim();
    if (week.focus === focus && week.expectedOutput === expectedOutput) continue;

    inputs.push({
      weekId: week.id,
      focus,
      expectedOutput,
      baseRevision: getWeekRemoteRevision(goalId, week.id),
    });
  }

  return inputs;
}

function buildTaskInputs(system: TwelveWeekSystem, details: PlanDetails, goalId: string): BulkSyncTaskInput[] {
  const inputs: BulkSyncTaskInput[] = [];

  for (const task of system.taskInstances) {
    const week = findWeekDetails(details, task.weekNumber);
    if (!week) continue;

    const linkedRemoteTaskId = getRemoteTaskIdForGoal(goalId, task.id);
    const remoteTask = linkedRemoteTaskId
      ? week.tasks.find((t) => t.id === linkedRemoteTaskId)
      : findRemoteTaskByTitle(week, task);

    if (!remoteTask) {
      inputs.push({
        weekId: week.id,
        title: task.title,
        status: getTaskStatus(task.completed),
        scheduledDate: toIsoDate(task.scheduledDate),
      });
      continue;
    }

    const baseRevision = getTaskRemoteRevision(goalId, remoteTask.id) ?? remoteTask.revision;
    const targetStatus = getTargetStatus(remoteTask.status, task.completed);

    if (
      remoteTask.status === targetStatus &&
      remoteTask.title.trim() === task.title.trim() &&
      getTaskDateKey(remoteTask.scheduledDate) === getTaskDateKey(task.scheduledDate)
    ) {
      continue;
    }

    inputs.push({
      taskId: remoteTask.id,
      weekId: week.id,
      title: task.title,
      status: targetStatus,
      scheduledDate: toIsoDate(task.scheduledDate),
      baseRevision,
    });
  }

  return inputs;
}

function findRemoteTaskByTitle(week: WeekDetails, localTask: TwelveWeekTaskInstance) {
  const localTitle = localTask.title.trim().toLowerCase();
  const localDateKey = getTaskDateKey(localTask.scheduledDate);
  const sameTitleTasks = week.tasks.filter((t) => t.title.trim().toLowerCase() === localTitle);
  const sameTitleAndDate = sameTitleTasks.filter((t) => getTaskDateKey(t.scheduledDate) === localDateKey);

  if (sameTitleAndDate.length > 0) {
    return (
      [...sameTitleAndDate].sort((a, b) => {
        const cp = Number(b.status === "done") - Number(a.status === "done");
        if (cp !== 0) return cp;
        return a.createdAt.localeCompare(b.createdAt);
      })[0] ?? null
    );
  }

  return sameTitleTasks.length === 1 ? sameTitleTasks[0] : null;
}

function getTargetStatus(remoteStatus: string, localCompleted: boolean): "done" | "todo" | "doing" {
  const localStatus = getTaskStatus(localCompleted);
  if (remoteStatus === "done" && localStatus !== "done") return remoteStatus as "done";
  return localStatus;
}

function buildMetricLogInputs(
  system: TwelveWeekSystem,
  details: PlanDetails,
  goalId: string,
): BulkSyncMetricLogInput[] {
  const inputs: BulkSyncMetricLogInput[] = [];

  // Daily check-ins
  for (const checkIn of system.dailyCheckIns) {
    const checkInDate = new Date(checkIn.date);
    const weekNumber = getTwelveWeekCurrentWeek(
      system,
      Number.isFinite(checkInDate.valueOf()) ? checkInDate : new Date(),
    );
    const weekId = getWeekIdForGoal(goalId, weekNumber) ?? findWeekDetails(details, weekNumber)?.id;
    if (!weekId) continue;

    inputs.push({
      weekId,
      metricName: DAILY_CHECKIN_METRIC_NAME,
      date: toIsoDate(checkIn.date) ?? new Date().toISOString(),
      value: checkIn.didWorkToday ? 1 : 0,
      completed: checkIn.didWorkToday,
    });
  }

  // Completed task metrics
  for (const task of system.taskInstances) {
    if (!task.completed) continue;
    const metricName = task.leadIndicatorName.trim();
    if (!metricName) continue;

    const weekId = getWeekIdForGoal(goalId, task.weekNumber) ?? findWeekDetails(details, task.weekNumber)?.id;
    if (!weekId) continue;

    inputs.push({
      weekId,
      metricName,
      date: toIsoDate(task.scheduledDate) ?? new Date().toISOString(),
      value: 1,
      completed: true,
    });
  }

  return inputs;
}

function buildReviewInputs(system: TwelveWeekSystem, details: PlanDetails, goalId: string): BulkSyncReviewInput[] {
  const inputs: BulkSyncReviewInput[] = [];

  for (const review of system.weeklyReviews.filter(hasReviewContent)) {
    const weekId = getWeekIdForGoal(goalId, review.weekNumber) ?? findWeekDetails(details, review.weekNumber)?.id;
    if (!weekId) continue;

    inputs.push({
      weekId,
      weekNumber: review.weekNumber,
      executionScore: getUniversalWeeklyReviewExecutionScore(review, review.leadCompletionPercent),
      reflection: review.biggestOutputThisWeek.trim() || undefined,
      adjustments: review.nextWeekPriority.trim() || undefined,
    });
  }

  return inputs;
}

export function buildBulkSyncRequest(system: TwelveWeekSystem, details: PlanDetails, goalId: string): BulkSyncRequest {
  const weeks = buildWeekInputs(system, details, goalId);
  const tasks = buildTaskInputs(system, details, goalId);
  const metricLogs = buildMetricLogInputs(system, details, goalId);
  const reviews = buildReviewInputs(system, details, goalId);

  return { weeks, tasks, metricLogs, reviews };
}

export function isBulkRequestEmpty(request: BulkSyncRequest): boolean {
  return (
    (request.weeks?.length ?? 0) === 0 &&
    (request.tasks?.length ?? 0) === 0 &&
    (request.metricLogs?.length ?? 0) === 0 &&
    (request.reviews?.length ?? 0) === 0
  );
}
