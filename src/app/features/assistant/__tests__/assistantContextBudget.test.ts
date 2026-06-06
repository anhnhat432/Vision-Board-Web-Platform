import { describe, expect, it } from "vitest";
import { buildContextBudgetReport, CONTEXT_PROMPT_LIMITS } from "../assistantContextBudget";
import type { AssistantContext } from "../buildAssistantContext";

function makeTasks(count: number): AssistantContext["todayTasks"] {
  return Array.from({ length: count }, (_, i) => ({ id: `task_${i}`, title: `Task ${i}`, done: false }));
}

function makeGoals(count: number): AssistantContext["goals"] {
  return Array.from({ length: count }, (_, i) => ({ id: `goal_${i}`, title: `Goal ${i}`, progress: 0 }));
}

function makeOverdue(count: number): AssistantContext["stuckSignals"]["overdueTasks"] {
  return Array.from({ length: count }, (_, i) => ({
    id: `late_${i}`,
    title: `Late ${i}`,
    scheduledDate: "2026-06-01",
    isCore: false,
  }));
}

const BASE: AssistantContext = {
  currentWeek: 1,
  weeksTotal: 12,
  goals: [],
  todayTasks: [],
  lastReflectionDate: null,
  feasibility: null,
  latestWeeklyReview: null,
  stuckSignals: { latestObstacle: null, missedCommitments: [], overdueOpenCount: 0, overdueTasks: [] },
  trend: { completionLast4Weeks: [], direction: "unknown" },
  streak: { daysWithCompletedTask: 0 },
  upcomingDeadlines: [],
  pageContext: { route: "/", currentStep: null, nextSuggestedStep: null, formDraft: {} },
};

describe("assistantContextBudget", () => {
  it("không trim khi dữ liệu dưới giới hạn", () => {
    const report = buildContextBudgetReport({ ...BASE, goals: makeGoals(2), todayTasks: makeTasks(3) });
    expect(report.goals).toEqual({ total: 2, included: 2, trimmed: 0 });
    expect(report.todayTasks).toEqual({ total: 3, included: 3, trimmed: 0 });
    expect(report.totalTrimmed).toBe(0);
  });

  it("trim đúng phần vượt giới hạn theo từng nhóm", () => {
    const report = buildContextBudgetReport({
      ...BASE,
      goals: makeGoals(5),
      todayTasks: makeTasks(8),
      stuckSignals: {
        latestObstacle: null,
        missedCommitments: ["a", "b", "c", "d", "e"],
        overdueOpenCount: 7,
        overdueTasks: makeOverdue(7),
      },
      retrievedKnowledge: Array.from({ length: 9 }, (_, i) => ({
        source: "task" as const,
        title: `t${i}`,
        snippet: `s${i}`,
        score: 1,
      })),
    });

    expect(report.goals.trimmed).toBe(5 - CONTEXT_PROMPT_LIMITS.goals);
    expect(report.todayTasks.trimmed).toBe(8 - CONTEXT_PROMPT_LIMITS.todayTasks);
    expect(report.overdueTasks.trimmed).toBe(7 - CONTEXT_PROMPT_LIMITS.overdueTasks);
    expect(report.missedCommitments.trimmed).toBe(5 - CONTEXT_PROMPT_LIMITS.missedCommitments);
    expect(report.retrievedKnowledge.trimmed).toBe(9 - CONTEXT_PROMPT_LIMITS.retrievedKnowledge);
    expect(report.totalTrimmed).toBeGreaterThan(0);
  });

  it("đánh dấu weeklyReview/memory included đúng", () => {
    const withExtras = buildContextBudgetReport({
      ...BASE,
      latestWeeklyReview: {
        weekNumber: 1,
        leadCompletionPercent: 50,
        mainObstacle: null,
        nextWeekPriority: null,
        workloadDecision: null,
        reviewedAt: null,
      },
      assistantMemory: {
        preferredCoachingStyle: "brief",
        userPreferences: [],
        recurringObstacles: [],
        rejectedPatterns: [],
        recentCorrections: [],
        oftenMissedTasks: [],
      },
    });
    expect(withExtras.weeklyReviewIncluded).toBe(true);
    expect(withExtras.memoryIncluded).toBe(true);

    expect(buildContextBudgetReport(BASE).weeklyReviewIncluded).toBe(false);
    expect(buildContextBudgetReport(BASE).memoryIncluded).toBe(false);
  });
});
