import { useCallback, useMemo, useState } from "react";

import { toAppError } from "@/lib/api/apiClient";
import { createMetric, getMetrics, logMetric, updateMetricLog } from "@/services/metricService";
import { createPlan, getPlan, getPlans } from "@/services/planService";
import { addTask, updateTask } from "@/services/taskService";
import { updateWeek, updateWeekReview } from "@/services/weekService";
import type { AppError } from "@/types/api";
import type { PlanDetails, Task, WeekDetails } from "@/types/plan";
import type { TwelveWeekSystem, TwelveWeekTaskInstance } from "@/app/utils/storage-types";
import { getCalendarDateKey } from "@/app/utils/storage-date-utils";
import { getTwelveWeekCurrentWeek } from "@/app/utils/storage-twelve-week";
import { DAILY_CHECKIN_METRIC_NAME } from "../constants/progressMetrics";
import {
  getMetricIdForGoal,
  getPlanLink,
  getRemoteTaskIdForGoal,
  getWeekIdForGoal,
  savePlanDetailsLink,
  setMetricIdForGoal,
  setRemoteTaskIdForGoal,
} from "../persistence/planLinkStore";

type SnapshotStatus = "idle" | "success" | "partial" | "error";

export interface PlanExecutionSyncSnapshot {
  at: string;
  status: SnapshotStatus;
  syncedCount: number;
  skippedCount: number;
  failedCount: number;
  planId: string | null;
  message: string;
}

interface UsePlanExecutionSyncOptions {
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
  const sameTitleAndDateTask = sameTitleTasks.find((task) => getTaskDateKey(task.scheduledDate) === localDateKey);

  return sameTitleAndDateTask ?? (sameTitleTasks.length === 1 ? sameTitleTasks[0] : null);
}

function shouldUpdateRemoteTask(remoteTask: Task, localTask: TwelveWeekTaskInstance): boolean {
  if (remoteTask.status !== getTaskStatus(localTask.completed)) return true;
  if (remoteTask.title.trim() !== localTask.title.trim()) return true;
  return getTaskDateKey(remoteTask.scheduledDate) !== getTaskDateKey(localTask.scheduledDate);
}

function getReviewExecutionScore(system: TwelveWeekSystem, weekNumber: number, fallback: number): number {
  return system.scoreboard.find((week) => week.weekNumber === weekNumber)?.weeklyScore ?? fallback;
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
    counter.failedCount > 0
      ? counter.syncedCount > 0
        ? "partial"
        : "error"
      : fallbackStatus;

  const message =
    status === "success"
      ? counter.syncedCount > 0
        ? `Đã đồng bộ ${counter.syncedCount} mục 12-week lên backend.`
        : "Backend đã sẵn sàng, chưa có mục 12-week mới cần đẩy lên."
      : status === "partial"
        ? `Đã đồng bộ ${counter.syncedCount} mục, còn ${counter.failedCount} mục cần thử lại.`
        : "Chưa thể đồng bộ dữ liệu 12-week lên backend. Dữ liệu local vẫn được giữ nguyên.";

  return {
    at: new Date().toISOString(),
    status,
    syncedCount: counter.syncedCount,
    skippedCount: counter.skippedCount,
    failedCount: counter.failedCount,
    planId,
    message,
  };
}

export function usePlanExecutionSync(options: UsePlanExecutionSyncOptions) {
  const [pendingRequests, setPendingRequests] = useState(0);
  const [error, setError] = useState<AppError | null>(null);
  const [lastSnapshot, setLastSnapshot] = useState<PlanExecutionSyncSnapshot | null>(null);

  const loading = pendingRequests > 0;
  const enabled = options.enabled ?? true;

  const runAction = useCallback(async <T,>(action: () => Promise<T>): Promise<T | null> => {
    setPendingRequests((count) => count + 1);
    setError(null);

    try {
      return await action();
    } catch (nextError) {
      const parsedError = toAppError(nextError);
      setError(parsedError);
      console.error("Failed to sync 12-week execution state.", nextError);
      return null;
    } finally {
      setPendingRequests((count) => Math.max(0, count - 1));
    }
  }, []);

  const ensurePlanDetails = useCallback(async (
    goalId: string,
    system: TwelveWeekSystem,
  ): Promise<PlanDetails | null> => {
    if (!enabled) return null;

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
  }, [enabled, runAction]);

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

  const syncTaskSnapshot = useCallback(async (
    goalId: string,
    details: PlanDetails,
    task: TwelveWeekTaskInstance,
  ): Promise<"synced" | "skipped" | "failed"> => {
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

      setRemoteTaskIdForGoal(goalId, task.id, createdTask.id);
      return "synced";
    }

    setRemoteTaskIdForGoal(goalId, task.id, remoteTask.id);

    if (!shouldUpdateRemoteTask(remoteTask, task)) {
      return "skipped";
    }

    const updatedTask = await runAction(() =>
      updateTask(remoteTask.id, {
        title: task.title,
        status: getTaskStatus(task.completed),
        scheduledDate: toIsoDate(task.scheduledDate),
      }),
    );

    return updatedTask ? "synced" : "failed";
  }, [runAction]);

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

  const syncTaskToggle = useCallback(async (taskId: string, completed: boolean): Promise<boolean> => {
    const goalId = options.goalId;
    const system = options.system;
    if (!goalId || !system || !enabled) return true;

    const task = system.taskInstances.find((item) => item.id === taskId);
    if (!task) return true;

    const details = await ensurePlanDetails(goalId, system);
    if (!details) return true;

    const taskSyncResult = await syncTaskSnapshot(goalId, details, { ...task, completed });
    if (taskSyncResult === "failed") return false;

    if (!completed) return true;

    const week = findWeekDetails(details, task.weekNumber);
    if (!week) return true;

    return syncCompletedTaskMetricForWeek(goalId, week.id, { ...task, completed });
  }, [enabled, ensurePlanDetails, options.goalId, options.system, syncCompletedTaskMetricForWeek, syncTaskSnapshot]);

  const syncWeeklyReview = useCallback(async (input: SyncWeeklyReviewInput): Promise<boolean> => {
    const goalId = options.goalId;
    const system = options.system;
    if (!goalId || !system || !enabled) return true;

    const details = await ensurePlanDetails(goalId, system);
    if (!details) return true;

    const weekId = getWeekIdForGoal(goalId, input.weekNumber) ?? findWeekDetails(details, input.weekNumber)?.id;
    if (!weekId) return true;

    return syncWeeklyReviewForWeek(weekId, input);
  }, [enabled, ensurePlanDetails, options.goalId, options.system, syncWeeklyReviewForWeek]);

  const syncDailyCheckIn = useCallback(async (input: SyncDailyCheckInInput): Promise<boolean> => {
    const goalId = options.goalId;
    const system = options.system;
    if (!goalId || !system || !enabled) return true;

    const details = await ensurePlanDetails(goalId, system);
    if (!details) return true;

    const weekId = getWeekIdForGoal(goalId, input.weekNumber) ?? findWeekDetails(details, input.weekNumber)?.id;
    if (!weekId) return true;

    return syncDailyCheckInForWeek(goalId, weekId, input);
  }, [enabled, ensurePlanDetails, options.goalId, options.system, syncDailyCheckInForWeek]);

  const syncLocalSnapshot = useCallback(async (input: SyncLocalSnapshotInput = {}): Promise<PlanExecutionSyncSnapshot> => {
    const goalId = options.goalId;
    const system = input.system ?? options.system;
    const counter: SyncCounter = {
      syncedCount: 0,
      skippedCount: 0,
      failedCount: 0,
    };

    if (!goalId || !system || !enabled) {
      const snapshot = createSnapshot(counter, null, "idle");
      setLastSnapshot(snapshot);
      return snapshot;
    }

    const details = await ensurePlanDetails(goalId, system);
    if (!details) {
      const snapshot = createSnapshot({ ...counter, failedCount: 1 }, null, "error");
      setLastSnapshot(snapshot);
      return snapshot;
    }

    for (const weekPlan of system.weeklyPlans) {
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

      const updatedWeek = await runAction(() => updateWeek(week.id, { focus, expectedOutput }));
      if (updatedWeek) {
        counter.syncedCount += 1;
      } else {
        counter.failedCount += 1;
      }
    }

    for (const task of system.taskInstances) {
      const result = await syncTaskSnapshot(goalId, details, task);
      counter[`${result}Count` as keyof SyncCounter] += 1;

      const weekId = getWeekIdForGoal(goalId, task.weekNumber) ?? findWeekDetails(details, task.weekNumber)?.id;
      if (result !== "failed" && weekId && task.completed) {
        const metricSynced = await syncCompletedTaskMetricForWeek(goalId, weekId, task);
        counter[metricSynced ? "syncedCount" : "failedCount"] += 1;
      }
    }

    for (const checkIn of system.dailyCheckIns) {
      const checkInDate = new Date(checkIn.date);
      const weekNumber = getTwelveWeekCurrentWeek(
        system,
        Number.isFinite(checkInDate.valueOf()) ? checkInDate : new Date(),
      );
      const weekId = getWeekIdForGoal(goalId, weekNumber) ?? findWeekDetails(details, weekNumber)?.id;
      if (!weekId) {
        counter.skippedCount += 1;
        continue;
      }

      const synced = await syncDailyCheckInForWeek(goalId, weekId, {
        weekNumber,
        date: checkIn.date,
        didWorkToday: checkIn.didWorkToday,
      });
      counter[synced ? "syncedCount" : "failedCount"] += 1;
    }

    for (const review of system.weeklyReviews.filter(hasReviewContent)) {
      const weekId = getWeekIdForGoal(goalId, review.weekNumber) ?? findWeekDetails(details, review.weekNumber)?.id;
      if (!weekId) {
        counter.skippedCount += 1;
        continue;
      }

      const synced = await syncWeeklyReviewForWeek(weekId, {
        weekNumber: review.weekNumber,
        executionScore: getReviewExecutionScore(system, review.weekNumber, review.leadCompletionPercent),
        reflection: review.biggestOutputThisWeek.trim() || undefined,
        adjustments: review.nextWeekPriority.trim() || undefined,
      });
      counter[synced ? "syncedCount" : "failedCount"] += 1;
    }

    const latestLink = getPlanLink(goalId);
    const snapshot = createSnapshot(counter, latestLink?.planId ?? details.plan.id);
    setLastSnapshot(snapshot);
    return snapshot;
  }, [
    enabled,
    ensurePlanDetails,
    options.goalId,
    options.system,
    runAction,
    syncCompletedTaskMetricForWeek,
    syncDailyCheckInForWeek,
    syncTaskSnapshot,
    syncWeeklyReviewForWeek,
  ]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const actions = useMemo(
    () => ({
      syncTaskToggle,
      syncWeeklyReview,
      syncDailyCheckIn,
      syncLocalSnapshot,
      clearError,
    }),
    [clearError, syncTaskToggle, syncWeeklyReview, syncDailyCheckIn, syncLocalSnapshot],
  );

  const data = useMemo(
    () => ({
      goalId: options.goalId ?? null,
      lastSnapshot,
    }),
    [lastSnapshot, options.goalId],
  );

  return {
    loading,
    error,
    data,
    actions,
  };
}
