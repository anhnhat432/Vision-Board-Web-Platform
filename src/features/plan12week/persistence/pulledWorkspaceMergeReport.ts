import type { Goal, TwelveWeekSystem, UserData } from "@/app/utils/storage-types";
import type { DataMutationItem, DataMutationStatus } from "./mutationQueue";
import {
  getTwelveWeekClientPlanId,
  getTwelveWeekClientWeekId,
} from "./twelveWeekImportPayload";
import type {
  TwelveWeekPulledWorkspace,
  TwelveWeekPullResponse,
} from "@/services/syncService";

export type PulledWorkspaceMergeEntityKind =
  | "goal"
  | "plan"
  | "week"
  | "task"
  | "leadMetric"
  | "dailyCheckIn"
  | "weeklyReview";

export type PulledWorkspaceMergeIssueSource = "local" | "cloud";

export interface PulledWorkspaceMergeIssue {
  kind: PulledWorkspaceMergeEntityKind;
  source: PulledWorkspaceMergeIssueSource;
  clientId?: string;
  localId?: string;
  cloudId?: string;
  path: string;
  message: string;
  localUpdatedAt?: string;
  cloudSyncUpdatedAt?: string;
}

export interface PulledWorkspaceConflict extends PulledWorkspaceMergeIssue {
  mutationId?: string;
  reason:
    | "pending_local_mutation_cloud_newer"
    | "task_completion_differs"
    | "daily_check_in_differs"
    | "weekly_review_differs";
}

export interface PulledWorkspaceUnsupportedField {
  goalId: string;
  clientPlanId: string;
  field: string;
  reason: string;
}

export interface PulledWorkspaceMergeReport {
  safeToApply: boolean;
  localOnlyChanges: PulledWorkspaceMergeIssue[];
  cloudOnlyChanges: PulledWorkspaceMergeIssue[];
  conflicts: PulledWorkspaceConflict[];
  missingClientIds: PulledWorkspaceMergeIssue[];
  unsupportedFields: PulledWorkspaceUnsupportedField[];
  summary: {
    localEntityCount: number;
    cloudEntityCount: number;
    localOnlyCount: number;
    cloudOnlyCount: number;
    conflictCount: number;
    missingClientIdCount: number;
    unsupportedFieldCount: number;
  };
}

export interface CreatePulledWorkspaceMergeReportOptions {
  pendingMutations?: DataMutationItem[];
}

interface ComparableEntity {
  kind: PulledWorkspaceMergeEntityKind;
  clientId: string;
  path: string;
  localId?: string;
  cloudId?: string;
  syncUpdatedAt?: string;
  updatedAt?: string;
  value: Record<string, unknown>;
}

type LocalGoalOrUserData = Goal | UserData | null | undefined;

const UNRESOLVED_MUTATION_STATUSES = new Set<DataMutationStatus>([
  "pending",
  "in_flight",
  "retry_scheduled",
  "blocked_auth",
  "blocked_config",
  "blocked_conflict",
  "failed_validation",
  "failed_terminal",
]);

function isUserData(value: LocalGoalOrUserData): value is UserData {
  return Boolean(value) && typeof value === "object" && Array.isArray((value as UserData).goals);
}

function getLocalGoals(input: LocalGoalOrUserData): Goal[] {
  if (!input) return [];
  if (isUserData(input)) return input.goals;
  return [input];
}

function isPullResponse(value: TwelveWeekPulledWorkspace | TwelveWeekPullResponse): value is TwelveWeekPullResponse {
  return Boolean((value as TwelveWeekPullResponse).workspace);
}

function getWorkspace(input: TwelveWeekPulledWorkspace | TwelveWeekPullResponse): TwelveWeekPulledWorkspace {
  return isPullResponse(input) ? input.workspace : input;
}

function normalizeDateKey(value: string | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})(?:$|T)/);
  if (match?.[1]) return match[1];
  const parsed = new Date(trimmed);
  return Number.isFinite(parsed.valueOf()) ? parsed.toISOString().slice(0, 10) : trimmed;
}

function isMeaningful(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

function addEntity(index: Map<string, ComparableEntity>, entity: ComparableEntity): void {
  index.set(`${entity.kind}:${entity.clientId}`, entity);
}

function addMissingClientId(
  issues: PulledWorkspaceMergeIssue[],
  kind: PulledWorkspaceMergeEntityKind,
  cloudId: string | undefined,
  path: string,
  message: string,
): void {
  issues.push({
    kind,
    source: "cloud",
    cloudId,
    path,
    message,
  });
}

function createLocalIndex(goals: Goal[]): Map<string, ComparableEntity> {
  const index = new Map<string, ComparableEntity>();

  goals.forEach((goal) => {
    const system = goal.twelveWeekSystem;
    if (!system) return;

    const clientPlanId = getTwelveWeekClientPlanId(goal.id);
    addEntity(index, {
      kind: "goal",
      clientId: goal.id,
      localId: goal.id,
      path: `goals.${goal.id}`,
      value: {
        title: goal.title,
        category: goal.category,
        description: goal.description,
        deadline: normalizeDateKey(goal.deadline),
        status: system.status === "completed" ? "completed" : "active",
      },
    });
    addEntity(index, {
      kind: "plan",
      clientId: clientPlanId,
      localId: clientPlanId,
      path: `goals.${goal.id}.twelveWeekSystem`,
      value: {
        vision: system.vision12Week,
        startDate: normalizeDateKey(system.startDate),
      },
    });

    system.weeklyPlans.forEach((week) => {
      const clientWeekId = getTwelveWeekClientWeekId(goal.id, week.weekNumber);
      addEntity(index, {
        kind: "week",
        clientId: clientWeekId,
        localId: clientWeekId,
        path: `goals.${goal.id}.twelveWeekSystem.weeklyPlans.${week.weekNumber}`,
        value: {
          weekNumber: week.weekNumber,
          focus: week.focus,
          expectedOutput: week.milestone,
          completed: week.completed,
        },
      });
    });

    system.taskInstances.forEach((task) => {
      addEntity(index, {
        kind: "task",
        clientId: task.id,
        localId: task.id,
        path: `goals.${goal.id}.twelveWeekSystem.taskInstances.${task.id}`,
        value: {
          weekNumber: task.weekNumber,
          title: task.title,
          scheduledDate: normalizeDateKey(task.scheduledDate),
          completed: task.completed,
          completedAt: task.completedAt,
          leadIndicatorName: task.leadIndicatorName,
          isCore: task.isCore,
        },
      });
    });

    system.dailyCheckIns.forEach((checkIn) => {
      const date = normalizeDateKey(checkIn.date);
      const clientCheckInId = `${clientPlanId}:checkin:${date}`;
      addEntity(index, {
        kind: "dailyCheckIn",
        clientId: clientCheckInId,
        localId: clientCheckInId,
        path: `goals.${goal.id}.twelveWeekSystem.dailyCheckIns.${date}`,
        value: {
          date,
          didWorkToday: checkIn.didWorkToday,
          dailySelfRating: checkIn.dailySelfRating,
          amountDone: checkIn.amountDone,
          outputCreated: checkIn.outputCreated,
          obstacleOrIssue: checkIn.obstacleOrIssue,
          optionalNote: checkIn.optionalNote,
        },
      });
    });

    system.weeklyReviews.forEach((review) => {
      const clientReviewId = `${clientPlanId}:review:${review.weekNumber}`;
      addEntity(index, {
        kind: "weeklyReview",
        clientId: clientReviewId,
        localId: clientReviewId,
        path: `goals.${goal.id}.twelveWeekSystem.weeklyReviews.${review.weekNumber}`,
        value: {
          weekNumber: review.weekNumber,
          leadCompletionPercent: review.leadCompletionPercent,
          lagProgressValue: review.lagProgressValue,
          biggestOutputThisWeek: review.biggestOutputThisWeek,
          mainObstacle: review.mainObstacle,
          nextWeekPriority: review.nextWeekPriority,
          workloadDecision: review.workloadDecision,
          reviewCompleted: review.reviewCompleted,
        },
      });
    });
  });

  return index;
}

function createCloudIndex(workspace: TwelveWeekPulledWorkspace, missingClientIds: PulledWorkspaceMergeIssue[]): Map<string, ComparableEntity> {
  const index = new Map<string, ComparableEntity>();

  workspace.goals.forEach((goal) => {
    if (!goal.clientGoalId) {
      addMissingClientId(missingClientIds, "goal", goal.id, `cloud.goals.${goal.id}`, "Pulled goal is missing clientGoalId.");
      return;
    }
    addEntity(index, {
      kind: "goal",
      clientId: goal.clientGoalId,
      cloudId: goal.id,
      syncUpdatedAt: goal.syncUpdatedAt,
      path: `cloud.goals.${goal.clientGoalId}`,
      value: {
        title: goal.title,
        category: goal.category,
        description: goal.description,
        deadline: normalizeDateKey(goal.deadline),
        status: goal.status,
      },
    });
  });

  workspace.plans.forEach((plan) => {
    if (!plan.clientPlanId) {
      addMissingClientId(missingClientIds, "plan", plan.id, `cloud.plans.${plan.id}`, "Pulled plan is missing clientPlanId.");
      return;
    }
    addEntity(index, {
      kind: "plan",
      clientId: plan.clientPlanId,
      cloudId: plan.id,
      syncUpdatedAt: plan.syncUpdatedAt,
      path: `cloud.plans.${plan.clientPlanId}`,
      value: {
        vision: plan.vision,
        startDate: normalizeDateKey(plan.startDate),
      },
    });
  });

  workspace.weeks.forEach((week) => {
    if (!week.clientWeekId) {
      addMissingClientId(missingClientIds, "week", week.id, `cloud.weeks.${week.id}`, "Pulled week is missing clientWeekId.");
      return;
    }
    addEntity(index, {
      kind: "week",
      clientId: week.clientWeekId,
      cloudId: week.id,
      syncUpdatedAt: week.syncUpdatedAt,
      path: `cloud.weeks.${week.clientWeekId}`,
      value: {
        weekNumber: week.weekNumber,
        focus: week.focus,
        expectedOutput: week.expectedOutput,
        completed: Boolean(week.review),
      },
    });
  });

  workspace.tasks.forEach((task) => {
    if (!task.clientTaskId) {
      addMissingClientId(missingClientIds, "task", task.id, `cloud.tasks.${task.id}`, "Pulled task is missing clientTaskId.");
      return;
    }
    addEntity(index, {
      kind: "task",
      clientId: task.clientTaskId,
      cloudId: task.id,
      syncUpdatedAt: task.syncUpdatedAt,
      path: `cloud.tasks.${task.clientTaskId}`,
      value: {
        weekNumber: task.weekNumber,
        title: task.title,
        scheduledDate: normalizeDateKey(task.scheduledDate),
        completed: task.status === "done",
        completedAt: task.completedAt,
        leadIndicatorName: task.leadIndicatorName,
        isCore: task.isCore,
      },
    });
  });

  workspace.leadMetrics.forEach((metric) => {
    if (!metric.clientMetricId) {
      addMissingClientId(missingClientIds, "leadMetric", metric.id, `cloud.leadMetrics.${metric.id}`, "Pulled lead metric is missing clientMetricId.");
      return;
    }
    addEntity(index, {
      kind: "leadMetric",
      clientId: metric.clientMetricId,
      cloudId: metric.id,
      syncUpdatedAt: metric.syncUpdatedAt,
      path: `cloud.leadMetrics.${metric.clientMetricId}`,
      value: {
        name: metric.name,
        weeklyTarget: metric.weeklyTarget,
        unit: metric.unit,
        type: metric.type,
        priority: metric.priority,
        schedule: metric.schedule,
      },
    });
  });

  workspace.dailyCheckIns.forEach((checkIn) => {
    if (!checkIn.clientCheckInId) {
      addMissingClientId(missingClientIds, "dailyCheckIn", checkIn.id, `cloud.dailyCheckIns.${checkIn.id}`, "Pulled daily check-in is missing clientCheckInId.");
      return;
    }
    addEntity(index, {
      kind: "dailyCheckIn",
      clientId: checkIn.clientCheckInId,
      cloudId: checkIn.id,
      syncUpdatedAt: checkIn.syncUpdatedAt,
      path: `cloud.dailyCheckIns.${checkIn.clientCheckInId}`,
      value: {
        date: normalizeDateKey(checkIn.localDate),
        didWorkToday: checkIn.didWorkToday,
        dailySelfRating: checkIn.dailySelfRating,
        amountDone: checkIn.amountDone,
        outputCreated: checkIn.outputCreated,
        obstacleOrIssue: checkIn.obstacleOrIssue,
        optionalNote: checkIn.optionalNote,
      },
    });
  });

  workspace.weeklyReviews.forEach((review) => {
    if (!review.clientReviewId) {
      addMissingClientId(missingClientIds, "weeklyReview", review.id, `cloud.weeklyReviews.${review.id}`, "Pulled weekly review is missing clientReviewId.");
      return;
    }
    addEntity(index, {
      kind: "weeklyReview",
      clientId: review.clientReviewId,
      cloudId: review.id,
      syncUpdatedAt: review.syncUpdatedAt,
      path: `cloud.weeklyReviews.${review.clientReviewId}`,
      value: {
        weekNumber: review.weekNumber,
        leadCompletionPercent: review.leadCompletionPercent,
        lagProgressValue: review.lagProgressValue,
        biggestOutputThisWeek: review.biggestOutputThisWeek,
        mainObstacle: review.mainObstacle,
        nextWeekPriority: review.nextWeekPriority,
        workloadDecision: review.workloadDecision,
        reviewCompleted: review.reviewCompleted,
      },
    });
  });

  return index;
}

function hasValueDifference(localValue: Record<string, unknown>, cloudValue: Record<string, unknown>): boolean {
  const keys = new Set([...Object.keys(localValue), ...Object.keys(cloudValue)]);
  for (const key of keys) {
    const local = localValue[key];
    const cloud = cloudValue[key];
    if (local === undefined && cloud === undefined) continue;
    if (JSON.stringify(local ?? null) !== JSON.stringify(cloud ?? null)) return true;
  }
  return false;
}

function getPendingMutationClientId(item: DataMutationItem): string | undefined {
  switch (item.kind) {
    case "task_completed_changed":
      return item.payload.clientTaskId ?? item.payload.taskId;
    case "daily_check_in_upserted":
      return `${item.payload.clientPlanId ?? item.planId ?? getTwelveWeekClientPlanId(item.goalId)}:checkin:${normalizeDateKey(item.payload.date)}`;
    case "weekly_review_upserted":
      return `${item.payload.clientPlanId ?? item.planId ?? getTwelveWeekClientPlanId(item.goalId)}:review:${item.payload.weekNumber}`;
    case "plan_snapshot_updated":
      return item.planId ?? getTwelveWeekClientPlanId(item.goalId);
  }
}

function getPendingMutationKind(item: DataMutationItem): PulledWorkspaceMergeEntityKind {
  switch (item.kind) {
    case "task_completed_changed":
      return "task";
    case "daily_check_in_upserted":
      return "dailyCheckIn";
    case "weekly_review_upserted":
      return "weeklyReview";
    case "plan_snapshot_updated":
      return "plan";
  }
}

function isCloudNewerThanMutation(cloudUpdatedAt: string | undefined, mutationUpdatedAt: string): boolean {
  if (!cloudUpdatedAt) return false;
  const cloudTime = Date.parse(cloudUpdatedAt);
  const localTime = Date.parse(mutationUpdatedAt);
  return Number.isFinite(cloudTime) && Number.isFinite(localTime) && cloudTime > localTime;
}

function buildPendingMutationConflicts(
  cloudIndex: ReadonlyMap<string, ComparableEntity>,
  pendingMutations: DataMutationItem[],
): PulledWorkspaceConflict[] {
  return pendingMutations
    .filter((item) => UNRESOLVED_MUTATION_STATUSES.has(item.status))
    .flatMap((item) => {
      const kind = getPendingMutationKind(item);
      const clientId = getPendingMutationClientId(item);
      if (!clientId) return [];

      const cloudEntity = cloudIndex.get(`${kind}:${clientId}`);
      if (!cloudEntity || !isCloudNewerThanMutation(cloudEntity.syncUpdatedAt, item.updatedAt)) return [];

      return [
        {
          kind,
          source: "local" as const,
          clientId,
          cloudId: cloudEntity.cloudId,
          path: cloudEntity.path,
          message: "Cloud record changed after an unresolved local mutation for the same entity.",
          mutationId: item.id,
          reason: "pending_local_mutation_cloud_newer" as const,
          localUpdatedAt: item.updatedAt,
          cloudSyncUpdatedAt: cloudEntity.syncUpdatedAt,
        },
      ];
    });
}

function getFieldDifferenceReason(kind: PulledWorkspaceMergeEntityKind): PulledWorkspaceConflict["reason"] | null {
  if (kind === "task") return "task_completion_differs";
  if (kind === "dailyCheckIn") return "daily_check_in_differs";
  if (kind === "weeklyReview") return "weekly_review_differs";
  return null;
}

function buildMatchedCloudChanges(
  localIndex: ReadonlyMap<string, ComparableEntity>,
  cloudIndex: ReadonlyMap<string, ComparableEntity>,
): PulledWorkspaceMergeIssue[] {
  const changes: PulledWorkspaceMergeIssue[] = [];

  cloudIndex.forEach((cloudEntity, key) => {
    const localEntity = localIndex.get(key);
    if (!localEntity) return;
    if (!hasValueDifference(localEntity.value, cloudEntity.value)) return;

    changes.push({
      kind: cloudEntity.kind,
      source: "cloud",
      clientId: cloudEntity.clientId,
      localId: localEntity.localId,
      cloudId: cloudEntity.cloudId,
      path: cloudEntity.path,
      message: "Pulled cloud value differs from the current local value.",
      cloudSyncUpdatedAt: cloudEntity.syncUpdatedAt,
    });
  });

  return changes;
}

function buildValueDiffConflicts(
  localIndex: ReadonlyMap<string, ComparableEntity>,
  cloudIndex: ReadonlyMap<string, ComparableEntity>,
  pendingConflictKeys: ReadonlySet<string>,
): PulledWorkspaceConflict[] {
  const conflicts: PulledWorkspaceConflict[] = [];

  cloudIndex.forEach((cloudEntity, key) => {
    if (pendingConflictKeys.has(key)) return;
    const localEntity = localIndex.get(key);
    if (!localEntity || !hasValueDifference(localEntity.value, cloudEntity.value)) return;

    const reason = getFieldDifferenceReason(cloudEntity.kind);
    if (!reason) return;
    conflicts.push({
      kind: cloudEntity.kind,
      source: "cloud",
      clientId: cloudEntity.clientId,
      localId: localEntity.localId,
      cloudId: cloudEntity.cloudId,
      path: cloudEntity.path,
      message: "Local and cloud values differ for a field-complete sync entity.",
      reason,
      cloudSyncUpdatedAt: cloudEntity.syncUpdatedAt,
    });
  });

  return conflicts;
}

function buildLocalOnlyChanges(
  localIndex: ReadonlyMap<string, ComparableEntity>,
  cloudIndex: ReadonlyMap<string, ComparableEntity>,
): PulledWorkspaceMergeIssue[] {
  return [...localIndex.values()]
    .filter((entity) => !cloudIndex.has(`${entity.kind}:${entity.clientId}`))
    .map((entity) => ({
      kind: entity.kind,
      source: "local" as const,
      clientId: entity.clientId,
      localId: entity.localId,
      path: entity.path,
      message: "Local entity is not present in the pulled cloud workspace.",
    }));
}

function buildCloudOnlyChanges(
  localIndex: ReadonlyMap<string, ComparableEntity>,
  cloudIndex: ReadonlyMap<string, ComparableEntity>,
): PulledWorkspaceMergeIssue[] {
  return [...cloudIndex.values()]
    .filter((entity) => !localIndex.has(`${entity.kind}:${entity.clientId}`))
    .map((entity) => ({
      kind: entity.kind,
      source: "cloud" as const,
      clientId: entity.clientId,
      cloudId: entity.cloudId,
      path: entity.path,
      message: "Cloud entity is not present in the current local workspace.",
      cloudSyncUpdatedAt: entity.syncUpdatedAt,
    }));
}

function addUnsupportedField(
  fields: PulledWorkspaceUnsupportedField[],
  goalId: string,
  clientPlanId: string,
  field: string,
  reason: string,
): void {
  fields.push({ goalId, clientPlanId, field, reason });
}

function collectUnsupportedFields(goals: Goal[], cloudIndex: ReadonlyMap<string, ComparableEntity>): PulledWorkspaceUnsupportedField[] {
  const fields: PulledWorkspaceUnsupportedField[] = [];

  goals.forEach((goal) => {
    const system = goal.twelveWeekSystem;
    if (!system) return;

    const clientPlanId = getTwelveWeekClientPlanId(goal.id);
    if (!cloudIndex.has(`plan:${clientPlanId}`)) return;

    const check = (field: keyof TwelveWeekSystem, reason: string) => {
      if (isMeaningful(system[field])) addUnsupportedField(fields, goal.id, clientPlanId, field, reason);
    };

    check("templateId", "Pull v1 does not return template identity.");
    check("templateName", "Pull v1 does not return template identity.");
    check("lagMetric", "Pull v1 does not return plan-level lag metric metadata.");
    check("leadIndicators", "Pull v1 returns week metrics, not the original lead indicator setup.");
    check("milestones", "Pull v1 returns weekly outputs, not the original milestone object.");
    check("successEvidence", "Pull v1 does not return setup success evidence.");
    check("reviewDay", "Pull v1 does not return review day preference.");
    check("week12Outcome", "Pull v1 does not return original week 12 outcome metadata.");
    check("weeklyActions", "Pull v1 does not return legacy weekly action setup copy.");
    check("successMetric", "Pull v1 does not return setup success metric copy.");
    check("dailyReminderTime", "Pull v1 does not return local reminder preference.");
    check("tacticLoadPreference", "Pull v1 does not return tactic load preference.");
    check("preferredDays", "Pull v1 does not return preferred execution days.");
    check("personalConstraint", "Pull v1 does not return personal constraint setup choice.");
    check("reentryCount", "Pull v1 does not return local reentry metadata.");
    check("scoreboard", "Pull v1 returns source records; local scoreboard remains derived/local.");
  });

  return fields;
}

export function createPulledWorkspaceMergeReport(
  localGoalOrUserData: LocalGoalOrUserData,
  pulledWorkspace: TwelveWeekPulledWorkspace | TwelveWeekPullResponse,
  options: CreatePulledWorkspaceMergeReportOptions = {},
): PulledWorkspaceMergeReport {
  const localGoals = getLocalGoals(localGoalOrUserData);
  const workspace = getWorkspace(pulledWorkspace);
  const missingClientIds: PulledWorkspaceMergeIssue[] = [];
  const localIndex = createLocalIndex(localGoals);
  const cloudIndex = createCloudIndex(workspace, missingClientIds);
  const pendingConflicts = buildPendingMutationConflicts(cloudIndex, options.pendingMutations ?? []);
  const pendingConflictKeys = new Set(pendingConflicts.map((conflict) => `${conflict.kind}:${conflict.clientId}`));
  const valueConflicts = buildValueDiffConflicts(localIndex, cloudIndex, pendingConflictKeys);
  const conflicts = [...pendingConflicts, ...valueConflicts];
  const cloudOnlyChanges = [
    ...buildCloudOnlyChanges(localIndex, cloudIndex),
    ...buildMatchedCloudChanges(localIndex, cloudIndex),
  ];
  const localOnlyChanges = buildLocalOnlyChanges(localIndex, cloudIndex);
  const unsupportedFields = collectUnsupportedFields(localGoals, cloudIndex);

  return {
    safeToApply:
      conflicts.length === 0 &&
      localOnlyChanges.length === 0 &&
      missingClientIds.length === 0 &&
      unsupportedFields.length === 0,
    localOnlyChanges,
    cloudOnlyChanges,
    conflicts,
    missingClientIds,
    unsupportedFields,
    summary: {
      localEntityCount: localIndex.size,
      cloudEntityCount: cloudIndex.size,
      localOnlyCount: localOnlyChanges.length,
      cloudOnlyCount: cloudOnlyChanges.length,
      conflictCount: conflicts.length,
      missingClientIdCount: missingClientIds.length,
      unsupportedFieldCount: unsupportedFields.length,
    },
  };
}
