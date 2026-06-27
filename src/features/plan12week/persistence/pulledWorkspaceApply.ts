import { formatDateInputValue } from "@/app/utils/storage-date-utils";
import {
  buildDerivedScoreboard,
  getDefaultScoreboard,
  getTwelveWeekCurrentWeek,
  normalizeGoal,
} from "@/app/utils/storage-twelve-week";
import type {
  Goal,
  LeadIndicator,
  TwelveWeekSystem,
  TwelveWeekTaskInstance,
  UniversalDailyCheckIn,
  UniversalWeeklyReview,
  UserData,
  WeeklyPlanEntry,
} from "@/app/utils/storage-types";
import type {
  TwelveWeekPulledDailyCheckIn,
  TwelveWeekPulledGoal,
  TwelveWeekPulledLeadMetric,
  TwelveWeekPulledPlan,
  TwelveWeekPulledTask,
  TwelveWeekPulledWeek,
  TwelveWeekPulledWeeklyReview,
  TwelveWeekPulledWorkspace,
  TwelveWeekPullResponse,
  TwelveWeekPullTombstone,
} from "@/services/syncService";
import { getTwelveWeekClientPlanId, getTwelveWeekClientWeekId } from "./twelveWeekImportPayload";

type PulledWorkspaceInput = TwelveWeekPulledWorkspace | TwelveWeekPullResponse;

function isPullResponse(value: PulledWorkspaceInput): value is TwelveWeekPullResponse {
  return Boolean((value as TwelveWeekPullResponse).workspace);
}

function getWorkspace(input: PulledWorkspaceInput): TwelveWeekPulledWorkspace {
  return isPullResponse(input) ? input.workspace : input;
}

function isDeltaPullResponse(input: PulledWorkspaceInput): input is TwelveWeekPullResponse {
  return isPullResponse(input) && input.mode === "delta";
}

function normalizeDateKey(value: string | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})(?:$|T)/);
  if (match?.[1]) return match[1];

  const parsed = new Date(trimmed);
  return Number.isFinite(parsed.valueOf()) ? formatDateInputValue(parsed) : trimmed;
}

function clampWeekNumber(value: number | undefined, totalWeeks: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(Math.max(Math.round(value ?? 1), 1), Math.max(totalWeeks, 1));
}

function getLegacyPhaseName(weekNumber: number): string {
  if (weekNumber <= 4) return "Khởi động";
  if (weekNumber <= 8) return "Bứt phá";
  return "Hoàn tất / Thực hiện";
}

function slugify(value: string, fallback: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug || fallback;
}

function normalizeWeekStartsOn(value: string | undefined): TwelveWeekSystem["weekStartsOn"] | undefined {
  if (value === "Monday" || value === "Sunday") return value;
  return undefined;
}

function normalizeLagMetric(value: unknown): TwelveWeekSystem["lagMetric"] | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const metric = value as Record<string, unknown>;
  if (typeof metric.name !== "string" || typeof metric.unit !== "string" || typeof metric.target !== "string") {
    return undefined;
  }

  return {
    name: metric.name.trim(),
    unit: metric.unit.trim(),
    target: metric.target.trim(),
    currentValue: typeof metric.currentValue === "string" ? metric.currentValue.trim() : "",
  };
}

function normalizeMilestones(value: unknown): TwelveWeekSystem["milestones"] | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const milestones = value as Record<string, unknown>;
  if (
    typeof milestones.week4 !== "string" ||
    typeof milestones.week8 !== "string" ||
    typeof milestones.week12 !== "string"
  ) {
    return undefined;
  }

  return {
    week4: milestones.week4.trim(),
    week8: milestones.week8.trim(),
    week12: milestones.week12.trim(),
  };
}

function normalizePreferredDays(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const days = value.filter((item): item is number => Number.isInteger(item));
  return days.length > 0 ? days : undefined;
}

function normalizeSystemStatus(value: string | undefined): TwelveWeekSystem["status"] | undefined {
  if (value === "active" || value === "paused" || value === "completed") return value;
  return undefined;
}

function getTotalWeeks(weeks: TwelveWeekPulledWeek[], tasks: TwelveWeekPulledTask[]): number {
  const maxWeek = Math.max(
    1,
    ...weeks.map((week) => week.weekNumber ?? 0),
    ...tasks.map((task) => task.weekNumber ?? 0),
  );
  return Math.min(Math.max(maxWeek, 12), 12);
}

function buildWeeklyPlans(weeks: TwelveWeekPulledWeek[], totalWeeks: number): WeeklyPlanEntry[] {
  const byWeekNumber = new Map(
    weeks
      .filter((week) => Number.isFinite(week.weekNumber))
      .map((week) => [clampWeekNumber(week.weekNumber, totalWeeks), week]),
  );

  return Array.from({ length: totalWeeks }, (_, index) => {
    const weekNumber = index + 1;
    const pulledWeek = byWeekNumber.get(weekNumber);

    return {
      weekNumber,
      phaseName: getLegacyPhaseName(weekNumber),
      focus: pulledWeek?.focus?.trim() || "Giữ nhịp hành động cốt lõi trong tuần này.",
      milestone: pulledWeek?.expectedOutput?.trim() || "",
      completed: Boolean(pulledWeek?.review),
    };
  });
}

function getIndicatorIdFromTask(task: TwelveWeekPulledTask, index: number): string {
  return (
    task.tacticId?.trim() ||
    `tactic_cloud_${slugify(task.leadIndicatorName || task.title || "", String(index + 1))}_${index + 1}`
  );
}

function buildLeadIndicators(input: {
  leadMetrics: TwelveWeekPulledLeadMetric[];
  tasks: TwelveWeekPulledTask[];
}): LeadIndicator[] {
  const indicatorsById = new Map<string, LeadIndicator>();

  for (const metric of input.leadMetrics) {
    const name = metric.name?.trim() || "Việc lặp lại trên máy chủ";
    const id = metric.leadIndicatorId?.trim() || `tactic_cloud_${slugify(name, String(indicatorsById.size + 1))}`;
    if (indicatorsById.has(id)) continue;

    indicatorsById.set(id, {
      id,
      name,
      target: String(metric.weeklyTarget ?? 1),
      unit: metric.unit?.trim() || "times/week",
      type: metric.type === "optional" ? "optional" : "core",
      priority: metric.priority,
      schedule: metric.schedule ? [...metric.schedule] : undefined,
    });
  }

  if (indicatorsById.size > 0) return [...indicatorsById.values()];

  const groupedTasks = new Map<
    string,
    { name: string; id: string; isCore: boolean; countByWeek: Map<number, number> }
  >();
  input.tasks.forEach((task, index) => {
    const name = task.leadIndicatorName?.trim() || task.title?.trim() || "Việc lặp lại trên máy chủ";
    const id = getIndicatorIdFromTask(task, index);
    const existing = groupedTasks.get(id) ?? {
      id,
      name,
      isCore: task.isCore !== false,
      countByWeek: new Map<number, number>(),
    };
    const weekNumber = task.weekNumber ?? 1;
    existing.countByWeek.set(weekNumber, (existing.countByWeek.get(weekNumber) ?? 0) + 1);
    groupedTasks.set(id, existing);
  });

  return [...groupedTasks.values()].map((group, index) => ({
    id: group.id,
    name: group.name,
    target: String(Math.max(1, ...group.countByWeek.values())),
    unit: "times/week",
    type: group.isCore ? "core" : "optional",
    priority: index + 1,
  }));
}

function buildTaskInstances(tasks: TwelveWeekPulledTask[], totalWeeks: number): TwelveWeekTaskInstance[] {
  return tasks
    .filter((task) => task.clientTaskId?.trim())
    .map((task, index) => ({
      id: task.clientTaskId?.trim() || `cloud_task_${index + 1}`,
      weekNumber: clampWeekNumber(task.weekNumber, totalWeeks),
      scheduledDate: normalizeDateKey(task.scheduledDate),
      title: task.title?.trim() || "Việc trên máy chủ",
      leadIndicatorName: task.leadIndicatorName?.trim() || "",
      isCore: task.isCore !== false,
      completed: task.status === "done",
      completedAt: task.status === "done" ? task.completedAt : undefined,
      tacticId: task.tacticId,
      rescheduledFrom: task.rescheduledFrom,
    }))
    .sort((left, right) => {
      const weekSort = left.weekNumber - right.weekNumber;
      if (weekSort !== 0) return weekSort;
      const dateSort = left.scheduledDate.localeCompare(right.scheduledDate);
      if (dateSort !== 0) return dateSort;
      return left.title.localeCompare(right.title);
    });
}

function mergeTaskInstances(
  normalizedTasks: TwelveWeekTaskInstance[],
  pulledTasks: TwelveWeekTaskInstance[],
): TwelveWeekTaskInstance[] {
  const mergedById = new Map(normalizedTasks.map((task) => [task.id, task]));

  pulledTasks.forEach((pulledTask) => {
    const existingTask = mergedById.get(pulledTask.id);
    mergedById.set(pulledTask.id, {
      ...existingTask,
      ...pulledTask,
    });
  });

  return [...mergedById.values()].sort((left, right) => {
    const weekSort = left.weekNumber - right.weekNumber;
    if (weekSort !== 0) return weekSort;
    const dateSort = left.scheduledDate.localeCompare(right.scheduledDate);
    if (dateSort !== 0) return dateSort;
    return left.title.localeCompare(right.title);
  });
}

function withDerivedExecutionState(system: TwelveWeekSystem): TwelveWeekSystem {
  return {
    ...system,
    currentWeek: getTwelveWeekCurrentWeek(system),
    scoreboard: buildDerivedScoreboard(system, getDefaultScoreboard(system.totalWeeks)),
  };
}

function getLeadIndicatorIdFromMetricClientId(clientMetricId: string): string | null {
  const marker = ":metric:";
  const markerIndex = clientMetricId.lastIndexOf(marker);
  if (markerIndex < 0) return null;
  const leadIndicatorId = clientMetricId.slice(markerIndex + marker.length).trim();
  return leadIndicatorId || null;
}

function restoreSkippedLocalEntities(input: {
  goalId: string;
  existingSystem: TwelveWeekSystem | undefined;
  nextSystem: TwelveWeekSystem;
  skipEntities: ReadonlySet<string>;
}): TwelveWeekSystem {
  const { goalId, existingSystem, skipEntities } = input;
  if (!existingSystem || skipEntities.size === 0) return input.nextSystem;

  let restoredSystem = input.nextSystem;
  const clientPlanId = getTwelveWeekClientPlanId(goalId);

  existingSystem.weeklyPlans.forEach((week) => {
    const clientWeekId = getTwelveWeekClientWeekId(goalId, week.weekNumber);
    if (!skipEntities.has(`week:${clientWeekId}`)) return;

    restoredSystem = {
      ...restoredSystem,
      weeklyPlans: [...restoredSystem.weeklyPlans.filter((item) => item.weekNumber !== week.weekNumber), week].sort(
        (left, right) => left.weekNumber - right.weekNumber,
      ),
    };
  });

  existingSystem.taskInstances.forEach((task) => {
    if (!skipEntities.has(`task:${task.id}`)) return;

    restoredSystem = {
      ...restoredSystem,
      taskInstances: mergeTaskInstances(restoredSystem.taskInstances, [task]),
    };
  });

  existingSystem.dailyCheckIns.forEach((checkIn) => {
    const date = normalizeDateKey(checkIn.date);
    const clientCheckInId = `${clientPlanId}:checkin:${date}`;
    if (!skipEntities.has(`dailyCheckIn:${clientCheckInId}`)) return;

    restoredSystem = {
      ...restoredSystem,
      dailyCheckIns: [
        ...restoredSystem.dailyCheckIns.filter((item) => normalizeDateKey(item.date) !== date),
        checkIn,
      ].sort((left, right) => left.date.localeCompare(right.date)),
    };
  });

  existingSystem.weeklyReviews.forEach((review) => {
    const clientReviewId = `${clientPlanId}:review:${review.weekNumber}`;
    if (!skipEntities.has(`weeklyReview:${clientReviewId}`)) return;

    restoredSystem = {
      ...restoredSystem,
      weeklyReviews: [
        ...restoredSystem.weeklyReviews.filter((item) => item.weekNumber !== review.weekNumber),
        review,
      ].sort((left, right) => left.weekNumber - right.weekNumber),
    };
  });

  existingSystem.leadIndicators.forEach((indicator) => {
    const shouldRestore = [...skipEntities].some((key) => {
      if (!key.startsWith("leadMetric:")) return false;
      return getLeadIndicatorIdFromMetricClientId(key.slice("leadMetric:".length)) === indicator.id;
    });
    if (!shouldRestore) return;

    restoredSystem = {
      ...restoredSystem,
      leadIndicators: [...restoredSystem.leadIndicators.filter((item) => item.id !== indicator.id), indicator].sort(
        (left, right) => (left.priority ?? 999) - (right.priority ?? 999),
      ),
    };
  });

  return withDerivedExecutionState(restoredSystem);
}

function applySystemDelta(
  goals: Goal[],
  clientPlanId: string | undefined,
  updater: (system: TwelveWeekSystem) => TwelveWeekSystem,
): Goal[] {
  if (!clientPlanId?.trim()) return goals;

  return goals.map((goal) => {
    if (!goal.twelveWeekSystem || getTwelveWeekClientPlanId(goal.id) !== clientPlanId) return goal;
    return {
      ...goal,
      twelveWeekSystem: updater(goal.twelveWeekSystem),
    };
  });
}

function updateGoalFromPulledGoal(goals: Goal[], pulledGoal: TwelveWeekPulledGoal): Goal[] {
  const clientGoalId = pulledGoal.clientGoalId?.trim();
  if (!clientGoalId) return goals;

  return goals.map((goal) => {
    if (goal.id !== clientGoalId) return goal;

    return {
      ...goal,
      category: pulledGoal.category?.trim() || goal.category,
      title: pulledGoal.title?.trim() || goal.title,
      description: pulledGoal.description?.trim() ?? goal.description,
      deadline: normalizeDateKey(pulledGoal.deadline) || goal.deadline,
      focusArea: pulledGoal.focusArea ?? goal.focusArea,
      readinessScore: pulledGoal.readinessScore ?? goal.readinessScore,
      tasks: pulledGoal.tasks ? buildGoalTaskSummary(pulledGoal.tasks) : goal.tasks,
    };
  });
}

function updateSystemFromPulledPlan(system: TwelveWeekSystem, pulledPlan: TwelveWeekPulledPlan): TwelveWeekSystem {
  const nextSystem: TwelveWeekSystem = {
    ...system,
    goalType: pulledPlan.goalType?.trim() || system.goalType,
    vision12Week: pulledPlan.vision?.trim() || system.vision12Week,
    templateId: pulledPlan.templateId?.trim() || system.templateId,
    templateName: pulledPlan.templateName?.trim() || system.templateName,
    lagMetric: normalizeLagMetric(pulledPlan.lagMetric) ?? system.lagMetric,
    milestones: normalizeMilestones(pulledPlan.milestones) ?? system.milestones,
    successEvidence: pulledPlan.successEvidence?.trim() ?? system.successEvidence,
    reviewDay: pulledPlan.reviewDay?.trim() ?? system.reviewDay,
    week12Outcome: pulledPlan.week12Outcome?.trim() || system.week12Outcome,
    weeklyActions: pulledPlan.weeklyActions ?? system.weeklyActions,
    successMetric: pulledPlan.successMetric?.trim() ?? system.successMetric,
    startDate: normalizeDateKey(pulledPlan.startDate) || system.startDate,
    endDate: normalizeDateKey(pulledPlan.endDate) || system.endDate,
    timezone: pulledPlan.timezone?.trim() || system.timezone,
    weekStartsOn: normalizeWeekStartsOn(pulledPlan.weekStartsOn) ?? system.weekStartsOn,
    status: normalizeSystemStatus(pulledPlan.status) ?? system.status,
    dailyReminderTime: pulledPlan.dailyReminderTime?.trim() ?? system.dailyReminderTime,
    tacticLoadPreference: pulledPlan.tacticLoadPreference ?? system.tacticLoadPreference,
    preferredDays: normalizePreferredDays(pulledPlan.preferredDays) ?? system.preferredDays,
    personalConstraint: pulledPlan.personalConstraint ?? system.personalConstraint,
    reentryCount: pulledPlan.reentryCount ?? system.reentryCount,
    totalWeeks: Number.isFinite(pulledPlan.totalWeeks)
      ? Math.min(Math.max(Number(pulledPlan.totalWeeks), 1), 12)
      : system.totalWeeks,
  };

  return withDerivedExecutionState(nextSystem);
}

function updateSystemFromPulledWeek(system: TwelveWeekSystem, pulledWeek: TwelveWeekPulledWeek): TwelveWeekSystem {
  if (!Number.isFinite(pulledWeek.weekNumber)) return system;
  const weekNumber = clampWeekNumber(pulledWeek.weekNumber, system.totalWeeks);
  const existingWeek = system.weeklyPlans.find((week) => week.weekNumber === weekNumber);
  const nextWeek: WeeklyPlanEntry = {
    weekNumber,
    phaseName: existingWeek?.phaseName ?? getLegacyPhaseName(weekNumber),
    focus:
      pulledWeek.focus?.trim() || existingWeek?.focus || "Giá»¯ nhá»‹p hÃ nh Ä‘á»™ng cá»‘t lÃµi trong tuáº§n nÃ y.",
    milestone: pulledWeek.expectedOutput?.trim() || existingWeek?.milestone || "",
    completed: Boolean(pulledWeek.review ?? existingWeek?.completed),
  };

  return withDerivedExecutionState({
    ...system,
    weeklyPlans: [...system.weeklyPlans.filter((week) => week.weekNumber !== weekNumber), nextWeek].sort(
      (left, right) => left.weekNumber - right.weekNumber,
    ),
  });
}

function updateSystemFromPulledLeadMetric(
  system: TwelveWeekSystem,
  pulledMetric: TwelveWeekPulledLeadMetric,
): TwelveWeekSystem {
  const pulledIndicator = buildLeadIndicators({ leadMetrics: [pulledMetric], tasks: [] })[0];
  if (!pulledIndicator) return system;

  return withDerivedExecutionState({
    ...system,
    leadIndicators: [
      ...system.leadIndicators.filter((indicator) => indicator.id !== pulledIndicator.id),
      pulledIndicator,
    ].sort((left, right) => (left.priority ?? 999) - (right.priority ?? 999)),
  });
}

function getTombstoneClientId(tombstone: TwelveWeekPullTombstone): string | undefined {
  return tombstone.clientId?.trim();
}

function getDateFromCheckInClientId(clientId: string): string | null {
  const match = clientId.match(/:checkin:(\d{4}-\d{2}-\d{2})$/);
  return match?.[1] ?? null;
}

function getWeekNumberFromWeekClientId(clientId: string): number | null {
  const match = clientId.match(/:week:(\d+)$/);
  if (!match?.[1]) return null;
  const value = Number(match[1]);
  return Number.isInteger(value) ? value : null;
}

function getPlanIdFromWeekClientId(clientId: string): string | null {
  const markerIndex = clientId.lastIndexOf(":week:");
  if (markerIndex <= 0) return null;
  const goalId = clientId.slice(0, markerIndex);
  return goalId.endsWith(":12-week-system") ? goalId : getTwelveWeekClientPlanId(goalId);
}

function getPlanIdFromCheckInClientId(clientId: string): string | null {
  const markerIndex = clientId.lastIndexOf(":checkin:");
  return markerIndex > 0 ? clientId.slice(0, markerIndex) : null;
}

function getWeekNumberFromReviewClientId(clientId: string): number | null {
  const match = clientId.match(/:review:(\d+)$/);
  if (!match?.[1]) return null;
  const value = Number(match[1]);
  return Number.isInteger(value) ? value : null;
}

function getPlanIdFromReviewClientId(clientId: string): string | null {
  const markerIndex = clientId.lastIndexOf(":review:");
  return markerIndex > 0 ? clientId.slice(0, markerIndex) : null;
}

function applyPulledDeltaToUserData(
  userData: UserData,
  pullResponse: TwelveWeekPullResponse,
  skipEntities?: ReadonlySet<string>,
): UserData {
  let nextGoals = userData.goals;
  const skipSet = skipEntities ?? new Set<string>();

  pullResponse.workspace.goals.forEach((goal) => {
    const clientGoalId = goal.clientGoalId?.trim();
    if (!clientGoalId || skipSet.has(`goal:${clientGoalId}`)) return;
    nextGoals = updateGoalFromPulledGoal(nextGoals, goal);
  });

  pullResponse.workspace.plans.forEach((plan) => {
    const clientPlanId = plan.clientPlanId?.trim();
    if (!clientPlanId || skipSet.has(`plan:${clientPlanId}`)) return;
    nextGoals = applySystemDelta(nextGoals, clientPlanId, (system) => updateSystemFromPulledPlan(system, plan));
  });

  pullResponse.workspace.weeks.forEach((week) => {
    const clientWeekId = week.clientWeekId?.trim();
    const clientPlanId = week.clientPlanId?.trim() || (clientWeekId ? getPlanIdFromWeekClientId(clientWeekId) : null);
    if (!clientPlanId) return;
    if (clientWeekId && skipSet.has(`week:${clientWeekId}`)) return;
    nextGoals = applySystemDelta(nextGoals, clientPlanId, (system) => updateSystemFromPulledWeek(system, week));
  });

  pullResponse.workspace.leadMetrics.forEach((metric) => {
    const clientMetricId = metric.clientMetricId?.trim();
    if (!metric.clientPlanId || !clientMetricId) return;
    if (skipSet.has(`leadMetric:${clientMetricId}`)) return;
    nextGoals = applySystemDelta(nextGoals, metric.clientPlanId, (system) =>
      updateSystemFromPulledLeadMetric(system, metric),
    );
  });

  pullResponse.workspace.tasks.forEach((task) => {
    if (!task.clientPlanId || !task.clientTaskId) return;
    // Skip this task if its clientTaskId is in skipEntities
    if (skipSet.has(`task:${task.clientTaskId}`)) return;
    nextGoals = applySystemDelta(nextGoals, task.clientPlanId, (system) => {
      const pulledTask = buildTaskInstances([task], system.totalWeeks)[0];
      if (!pulledTask) return system;
      return withDerivedExecutionState({
        ...system,
        taskInstances: mergeTaskInstances(system.taskInstances, [pulledTask]),
      });
    });
  });

  pullResponse.workspace.dailyCheckIns.forEach((checkIn) => {
    if (!checkIn.clientPlanId) return;
    // Skip this check-in if its clientCheckInId is in skipEntities
    if (checkIn.clientCheckInId && skipSet.has(`dailyCheckIn:${checkIn.clientCheckInId}`)) return;
    nextGoals = applySystemDelta(nextGoals, checkIn.clientPlanId, (system) => {
      const pulledCheckIn = buildDailyCheckIns([checkIn])[0];
      if (!pulledCheckIn) return system;
      return withDerivedExecutionState({
        ...system,
        dailyCheckIns: [
          ...system.dailyCheckIns.filter((item) => normalizeDateKey(item.date) !== pulledCheckIn.date),
          pulledCheckIn,
        ].sort((left, right) => left.date.localeCompare(right.date)),
      });
    });
  });

  pullResponse.workspace.weeklyReviews.forEach((review) => {
    if (!review.clientPlanId) return;
    // Skip this review if its clientReviewId is in skipEntities
    if (review.clientReviewId && skipSet.has(`weeklyReview:${review.clientReviewId}`)) return;
    nextGoals = applySystemDelta(nextGoals, review.clientPlanId, (system) => {
      const pulledReview = buildWeeklyReviews([review], system.totalWeeks)[0];
      if (!pulledReview) return system;
      return withDerivedExecutionState({
        ...system,
        weeklyReviews: [
          ...system.weeklyReviews.filter((item) => item.weekNumber !== pulledReview.weekNumber),
          pulledReview,
        ].sort((left, right) => left.weekNumber - right.weekNumber),
      });
    });
  });

  pullResponse.tombstones.goals.forEach((tombstone) => {
    const clientGoalId = getTombstoneClientId(tombstone);
    if (!clientGoalId) return;
    nextGoals = nextGoals.filter((goal) => goal.id !== clientGoalId);
  });

  pullResponse.tombstones.plans.forEach((tombstone) => {
    const clientPlanId = getTombstoneClientId(tombstone);
    if (!clientPlanId) return;
    nextGoals = nextGoals.filter((goal) => {
      if (!goal.twelveWeekSystem) return true;
      return getTwelveWeekClientPlanId(goal.id) !== clientPlanId;
    });
  });

  pullResponse.tombstones.tasks.forEach((tombstone) => {
    const clientTaskId = getTombstoneClientId(tombstone);
    if (!clientTaskId) return;
    nextGoals = nextGoals.map((goal) => {
      if (!goal.twelveWeekSystem) return goal;
      return {
        ...goal,
        twelveWeekSystem: withDerivedExecutionState({
          ...goal.twelveWeekSystem,
          taskInstances: goal.twelveWeekSystem.taskInstances.filter((task) => task.id !== clientTaskId),
        }),
      };
    });
  });

  pullResponse.tombstones.weeks.forEach((tombstone) => {
    const clientWeekId = getTombstoneClientId(tombstone);
    if (!clientWeekId) return;
    const weekNumber = getWeekNumberFromWeekClientId(clientWeekId);
    const clientPlanId = getPlanIdFromWeekClientId(clientWeekId);
    if (!weekNumber || !clientPlanId) return;
    nextGoals = applySystemDelta(nextGoals, clientPlanId, (system) => {
      return withDerivedExecutionState({
        ...system,
        weeklyPlans: system.weeklyPlans.filter((week) => week.weekNumber !== weekNumber),
        taskInstances: system.taskInstances.filter((task) => task.weekNumber !== weekNumber),
        weeklyReviews: system.weeklyReviews.filter((review) => review.weekNumber !== weekNumber),
      });
    });
  });

  pullResponse.tombstones.dailyCheckIns.forEach((tombstone) => {
    const clientCheckInId = getTombstoneClientId(tombstone);
    if (!clientCheckInId) return;
    const date = getDateFromCheckInClientId(clientCheckInId);
    const clientPlanId = getPlanIdFromCheckInClientId(clientCheckInId);
    if (!date || !clientPlanId) return;
    nextGoals = applySystemDelta(nextGoals, clientPlanId, (system) => {
      return withDerivedExecutionState({
        ...system,
        dailyCheckIns: system.dailyCheckIns.filter((checkIn) => normalizeDateKey(checkIn.date) !== date),
      });
    });
  });

  pullResponse.tombstones.weeklyReviews.forEach((tombstone) => {
    const clientReviewId = getTombstoneClientId(tombstone);
    if (!clientReviewId) return;
    const weekNumber = getWeekNumberFromReviewClientId(clientReviewId);
    const clientPlanId = getPlanIdFromReviewClientId(clientReviewId);
    if (!weekNumber || !clientPlanId) return;
    nextGoals = applySystemDelta(nextGoals, clientPlanId, (system) => {
      return withDerivedExecutionState({
        ...system,
        weeklyReviews: system.weeklyReviews.filter((review) => review.weekNumber !== weekNumber),
      });
    });
  });

  return {
    ...userData,
    goals: nextGoals,
  };
}

function buildDailyCheckIns(checkIns: TwelveWeekPulledDailyCheckIn[]): UniversalDailyCheckIn[] {
  const getMood = (value: string | undefined): UniversalDailyCheckIn["mood"] =>
    value === "low" || value === "steady" || value === "high" ? value : undefined;

  return checkIns
    .filter((checkIn) => checkIn.localDate?.trim())
    .map((checkIn) => ({
      date: normalizeDateKey(checkIn.localDate),
      didWorkToday: Boolean(checkIn.didWorkToday),
      whichLeadIndicatorWorkedOn: checkIn.whichLeadIndicatorWorkedOn?.trim() || "",
      amountDone: checkIn.amountDone?.trim() || "",
      outputCreated: checkIn.outputCreated?.trim() || "",
      obstacleOrIssue: checkIn.obstacleOrIssue?.trim() || "",
      dailySelfRating: Number.isFinite(checkIn.dailySelfRating) ? Number(checkIn.dailySelfRating) : 0,
      optionalNote: checkIn.optionalNote?.trim() || "",
      mood: getMood(checkIn.mood),
    }))
    .sort((left, right) => left.date.localeCompare(right.date));
}

function buildWeeklyReviews(reviews: TwelveWeekPulledWeeklyReview[], totalWeeks: number): UniversalWeeklyReview[] {
  const getWorkloadDecision = (value: string | undefined): UniversalWeeklyReview["workloadDecision"] =>
    value === "keep same" || value === "reduce slightly" || value === "increase slightly" ? value : "";

  return reviews
    .filter((review) => Number.isFinite(review.weekNumber))
    .map((review) => ({
      weekNumber: clampWeekNumber(review.weekNumber, totalWeeks),
      leadCompletionPercent: Number.isFinite(review.leadCompletionPercent) ? Number(review.leadCompletionPercent) : 0,
      lagProgressValue: review.lagProgressValue?.trim() || "",
      biggestOutputThisWeek: review.biggestOutputThisWeek?.trim() || review.reflection?.trim() || "",
      mainObstacle: review.mainObstacle?.trim() || "",
      nextWeekPriority: review.nextWeekPriority?.trim() || review.adjustments?.trim() || "",
      workloadDecision: getWorkloadDecision(review.workloadDecision),
      reviewCompleted: Boolean(review.reviewCompleted),
      progressScore: Number.isFinite(review.progressScore) ? Number(review.progressScore) : 0,
      disciplineScore: Number.isFinite(review.disciplineScore) ? Number(review.disciplineScore) : 0,
      focusScore: Number.isFinite(review.focusScore) ? Number(review.focusScore) : 0,
      improvementScore: Number.isFinite(review.improvementScore) ? Number(review.improvementScore) : 0,
      outputQualityScore: Number.isFinite(review.outputQualityScore) ? Number(review.outputQualityScore) : 0,
      completedLeadIndicators: review.completedLeadIndicators,
    }))
    .sort((left, right) => left.weekNumber - right.weekNumber);
}

function buildGoalTaskSummary(tasks: TwelveWeekPulledGoal["tasks"]): Goal["tasks"] {
  return (tasks ?? []).map((task, index) => ({
    id: `cloud_goal_task_${index + 1}`,
    title: task.title,
    completed: Boolean(task.completed),
  }));
}

function buildPulledGoal(input: {
  existingGoal?: Goal;
  pulledGoal?: TwelveWeekPulledGoal;
  pulledPlan: TwelveWeekPulledPlan;
  pulledWeeks: TwelveWeekPulledWeek[];
  pulledTasks: TwelveWeekPulledTask[];
  pulledLeadMetrics: TwelveWeekPulledLeadMetric[];
  pulledDailyCheckIns: TwelveWeekPulledDailyCheckIn[];
  pulledWeeklyReviews: TwelveWeekPulledWeeklyReview[];
  now: string;
  skipEntities?: ReadonlySet<string>;
}): Goal | null {
  const clientGoalId = input.pulledGoal?.clientGoalId ?? input.pulledPlan.clientGoalId ?? input.existingGoal?.id;
  if (!clientGoalId) return null;

  const derivedTotalWeeks = getTotalWeeks(input.pulledWeeks, input.pulledTasks);
  const totalWeeks = Math.min(Math.max(input.pulledPlan.totalWeeks ?? derivedTotalWeeks, derivedTotalWeeks, 1), 12);
  const leadIndicators = buildLeadIndicators({
    leadMetrics: input.pulledLeadMetrics,
    tasks: input.pulledTasks,
  });
  const weeklyPlans = buildWeeklyPlans(input.pulledWeeks, totalWeeks);
  const baseSystem: TwelveWeekSystem = {
    goalType:
      input.pulledPlan.goalType?.trim() ||
      input.pulledGoal?.focusArea ||
      input.pulledGoal?.category ||
      input.existingGoal?.twelveWeekSystem?.goalType ||
      "cloud-plan",
    vision12Week:
      input.pulledPlan.vision?.trim() ||
      input.pulledGoal?.description?.trim() ||
      input.pulledGoal?.title?.trim() ||
      input.existingGoal?.twelveWeekSystem?.vision12Week ||
      "Bản trên máy chủ",
    templateId: input.pulledPlan.templateId?.trim() || input.existingGoal?.twelveWeekSystem?.templateId,
    templateName: input.pulledPlan.templateName?.trim() || input.existingGoal?.twelveWeekSystem?.templateName,
    lagMetric: normalizeLagMetric(input.pulledPlan.lagMetric) ??
      input.existingGoal?.twelveWeekSystem?.lagMetric ?? {
        name: leadIndicators[0]?.name ?? "Tiến độ chính",
        unit: "",
        target: "",
        currentValue: "",
      },
    leadIndicators,
    milestones: normalizeMilestones(input.pulledPlan.milestones) ??
      input.existingGoal?.twelveWeekSystem?.milestones ?? {
        week4: "",
        week8: "",
        week12: weeklyPlans[weeklyPlans.length - 1]?.milestone ?? "",
      },
    successEvidence:
      input.pulledPlan.successEvidence?.trim() ?? input.existingGoal?.twelveWeekSystem?.successEvidence ?? "",
    reviewDay: input.pulledPlan.reviewDay?.trim() ?? input.existingGoal?.twelveWeekSystem?.reviewDay ?? "Sunday",
    week12Outcome:
      input.pulledPlan.week12Outcome?.trim() ||
      input.existingGoal?.twelveWeekSystem?.week12Outcome ||
      weeklyPlans[weeklyPlans.length - 1]?.milestone ||
      input.pulledGoal?.title ||
      "",
    weeklyActions: input.pulledPlan.weeklyActions ?? input.existingGoal?.twelveWeekSystem?.weeklyActions,
    successMetric: input.pulledPlan.successMetric?.trim() ?? input.existingGoal?.twelveWeekSystem?.successMetric,
    startDate: normalizeDateKey(input.pulledPlan.startDate),
    endDate: normalizeDateKey(input.pulledPlan.endDate) || input.existingGoal?.twelveWeekSystem?.endDate || "",
    timezone: input.pulledPlan.timezone?.trim() || input.existingGoal?.twelveWeekSystem?.timezone || "Asia/Ho_Chi_Minh",
    weekStartsOn:
      normalizeWeekStartsOn(input.pulledPlan.weekStartsOn) ??
      input.existingGoal?.twelveWeekSystem?.weekStartsOn ??
      "Monday",
    status:
      normalizeSystemStatus(input.pulledPlan.status) === "completed" || input.pulledGoal?.status === "completed"
        ? "completed"
        : (normalizeSystemStatus(input.pulledPlan.status) ?? input.existingGoal?.twelveWeekSystem?.status ?? "active"),
    dailyReminderTime:
      input.pulledPlan.dailyReminderTime?.trim() ?? input.existingGoal?.twelveWeekSystem?.dailyReminderTime,
    tacticLoadPreference:
      input.pulledPlan.tacticLoadPreference ?? input.existingGoal?.twelveWeekSystem?.tacticLoadPreference,
    preferredDays:
      normalizePreferredDays(input.pulledPlan.preferredDays) ?? input.existingGoal?.twelveWeekSystem?.preferredDays,
    personalConstraint: input.pulledPlan.personalConstraint ?? input.existingGoal?.twelveWeekSystem?.personalConstraint,
    reentryCount: input.pulledPlan.reentryCount ?? input.existingGoal?.twelveWeekSystem?.reentryCount ?? 0,
    currentWeek: input.existingGoal?.twelveWeekSystem?.currentWeek ?? 1,
    totalWeeks,
    weeklyPlans,
    taskInstances: [],
    dailyCheckIns: [],
    weeklyReviews: [],
    scoreboard: getDefaultScoreboard(totalWeeks),
  };

  const baseGoal: Goal = {
    id: clientGoalId,
    category: input.pulledGoal?.category?.trim() || input.existingGoal?.category || "Máy chủ",
    title: input.pulledGoal?.title?.trim() || input.existingGoal?.title || "Mục tiêu 12 tuần trên máy chủ",
    description: input.pulledGoal?.description?.trim() || input.existingGoal?.description || "",
    deadline: normalizeDateKey(input.pulledGoal?.deadline) || input.existingGoal?.deadline || "",
    tasks: buildGoalTaskSummary(input.pulledGoal?.tasks),
    focusArea: input.pulledGoal?.focusArea ?? input.existingGoal?.focusArea,
    readinessScore: input.pulledGoal?.readinessScore ?? input.existingGoal?.readinessScore,
    feasibilityResult: input.existingGoal?.feasibilityResult,
    twelveWeekSystem: baseSystem,
    createdAt: input.existingGoal?.createdAt ?? input.pulledGoal?.createdAt ?? input.pulledPlan.createdAt ?? input.now,
  };

  const normalizedGoal = normalizeGoal(baseGoal);
  const normalizedSystem = {
    ...(normalizedGoal.twelveWeekSystem ?? baseSystem),
    endDate:
      normalizeDateKey(input.pulledPlan.endDate) || normalizedGoal.twelveWeekSystem?.endDate || baseSystem.endDate,
    weeklyActions: input.pulledPlan.weeklyActions ?? normalizedGoal.twelveWeekSystem?.weeklyActions,
    successMetric: input.pulledPlan.successMetric?.trim() ?? normalizedGoal.twelveWeekSystem?.successMetric,
  };
  const pulledTaskInstances = buildTaskInstances(input.pulledTasks, normalizedSystem.totalWeeks);
  const systemWithPulledRecords: TwelveWeekSystem = {
    ...normalizedSystem,
    weeklyPlans,
    taskInstances: mergeTaskInstances(normalizedSystem.taskInstances, pulledTaskInstances),
    dailyCheckIns: buildDailyCheckIns(input.pulledDailyCheckIns),
    weeklyReviews: buildWeeklyReviews(input.pulledWeeklyReviews, normalizedSystem.totalWeeks),
  };
  const systemWithDerivedState: TwelveWeekSystem = {
    ...systemWithPulledRecords,
    currentWeek: getTwelveWeekCurrentWeek(systemWithPulledRecords),
    scoreboard: buildDerivedScoreboard(
      systemWithPulledRecords,
      getDefaultScoreboard(systemWithPulledRecords.totalWeeks),
    ),
  };

  return {
    ...normalizedGoal,
    tasks: normalizedGoal.tasks.length > 0 ? normalizedGoal.tasks : (input.existingGoal?.tasks ?? []),
    twelveWeekSystem: restoreSkippedLocalEntities({
      goalId: clientGoalId,
      existingSystem: input.existingGoal?.twelveWeekSystem,
      nextSystem: systemWithDerivedState,
      skipEntities: input.skipEntities ?? new Set<string>(),
    }),
  };
}

export function applyPulledWorkspaceToUserData(
  userData: UserData,
  pulledWorkspace: PulledWorkspaceInput,
  options: { now?: string | Date; skipEntities?: ReadonlySet<string> } = {},
): UserData {
  if (isDeltaPullResponse(pulledWorkspace)) {
    return applyPulledDeltaToUserData(userData, pulledWorkspace, options.skipEntities);
  }

  const workspace = getWorkspace(pulledWorkspace);
  const now =
    options.now instanceof Date
      ? options.now.toISOString()
      : options.now
        ? new Date(options.now).toISOString()
        : new Date().toISOString();
  const skipEntities = options.skipEntities ?? new Set<string>();
  const goalsById = new Map(userData.goals.map((goal) => [goal.id, goal]));
  const nextGoalsById = new Map(goalsById);
  const pulledGoalByClientId = new Map(
    workspace.goals.filter((goal) => goal.clientGoalId?.trim()).map((goal) => [goal.clientGoalId?.trim() ?? "", goal]),
  );

  workspace.plans.forEach((plan) => {
    const clientPlanId = plan.clientPlanId?.trim();
    const clientGoalId = plan.clientGoalId?.trim();
    if (!clientPlanId || !clientGoalId) return;

    // Skip this plan if its clientPlanId is in skipEntities
    if (skipEntities.has(`plan:${clientPlanId}`)) return;

    const pulledGoal = pulledGoalByClientId.get(clientGoalId);
    const nextGoal = buildPulledGoal({
      existingGoal: goalsById.get(clientGoalId),
      pulledGoal,
      pulledPlan: plan,
      pulledWeeks: workspace.weeks.filter(
        (week) =>
          week.clientPlanId === clientPlanId && (!week.clientWeekId || !skipEntities.has(`week:${week.clientWeekId}`)),
      ),
      pulledTasks: workspace.tasks.filter(
        (task) =>
          task.clientPlanId === clientPlanId && (!task.clientTaskId || !skipEntities.has(`task:${task.clientTaskId}`)),
      ),
      pulledLeadMetrics: workspace.leadMetrics.filter(
        (metric) =>
          metric.clientPlanId === clientPlanId &&
          (!metric.clientMetricId || !skipEntities.has(`leadMetric:${metric.clientMetricId}`)),
      ),
      pulledDailyCheckIns: workspace.dailyCheckIns.filter(
        (checkIn) =>
          checkIn.clientPlanId === clientPlanId &&
          (!checkIn.clientCheckInId || !skipEntities.has(`dailyCheckIn:${checkIn.clientCheckInId}`)),
      ),
      pulledWeeklyReviews: workspace.weeklyReviews.filter(
        (review) =>
          review.clientPlanId === clientPlanId &&
          (!review.clientReviewId || !skipEntities.has(`weeklyReview:${review.clientReviewId}`)),
      ),
      now,
      skipEntities,
    });

    if (nextGoal) nextGoalsById.set(nextGoal.id, nextGoal);
  });

  workspace.goals.forEach((goal) => {
    const clientGoalId = goal.clientGoalId?.trim();
    if (!clientGoalId || nextGoalsById.has(clientGoalId)) return;

    // Skip this goal if its clientGoalId is in skipEntities
    if (skipEntities.has(`goal:${clientGoalId}`)) return;

    const clientPlanId = getTwelveWeekClientPlanId(clientGoalId);
    const fallbackPlan: TwelveWeekPulledPlan = {
      id: goal.planId ?? clientPlanId,
      clientGoalId,
      clientPlanId,
      vision: goal.description || goal.title,
      startDate: "",
    };
    const nextGoal = buildPulledGoal({
      existingGoal: goalsById.get(clientGoalId),
      pulledGoal: goal,
      pulledPlan: fallbackPlan,
      pulledWeeks: [],
      pulledTasks: [],
      pulledLeadMetrics: [],
      pulledDailyCheckIns: [],
      pulledWeeklyReviews: [],
      now,
      skipEntities,
    });
    if (nextGoal) nextGoalsById.set(nextGoal.id, nextGoal);
  });

  if (isPullResponse(pulledWorkspace)) {
    pulledWorkspace.tombstones.goals.forEach((tombstone) => {
      const clientGoalId = getTombstoneClientId(tombstone);
      if (clientGoalId) nextGoalsById.delete(clientGoalId);
    });
    pulledWorkspace.tombstones.plans.forEach((tombstone) => {
      const clientPlanId = getTombstoneClientId(tombstone);
      if (!clientPlanId) return;
      for (const [goalId, goal] of nextGoalsById) {
        if (!goal.twelveWeekSystem) continue;
        if (getTwelveWeekClientPlanId(goalId) === clientPlanId) nextGoalsById.delete(goalId);
      }
    });
  }

  return {
    ...userData,
    goals: [...nextGoalsById.values()],
  };
}
