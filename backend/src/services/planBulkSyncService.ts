import { isValidObjectId } from "mongoose";

import { MongoMetricRepository } from "../repositories/mongo/MongoMetricRepository";
import { MongoPlanRepository } from "../repositories/mongo/MongoPlanRepository";
import { MongoTaskRepository } from "../repositories/mongo/MongoTaskRepository";
import { MongoWeekRepository } from "../repositories/mongo/MongoWeekRepository";
import type {
  BulkSyncMetricLogInput,
  BulkSyncMetricLogResult,
  BulkSyncRequest,
  BulkSyncResponse,
  BulkSyncReviewInput,
  BulkSyncReviewResult,
  BulkSyncTaskInput,
  BulkSyncTaskResult,
  BulkSyncWeekInput,
  BulkSyncWeekResult,
} from "../types/bulkSync";
import { ConflictError } from "../utils/conflictError";
import { requirePlanOwnership } from "./serviceGuards";

const planRepository = new MongoPlanRepository();
const weekRepository = new MongoWeekRepository();
const taskRepository = new MongoTaskRepository();
const metricRepository = new MongoMetricRepository();

// ── Week update ────────────────────────────────────────────────────────

async function applyWeekUpdate(
  input: BulkSyncWeekInput,
  planId: string,
): Promise<BulkSyncWeekResult> {
  try {
    if (!isValidObjectId(input.weekId)) {
      return { weekId: input.weekId, ok: false, error: "Invalid weekId." };
    }

    const week = await weekRepository.getWeekById(input.weekId);
    if (!week || week.planId !== planId) {
      return { weekId: input.weekId, ok: false, error: "Week not found or does not belong to plan." };
    }

    const updates: { focus?: string; expectedOutput?: string; baseRevision?: number } = {};
    if (input.focus !== undefined) updates.focus = input.focus;
    if (input.expectedOutput !== undefined) updates.expectedOutput = input.expectedOutput;
    if (input.baseRevision !== undefined) updates.baseRevision = input.baseRevision;

    const updated = await weekRepository.updateWeek(input.weekId, updates);
    if (!updated) {
      return { weekId: input.weekId, ok: false, error: "Failed to update week." };
    }

    return { weekId: input.weekId, ok: true, revision: updated.revision };
  } catch (error) {
    if (error instanceof ConflictError) {
      return {
        weekId: input.weekId,
        ok: false,
        conflict: true,
        revision: error.currentRevision,
        error: error.message,
      };
    }
    return { weekId: input.weekId, ok: false, error: String((error as Error).message ?? error) };
  }
}

// ── Task upsert ────────────────────────────────────────────────────────

async function applyTaskUpsert(
  input: BulkSyncTaskInput,
  planId: string,
): Promise<BulkSyncTaskResult> {
  try {
    if (!isValidObjectId(input.weekId)) {
      return { clientTaskId: input.taskId, taskId: "", weekId: input.weekId, ok: false, error: "Invalid weekId." };
    }

    const week = await weekRepository.getWeekById(input.weekId);
    if (!week || week.planId !== planId) {
      return { clientTaskId: input.taskId, taskId: "", weekId: input.weekId, ok: false, error: "Week not found or does not belong to plan." };
    }

    // Create new task
    if (!input.taskId || !isValidObjectId(input.taskId)) {
      const scheduledDate = input.scheduledDate ? new Date(input.scheduledDate) : undefined;
      const created = await taskRepository.addTask({
        weekId: input.weekId,
        title: input.title,
        status: input.status ?? "todo",
        scheduledDate: Number.isFinite(scheduledDate?.valueOf()) ? scheduledDate : undefined,
      });

      return {
        clientTaskId: input.taskId,
        taskId: created.id,
        weekId: input.weekId,
        ok: true,
        revision: created.revision,
      };
    }

    // Update existing task
    const scheduledDate = input.scheduledDate ? new Date(input.scheduledDate) : undefined;
    const updated = await taskRepository.updateTask(input.taskId, {
      title: input.title,
      status: input.status,
      scheduledDate: Number.isFinite(scheduledDate?.valueOf()) ? scheduledDate : undefined,
      baseRevision: input.baseRevision,
    });

    if (!updated) {
      return { clientTaskId: input.taskId, taskId: input.taskId, weekId: input.weekId, ok: false, error: "Task not found." };
    }

    return {
      clientTaskId: input.taskId,
      taskId: updated.id,
      weekId: input.weekId,
      ok: true,
      revision: updated.revision,
    };
  } catch (error) {
    if (error instanceof ConflictError) {
      return {
        clientTaskId: input.taskId,
        taskId: input.taskId ?? "",
        weekId: input.weekId,
        ok: false,
        conflict: true,
        revision: error.currentRevision,
        error: error.message,
      };
    }
    return {
      clientTaskId: input.taskId,
      taskId: input.taskId ?? "",
      weekId: input.weekId,
      ok: false,
      error: String((error as Error).message ?? error),
    };
  }
}

// ── Metric log ─────────────────────────────────────────────────────────

async function applyMetricLog(
  input: BulkSyncMetricLogInput,
  planId: string,
): Promise<BulkSyncMetricLogResult> {
  try {
    if (!isValidObjectId(input.weekId)) {
      return { weekId: input.weekId, metricName: input.metricName, ok: false, error: "Invalid weekId." };
    }

    const week = await weekRepository.getWeekById(input.weekId);
    if (!week || week.planId !== planId) {
      return { weekId: input.weekId, metricName: input.metricName, ok: false, error: "Week not found or does not belong to plan." };
    }

    // Find or create the metric by name
    const metrics = await metricRepository.getMetricsByWeekId(input.weekId);
    let metric = metrics.find(
      (m) => m.name.trim().toLowerCase() === input.metricName.trim().toLowerCase(),
    );

    if (!metric) {
      metric = await metricRepository.createMetric({
        weekId: input.weekId,
        name: input.metricName.trim(),
        weeklyTarget: 0,
      });
    }

    const logDate = new Date(input.date);
    if (!Number.isFinite(logDate.valueOf())) {
      return { weekId: input.weekId, metricName: input.metricName, ok: false, error: "Invalid date." };
    }

    const logged = await metricRepository.logMetric(metric.id, {
      date: logDate,
      value: input.value,
      completed: input.completed,
    });

    if (!logged) {
      return { weekId: input.weekId, metricName: input.metricName, ok: false, error: "Failed to log metric." };
    }

    return { weekId: input.weekId, metricName: input.metricName, ok: true, metricId: metric.id };
  } catch (error) {
    return {
      weekId: input.weekId,
      metricName: input.metricName,
      ok: false,
      error: String((error as Error).message ?? error),
    };
  }
}

// ── Review ─────────────────────────────────────────────────────────────

async function applyReview(
  input: BulkSyncReviewInput,
  planId: string,
): Promise<BulkSyncReviewResult> {
  try {
    if (!isValidObjectId(input.weekId)) {
      return { weekId: input.weekId, ok: false, error: "Invalid weekId." };
    }

    const week = await weekRepository.getWeekById(input.weekId);
    if (!week || week.planId !== planId) {
      return { weekId: input.weekId, ok: false, error: "Week not found or does not belong to plan." };
    }

    const updated = await weekRepository.submitWeeklyReview(input.weekId, {
      weekNumber: input.weekNumber,
      executionScore: input.executionScore,
      reflection: input.reflection,
      adjustments: input.adjustments,
      baseRevision: input.baseRevision,
    });

    if (!updated) {
      return { weekId: input.weekId, ok: false, error: "Failed to submit review." };
    }

    return { weekId: input.weekId, ok: true, revision: updated.revision };
  } catch (error) {
    if (error instanceof ConflictError) {
      return {
        weekId: input.weekId,
        ok: false,
        conflict: true,
        revision: error.currentRevision,
        error: error.message,
      };
    }
    return { weekId: input.weekId, ok: false, error: String((error as Error).message ?? error) };
  }
}

// ── Main entry point ───────────────────────────────────────────────────

export async function bulkSyncPlanSnapshot(
  userId: string,
  planId: string,
  request: BulkSyncRequest,
): Promise<BulkSyncResponse> {
  await requirePlanOwnership(planRepository, userId, planId);

  const weekInputs = request.weeks ?? [];
  const taskInputs = request.tasks ?? [];
  const metricLogInputs = request.metricLogs ?? [];
  const reviewInputs = request.reviews ?? [];

  const weekResults: BulkSyncWeekResult[] = [];
  const taskResults: BulkSyncTaskResult[] = [];
  const metricLogResults: BulkSyncMetricLogResult[] = [];
  const reviewResults: BulkSyncReviewResult[] = [];
  const errors: string[] = [];

  // Process weeks
  for (const weekInput of weekInputs) {
    const result = await applyWeekUpdate(weekInput, planId);
    weekResults.push(result);
  }

  // Process tasks
  for (const taskInput of taskInputs) {
    const result = await applyTaskUpsert(taskInput, planId);
    taskResults.push(result);
  }

  // Process metric logs
  for (const metricLogInput of metricLogInputs) {
    const result = await applyMetricLog(metricLogInput, planId);
    metricLogResults.push(result);
  }

  // Process reviews
  for (const reviewInput of reviewInputs) {
    const result = await applyReview(reviewInput, planId);
    reviewResults.push(result);
  }

  // Aggregate counters
  const allResults = [
    ...weekResults.map((r) => ({ ok: r.ok, conflict: r.conflict })),
    ...taskResults.map((r) => ({ ok: r.ok, conflict: r.conflict })),
    ...metricLogResults.map((r) => ({ ok: r.ok, conflict: false })),
    ...reviewResults.map((r) => ({ ok: r.ok, conflict: r.conflict })),
  ];

  let syncedCount = 0;
  let conflictCount = 0;
  let failedCount = 0;

  for (const r of allResults) {
    if (r.ok) {
      syncedCount += 1;
    } else if (r.conflict) {
      conflictCount += 1;
    } else {
      failedCount += 1;
    }
  }

  // Collect error messages from failed items
  for (const r of weekResults) {
    if (!r.ok && r.error) errors.push(`week:${r.weekId}: ${r.error}`);
  }
  for (const r of taskResults) {
    if (!r.ok && r.error) errors.push(`task:${r.taskId || r.clientTaskId}: ${r.error}`);
  }
  for (const r of metricLogResults) {
    if (!r.ok && r.error) errors.push(`metric:${r.metricName}@${r.weekId}: ${r.error}`);
  }
  for (const r of reviewResults) {
    if (!r.ok && r.error) errors.push(`review:${r.weekId}: ${r.error}`);
  }

  return {
    weeks: weekResults,
    tasks: taskResults,
    metricLogs: metricLogResults,
    reviews: reviewResults,
    errors,
    syncedCount,
    conflictCount,
    failedCount,
  };
}
