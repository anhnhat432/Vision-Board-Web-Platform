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
      pageContext: {
        route: "/12-week-setup",
        currentStep: "twelve_week_setup",
        nextSuggestedStep: "n".repeat(250),
        formDraft: {
          focusArea: "Career",
          smartGoalTitle: "t".repeat(250),
          smartGoalMetric: "m".repeat(250),
          missingSmartGoalFields: ["specific", "measurable", "achievable", "relevant", "time_bound", "extra1", "extra2", "extra3", "extra4"],
          feasibilityAnsweredCount: 99,
          feasibilityBottleneck: "b".repeat(250),
          goalCount: 200,
          goalsWithoutTwelveWeekPlan: 150,
          activeGoalTitle: "a".repeat(250),
          twelveWeekDraftSummary: {
            leadIndicatorCount: 99,
            hasReviewDay: true,
            hasWeek12Outcome: false,
            hasLagMetric: true,
            tacticLoadPreference: "lighter",
            personalConstraint: "p".repeat(250),
          },
        },
      },
      pendingClarification: {
        kind: "task_selection",
        intent: "mark_task_done",
        question: "Bạn muốn tick task nào?",
        createdAt: "2026-06-04T10:00:00.000Z",
        expiresAt: "2026-06-04T10:15:00.000Z",
        candidates: [
          { id: "task_1", label: "Đọc sách" },
          { id: "task_2", label: "Check api-key: abcdefghijklmnopqrstuvwxyz" },
        ],
      },
    });

    assert.equal(context.feasibility?.readinessScore, 20);
    assert.equal(context.feasibility?.bottleneckLabel?.length, 200);
    assert.equal(context.latestWeeklyReview?.leadCompletionPercent, 100);
    assert.equal(context.latestWeeklyReview?.mainObstacle?.length, 200);
    assert.equal(context.stuckSignals.latestObstacle?.length, 200);
    assert.deepEqual(context.stuckSignals.missedCommitments, ["a", "b", "c"]);
    assert.equal(context.stuckSignals.overdueTasks.length, 5);
    assert.equal(context.pageContext.nextSuggestedStep?.length, 200);
    assert.equal(context.pageContext.formDraft.smartGoalTitle?.length, 200);
    assert.equal(context.pageContext.formDraft.missingSmartGoalFields?.length, 8);
    assert.equal(context.pageContext.formDraft.feasibilityAnsweredCount, 50);
    assert.equal(context.pageContext.formDraft.goalCount, 100);
    assert.equal(context.pageContext.formDraft.goalsWithoutTwelveWeekPlan, 100);
    assert.equal(context.pageContext.formDraft.twelveWeekDraftSummary?.leadIndicatorCount, 20);
    assert.equal(context.pageContext.formDraft.twelveWeekDraftSummary?.personalConstraint?.length, 200);
    assert.equal(context.pendingClarification?.candidates.length, 2);
    assert.match(context.pendingClarification?.candidates[1].label ?? "", /\[REDACTED\]/);
  });

  it("sanitizes pendingWorkflow safely and redacts sensitive data", async () => {
    ensureBackendEnvForServiceImports();
    const { sanitizeContext } = await import("../services/assistantService");

    const context = sanitizeContext({
      currentWeek: 2,
      weeksTotal: 12,
      goals: [],
      todayTasks: [],
      lastReflectionDate: null,
      route: "/today",
      pendingWorkflow: {
        id: "wf_123",
        type: "create_goal_workflow",
        status: "ready_for_confirmation",
        summary: "Tạo mục tiêu với key: api_key_12345678901234567890",
        missingFields: [],
        proposedActions: [
          {
            type: "create_goal",
            label: "Tạo mục tiêu với password: mypassword123",
          },
        ],
      },
    });

    assert.ok(context.pendingWorkflow);
    assert.equal(context.pendingWorkflow.id, "wf_123");
    assert.equal(context.pendingWorkflow.type, "create_goal_workflow");
    assert.equal(context.pendingWorkflow.status, "ready_for_confirmation");
    assert.ok(context.pendingWorkflow.summary.includes("[REDACTED]"));
    assert.ok(!context.pendingWorkflow.summary.includes("api_key_12345678901234567890"));
    assert.ok(context.pendingWorkflow.proposedActions[0].label.includes("[REDACTED]"));
    assert.ok(!context.pendingWorkflow.proposedActions[0].label.includes("mypassword123"));
  });

  it("drops malformed pendingWorkflow before provider calls", async () => {
    ensureBackendEnvForServiceImports();
    const { sanitizeContext } = await import("../services/assistantService");

    const badType = sanitizeContext({
      route: "/today",
      pendingWorkflow: {
        id: "wf_bad",
        type: "unknown_workflow",
        status: "ready_for_confirmation",
        summary: "bad",
        missingFields: [],
        proposedActions: [],
      },
    });

    const badStatus = sanitizeContext({
      route: "/today",
      pendingWorkflow: {
        id: "wf_bad",
        type: "create_task_workflow",
        status: "done",
        summary: "bad",
        missingFields: [],
        proposedActions: [],
      },
    });

    assert.equal(badType.pendingWorkflow, null);
    assert.equal(badStatus.pendingWorkflow, null);
  });
});

describe("assistantService sanitizeHistory", () => {
  it("bounds history to 6 messages and sanitizes content", async () => {
    ensureBackendEnvForServiceImports();
    const { sanitizeHistory } = await import("../services/assistantService");

    const history = sanitizeHistory([
      { role: "user" as const, content: "Hello" },
      { role: "assistant" as const, content: "Hi there" },
      { role: "user" as const, content: "What should I do?" },
      { role: "assistant" as const, content: "Check your tasks" },
      { role: "user" as const, content: "Okay thanks" },
      { role: "assistant" as const, content: "You're welcome" },
      { role: "user" as const, content: "One more thing" },
      { role: "assistant" as const, content: "Sure, what is it?" },
    ]);

    assert.equal(history.length, 6);
    assert.equal(history[0].role, "user");
    assert.equal(history[0].content, "What should I do?");
    assert.equal(history[5].role, "assistant");
    assert.equal(history[5].content, "Sure, what is it?");
  });

  it("truncates content over 500 characters", async () => {
    ensureBackendEnvForServiceImports();
    const { sanitizeHistory } = await import("../services/assistantService");

    const longContent = "x".repeat(600);
    const history = sanitizeHistory([
      { role: "user" as const, content: longContent },
    ]);

    assert.equal(history.length, 1);
    assert.equal(history[0].content.length, 500);
  });

  it("filters out invalid role values", async () => {
    ensureBackendEnvForServiceImports();
    const { sanitizeHistory } = await import("../services/assistantService");

    const history = sanitizeHistory([
      { role: "user" as const, content: "Hello" },
      { role: "system" as unknown as "user" | "assistant", content: "System message" },
      { role: "assistant" as const, content: "Hi" },
    ]);

    assert.equal(history.length, 2);
    assert.equal(history[0].role, "user");
    assert.equal(history[1].role, "assistant");
  });

  it("filters out empty content", async () => {
    ensureBackendEnvForServiceImports();
    const { sanitizeHistory } = await import("../services/assistantService");

    const history = sanitizeHistory([
      { role: "user" as const, content: "Hello" },
      { role: "assistant" as const, content: "" },
      { role: "assistant" as const, content: "   " },
      { role: "assistant" as const, content: "Hi" },
    ]);

    assert.equal(history.length, 2);
  });
});
