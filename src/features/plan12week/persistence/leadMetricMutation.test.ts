import { beforeEach, describe, expect, it } from "vitest";

import type { TwelveWeekSystem } from "@/app/utils/storage-types";
import { listStoredPendingMutations } from "./mutationQueue";
import { buildLeadMetricUpsertedPayloads, enqueueLeadMetricUpsertedMutations } from "./leadMetricMutation";

function createSystem(): TwelveWeekSystem {
  return {
    goalType: "Career",
    vision12Week: "Ship a focused plan",
    lagMetric: {
      name: "Published drafts",
      unit: "drafts",
      target: "3",
      currentValue: "1",
    },
    leadIndicators: [
      {
        id: "lead_write",
        name: "Write",
        target: "3",
        unit: "sessions/week",
        type: "core",
        priority: 1,
        schedule: [1, 3, 5],
      },
    ],
    milestones: {
      week4: "Outline",
      week8: "Draft",
      week12: "Publish",
    },
    successEvidence: "Public page is live",
    reviewDay: "Sunday",
    week12Outcome: "Publish",
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
      {
        weekNumber: 2,
        phaseName: "Build",
        focus: "Publish",
        milestone: "Second draft",
        completed: false,
      },
    ],
    taskInstances: [
      {
        id: "task_1",
        weekNumber: 1,
        scheduledDate: "2026-04-30",
        title: "Draft outline",
        leadIndicatorName: "Write",
        tacticId: "lead_write",
        isCore: true,
        completed: true,
      },
      {
        id: "task_2",
        weekNumber: 1,
        scheduledDate: "2026-05-01",
        title: "Draft intro",
        leadIndicatorName: "Write",
        tacticId: "lead_write",
        isCore: true,
        completed: false,
      },
    ],
    dailyCheckIns: [],
    weeklyReviews: [],
    scoreboard: [],
  };
}

describe("lead metric mutation sidecar", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("builds minimal lead metric payloads without local-only data", () => {
    const payloads = buildLeadMetricUpsertedPayloads("goal_1", createSystem(), "manual_update", {
      now: "2026-04-30T00:00:00.000Z",
    });

    expect(payloads).toHaveLength(2);
    expect(payloads[0]).toEqual(
      expect.objectContaining({
        clientPlanId: "goal_1:12-week-system",
        clientWeekId: "goal_1:week:1",
        clientMetricId: "goal_1:week:1:metric:lead_write",
        leadIndicatorId: "lead_write",
        name: "Write",
        weeklyTarget: 3,
        currentValue: 1,
      }),
    );
    expect(JSON.stringify(payloads)).not.toContain("dailyCheckIns");
    expect(JSON.stringify(payloads)).not.toContain("weeklyReviews");
    expect(JSON.stringify(payloads)).not.toContain("billing");
    expect(JSON.stringify(payloads)).not.toContain("analytics");
  });

  it("enqueues only the changed metric scope after a local save", () => {
    const count = enqueueLeadMetricUpsertedMutations("goal_1", createSystem(), "task_progress", {
      weekNumbers: [1],
      indicatorIds: ["lead_write"],
      now: "2026-04-30T00:00:00.000Z",
    });
    const pending = listStoredPendingMutations(null, {
      storage: localStorage,
      now: "2026-04-30T00:01:00.000Z",
    });

    expect(count).toBe(1);
    expect(pending).toHaveLength(1);
    expect(pending[0]).toEqual(expect.objectContaining({ kind: "lead_metric_upserted", goalId: "goal_1" }));
    if (pending[0]?.kind === "lead_metric_upserted") {
      expect(pending[0].payload.reason).toBe("task_progress");
      expect(pending[0].payload.clientMetricId).toBe("goal_1:week:1:metric:lead_write");
      expect(pending[0].payload.currentValue).toBe(1);
    }
  });
});
