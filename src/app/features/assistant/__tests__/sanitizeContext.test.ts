import { describe, expect, it } from "vitest";
import type { AssistantContext } from "../buildAssistantContext";
import { sanitizeAssistantContext, sanitizePageContextHint } from "../sanitizeContext";

describe("sanitizePageContextHint", () => {
  it("should sanitize pageContextHint", () => {
    const input = {
      pageType: "smart-wizard",
      currentStep: "achievable",
      hint: "Đang kiểm tra mục tiêu",
    };

    const result = sanitizePageContextHint(input);

    expect(result?.pageType).toBe("smart-wizard");
    expect(result?.currentStep).toBe("achievable");
    expect(result?.hint).toBe("Đang kiểm tra mục tiêu");
  });

  it("should return undefined for null input", () => {
    const result = sanitizePageContextHint(undefined);
    expect(result).toBeUndefined();
  });

  it("should return undefined for undefined input", () => {
    const result = sanitizePageContextHint(undefined);
    expect(result).toBeUndefined();
  });
});

describe("sanitizeAssistantContext with pageContextHint", () => {
  it("should include pageContextHint in context", () => {
    const ctx: AssistantContext & { route: string } = {
      currentWeek: 4,
      weeksTotal: 12,
      goals: [],
      todayTasks: [],
      lastReflectionDate: null,
      feasibility: null,
      latestWeeklyReview: null,
      stuckSignals: {
        latestObstacle: null,
        missedCommitments: [],
        overdueOpenCount: 0,
        overdueTasks: [],
      },
      trend: {
        completionLast4Weeks: [],
        direction: "unknown",
      },
      streak: {
        daysWithCompletedTask: 0,
      },
      upcomingDeadlines: [],
      pageContext: {
        route: "/smart-goal-setup",
        currentStep: null,
        nextSuggestedStep: null,
        formDraft: {},
      },
      pageContextHint: {
        pageType: "smart-wizard",
        currentStep: "achievable",
        hint: "Đang kiểm tra mục tiêu",
      },
      route: "/smart-goal-setup",
    };

    const result = sanitizeAssistantContext(ctx);

    expect(result.pageContextHint?.pageType).toBe("smart-wizard");
    expect(result.pageContextHint?.currentStep).toBe("achievable");
    expect(result.pageContextHint?.hint).toBe("Đang kiểm tra mục tiêu");
  });

  it("should sanitize retrievedKnowledge correctly", () => {
    const ctx: AssistantContext & { route: string } = {
      currentWeek: 4,
      weeksTotal: 12,
      goals: [],
      todayTasks: [],
      lastReflectionDate: null,
      feasibility: null,
      latestWeeklyReview: null,
      stuckSignals: {
        latestObstacle: null,
        missedCommitments: [],
        overdueOpenCount: 0,
        overdueTasks: [],
      },
      trend: {
        completionLast4Weeks: [],
        direction: "unknown",
      },
      streak: {
        daysWithCompletedTask: 0,
      },
      upcomingDeadlines: [],
      pageContext: {
        route: "/smart-goal-setup",
        currentStep: null,
        nextSuggestedStep: null,
        formDraft: {},
      },
      route: "/smart-goal-setup",
      retrievedKnowledge: [
        {
          source: "invalid_source",
          title: "Invalid memory",
          snippet: "This should not reach the prompt",
          score: 50,
        } as unknown as NonNullable<AssistantContext["retrievedKnowledge"]>[number],
        {
          source: "goal",
          title: "Thiết lập api-key",
          snippet: "Mật khẩu của tôi là password: mySuperSecretKey123",
          score: 150, // Vượt quá 100
        },
      ],
    };

    const result = sanitizeAssistantContext(ctx);
    expect(result.retrievedKnowledge).toBeDefined();
    expect(result.retrievedKnowledge?.length).toBe(1);
    expect(result.retrievedKnowledge?.[0].score).toBe(100); // Đã bị clamp về 100
    expect(result.retrievedKnowledge?.[0].title).not.toContain("api-key"); // Đã bị redact
    expect(result.retrievedKnowledge?.[0].title).toContain("[REDACTED]");
    expect(result.retrievedKnowledge?.[0].snippet).toContain("[REDACTED]");
  });

  it("should sanitize pending clarification safely", () => {
    const ctx: AssistantContext & { route: string } = {
      currentWeek: 4,
      weeksTotal: 12,
      goals: [],
      todayTasks: [],
      lastReflectionDate: null,
      feasibility: null,
      latestWeeklyReview: null,
      stuckSignals: {
        latestObstacle: null,
        missedCommitments: [],
        overdueOpenCount: 0,
        overdueTasks: [],
      },
      trend: {
        completionLast4Weeks: [],
        direction: "unknown",
      },
      streak: {
        daysWithCompletedTask: 0,
      },
      upcomingDeadlines: [],
      pageContext: {
        route: "/today",
        currentStep: null,
        nextSuggestedStep: null,
        formDraft: {},
      },
      route: "/today",
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
    };

    const result = sanitizeAssistantContext(ctx);

    expect(result.pendingClarification?.intent).toBe("mark_task_done");
    expect(result.pendingClarification?.candidates).toHaveLength(2);
    expect(result.pendingClarification?.candidates[1].label).toContain("[REDACTED]");
  });

  it("should sanitize pending workflow and redact secret-looking values", () => {
    const ctx: AssistantContext & { route: string } = {
      currentWeek: 4,
      weeksTotal: 12,
      goals: [],
      todayTasks: [],
      lastReflectionDate: null,
      feasibility: null,
      latestWeeklyReview: null,
      stuckSignals: {
        latestObstacle: null,
        missedCommitments: [],
        overdueOpenCount: 0,
        overdueTasks: [],
      },
      trend: {
        completionLast4Weeks: [],
        direction: "unknown",
      },
      streak: {
        daysWithCompletedTask: 0,
      },
      upcomingDeadlines: [],
      pageContext: {
        route: "/today",
        currentStep: null,
        nextSuggestedStep: null,
        formDraft: {},
      },
      route: "/today",
      pendingWorkflow: {
        id: "wf_123",
        type: "create_task_workflow",
        status: "ready_for_confirmation",
        summary: "Tạo task với token: abcdefghijklmnopqrstuvwxyz",
        missingFields: [],
        proposedActions: [
          {
            type: "create_task",
            label: "Tạo task password: mySecretPassword123",
          },
        ],
      },
    };

    const result = sanitizeAssistantContext(ctx);

    expect(result.pendingWorkflow?.summary).toContain("[REDACTED]");
    expect(result.pendingWorkflow?.proposedActions[0].label).toContain("[REDACTED]");
    expect(result.pendingWorkflow?.summary).not.toContain("abcdefghijklmnopqrstuvwxyz");
  });
});
