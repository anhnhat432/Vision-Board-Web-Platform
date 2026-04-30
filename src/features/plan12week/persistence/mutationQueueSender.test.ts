import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  enqueueStoredMutation,
  readMutationQueueStore,
  type DataMutationItem,
} from "./mutationQueue";
import { sendPending12WeekMutations } from "./mutationQueueSender";
import type { TwelveWeekMutationBatchRequest, TwelveWeekMutationBatchResponse } from "@/services/syncService";

const baseNow = "2026-04-30T00:00:00.000Z";

function at(minutes: number): string {
  return new Date(new Date(baseNow).getTime() + minutes * 60_000).toISOString();
}

function seedTaskMutation(input: {
  ownerUid?: string | null;
  mutationId?: string;
  completed?: boolean;
} = {}): void {
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
    seedTaskMutation();
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
    expect(readItem().status).toBe("pending");
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

    expect(result.status).toBe("success");
    expect(result.succeededCount).toBe(1);
    expect(result.failedCount).toBe(0);
    expect(readItem("user_1", "mutation_success").status).toBe("applied");
  });

  it("keeps failed request mutations in a retryable queue state", async () => {
    seedTaskMutation({ mutationId: "mutation_network" });
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
  });

  it("handles duplicate responses as safely succeeded", async () => {
    seedTaskMutation({ mutationId: "mutation_duplicate" });
    const postMutations = vi.fn(async (): Promise<TwelveWeekMutationBatchResponse> => ({
      duplicate: [
        {
          mutationId: "mutation_duplicate",
          type: "task_completed_changed",
          status: "duplicate",
        },
      ],
    }));

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
