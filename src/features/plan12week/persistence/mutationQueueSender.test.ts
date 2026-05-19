import { beforeEach, describe, expect, it, vi } from "vitest";

import { enqueueStoredMutation, readMutationQueueStore, type DataMutationItem } from "./mutationQueue";
import { sendPending12WeekMutations } from "./mutationQueueSender";
import type { UniversalDailyCheckIn, UniversalWeeklyReview } from "@/app/utils/storage-types";
import type { TwelveWeekMutationBatchRequest, TwelveWeekMutationBatchResponse } from "@/services/syncService";

const baseNow = "2026-04-30T00:00:00.000Z";

function at(minutes: number): string {
  return new Date(new Date(baseNow).getTime() + minutes * 60_000).toISOString();
}

function seedTaskMutation(input: { ownerUid?: string | null; mutationId?: string; completed?: boolean } = {}): void {
  enqueueStoredMutation(
    {
      kind: "task_completed_changed",
      goalId: "goal_1",
      payload: {
        taskId: "task_1",
        clientTaskId: "task_1",
        clientPlanId: "goal_1:12-week-system",
        clientWeekId: "goal_1:week:1",
        weekNumber: 1,
        completed: input.completed ?? true,
        completedAt: input.completed === false ? undefined : at(1),
        scheduledDate: "2026-04-30",
      },
    },
    {
      ownerUid: input.ownerUid ?? "user_1",
      storage: localStorage,
      deviceId: "device_1",
      now: at(1),
      createId: () => input.mutationId ?? "mutation_1",
    },
  );
}

function seedDailyCheckInMutation(input: { ownerUid?: string | null; mutationId?: string; note?: string } = {}): void {
  const checkIn: UniversalDailyCheckIn = {
    date: "2026-04-30",
    didWorkToday: true,
    whichLeadIndicatorWorkedOn: "Write",
    amountDone: "1/3 tasks",
    outputCreated: "Draft",
    obstacleOrIssue: "",
    dailySelfRating: 4,
    optionalNote: input.note ?? "Daily check-in note",
  };

  enqueueStoredMutation(
    {
      kind: "daily_check_in_upserted",
      goalId: "goal_1",
      payload: {
        date: checkIn.date,
        clientPlanId: "goal_1:12-week-system",
        clientWeekId: "goal_1:week:1",
        weekNumber: 1,
        checkIn,
      },
    },
    {
      ownerUid: input.ownerUid ?? "user_1",
      storage: localStorage,
      deviceId: "device_1",
      now: at(1),
      createId: () => input.mutationId ?? "daily_mutation_1",
    },
  );
}

function seedWeeklyReviewMutation(
  input: { ownerUid?: string | null; mutationId?: string; priority?: string } = {},
): void {
  const review: UniversalWeeklyReview = {
    weekNumber: 1,
    leadCompletionPercent: 80,
    lagProgressValue: "13 days",
    biggestOutputThisWeek: "Published draft",
    mainObstacle: "Context switching",
    nextWeekPriority: input.priority ?? "Keep one priority",
    workloadDecision: "keep same",
    reviewCompleted: true,
    progressScore: 8,
    disciplineScore: 7,
    focusScore: 8,
    improvementScore: 7,
    outputQualityScore: 8,
    completedLeadIndicators: 4,
  };

  enqueueStoredMutation(
    {
      kind: "weekly_review_upserted",
      goalId: "goal_1",
      payload: {
        clientPlanId: "goal_1:12-week-system",
        clientWeekId: "goal_1:week:1",
        weekNumber: review.weekNumber,
        executionScore: 76,
        review,
      },
    },
    {
      ownerUid: input.ownerUid ?? "user_1",
      storage: localStorage,
      deviceId: "device_1",
      now: at(1),
      createId: () => input.mutationId ?? "weekly_mutation_1",
    },
  );
}

function seedPlanSnapshotMutation(
  input: { ownerUid?: string | null; mutationId?: string; vision?: string } = {},
): void {
  enqueueStoredMutation(
    {
      kind: "plan_snapshot_updated",
      goalId: "goal_1",
      payload: {
        reason: "manual_update",
        clientGoalId: "goal_1",
        clientPlanId: "goal_1:12-week-system",
        changedAt: at(1),
        clientUpdatedAt: at(1),
        system: {
          goalType: "Career",
          vision12Week: input.vision ?? "Ship the plan",
          lagMetric: {
            name: "Published drafts",
            unit: "drafts",
            target: "3",
            currentValue: "0",
          },
          leadIndicators: [],
          milestones: {
            week4: "Outline",
            week8: "Draft",
            week12: "Ship",
          },
          successEvidence: "Plan is usable",
          reviewDay: "Sunday",
          week12Outcome: "Public beta",
          startDate: "2026-04-30",
          endDate: "2026-07-23",
          timezone: "Asia/Saigon",
          weekStartsOn: "Monday",
          status: "active",
          currentWeek: 1,
          totalWeeks: 12,
          weeklyPlans: [
            {
              weekNumber: 1,
              phaseName: "Start",
              focus: "Validate",
              milestone: "One useful test",
              completed: false,
            },
          ],
        },
      },
    },
    {
      ownerUid: input.ownerUid ?? "user_1",
      storage: localStorage,
      deviceId: "device_1",
      now: at(1),
      createId: () => input.mutationId ?? "snapshot_mutation_1",
    },
  );
}

function seedLeadMetricMutation(
  input: { ownerUid?: string | null; mutationId?: string; currentValue?: number } = {},
): void {
  enqueueStoredMutation(
    {
      kind: "lead_metric_upserted",
      goalId: "goal_1",
      payload: {
        reason: "task_progress",
        clientPlanId: "goal_1:12-week-system",
        clientWeekId: "goal_1:week:1",
        clientMetricId: "goal_1:week:1:metric:lead_write",
        leadIndicatorId: "lead_write",
        weekNumber: 1,
        name: "Write",
        weeklyTarget: 3,
        target: "3",
        unit: "sessions/week",
        type: "core",
        priority: 1,
        schedule: [1, 3, 5],
        currentValue: input.currentValue ?? 1,
        changedAt: at(1),
        clientUpdatedAt: at(1),
      },
    },
    {
      ownerUid: input.ownerUid ?? "user_1",
      storage: localStorage,
      deviceId: "device_1",
      now: at(1),
      createId: () => input.mutationId ?? "lead_metric_mutation_1",
    },
  );
}

function seedGoalDeleteMutation(
  input: { ownerUid?: string | null; mutationId?: string; backendGoalId?: string } = {},
): void {
  enqueueStoredMutation(
    {
      kind: "goal_deleted",
      goalId: "goal_1",
      planId: "goal_1:12-week-system",
      payload: {
        clientGoalId: "goal_1",
        backendGoalId: input.backendGoalId ?? "backend_goal_1",
        backendPlanId: "backend_plan_1",
        deletedAt: at(1),
      },
    },
    {
      ownerUid: input.ownerUid ?? "user_1",
      storage: localStorage,
      deviceId: "device_1",
      now: at(1),
      createId: () => input.mutationId ?? "goal_delete_mutation_1",
    },
  );
}

function seedPlanDeleteMutation(
  input: { ownerUid?: string | null; mutationId?: string; backendPlanId?: string } = {},
): void {
  enqueueStoredMutation(
    {
      kind: "plan_deleted",
      goalId: "goal_1",
      planId: "goal_1:12-week-system",
      payload: {
        clientPlanId: "goal_1:12-week-system",
        backendPlanId: input.backendPlanId ?? "backend_plan_1",
        clientGoalId: "goal_1",
        deletedAt: at(1),
      },
    },
    {
      ownerUid: input.ownerUid ?? "user_1",
      storage: localStorage,
      deviceId: "device_1",
      now: at(1),
      createId: () => input.mutationId ?? "plan_delete_mutation_1",
    },
  );
}

function readItem(ownerUid = "user_1", mutationId = "mutation_1"): DataMutationItem {
  const item = readMutationQueueStore(ownerUid, { storage: localStorage, now: at(5) }).items.find(
    (candidate) => candidate.id === mutationId,
  );
  if (!item) throw new Error(`Expected mutation ${mutationId} to exist.`);
  return item;
}

describe("mutation queue sender", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("does not call the backend in demo mode", async () => {
    seedPlanSnapshotMutation({ mutationId: "snapshot_demo" });
    const postMutations = vi.fn();

    const result = await sendPending12WeekMutations({
      ownerUid: "user_1",
      authenticated: true,
      featureEnabled: true,
      realMode: false,
      apiConfigured: true,
      storage: localStorage,
      now: at(2),
      postMutations,
    });

    expect(result.status).toBe("skipped");
    expect(result.skipReason).toBe("demo_mode");
    expect(postMutations).not.toHaveBeenCalled();
    expect(readItem("user_1", "snapshot_demo").status).toBe("pending");
  });

  it("does not call the backend when the user is not authenticated", async () => {
    const postMutations = vi.fn();

    const result = await sendPending12WeekMutations({
      ownerUid: null,
      authenticated: false,
      featureEnabled: true,
      realMode: true,
      apiConfigured: true,
      storage: localStorage,
      now: at(2),
      postMutations,
    });

    expect(result.status).toBe("skipped");
    expect(result.skipReason).toBe("unauthenticated");
    expect(postMutations).not.toHaveBeenCalled();
  });

  it("does not call the backend when the feature flag is disabled", async () => {
    seedTaskMutation();
    const postMutations = vi.fn();

    const result = await sendPending12WeekMutations({
      ownerUid: "user_1",
      authenticated: true,
      featureEnabled: false,
      realMode: true,
      apiConfigured: true,
      storage: localStorage,
      now: at(2),
      postMutations,
    });

    expect(result.status).toBe("skipped");
    expect(result.skipReason).toBe("feature_disabled");
    expect(postMutations).not.toHaveBeenCalled();
    expect(readItem().status).toBe("pending");
  });

  it("marks accepted mutations as succeeded", async () => {
    seedTaskMutation({ mutationId: "mutation_success" });
    const postMutations = vi.fn(
      async (request: TwelveWeekMutationBatchRequest): Promise<TwelveWeekMutationBatchResponse> => {
        expect(request.mutations).toHaveLength(1);
        expect(request.mutations[0]).toEqual(
          expect.objectContaining({
            mutationId: "mutation_success",
            type: "task_completed_changed",
            idempotencyKey: "user_1:device_1:mutation_success",
          }),
        );

        return {
          accepted: [
            {
              mutationId: "mutation_success",
              type: "task_completed_changed",
              status: "accepted",
            },
          ],
        };
      },
    );

    const result = await sendPending12WeekMutations({
      ownerUid: "user_1",
      authenticated: true,
      featureEnabled: true,
      realMode: true,
      apiConfigured: true,
      storage: localStorage,
      now: at(2),
      postMutations,
    });

    expect(result.status).toBe("success");
    expect(result.succeededCount).toBe(1);
    expect(result.failedCount).toBe(0);
    expect(readItem("user_1", "mutation_success").status).toBe("applied");
  });

  it("sends daily check-in entity client ids with the queued payload", async () => {
    seedDailyCheckInMutation({ mutationId: "daily_success" });
    const postMutations = vi.fn(
      async (request: TwelveWeekMutationBatchRequest): Promise<TwelveWeekMutationBatchResponse> => {
        expect(request.mutations).toHaveLength(1);
        expect(request.mutations[0]).toEqual(
          expect.objectContaining({
            mutationId: "daily_success",
            type: "daily_check_in_upserted",
            entity: expect.objectContaining({
              clientGoalId: "goal_1",
              clientPlanId: "goal_1:12-week-system",
              clientWeekId: "goal_1:week:1",
              clientTaskId: undefined,
            }),
          }),
        );

        return {
          accepted: [
            {
              mutationId: "daily_success",
              type: "daily_check_in_upserted",
              status: "accepted",
            },
          ],
        };
      },
    );

    const result = await sendPending12WeekMutations({
      ownerUid: "user_1",
      authenticated: true,
      featureEnabled: true,
      realMode: true,
      apiConfigured: true,
      storage: localStorage,
      now: at(2),
      postMutations,
    });

    expect(result.status).toBe("success");
    expect(readItem("user_1", "daily_success").status).toBe("applied");
  });

  it("sends weekly review entity client ids with the queued payload", async () => {
    seedWeeklyReviewMutation({ mutationId: "weekly_success" });
    const postMutations = vi.fn(
      async (request: TwelveWeekMutationBatchRequest): Promise<TwelveWeekMutationBatchResponse> => {
        expect(request.mutations).toHaveLength(1);
        expect(request.mutations[0]).toEqual(
          expect.objectContaining({
            mutationId: "weekly_success",
            type: "weekly_review_upserted",
            entity: expect.objectContaining({
              clientGoalId: "goal_1",
              clientPlanId: "goal_1:12-week-system",
              clientWeekId: "goal_1:week:1",
              clientTaskId: undefined,
            }),
            payload: expect.objectContaining({
              executionScore: 76,
            }),
          }),
        );

        return {
          accepted: [
            {
              mutationId: "weekly_success",
              type: "weekly_review_upserted",
              status: "accepted",
            },
          ],
        };
      },
    );

    const result = await sendPending12WeekMutations({
      ownerUid: "user_1",
      authenticated: true,
      featureEnabled: true,
      realMode: true,
      apiConfigured: true,
      storage: localStorage,
      now: at(2),
      postMutations,
    });

    expect(result.status).toBe("success");
    expect(readItem("user_1", "weekly_success").status).toBe("applied");
  });

  it("sends plan snapshot entity client ids with the queued payload", async () => {
    seedPlanSnapshotMutation({ mutationId: "snapshot_success", vision: "Updated plan vision" });
    const postMutations = vi.fn(
      async (request: TwelveWeekMutationBatchRequest): Promise<TwelveWeekMutationBatchResponse> => {
        expect(request.mutations).toHaveLength(1);
        expect(request.mutations[0]).toEqual(
          expect.objectContaining({
            mutationId: "snapshot_success",
            type: "plan_snapshot_updated",
            entity: expect.objectContaining({
              clientGoalId: "goal_1",
              clientPlanId: "goal_1:12-week-system",
              clientWeekId: undefined,
              clientTaskId: undefined,
            }),
            payload: expect.objectContaining({
              clientPlanId: "goal_1:12-week-system",
              system: expect.objectContaining({
                vision12Week: "Updated plan vision",
              }),
            }),
          }),
        );

        return {
          accepted: [
            {
              mutationId: "snapshot_success",
              type: "plan_snapshot_updated",
              status: "applied",
            },
          ],
        };
      },
    );

    const result = await sendPending12WeekMutations({
      ownerUid: "user_1",
      authenticated: true,
      featureEnabled: true,
      realMode: true,
      apiConfigured: true,
      storage: localStorage,
      now: at(2),
      postMutations,
    });

    expect(result.status).toBe("success");
    expect(readItem("user_1", "snapshot_success").status).toBe("applied");
  });

  it("sends lead metric entity client ids with the queued payload", async () => {
    seedLeadMetricMutation({ mutationId: "metric_success", currentValue: 2 });
    const postMutations = vi.fn(
      async (request: TwelveWeekMutationBatchRequest): Promise<TwelveWeekMutationBatchResponse> => {
        expect(request.mutations).toHaveLength(1);
        expect(request.mutations[0]).toEqual(
          expect.objectContaining({
            mutationId: "metric_success",
            type: "lead_metric_upserted",
            entity: expect.objectContaining({
              clientGoalId: "goal_1",
              clientPlanId: "goal_1:12-week-system",
              clientWeekId: "goal_1:week:1",
              clientMetricId: "goal_1:week:1:metric:lead_write",
              clientTaskId: undefined,
            }),
            payload: expect.objectContaining({
              clientMetricId: "goal_1:week:1:metric:lead_write",
              currentValue: 2,
            }),
          }),
        );

        return {
          accepted: [
            {
              mutationId: "metric_success",
              type: "lead_metric_upserted",
              status: "applied",
            },
          ],
        };
      },
    );

    const result = await sendPending12WeekMutations({
      ownerUid: "user_1",
      authenticated: true,
      featureEnabled: true,
      realMode: true,
      apiConfigured: true,
      storage: localStorage,
      now: at(2),
      postMutations,
    });

    expect(result.status).toBe("success");
    expect(readItem("user_1", "metric_success").status).toBe("applied");
  });

  it("sends goal and plan delete mutations through idempotent delete endpoints", async () => {
    seedGoalDeleteMutation({ mutationId: "goal_delete_success" });
    seedPlanDeleteMutation({ mutationId: "plan_delete_success" });
    const postMutations = vi.fn();
    const deleteGoalFn = vi.fn(async () => ({ deleted: true }));
    const deletePlanFn = vi.fn(async () => ({ deleted: true }));

    const result = await sendPending12WeekMutations({
      ownerUid: "user_1",
      authenticated: true,
      featureEnabled: true,
      realMode: true,
      apiConfigured: true,
      storage: localStorage,
      now: at(2),
      postMutations,
      deleteGoalFn,
      deletePlanFn,
    });

    expect(result.status).toBe("success");
    expect(postMutations).not.toHaveBeenCalled();
    expect(deleteGoalFn).toHaveBeenCalledWith("backend_goal_1");
    expect(deletePlanFn).toHaveBeenCalledWith("backend_plan_1");
    expect(readItem("user_1", "goal_delete_success").status).toBe("applied");
    expect(readItem("user_1", "plan_delete_success").status).toBe("applied");
  });

  it("treats 404 delete responses as already-applied tombstones", async () => {
    seedGoalDeleteMutation({ mutationId: "goal_delete_404" });
    const deleteGoalFn = vi.fn(async () => {
      throw { status: 404, message: "Goal not found" };
    });

    const result = await sendPending12WeekMutations({
      ownerUid: "user_1",
      authenticated: true,
      featureEnabled: true,
      realMode: true,
      apiConfigured: true,
      storage: localStorage,
      now: at(2),
      postMutations: vi.fn(),
      deleteGoalFn,
    });

    expect(result.status).toBe("success");
    expect(result.duplicateCount).toBe(1);
    expect(readItem("user_1", "goal_delete_404").status).toBe("applied");
  });

  it("keeps failed delete mutations retryable", async () => {
    seedPlanDeleteMutation({ mutationId: "plan_delete_network" });
    const deletePlanFn = vi.fn(async () => {
      throw { message: "Network down", isNetworkError: true };
    });

    const result = await sendPending12WeekMutations({
      ownerUid: "user_1",
      authenticated: true,
      featureEnabled: true,
      realMode: true,
      apiConfigured: true,
      storage: localStorage,
      now: at(2),
      postMutations: vi.fn(),
      deletePlanFn,
    });

    const item = readItem("user_1", "plan_delete_network");
    expect(result.status).toBe("error");
    expect(item.status).toBe("retry_scheduled");
    expect(item.error?.retryable).toBe(true);
    expect(item.nextRetryAt).toBeTruthy();
  });

  it("does not call the backend for queued lead metrics in demo mode", async () => {
    seedLeadMetricMutation({ mutationId: "metric_demo" });
    const postMutations = vi.fn();

    const result = await sendPending12WeekMutations({
      ownerUid: "user_1",
      authenticated: true,
      featureEnabled: true,
      realMode: false,
      apiConfigured: true,
      storage: localStorage,
      now: at(2),
      postMutations,
    });

    expect(result.status).toBe("skipped");
    expect(result.skipReason).toBe("demo_mode");
    expect(postMutations).not.toHaveBeenCalled();
    expect(readItem("user_1", "metric_demo").status).toBe("pending");
  });

  it("keeps failed request mutations in a retryable queue state", async () => {
    seedTaskMutation({ mutationId: "mutation_network" });
    const userDataSnapshot = JSON.stringify({ sentinel: "local user data remains untouched" });
    localStorage.setItem("visionboard_user_data", userDataSnapshot);
    const postMutations = vi.fn(async () => {
      throw { message: "Network down", isNetworkError: true };
    });

    const result = await sendPending12WeekMutations({
      ownerUid: "user_1",
      authenticated: true,
      featureEnabled: true,
      realMode: true,
      apiConfigured: true,
      storage: localStorage,
      now: at(2),
      postMutations,
    });

    const item = readItem("user_1", "mutation_network");
    expect(result.status).toBe("error");
    expect(result.failedCount).toBe(1);
    expect(item.status).toBe("retry_scheduled");
    expect(item.error?.retryable).toBe(true);
    expect(item.nextRetryAt).toBeTruthy();
    expect(localStorage.getItem("visionboard_user_data")).toBe(userDataSnapshot);
  });

  it("does not count rate-limited request retries as failed syncs", async () => {
    seedTaskMutation({ mutationId: "mutation_rate_limit" });
    const postMutations = vi.fn(async () => {
      throw { message: "Too many requests", status: 429 };
    });

    const result = await sendPending12WeekMutations({
      ownerUid: "user_1",
      authenticated: true,
      featureEnabled: true,
      realMode: true,
      apiConfigured: true,
      storage: localStorage,
      now: at(2),
      postMutations,
    });

    const item = readItem("user_1", "mutation_rate_limit");
    expect(result.status).toBe("error");
    expect(result.failedCount).toBe(0);
    expect(item.status).toBe("retry_scheduled");
    expect(item.error?.httpStatus).toBe(429);
    expect(item.error?.retryable).toBe(true);
    expect(item.nextRetryAt).toBeTruthy();
  });

  it("handles duplicate responses as safely succeeded", async () => {
    seedTaskMutation({ mutationId: "mutation_duplicate" });
    const postMutations = vi.fn(
      async (): Promise<TwelveWeekMutationBatchResponse> => ({
        duplicate: [
          {
            mutationId: "mutation_duplicate",
            type: "task_completed_changed",
            status: "duplicate",
          },
        ],
      }),
    );

    const result = await sendPending12WeekMutations({
      ownerUid: "user_1",
      authenticated: true,
      featureEnabled: true,
      realMode: true,
      apiConfigured: true,
      storage: localStorage,
      now: at(2),
      postMutations,
    });

    expect(result.status).toBe("success");
    expect(result.duplicateCount).toBe(1);
    expect(readItem("user_1", "mutation_duplicate").status).toBe("applied");
  });
});
