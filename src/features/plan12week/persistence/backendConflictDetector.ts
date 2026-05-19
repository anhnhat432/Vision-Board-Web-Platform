import type { TwelveWeekSystem, TwelveWeekTaskInstance } from "@/app/utils/storage-types";
import { getCalendarDateKey } from "@/app/utils/storage-date-utils";
import { isDailyCheckInMetric } from "../constants/progressMetrics";
import { getUniversalWeeklyReviewExecutionScore } from "./reviewExecutionScore";
import type { PlanDetails, Task as BackendTask, WeekDetails } from "@/types/plan";

export type BackendPlanConflictKind =
  | "weekly_focus"
  | "weekly_milestone"
  | "task_completion"
  | "task_title"
  | "task_schedule"
  | "linked_task_missing_backend"
  | "daily_checkin"
  | "weekly_review_output"
  | "weekly_review_priority"
  | "weekly_review_score";

export interface BackendPlanConflict {
  kind: BackendPlanConflictKind;
  weekNumber?: number;
  localId?: string;
  backendId?: string;
  localValue: string;
  backendValue: string;
  message: string;
}

export interface BackendPlanConflictReport {
  hasConflicts: boolean;
  conflicts: BackendPlanConflict[];
  conflictCountByKind: Record<BackendPlanConflictKind, number>;
}

const CONFLICT_KINDS: BackendPlanConflictKind[] = [
  "weekly_focus",
  "weekly_milestone",
  "task_completion",
  "task_title",
  "task_schedule",
  "linked_task_missing_backend",
  "daily_checkin",
  "weekly_review_output",
  "weekly_review_priority",
  "weekly_review_score",
];

function normalizeText(value: string | undefined | null): string {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeComparableText(value: string | undefined | null): string {
  return normalizeText(value).toLowerCase();
}

function normalizeDateKey(value: string | undefined): string {
  return getCalendarDateKey(value ?? "") ?? "";
}

function getBackendTaskDone(task: BackendTask): boolean {
  return task.status === "done";
}

function formatCompletion(value: boolean): string {
  return value ? "done" : "not done";
}

function addConflict(conflicts: BackendPlanConflict[], conflict: BackendPlanConflict): void {
  conflicts.push(conflict);
}

function buildWeekByNumber(details: PlanDetails): Map<number, WeekDetails> {
  return new Map(details.weeks.map((week) => [week.weekNumber, week]));
}

function findBackendTaskForLocalTask(
  localTask: TwelveWeekTaskInstance,
  backendWeek: WeekDetails | undefined,
  taskIdByLocalTaskId: Record<string, string>,
): BackendTask | null {
  if (!backendWeek) return null;

  const linkedTaskId = taskIdByLocalTaskId[localTask.id];
  if (linkedTaskId) {
    return backendWeek.tasks.find((task) => task.id === linkedTaskId) ?? null;
  }

  const localTitleKey = normalizeComparableText(localTask.title);
  const localDateKey = normalizeDateKey(localTask.scheduledDate);
  const sameTitleTasks = backendWeek.tasks.filter((task) => normalizeComparableText(task.title) === localTitleKey);
  const sameTitleAndDateTask = sameTitleTasks.find((task) => normalizeDateKey(task.scheduledDate) === localDateKey);

  return sameTitleAndDateTask ?? (sameTitleTasks.length === 1 ? sameTitleTasks[0] : null);
}

function detectWeeklyPlanConflicts(
  system: TwelveWeekSystem,
  backendWeekByNumber: ReadonlyMap<number, WeekDetails>,
  conflicts: BackendPlanConflict[],
): void {
  system.weeklyPlans.forEach((weeklyPlan) => {
    const backendWeek = backendWeekByNumber.get(weeklyPlan.weekNumber);
    if (!backendWeek) return;

    const localFocus = normalizeText(weeklyPlan.focus);
    const backendFocus = normalizeText(backendWeek.focus);
    if (localFocus && backendFocus && normalizeComparableText(localFocus) !== normalizeComparableText(backendFocus)) {
      addConflict(conflicts, {
        kind: "weekly_focus",
        weekNumber: weeklyPlan.weekNumber,
        backendId: backendWeek.id,
        localValue: localFocus,
        backendValue: backendFocus,
        message: `Trọng tâm tuần ${weeklyPlan.weekNumber} khác nhau giữa thiết bị và máy chủ.`,
      });
    }

    const localMilestone = normalizeText(weeklyPlan.milestone);
    const backendMilestone = normalizeText(backendWeek.expectedOutput);
    if (
      localMilestone &&
      backendMilestone &&
      normalizeComparableText(localMilestone) !== normalizeComparableText(backendMilestone)
    ) {
      addConflict(conflicts, {
        kind: "weekly_milestone",
        weekNumber: weeklyPlan.weekNumber,
        backendId: backendWeek.id,
        localValue: localMilestone,
        backendValue: backendMilestone,
        message: `Cột mốc tuần ${weeklyPlan.weekNumber} khác nhau giữa thiết bị và máy chủ.`,
      });
    }
  });
}

function detectTaskConflicts(
  system: TwelveWeekSystem,
  backendWeekByNumber: ReadonlyMap<number, WeekDetails>,
  taskIdByLocalTaskId: Record<string, string>,
  conflicts: BackendPlanConflict[],
): void {
  system.taskInstances.forEach((localTask) => {
    const backendWeek = backendWeekByNumber.get(localTask.weekNumber);
    const linkedTaskId = taskIdByLocalTaskId[localTask.id];
    const backendTask = findBackendTaskForLocalTask(localTask, backendWeek, taskIdByLocalTaskId);

    if (linkedTaskId && !backendTask) {
      addConflict(conflicts, {
        kind: "linked_task_missing_backend",
        weekNumber: localTask.weekNumber,
        localId: localTask.id,
        backendId: linkedTaskId,
        localValue: localTask.title,
        backendValue: "",
        message: `Việc trên thiết bị ${localTask.id} đang liên kết với một việc trên máy chủ không còn tồn tại.`,
      });
      return;
    }

    if (!backendTask) return;

    const localCompleted = localTask.completed;
    const backendCompleted = getBackendTaskDone(backendTask);
    if (localCompleted !== backendCompleted) {
      addConflict(conflicts, {
        kind: "task_completion",
        weekNumber: localTask.weekNumber,
        localId: localTask.id,
        backendId: backendTask.id,
        localValue: formatCompletion(localCompleted),
        backendValue: formatCompletion(backendCompleted),
        message: `Trạng thái hoàn thành của việc "${localTask.title}" khác nhau giữa thiết bị và máy chủ.`,
      });
    }

    const localTitle = normalizeText(localTask.title);
    const backendTitle = normalizeText(backendTask.title);
    if (localTitle && backendTitle && normalizeComparableText(localTitle) !== normalizeComparableText(backendTitle)) {
      addConflict(conflicts, {
        kind: "task_title",
        weekNumber: localTask.weekNumber,
        localId: localTask.id,
        backendId: backendTask.id,
        localValue: localTitle,
        backendValue: backendTitle,
        message: `Tên việc khác nhau với việc trên thiết bị ${localTask.id}.`,
      });
    }

    const localDate = normalizeDateKey(localTask.scheduledDate);
    const backendDate = normalizeDateKey(backendTask.scheduledDate);
    if (localDate && backendDate && localDate !== backendDate) {
      addConflict(conflicts, {
        kind: "task_schedule",
        weekNumber: localTask.weekNumber,
        localId: localTask.id,
        backendId: backendTask.id,
        localValue: localDate,
        backendValue: backendDate,
        message: `Ngày lên lịch của việc "${localTask.title}" khác nhau giữa thiết bị và máy chủ.`,
      });
    }
  });
}

function detectDailyCheckInConflicts(
  system: TwelveWeekSystem,
  details: PlanDetails,
  conflicts: BackendPlanConflict[],
): void {
  const localCheckInByDate = new Map(
    system.dailyCheckIns
      .map((checkIn) => [normalizeDateKey(checkIn.date), checkIn] as const)
      .filter(([dateKey]) => Boolean(dateKey)),
  );

  details.weeks.forEach((week) => {
    week.metrics
      .filter((metric) => isDailyCheckInMetric(metric.name))
      .forEach((metric) => {
        metric.logs.forEach((log) => {
          const dateKey = normalizeDateKey(log.date);
          const localCheckIn = localCheckInByDate.get(dateKey);
          if (!dateKey || !localCheckIn) return;

          const backendDidWork = Boolean(log.completed || log.value > 0);
          if (localCheckIn.didWorkToday === backendDidWork) return;

          addConflict(conflicts, {
            kind: "daily_checkin",
            weekNumber: week.weekNumber,
            localId: dateKey,
            backendId: log.id,
            localValue: formatCompletion(localCheckIn.didWorkToday),
            backendValue: formatCompletion(backendDidWork),
            message: `Check-in ngày ${dateKey} khác nhau giữa thiết bị và máy chủ.`,
          });
        });
      });
  });
}

function detectWeeklyReviewConflicts(
  system: TwelveWeekSystem,
  backendWeekByNumber: ReadonlyMap<number, WeekDetails>,
  conflicts: BackendPlanConflict[],
): void {
  const localReviewByWeek = new Map(system.weeklyReviews.map((review) => [review.weekNumber, review]));

  localReviewByWeek.forEach((localReview, weekNumber) => {
    const backendWeek = backendWeekByNumber.get(weekNumber);
    const backendReview = backendWeek?.review;
    if (!backendWeek || !backendReview) return;

    const localOutput = normalizeText(localReview.biggestOutputThisWeek);
    const backendOutput = normalizeText(backendReview.reflection);
    if (
      localOutput &&
      backendOutput &&
      normalizeComparableText(localOutput) !== normalizeComparableText(backendOutput)
    ) {
      addConflict(conflicts, {
        kind: "weekly_review_output",
        weekNumber,
        backendId: backendWeek.id,
        localValue: localOutput,
        backendValue: backendOutput,
        message: `Kết quả review tuần ${weekNumber} khác nhau giữa thiết bị và máy chủ.`,
      });
    }

    const localPriority = normalizeText(localReview.nextWeekPriority);
    const backendPriority = normalizeText(backendReview.adjustments);
    if (
      localPriority &&
      backendPriority &&
      normalizeComparableText(localPriority) !== normalizeComparableText(backendPriority)
    ) {
      addConflict(conflicts, {
        kind: "weekly_review_priority",
        weekNumber,
        backendId: backendWeek.id,
        localValue: localPriority,
        backendValue: backendPriority,
        message: `Ưu tiên tiếp theo trong review tuần ${weekNumber} khác nhau giữa thiết bị và máy chủ.`,
      });
    }

    const localScore = getUniversalWeeklyReviewExecutionScore(localReview);
    const backendScore = backendReview.executionScore;
    if (localScore > 0 && backendScore > 0 && localScore !== backendScore) {
      addConflict(conflicts, {
        kind: "weekly_review_score",
        weekNumber,
        backendId: backendWeek.id,
        localValue: String(localScore),
        backendValue: String(backendScore),
        message: `Điểm review tuần ${weekNumber} khác nhau giữa thiết bị và máy chủ.`,
      });
    }
  });
}

export function detectBackendPlanConflicts(
  system: TwelveWeekSystem,
  details: PlanDetails,
  taskIdByLocalTaskId: Record<string, string> = {},
): BackendPlanConflictReport {
  const conflicts: BackendPlanConflict[] = [];
  const backendWeekByNumber = buildWeekByNumber(details);

  detectWeeklyPlanConflicts(system, backendWeekByNumber, conflicts);
  detectTaskConflicts(system, backendWeekByNumber, taskIdByLocalTaskId, conflicts);
  detectDailyCheckInConflicts(system, details, conflicts);
  detectWeeklyReviewConflicts(system, backendWeekByNumber, conflicts);

  const conflictCountByKind = CONFLICT_KINDS.reduce<Record<BackendPlanConflictKind, number>>(
    (accumulator, kind) => {
      accumulator[kind] = conflicts.filter((conflict) => conflict.kind === kind).length;
      return accumulator;
    },
    {} as Record<BackendPlanConflictKind, number>,
  );

  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
    conflictCountByKind,
  };
}
