import assert from "node:assert/strict";
import { describe, it } from "node:test";

function ensureBackendEnvForServiceImports(): void {
  process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/assistant-test";
  process.env.FIREBASE_PROJECT_ID ??= "assistant-test";
  process.env.FIREBASE_CLIENT_EMAIL ??= "firebase-admin@example.test";
  process.env.FIREBASE_PRIVATE_KEY ??= "-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----\\n";
  process.env.FRONTEND_ORIGIN ??= "http://localhost:5173";
}

describe("assistantService sanitizeContext", () => {
  it("bounds enriched assistant context before provider calls", async () => {
    ensureBackendEnvForServiceImports();
    const { sanitizeContext } = await import("../services/assistantService");

    const context = sanitizeContext({
      currentWeek: 2,
      weeksTotal: 12,
      goals: [],
      todayTasks: [],
      lastReflectionDate: null,
      route: "/12-week-system",
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

    assert.equal(context.feasibility?.readinessScore, 20);
    assert.equal(context.feasibility?.bottleneckLabel?.length, 200);
    assert.equal(context.latestWeeklyReview?.leadCompletionPercent, 100);
    assert.equal(context.latestWeeklyReview?.mainObstacle?.length, 200);
    assert.equal(context.stuckSignals.latestObstacle?.length, 200);
    assert.deepEqual(context.stuckSignals.missedCommitments, ["a", "b", "c"]);
    assert.equal(context.stuckSignals.overdueTasks.length, 5);
  });
});
