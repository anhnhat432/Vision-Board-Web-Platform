import { useCallback, useMemo, useState } from "react";

import { toAppError } from "@/lib/api/apiClient";
import { createMetric, getMetrics, logMetric } from "@/services/metricService";
import { addTask, toggleTask } from "@/services/taskService";
import { updateWeekReview } from "@/services/weekService";
import type { AppError } from "@/types/api";
import type { TwelveWeekSystem } from "@/app/utils/storage-types";
import {
  getMetricIdForGoal,
  getRemoteTaskIdForGoal,
  getWeekIdForGoal,
  setMetricIdForGoal,
  setRemoteTaskIdForGoal,
} from "../persistence/planLinkStore";

interface UsePlanExecutionSyncOptions {
  goalId?: string | null;
  system?: TwelveWeekSystem | null;
}

interface SyncWeeklyReviewInput {
  weekNumber: number;
  executionScore: number;
  reflection?: string;
  adjustments?: string;
}

function toIsoDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.valueOf())) return undefined;
  return parsed.toISOString();
}

export function usePlanExecutionSync(options: UsePlanExecutionSyncOptions) {
  const [pendingRequests, setPendingRequests] = useState(0);
  const [error, setError] = useState<AppError | null>(null);

  const loading = pendingRequests > 0;

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

  const syncTaskToggle = useCallback(async (taskId: string, completed: boolean): Promise<boolean> => {
    const goalId = options.goalId;
    const system = options.system;
    if (!goalId || !system) return true;

    const task = system.taskInstances.find((item) => item.id === taskId);
    if (!task) return true;

    const weekId = getWeekIdForGoal(goalId, task.weekNumber);
    if (!weekId) return true;

    let remoteTaskId = getRemoteTaskIdForGoal(goalId, task.id);
    if (!remoteTaskId) {
      const createdTask = await runAction(() =>
        addTask(weekId, {
          title: task.title,
          status: completed ? "done" : "todo",
          scheduledDate: toIsoDate(task.scheduledDate),
        }),
      );
      if (!createdTask) return false;
      remoteTaskId = createdTask.id;
      setRemoteTaskIdForGoal(goalId, task.id, createdTask.id);
    } else {
      const resolvedRemoteTaskId = remoteTaskId;
      const updatedTask = await runAction(() => toggleTask(resolvedRemoteTaskId, completed));
      if (!updatedTask) return false;
    }

    if (!completed) return true;

    const metricName = task.leadIndicatorName.trim();
    if (!metricName) return true;

    const metricId = await ensureRemoteMetricId(goalId, weekId, task.weekNumber, metricName);
    if (!metricId) return false;

    const updatedMetric = await runAction(() =>
      logMetric(metricId, {
        date: toIsoDate(task.scheduledDate) ?? new Date().toISOString(),
        value: 1,
        completed: true,
      }),
    );
    return Boolean(updatedMetric);
  }, [ensureRemoteMetricId, options.goalId, options.system, runAction]);

  const syncWeeklyReview = useCallback(async (input: SyncWeeklyReviewInput): Promise<boolean> => {
    const goalId = options.goalId;
    if (!goalId) return true;

    const weekId = getWeekIdForGoal(goalId, input.weekNumber);
    if (!weekId) return true;

    const updatedWeek = await runAction(() =>
      updateWeekReview(weekId, {
        weekNumber: input.weekNumber,
        executionScore: input.executionScore,
        reflection: input.reflection,
        adjustments: input.adjustments,
      }),
    );
    return Boolean(updatedWeek);
  }, [options.goalId, runAction]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const actions = useMemo(
    () => ({
      syncTaskToggle,
      syncWeeklyReview,
      clearError,
    }),
    [clearError, syncTaskToggle, syncWeeklyReview],
  );

  const data = useMemo(
    () => ({
      goalId: options.goalId ?? null,
    }),
    [options.goalId],
  );

  return {
    loading,
    error,
    data,
    actions,
  };
}
