import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, it } from "node:test";
import express, { type Express } from "express";

import { createAuthMiddleware } from "../middleware/authMiddlewareCore";
import { errorMiddleware } from "../middleware/errorMiddleware";
import { syncRoutes } from "../routes/syncRoutes";
import {
  DailyCheckInUpsertHandler,
  LeadMetricUpsertHandler,
  PlanSnapshotUpdatedHandler,
  PlanSnapshotUpsertHandler,
  TaskCompletedChangedHandler,
  TaskUpsertHandler,
  WeeklyReviewUpsertHandler,
  type AppliedTaskMutationEntity,
  type AppliedWorkspaceMutationEntity,
  type DailyCheckInUpsertApplyInput,
  type LeadMetricUpsertApplyInput,
  type PlanSnapshotUpdatedApplyInput,
  type SyncMutationBatchResult,
  type SyncTaskMutationRepository,
  type SyncWorkspaceMutationRepository,
  type TaskCompletedChangedApplyInput,
  type WeeklyReviewUpsertApplyInput,
} from "../services/sync-mutations";
import { SyncMutationService, syncMutationService } from "../services/syncMutationService";
import {
  TwelveWeekImportService,
  twelveWeekImportService,
  type ImportGoalData,
  type ImportDailyCheckInData,
  type ImportLeadMetricData,
  type ImportPlanData,
  type ImportTaskData,
  type ImportWeekData,
  type ImportedGoalEntity,
  type ImportedDailyCheckInEntity,
  type ImportedLeadMetricEntity,
  type ImportedPlanEntity,
  type ImportedTaskEntity,
  type ImportedWeekEntity,
  type ImportedWeeklyReviewEntity,
  type ImportWeeklyReviewData,
  type TwelveWeekImportRepository,
  type TwelveWeekImportResult,
  type UpsertResult,
} from "../services/twelveWeekImportService";
import type { TwelveWeekImportValidationReport } from "../services/twelveWeekImportValidationService";
import type {
  CreateSyncMutationLogData,
  SyncMutationLogEntity,
} from "../repositories/mongo/MongoSyncMutationLogRepository";
import { otherUserId, ownerUserId } from "./testHelpers";

interface JsonResponse {
  status: number;
  body: {
    success?: boolean;
    message?: string;
    data?: unknown;
    details?: unknown;
  };
}

type Restorer = () => void;

function replaceMethod<T extends object, K extends keyof T>(target: T, key: K, value: T[K]): Restorer {
  const original = target[key];
  target[key] = value;
  return () => {
    target[key] = original;
  };
}

function createSyncMutationLogRepository() {
  const logs = new Map<string, SyncMutationLogEntity>();

  function getKey(userId: string, mutationId: string): string {
    return `${userId}:${mutationId}`;
  }

  return {
    getLogs(): SyncMutationLogEntity[] {
      return [...logs.values()];
    },
    async findByUserAndMutationId(userId: string, mutationId: string): Promise<SyncMutationLogEntity | null> {
      return logs.get(getKey(userId, mutationId)) ?? null;
    },
    async createMutationLog(data: CreateSyncMutationLogData): Promise<SyncMutationLogEntity> {
      const key = getKey(data.userId, data.mutationId);
      if (logs.has(key)) {
        throw Object.assign(new Error("Duplicate mutation log."), { code: 11000 });
      }

      const timestamp = new Date("2026-04-30T00:00:00.000Z");
      const log: SyncMutationLogEntity = {
        id: `sync_log_${logs.size + 1}`,
        ...data,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      logs.set(key, log);
      return log;
    },
  };
}

interface TestTaskRecord extends AppliedTaskMutationEntity {
  userId: string;
  planId?: string;
  weekId?: string;
  clientPlanId?: string;
  clientWeekId?: string;
}

function createSyncTaskMutationRepository() {
  const tasks = new Map<string, TestTaskRecord>();

  function seedTask(task: TestTaskRecord): void {
    tasks.set(task.id, { ...task });
  }

  function getTask(taskId: string): TestTaskRecord | undefined {
    const task = tasks.get(taskId);
    return task ? { ...task } : undefined;
  }

  function findTask(userId: string, input: TaskCompletedChangedApplyInput): TestTaskRecord | undefined {
    const candidates = [...tasks.values()].filter((task) => {
      if (task.userId !== userId) return false;
      if (input.backendTaskId && task.id !== input.backendTaskId) return false;
      if (!input.backendTaskId && input.clientTaskId && task.clientTaskId !== input.clientTaskId) return false;
      if (input.backendPlanId && task.planId !== input.backendPlanId) return false;
      if (!input.backendPlanId && input.clientPlanId && task.clientPlanId !== input.clientPlanId) return false;
      if (input.backendWeekId && task.weekId !== input.backendWeekId) return false;
      if (!input.backendWeekId && !input.backendPlanId && input.clientWeekId && task.clientWeekId !== input.clientWeekId) {
        return false;
      }
      return true;
    });

    return candidates.length === 1 ? candidates[0] : undefined;
  }

  const repository: SyncTaskMutationRepository = {
    async applyTaskCompletedChanged(
      userId: string,
      input: TaskCompletedChangedApplyInput,
    ): Promise<AppliedTaskMutationEntity | null> {
      const task = findTask(userId, input);
      if (!task) return null;

      const nextTask: TestTaskRecord = {
        ...task,
        status: input.completed ? "done" : "todo",
        completedAt: input.completed ? input.completedAt ?? input.syncUpdatedAt : undefined,
        revision: (task.revision ?? 0) + 1,
        syncUpdatedAt: input.syncUpdatedAt,
      };
      tasks.set(task.id, nextTask);

      return {
        id: nextTask.id,
        clientTaskId: nextTask.clientTaskId,
        status: nextTask.status,
        completedAt: nextTask.completedAt,
        revision: nextTask.revision,
        syncUpdatedAt: nextTask.syncUpdatedAt,
      };
    },
  };

  seedTask({
    id: "64f000000000000000000001",
    userId: ownerUserId,
    planId: "plan_owner_1",
    weekId: "week_owner_1",
    clientPlanId: "goal_local_1:12-week-system",
    clientWeekId: "goal_local_1:week:1",
    clientTaskId: "task_local_1",
    status: "todo",
    revision: 1,
  });
  seedTask({
    id: "64f000000000000000000002",
    userId: otherUserId,
    planId: "plan_other_1",
    weekId: "week_other_1",
    clientPlanId: "goal_local_1:12-week-system",
    clientWeekId: "goal_local_1:week:1",
    clientTaskId: "task_local_1",
    status: "todo",
    revision: 1,
  });
  seedTask({
    id: "64f000000000000000000003",
    userId: otherUserId,
    planId: "plan_other_2",
    weekId: "week_other_2",
    clientPlanId: "other_goal:12-week-system",
    clientWeekId: "other_goal:week:1",
    clientTaskId: "other_task_local_1",
    status: "todo",
    revision: 1,
  });

  return { repository, getTask };
}

interface TestWeekRef {
  userId: string;
  planId: string;
  weekId: string;
  clientPlanId: string;
  clientWeekId: string;
  weekNumber: number;
  focus?: string;
  expectedOutput?: string;
  revision?: number;
}

interface TestPlanSnapshotRecord extends AppliedWorkspaceMutationEntity {
  userId: string;
  clientPlanId: string;
  clientGoalId?: string;
  vision: string;
  startDate: string;
}

interface TestDailyCheckInRecord extends AppliedWorkspaceMutationEntity {
  userId: string;
  clientPlanId: string;
  clientWeekId?: string;
  localDate: string;
  weekNumber: number;
  didWorkToday: boolean;
  amountDone?: string;
  outputCreated?: string;
  obstacleOrIssue?: string;
  optionalNote?: string;
}

interface TestWeeklyReviewRecord extends AppliedWorkspaceMutationEntity {
  userId: string;
  clientPlanId: string;
  clientWeekId?: string;
  weekNumber: number;
  executionScore: number;
  leadCompletionPercent?: number;
  lagProgressValue?: string;
  biggestOutputThisWeek?: string;
  mainObstacle?: string;
  nextWeekPriority?: string;
  workloadDecision?: string;
  reviewCompleted?: boolean;
}

interface TestLeadMetricRecord extends AppliedWorkspaceMutationEntity {
  userId: string;
  clientPlanId: string;
  clientWeekId?: string;
  clientMetricId: string;
  leadIndicatorId?: string;
  weekNumber: number;
  name: string;
  weeklyTarget?: number;
  target?: string;
  currentValue?: number;
  unit?: string;
  type?: string;
  priority?: number;
  schedule?: number[];
  weeklyReviewMarker?: string;
}

function createSyncWorkspaceMutationRepository() {
  const plans = new Map<string, TestPlanSnapshotRecord>();
  const weeks = new Map<string, TestWeekRef>();
  const leadMetrics = new Map<string, TestLeadMetricRecord>();
  const dailyCheckIns = new Map<string, TestDailyCheckInRecord>();
  const weeklyReviews = new Map<string, TestWeeklyReviewRecord>();
  let sequence = 0;

  function nextId(prefix: string): string {
    sequence += 1;
    return `${prefix}_${sequence}`;
  }

  function weekKey(userId: string, clientPlanId: string, weekNumber: number): string {
    return `${userId}:${clientPlanId}:week:${weekNumber}`;
  }

  function planKey(userId: string, clientPlanId: string): string {
    return `${userId}:${clientPlanId}`;
  }

  function dailyKey(userId: string, clientPlanId: string, localDate: string): string {
    return `${userId}:${clientPlanId}:${localDate}`;
  }

  function reviewKey(userId: string, clientPlanId: string, weekNumber: number): string {
    return `${userId}:${clientPlanId}:${weekNumber}`;
  }

  function metricKey(userId: string, clientPlanId: string, clientMetricId: string): string {
    return `${userId}:${clientPlanId}:${clientMetricId}`;
  }

  function seedPlan(plan: TestPlanSnapshotRecord): void {
    plans.set(planKey(plan.userId, plan.clientPlanId), { ...plan });
  }

  function seedWeek(week: TestWeekRef): void {
    weeks.set(weekKey(week.userId, week.clientPlanId, week.weekNumber), { ...week });
  }

  function findWeek(
    userId: string,
    input: {
      backendPlanId?: string;
      backendWeekId?: string;
      clientPlanId: string;
      clientWeekId?: string;
      weekNumber: number;
    },
  ): TestWeekRef | undefined {
    return [...weeks.values()].find((week) => {
      if (week.userId !== userId) return false;
      if (input.backendPlanId && week.planId !== input.backendPlanId) return false;
      if (!input.backendPlanId && week.clientPlanId !== input.clientPlanId) return false;
      if (input.backendWeekId && week.weekId !== input.backendWeekId) return false;
      if (!input.backendWeekId && !input.backendPlanId && input.clientWeekId && week.clientWeekId !== input.clientWeekId) {
        return false;
      }
      return week.weekNumber === input.weekNumber;
    });
  }

  function getDailyCheckIn(userId: string, clientPlanId: string, localDate: string): TestDailyCheckInRecord | undefined {
    const checkIn = dailyCheckIns.get(dailyKey(userId, clientPlanId, localDate));
    return checkIn ? { ...checkIn } : undefined;
  }

  function getWeeklyReview(userId: string, clientPlanId: string, weekNumber: number): TestWeeklyReviewRecord | undefined {
    const review = weeklyReviews.get(reviewKey(userId, clientPlanId, weekNumber));
    return review ? { ...review } : undefined;
  }

  function getLeadMetric(userId: string, clientPlanId: string, clientMetricId: string): TestLeadMetricRecord | undefined {
    const metric = leadMetrics.get(metricKey(userId, clientPlanId, clientMetricId));
    return metric ? { ...metric, schedule: metric.schedule ? [...metric.schedule] : undefined } : undefined;
  }

  function getPlan(userId: string, clientPlanId: string): TestPlanSnapshotRecord | undefined {
    const plan = plans.get(planKey(userId, clientPlanId));
    return plan ? { ...plan } : undefined;
  }

  function getWeek(userId: string, clientPlanId: string, weekNumber: number): TestWeekRef | undefined {
    const week = weeks.get(weekKey(userId, clientPlanId, weekNumber));
    return week ? { ...week } : undefined;
  }

  const repository: SyncWorkspaceMutationRepository = {
    async applyPlanSnapshotUpdated(
      userId: string,
      input: PlanSnapshotUpdatedApplyInput,
    ): Promise<AppliedWorkspaceMutationEntity | null> {
      const key = planKey(userId, input.clientPlanId);
      const existing = plans.get(key);
      if (!existing) return null;

      const nextPlan: TestPlanSnapshotRecord = {
        ...existing,
        clientGoalId: input.clientGoalId ?? existing.clientGoalId,
        vision: input.vision ?? existing.vision,
        startDate: input.startDate?.toISOString().slice(0, 10) ?? existing.startDate,
        revision: (existing.revision ?? 0) + 1,
        syncUpdatedAt: input.syncUpdatedAt,
      };
      plans.set(key, nextPlan);

      input.weeks.forEach((weekUpdate) => {
        const week = weeks.get(weekKey(userId, input.clientPlanId, weekUpdate.weekNumber));
        if (!week) return;
        if (weekUpdate.clientWeekId && week.clientWeekId !== weekUpdate.clientWeekId) return;
        weeks.set(weekKey(userId, input.clientPlanId, weekUpdate.weekNumber), {
          ...week,
          focus: weekUpdate.focus ?? week.focus,
          expectedOutput: weekUpdate.expectedOutput ?? week.expectedOutput,
          revision: (week.revision ?? 0) + 1,
        });
      });

      return {
        id: nextPlan.id,
        clientId: nextPlan.clientPlanId,
        revision: nextPlan.revision,
        syncUpdatedAt: nextPlan.syncUpdatedAt,
      };
    },
    async applyLeadMetricUpserted(
      userId: string,
      input: LeadMetricUpsertApplyInput,
    ): Promise<AppliedWorkspaceMutationEntity | null> {
      const week = findWeek(userId, input);
      if (!week) return null;

      const key = metricKey(userId, week.clientPlanId, input.clientMetricId);
      const existing = leadMetrics.get(key);
      const nextRecord: TestLeadMetricRecord = {
        id: existing?.id ?? nextId("leadMetric"),
        userId,
        clientId: input.clientMetricId,
        clientPlanId: week.clientPlanId,
        clientWeekId: week.clientWeekId,
        clientMetricId: input.clientMetricId,
        leadIndicatorId: input.leadIndicatorId,
        weekNumber: input.weekNumber,
        name: input.name,
        weeklyTarget: input.weeklyTarget,
        target: input.target,
        currentValue: input.currentValue,
        unit: input.unit,
        type: input.type,
        priority: input.priority,
        schedule: input.schedule ? [...input.schedule] : undefined,
        weeklyReviewMarker: existing?.weeklyReviewMarker,
        revision: (existing?.revision ?? 0) + 1,
        syncUpdatedAt: input.syncUpdatedAt,
      };
      leadMetrics.set(key, nextRecord);

      return {
        id: nextRecord.id,
        clientId: nextRecord.clientId,
        revision: nextRecord.revision,
        syncUpdatedAt: nextRecord.syncUpdatedAt,
      };
    },
    async applyDailyCheckInUpserted(
      userId: string,
      input: DailyCheckInUpsertApplyInput,
    ): Promise<AppliedWorkspaceMutationEntity | null> {
      const week = findWeek(userId, input);
      if (!week) return null;

      const key = dailyKey(userId, week.clientPlanId, input.localDate);
      const existing = dailyCheckIns.get(key);
      const nextRecord: TestDailyCheckInRecord = {
        id: existing?.id ?? nextId("checkin"),
        userId,
        clientId: input.clientCheckInId ?? `${week.clientPlanId}:checkin:${input.localDate}`,
        clientPlanId: week.clientPlanId,
        clientWeekId: week.clientWeekId,
        localDate: input.localDate,
        weekNumber: input.weekNumber,
        didWorkToday: input.didWorkToday,
        amountDone: input.amountDone,
        outputCreated: input.outputCreated,
        obstacleOrIssue: input.obstacleOrIssue,
        optionalNote: input.optionalNote,
        revision: (existing?.revision ?? 0) + 1,
        syncUpdatedAt: input.syncUpdatedAt,
      };
      dailyCheckIns.set(key, nextRecord);

      return {
        id: nextRecord.id,
        clientId: nextRecord.clientId,
        revision: nextRecord.revision,
        syncUpdatedAt: nextRecord.syncUpdatedAt,
      };
    },
    async applyWeeklyReviewUpserted(
      userId: string,
      input: WeeklyReviewUpsertApplyInput,
    ): Promise<AppliedWorkspaceMutationEntity | null> {
      const week = findWeek(userId, input);
      if (!week) return null;

      const key = reviewKey(userId, week.clientPlanId, input.weekNumber);
      const existing = weeklyReviews.get(key);
      const nextRecord: TestWeeklyReviewRecord = {
        id: existing?.id ?? nextId("review"),
        userId,
        clientId: input.clientReviewId ?? `${week.clientPlanId}:review:${input.weekNumber}`,
        clientPlanId: week.clientPlanId,
        clientWeekId: week.clientWeekId,
        weekNumber: input.weekNumber,
        executionScore: input.executionScore,
        leadCompletionPercent: input.leadCompletionPercent,
        lagProgressValue: input.lagProgressValue,
        biggestOutputThisWeek: input.biggestOutputThisWeek,
        mainObstacle: input.mainObstacle,
        nextWeekPriority: input.nextWeekPriority,
        workloadDecision: input.workloadDecision,
        reviewCompleted: input.reviewCompleted,
        revision: (existing?.revision ?? 0) + 1,
        syncUpdatedAt: input.syncUpdatedAt,
      };
      weeklyReviews.set(key, nextRecord);

      return {
        id: nextRecord.id,
        clientId: nextRecord.clientId,
        revision: nextRecord.revision,
        syncUpdatedAt: nextRecord.syncUpdatedAt,
      };
    },
  };

  seedPlan({
    id: "plan_owner_1",
    userId: ownerUserId,
    clientPlanId: "goal_local_1:12-week-system",
    clientGoalId: "goal_local_1",
    vision: "Original backend vision",
    startDate: "2026-04-30",
    revision: 1,
  });
  seedPlan({
    id: "plan_other_1",
    userId: otherUserId,
    clientPlanId: "goal_local_1:12-week-system",
    clientGoalId: "goal_local_1",
    vision: "Other user's backend vision",
    startDate: "2026-04-30",
    revision: 1,
  });
  seedWeek({
    userId: ownerUserId,
    planId: "plan_owner_1",
    weekId: "week_owner_1",
    clientPlanId: "goal_local_1:12-week-system",
    clientWeekId: "goal_local_1:week:1",
    weekNumber: 1,
    focus: "Original week focus",
    expectedOutput: "Original expected output",
    revision: 1,
  });
  seedWeek({
    userId: otherUserId,
    planId: "plan_other_1",
    weekId: "week_other_1",
    clientPlanId: "goal_local_1:12-week-system",
    clientWeekId: "goal_local_1:week:1",
    weekNumber: 1,
    focus: "Other user focus",
    expectedOutput: "Other user expected output",
    revision: 1,
  });
  seedWeek({
    userId: otherUserId,
    planId: "plan_other_2",
    weekId: "week_other_2",
    clientPlanId: "other_goal:12-week-system",
    clientWeekId: "other_goal:week:1",
    weekNumber: 1,
  });

  return { repository, getDailyCheckIn, getWeeklyReview, getLeadMetric, getPlan, getWeek };
}

function createTwelveWeekImportRepository(): TwelveWeekImportRepository {
  const mutationLogRepository = createSyncMutationLogRepository();
  const goals = new Map<string, ImportedGoalEntity & { planId?: string }>();
  const plans = new Map<string, ImportedPlanEntity>();
  const weeks = new Map<string, ImportedWeekEntity>();
  const weekNumberIndex = new Map<string, string>();
  const tasks = new Map<string, ImportedTaskEntity>();
  const leadMetrics = new Map<string, ImportedLeadMetricEntity>();
  const dailyCheckIns = new Map<string, ImportedDailyCheckInEntity>();
  const weeklyReviews = new Map<string, ImportedWeeklyReviewEntity>();
  let sequence = 0;

  function nextId(prefix: string): string {
    sequence += 1;
    return `${prefix}_${sequence}`;
  }

  function goalKey(userId: string, clientGoalId: string): string {
    return `${userId}:${clientGoalId}`;
  }

  function planKey(userId: string, clientPlanId: string): string {
    return `${userId}:${clientPlanId}`;
  }

  function weekKey(planId: string, clientWeekId: string): string {
    return `${planId}:${clientWeekId}`;
  }

  function weekNumberKey(planId: string, weekNumber: number): string {
    return `${planId}:weekNumber:${weekNumber}`;
  }

  function taskKey(weekId: string, clientTaskId: string): string {
    return `${weekId}:${clientTaskId}`;
  }

  function leadMetricKey(weekId: string, clientMetricId: string): string {
    return `${weekId}:${clientMetricId}`;
  }

  function dailyCheckInKey(userId: string, clientPlanId: string, localDate: string): string {
    return `${userId}:${clientPlanId}:${localDate}`;
  }

  function weeklyReviewKey(userId: string, clientPlanId: string, weekNumber: number): string {
    return `${userId}:${clientPlanId}:${weekNumber}`;
  }

  return {
    findImportLog: mutationLogRepository.findByUserAndMutationId,
    createImportLog: mutationLogRepository.createMutationLog,
    async upsertGoal(data: ImportGoalData): Promise<UpsertResult<ImportedGoalEntity>> {
      const key = goalKey(data.userId, data.clientGoalId);
      const existing = goals.get(key);
      if (existing) {
        const updated = { ...existing, userId: data.userId, clientGoalId: data.clientGoalId };
        goals.set(key, updated);
        return { entity: updated, operation: "updated" };
      }

      const entity: ImportedGoalEntity = {
        id: nextId("goal"),
        userId: data.userId,
        clientGoalId: data.clientGoalId,
      };
      goals.set(key, entity);
      return { entity, operation: "created" };
    },
    async linkGoalToPlan(
      goalId: string,
      planId: string,
      _importId: string,
      _syncUpdatedAt: Date,
    ): Promise<void> {
      for (const [key, goal] of goals.entries()) {
        if (goal.id === goalId) {
          goals.set(key, { ...goal, planId });
          return;
        }
      }
    },
    async upsertPlan(data: ImportPlanData): Promise<UpsertResult<ImportedPlanEntity>> {
      const key = planKey(data.userId, data.clientPlanId);
      const existing = plans.get(key);
      if (existing) {
        const updated = { ...existing, userId: data.userId, clientPlanId: data.clientPlanId };
        plans.set(key, updated);
        return { entity: updated, operation: "updated" };
      }

      const entity: ImportedPlanEntity = {
        id: nextId("plan"),
        userId: data.userId,
        clientPlanId: data.clientPlanId,
      };
      plans.set(key, entity);
      return { entity, operation: "created" };
    },
    async upsertWeek(data: ImportWeekData): Promise<UpsertResult<ImportedWeekEntity>> {
      const directKey = weekKey(data.planId, data.clientWeekId);
      const byNumberKey = weekNumberKey(data.planId, data.weekNumber);
      const existingKey = weeks.has(directKey) ? directKey : weekNumberIndex.get(byNumberKey);
      const existing = existingKey ? weeks.get(existingKey) : undefined;

      if (existing) {
        const updated = {
          ...existing,
          planId: data.planId,
          clientWeekId: data.clientWeekId,
          weekNumber: data.weekNumber,
        };
        weeks.delete(existingKey ?? directKey);
        weeks.set(directKey, updated);
        weekNumberIndex.set(byNumberKey, directKey);
        return { entity: updated, operation: "updated" };
      }

      const entity: ImportedWeekEntity = {
        id: nextId("week"),
        planId: data.planId,
        clientWeekId: data.clientWeekId,
        weekNumber: data.weekNumber,
      };
      weeks.set(directKey, entity);
      weekNumberIndex.set(byNumberKey, directKey);
      return { entity, operation: "created" };
    },
    async upsertTask(data: ImportTaskData): Promise<UpsertResult<ImportedTaskEntity>> {
      const key = taskKey(data.weekId, data.clientTaskId);
      const existing = tasks.get(key);
      if (existing) {
        const updated = { ...existing, weekId: data.weekId, clientTaskId: data.clientTaskId };
        tasks.set(key, updated);
        return { entity: updated, operation: "updated" };
      }

      const entity: ImportedTaskEntity = {
        id: nextId("task"),
        weekId: data.weekId,
        clientTaskId: data.clientTaskId,
      };
      tasks.set(key, entity);
      return { entity, operation: "created" };
    },
    async upsertLeadMetric(data: ImportLeadMetricData): Promise<UpsertResult<ImportedLeadMetricEntity>> {
      const key = leadMetricKey(data.weekId, data.clientMetricId);
      const existing = leadMetrics.get(key);
      if (existing) {
        const updated = { ...existing, weekId: data.weekId, clientMetricId: data.clientMetricId };
        leadMetrics.set(key, updated);
        return { entity: updated, operation: "updated" };
      }

      const entity: ImportedLeadMetricEntity = {
        id: nextId("leadMetric"),
        weekId: data.weekId,
        clientMetricId: data.clientMetricId,
      };
      leadMetrics.set(key, entity);
      return { entity, operation: "created" };
    },
    async upsertDailyCheckIn(data: ImportDailyCheckInData): Promise<UpsertResult<ImportedDailyCheckInEntity>> {
      const key = dailyCheckInKey(data.userId, data.clientPlanId, data.localDate);
      const existing = dailyCheckIns.get(key);
      if (existing) {
        const updated = {
          ...existing,
          planId: data.planId,
          weekId: data.weekId,
          clientCheckInId: data.clientCheckInId,
        };
        dailyCheckIns.set(key, updated);
        return { entity: updated, operation: "updated" };
      }

      const entity: ImportedDailyCheckInEntity = {
        id: nextId("dailyCheckIn"),
        planId: data.planId,
        weekId: data.weekId,
        clientCheckInId: data.clientCheckInId,
      };
      dailyCheckIns.set(key, entity);
      return { entity, operation: "created" };
    },
    async upsertWeeklyReview(data: ImportWeeklyReviewData): Promise<UpsertResult<ImportedWeeklyReviewEntity>> {
      const key = weeklyReviewKey(data.userId, data.clientPlanId, data.weekNumber);
      const existing = weeklyReviews.get(key);
      if (existing) {
        const updated = {
          ...existing,
          weekId: data.weekId,
          clientReviewId: data.clientReviewId,
        };
        weeklyReviews.set(key, updated);
        return { entity: updated, operation: "updated" };
      }

      const entity: ImportedWeeklyReviewEntity = {
        id: nextId("weeklyReview"),
        weekId: data.weekId,
        clientReviewId: data.clientReviewId,
      };
      weeklyReviews.set(key, entity);
      return { entity, operation: "created" };
    },
  };
}

let syncLogFixture: ReturnType<typeof createSyncMutationLogRepository> | null = null;
let syncTaskFixture: ReturnType<typeof createSyncTaskMutationRepository> | null = null;
let syncWorkspaceFixture: ReturnType<typeof createSyncWorkspaceMutationRepository> | null = null;

function installServiceMocks(): Restorer {
  syncLogFixture = createSyncMutationLogRepository();
  syncTaskFixture = createSyncTaskMutationRepository();
  syncWorkspaceFixture = createSyncWorkspaceMutationRepository();
  const routedService = new SyncMutationService(
    syncLogFixture,
    syncTaskFixture.repository,
    syncWorkspaceFixture.repository,
  );
  routedService.registerAll([
    new TaskCompletedChangedHandler(),
    new DailyCheckInUpsertHandler(),
    new LeadMetricUpsertHandler(),
    new WeeklyReviewUpsertHandler(),
    new PlanSnapshotUpdatedHandler(),
    new PlanSnapshotUpsertHandler(),
    new TaskUpsertHandler(),
  ]);
  const routedImportService = new TwelveWeekImportService(createTwelveWeekImportRepository());
  const restoreMutationService = replaceMethod(
    syncMutationService,
    "submitMutationBatch",
    routedService.submitMutationBatch.bind(routedService),
  );
  const restoreImportService = replaceMethod(
    twelveWeekImportService,
    "importWorkspace",
    routedImportService.importWorkspace.bind(routedImportService),
  );

  return () => {
    restoreImportService();
    restoreMutationService();
    syncLogFixture = null;
    syncTaskFixture = null;
    syncWorkspaceFixture = null;
  };
}

function createRouteTestApp(): Express {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use(
    "/api",
    createAuthMiddleware({
      async verifyIdToken(token: string) {
        if (token === "owner-token") return { uid: ownerUserId, email: "owner@example.com", emailVerified: true };
        if (token === "other-token") return { uid: otherUserId, email: "other@example.com", emailVerified: true };
        throw new Error("Invalid test token");
      },
    }),
  );
  app.use("/api", syncRoutes);
  app.use(errorMiddleware);
  return app;
}

async function requestJson(
  app: Express,
  method: string,
  path: string,
  options: { body?: unknown; token?: string | null } = {},
): Promise<JsonResponse> {
  const server = app.listen(0);
  await new Promise<void>((resolve) => {
    server.once("listening", resolve);
  });

  const address = server.address() as AddressInfo;
  const headers: Record<string, string> = {
    accept: "application/json",
  };
  if (options.body !== undefined) headers["content-type"] = "application/json";
  if (options.token !== null) headers.authorization = `Bearer ${options.token ?? "owner-token"}`;

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const text = await response.text();
    return {
      status: response.status,
      body: text ? JSON.parse(text) : {},
    };
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}

interface TestMutationRequestBody {
  batchId: string;
  clientGeneratedAt: string;
  mutations: Array<{
    mutationId: string;
    type: string;
    clientTimestamp: string;
    entity?: Record<string, unknown>;
    payload: Record<string, unknown>;
  }>;
}

function createValidMutation(
  mutationId = "dmq_test_1",
  input: {
    backendPlanId?: string;
    backendWeekId?: string;
    clientPlanId?: string;
    clientWeekId?: string;
    clientTaskId?: string;
    weekNumber?: number;
  } = {},
): TestMutationRequestBody {
  const clientPlanId = input.clientPlanId ?? "goal_local_1:12-week-system";
  const clientWeekId = input.clientWeekId ?? "goal_local_1:week:1";
  const clientTaskId = input.clientTaskId ?? "task_local_1";

  return {
    batchId: "batch_test_1",
    clientGeneratedAt: "2026-04-30T00:00:00.000Z",
    mutations: [
      {
        mutationId,
        type: "task_completed_changed",
        clientTimestamp: "2026-04-30T00:00:01.000Z",
        entity: {
          clientPlanId,
          clientWeekId,
          clientTaskId,
        },
        payload: {
          backendPlanId: input.backendPlanId,
          backendWeekId: input.backendWeekId,
          clientTaskId,
          clientPlanId,
          clientWeekId,
          weekNumber: input.weekNumber,
          completed: true,
          completedAt: "2026-04-30T00:00:02.000Z",
        },
      },
    ],
  };
}

function createDailyCheckInMutation(
  mutationId = "dmq_daily_1",
  input: {
    date?: string;
    amountDone?: string;
    backendPlanId?: string;
    backendWeekId?: string;
    clientPlanId?: string;
    clientWeekId?: string;
    weekNumber?: number;
  } = {},
): TestMutationRequestBody {
  const clientPlanId = input.clientPlanId ?? "goal_local_1:12-week-system";
  const clientWeekId = input.clientWeekId ?? "goal_local_1:week:1";
  const weekNumber = input.weekNumber ?? 1;
  const date = input.date ?? "2026-04-30";

  return {
    batchId: "batch_daily_1",
    clientGeneratedAt: "2026-04-30T00:00:00.000Z",
    mutations: [
      {
        mutationId,
        type: "daily_check_in_upserted",
        clientTimestamp: "2026-04-30T00:00:01.000Z",
        entity: {
          clientGoalId: "goal_local_1",
          clientPlanId,
          clientWeekId,
        },
        payload: {
          date,
          backendPlanId: input.backendPlanId,
          backendWeekId: input.backendWeekId,
          clientPlanId,
          clientWeekId,
          weekNumber,
          checkIn: {
            date,
            didWorkToday: true,
            whichLeadIndicatorWorkedOn: "Demo feedback",
            amountDone: input.amountDone ?? "One user test",
            outputCreated: "Interview notes",
            obstacleOrIssue: "Setup took longer than expected",
            dailySelfRating: 4,
            optionalNote: "Keep the next run shorter",
            mood: "steady",
          },
        },
      },
    ],
  };
}

function createWeeklyReviewMutation(
  mutationId = "dmq_review_1",
  input: {
    nextWeekPriority?: string;
    backendPlanId?: string;
    backendWeekId?: string;
    clientPlanId?: string;
    clientWeekId?: string;
    weekNumber?: number;
  } = {},
): TestMutationRequestBody {
  const clientPlanId = input.clientPlanId ?? "goal_local_1:12-week-system";
  const clientWeekId = input.clientWeekId ?? "goal_local_1:week:1";
  const weekNumber = input.weekNumber ?? 1;

  return {
    batchId: "batch_review_1",
    clientGeneratedAt: "2026-04-30T00:00:00.000Z",
    mutations: [
      {
        mutationId,
        type: "weekly_review_upserted",
        clientTimestamp: "2026-04-30T00:00:01.000Z",
        entity: {
          clientGoalId: "goal_local_1",
          clientPlanId,
          clientWeekId,
        },
        payload: {
          backendPlanId: input.backendPlanId,
          backendWeekId: input.backendWeekId,
          clientPlanId,
          clientWeekId,
          weekNumber,
          executionScore: 82,
          review: {
            weekNumber,
            leadCompletionPercent: 75,
            lagProgressValue: "3/5 responses",
            biggestOutputThisWeek: "One tester completed the loop",
            mainObstacle: "Setup was long",
            nextWeekPriority: input.nextWeekPriority ?? "Shorten the setup copy",
            workloadDecision: "keep same",
            reviewCompleted: true,
            progressScore: 8,
            disciplineScore: 8,
            focusScore: 7,
            improvementScore: 8,
            outputQualityScore: 9,
            completedLeadIndicators: 3,
          },
        },
      },
    ],
  };
}

function createLeadMetricMutation(
  mutationId = "dmq_metric_1",
  input: {
    backendPlanId?: string;
    backendWeekId?: string;
    clientPlanId?: string;
    clientWeekId?: string;
    clientMetricId?: string;
    weekNumber?: number;
    name?: string;
    weeklyTarget?: number;
    currentValue?: number;
    unsupportedWeeklyReviewMarker?: string;
  } = {},
): TestMutationRequestBody {
  const clientPlanId = input.clientPlanId ?? "goal_local_1:12-week-system";
  const clientWeekId = input.clientWeekId ?? "goal_local_1:week:1";
  const clientMetricId = input.clientMetricId ?? "goal_local_1:week:1:metric:lead_demo_feedback";
  const weekNumber = input.weekNumber ?? 1;

  return {
    batchId: "batch_metric_1",
    clientGeneratedAt: "2026-04-30T00:00:00.000Z",
    mutations: [
      {
        mutationId,
        type: "lead_metric_upserted",
        clientTimestamp: "2026-04-30T00:00:01.000Z",
        entity: {
          clientGoalId: "goal_local_1",
          clientPlanId,
          clientWeekId,
          clientMetricId,
        },
        payload: {
          reason: "manual_update",
          backendPlanId: input.backendPlanId,
          backendWeekId: input.backendWeekId,
          clientPlanId,
          clientWeekId,
          clientMetricId,
          leadIndicatorId: "lead_demo_feedback",
          weekNumber,
          name: input.name ?? "Demo feedback",
          weeklyTarget: input.weeklyTarget ?? 5,
          target: String(input.weeklyTarget ?? 5),
          unit: "responses/week",
          type: "core",
          priority: 1,
          schedule: [1, 3, 5],
          currentValue: input.currentValue ?? 2,
          weeklyReviewMarker: input.unsupportedWeeklyReviewMarker,
        },
      },
    ],
  };
}

function createPlanSnapshotMutation(
  mutationId = "dmq_plan_snapshot_1",
  input: {
    clientPlanId?: string;
    clientGoalId?: string;
    vision?: string;
    startDate?: string;
    weekFocus?: string;
    expectedOutput?: string;
  } = {},
): TestMutationRequestBody {
  const clientGoalId = input.clientGoalId ?? "goal_local_1";
  const clientPlanId = input.clientPlanId ?? "goal_local_1:12-week-system";

  return {
    batchId: "batch_snapshot_1",
    clientGeneratedAt: "2026-04-30T00:00:00.000Z",
    mutations: [
      {
        mutationId,
        type: "plan_snapshot_updated",
        clientTimestamp: "2026-04-30T00:00:01.000Z",
        entity: {
          clientGoalId,
          clientPlanId,
        },
        payload: {
          reason: "manual_update",
          clientGoalId,
          clientPlanId,
          changedAt: "2026-04-30T00:00:01.000Z",
          clientUpdatedAt: "2026-04-30T00:00:01.000Z",
          system: {
            vision12Week: input.vision ?? "Updated backend vision",
            startDate: input.startDate ?? "2026-05-04",
            status: "active",
            currentWeek: 1,
            totalWeeks: 12,
            weeklyPlans: [
              {
                clientWeekId: "goal_local_1:week:1",
                weekNumber: 1,
                phaseName: "Start",
                focus: input.weekFocus ?? "Updated focus",
                milestone: input.expectedOutput ?? "Updated expected output",
                completed: false,
              },
            ],
          },
        },
      },
    ],
  };
}

function createValidImportPayload(idempotencyKey = "import_validate_test_1") {
  return {
    idempotencyKey,
    clientGoalId: "goal_local_1",
    title: "Ship the public demo",
    category: "career",
    description: "Make the MVP 1 public demo safe to test.",
    deadline: "2026-07-23",
    status: "active",
    tasks: [],
    plan: {
      clientPlanId: "goal_local_1:12-week-system",
      clientGoalId: "goal_local_1",
      vision: "A clear 12-week demo loop",
      startDate: "2026-04-30",
      endDate: "2026-07-23",
      timezone: "Asia/Saigon",
      weekStartsOn: 1,
      totalWeeks: 12,
      status: "active",
      goalType: "personal",
      lagMetric: { name: "Demo feedback", target: "5", unit: "responses" },
      leadIndicators: [
        {
          id: "lead_demo_feedback",
          leadIndicatorId: "lead_demo_feedback",
          name: "Demo feedback",
          target: "5",
          unit: "responses/week",
          type: "core",
          priority: 1,
          schedule: [1, 3, 5],
        },
      ],
      milestones: {},
      successEvidence: "Users can finish the loop.",
      reviewDay: "sunday",
      week12Outcome: "Demo is validated.",
      currentWeek: 1,
      weeks: [
        {
          clientWeekId: "goal_local_1:week:1",
          clientPlanId: "goal_local_1:12-week-system",
          weekNumber: 1,
          phaseName: "Start",
          focus: "Validate the first week.",
          expectedOutput: "A usable first week.",
          completed: false,
        },
      ],
      tasks: [
        {
          clientTaskId: "task_local_1",
          clientPlanId: "goal_local_1:12-week-system",
          clientWeekId: "goal_local_1:week:1",
          weekNumber: 1,
          title: "Run one user test",
          status: "todo",
          scheduledDate: "2026-04-30",
          leadIndicatorName: "Demo feedback",
          isCore: true,
        },
      ],
      leadMetrics: [
        {
          clientMetricId: "goal_local_1:week:1:metric:lead_demo_feedback",
          clientPlanId: "goal_local_1:12-week-system",
          clientWeekId: "goal_local_1:week:1",
          leadIndicatorId: "lead_demo_feedback",
          weekNumber: 1,
          name: "Demo feedback",
          weeklyTarget: 5,
          target: "5",
          unit: "responses/week",
          type: "core",
          priority: 1,
          schedule: [1, 3, 5],
        },
      ],
      dailyCheckIns: [
        {
          clientCheckInId: "goal_local_1:12-week-system:checkin:2026-04-30",
          clientGoalId: "goal_local_1",
          clientPlanId: "goal_local_1:12-week-system",
          clientWeekId: "goal_local_1:week:1",
          localDate: "2026-04-30",
          date: "2026-04-30",
          weekNumber: 1,
          didWorkToday: true,
          whichLeadIndicatorWorkedOn: "Demo feedback",
          amountDone: "One user test",
          outputCreated: "Feedback notes",
          obstacleOrIssue: "Setup took too long.",
          dailySelfRating: 4,
          optionalNote: "Local-only note for first-party import validation.",
          mood: "steady",
        },
      ],
      weeklyReviews: [
        {
          clientReviewId: "goal_local_1:12-week-system:review:1",
          clientGoalId: "goal_local_1",
          clientPlanId: "goal_local_1:12-week-system",
          clientWeekId: "goal_local_1:week:1",
          weekNumber: 1,
          executionScore: 80,
          leadCompletionPercent: 75,
          biggestOutputThisWeek: "One tester completed the loop.",
          mainObstacle: "Setup was a little long.",
          nextWeekPriority: "Shorten copy.",
          workloadDecision: "keep same",
          reviewCompleted: true,
          progressScore: 8,
          disciplineScore: 7,
          focusScore: 8,
          improvementScore: 7,
          outputQualityScore: 8,
          completedLeadIndicators: 1,
        },
      ],
    },
  };
}

function getBatchResult(response: JsonResponse): SyncMutationBatchResult {
  assert.equal(response.body.success, true);
  assert.ok(response.body.data);
  return response.body.data as SyncMutationBatchResult;
}

function getImportValidationReport(response: JsonResponse): TwelveWeekImportValidationReport {
  assert.equal(response.body.success, true);
  assert.ok(response.body.data);
  return response.body.data as TwelveWeekImportValidationReport;
}

function getImportResult(response: JsonResponse): TwelveWeekImportResult {
  assert.equal(response.body.success, true);
  assert.ok(response.body.data);
  return response.body.data as TwelveWeekImportResult;
}

let restoreServices: Restorer | null = null;

beforeEach(() => {
  restoreServices = installServiceMocks();
});

afterEach(() => {
  restoreServices?.();
  restoreServices = null;
});

describe("12-week sync mutation route", () => {
  it("returns 401 when no auth token is provided", async () => {
    const response = await requestJson(createRouteTestApp(), "POST", "/api/sync/12-week/mutations", {
      token: null,
      body: createValidMutation(),
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.success, false);
    assert.match(response.body.message ?? "", /Unauthorized/i);
  });

  it("returns 400 for invalid mutation batch payloads", async () => {
    const response = await requestJson(createRouteTestApp(), "POST", "/api/sync/12-week/mutations", {
      body: {
        mutations: [
          {
            mutationId: "dmq_bad_1",
            type: "unsupported_mutation",
            payload: {},
          },
        ],
      },
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.match(response.body.message ?? "", /supported sync mutation types/i);
  });

  it("applies task_completed_changed to an owned task", async () => {
    const response = await requestJson(createRouteTestApp(), "POST", "/api/sync/12-week/mutations", {
      body: createValidMutation("dmq_valid_1"),
    });
    const data = getBatchResult(response);
    const task = syncTaskFixture?.getTask("64f000000000000000000001");

    assert.equal(response.status, 200);
    assert.equal(data.status, "applied");
    assert.equal(data.totalReceived, 1);
    assert.equal(data.appliedCount, 1);
    assert.equal(data.skippedCount, 0);
    assert.equal(data.failedCount, 0);
    assert.equal(data.accepted.length, 1);
    assert.equal(data.accepted[0].mutationId, "dmq_valid_1");
    assert.equal(data.accepted[0].status, "applied");
    assert.equal(data.accepted[0].entityType, "task");
    assert.equal(data.accepted[0].serverId, "64f000000000000000000001");
    assert.equal(data.duplicate.length, 0);
    assert.equal(data.failed.length, 0);
    assert.deepEqual(data.summary, {
      accepted: 1,
      duplicate: 0,
      failed: 0,
      applied: 1,
      skipped: 0,
      totalReceived: 1,
    });
    assert.equal(task?.status, "done");
    assert.equal(task?.revision, 2);
    assert.equal(task?.completedAt?.toISOString(), "2026-04-30T00:00:02.000Z");
  });

  it("returns duplicate for a repeated mutation from the same user", async () => {
    const app = createRouteTestApp();

    const first = await requestJson(app, "POST", "/api/sync/12-week/mutations", {
      body: createValidMutation("dmq_duplicate_1"),
    });
    const second = await requestJson(app, "POST", "/api/sync/12-week/mutations", {
      body: createValidMutation("dmq_duplicate_1"),
    });
    const firstData = getBatchResult(first);
    const secondData = getBatchResult(second);
    const task = syncTaskFixture?.getTask("64f000000000000000000001");

    assert.equal(firstData.accepted.length, 1);
    assert.equal(second.status, 200);
    assert.equal(secondData.status, "duplicate");
    assert.equal(secondData.accepted.length, 0);
    assert.equal(secondData.duplicate.length, 1);
    assert.equal(secondData.duplicate[0].mutationId, "dmq_duplicate_1");
    assert.equal(task?.revision, 2);
  });

  it("clears completedAt when task_completed_changed marks a task incomplete", async () => {
    const app = createRouteTestApp();
    const completedPayload = createValidMutation("dmq_clear_completed_at_1");
    const incompletePayload = createValidMutation("dmq_clear_completed_at_2");
    incompletePayload.mutations[0].payload.completed = false;
    delete incompletePayload.mutations[0].payload.completedAt;

    const completed = await requestJson(app, "POST", "/api/sync/12-week/mutations", {
      body: completedPayload,
    });
    const incomplete = await requestJson(app, "POST", "/api/sync/12-week/mutations", {
      body: incompletePayload,
    });
    const data = getBatchResult(incomplete);
    const task = syncTaskFixture?.getTask("64f000000000000000000001");

    assert.equal(completed.status, 200);
    assert.equal(incomplete.status, 200);
    assert.equal(data.appliedCount, 1);
    assert.equal(task?.status, "todo");
    assert.equal(task?.completedAt, undefined);
    assert.equal(task?.revision, 3);
  });

  it("returns 409 when a mutationId is reused with a different payload", async () => {
    const app = createRouteTestApp();
    const firstPayload = createValidMutation("dmq_conflict_1");
    const secondPayload = createValidMutation("dmq_conflict_1");
    secondPayload.mutations[0].payload.completed = false;

    const first = await requestJson(app, "POST", "/api/sync/12-week/mutations", {
      body: firstPayload,
    });
    const second = await requestJson(app, "POST", "/api/sync/12-week/mutations", {
      body: secondPayload,
    });

    assert.equal(first.status, 200);
    assert.equal(second.status, 409);
    assert.equal(second.body.success, false);
    assert.match(second.body.message ?? "", /idempotency conflict/i);
  });

  it("returns 400 when task_completed_changed is missing required fields", async () => {
    const payload = createValidMutation("dmq_bad_task_1");
    payload.mutations[0].entity = {};
    payload.mutations[0].payload = { clientTaskId: "task_local_1" };

    const response = await requestJson(createRouteTestApp(), "POST", "/api/sync/12-week/mutations", {
      body: payload,
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.match(response.body.message ?? "", /completed must be a boolean/i);
  });

  it("scopes mutation idempotency by authenticated user", async () => {
    const app = createRouteTestApp();

    const ownerResponse = await requestJson(app, "POST", "/api/sync/12-week/mutations", {
      body: createValidMutation("dmq_cross_user_1"),
      token: "owner-token",
    });
    const otherResponse = await requestJson(app, "POST", "/api/sync/12-week/mutations", {
      body: createValidMutation("dmq_cross_user_1"),
      token: "other-token",
    });
    const ownerData = getBatchResult(ownerResponse);
    const otherData = getBatchResult(otherResponse);

    assert.equal(ownerData.accepted.length, 1);
    assert.equal(otherData.accepted.length, 1);
    assert.equal(otherData.duplicate.length, 0);
    assert.equal(syncTaskFixture?.getTask("64f000000000000000000001")?.status, "done");
    assert.equal(syncTaskFixture?.getTask("64f000000000000000000002")?.status, "done");
  });

  it("blocks cross-user task updates without leaking the task", async () => {
    const payload = createValidMutation("dmq_cross_owner_1");
    payload.mutations[0].entity = { taskId: "64f000000000000000000003" };
    payload.mutations[0].payload = {
      backendTaskId: "64f000000000000000000003",
      completed: true,
    };

    const response = await requestJson(createRouteTestApp(), "POST", "/api/sync/12-week/mutations", {
      body: payload,
      token: "owner-token",
    });
    const data = getBatchResult(response);

    assert.equal(response.status, 200);
    assert.equal(data.status, "failed");
    assert.equal(data.appliedCount, 0);
    assert.equal(data.failedCount, 1);
    assert.equal(data.failed[0].status, "failed_not_found");
    assert.equal(data.failed[0].reason, "task_not_found_or_not_owned");
    assert.equal(syncTaskFixture?.getTask("64f000000000000000000003")?.status, "todo");
  });

  it("applies plan_snapshot_upsert aliases without crashing", async () => {
    const response = await requestJson(createRouteTestApp(), "POST", "/api/sync/12-week/mutations", {
      body: {
        batchId: "batch_unsupported_1",
        mutations: [
          {
            mutationId: "dmq_unsupported_allowed_1",
            type: "plan_snapshot_upsert",
            clientTimestamp: "2026-04-30T00:00:01.000Z",
            payload: {
              clientPlanId: "goal_local_1:12-week-system",
              weekNumber: 1,
            },
          },
        ],
      },
    });
    const data = getBatchResult(response);

    assert.equal(response.status, 200);
    assert.equal(data.status, "applied");
    assert.equal(data.appliedCount, 1);
    assert.equal(data.skippedCount, 0);
    assert.equal(data.failedCount, 0);
    assert.equal(data.accepted[0].status, "applied");
    assert.equal(data.accepted[0].entityType, "plan");
  });

  it("applies daily_check_in_upserted by plan, week, and date", async () => {
    const response = await requestJson(createRouteTestApp(), "POST", "/api/sync/12-week/mutations", {
      body: createDailyCheckInMutation("dmq_daily_create_1"),
    });
    const data = getBatchResult(response);
    const checkIn = syncWorkspaceFixture?.getDailyCheckIn(
      ownerUserId,
      "goal_local_1:12-week-system",
      "2026-04-30",
    );

    assert.equal(response.status, 200);
    assert.equal(data.status, "applied");
    assert.equal(data.appliedCount, 1);
    assert.equal(data.accepted[0].entityType, "daily_check_in");
    assert.equal(checkIn?.didWorkToday, true);
    assert.equal(checkIn?.amountDone, "One user test");
    assert.equal(checkIn?.outputCreated, "Interview notes");
    assert.equal(checkIn?.revision, 1);
  });

  it("updates the latest daily_check_in_upserted for the same date", async () => {
    const app = createRouteTestApp();

    const first = await requestJson(app, "POST", "/api/sync/12-week/mutations", {
      body: createDailyCheckInMutation("dmq_daily_update_1", { amountDone: "One user test" }),
    });
    const second = await requestJson(app, "POST", "/api/sync/12-week/mutations", {
      body: createDailyCheckInMutation("dmq_daily_update_2", { amountDone: "Two user tests" }),
    });
    const checkIn = syncWorkspaceFixture?.getDailyCheckIn(
      ownerUserId,
      "goal_local_1:12-week-system",
      "2026-04-30",
    );

    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(checkIn?.amountDone, "Two user tests");
    assert.equal(checkIn?.revision, 2);
  });

  it("applies weekly_review_upserted by plan and week", async () => {
    const response = await requestJson(createRouteTestApp(), "POST", "/api/sync/12-week/mutations", {
      body: createWeeklyReviewMutation("dmq_review_create_1"),
    });
    const data = getBatchResult(response);
    const review = syncWorkspaceFixture?.getWeeklyReview(ownerUserId, "goal_local_1:12-week-system", 1);

    assert.equal(response.status, 200);
    assert.equal(data.status, "applied");
    assert.equal(data.appliedCount, 1);
    assert.equal(data.accepted[0].entityType, "weekly_review");
    assert.equal(review?.executionScore, 82);
    assert.equal(review?.leadCompletionPercent, 75);
    assert.equal(review?.biggestOutputThisWeek, "One tester completed the loop");
    assert.equal(review?.nextWeekPriority, "Shorten the setup copy");
    assert.equal(review?.reviewCompleted, true);
    assert.equal(review?.revision, 1);
  });

  it("updates the latest weekly_review_upserted for the same week", async () => {
    const app = createRouteTestApp();

    const first = await requestJson(app, "POST", "/api/sync/12-week/mutations", {
      body: createWeeklyReviewMutation("dmq_review_update_1", { nextWeekPriority: "Shorten copy" }),
    });
    const second = await requestJson(app, "POST", "/api/sync/12-week/mutations", {
      body: createWeeklyReviewMutation("dmq_review_update_2", { nextWeekPriority: "Run three tests" }),
    });
    const review = syncWorkspaceFixture?.getWeeklyReview(ownerUserId, "goal_local_1:12-week-system", 1);

    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(review?.nextWeekPriority, "Run three tests");
    assert.equal(review?.revision, 2);
  });

  it("applies and upserts lead_metric_upserted by owned plan, week, and client metric", async () => {
    const app = createRouteTestApp();

    const first = await requestJson(app, "POST", "/api/sync/12-week/mutations", {
      body: createLeadMetricMutation("dmq_metric_create_1", { weeklyTarget: 5, currentValue: 2 }),
    });
    const second = await requestJson(app, "POST", "/api/sync/12-week/mutations", {
      body: createLeadMetricMutation("dmq_metric_update_1", { weeklyTarget: 7, currentValue: 4 }),
    });
    const data = getBatchResult(second);
    const metric = syncWorkspaceFixture?.getLeadMetric(
      ownerUserId,
      "goal_local_1:12-week-system",
      "goal_local_1:week:1:metric:lead_demo_feedback",
    );

    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(data.status, "applied");
    assert.equal(data.appliedCount, 1);
    assert.equal(data.accepted[0].entityType, "lead_metric");
    assert.equal(metric?.name, "Demo feedback");
    assert.equal(metric?.weeklyTarget, 7);
    assert.equal(metric?.target, "7");
    assert.equal(metric?.currentValue, 4);
    assert.equal(metric?.unit, "responses/week");
    assert.equal(metric?.type, "core");
    assert.deepEqual(metric?.schedule, [1, 3, 5]);
    assert.equal(metric?.revision, 2);
  });

  it("applies execution mutations with stale client parents when owned backend parents are present", async () => {
    const app = createRouteTestApp();
    const staleClientPlanId = "64f000000000000000000099:12-week-system";
    const staleClientWeekId = "64f000000000000000000099:week:1";
    const backendParents = {
      backendPlanId: "plan_owner_1",
      backendWeekId: "week_owner_1",
      clientPlanId: staleClientPlanId,
      clientWeekId: staleClientWeekId,
      weekNumber: 1,
    };

    const task = await requestJson(app, "POST", "/api/sync/12-week/mutations", {
      body: createValidMutation("dmq_backend_parent_task_1", backendParents),
    });
    const daily = await requestJson(app, "POST", "/api/sync/12-week/mutations", {
      body: createDailyCheckInMutation("dmq_backend_parent_daily_1", backendParents),
    });
    const weekly = await requestJson(app, "POST", "/api/sync/12-week/mutations", {
      body: createWeeklyReviewMutation("dmq_backend_parent_review_1", backendParents),
    });
    const metric = await requestJson(app, "POST", "/api/sync/12-week/mutations", {
      body: createLeadMetricMutation("dmq_backend_parent_metric_1", backendParents),
    });

    assert.equal(task.status, 200);
    assert.equal(daily.status, 200);
    assert.equal(weekly.status, 200);
    assert.equal(metric.status, 200);
    assert.equal(getBatchResult(task).appliedCount, 1);
    assert.equal(getBatchResult(daily).appliedCount, 1);
    assert.equal(getBatchResult(weekly).appliedCount, 1);
    assert.equal(getBatchResult(metric).appliedCount, 1);
    assert.equal(syncTaskFixture?.getTask("64f000000000000000000001")?.status, "done");
    assert.equal(
      syncWorkspaceFixture?.getDailyCheckIn(ownerUserId, "goal_local_1:12-week-system", "2026-04-30")?.amountDone,
      "One user test",
    );
    assert.equal(
      syncWorkspaceFixture?.getWeeklyReview(ownerUserId, "goal_local_1:12-week-system", 1)?.nextWeekPriority,
      "Shorten the setup copy",
    );
    assert.equal(
      syncWorkspaceFixture?.getLeadMetric(
        ownerUserId,
        "goal_local_1:12-week-system",
        "goal_local_1:week:1:metric:lead_demo_feedback",
      )?.currentValue,
      2,
    );
  });

  it("blocks execution mutations with backend parents owned by another user", async () => {
    const response = await requestJson(createRouteTestApp(), "POST", "/api/sync/12-week/mutations", {
      body: createDailyCheckInMutation("dmq_backend_parent_cross_user_1", {
        backendPlanId: "plan_other_2",
        backendWeekId: "week_other_2",
        clientPlanId: "64f000000000000000000099:12-week-system",
        clientWeekId: "64f000000000000000000099:week:1",
      }),
      token: "owner-token",
    });
    const data = getBatchResult(response);

    assert.equal(response.status, 200);
    assert.equal(data.status, "failed");
    assert.equal(data.failed[0].status, "failed_not_found");
    assert.equal(data.failed[0].reason, "week_not_found_or_not_owned");
    assert.equal(data.failed[0].syncErrorCode, "ownership_denied");
  });

  it("returns duplicate for repeated lead_metric_upserted without applying twice", async () => {
    const app = createRouteTestApp();
    const payload = createLeadMetricMutation("dmq_metric_duplicate_1", { currentValue: 3 });

    const first = await requestJson(app, "POST", "/api/sync/12-week/mutations", { body: payload });
    const second = await requestJson(app, "POST", "/api/sync/12-week/mutations", { body: payload });
    const secondData = getBatchResult(second);
    const metric = syncWorkspaceFixture?.getLeadMetric(
      ownerUserId,
      "goal_local_1:12-week-system",
      "goal_local_1:week:1:metric:lead_demo_feedback",
    );

    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(secondData.status, "duplicate");
    assert.equal(secondData.duplicate.length, 1);
    assert.equal(metric?.revision, 1);
  });

  it("returns 400 for invalid lead_metric_upserted payloads", async () => {
    const invalidMissingMetricId = createLeadMetricMutation("dmq_metric_invalid_1");
    delete invalidMissingMetricId.mutations[0].payload.clientMetricId;
    if (invalidMissingMetricId.mutations[0].entity) {
      delete invalidMissingMetricId.mutations[0].entity.clientMetricId;
    }

    const invalid = await requestJson(createRouteTestApp(), "POST", "/api/sync/12-week/mutations", {
      body: invalidMissingMetricId,
    });

    assert.equal(invalid.status, 400);
    assert.match(invalid.body.message ?? "", /clientMetricId/i);
  });

  it("blocks cross-user lead_metric_upserted parents", async () => {
    const response = await requestJson(createRouteTestApp(), "POST", "/api/sync/12-week/mutations", {
      body: createLeadMetricMutation("dmq_metric_cross_user_1", {
        clientPlanId: "other_goal:12-week-system",
        clientWeekId: "other_goal:week:1",
        clientMetricId: "other_goal:week:1:metric:lead_demo_feedback",
      }),
      token: "owner-token",
    });
    const data = getBatchResult(response);

    assert.equal(response.status, 200);
    assert.equal(data.status, "failed");
    assert.equal(data.failed[0].status, "failed_not_found");
    assert.equal(data.failed[0].reason, "week_not_found_or_not_owned");
    assert.equal(data.failed[0].syncErrorCode, "ownership_denied");
  });

  it("ignores unsupported lead_metric_upserted fields without touching weekly review data", async () => {
    const app = createRouteTestApp();

    const reviewResponse = await requestJson(app, "POST", "/api/sync/12-week/mutations", {
      body: createWeeklyReviewMutation("dmq_metric_guard_review_1", { nextWeekPriority: "Keep review data" }),
    });
    const metricResponse = await requestJson(app, "POST", "/api/sync/12-week/mutations", {
      body: createLeadMetricMutation("dmq_metric_unsupported_1", {
        unsupportedWeeklyReviewMarker: "unsafe review overwrite",
      }),
    });
    const review = syncWorkspaceFixture?.getWeeklyReview(ownerUserId, "goal_local_1:12-week-system", 1);
    const metric = syncWorkspaceFixture?.getLeadMetric(
      ownerUserId,
      "goal_local_1:12-week-system",
      "goal_local_1:week:1:metric:lead_demo_feedback",
    );

    assert.equal(reviewResponse.status, 200);
    assert.equal(metricResponse.status, 200);
    assert.equal(review?.nextWeekPriority, "Keep review data");
    assert.equal(metric?.weeklyReviewMarker, undefined);
  });

  it("applies plan_snapshot_updated allowed plan and week fields", async () => {
    const response = await requestJson(createRouteTestApp(), "POST", "/api/sync/12-week/mutations", {
      body: createPlanSnapshotMutation("dmq_snapshot_apply_1", {
        vision: "A narrower updated 12-week vision",
        startDate: "2026-05-04",
        weekFocus: "Validate the updated plan",
        expectedOutput: "Updated demo notes",
      }),
    });
    const data = getBatchResult(response);
    const plan = syncWorkspaceFixture?.getPlan(ownerUserId, "goal_local_1:12-week-system");
    const week = syncWorkspaceFixture?.getWeek(ownerUserId, "goal_local_1:12-week-system", 1);

    assert.equal(response.status, 200);
    assert.equal(data.status, "applied");
    assert.equal(data.appliedCount, 1);
    assert.equal(data.accepted[0].entityType, "plan");
    assert.equal(data.accepted[0].clientId, "goal_local_1:12-week-system");
    assert.equal(plan?.vision, "A narrower updated 12-week vision");
    assert.equal(plan?.startDate, "2026-05-04");
    assert.equal(plan?.revision, 2);
    assert.equal(week?.focus, "Validate the updated plan");
    assert.equal(week?.expectedOutput, "Updated demo notes");
    assert.equal(week?.revision, 2);
  });

  it("does not overwrite task completion from plan_snapshot_updated payloads", async () => {
    const app = createRouteTestApp();
    const taskMutation = createValidMutation("dmq_snapshot_task_guard_1");
    const snapshotMutation = createPlanSnapshotMutation("dmq_snapshot_task_guard_2");
    const snapshotSystem = snapshotMutation.mutations[0].payload.system as Record<string, unknown>;
    snapshotMutation.mutations[0].payload.system = {
      ...snapshotSystem,
      taskInstances: [
        {
          id: "task_local_1",
          completed: false,
          completedAt: undefined,
        },
      ],
    };

    const completed = await requestJson(app, "POST", "/api/sync/12-week/mutations", {
      body: taskMutation,
    });
    const snapshot = await requestJson(app, "POST", "/api/sync/12-week/mutations", {
      body: snapshotMutation,
    });
    const task = syncTaskFixture?.getTask("64f000000000000000000001");

    assert.equal(completed.status, 200);
    assert.equal(snapshot.status, 200);
    assert.equal(task?.status, "done");
    assert.equal(task?.completedAt?.toISOString(), "2026-04-30T00:00:02.000Z");
  });

  it("returns duplicate for repeated plan_snapshot_updated without applying twice", async () => {
    const app = createRouteTestApp();
    const payload = createPlanSnapshotMutation("dmq_snapshot_duplicate_1", {
      vision: "One snapshot apply only",
    });

    const first = await requestJson(app, "POST", "/api/sync/12-week/mutations", { body: payload });
    const second = await requestJson(app, "POST", "/api/sync/12-week/mutations", { body: payload });
    const secondData = getBatchResult(second);
    const plan = syncWorkspaceFixture?.getPlan(ownerUserId, "goal_local_1:12-week-system");

    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(secondData.status, "duplicate");
    assert.equal(secondData.duplicate.length, 1);
    assert.equal(plan?.revision, 2);
  });

  it("returns 409 when a plan_snapshot_updated mutationId is reused with different payload", async () => {
    const app = createRouteTestApp();
    const firstPayload = createPlanSnapshotMutation("dmq_snapshot_conflict_1", { vision: "First vision" });
    const secondPayload = createPlanSnapshotMutation("dmq_snapshot_conflict_1", { vision: "Second vision" });

    const first = await requestJson(app, "POST", "/api/sync/12-week/mutations", { body: firstPayload });
    const second = await requestJson(app, "POST", "/api/sync/12-week/mutations", { body: secondPayload });

    assert.equal(first.status, 200);
    assert.equal(second.status, 409);
    assert.equal(second.body.success, false);
    assert.match(second.body.message ?? "", /idempotency conflict/i);
  });

  it("blocks cross-user plan_snapshot_updated parents", async () => {
    const response = await requestJson(createRouteTestApp(), "POST", "/api/sync/12-week/mutations", {
      body: createPlanSnapshotMutation("dmq_snapshot_cross_user_1", {
        clientPlanId: "other_goal:12-week-system",
        clientGoalId: "other_goal",
      }),
      token: "owner-token",
    });
    const data = getBatchResult(response);

    assert.equal(response.status, 200);
    assert.equal(data.status, "failed");
    assert.equal(data.failed[0].status, "failed_not_found");
    assert.equal(data.failed[0].reason, "plan_not_found_or_not_owned");
    assert.equal(data.failed[0].syncErrorCode, "ownership_denied");
  });

  it("returns duplicate for repeated daily_check_in_upserted without updating again", async () => {
    const app = createRouteTestApp();
    const payload = createDailyCheckInMutation("dmq_daily_duplicate_1", { amountDone: "One user test" });

    const first = await requestJson(app, "POST", "/api/sync/12-week/mutations", { body: payload });
    const second = await requestJson(app, "POST", "/api/sync/12-week/mutations", { body: payload });
    const secondData = getBatchResult(second);
    const checkIn = syncWorkspaceFixture?.getDailyCheckIn(
      ownerUserId,
      "goal_local_1:12-week-system",
      "2026-04-30",
    );

    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(secondData.status, "duplicate");
    assert.equal(secondData.duplicate.length, 1);
    assert.equal(checkIn?.revision, 1);
  });

  it("blocks cross-user daily and weekly mutation parents", async () => {
    const app = createRouteTestApp();

    const daily = await requestJson(app, "POST", "/api/sync/12-week/mutations", {
      body: createDailyCheckInMutation("dmq_daily_cross_user_1", {
        clientPlanId: "other_goal:12-week-system",
        clientWeekId: "other_goal:week:1",
      }),
      token: "owner-token",
    });
    const weekly = await requestJson(app, "POST", "/api/sync/12-week/mutations", {
      body: createWeeklyReviewMutation("dmq_review_cross_user_1", {
        clientPlanId: "other_goal:12-week-system",
        clientWeekId: "other_goal:week:1",
      }),
      token: "owner-token",
    });
    const dailyData = getBatchResult(daily);
    const weeklyData = getBatchResult(weekly);

    assert.equal(daily.status, 200);
    assert.equal(weekly.status, 200);
    assert.equal(dailyData.failed[0].status, "failed_not_found");
    assert.equal(dailyData.failed[0].reason, "week_not_found_or_not_owned");
    assert.equal(weeklyData.failed[0].status, "failed_not_found");
    assert.equal(weeklyData.failed[0].reason, "week_not_found_or_not_owned");
  });

  it("returns 400 for invalid daily date and weekly week payloads", async () => {
    const invalidDaily = await requestJson(createRouteTestApp(), "POST", "/api/sync/12-week/mutations", {
      body: createDailyCheckInMutation("dmq_daily_invalid_date_1", { date: "not-a-date" }),
    });
    const invalidWeekly = await requestJson(createRouteTestApp(), "POST", "/api/sync/12-week/mutations", {
      body: createWeeklyReviewMutation("dmq_review_invalid_week_1", { weekNumber: 13 }),
    });

    assert.equal(invalidDaily.status, 400);
    assert.match(invalidDaily.body.message ?? "", /valid date/i);
    assert.equal(invalidWeekly.status, 400);
    assert.match(invalidWeekly.body.message ?? "", /between 1 and 12/i);
  });

  it("does not store raw check-in or review text in mutation logs", async () => {
    const app = createRouteTestApp();
    const rawCheckInText = "PRIVATE CHECKIN TEXT 426ee1";
    const rawReviewText = "PRIVATE REVIEW TEXT 9a91ef";

    await requestJson(app, "POST", "/api/sync/12-week/mutations", {
      body: createDailyCheckInMutation("dmq_daily_private_text_1", { amountDone: rawCheckInText }),
    });
    await requestJson(app, "POST", "/api/sync/12-week/mutations", {
      body: createWeeklyReviewMutation("dmq_review_private_text_1", { nextWeekPriority: rawReviewText }),
    });
    const serializedLogs = JSON.stringify(syncLogFixture?.getLogs() ?? []);

    assert.equal(serializedLogs.includes(rawCheckInText), false);
    assert.equal(serializedLogs.includes(rawReviewText), false);
  });

  it("rejects batch exceeding 100 mutations", async () => {
    const oversized = {
      batchId: "batch_oversized",
      clientGeneratedAt: "2026-04-30T00:00:00.000Z",
      mutations: Array.from({ length: 101 }, (_, i) => ({
        mutationId: `dmq_oversized_${i}`,
        type: "task_completed_changed",
        clientTimestamp: "2026-04-30T00:00:01.000Z",
        entity: { clientTaskId: "task_1" },
        payload: { completed: true },
      })),
    };

    const response = await requestJson(createRouteTestApp(), "POST", "/api/sync/12-week/mutations", {
      body: oversized,
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.match(response.body.message ?? "", /cannot contain more than 100/i);
  });

  it("rejects mutation with too-long mutationId", async () => {
    const longId = "a".repeat(241);
    const body = {
      batchId: "batch_long_id",
      clientGeneratedAt: "2026-04-30T00:00:00.000Z",
      mutations: [
        {
          mutationId: longId,
          type: "task_completed_changed",
          clientTimestamp: "2026-04-30T00:00:01.000Z",
          entity: { clientTaskId: "task_1" },
          payload: { completed: true, clientTaskId: "task_1" },
        },
      ],
    };

    const response = await requestJson(createRouteTestApp(), "POST", "/api/sync/12-week/mutations", {
      body,
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.match(response.body.message ?? "", /cannot exceed 240/i);
  });

  it("rejects mutation with too-long entity clientId", async () => {
    const longClientId = "c".repeat(121);
    const body = {
      batchId: "batch_long_client_id",
      clientGeneratedAt: "2026-04-30T00:00:00.000Z",
      mutations: [
        {
          mutationId: "dmq_long_client_1",
          type: "task_completed_changed",
          clientTimestamp: "2026-04-30T00:00:01.000Z",
          entity: { clientTaskId: longClientId },
          payload: { completed: true, clientTaskId: longClientId },
        },
      ],
    };

    const response = await requestJson(createRouteTestApp(), "POST", "/api/sync/12-week/mutations", {
      body,
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.match(response.body.message ?? "", /cannot exceed 120/i);
  });

  it("rejects unsupported mutation type with 400", async () => {
    const body = {
      batchId: "batch_unsupported",
      clientGeneratedAt: "2026-04-30T00:00:00.000Z",
      mutations: [
        {
          mutationId: "dmq_unsupported_1",
          type: "totally_unknown_kind",
          clientTimestamp: "2026-04-30T00:00:01.000Z",
          payload: { foo: "bar" },
        },
      ],
    };

    const response = await requestJson(createRouteTestApp(), "POST", "/api/sync/12-week/mutations", {
      body,
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.match(response.body.message ?? "", /supported sync mutation types/i);
  });

  it("blocks cross-user task write with ownership_denied syncErrorCode", async () => {
    const app = createRouteTestApp();
    const restorer = installServiceMocks();

    try {
      // Use a clientTaskId/plan that only ownerUserId owns — otherUserId's
      // tasks have different clientPlanId/clientWeekId/clientTaskId, so the
      // mock ownership check will correctly reject this mutation.
      const body: TestMutationRequestBody = {
        batchId: "batch_cross_user",
        clientGeneratedAt: "2026-04-30T00:00:00.000Z",
        mutations: [
          {
            mutationId: "dmq_cross_user_1",
            type: "task_completed_changed",
            clientTimestamp: "2026-04-30T00:00:01.000Z",
            entity: {
              clientPlanId: "owner_only_plan:12-week-system",
              clientWeekId: "owner_only_plan:week:1",
              clientTaskId: "owner_only_task_1",
            },
            payload: {
              completed: true,
              completedAt: "2026-04-30T00:00:02.000Z",
              clientTaskId: "owner_only_task_1",
              clientPlanId: "owner_only_plan:12-week-system",
              clientWeekId: "owner_only_plan:week:1",
            },
          },
        ],
      };

      const response = await requestJson(app, "POST", "/api/sync/12-week/mutations", {
        body,
        token: "other-token",
      });

      assert.equal(response.status, 200);
      const data = response.body.data as SyncMutationBatchResult;
      const failedResult = data.results.find((r) => r.status === "failed_not_found");
      assert.ok(failedResult, "Expected a failed_not_found result for cross-user write");
      assert.equal(failedResult?.syncErrorCode, "ownership_denied");
    } finally {
      restorer();
    }
  });

  it("rejects invalid date in mutation payload", async () => {
    const body = createDailyCheckInMutation("dmq_bad_date_1", { date: "not-a-date" });

    const response = await requestJson(createRouteTestApp(), "POST", "/api/sync/12-week/mutations", {
      body,
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.match(response.body.message ?? "", /valid date/i);
  });

  it("includes errorCode in 400 error responses", async () => {
    const response = await requestJson(createRouteTestApp(), "POST", "/api/sync/12-week/mutations", {
      body: { mutations: "not-an-array" },
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    const bodyWithCode = response.body as Record<string, unknown>;
    assert.equal(bodyWithCode.errorCode, "invalid_payload");
  });

  it("includes errorCode in 401 error responses", async () => {
    const response = await requestJson(createRouteTestApp(), "POST", "/api/sync/12-week/mutations", {
      token: null,
      body: createValidMutation(),
    });

    assert.equal(response.status, 401);
    const bodyWithCode = response.body as Record<string, unknown>;
    assert.equal(bodyWithCode.errorCode, "unauthorized");
  });

  it("rejects too-long batchId", async () => {
    const body = {
      batchId: "b".repeat(241),
      clientGeneratedAt: "2026-04-30T00:00:00.000Z",
      mutations: [
        {
          mutationId: "dmq_long_batch_1",
          type: "task_completed_changed",
          clientTimestamp: "2026-04-30T00:00:01.000Z",
          entity: { clientTaskId: "task_1" },
          payload: { completed: true, clientTaskId: "task_1" },
        },
      ],
    };

    const response = await requestJson(createRouteTestApp(), "POST", "/api/sync/12-week/mutations", {
      body,
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.match(response.body.message ?? "", /cannot exceed 240/i);
  });
});

describe("12-week import validation route", () => {
  it("returns 401 when no auth token is provided", async () => {
    const response = await requestJson(createRouteTestApp(), "POST", "/api/sync/12-week/import/validate", {
      token: null,
      body: createValidImportPayload(),
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.success, false);
    assert.match(response.body.message ?? "", /Unauthorized/i);
  });

  it("returns 400 for unsupported import payload shapes", async () => {
    const response = await requestJson(createRouteTestApp(), "POST", "/api/sync/12-week/import/validate", {
      body: { unsupported: true },
    });
    const details = response.body.details as TwelveWeekImportValidationReport;

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.match(response.body.message ?? "", /validation failed/i);
    assert.equal(details.status, "invalid");
    assert.ok(details.errors.some((error) => error.code === "unsupported_import_shape"));
  });

  it("returns a valid dry-run report for a minimal serializer payload", async () => {
    const response = await requestJson(createRouteTestApp(), "POST", "/api/sync/12-week/import/validate", {
      body: createValidImportPayload(),
    });
    const report = getImportValidationReport(response);

    assert.equal(response.status, 200);
    assert.equal(report.status, "valid");
    assert.equal(report.mode, "validate_only");
    assert.equal(report.dryRun, true);
    assert.equal(report.acceptedEntityCounts.goals, 1);
    assert.equal(report.acceptedEntityCounts.plans, 1);
    assert.equal(report.acceptedEntityCounts.weeks, 1);
    assert.equal(report.acceptedEntityCounts.tasks, 1);
    assert.equal(report.acceptedEntityCounts.leadIndicators, 1);
    assert.equal(report.acceptedEntityCounts.leadMetrics, 1);
    assert.equal(report.acceptedEntityCounts.dailyCheckIns, 1);
    assert.equal(report.acceptedEntityCounts.weeklyReviews, 1);
    assert.equal(report.errors.length, 0);
    assert.equal(report.idempotencyKey, "import_validate_test_1");
    assert.ok(report.normalizedClientIdsCount >= 6);
  });

  it("returns 400 when required client ids are missing", async () => {
    const payload = createValidImportPayload() as Record<string, unknown>;
    delete payload.clientGoalId;

    const response = await requestJson(createRouteTestApp(), "POST", "/api/sync/12-week/import/validate", {
      body: payload,
    });
    const details = response.body.details as TwelveWeekImportValidationReport;

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.equal(details.status, "invalid");
    assert.ok(details.errors.some((error) => error.path === "body.clientGoalId" && error.code === "required"));
  });

  it("returns 400 for oversized import validation payloads", async () => {
    const payload = createValidImportPayload() as Record<string, unknown>;
    payload.description = "x".repeat(600 * 1024);

    const response = await requestJson(createRouteTestApp(), "POST", "/api/sync/12-week/import/validate", {
      body: payload,
    });
    const details = response.body.details as { actualBytes?: number; maxBytes?: number };

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.match(response.body.message ?? "", /too large/i);
    assert.ok((details.actualBytes ?? 0) > (details.maxBytes ?? Number.MAX_SAFE_INTEGER));
  });
});

describe("12-week import apply route", () => {
  it("returns 401 when no auth token is provided", async () => {
    const response = await requestJson(createRouteTestApp(), "POST", "/api/sync/12-week/import", {
      token: null,
      body: createValidImportPayload("import_apply_unauthorized_1"),
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.success, false);
    assert.match(response.body.message ?? "", /Unauthorized/i);
  });

  it("creates goal, plan, week, task, lead metric, check-in, and review records for a valid import", async () => {
    const response = await requestJson(createRouteTestApp(), "POST", "/api/sync/12-week/import", {
      body: createValidImportPayload("import_apply_valid_1"),
    });
    const result = getImportResult(response);

    assert.equal(response.status, 200);
    assert.equal(result.status, "applied");
    assert.equal(result.importId, "import_apply_valid_1");
    assert.deepEqual(result.summary, {
      goalsCreated: 1,
      goalsUpdated: 0,
      plansCreated: 1,
      plansUpdated: 0,
      weeksCreated: 1,
      weeksUpdated: 0,
      tasksCreated: 1,
      tasksUpdated: 0,
      leadMetricsCreated: 1,
      leadMetricsUpdated: 0,
      dailyCheckInsCreated: 1,
      dailyCheckInsUpdated: 0,
      weeklyReviewsCreated: 1,
      weeklyReviewsUpdated: 0,
    });
    assert.equal(result.links.goals[0].clientId, "goal_local_1");
    assert.equal(result.links.plans[0].clientId, "goal_local_1:12-week-system");
    assert.equal(result.links.weeks[0].clientId, "goal_local_1:week:1");
    assert.equal(result.links.tasks[0].clientId, "task_local_1");
    assert.equal(result.links.leadMetrics[0].clientId, "goal_local_1:week:1:metric:lead_demo_feedback");
    assert.equal(result.links.dailyCheckIns[0].clientId, "goal_local_1:12-week-system:checkin:2026-04-30");
    assert.equal(result.links.weeklyReviews[0].clientId, "goal_local_1:12-week-system:review:1");
    assert.equal(result.skipped.leadMetrics, 0);
    assert.equal(result.skipped.dailyCheckIns, 0);
    assert.equal(result.skipped.weeklyReviews, 0);
  });

  it("returns duplicate without creating new records for a repeated importId and same payload", async () => {
    const app = createRouteTestApp();
    const payload = createValidImportPayload("import_apply_duplicate_1");

    const first = await requestJson(app, "POST", "/api/sync/12-week/import", { body: payload });
    const second = await requestJson(app, "POST", "/api/sync/12-week/import", { body: payload });
    const firstResult = getImportResult(first);
    const secondResult = getImportResult(second);

    assert.equal(firstResult.status, "applied");
    assert.equal(second.status, 200);
    assert.equal(secondResult.status, "duplicate");
    assert.equal(secondResult.importId, "import_apply_duplicate_1");
    assert.equal(secondResult.links.goals[0].id, firstResult.links.goals[0].id);
    assert.equal(secondResult.links.tasks[0].id, firstResult.links.tasks[0].id);
    assert.equal(secondResult.links.leadMetrics[0].id, firstResult.links.leadMetrics[0].id);
    assert.equal(secondResult.links.dailyCheckIns[0].id, firstResult.links.dailyCheckIns[0].id);
    assert.equal(secondResult.links.weeklyReviews[0].id, firstResult.links.weeklyReviews[0].id);
  });

  it("returns 409 when the same importId is reused with a different payload", async () => {
    const app = createRouteTestApp();
    const firstPayload = createValidImportPayload("import_apply_conflict_1");
    const secondPayload = createValidImportPayload("import_apply_conflict_1") as Record<string, unknown>;
    secondPayload.title = "Different goal title";

    const first = await requestJson(app, "POST", "/api/sync/12-week/import", { body: firstPayload });
    const second = await requestJson(app, "POST", "/api/sync/12-week/import", { body: secondPayload });

    assert.equal(first.status, 200);
    assert.equal(second.status, 409);
    assert.equal(second.body.success, false);
    assert.match(second.body.message ?? "", /idempotency conflict/i);
  });

  it("scopes import idempotency and client IDs by authenticated user", async () => {
    const app = createRouteTestApp();
    const payload = createValidImportPayload("import_apply_cross_user_1");

    const ownerResponse = await requestJson(app, "POST", "/api/sync/12-week/import", {
      body: payload,
      token: "owner-token",
    });
    const otherResponse = await requestJson(app, "POST", "/api/sync/12-week/import", {
      body: payload,
      token: "other-token",
    });
    const ownerResult = getImportResult(ownerResponse);
    const otherResult = getImportResult(otherResponse);

    assert.equal(ownerResult.status, "applied");
    assert.equal(otherResult.status, "applied");
    assert.notEqual(otherResult.links.goals[0].id, ownerResult.links.goals[0].id);
    assert.notEqual(otherResult.links.plans[0].id, ownerResult.links.plans[0].id);
    assert.notEqual(otherResult.links.dailyCheckIns[0].id, ownerResult.links.dailyCheckIns[0].id);
    assert.notEqual(otherResult.links.weeklyReviews[0].id, ownerResult.links.weeklyReviews[0].id);
  });

  it("returns 400 when required client IDs are missing", async () => {
    const payload = createValidImportPayload("import_apply_missing_ids_1") as Record<string, unknown>;
    delete payload.clientGoalId;

    const response = await requestJson(createRouteTestApp(), "POST", "/api/sync/12-week/import", {
      body: payload,
    });
    const details = response.body.details as TwelveWeekImportValidationReport;

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.equal(details.status, "invalid");
    assert.ok(details.errors.some((error) => error.path === "body.clientGoalId" && error.code === "required"));
  });

  it("returns 400 for invalid imported daily check-in dates", async () => {
    const payload = createValidImportPayload("import_apply_bad_daily_1");
    payload.plan.dailyCheckIns[0].localDate = "not-a-date";
    payload.plan.dailyCheckIns[0].date = "not-a-date";

    const response = await requestJson(createRouteTestApp(), "POST", "/api/sync/12-week/import", {
      body: payload,
    });
    const details = response.body.details as TwelveWeekImportValidationReport;

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.equal(details.status, "invalid");
    assert.ok(details.errors.some((error) => error.path === "body.plan.dailyCheckIns[0].date"));
  });

  it("returns 400 for invalid imported weekly reviews", async () => {
    const payload = createValidImportPayload("import_apply_bad_review_1");
    payload.plan.weeklyReviews[0].progressScore = 11;

    const response = await requestJson(createRouteTestApp(), "POST", "/api/sync/12-week/import", {
      body: payload,
    });
    const details = response.body.details as TwelveWeekImportValidationReport;

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.equal(details.status, "invalid");
    assert.ok(details.errors.some((error) => error.path === "body.plan.weeklyReviews[0].progressScore"));
  });

  it("does not import analytics, billing, or browser-only payload fields", async () => {
    const payload = createValidImportPayload("import_apply_ignored_fields_1") as ReturnType<
      typeof createValidImportPayload
    > & {
      eventLog?: unknown[];
      syncOutbox?: unknown[];
      subscription?: Record<string, unknown>;
      entitlements?: unknown[];
      appPreferences?: Record<string, unknown>;
    };
    payload.eventLog = [{ type: "raw_private_event", metadata: { text: "PRIVATE ANALYTICS TEXT" } }];
    payload.syncOutbox = [{ payloadSummary: "PRIVATE OUTBOX TEXT" }];
    payload.subscription = { planCode: "PRO", externalCustomerId: "cus_private" };
    payload.entitlements = [{ key: "premium_templates" }];
    payload.appPreferences = { enableBrowserNotifications: true };

    const response = await requestJson(createRouteTestApp(), "POST", "/api/sync/12-week/import", {
      body: payload,
    });
    const result = getImportResult(response);
    const serializedResult = JSON.stringify(result);

    assert.equal(response.status, 200);
    assert.equal(serializedResult.includes("PRIVATE ANALYTICS TEXT"), false);
    assert.equal(serializedResult.includes("PRIVATE OUTBOX TEXT"), false);
    assert.equal(serializedResult.includes("cus_private"), false);
    assert.equal(serializedResult.includes("premium_templates"), false);
    assert.equal(serializedResult.includes("enableBrowserNotifications"), false);
  });
});
