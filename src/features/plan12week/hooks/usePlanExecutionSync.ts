import { useCallback, useMemo, useRef, useState } from "react";

import { isRateLimitError, RateLimitError, toAppError } from "@/lib/api/apiClient";
import type { ApiClientError } from "@/lib/api/apiClient";
import { createMetric, getMetrics, logMetric, updateMetricLog } from "@/services/metricService";
import { bulkSyncPlan, createPlan, getPlan, getPlans } from "@/services/planService";
import { addTask, updateTask } from "@/services/taskService";
import { updateWeek, updateWeekReview } from "@/services/weekService";
import type { BulkSyncResponse } from "@/types/bulkSync";
import { buildBulkSyncRequest, isBulkRequestEmpty } from "../persistence/bulkSyncBuilder";
import type { AppError } from "@/types/api";
import type { PlanDetails, Task, WeekDetails } from "@/types/plan";
import type { TwelveWeekSystem, TwelveWeekTaskInstance } from "@/app/utils/storage-types";
import { isDemoMode } from "@/app/utils/app-mode";
import { getCalendarDateKey } from "@/app/utils/storage-date-utils";
import { getTwelveWeekCurrentWeek } from "@/app/utils/storage-twelve-week";
import { DAILY_CHECKIN_METRIC_NAME } from "../constants/progressMetrics";
import { getCachedMetrics, invalidateMetricsCache, setCachedMetrics } from "../persistence/metricCache";
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
  updateTaskRevisionInLink,
  updateWeekRevisionInLink,
} from "../persistence/planLinkStore";
import { usePlanSyncQueue } from "./usePlanSyncQueue";
import type { SyncQueueItem, SyncType } from "../persistence/syncQueueStore";

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

const PLAN_SNAPSHOT_SYNC_DEBOUNCE_MS = 5_000;
const DEFAULT_RATE_LIMIT_RETRY_MS = 5_000;

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
        ? `Đã đồng bộ ${counter.syncedCount} mục 12 tuần lên máy chủ.`
        : "Máy chủ đã sẵn sàng, chưa có mục 12 tuần mới cần gửi lên."
      : status === "partial" && counter.conflictCount > 0
        ? `Đã đồng bộ ${counter.syncedCount} mục, ${counter.conflictCount} mục bị xung đột (đã được cập nhật từ thiết bị khác).`
        : counter.failedCount > 0
          ? `Đã đồng bộ ${counter.syncedCount} mục, còn ${counter.failedCount} mục cần thử lại.`
          : "Chưa thể đồng bộ dữ liệu 12 tuần lên máy chủ. Dữ liệu trên thiết bị vẫn được giữ nguyên.";

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
  const snapshotInFlightRef = useRef<Promise<PlanExecutionSyncSnapshot> | null>(null);
  const lastSnapshotSyncStartedAtRef = useRef(0);
  const snapshotDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSnapshotResolversRef = useRef<
    Array<{
      resolve: (snapshot: PlanExecutionSyncSnapshot) => void;
      reject: (error: unknown) => void;
    }>
  >([]);
  const latestSnapshotSystemRef = useRef<TwelveWeekSystem | null | undefined>(null);
  const readInFlightRef = useRef(new Map<string, Promise<unknown>>());

  const dedupRead = useCallback(<T,>(key: string, action: () => Promise<T>): Promise<T> => {
    const existing = readInFlightRef.current.get(key) as Promise<T> | undefined;
    if (existing) return existing;

    const promise = action().finally(() => {
      readInFlightRef.current.delete(key);
    });
    readInFlightRef.current.set(key, promise);
    return promise;
  }, []);

  const getPlanDeduped = useCallback((planId: string): Promise<PlanDetails> => {
    return dedupRead(`plan:${planId}`, () => getPlan(planId));
  }, [dedupRead]);

  const getPlansDeduped = useCallback(() => {
    return dedupRead("plans:list", () => getPlans());
  }, [dedupRead]);

  const getMetricsCached = useCallback(async (weekId: string) => {
    const cachedMetrics = getCachedMetrics(weekId);
    if (cachedMetrics) return cachedMetrics;

    const metrics = await dedupRead(`metrics:${weekId}`, () => getMetrics(weekId));
    setCachedMetrics(weekId, metrics);
    return metrics;
  }, [dedupRead]);

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
      if (isRateLimitError(parsedError)) {
        throw new RateLimitError(parsedError.retryAfterMs ?? DEFAULT_RATE_LIMIT_RETRY_MS, parsedError.message);
      }

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
      const linkedDetails = await runAction(() => getPlanDeduped(link.planId));
      if (linkedDetails) {
        savePlanDetailsLink(goalId, linkedDetails);
        return linkedDetails;
      }
    }

    const plans = await runAction(() => getPlansDeduped());
    const existingPlan = plans?.find((plan) => plan.smartGoalId === goalId);
    if (existingPlan) {
      const details = await runAction(() => getPlanDeduped(existingPlan.id));
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

    const details = await runAction(() => getPlanDeduped(createdPlan.id));
    if (!details) return null;

    savePlanDetailsLink(goalId, details);
    return details;
  }, [runAction, getPlanDeduped, getPlansDeduped]);

  // Ensure remote metric exists
  const ensureRemoteMetricId = useCallback(async (
    goalId: string,
    weekId: string,
    weekNumber: number,
    metricName: string,
  ): Promise<string | null> => {
    const knownMetricId = getMetricIdForGoal(goalId, weekNumber, metricName);
    if (knownMetricId) return knownMetricId;

    const metrics = await runAction(() => getMetricsCached(weekId));
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

    invalidateMetricsCache(weekId);
    setMetricIdForGoal(goalId, weekNumber, metricName, createdMetric.id);
    return createdMetric.id;
  }, [runAction, getMetricsCached]);

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

    const metrics = await runAction(() => getMetricsCached(weekId));
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
          if (updatedMetric) invalidateMetricsCache(weekId);
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

    if (updatedMetric) invalidateMetricsCache(weekId);
    return Boolean(updatedMetric);
  }, [ensureRemoteMetricId, runAction, getMetricsCached]);

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

    const metrics = await runAction(() => getMetricsCached(weekId));
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
    if (updatedMetric) invalidateMetricsCache(weekId);
    return Boolean(updatedMetric);
  }, [ensureRemoteMetricId, runAction, getMetricsCached]);

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

  const syncTaskToggleNow = useCallback(async (taskId: string, completed: boolean): Promise<boolean> => {
    if (!goalId || !system || isDemoMode()) return true;

    const task = system.taskInstances.find((item) => item.id === taskId);
    if (!task) return true;

    const details = await ensurePlanDetails(goalId, system);
    if (!details) return false;

    const taskSyncResult = await syncTaskSnapshot(
      goalId,
      details,
      { ...task, completed },
      { allowStatusDowngrade: true },
    );
    if (taskSyncResult === "failed" || taskSyncResult === "conflict") return false;

    if (!completed) return true;

    const week = findWeekDetails(details, task.weekNumber);
    if (!week) return true;

    return syncCompletedTaskMetricForWeek(goalId, week.id, { ...task, completed });
  }, [goalId, system, ensurePlanDetails, syncTaskSnapshot, syncCompletedTaskMetricForWeek]);

  const syncDailyCheckInNow = useCallback(async (input: SyncDailyCheckInInput): Promise<boolean> => {
    if (!goalId || !system || isDemoMode()) return true;

    const details = await ensurePlanDetails(goalId, system);
    if (!details) return false;

    const weekId = getWeekIdForGoal(goalId, input.weekNumber) ?? findWeekDetails(details, input.weekNumber)?.id;
    if (!weekId) return true;

    return syncDailyCheckInForWeek(goalId, weekId, input);
  }, [goalId, system, ensurePlanDetails, syncDailyCheckInForWeek]);

  const syncWeeklyReviewNow = useCallback(async (input: SyncWeeklyReviewInput): Promise<boolean> => {
    if (!goalId || !system || isDemoMode()) return true;

    const details = await ensurePlanDetails(goalId, system);
    if (!details) return false;

    const weekId = getWeekIdForGoal(goalId, input.weekNumber) ?? findWeekDetails(details, input.weekNumber)?.id;
    if (!weekId) return true;

    return syncWeeklyReviewForWeek(weekId, input);
  }, [goalId, system, ensurePlanDetails, syncWeeklyReviewForWeek]);

  // ── Apply bulk sync response to link store + counters ──────────────
  const applyBulkSyncResponse = useCallback((
    currentGoalId: string,
    systemToSync: TwelveWeekSystem,
    response: BulkSyncResponse,
    counter: SyncCounter,
  ): void => {
    // Weeks
    for (const weekResult of response.weeks) {
      if (weekResult.ok && weekResult.revision != null) {
        updateWeekRevisionInLink(currentGoalId, weekResult.weekId, weekResult.revision);
        counter.syncedCount += 1;
      } else if (weekResult.conflict) {
        counter.conflictCount += 1;
        setConflicts((prev) => [...prev, {
          entityType: "week" as const,
          entityId: weekResult.weekId,
          message: weekResult.error || "Dữ liệu tuần đã được cập nhật từ thiết bị khác.",
        }]);
      } else {
        counter.failedCount += 1;
      }
    }

    // Tasks
    for (const taskResult of response.tasks) {
      if (taskResult.ok) {
        // Find local task that maps to this result to update the link
        const localTask = systemToSync.taskInstances.find((t) => {
          const linkedRemoteId = getRemoteTaskIdForGoal(currentGoalId, t.id);
          return linkedRemoteId === taskResult.clientTaskId || linkedRemoteId === taskResult.taskId;
        }) ?? systemToSync.taskInstances.find((t) => {
          // For newly created tasks, clientTaskId is empty — match by title+weekId
          if (taskResult.clientTaskId) return false;
          const weekId = getWeekIdForGoal(currentGoalId, t.weekNumber);
          return weekId === taskResult.weekId && !getRemoteTaskIdForGoal(currentGoalId, t.id);
        });

        if (localTask) {
          setRemoteTaskIdForGoal(currentGoalId, localTask.id, taskResult.taskId, taskResult.revision);
        } else if (taskResult.clientTaskId && taskResult.revision != null) {
          updateTaskRevisionInLink(currentGoalId, taskResult.clientTaskId, taskResult.taskId, taskResult.revision);
        }
        counter.syncedCount += 1;
      } else if (taskResult.conflict) {
        counter.conflictCount += 1;
        setConflicts((prev) => [...prev, {
          entityType: "task" as const,
          entityId: taskResult.taskId,
          message: taskResult.error || "Dữ liệu việc đã được cập nhật từ thiết bị khác.",
        }]);
      } else {
        counter.failedCount += 1;
      }
    }

    // Metric logs
    for (const metricResult of response.metricLogs) {
      if (metricResult.ok) {
        if (metricResult.metricId) {
          // Find weekNumber for this weekId
          const weekNumber = systemToSync.weeklyPlans.findIndex((wp) => {
            return getWeekIdForGoal(currentGoalId, wp.weekNumber) === metricResult.weekId;
          });
          if (weekNumber >= 0) {
            setMetricIdForGoal(currentGoalId, systemToSync.weeklyPlans[weekNumber].weekNumber, metricResult.metricName, metricResult.metricId);
          }
        }
        counter.syncedCount += 1;
      } else {
        counter.failedCount += 1;
      }
    }

    // Reviews
    for (const reviewResult of response.reviews) {
      if (reviewResult.ok && reviewResult.revision != null) {
        updateWeekRevisionInLink(currentGoalId, reviewResult.weekId, reviewResult.revision);
        counter.syncedCount += 1;
      } else if (reviewResult.conflict) {
        counter.conflictCount += 1;
      } else if (!reviewResult.ok) {
        counter.failedCount += 1;
      }
    }
  }, []);

  // ── Legacy per-entity sync (fallback when bulk endpoint unavailable) ─
  const syncPlanSnapshotLegacy = useCallback(async (
    currentGoalId: string,
    systemToSync: TwelveWeekSystem,
    details: PlanDetails,
    counter: SyncCounter,
  ): Promise<void> => {
    for (const weekPlan of systemToSync.weeklyPlans) {
      const week = findWeekDetails(details, weekPlan.weekNumber);
      if (!week) {
        counter.skippedCount += 1;
        continue;
      }

      const focus = weekPlan.focus.trim();
      const expectedOutput = weekPlan.milestone.trim();
      if (week.focus === focus && week.expectedOutput === expectedOutput) {
        counter.skippedCount += 1;
        continue;
      }

      const updatedWeek = await runAction(
        () => updateWeek(week.id, { focus, expectedOutput, baseRevision: getWeekRemoteRevision(currentGoalId, week.id) }),
        { entityType: "week", entityId: week.id },
      );
      if (updatedWeek) {
        updateWeekRevisionInLink(currentGoalId, updatedWeek.id, (updatedWeek as { revision?: number }).revision ?? 1);
        counter.syncedCount += 1;
      } else {
        counter.failedCount += 1;
      }
    }

    for (const task of systemToSync.taskInstances) {
      const result = await syncTaskSnapshot(currentGoalId, details, task);
      if (result === "synced") {
        counter.syncedCount += 1;
      } else if (result === "skipped") {
        counter.skippedCount += 1;
      } else if (result === "conflict") {
        counter.conflictCount += 1;
      } else {
        counter.failedCount += 1;
      }

      const weekId = getWeekIdForGoal(currentGoalId, task.weekNumber) ?? findWeekDetails(details, task.weekNumber)?.id;
      if (weekId && task.completed) {
        const metricResult = await syncCompletedTaskMetricForWeek(currentGoalId, weekId, task);
        if (metricResult) {
          counter.syncedCount += 1;
        } else {
          counter.failedCount += 1;
        }
      }
    }

    for (const checkIn of systemToSync.dailyCheckIns) {
      const checkInDate = new Date(checkIn.date);
      const weekNumber = getTwelveWeekCurrentWeek(
        systemToSync,
        Number.isFinite(checkInDate.valueOf()) ? checkInDate : new Date(),
      );
      const weekId = getWeekIdForGoal(currentGoalId, weekNumber) ?? findWeekDetails(details, weekNumber)?.id;
      if (!weekId) {
        counter.skippedCount += 1;
        continue;
      }

      const synced = await syncDailyCheckInForWeek(currentGoalId, weekId, {
        weekNumber,
        date: checkIn.date,
        didWorkToday: checkIn.didWorkToday,
      });
      if (synced) {
        counter.syncedCount += 1;
      } else {
        counter.failedCount += 1;
      }
    }

    for (const review of systemToSync.weeklyReviews.filter(hasReviewContent)) {
      const weekId = getWeekIdForGoal(currentGoalId, review.weekNumber) ?? findWeekDetails(details, review.weekNumber)?.id;
      if (!weekId) {
        counter.skippedCount += 1;
        continue;
      }

      const synced = await syncWeeklyReviewForWeek(weekId, {
        weekNumber: review.weekNumber,
        executionScore: getReviewExecutionScore(systemToSync, review.weekNumber, review.leadCompletionPercent),
        reflection: review.biggestOutputThisWeek.trim() || undefined,
        adjustments: review.nextWeekPriority.trim() || undefined,
      });
      if (synced) {
        counter.syncedCount += 1;
      } else {
        counter.failedCount += 1;
      }
    }
  }, [runAction, syncTaskSnapshot, syncCompletedTaskMetricForWeek, syncDailyCheckInForWeek, syncWeeklyReviewForWeek]);

  const syncPlanSnapshotNow = useCallback(async (
    systemToSync: TwelveWeekSystem | null | undefined,
  ): Promise<PlanExecutionSyncSnapshot> => {
    const nowMs = Date.now();
    const existingSnapshotSync = snapshotInFlightRef.current;
    if (existingSnapshotSync && nowMs - lastSnapshotSyncStartedAtRef.current < PLAN_SNAPSHOT_SYNC_DEBOUNCE_MS) {
      return existingSnapshotSync;
    }

    const snapshotSync = (async (): Promise<PlanExecutionSyncSnapshot> => {
      const counter: SyncCounter = { syncedCount: 0, skippedCount: 0, failedCount: 0, conflictCount: 0 };

      if (!goalId || !systemToSync || isDemoMode()) {
        const snapshot = createSnapshot(counter, null, "idle");
        setLastSnapshot(snapshot);
        return snapshot;
      }

      const details = await ensurePlanDetails(goalId, systemToSync);
      if (!details) {
        counter.failedCount += 1;
        const snapshot = createSnapshot(counter, null, "error");
        setLastSnapshot(snapshot);
        return snapshot;
      }

      // ── Try bulk sync first ──────────────────────────────────
      const bulkRequest = buildBulkSyncRequest(systemToSync, details, goalId);

      if (isBulkRequestEmpty(bulkRequest)) {
        const snapshot = createSnapshot(counter, details.plan.id, "success");
        setLastSnapshot(snapshot);
        return snapshot;
      }

      let usedBulk = false;

      try {
        const bulkResponse = await bulkSyncPlan(details.plan.id, bulkRequest);
        usedBulk = true;
        applyBulkSyncResponse(goalId, systemToSync, bulkResponse, counter);
      } catch (bulkError) {
        const parsed = toAppError(bulkError) as ApiClientError;

        // Re-throw rate-limit errors so the queue can handle backoff
        if (isRateLimitError(parsed)) {
          throw new RateLimitError(parsed.retryAfterMs ?? DEFAULT_RATE_LIMIT_RETRY_MS, parsed.message);
        }

        // 404 means the bulk endpoint doesn't exist on this backend version — fall back to legacy
        if (parsed.status === 404) {
          console.warn("[bulk-sync] Endpoint not available, falling back to per-entity sync.");
        } else {
          // For other errors, also fall back but log
          console.warn("[bulk-sync] Bulk sync failed, falling back to per-entity sync.", parsed.message);
        }
      }

      // ── Legacy per-entity fallback ───────────────────────────
      if (!usedBulk) {
        await syncPlanSnapshotLegacy(goalId, systemToSync, details, counter);
      }

      const snapshot = createSnapshot(counter, details.plan.id);
      setLastSnapshot(snapshot);
      return snapshot;
    })();

    snapshotInFlightRef.current = snapshotSync;
    lastSnapshotSyncStartedAtRef.current = nowMs;

    try {
      return await snapshotSync;
    } finally {
      if (snapshotInFlightRef.current === snapshotSync) {
        snapshotInFlightRef.current = null;
      }
    }
  }, [
    goalId,
    ensurePlanDetails,
    applyBulkSyncResponse,
    syncPlanSnapshotLegacy,
  ]);

  // Internal executeSync function for queue processor
  const executeSyncInternal = useCallback(async (item: SyncQueueItem): Promise<unknown> => {
    const { syncType, payload } = item;

    switch (syncType) {
      case "task_completed": {
        const taskPayload = payload as { taskId: string; completed: boolean };
        const result = await syncTaskToggleNow(taskPayload.taskId, taskPayload.completed);
        if (!result) throw new Error("Không đồng bộ được việc");
        return true;
      }

      case "daily_checkin": {
        const checkinPayload = payload as { weekNumber: number; date: string; didWorkToday: boolean };
        const result = await syncDailyCheckInNow(checkinPayload);
        if (!result) throw new Error("Không đồng bộ được check-in hôm nay");
        return true;
      }

      case "weekly_review": {
        const reviewPayload = payload as { weekNumber: number; executionScore: number; reflection?: string; adjustments?: string };
        const result = await syncWeeklyReviewNow(reviewPayload);
        if (!result) throw new Error("Không đồng bộ được review tuần");
        return true;
      }

      case "plan_snapshot": {
        const snapshotPayload = payload as { system?: TwelveWeekSystem };
        const systemToSync = snapshotPayload.system ?? system;
        const snapshot = await syncPlanSnapshotNow(systemToSync);
        if (snapshot.failedCount > 0 || snapshot.status === "error") {
          throw new Error(`Plan snapshot had ${snapshot.failedCount} failures`);
        }
        return snapshot;
      }

      case "metric_upsert":
        // Handled by task_completed and daily_checkin
        return true;

      default:
        console.warn(`Unknown sync type: ${syncType}`);
        return true;
    }
  }, [
    system,
    syncTaskToggleNow,
    syncDailyCheckInNow,
    syncWeeklyReviewNow,
    syncPlanSnapshotNow,
  ]);

  // Use persistent sync queue — must be after executeSyncInternal is defined
  const syncQueue = usePlanSyncQueue({
    goalId: goalId ?? "",
    enabled: enabled && !isDemoMode(),
    executeSync: executeSyncInternal,
  });

  const loading = pendingRequests > 0 || syncQueue.loading;

  const enqueueRetry = useCallback((
    syncType: SyncType,
    payload: unknown,
    entityId?: string,
    entityType?: "task" | "checkin" | "review" | "plan"
  ): void => {
    if (!goalId || !enabled || isDemoMode()) {
      return;
    }

    void syncQueue.enqueueSyncAction(syncType, payload, entityId, entityType);
  }, [goalId, enabled, syncQueue.enqueueSyncAction]);

  // Sync task toggle action
  const syncTaskToggle = useCallback(async (taskId: string, completed: boolean): Promise<boolean> => {
    if (!goalId || !system || !enabled) return Promise.resolve(true);

    const synced = await syncTaskToggleNow(taskId, completed);
    if (!synced) {
      enqueueRetry("task_completed", { taskId, completed }, taskId, "task");
    }
    return synced;
  }, [goalId, system, enabled, syncTaskToggleNow, enqueueRetry]);

  // Sync weekly review action
  const syncWeeklyReview = useCallback(async (input: SyncWeeklyReviewInput): Promise<boolean> => {
    if (!goalId || !system || !enabled) return Promise.resolve(true);

    const synced = await syncWeeklyReviewNow(input);
    if (!synced) {
      enqueueRetry("weekly_review", input, undefined, "review");
    }
    return synced;
  }, [goalId, system, enabled, syncWeeklyReviewNow, enqueueRetry]);

  // Sync daily check-in action
  const syncDailyCheckIn = useCallback(async (input: SyncDailyCheckInInput): Promise<boolean> => {
    if (!goalId || !system || !enabled) return Promise.resolve(true);

    const synced = await syncDailyCheckInNow(input);
    if (!synced) {
      enqueueRetry("daily_checkin", input, undefined, "checkin");
    }
    return synced;
  }, [goalId, system, enabled, syncDailyCheckInNow, enqueueRetry]);

  // Sync local snapshot action
  const syncLocalSnapshot = useCallback(async (input: SyncLocalSnapshotInput = {}): Promise<PlanExecutionSyncSnapshot> => {
    if (!goalId || !system || !enabled) {
      const counter: SyncCounter = { syncedCount: 0, skippedCount: 0, failedCount: 0, conflictCount: 0 };
      const snapshot = createSnapshot(counter, null, "idle");
      setLastSnapshot(snapshot);
      return snapshot;
    }

    latestSnapshotSystemRef.current = input.system ?? system;

    if (snapshotDebounceTimerRef.current) {
      clearTimeout(snapshotDebounceTimerRef.current);
    }

    const snapshotPromise = new Promise<PlanExecutionSyncSnapshot>((resolve, reject) => {
      pendingSnapshotResolversRef.current.push({ resolve, reject });
    });

    snapshotDebounceTimerRef.current = setTimeout(() => {
      const systemToSync = latestSnapshotSystemRef.current ?? system;

      void syncPlanSnapshotNow(systemToSync)
        .then((snapshot) => {
          if (snapshot.failedCount > 0 || snapshot.status === "error") {
            enqueueRetry("plan_snapshot", { system: systemToSync }, undefined, "plan");
          }

          for (const pending of pendingSnapshotResolversRef.current) {
            pending.resolve(snapshot);
          }
          pendingSnapshotResolversRef.current = [];
        })
        .catch((error) => {
          for (const pending of pendingSnapshotResolversRef.current) {
            pending.reject(error);
          }
          pendingSnapshotResolversRef.current = [];
        });
    }, PLAN_SNAPSHOT_SYNC_DEBOUNCE_MS);

    return snapshotPromise;
  }, [goalId, system, enabled, syncPlanSnapshotNow, enqueueRetry]);

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
