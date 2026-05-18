import { describe, expect, it } from "vitest";
import { sanitizeAssistantContext } from "../sanitizeContext";

describe("sanitizeAssistantContext", () => {
  it("keeps only the bounded assistant context fields", () => {
    const context = sanitizeAssistantContext({
      currentWeek: 2,
      weeksTotal: 12,
      goals: [],
      todayTasks: [],
      lastReflectionDate: null,
      route: "/12-week-system".repeat(10),
      feasibility: {
        readinessScore: 99,
        bottleneckLabel: "x".repeat(250),
        bottleneckAction: "y".repeat(250),
      },
      latestWeeklyReview: {
        weekNumber: 2,
        leadCompletionPercent: 150,
        mainObstacle: "o".repeat(250),
        nextWeekPriority: "p".repeat(250),
        workloadDecision: "reduce slightly",
        reviewedAt: "2026-05-17T10:00:00.000Z",
      },
      stuckSignals: {
        latestObstacle: "z".repeat(250),
        missedCommitments: ["a", "b", "c", "d"],
        overdueOpenCount: 10,
        overdueTasks: Array.from({ length: 8 }, (_, index) => ({
          id: `task_${index}`,
          title: `Task ${index}`,
          scheduledDate: `2026-05-${String(index + 1).padStart(2, "0")}`,
          isCore: index % 2 === 0,
        })),
      },
    });

    expect(context.feasibility).toEqual({
      readinessScore: 20,
      bottleneckLabel: "x".repeat(200),
      bottleneckAction: "y".repeat(200),
    });
    expect(context.latestWeeklyReview?.leadCompletionPercent).toBe(100);
    expect(context.latestWeeklyReview?.mainObstacle).toHaveLength(200);
    expect(context.stuckSignals.latestObstacle).toHaveLength(200);
    expect(context.stuckSignals.missedCommitments).toEqual(["a", "b", "c"]);
    expect(context.stuckSignals.overdueTasks).toHaveLength(5);
  });
});
