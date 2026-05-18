import { beforeEach, describe, expect, it } from "vitest";

import type { UniversalDailyCheckIn, UniversalWeeklyReview } from "@/app/utils/storage-types";
import type { PlanSnapshotSystemPayload } from "./mutationQueue";
import {
  clearMutationsForAuthOwner,
  compactMutations,
  createEmptyMutationQueueStore,
  createMutationId,
  enqueueMutation,
  enqueueStoredMutation,
  getMutationQueueStorageKey,
  listStoredPendingMutations,
  listPendingMutations,
  markMutationFailed,
  markMutationInFlight,
  markMutationSucceeded,
  MUTATION_QUEUE_TRIM_RETENTION_DAYS,
  summarizeMutationQueueStore,
  writeMutationQueueStore,
} from "./mutationQueue";

const baseNow = "2026-04-30T00:00:00.000Z";

function at(minutes: number): string {
  return new Date(new Date(baseNow).getTime() + minutes * 60_000).toISOString();
}

function createCheckIn(date = "2026-04-30", note = "first check-in"): UniversalDailyCheckIn {
  return {
    date,
    didWorkToday: true,
    whichLeadIndicatorWorkedOn: "Write",
    amountDone: "30 minutes",
    outputCreated: "Draft",
    obstacleOrIssue: "",
    dailySelfRating: 4,
    optionalNote: note,
  };
}

function createWeeklyReview(weekNumber = 1, priority = "Keep going"): UniversalWeeklyReview {
  return {
    weekNumber,
    leadCompletionPercent: 80,
    lagProgressValue: "2",
    biggestOutputThisWeek: "Published draft",
    mainObstacle: "Time",
    nextWeekPriority: priority,
    workloadDecision: "keep same",
    reviewCompleted: true,
    progressScore: 4,
    disciplineScore: 4,
    focusScore: 4,
    improvementScore: 3,
    outputQualityScore: 4,
  };
}

function createPlanSnapshotSystem(vision12Week = "Ship version one"): PlanSnapshotSystemPayload {
  return {
    goalType: "Career",
    vision12Week,
    lagMetric: {
      name: "Published articles",
      unit: "articles",
      target: "12",
      currentValue: "0",
    },
    leadIndicators: [
      {
        id: "lead_1",
        name: "Write",
        target: "5",
        unit: "hours",
        type: "core",
        priority: 1,
        schedule: [1, 3, 5],
      },
    ],
    milestones: {
      week4: "Outline ready",
      week8: "Draft ready",
      week12: "Published",
    },
    successEvidence: "Public page is live",
    reviewDay: "Sunday",
    week12Outcome: "Launch",
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
        focus: "Draft",
        milestone: "First draft",
        completed: false,
      },
    ],
  };
}

describe("data mutation queue", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("creates mutation ids and scoped storage keys without storage side effects", () => {
    expect(createMutationId(new Date("2026-04-30T00:00:00.000Z"), () => 0.5)).toMatch(
      /^dmq_1777507200000_[a-z0-9]+$/,
    );
    expect(getMutationQueueStorageKey()).toBe("visionboard_data_mutation_queue:anonymous");
    expect(getMutationQueueStorageKey("firebase uid/one")).toBe(
      "visionboard_data_mutation_queue:auth:firebase%20uid%2Fone",
    );
  });

  it("collapses multiple pending task completion changes to the latest task state", () => {
    let store = createEmptyMutationQueueStore({ ownerUid: null, deviceId: "device_1", now: at(0) });

    store = enqueueMutation(
      store,
      {
        kind: "task_completed_changed",
        goalId: "goal_1",
        payload: {
          taskId: "task_1",
          weekNumber: 1,
          completed: true,
          completedAt: at(1),
          scheduledDate: "2026-04-30",
          title: "Write draft",
          leadIndicatorName: "Write",
          isCore: true,
        },
      },
      { now: at(1), createId: () => "mutation_1" },
    );
    store = enqueueMutation(
      store,
      {
        kind: "task_completed_changed",
        goalId: "goal_1",
        payload: {
          taskId: "task_1",
          weekNumber: 1,
          completed: false,
          scheduledDate: "2026-04-30",
          title: "Write draft",
          leadIndicatorName: "Write",
          isCore: true,
        },
      },
      { now: at(2), createId: () => "mutation_2" },
    );

    expect(store.items).toHaveLength(1);
    expect(store.items[0].id).toBe("mutation_2");
    expect(store.items[0].collapseKey).toBe("task:goal_1:task_1");
    expect(store.items[0].idempotencyKey).toBe("anonymous:device_1:mutation_2");
    expect(store.items[0].supersedes).toEqual(["mutation_1"]);
    expect(store.items[0].kind).toBe("task_completed_changed");
    if (store.items[0].kind === "task_completed_changed") {
      expect(store.items[0].payload.completed).toBe(false);
    }
  });

  it("does not mutate an in-flight task change when a later change is queued", () => {
    let store = createEmptyMutationQueueStore({ ownerUid: "user_a", deviceId: "device_1", now: at(0) });
    store = enqueueMutation(
      store,
      {
        kind: "task_completed_changed",
        ownerUid: "user_a",
        goalId: "goal_1",
        payload: {
          taskId: "task_1",
          weekNumber: 1,
          completed: true,
          completedAt: at(1),
          scheduledDate: "2026-04-30",
        },
      },
      { now: at(1), createId: () => "mutation_1" },
    );
    store = markMutationInFlight(store, "mutation_1", { now: at(2) });
    store = enqueueMutation(
      store,
      {
        kind: "task_completed_changed",
        ownerUid: "user_a",
        goalId: "goal_1",
        payload: {
          taskId: "task_1",
          weekNumber: 1,
          completed: false,
          scheduledDate: "2026-04-30",
        },
      },
      { now: at(3), createId: () => "mutation_2" },
    );

    expect(store.items).toHaveLength(2);
    expect(store.items.map((item) => item.status)).toEqual(["in_flight", "pending"]);
    expect(store.items.map((item) => item.id)).toEqual(["mutation_1", "mutation_2"]);
  });

  it("collapses daily check-ins, weekly reviews, and plan snapshots by domain key", () => {
    let store = createEmptyMutationQueueStore({ ownerUid: "user_a", deviceId: "device_1", now: at(0) });

    store = enqueueMutation(
      store,
      {
        kind: "daily_check_in_upserted",
        ownerUid: "user_a",
        goalId: "goal_1",
        payload: {
          date: "2026-04-30",
          clientPlanId: "goal_1:12-week-system",
          clientWeekId: "goal_1:week:1",
          weekNumber: 1,
          checkIn: createCheckIn("2026-04-30", "first"),
        },
      },
      { now: at(1), createId: () => "daily_1" },
    );
    store = enqueueMutation(
      store,
      {
        kind: "daily_check_in_upserted",
        ownerUid: "user_a",
        goalId: "goal_1",
        payload: {
          date: "2026-04-30",
          clientPlanId: "goal_1:12-week-system",
          clientWeekId: "goal_1:week:1",
          weekNumber: 1,
          checkIn: createCheckIn("2026-04-30", "latest"),
        },
      },
      { now: at(2), createId: () => "daily_2" },
    );
    store = enqueueMutation(
      store,
      {
        kind: "weekly_review_upserted",
        ownerUid: "user_a",
        goalId: "goal_1",
        payload: {
          clientPlanId: "goal_1:12-week-system",
          clientWeekId: "goal_1:week:1",
          weekNumber: 1,
          executionScore: 72,
          review: createWeeklyReview(1, "first priority"),
        },
      },
      { now: at(3), createId: () => "review_1" },
    );
    store = enqueueMutation(
      store,
      {
        kind: "weekly_review_upserted",
        ownerUid: "user_a",
        goalId: "goal_1",
        payload: {
          clientPlanId: "goal_1:12-week-system",
          clientWeekId: "goal_1:week:1",
          weekNumber: 1,
          executionScore: 84,
          review: createWeeklyReview(1, "latest priority"),
        },
      },
      { now: at(4), createId: () => "review_2" },
    );
    store = enqueueMutation(
      store,
      {
        kind: "plan_snapshot_updated",
        ownerUid: "user_a",
        goalId: "goal_1",
        payload: {
          reason: "setup",
          clientPlanId: "goal_1:12-week-system",
          clientGoalId: "goal_1",
          changedAt: at(5),
          clientUpdatedAt: at(5),
          system: createPlanSnapshotSystem("first snapshot"),
        },
      },
      { now: at(5), createId: () => "snapshot_1" },
    );
    store = enqueueMutation(
      store,
      {
        kind: "plan_snapshot_updated",
        ownerUid: "user_a",
        goalId: "goal_1",
        payload: {
          reason: "manual_update",
          clientPlanId: "goal_1:12-week-system",
          clientGoalId: "goal_1",
          changedAt: at(6),
          clientUpdatedAt: at(6),
          system: createPlanSnapshotSystem("latest snapshot"),
        },
      },
      { now: at(6), createId: () => "snapshot_2" },
    );
    store = enqueueMutation(
      store,
      {
        kind: "lead_metric_upserted",
        ownerUid: "user_a",
        goalId: "goal_1",
        payload: {
          reason: "manual_update",
          clientPlanId: "goal_1:12-week-system",
          clientWeekId: "goal_1:week:1",
          clientMetricId: "goal_1:week:1:metric:lead_1",
          leadIndicatorId: "lead_1",
          weekNumber: 1,
          name: "Write",
          weeklyTarget: 5,
          target: "5",
          unit: "hours",
          type: "core",
          priority: 1,
          schedule: [1, 3, 5],
          currentValue: 1,
          changedAt: at(7),
          clientUpdatedAt: at(7),
        },
      },
      { now: at(7), createId: () => "metric_1" },
    );
    store = enqueueMutation(
      store,
      {
        kind: "lead_metric_upserted",
        ownerUid: "user_a",
        goalId: "goal_1",
        payload: {
          reason: "task_progress",
          clientPlanId: "goal_1:12-week-system",
          clientWeekId: "goal_1:week:1",
          clientMetricId: "goal_1:week:1:metric:lead_1",
          leadIndicatorId: "lead_1",
          weekNumber: 1,
          name: "Write",
          weeklyTarget: 5,
          target: "5",
          unit: "hours",
          type: "core",
          priority: 1,
          schedule: [1, 3, 5],
          currentValue: 2,
          changedAt: at(8),
          clientUpdatedAt: at(8),
        },
      },
      { now: at(8), createId: () => "metric_2" },
    );

    expect(store.items.map((item) => item.id)).toEqual(["daily_2", "review_2", "snapshot_2", "metric_2"]);
    const daily = store.items.find((item) => item.kind === "daily_check_in_upserted");
    const review = store.items.find((item) => item.kind === "weekly_review_upserted");
    const snapshot = store.items.find((item) => item.kind === "plan_snapshot_updated");
    const metric = store.items.find((item) => item.kind === "lead_metric_upserted");

    expect(daily?.supersedes).toEqual(["daily_1"]);
    expect(review?.supersedes).toEqual(["review_1"]);
    expect(snapshot?.supersedes).toEqual(["snapshot_1"]);
    expect(metric?.supersedes).toEqual(["metric_1"]);
    if (daily?.kind === "daily_check_in_upserted") {
      expect(daily.payload.clientPlanId).toBe("goal_1:12-week-system");
      expect(daily.payload.clientWeekId).toBe("goal_1:week:1");
      expect(daily.payload.checkIn.optionalNote).toBe("latest");
    }
    if (review?.kind === "weekly_review_upserted") {
      expect(review.payload.clientPlanId).toBe("goal_1:12-week-system");
      expect(review.payload.clientWeekId).toBe("goal_1:week:1");
      expect(review.payload.executionScore).toBe(84);
      expect(review.payload.review.nextWeekPriority).toBe("latest priority");
    }
    if (snapshot?.kind === "plan_snapshot_updated") expect(snapshot.payload.system.vision12Week).toBe("latest snapshot");
    if (metric?.kind === "lead_metric_upserted") {
      expect(metric.payload.currentValue).toBe(2);
      expect(metric.payload.reason).toBe("task_progress");
    }
  });

  it("serializes and collapses goal and plan delete mutations", () => {
    let store = createEmptyMutationQueueStore({ ownerUid: "user_a", deviceId: "device_1", now: at(0) });

    store = enqueueMutation(
      store,
      {
        kind: "goal_deleted",
        ownerUid: "user_a",
        goalId: "goal_1",
        planId: "goal_1:12-week-system",
        payload: {
          clientGoalId: "goal_1",
          backendGoalId: "backend_goal_1",
          backendPlanId: "backend_plan_1",
          deletedAt: at(1),
        },
      },
      { now: at(1), createId: () => "goal_delete_1" },
    );
    store = enqueueMutation(
      store,
      {
        kind: "goal_deleted",
        ownerUid: "user_a",
        goalId: "goal_1",
        planId: "goal_1:12-week-system",
        payload: {
          clientGoalId: "goal_1",
          backendGoalId: "backend_goal_1",
          backendPlanId: "backend_plan_1",
          deletedAt: at(2),
        },
      },
      { now: at(2), createId: () => "goal_delete_2" },
    );
    store = enqueueMutation(
      store,
      {
        kind: "plan_deleted",
        ownerUid: "user_a",
        goalId: "goal_1",
        planId: "goal_1:12-week-system",
        payload: {
          clientPlanId: "goal_1:12-week-system",
          backendPlanId: "backend_plan_1",
          clientGoalId: "goal_1",
          deletedAt: at(2),
        },
      },
      { now: at(2), createId: () => "plan_delete_1" },
    );

    expect(store.items.map((item) => item.id)).toEqual(["goal_delete_2", "plan_delete_1"]);
    expect(store.items[0].collapseKey).toBe("delete:goal_deleted:goal_1");
    expect(store.items[0].supersedes).toEqual(["goal_delete_1"]);
    expect(store.items[1].collapseKey).toBe("delete:plan_deleted:goal_1:12-week-system");
    if (store.items[0].kind === "goal_deleted") expect(store.items[0].payload.deletedAt).toBe(at(2));
    if (store.items[1].kind === "plan_deleted") expect(store.items[1].payload.backendPlanId).toBe("backend_plan_1");
  });

  it("lists pending mutations by auth owner and keeps anonymous separate", () => {
    let store = createEmptyMutationQueueStore({ ownerUid: null, deviceId: "device_1", now: at(0) });

    for (const ownerUid of [null, "user_a", "user_b"] as const) {
      store = enqueueMutation(
        store,
        {
          kind: "task_completed_changed",
          ownerUid,
          goalId: `goal_${ownerUid ?? "anonymous"}`,
          payload: {
            taskId: "task_1",
            weekNumber: 1,
            completed: true,
            scheduledDate: "2026-04-30",
          },
        },
        { now: at(ownerUid === "user_b" ? 3 : ownerUid === "user_a" ? 2 : 1), createId: () => `mutation_${ownerUid ?? "anonymous"}` },
      );
    }

    expect(listPendingMutations(store, { ownerUid: null }).map((item) => item.goalId)).toEqual(["goal_anonymous"]);
    expect(listPendingMutations(store, { ownerUid: "user_a" }).map((item) => item.goalId)).toEqual(["goal_user_a"]);
    expect(listPendingMutations(store, { ownerUid: "user_b" }).map((item) => item.goalId)).toEqual(["goal_user_b"]);
  });

  it("marks mutation lifecycle states without deleting local evidence", () => {
    let store = createEmptyMutationQueueStore({ ownerUid: "user_a", deviceId: "device_1", now: at(0) });
    store = enqueueMutation(
      store,
      {
        kind: "weekly_review_upserted",
        goalId: "goal_1",
        payload: {
          weekNumber: 1,
          review: createWeeklyReview(),
        },
      },
      { now: at(1), createId: () => "mutation_1" },
    );

    store = markMutationInFlight(store, "mutation_1", { now: at(2) });
    expect(store.items[0].status).toBe("in_flight");
    expect(store.items[0].attemptCount).toBe(1);
    expect(store.items[0].lastAttemptAt).toBe(at(2));

    store = markMutationFailed(
      store,
      "mutation_1",
      { code: "network_error", message: "offline", retryable: true },
      { now: at(3), nextRetryAt: at(10) },
    );
    expect(store.items[0].status).toBe("retry_scheduled");
    expect(store.items[0].nextRetryAt).toBe(at(10));
    expect(listPendingMutations(store, { ownerUid: "user_a", now: at(5) })).toHaveLength(0);
    expect(listPendingMutations(store, { ownerUid: "user_a", now: at(11) })).toHaveLength(1);

    store = markMutationSucceeded(store, "mutation_1", { now: at(12) });
    expect(store.items[0].status).toBe("applied");
    expect(store.items[0].error).toBeUndefined();
    expect(store.items).toHaveLength(1);
  });

  it("summarizes queue counts for settings visibility", () => {
    let store = createEmptyMutationQueueStore({ ownerUid: "user_a", deviceId: "device_1", now: at(0) });

    store = enqueueMutation(
      store,
      {
        kind: "task_completed_changed",
        goalId: "goal_1",
        payload: {
          taskId: "task_pending",
          weekNumber: 1,
          completed: true,
          scheduledDate: "2026-04-30",
        },
      },
      { now: at(1), createId: () => "pending_1" },
    );
    store = enqueueMutation(
      store,
      {
        kind: "task_completed_changed",
        goalId: "goal_1",
        payload: {
          taskId: "task_in_flight",
          weekNumber: 1,
          completed: true,
          scheduledDate: "2026-04-30",
        },
      },
      { now: at(2), createId: () => "in_flight_1" },
    );
    store = markMutationInFlight(store, "in_flight_1", { now: at(3) });
    store = enqueueMutation(
      store,
      {
        kind: "daily_check_in_upserted",
        goalId: "goal_1",
        payload: {
          date: "2026-04-30",
          weekNumber: 1,
          checkIn: createCheckIn("2026-04-30"),
        },
      },
      { now: at(4), createId: () => "failed_1" },
    );
    store = markMutationFailed(
      store,
      "failed_1",
      { code: "network_error", message: "offline", retryable: true },
      { now: at(5), nextRetryAt: at(10) },
    );
    store = enqueueMutation(
      store,
      {
        kind: "weekly_review_upserted",
        goalId: "goal_1",
        payload: {
          weekNumber: 1,
          review: createWeeklyReview(),
        },
      },
      { now: at(6), createId: () => "applied_1" },
    );
    store = markMutationSucceeded(store, "applied_1", { now: at(7) });

    const summary = summarizeMutationQueueStore({
      ...store,
      lastDrainStartedAt: at(8),
      lastDrainFinishedAt: at(9),
    });

    expect(summary).toEqual({
      totalCount: 4,
      pendingCount: 1,
      inFlightCount: 1,
      failedOrRetryableCount: 1,
      succeededCount: 1,
      lastDrainStartedAt: at(8),
      lastDrainFinishedAt: at(9),
    });
  });

  it("maps common HTTP failures to blocked or terminal statuses", () => {
    let store = createEmptyMutationQueueStore({ ownerUid: "user_a", deviceId: "device_1", now: at(0) });
    for (const [index, [id, httpStatus]] of (
      [
        ["bad_payload", 400],
        ["auth", 401],
        ["conflict", 409],
        ["forbidden", 403],
      ] as const
    ).entries()) {
      const day = String(27 + index).padStart(2, "0");
      store = enqueueMutation(
        store,
        {
          kind: "daily_check_in_upserted",
          goalId: "goal_1",
          payload: {
            date: `2026-04-${day}`,
            weekNumber: 1,
            checkIn: createCheckIn(`2026-04-${day}`),
          },
        },
        { now: at(1), createId: () => id },
      );
      store = markMutationFailed(store, id, { code: String(httpStatus), message: "failed", httpStatus }, { now: at(2) });
    }

    expect(store.items.find((item) => item.id === "bad_payload")?.status).toBe("failed_validation");
    expect(store.items.find((item) => item.id === "auth")?.status).toBe("blocked_auth");
    expect(store.items.find((item) => item.id === "conflict")?.status).toBe("blocked_conflict");
    expect(store.items.find((item) => item.id === "forbidden")?.status).toBe("failed_terminal");
  });

  it("clears mutations for one auth owner without touching another owner", () => {
    let store = createEmptyMutationQueueStore({ ownerUid: null, deviceId: "device_1", now: at(0) });
    for (const ownerUid of ["user_a", "user_b"] as const) {
      store = enqueueMutation(
        store,
        {
          kind: "task_completed_changed",
          ownerUid,
          goalId: `goal_${ownerUid}`,
          payload: {
            taskId: "task_1",
            weekNumber: 1,
            completed: true,
            scheduledDate: "2026-04-30",
          },
        },
        { now: at(ownerUid === "user_a" ? 1 : 2), createId: () => `mutation_${ownerUid}` },
      );
    }

    store = clearMutationsForAuthOwner(store, "user_a", { now: at(3) });

    expect(listPendingMutations(store, { ownerUid: "user_a" })).toEqual([]);
    expect(listPendingMutations(store, { ownerUid: "user_b" }).map((item) => item.id)).toEqual(["mutation_user_b"]);
  });

  it("can compact an existing queue with duplicate pending collapse keys", () => {
    const store = createEmptyMutationQueueStore({ ownerUid: "user_a", deviceId: "device_1", now: at(0) });
    const duplicated = {
      ...store,
      items: [
        ...enqueueMutation(
          store,
          {
            kind: "task_completed_changed",
            goalId: "goal_1",
            payload: {
              taskId: "task_1",
              weekNumber: 1,
              completed: true,
              scheduledDate: "2026-04-30",
            },
          },
          { now: at(1), createId: () => "mutation_1" },
        ).items,
        ...enqueueMutation(
          store,
          {
            kind: "task_completed_changed",
            goalId: "goal_1",
            payload: {
              taskId: "task_1",
              weekNumber: 1,
              completed: false,
              scheduledDate: "2026-04-30",
            },
          },
          { now: at(2), createId: () => "mutation_2" },
        ).items,
      ],
    };

    const compacted = compactMutations(duplicated, { now: at(3) });

    expect(compacted.items).toHaveLength(1);
    expect(compacted.items[0].id).toBe("mutation_2");
    expect(compacted.items[0].supersedes).toEqual(["mutation_1"]);
  });

  it("persists pending mutations in the anonymous queue without requiring auth", () => {
    const result = enqueueStoredMutation(
      {
        kind: "task_completed_changed",
        goalId: "goal_1",
        payload: {
          taskId: "task_1",
          clientTaskId: "task_1",
          clientPlanId: "goal_1:12-week-system",
          clientWeekId: "goal_1:week:1",
          weekNumber: 1,
          completed: true,
          completedAt: at(1),
          scheduledDate: "2026-04-30",
        },
      },
      {
        ownerUid: null,
        storage: localStorage,
        deviceId: "device_1",
        now: at(1),
        createId: () => "stored_1",
      },
    );

    expect(result.ok).toBe(true);
    expect(localStorage.getItem(getMutationQueueStorageKey(null))).toBeTruthy();

    const pending = listStoredPendingMutations(null, { storage: localStorage, now: at(2) });
    expect(pending).toHaveLength(1);
    expect(pending[0]).toEqual(expect.objectContaining({ id: "stored_1", ownerUid: null, goalId: "goal_1" }));
    if (pending[0]?.kind === "task_completed_changed") {
      expect(pending[0].payload.clientTaskId).toBe("task_1");
      expect(pending[0].payload.completed).toBe(true);
    }
  });

  it("compacts stored task toggles to the latest local state", () => {
    const baseInput = {
      kind: "task_completed_changed" as const,
      goalId: "goal_1",
      payload: {
        taskId: "task_1",
        clientTaskId: "task_1",
        clientPlanId: "goal_1:12-week-system",
        clientWeekId: "goal_1:week:1",
        weekNumber: 1,
        completed: true,
        completedAt: at(1),
        scheduledDate: "2026-04-30",
      },
    };

    enqueueStoredMutation(baseInput, {
      ownerUid: null,
      storage: localStorage,
      deviceId: "device_1",
      now: at(1),
      createId: () => "stored_1",
    });
    enqueueStoredMutation(
      {
        ...baseInput,
        payload: {
          ...baseInput.payload,
          completed: false,
          completedAt: undefined,
        },
      },
      {
        ownerUid: null,
        storage: localStorage,
        deviceId: "device_1",
        now: at(2),
        createId: () => "stored_2",
      },
    );

    const pending = listStoredPendingMutations(null, { storage: localStorage, now: at(3) });

    expect(pending).toHaveLength(1);
    expect(pending[0].id).toBe("stored_2");
    expect(pending[0].supersedes).toEqual(["stored_1"]);
    if (pending[0].kind === "task_completed_changed") {
      expect(pending[0].payload.completed).toBe(false);
      expect(pending[0].payload.completedAt).toBeUndefined();
    }
  });

  it("keeps stored queues scoped per auth owner", () => {
    for (const ownerUid of ["user_a", "user_b"] as const) {
      enqueueStoredMutation(
        {
          kind: "task_completed_changed",
          goalId: `goal_${ownerUid}`,
          payload: {
            taskId: `task_${ownerUid}`,
            clientTaskId: `task_${ownerUid}`,
            weekNumber: 1,
            completed: true,
            scheduledDate: "2026-04-30",
          },
        },
        {
          ownerUid,
          storage: localStorage,
          deviceId: "device_1",
          now: ownerUid === "user_a" ? at(1) : at(2),
          createId: () => `stored_${ownerUid}`,
        },
      );
    }

    expect(listStoredPendingMutations("user_a", { storage: localStorage }).map((item) => item.goalId)).toEqual([
      "goal_user_a",
    ]);
    expect(listStoredPendingMutations("user_b", { storage: localStorage }).map((item) => item.goalId)).toEqual([
      "goal_user_b",
    ]);
    expect(listStoredPendingMutations(null, { storage: localStorage })).toEqual([]);
  });

  it("exports MUTATION_QUEUE_TRIM_RETENTION_DAYS as 14", () => {
    expect(MUTATION_QUEUE_TRIM_RETENTION_DAYS).toBe(14);
  });

  it("trims items applied older than 14 days", () => {
    const today = new Date("2026-05-18T00:00:00.000Z");
    const appliedOlder20Days = "2026-04-28T00:00:00.000Z"; // 20 ngày trước
    const appliedRecent5Days = "2026-05-13T00:00:00.000Z"; // 5 ngày trước
    const pendingOld30Days = "2026-04-18T00:00:00.000Z"; // 30 ngày trước

    const store = createEmptyMutationQueueStore({ ownerUid: "user_a", deviceId: "device_1", now: today });
    store.items = [
      {
        id: "applied_older",
        idempotencyKey: "user_a:device_1:applied_older",
        collapseKey: "task:goal_1:task_1",
        kind: "task_completed_changed",
        status: "applied",
        createdAt: appliedOlder20Days,
        updatedAt: appliedOlder20Days,
        attemptCount: 1,
        maxAttempts: 7,
        ownerUid: "user_a",
        goalId: "goal_1",
        payload: {
          taskId: "task_1",
          weekNumber: 1,
          completed: true,
          scheduledDate: "2026-04-28",
        },
      },
      {
        id: "applied_recent",
        idempotencyKey: "user_a:device_1:applied_recent",
        collapseKey: "task:goal_1:task_2",
        kind: "task_completed_changed",
        status: "applied",
        createdAt: appliedRecent5Days,
        updatedAt: appliedRecent5Days,
        attemptCount: 1,
        maxAttempts: 7,
        ownerUid: "user_a",
        goalId: "goal_1",
        payload: {
          taskId: "task_2",
          weekNumber: 1,
          completed: true,
          scheduledDate: "2026-05-13",
        },
      },
      {
        id: "pending_old",
        idempotencyKey: "user_a:device_1:pending_old",
        collapseKey: "task:goal_1:task_3",
        kind: "task_completed_changed",
        status: "pending",
        createdAt: pendingOld30Days,
        updatedAt: pendingOld30Days,
        attemptCount: 0,
        maxAttempts: 7,
        ownerUid: "user_a",
        goalId: "goal_1",
        payload: {
          taskId: "task_3",
          weekNumber: 1,
          completed: false,
          scheduledDate: "2026-04-18",
        },
      },
    ];

    const consoleSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    writeMutationQueueStore(store, { storage: localStorage });
    consoleSpy.mockRestore();

    const stored = JSON.parse(localStorage.getItem(getMutationQueueStorageKey("user_a"))!);
    expect(stored.items).toHaveLength(2);
    expect(stored.items.map((item: { id: string }) => item.id)).toEqual(["applied_recent", "pending_old"]);
  });

  it("trims items archived older than 14 days", () => {
    const today = new Date("2026-05-18T00:00:00.000Z");
    const archivedOlder20Days = "2026-04-28T00:00:00.000Z";
    const archivedRecent5Days = "2026-05-13T00:00:00.000Z";

    const store = createEmptyMutationQueueStore({ ownerUid: "user_a", deviceId: "device_1", now: today });
    store.items = [
      {
        id: "archived_old",
        idempotencyKey: "user_a:device_1:archived_old",
        collapseKey: "delete:goal_deleted:goal_1",
        kind: "goal_deleted",
        status: "archived",
        createdAt: archivedOlder20Days,
        updatedAt: archivedOlder20Days,
        attemptCount: 1,
        maxAttempts: 7,
        ownerUid: "user_a",
        goalId: "goal_1",
        payload: {
          clientGoalId: "goal_1",
          deletedAt: archivedOlder20Days,
        },
      },
      {
        id: "archived_recent",
        idempotencyKey: "user_a:device_1:archived_recent",
        collapseKey: "delete:goal_deleted:goal_2",
        kind: "goal_deleted",
        status: "archived",
        createdAt: archivedRecent5Days,
        updatedAt: archivedRecent5Days,
        attemptCount: 1,
        maxAttempts: 7,
        ownerUid: "user_a",
        goalId: "goal_2",
        payload: {
          clientGoalId: "goal_2",
          deletedAt: archivedRecent5Days,
        },
      },
    ];

    writeMutationQueueStore(store, { storage: localStorage });

    const stored = JSON.parse(localStorage.getItem(getMutationQueueStorageKey("user_a"))!);
    expect(stored.items).toHaveLength(1);
    expect(stored.items[0].id).toBe("archived_recent");
  });

  it("does not trim items pending/in_flight/blocked even if very old", () => {
    const today = new Date("2026-05-18T00:00:00.000Z");
    const veryOldDate = "2025-05-18T00:00:00.000Z"; // 1 năm cũ

    const store = createEmptyMutationQueueStore({ ownerUid: "user_a", deviceId: "device_1", now: today });
    store.items = [
      {
        id: "pending_old",
        idempotencyKey: "user_a:device_1:pending_old",
        collapseKey: "task:goal_1:task_1",
        kind: "task_completed_changed",
        status: "pending",
        createdAt: veryOldDate,
        updatedAt: veryOldDate,
        attemptCount: 0,
        maxAttempts: 7,
        ownerUid: "user_a",
        goalId: "goal_1",
        payload: { taskId: "task_1", weekNumber: 1, completed: false, scheduledDate: "2025-05-18" },
      },
      {
        id: "in_flight_old",
        idempotencyKey: "user_a:device_1:in_flight_old",
        collapseKey: "task:goal_1:task_2",
        kind: "task_completed_changed",
        status: "in_flight",
        createdAt: veryOldDate,
        updatedAt: veryOldDate,
        attemptCount: 1,
        maxAttempts: 7,
        ownerUid: "user_a",
        goalId: "goal_1",
        payload: { taskId: "task_2", weekNumber: 1, completed: true, scheduledDate: "2025-05-18" },
      },
      {
        id: "blocked_auth_old",
        idempotencyKey: "user_a:device_1:blocked_auth_old",
        collapseKey: "task:goal_1:task_3",
        kind: "task_completed_changed",
        status: "blocked_auth",
        createdAt: veryOldDate,
        updatedAt: veryOldDate,
        attemptCount: 1,
        maxAttempts: 7,
        ownerUid: "user_a",
        goalId: "goal_1",
        payload: { taskId: "task_3", weekNumber: 1, completed: true, scheduledDate: "2025-05-18" },
      },
      {
        id: "retry_scheduled_old",
        idempotencyKey: "user_a:device_1:retry_scheduled_old",
        collapseKey: "task:goal_1:task_4",
        kind: "task_completed_changed",
        status: "retry_scheduled",
        createdAt: veryOldDate,
        updatedAt: veryOldDate,
        attemptCount: 3,
        maxAttempts: 7,
        ownerUid: "user_a",
        goalId: "goal_1",
        payload: { taskId: "task_4", weekNumber: 1, completed: true, scheduledDate: "2025-05-18" },
      },
    ];

    writeMutationQueueStore(store, { storage: localStorage });

    const stored = JSON.parse(localStorage.getItem(getMutationQueueStorageKey("user_a"))!);
    expect(stored.items).toHaveLength(4);
    expect(stored.items.map((item: { id: string }) => item.id)).toEqual([
      "pending_old",
      "in_flight_old",
      "blocked_auth_old",
      "retry_scheduled_old",
    ]);
  });

  it("is idempotent - second write does not trim more items", () => {
    const today = new Date("2026-05-18T00:00:00.000Z");
    const appliedRecent = "2026-05-13T00:00:00.000Z";

    const store = createEmptyMutationQueueStore({ ownerUid: "user_a", deviceId: "device_1", now: today });
    store.items = [
      {
        id: "applied_recent",
        idempotencyKey: "user_a:device_1:applied_recent",
        collapseKey: "task:goal_1:task_1",
        kind: "task_completed_changed",
        status: "applied",
        createdAt: appliedRecent,
        updatedAt: appliedRecent,
        attemptCount: 1,
        maxAttempts: 7,
        ownerUid: "user_a",
        goalId: "goal_1",
        payload: { taskId: "task_1", weekNumber: 1, completed: true, scheduledDate: "2026-05-13" },
      },
      {
        id: "pending",
        idempotencyKey: "user_a:device_1:pending",
        collapseKey: "task:goal_1:task_2",
        kind: "task_completed_changed",
        status: "pending",
        createdAt: today.toISOString(),
        updatedAt: today.toISOString(),
        attemptCount: 0,
        maxAttempts: 7,
        ownerUid: "user_a",
        goalId: "goal_1",
        payload: { taskId: "task_2", weekNumber: 1, completed: false, scheduledDate: "2026-05-18" },
      },
    ];

    const consoleSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    writeMutationQueueStore(store, { storage: localStorage });
    const firstCallCount = consoleSpy.mock.calls.length;
    consoleSpy.mockRestore();

    expect(firstCallCount).toBe(0);

    const stored = JSON.parse(localStorage.getItem(getMutationQueueStorageKey("user_a"))!);
    const storedItems = stored.items;

    const consoleSpy2 = vi.spyOn(console, "info").mockImplementation(() => {});
    writeMutationQueueStore({ ...store, items: storedItems }, { storage: localStorage });
    const secondCallCount = consoleSpy2.mock.calls.length;
    consoleSpy2.mockRestore();

    expect(secondCallCount).toBe(0);

    const stored2 = JSON.parse(localStorage.getItem(getMutationQueueStorageKey("user_a"))!);
    expect(stored2.items).toHaveLength(2);
  });

  it("does not trim items with invalid updatedAt parsing", () => {
    const today = new Date("2026-05-18T00:00:00.000Z");

    const store = createEmptyMutationQueueStore({ ownerUid: "user_a", deviceId: "device_1", now: today });
    store.items = [
      {
        id: "applied_invalid_date",
        idempotencyKey: "user_a:device_1:applied_invalid_date",
        collapseKey: "task:goal_1:task_1",
        kind: "task_completed_changed",
        status: "applied",
        createdAt: "invalid-date-string",
        updatedAt: "not-a-date",
        attemptCount: 1,
        maxAttempts: 7,
        ownerUid: "user_a",
        goalId: "goal_1",
        payload: { taskId: "task_1", weekNumber: 1, completed: true, scheduledDate: "2026-05-18" },
      },
    ];

    writeMutationQueueStore(store, { storage: localStorage });

    const stored = JSON.parse(localStorage.getItem(getMutationQueueStorageKey("user_a"))!);
    expect(stored.items).toHaveLength(1);
    expect(stored.items[0].id).toBe("applied_invalid_date");
  });
});
