import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UniversalDailyCheckIn } from "@/app/utils/storage-types";
import {
  createEmptyMutationQueueStore,
  enqueueMutation,
  compactMutations,
  markMutationFailed,
  markMutationInFlight,
  listPendingMutations,
} from "./mutationQueue";
import { sendPending12WeekMutations } from "./mutationQueueSender";

const baseNow = "2026-04-30T00:00:00.000Z";

function at(minutes: number): string {
  return new Date(new Date(baseNow).getTime() + minutes * 60_000).toISOString();
}

function createCheckIn(date = "2026-04-30", note = "test check-in"): UniversalDailyCheckIn {
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

describe("offline/online mutation queue hardening", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("enqueues mutations without network access — pure localStorage", () => {
    const store = createEmptyMutationQueueStore({
      ownerUid: "user_a",
      deviceId: "device_1",
      now: at(0),
    });
    const result = enqueueMutation(
      store,
      {
        kind: "task_completed_changed",
        goalId: "goal_1",
        ownerUid: "user_a",
        payload: {
          taskId: "task_1",
          weekNumber: 1,
          completed: true,
          completedAt: at(1),
          scheduledDate: "2026-04-30",
        },
      },
      { now: at(1), createId: () => "offline_mutation_1" },
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0].status).toBe("pending");
    expect(result.items[0].id).toBe("offline_mutation_1");
  });

  it("does not call backend when browser is offline", async () => {
    const postMutations = vi.fn();
    const result = await sendPending12WeekMutations({
      ownerUid: "user_a",
      authenticated: true,
      featureEnabled: true,
      realMode: true,
      apiConfigured: true,
      online: false,
      now: at(0),
      postMutations,
    });

    expect(result.status).toBe("skipped");
    expect(result.skipReason).toBe("offline");
    expect(postMutations).not.toHaveBeenCalled();
  });

  it("does not call backend in demo mode", async () => {
    const postMutations = vi.fn();
    const result = await sendPending12WeekMutations({
      ownerUid: "user_a",
      authenticated: true,
      featureEnabled: true,
      realMode: false,
      apiConfigured: true,
      online: true,
      now: at(0),
      postMutations,
    });

    expect(result.status).toBe("skipped");
    expect(result.skipReason).toBe("demo_mode");
    expect(postMutations).not.toHaveBeenCalled();
  });

  it("does not retry a permanent failure (failed_terminal)", () => {
    let store = createEmptyMutationQueueStore({
      ownerUid: "user_a",
      deviceId: "device_1",
      now: at(0),
    });
    store = enqueueMutation(
      store,
      {
        kind: "daily_check_in_upserted",
        goalId: "goal_1",
        ownerUid: "user_a",
        payload: { date: "2026-04-30", weekNumber: 1, checkIn: createCheckIn() },
      },
      { now: at(1), createId: () => "mutation_terminal" },
    );
    store = markMutationFailed(
      store,
      "mutation_terminal",
      { code: "forbidden", message: "forbidden", httpStatus: 403, retryable: false },
      { now: at(2) },
    );

    expect(store.items[0].status).toBe("failed_terminal");

    // listPendingMutations should NOT include terminal failures
    const pending = listPendingMutations(store, { ownerUid: "user_a", now: at(10) });
    expect(pending).toHaveLength(0);
  });

  it("does not retry a validation failure (failed_validation)", () => {
    let store = createEmptyMutationQueueStore({
      ownerUid: "user_a",
      deviceId: "device_1",
      now: at(0),
    });
    store = enqueueMutation(
      store,
      {
        kind: "daily_check_in_upserted",
        goalId: "goal_1",
        ownerUid: "user_a",
        payload: { date: "2026-04-30", weekNumber: 1, checkIn: createCheckIn() },
      },
      { now: at(1), createId: () => "mutation_bad" },
    );
    store = markMutationFailed(
      store,
      "mutation_bad",
      { code: "bad_payload", message: "invalid", httpStatus: 400, retryable: false },
      { now: at(2) },
    );

    expect(store.items[0].status).toBe("failed_validation");
    const pending = listPendingMutations(store, { ownerUid: "user_a", now: at(100) });
    expect(pending).toHaveLength(0);
  });

  it("respects nextRetryAt backoff — not retried before its time", () => {
    let store = createEmptyMutationQueueStore({
      ownerUid: "user_a",
      deviceId: "device_1",
      now: at(0),
    });
    store = enqueueMutation(
      store,
      {
        kind: "task_completed_changed",
        goalId: "goal_1",
        ownerUid: "user_a",
        payload: {
          taskId: "task_1",
          weekNumber: 1,
          completed: true,
          scheduledDate: "2026-04-30",
        },
      },
      { now: at(1), createId: () => "mutation_retry" },
    );
    store = markMutationInFlight(store, "mutation_retry", { now: at(2) });
    store = markMutationFailed(
      store,
      "mutation_retry",
      { code: "network_error", message: "offline", retryable: true },
      { now: at(3), nextRetryAt: at(30) }, // retry at minute 30
    );

    expect(store.items[0].status).toBe("retry_scheduled");
    expect(store.items[0].nextRetryAt).toBe(at(30));

    // Too early — not listed as pending
    const pendingTooEarly = listPendingMutations(store, {
      ownerUid: "user_a",
      now: at(10),
    });
    expect(pendingTooEarly).toHaveLength(0);

    // After nextRetryAt — listed as pending
    const pendingAfterBackoff = listPendingMutations(store, {
      ownerUid: "user_a",
      now: at(31),
    });
    expect(pendingAfterBackoff).toHaveLength(1);
    expect(pendingAfterBackoff[0].id).toBe("mutation_retry");
  });

  it("compact before retry keeps the latest mutation per collapse key", () => {
    let store = createEmptyMutationQueueStore({
      ownerUid: "user_a",
      deviceId: "device_1",
      now: at(0),
    });

    // Offline user toggles the same task 3 times — results in 3 pending items
    // (normally compaction happens on enqueue, but simulate a race by manually
    //  building a duplicated store)
    const taskPayload = {
      taskId: "task_1",
      weekNumber: 1,
      completed: true,
      scheduledDate: "2026-04-30",
    } as const;

    for (let i = 1; i <= 3; i++) {
      store = enqueueMutation(
        store,
        {
          kind: "task_completed_changed",
          goalId: "goal_1",
          ownerUid: "user_a",
          payload: { ...taskPayload, completed: i % 2 === 1 },
        },
        { now: at(i), createId: () => `toggle_${i}` },
      );
    }

    // After normal enqueue compaction, only 1 remains
    expect(store.items).toHaveLength(1);
    expect(store.items[0].id).toBe("toggle_3");

    // Extra compaction is a no-op
    const compacted = compactMutations(store, { now: at(4) });
    expect(compacted.items).toHaveLength(1);
    expect(compacted.items[0].id).toBe("toggle_3");
  });

  it("compact preserves in-flight items and only deduplicates pending", () => {
    let store = createEmptyMutationQueueStore({
      ownerUid: "user_a",
      deviceId: "device_1",
      now: at(0),
    });

    store = enqueueMutation(
      store,
      {
        kind: "task_completed_changed",
        goalId: "goal_1",
        ownerUid: "user_a",
        payload: {
          taskId: "task_1",
          weekNumber: 1,
          completed: true,
          scheduledDate: "2026-04-30",
        },
      },
      { now: at(1), createId: () => "inflight_1" },
    );
    store = markMutationInFlight(store, "inflight_1", { now: at(2) });

    store = enqueueMutation(
      store,
      {
        kind: "task_completed_changed",
        goalId: "goal_1",
        ownerUid: "user_a",
        payload: {
          taskId: "task_1",
          weekNumber: 1,
          completed: false,
          scheduledDate: "2026-04-30",
        },
      },
      { now: at(3), createId: () => "pending_1" },
    );

    const compacted = compactMutations(store, { now: at(4) });

    // Both kept: in-flight is not collapsible
    expect(compacted.items).toHaveLength(2);
    expect(compacted.items.map((item) => item.status)).toEqual(["in_flight", "pending"]);
  });

  it("sendPending12WeekMutations compacts duplicates before sending", async () => {
    // Manually enqueue two pending items with the same collapse key by writing raw storage
    let store = createEmptyMutationQueueStore({
      ownerUid: "user_a",
      deviceId: "device_1",
      now: at(0),
    });

    const baseInput = {
      kind: "task_completed_changed" as const,
      goalId: "goal_1",
      ownerUid: "user_a" as const,
      payload: {
        taskId: "task_1",
        weekNumber: 1,
        completed: true,
        scheduledDate: "2026-04-30",
      },
    };

    // First enqueue creates toggle_1
    store = enqueueMutation(store, baseInput, { now: at(1), createId: () => "toggle_1" });
    // Second enqueue compacts to toggle_2 superseding toggle_1
    store = enqueueMutation(
      store,
      { ...baseInput, payload: { ...baseInput.payload, completed: false } },
      { now: at(2), createId: () => "toggle_2" },
    );

    expect(store.items).toHaveLength(1);
    expect(store.items[0].id).toBe("toggle_2");

    // Write to storage and call sender
    localStorage.setItem("visionboard_data_mutation_queue:auth:user_a", JSON.stringify(store));

    const postMutations = vi.fn().mockResolvedValue({
      accepted: [{ mutationId: "toggle_2", status: "accepted" }],
    });

    const result = await sendPending12WeekMutations({
      ownerUid: "user_a",
      authenticated: true,
      featureEnabled: true,
      realMode: true,
      apiConfigured: true,
      online: true,
      storage: localStorage,
      now: at(3),
      postMutations,
    });

    expect(result.status).toBe("success");
    expect(result.succeededCount).toBe(1);

    // Only 1 mutation was sent (the compacted one)
    expect(postMutations).toHaveBeenCalledTimes(1);
    const sentBatch = postMutations.mock.calls[0][0];
    expect(sentBatch.mutations).toHaveLength(1);
    expect(sentBatch.mutations[0].mutationId).toBe("toggle_2");
  });

  it("failure keeps mutations in queue — does not delete them", async () => {
    let store = createEmptyMutationQueueStore({
      ownerUid: "user_a",
      deviceId: "device_1",
      now: at(0),
    });
    store = enqueueMutation(
      store,
      {
        kind: "task_completed_changed",
        goalId: "goal_1",
        ownerUid: "user_a",
        payload: {
          taskId: "task_1",
          weekNumber: 1,
          completed: true,
          scheduledDate: "2026-04-30",
        },
      },
      { now: at(1), createId: () => "fail_mutation" },
    );
    localStorage.setItem("visionboard_data_mutation_queue:auth:user_a", JSON.stringify(store));

    const postMutations = vi.fn().mockRejectedValue(new Error("network failure"));

    const result = await sendPending12WeekMutations({
      ownerUid: "user_a",
      authenticated: true,
      featureEnabled: true,
      realMode: true,
      apiConfigured: true,
      online: true,
      storage: localStorage,
      now: at(2),
      postMutations,
    });

    expect(result.status).toBe("error");
    expect(result.failedCount).toBe(1);

    // The mutation is still in storage, not deleted
    const raw = JSON.parse(localStorage.getItem("visionboard_data_mutation_queue:auth:user_a") ?? "{}");
    expect(raw.items).toHaveLength(1);
    expect(raw.items[0].id).toBe("fail_mutation");
    expect(raw.items[0].status).not.toBe("applied");
  });
});
