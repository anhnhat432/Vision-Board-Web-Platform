import { useEffect } from "react";
import { createElement } from "react";
import { render, type RenderResult } from "@testing-library/react";
import { MemoryRouter } from "react-router";

import { FirstLoginRestoreToast } from "@/app/components/root-layout/FirstLoginRestoreToast";
import { AutoCloudConflictDialog } from "@/app/components/root-layout/AutoCloudConflictDialog";
import {
  APP_STORAGE_KEYS,
  USER_DATA_UPDATED_EVENT_NAME,
  activateAuthenticatedUserData,
  getUserData,
  saveUserData,
  type Goal,
  type TwelveWeekSystem,
  type TwelveWeekTaskInstance,
  type UniversalDailyCheckIn,
  type UniversalScoreboardWeek,
  type UniversalWeeklyReview,
  type UserData,
} from "@/app/utils/storage";
import { getDefaultScoreboard } from "@/app/utils/storage-twelve-week";
import { AutoCloudSyncProvider, useAutoCloudSyncContext } from "@/features/plan12week/hooks/AutoCloudSyncProvider";
import type { AutoCloudSyncState } from "@/features/plan12week/hooks/useAutoCloudSync";
import {
  enqueueStoredMutation,
  readMutationQueueStore,
  writeMutationQueueStore,
  type DataMutationItem,
} from "@/features/plan12week/persistence/mutationQueue";
import { buildPlanSnapshotUpdatedPayload } from "@/features/plan12week/persistence/planSnapshotMutation";
import {
  createTwelveWeekImportPayload,
  getTwelveWeekClientPlanId,
  getTwelveWeekClientWeekId,
} from "@/features/plan12week/persistence/twelveWeekImportPayload";
import type {
  TwelveWeekMutationBatchRequest,
  TwelveWeekMutationBatchResponse,
  TwelveWeekPulledWorkspace,
  TwelveWeekPullResponse,
} from "@/services/syncService";

const DEFAULT_NOW = "2026-05-10T10:00:00.000Z";

export interface TwoDevice {
  uid: string;
  storage: Storage;
  getQueue: () => ReturnType<typeof readMutationQueueStore>;
  getUserData: () => UserData;
  mountProvider: (options?: MountProviderOptions) => MountedAutoSync;
}

export interface SetupDeviceOptions {
  setAuthUser?: (uid: string) => void;
}

export interface MountProviderOptions {
  includeRestoreToast?: boolean;
  includeConflictDialog?: boolean;
}

export interface MountedAutoSync extends RenderResult {
  getLatestState: () => AutoCloudSyncState | null;
}

export interface SeedScenario {
  title?: string;
  dailyCheckIns?: UniversalDailyCheckIn[];
  weeklyReviews?: UniversalWeeklyReview[];
  taskCompleted?: boolean;
}

interface MockBackendOptions {
  readUserData?: () => UserData;
}

function emptyWorkspace(): TwelveWeekPulledWorkspace {
  return {
    goals: [],
    plans: [],
    weeks: [],
    tasks: [],
    leadMetrics: [],
    dailyCheckIns: [],
    weeklyReviews: [],
  };
}

function SyncProbe({ onState }: { onState: (state: AutoCloudSyncState) => void }) {
  const state = useAutoCloudSyncContext();

  useEffect(() => {
    onState(state);
  }, [onState, state]);

  return createElement(
    "div",
    { "data-testid": "auto-sync-probe" },
    createElement("output", { "data-testid": "pending-count" }, String(state.pendingCount)),
    createElement("output", { "data-testid": "last-result-status" }, state.lastResult?.status ?? "none"),
    createElement("output", { "data-testid": "last-result-skip" }, state.lastResult?.skipReason ?? ""),
    createElement("output", { "data-testid": "conflict-pending" }, String(state.conflictPending)),
    createElement(
      "button",
      {
        type: "button",
        onClick: () => {
          void state.triggerSyncNow();
        },
      },
      "Trigger sync now",
    ),
    createElement(
      "button",
      {
        type: "button",
        onClick: () => {
          void state.triggerDrainOnly();
        },
      },
      "Trigger drain only",
    ),
  );
}

function ProviderHarness({
  includeRestoreToast,
  includeConflictDialog,
  onState,
}: MountProviderOptions & { onState: (state: AutoCloudSyncState) => void }) {
  return createElement(
    MemoryRouter,
    null,
    createElement(
      AutoCloudSyncProvider,
      null,
      createElement(SyncProbe, { onState }),
      includeRestoreToast ? createElement(FirstLoginRestoreToast) : null,
      includeConflictDialog ? createElement(AutoCloudConflictDialog) : null,
    ),
  );
}

export function setupDevice(uid: string, options: SetupDeviceOptions = {}): TwoDevice {
  localStorage.clear();
  options.setAuthUser?.(uid);
  activateAuthenticatedUserData(uid);

  return {
    uid,
    storage: localStorage,
    getQueue: () => readMutationQueueStore(uid),
    getUserData,
    mountProvider: (mountOptions = {}) => {
      let latestState: AutoCloudSyncState | null = null;
      const rendered = render(
        createElement(ProviderHarness, {
          ...mountOptions,
          onState: (state) => {
            latestState = state;
          },
        }),
      );

      return {
        ...rendered,
        getLatestState: () => latestState,
      };
    },
  };
}

export function snapshotLocalStorage(): Record<string, string> {
  const snapshot: Record<string, string> = {};
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key) continue;
    const value = localStorage.getItem(key);
    if (value !== null) snapshot[key] = value;
  }
  return snapshot;
}

export function restoreLocalStorage(snapshot: Record<string, string>): void {
  localStorage.clear();
  Object.entries(snapshot).forEach(([key, value]) => {
    localStorage.setItem(key, value);
  });
}

function makeScoreboard(totalWeeks: number): UniversalScoreboardWeek[] {
  return getDefaultScoreboard(totalWeeks);
}

export function makeDailyCheckIn(date: string, overrides: Partial<UniversalDailyCheckIn> = {}): UniversalDailyCheckIn {
  return {
    date,
    didWorkToday: true,
    whichLeadIndicatorWorkedOn: "Deep work",
    amountDone: "1 session",
    outputCreated: "Draft shipped",
    obstacleOrIssue: "",
    dailySelfRating: 4,
    optionalNote: "",
    mood: "steady",
    ...overrides,
  };
}

export function makeWeeklyReview(
  weekNumber: number,
  overrides: Partial<UniversalWeeklyReview> = {},
): UniversalWeeklyReview {
  return {
    weekNumber,
    leadCompletionPercent: 80,
    lagProgressValue: "1",
    biggestOutputThisWeek: "Finished the review",
    mainObstacle: "Context switching",
    nextWeekPriority: "Protect morning focus",
    workloadDecision: "keep same",
    reviewCompleted: true,
    progressScore: 4,
    disciplineScore: 4,
    focusScore: 4,
    improvementScore: 4,
    outputQualityScore: 4,
    completedLeadIndicators: 2,
    ...overrides,
  };
}

export function makeTwelveWeekGoal(input: SeedScenario = {}): Goal {
  const title = input.title ?? "A";
  const totalWeeks = 12;
  const task: TwelveWeekTaskInstance = {
    id: "task_1",
    weekNumber: 1,
    scheduledDate: "2026-05-10",
    title: "Deep work block",
    leadIndicatorName: "Deep work",
    isCore: true,
    completed: Boolean(input.taskCompleted),
    completedAt: input.taskCompleted ? "2026-05-10T08:00:00.000Z" : undefined,
    tacticId: "lead_1",
  };
  const system: TwelveWeekSystem = {
    goalType: "Personal Growth",
    vision12Week: title,
    lagMetric: {
      name: "Reviews completed",
      target: "12",
      unit: "weeks",
      currentValue: "0",
    },
    leadIndicators: [
      {
        id: "lead_1",
        name: "Deep work",
        target: "2",
        unit: "sessions/week",
        type: "core",
        priority: 1,
        schedule: [1, 3],
      },
    ],
    milestones: {
      week4: "Keep first month steady",
      week8: "Keep second month steady",
      week12: title,
    },
    successEvidence: "A visible weekly review trail",
    reviewDay: "Sunday",
    week12Outcome: title,
    startDate: "2026-05-04",
    endDate: "2026-07-26",
    timezone: "Asia/Ho_Chi_Minh",
    weekStartsOn: "Monday",
    status: "active",
    tacticLoadPreference: "balanced",
    preferredDays: [1, 3],
    personalConstraint: "time",
    reentryCount: 0,
    currentWeek: 1,
    totalWeeks,
    weeklyPlans: Array.from({ length: totalWeeks }, (_, index) => ({
      weekNumber: index + 1,
      phaseName: index < 4 ? "Foundation" : index < 8 ? "Build" : "Finish",
      focus: `Week ${index + 1} focus`,
      milestone: index === totalWeeks - 1 ? title : "",
      completed: false,
    })),
    taskInstances: [task],
    dailyCheckIns: input.dailyCheckIns ?? [],
    weeklyReviews: input.weeklyReviews ?? [],
    scoreboard: makeScoreboard(totalWeeks),
  };

  return {
    id: "goal_1",
    category: "Personal Growth",
    title,
    description: `${title} description`,
    deadline: "2026-07-26",
    tasks: [],
    focusArea: "Career",
    readinessScore: 18,
    twelveWeekSystem: system,
    createdAt: "2026-05-04T00:00:00.000Z",
  };
}

export function seedDeviceWithData(device: TwoDevice, scenario: SeedScenario = {}): Goal {
  const goal = makeTwelveWeekGoal(scenario);
  const data = getUserData();
  data.onboardingCompleted = true;
  data.goals = [goal];
  saveUserData(data);
  localStorage.setItem(APP_STORAGE_KEYS.latest12WeekSystemGoalId, goal.id);
  enqueueFullGoalMutations(device, goal);
  return goal;
}

export function replaceDeviceGoal(device: TwoDevice, goal: Goal): void {
  const data = device.getUserData();
  data.goals = [goal];
  saveUserData(data);
}

export function setDeviceGoalTitle(device: TwoDevice, title: string): Goal {
  const data = device.getUserData();
  const goal = data.goals[0];
  if (!goal?.twelveWeekSystem) throw new Error("Expected seeded 12-week goal.");
  const nextGoal: Goal = {
    ...goal,
    title,
    description: `${title} description`,
    twelveWeekSystem: {
      ...goal.twelveWeekSystem,
      vision12Week: title,
      week12Outcome: title,
      milestones: {
        ...goal.twelveWeekSystem.milestones,
        week12: title,
      },
    },
  };
  data.goals = [nextGoal];
  saveUserData(data);
  enqueuePlanSnapshotMutation(device, nextGoal);
  return nextGoal;
}

export function enqueuePlanSnapshotMutation(device: TwoDevice, goal: Goal): void {
  if (!goal.twelveWeekSystem) throw new Error("Expected goal with 12-week system.");
  enqueueStoredMutation({
    kind: "plan_snapshot_updated",
    ownerUid: device.uid,
    goalId: goal.id,
    planId: getTwelveWeekClientPlanId(goal.id),
    payload: buildPlanSnapshotUpdatedPayload(goal.id, goal.twelveWeekSystem, "manual_update"),
  });
}

export function enqueueTaskCompletedMutation(device: TwoDevice, goal: Goal, completed: boolean): void {
  const system = goal.twelveWeekSystem;
  const task = system?.taskInstances[0];
  if (!system || !task) throw new Error("Expected seeded task.");
  enqueueStoredMutation({
    kind: "task_completed_changed",
    ownerUid: device.uid,
    goalId: goal.id,
    planId: getTwelveWeekClientPlanId(goal.id),
    payload: {
      taskId: task.id,
      clientTaskId: task.id,
      clientPlanId: getTwelveWeekClientPlanId(goal.id),
      clientWeekId: getTwelveWeekClientWeekId(goal.id, task.weekNumber),
      weekNumber: task.weekNumber,
      completed,
      completedAt: completed ? DEFAULT_NOW : undefined,
      scheduledDate: task.scheduledDate,
      title: task.title,
      leadIndicatorName: task.leadIndicatorName,
      isCore: task.isCore,
    },
  });
}

export function enqueueDailyCheckInMutation(device: TwoDevice, goal: Goal, checkIn: UniversalDailyCheckIn): void {
  enqueueStoredMutation({
    kind: "daily_check_in_upserted",
    ownerUid: device.uid,
    goalId: goal.id,
    planId: getTwelveWeekClientPlanId(goal.id),
    payload: {
      date: checkIn.date,
      clientPlanId: getTwelveWeekClientPlanId(goal.id),
      clientWeekId: getTwelveWeekClientWeekId(goal.id, 1),
      weekNumber: 1,
      checkIn,
    },
  });
}

export function enqueueWeeklyReviewMutation(device: TwoDevice, goal: Goal, review: UniversalWeeklyReview): void {
  enqueueStoredMutation({
    kind: "weekly_review_upserted",
    ownerUid: device.uid,
    goalId: goal.id,
    planId: getTwelveWeekClientPlanId(goal.id),
    payload: {
      clientPlanId: getTwelveWeekClientPlanId(goal.id),
      clientWeekId: getTwelveWeekClientWeekId(goal.id, review.weekNumber),
      weekNumber: review.weekNumber,
      executionScore: review.leadCompletionPercent,
      review,
    },
  });
}

export function enqueueFullGoalMutations(device: TwoDevice, goal: Goal): void {
  enqueuePlanSnapshotMutation(device, goal);
  goal.twelveWeekSystem?.dailyCheckIns.forEach((checkIn) => {
    enqueueDailyCheckInMutation(device, goal, checkIn);
  });
  goal.twelveWeekSystem?.weeklyReviews.forEach((review) => {
    enqueueWeeklyReviewMutation(device, goal, review);
  });
}

export function markDeviceQueueBlockedConflict(device: TwoDevice): void {
  const store = readMutationQueueStore(device.uid);
  const now = new Date().toISOString();
  writeMutationQueueStore({
    ...store,
    updatedAt: now,
    items: store.items.map((item) => ({
      ...item,
      status: "blocked_conflict" as const,
      error: {
        code: "sync_conflict",
        message: "Conflict held for user choice.",
        httpStatus: 409,
        lastSeenAt: now,
        retryable: false,
      },
      updatedAt: now,
    })),
  });
}

export function dispatchUserDataUpdated(): void {
  window.dispatchEvent(new CustomEvent(USER_DATA_UPDATED_EVENT_NAME));
}

function normalizeDateKey(value: string | undefined): string {
  const trimmed = value?.trim() ?? "";
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})(?:$|T)/);
  if (match?.[1]) return match[1];
  return trimmed;
}

function workspaceFromUserData(data: UserData, syncUpdatedAt = DEFAULT_NOW): TwelveWeekPulledWorkspace {
  const workspace = emptyWorkspace();

  data.goals.forEach((goal) => {
    const payload = createTwelveWeekImportPayload(goal);
    if (!payload) return;

    workspace.goals.push({
      id: `cloud_goal_${payload.clientGoalId}`,
      clientGoalId: payload.clientGoalId,
      title: payload.title,
      category: payload.category,
      description: payload.description,
      deadline: payload.deadline,
      status: payload.status,
      focusArea: payload.focusArea,
      readinessScore: payload.readinessScore,
      syncUpdatedAt,
      createdAt: goal.createdAt,
    });
    workspace.plans.push({
      id: `cloud_plan_${payload.plan.clientPlanId}`,
      clientPlanId: payload.plan.clientPlanId,
      clientGoalId: payload.plan.clientGoalId,
      vision: payload.plan.vision,
      startDate: payload.plan.startDate,
      syncUpdatedAt,
    });
    payload.plan.weeks.forEach((week) => {
      workspace.weeks.push({
        id: `cloud_week_${week.clientWeekId}`,
        clientWeekId: week.clientWeekId,
        clientPlanId: week.clientPlanId,
        planId: `cloud_plan_${week.clientPlanId}`,
        weekNumber: week.weekNumber,
        focus: week.focus,
        expectedOutput: week.expectedOutput,
        syncUpdatedAt,
      });
    });
    payload.plan.tasks.forEach((task) => {
      workspace.tasks.push({
        id: `cloud_task_${task.clientTaskId}`,
        clientTaskId: task.clientTaskId,
        clientWeekId: task.clientWeekId,
        clientPlanId: task.clientPlanId,
        weekId: `cloud_week_${task.clientWeekId}`,
        weekNumber: task.weekNumber,
        title: task.title,
        status: task.status === "done" ? "done" : "todo",
        scheduledDate: normalizeDateKey(task.scheduledDate),
        leadIndicatorName: task.leadIndicatorName,
        isCore: task.isCore,
        completedAt: task.completedAt,
        tacticId: task.tacticId,
        syncUpdatedAt,
      });
    });
    payload.plan.leadMetrics.forEach((metric) => {
      workspace.leadMetrics.push({
        id: `cloud_metric_${metric.clientMetricId}`,
        clientMetricId: metric.clientMetricId,
        clientWeekId: metric.clientWeekId,
        clientPlanId: metric.clientPlanId,
        leadIndicatorId: metric.leadIndicatorId,
        weekId: `cloud_week_${metric.clientWeekId}`,
        name: metric.name,
        weeklyTarget: metric.weeklyTarget,
        unit: metric.unit,
        type: metric.type,
        priority: metric.priority,
        schedule: metric.schedule,
        logs: [],
        syncUpdatedAt,
      });
    });
    payload.plan.dailyCheckIns.forEach((checkIn) => {
      workspace.dailyCheckIns.push({
        id: `cloud_checkin_${checkIn.clientCheckInId}`,
        clientCheckInId: checkIn.clientCheckInId,
        clientGoalId: checkIn.clientGoalId,
        clientPlanId: checkIn.clientPlanId,
        clientWeekId: checkIn.clientWeekId,
        planId: `cloud_plan_${checkIn.clientPlanId}`,
        weekId: `cloud_week_${checkIn.clientWeekId}`,
        weekNumber: checkIn.weekNumber,
        localDate: normalizeDateKey(checkIn.localDate),
        didWorkToday: checkIn.didWorkToday,
        whichLeadIndicatorWorkedOn: checkIn.whichLeadIndicatorWorkedOn,
        amountDone: checkIn.amountDone,
        outputCreated: checkIn.outputCreated,
        obstacleOrIssue: checkIn.obstacleOrIssue,
        dailySelfRating: checkIn.dailySelfRating,
        optionalNote: checkIn.optionalNote,
        mood: checkIn.mood,
        syncUpdatedAt,
      });
    });
    payload.plan.weeklyReviews.forEach((review) => {
      workspace.weeklyReviews.push({
        id: `cloud_review_${review.clientReviewId}`,
        clientReviewId: review.clientReviewId,
        clientPlanId: review.clientPlanId,
        clientWeekId: review.clientWeekId,
        planId: `cloud_plan_${review.clientPlanId}`,
        weekId: `cloud_week_${review.clientWeekId}`,
        weekNumber: review.weekNumber,
        executionScore: review.executionScore,
        leadCompletionPercent: review.leadCompletionPercent,
        lagProgressValue: review.lagProgressValue,
        biggestOutputThisWeek: review.biggestOutputThisWeek,
        mainObstacle: review.mainObstacle,
        nextWeekPriority: review.nextWeekPriority,
        workloadDecision: review.workloadDecision,
        reviewCompleted: review.reviewCompleted,
        progressScore: review.progressScore,
        disciplineScore: review.disciplineScore,
        focusScore: review.focusScore,
        improvementScore: review.improvementScore,
        outputQualityScore: review.outputQualityScore,
        completedLeadIndicators: review.completedLeadIndicators,
        syncUpdatedAt,
      });
    });
  });

  return workspace;
}

function cloneWorkspace(workspace: TwelveWeekPulledWorkspace): TwelveWeekPulledWorkspace {
  return JSON.parse(JSON.stringify(workspace)) as TwelveWeekPulledWorkspace;
}

function getWorkspaceCounts(workspace: TwelveWeekPulledWorkspace): TwelveWeekPullResponse["counts"] {
  return {
    goals: workspace.goals.length,
    plans: workspace.plans.length,
    weeks: workspace.weeks.length,
    tasks: workspace.tasks.length,
    leadMetrics: workspace.leadMetrics.length,
    dailyCheckIns: workspace.dailyCheckIns.length,
    weeklyReviews: workspace.weeklyReviews.length,
  };
}

export function createMockBackend(options: MockBackendOptions = {}) {
  let workspace = emptyWorkspace();
  let cursorIndex = 0;
  const capturedBatches: TwelveWeekMutationBatchRequest[] = [];
  const readUserDataForDrain = options.readUserData ?? getUserData;

  const replaceFromUserData = (data: UserData, syncUpdatedAt = DEFAULT_NOW) => {
    workspace = workspaceFromUserData(data, syncUpdatedAt);
  };

  const postMutations = async (request: TwelveWeekMutationBatchRequest): Promise<TwelveWeekMutationBatchResponse> => {
    capturedBatches.push(request);
    replaceFromUserData(readUserDataForDrain(), request.clientGeneratedAt);
    return {
      batchId: request.batchId,
      status: "accepted",
      accepted: request.mutations.map((mutation) => ({
        mutationId: mutation.mutationId,
        type: mutation.type,
        status: "accepted" as const,
      })),
      summary: {
        accepted: request.mutations.length,
        duplicate: 0,
        failed: 0,
      },
    };
  };

  const pullTwelveWeekWorkspace = async (): Promise<TwelveWeekPullResponse> => {
    cursorIndex += 1;
    const cloned = cloneWorkspace(workspace);
    return {
      serverTime: new Date().toISOString(),
      mode: "full",
      cursor: null,
      nextCursor: `cursor_${cursorIndex}`,
      hasMore: false,
      cursorStatus: "not_provided",
      warnings: [],
      workspace: cloned,
      changes: cloned,
      tombstones: {
        goals: [],
        plans: [],
        weeks: [],
        tasks: [],
        leadMetrics: [],
        dailyCheckIns: [],
        weeklyReviews: [],
      },
      counts: getWorkspaceCounts(cloned),
    };
  };

  return {
    capturedBatches,
    postMutations,
    pullTwelveWeekWorkspace,
    replaceFromUserData,
    getSnapshot: () => cloneWorkspace(workspace),
  };
}

export function getAppliedMutationKinds(device: TwoDevice): DataMutationItem["kind"][] {
  return device
    .getQueue()
    .items.filter((item) => item.status === "applied")
    .map((item) => item.kind);
}
