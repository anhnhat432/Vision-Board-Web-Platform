import { useCallback, useMemo, useState } from "react";

import { toAppError } from "@/lib/api/apiClient";
import type { ApiClientError } from "@/lib/api/apiClient";
import { createMetric, getMetrics, logMetric, updateMetricLog } from "@/services/metricService";
import { createPlan, getPlan, getPlans } from "@/services/planService";
import { addTask, updateTask } from "@/services/taskService";
import { updateWeek, updateWeekReview } from "@/services/weekService";
import type { AppError } from "@/types/api";
import type { PlanDetails, Task, WeekDetails } from "@/types/plan";
import type { TwelveWeekSystem, TwelveWeekTaskInstance } from "@/app/utils/storage-types";
import { isDemoMode } from "@/app/utils/app-mode";
import { getCalendarDateKey } from "@/app/utils/storage-date-utils";
import { getTwelveWeekCurrentWeek } from "@/app/utils/storage-twelve-week";
import { DAILY_CHECKIN_METRIC_NAME } from "../constants/progressMetrics";
import { getUniversalWeeklyReviewExecutionScore } from "../persistence/reviewExecutionScore";
import {
  getMetricIdForGoal,
  getPlanLink,
  getRemoteTaskIdForGoal,
  getTaskRemoteRevision,
  getWeekIdForGoal,
  getWeekRemoteRevision,
  savePlanDetailsLink,
  setMetricIdForGoal,
  setRemoteTaskIdForGoal,
  updateWeekRevisionInLink,
} from "../persistence/planLinkStore";
import { usePlanSyncQueue } from "./usePlanSyncQueue";
import type { SyncQueueItem, SyncStatus } from "../persistence/syncQueueStore";

type SnapshotStatus = "idle" | "success" | "partial" | "error";

export interface PlanExecutionSyncSnapshot {
  at: string;
  status: SnapshotStatus;
  syncedCount: number;
  skippedCount: number;
  failedCount: number;
  planId: string | null;
  message: string;
  conflictCount?: number;
}

export interface ConflictInfo {
  entityType: "task" | "week" | "plan";
  entityId: string;
  message: string;
}

export interface UsePlanExecutionSyncOptions {
  goalId?: string | null;
  system?: TwelveWeekSystem | null;
  enabled?: boolean;
}

interface SyncWeeklyReviewInput {
  weekNumber: number;
  executionScore: number;
  reflection?: string;
  adjustments?: string;
}

interface SyncDailyCheckInInput {
  weekNumber: number;
  date: string;
  didWorkToday: boolean;
}

interface SyncLocalSnapshotInput {
  system?: TwelveWeekSystem | null;
}

interface SyncCounter {
  syncedCount: number;
  skippedCount: number;
  failedCount: number;
  conflictCount: number;
}

interface SyncTaskSnapshotOptions {
  allowStatusDowngrade?: boolean;
}

function toIsoDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.valueOf())) return undefined;
  return parsed.toISOString();
}

function getNormalizedMetricLogDateKey(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const isoLikePrefixMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})(?:$|T)/);
  if (isoLikePrefixMatch) {
    return isoLikePrefixMatch[1] ?? null;
  }

  return getCalendarDateKey(trimmed);
}

function getTaskDateKey(value: string | undefined): string {
  return getNormalizedMetricLogDateKey(value) ?? "";
}

function getTaskStatus(completed: boolean): Task["status"] {
  return completed ? "done" : "todo";
}

function findWeekDetails(details: PlanDetails, weekNumber: number): WeekDetails | null {
  return details.weeks.find((week) => week.weekNumber === weekNumber) ?? null;
}

function findRemoteTaskForLocalTask(
  week: WeekDetails,
  localTask: TwelveWeekTaskInstance,
  linkedRemoteTaskId: string | null,
): Task | null {
  if (linkedRemoteTaskId) {
    const linkedTask = week.tasks.find((task) => task.id === linkedRemoteTaskId);
    if (linkedTask) return linkedTask;
  }

  const localTitle = localTask.title.trim().toLowerCase();
  const localDateKey = getTaskDateKey(localTask.scheduledDate);
  const sameTitleTasks = week.tasks.filter((task) => task.title.trim().toLowerCase() === localTitle);
  const sameTitleAndDateTasks = sameTitleTasks.filter((task) => getTaskDateKey(task.scheduledDate) === localDateKey);
  const bestSameDateTask = pickBestRemoteTask(sameTitleAndDateTasks);

  return bestSameDateTask ?? (sameTitleTasks.length === 1 ? sameTitleTasks[0] : null);
}

function pickBestRemoteTask(tasks: Task[]): Task | null {
  return [...tasks].sort((left, right) => {
    const completionPriority = Number(right.status === "done") - Number(left.status === "done");
    if (completionPriority !== 0) return completionPriority;
    return left.createdAt.localeCompare(right.createdAt);
  })[0] ?? null;
}

function getTargetRemoteTaskStatus(
  remoteTask: Task,
  localTask: TwelveWeekTaskInstance,
  options: SyncTaskSnapshotOptions,
): Task["status"] {
  const localStatus = getTaskStatus(localTask.completed);
  if (!options.allowStatusDowngrade && remoteTask.status === "done" && localStatus !== "done") {
    return remoteTask.status;
  }
  return localStatus;
}

function shouldUpdateRemoteTask(
  remoteTask: Task,
  localTask: TwelveWeekTaskInstance,
  options: SyncTaskSnapshotOptions,
): boolean {
  if (remoteTask.status !== getTargetRemoteTaskStatus(remoteTask, localTask, options)) return true;
  if (remoteTask.title.trim() !== localTask.title.trim()) return true;
  return getTaskDateKey(remoteTask.scheduledDate) !== getTaskDateKey(localTask.scheduledDate);
}

function getReviewExecutionScore(system: TwelveWeekSystem, weekNumber: number, fallback: number): number {
  const review = system.weeklyReviews.find((item) => item.weekNumber === weekNumber);
  if (!review) return fallback;
  return getUniversalWeeklyReviewExecutionScore(review, fallback);
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

function createSnapshot(
  counter: SyncCounter,
  planId: string | null,
  fallbackStatus: SnapshotStatus = "success",
): PlanExecutionSyncSnapshot {
  const status: SnapshotStatus =
    counter.failedCount > 0 || counter.conflictCount > 0
      ? counter.syncedCount > 0
        ? "partial"
        : counter.conflictCount > 0
          ? "partial"
          : "error"
      : fallbackStatus;

  const message =
    status === "success"
      ? counter.syncedCount > 0
        ? `Đã đồng bộ ${counter.syncedCount} mục 12-week lên backend.`
        : "Backend đã sẵn sàng, chưa có mục 12-week mới cần đẩy lên."
      : status === "partial" && counter.conflictCount > 0
        ? `Đã đồng bộ ${counter.syncedCount} mục, ${counter.conflictCount} mục bị xung đột (đã được cập nhật từ thiết bị khác).`
        : counter.failedCount > 0
          ? `Đã đồng bộ ${counter.syncedCount} mục, còn ${counter.failedCount} mục cần thử lại.`
          : "Chưa thể đồng bộ dữ liệu 12-week lên backend. Dữ liệu local vẫn được giữ nguyên.";

  return {
    at: new Date().toISOString(),
    status,
    syncedCount: counter.syncedCount,
    skippedCount: counter.skippedCount,
    failedCount: counter.failedCount,
    conflictCount: counter.conflictCount,
    planId,
    message,
  };
}

export function usePlanExecutionSync(options: UsePlanExecutionSyncOptions) {
  const goalId = options.goalId ?? null;
  const system = options.system ?? null;
  const enabled = options.enabled ?? true;

  const [pendingRequests, setPendingRequests] = useState(0);
  const [error, setError] = useState<AppError | null>(null);
  const [lastSnapshot, setLastSnapshot] = useState<PlanExecutionSyncSnapshot | null>(null);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [syncQueueLoading, setSyncQueueLoading] = useState(false);

  // runAction wrapper for API calls with conflict detection
  const runAction = useCallback(async <T,>(action: () => Promise<T>, conflictMeta?: { entityType: ConflictInfo["entityType"]; entityId: string }): Promise<T | null> => {
    if (isDemoMode()) {
      console.debug("[Demo Mode] Skipped backend sync");
      return null;
    }

    setPendingRequests((count) => count + 1);
    setError(null);

    try {
      return await action();
    } catch (nextError) {
      const parsedError = toAppError(nextError) as ApiClientError;
      if (parsedError.status === 409 && conflictMeta) {
        const conflict: ConflictInfo = {
          entityType: conflictMeta.entityType,
          entityId: conflictMeta.entityId,
          message: parsedError.message || "Dữ liệu đã được cập nhật từ thiết bị khác.",
        };
        setConflicts((prev) => [...prev, conflict]);
        setError({ message: conflict.message, status: 409 });
        console.warn("[Conflict] Document updated on another device.", conflict);
      } else {
        setError(parsedError);
        console.error("Failed to sync 12-week execution state.", nextError);
      }
      return null;
    } finally {
      setPendingRequests((count) => Math.max(0, count - 1));
    }
  }, []);

  // Ensure plan details exist
  const ensurePlanDetails = useCallback(async (
    goalId: string,
    system: TwelveWeekSystem,
  ): Promise<PlanDetails | null> => {
    const link = getPlanLink(goalId);
    if (link?.planId) {
      const linkedDetails = await runAction(() => getPlan(link.planId));
      if (linkedDetails) {
        savePlanDetailsLink(goalId, linkedDetails);
        return linkedDetails;
      }
    }

    const plans = await runAction(() => getPlans());
    const existingPlan = plans?.find((plan) => plan.smartGoalId === goalId);
    if (existingPlan) {
      const details = await runAction(() => getPlan(existingPlan.id));
      if (details) {
        savePlanDetailsLink(goalId, details);
        return details;
      }
    }

    const createdPlan = await runAction(() =>
      createPlan({
        vision: system.vision12Week,
        smartGoalId: goalId,
        startDate: toIsoDate(system.startDate) ?? new Date().toISOString(),
        initializeWeeks: true,
        totalWeeks: system.totalWeeks || 12,
      }),
    );
    if (!createdPlan) return null;

    const details = await runAction(() => getPlan(createdPlan.id));
    if (!details) return null;

    savePlanDetailsLink(goalId, details);
    return details;
  }, [runAction]);

  // Ensure remote metric exists
  const ensureRemoteMetricId = useCallback(async (
    goalId: string,
    weekId: string,
    weekNumber: number,
    metricName: string,
  ): Promise<string | null> => {
    const knownMetricId = getMetricIdForGoal(goalId, weekNumber, metricName);
    if (knownMetricId) return knownMetricId;

    const metrics = await runAction(() => getMetrics(weekId));
    const existingMetric = metrics?.find(
      (metric) => metric.name.trim().toLowerCase() === metricName.trim().toLowerCase(),
    );

    if (existingMetric) {
      setMetricIdForGoal(goalId, weekNumber, metricName, existingMetric.id);
      return existingMetric.id;
    }

    const createdMetric = await runAction(() =>
      createMetric(weekId, {
        name: metricName,
        weeklyTarget: 0,
      }),
    );
    if (!createdMetric) return null;

    setMetricIdForGoal(goalId, weekNumber, metricName, createdMetric.id);
    return createdMetric.id;
  }, [runAction]);

  // Sync task to remote
  const syncTaskSnapshot = useCallback(async (
    goalId: string,
    details: PlanDetails,
    task: TwelveWeekTaskInstance,
    options: SyncTaskSnapshotOptions = {},
  ): Promise<"synced" | "skipped" | "failed" | "conflict"> => {
    const week = findWeekDetails(details, task.weekNumber);
    if (!week) return "skipped";

    const linkedRemoteTaskId = getRemoteTaskIdForGoal(goalId, task.id);
    const remoteTask = findRemoteTaskForLocalTask(week, task, linkedRemoteTaskId);

    if (!remoteTask) {
      const createdTask = await runAction(() =>
        addTask(week.id, {
          title: task.title,
          status: getTaskStatus(task.completed),
          scheduledDate: toIsoDate(task.scheduledDate),
        }),
      );
      if (!createdTask) return "failed";

      setRemoteTaskIdForGoal(goalId, task.id, createdTask.id, createdTask.revision);
      return "synced";
    }

    const baseRevision = getTaskRemoteRevision(goalId, remoteTask.id) ?? remoteTask.revision;
    setRemoteTaskIdForGoal(goalId, task.id, remoteTask.id, baseRevision);

    if (!shouldUpdateRemoteTask(remoteTask, task, options)) {
      return "skipped";
    }

    const updatedTask = await runAction(
      () =>
        updateTask(remoteTask.id, {
          title: task.title,
          status: getTargetRemoteTaskStatus(remoteTask, task, options),
          scheduledDate: toIsoDate(task.scheduledDate),
          baseRevision,
        }),
      { entityType: "task", entityId: remoteTask.id },
    );

    if (!updatedTask) return "failed";

    setRemoteTaskIdForGoal(goalId, task.id, updatedTask.id, updatedTask.revision);
    return "synced";
  }, [runAction]);

  // Sync daily check-in
  const syncDailyCheckInForWeek = useCallback(async (
    goalId: string,
    weekId: string,
    input: SyncDailyCheckInInput,
  ): Promise<boolean> => {
    const metricId = await ensureRemoteMetricId(goalId, weekId, input.weekNumber, DAILY_CHECKIN_METRIC_NAME);
    if (!metricId) return false;

    const metrics = await runAction(() => getMetrics(weekId));
    if (metrics) {
      const metric =
        metrics.find((item) => item.id === metricId) ??
        metrics.find((item) => item.name.trim().toLowerCase() === DAILY_CHECKIN_METRIC_NAME);

      if (metric) {
        const inputDateKey = getNormalizedMetricLogDateKey(input.date);
        const existingLogForDate = [...metric.logs].reverse().find(
          (log) => inputDateKey && getNormalizedMetricLogDateKey(log.date) === inputDateKey,
        );
        if (existingLogForDate) {
          const existingDidWork = Boolean(existingLogForDate.completed || existingLogForDate.value > 0);
          if (existingDidWork === input.didWorkToday) return true;

          const updatedMetric = await runAction(() =>
            updateMetricLog(metricId, existingLogForDate.id, {
              date: toIsoDate(input.date),
              value: input.didWorkToday ? 1 : 0,
              completed: input.didWorkToday,
            }),
          );
          return Boolean(updatedMetric);
        }
      }
    }

    const updatedMetric = await runAction(() =>
      logMetric(metricId, {
        date: toIsoDate(input.date) ?? new Date().toISOString(),
        value: input.didWorkToday ? 1 : 0,
        completed: input.didWorkToday,
      }),
    );

    return Boolean(updatedMetric);
  }, [ensureRemoteMetricId, runAction]);

  // Sync completed task metric
  const syncCompletedTaskMetricForWeek = useCallback(async (
    goalId: string,
    weekId: string,
    task: TwelveWeekTaskInstance,
  ): Promise<boolean> => {
    if (!task.completed) return true;

    const metricName = task.leadIndicatorName.trim();
    if (!metricName) return true;

    const metricId = await ensureRemoteMetricId(goalId, weekId, task.weekNumber, metricName);
    if (!metricId) return false;

    const metrics = await runAction(() => getMetrics(weekId));
    const metric =
      metrics?.find((item) => item.id === metricId) ??
      metrics?.find((item) => item.name.trim().toLowerCase() === metricName.trim().toLowerCase());
    const taskDateKey = getTaskDateKey(task.scheduledDate);
    const existingCompletionLog = metric?.logs.find(
      (log) => getNormalizedMetricLogDateKey(log.date) === taskDateKey && Boolean(log.completed || log.value > 0),
    );
    if (existingCompletionLog) return true;

    const updatedMetric = await runAction(() =>
      logMetric(metricId, {
        date: toIsoDate(task.scheduledDate) ?? new Date().toISOString(),
        value: 1,
        completed: true,
      }),
    );
    return Boolean(updatedMetric);
  }, [ensureRemoteMetricId, runAction]);

  // Sync weekly review
  const syncWeeklyReviewForWeek = useCallback(async (
    weekId: string,
    input: SyncWeeklyReviewInput,
  ): Promise<boolean> => {
    const updatedWeek = await runAction(() =>
      updateWeekReview(weekId, {
        weekNumber: input.weekNumber,
        executionScore: input.executionScore,
        reflection: input.reflection,
        adjustments: input.adjustments,
      }),
    );
    return Boolean(updatedWeek);
  }, [runAction]);

  // Internal executeSync function for queue processor
  const executeSyncInternal = useCallback(async (item: SyncQueueItem): Promise<unknown> => {
    const { syncType, payload, entityId, entityType } = item;

    switch (syncType) {
      case "task_completed": {
        const taskPayload = payload as { taskId: string; completed: boolean };
        const task = system?.taskInstances.find((t) => t.id === taskPayload.taskId);
        if (!task || !goalId || !system) return true;

        const details = await ensurePlanDetails(goalId, system);
        if (!details) return false;

        const taskSyncResult = await syncTaskSnapshot(
          goalId,
          details,
          { ...task, completed: taskPayload.completed },
          { allowStatusDowngrade: true },
        );
        if (taskSyncResult === "failed") throw new Error("Task sync failed");

        if (!taskPayload.completed) return true;

        const week = findWeekDetails(details, task.weekNumber);
        if (!week) return true;

        const metricResult = await syncCompletedTaskMetricForWeek(goalId, week.id, { ...task, completed: taskPayload.completed });
        if (!metricResult) throw new Error("Metric sync failed");
        return true;
      }

      case "daily_checkin": {
        const checkinPayload = payload as { weekNumber: number; date: string; didWorkToday: boolean };
        if (!goalId || !system) return true;

        const details = await ensurePlanDetails(goalId, system);
        if (!details) return false;

        const weekId = getWeekIdForGoal(goalId, checkinPayload.weekNumber) ?? findWeekDetails(details, checkinPayload.weekNumber)?.id;
        if (!weekId) return true;

        const result = await syncDailyCheckInForWeek(goalId, weekId, checkinPayload);
        if (!result) throw new Error("Daily check-in sync failed");
        return true;
      }

      case "weekly_review": {
        const reviewPayload = payload as { weekNumber: number; executionScore: number; reflection?: string; adjustments?: string };
        if (!goalId || !system) return true;

        const details = await ensurePlanDetails(goalId, system);
        if (!details) return false;

        const weekId = getWeekIdForGoal(goalId, reviewPayload.weekNumber) ?? findWeekDetails(details, reviewPayload.weekNumber)?.id;
        if (!weekId) return true;

        const result = await syncWeeklyReviewForWeek(weekId, reviewPayload);
        if (!result) throw new Error("Weekly review sync failed");
        return true;
      }

      case "plan_snapshot": {
        const snapshotPayload = payload as { system?: TwelveWeekSystem };
        const systemToSync = snapshotPayload.system ?? system;
        if (!goalId || !systemToSync) return true;

        const details = await ensurePlanDetails(goalId, systemToSync);
        if (!details) return false;

        let syncedCount = 0;
        let failedCount = 0;

        // Sync weekly plans
        for (const weekPlan of systemToSync.weeklyPlans) {
          const week = findWeekDetails(details, weekPlan.weekNumber);
          if (!week) continue;

          const focus = weekPlan.focus.trim();
          const expectedOutput = weekPlan.milestone.trim();
          if (week.focus === focus && week.expectedOutput === expectedOutput) continue;

          const updatedWeek = await runAction(
            () => updateWeek(week.id, { focus, expectedOutput, baseRevision: getWeekRemoteRevision(goalId, week.id) }),
            { entityType: "week", entityId: week.id },
          );
          if (updatedWeek) {
            updateWeekRevisionInLink(goalId, updatedWeek.id, (updatedWeek as { revision?: number }).revision ?? 1);
            syncedCount++;
          } else {
            failedCount++;
          }
        }

        // Sync tasks
        for (const task of systemToSync.taskInstances) {
          const result = await syncTaskSnapshot(goalId, details, task);
          if (result === "failed" || result === "conflict") {
            failedCount++;
          } else {
            syncedCount++;
          }

          const weekId = getWeekIdForGoal(goalId, task.weekNumber) ?? findWeekDetails(details, task.weekNumber)?.id;
          if (weekId && task.completed) {
            const metricResult = await syncCompletedTaskMetricForWeek(goalId, weekId, task);
            if (metricResult) {
              syncedCount++;
            } else {
              failedCount++;
            }
          }
        }

        // Sync check-ins
        for (const checkIn of systemToSync.dailyCheckIns) {
          const checkInDate = new Date(checkIn.date);
          const weekNumber = getTwelveWeekCurrentWeek(
            systemToSync,
            Number.isFinite(checkInDate.valueOf()) ? checkInDate : new Date(),
          );
          const weekId = getWeekIdForGoal(goalId, weekNumber) ?? findWeekDetails(details, weekNumber)?.id;
          if (!weekId) continue;

          const synced = await syncDailyCheckInForWeek(goalId, weekId, {
            weekNumber,
            date: checkIn.date,
            didWorkToday: checkIn.didWorkToday,
          });
          if (synced) {
            syncedCount++;
          } else {
            failedCount++;
          }
        }

        // Sync reviews
        for (const review of systemToSync.weeklyReviews.filter(hasReviewContent)) {
          const weekId = getWeekIdForGoal(goalId, review.weekNumber) ?? findWeekDetails(details, review.weekNumber)?.id;
          if (!weekId) continue;

          const synced = await syncWeeklyReviewForWeek(weekId, {
            weekNumber: review.weekNumber,
            executionScore: getReviewExecutionScore(systemToSync, review.weekNumber, review.leadCompletionPercent),
            reflection: review.biggestOutputThisWeek.trim() || undefined,
            adjustments: review.nextWeekPriority.trim() || undefined,
          });
          if (synced) {
            syncedCount++;
          } else {
            failedCount++;
          }
        }

        if (failedCount > 0) {
          throw new Error(`Plan snapshot had ${failedCount} failures`);
        }
        return true;
      }

      case "metric_upsert":
        // Handled by task_completed and daily_checkin
        return true;

      default:
        console.warn(`Unknown sync type: ${syncType}`);
        return true;
    }
  }, [
    goalId,
    system,
    ensurePlanDetails,
    syncTaskSnapshot,
    syncCompletedTaskMetricForWeek,
    syncDailyCheckInForWeek,
    syncWeeklyReviewForWeek,
    runAction,
  ]);

  // Use persistent sync queue — must be after executeSyncInternal is defined
  const syncQueue = usePlanSyncQueue({
    goalId: goalId ?? "",
    enabled: enabled && !isDemoMode(),
    executeSync: executeSyncInternal,
  });

  const loading = pendingRequests > 0 || syncQueue.loading;

  // Public enqueue function - wraps old action pattern
  const enqueueSyncAction = useCallback(<T,>(
    syncType: "task_completed" | "daily_checkin" | "weekly_review" | "plan_snapshot" | "metric_upsert",
    payload: unknown,
    entityId?: string,
    entityType?: "task" | "checkin" | "review" | "plan"
  ): Promise<T | null> => {
    if (!goalId || !enabled || isDemoMode()) {
      return Promise.resolve(null);
    }

    return syncQueue.enqueueSyncAction(syncType, payload, entityId, entityType) as Promise<T | null>;
  }, [goalId, enabled, syncQueue.enqueueSyncAction, executeSyncInternal]);

  // Sync task toggle action
  const syncTaskToggle = useCallback((taskId: string, completed: boolean): Promise<boolean> => {
    if (!goalId || !system || !enabled) return Promise.resolve(true);

    return enqueueSyncAction<boolean>("task_completed", { taskId, completed }, taskId, "task") as Promise<boolean>;
  }, [goalId, system, enabled, enqueueSyncAction]);

  // Sync weekly review action
  const syncWeeklyReview = useCallback((input: SyncWeeklyReviewInput): Promise<boolean> => {
    if (!goalId || !system || !enabled) return Promise.resolve(true);

    return enqueueSyncAction<boolean>("weekly_review", input, undefined, "review") as Promise<boolean>;
  }, [goalId, system, enabled, enqueueSyncAction]);

  // Sync daily check-in action
  const syncDailyCheckIn = useCallback((input: SyncDailyCheckInInput): Promise<boolean> => {
    if (!goalId || !system || !enabled) return Promise.resolve(true);

    return enqueueSyncAction<boolean>("daily_checkin", input, undefined, "checkin") as Promise<boolean>;
  }, [goalId, system, enabled, enqueueSyncAction]);

  // Sync local snapshot action
  const syncLocalSnapshot = useCallback((input: SyncLocalSnapshotInput = {}): Promise<PlanExecutionSyncSnapshot> => {
    if (!goalId || !system || !enabled) {
      const counter: SyncCounter = { syncedCount: 0, skippedCount: 0, failedCount: 0, conflictCount: 0 };
      const snapshot = createSnapshot(counter, null, "idle");
      return Promise.resolve(snapshot);
    }

    const systemToSync = input.system ?? system;
    return enqueueSyncAction<PlanExecutionSyncSnapshot>("plan_snapshot", { system: systemToSync }, undefined, "plan") as Promise<PlanExecutionSyncSnapshot>;
  }, [goalId, system, enabled, enqueueSyncAction]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearConflicts = useCallback(() => {
    setConflicts([]);
  }, []);

  const actions = useMemo(
    () => ({
      syncTaskToggle,
      syncWeeklyReview,
      syncDailyCheckIn,
      syncLocalSnapshot,
      clearError,
      clearConflicts,
    }),
    [clearError, clearConflicts, syncTaskToggle, syncWeeklyReview, syncDailyCheckIn, syncLocalSnapshot],
  );

  const data = useMemo(
    () => ({
      goalId,
      lastSnapshot,
      conflicts,
      queueStatus: syncQueue.queueStatus,
    }),
    [goalId, lastSnapshot, conflicts, syncQueue.queueStatus],
  );

  return {
    loading,
    error,
    data,
    actions,
    // Expose sync queue methods
    processQueue: syncQueue.processQueue,
    queueStatus: syncQueue.queueStatus,
  };
}
