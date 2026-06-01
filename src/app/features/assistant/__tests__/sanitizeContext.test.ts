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
});
