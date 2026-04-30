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
    taskInstances: [
      {
        id: "task_1",
        weekNumber: 1,
        scheduledDate: "2026-04-30",
        title: "Write first draft",
        leadIndicatorName: "Write",
        isCore: true,
        completed: false,
      },
    ],
    dailyCheckIns: [],
    weeklyReviews: [],
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
          weekNumber: 1,
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
          weekNumber: 1,
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
          system: createPlanSnapshotSystem("latest snapshot"),
        },
      },
      { now: at(6), createId: () => "snapshot_2" },
    );

    expect(store.items.map((item) => item.id)).toEqual(["daily_2", "review_2", "snapshot_2"]);
    const daily = store.items.find((item) => item.kind === "daily_check_in_upserted");
    const review = store.items.find((item) => item.kind === "weekly_review_upserted");
    const snapshot = store.items.find((item) => item.kind === "plan_snapshot_updated");

    expect(daily?.supersedes).toEqual(["daily_1"]);
    expect(review?.supersedes).toEqual(["review_1"]);
    expect(snapshot?.supersedes).toEqual(["snapshot_1"]);
    if (daily?.kind === "daily_check_in_upserted") expect(daily.payload.checkIn.optionalNote).toBe("latest");
    if (review?.kind === "weekly_review_upserted") expect(review.payload.review.nextWeekPriority).toBe("latest priority");
    if (snapshot?.kind === "plan_snapshot_updated") expect(snapshot.payload.system.vision12Week).toBe("latest snapshot");
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
});
