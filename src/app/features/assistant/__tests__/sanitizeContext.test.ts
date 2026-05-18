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
      trend: {
        completionLast4Weeks: [10, 20, 30, 40, 50],
        direction: "up" as const,
      },
      streak: {
        daysWithCompletedTask: 500,
      },
      upcomingDeadlines: [
        { goalId: "g1", title: "Goal A", daysUntil: 5 },
        { goalId: "g2", title: "Goal B", daysUntil: -10 },
        { goalId: "g3", title: "Goal C", daysUntil: 500 },
        { goalId: "g4", title: "Goal D", daysUntil: 10 },
      ],
      pageContext: {
        route: "/smart-goal-setup".repeat(10),
        currentStep: "smart_goal_setup".repeat(10),
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
    expect(context.trend.completionLast4Weeks).toHaveLength(4);
    expect(context.trend.direction).toBe("up");
    expect(context.streak.daysWithCompletedTask).toBe(365);
    expect(context.upcomingDeadlines).toHaveLength(3);
    expect(context.upcomingDeadlines[0].daysUntil).toBe(5);
    expect(context.upcomingDeadlines[1].daysUntil).toBe(-10);
    expect(context.upcomingDeadlines[2].daysUntil).toBe(365);
    expect(context.pageContext.route).toHaveLength(80);
    expect(context.pageContext.currentStep).toHaveLength(80);
    expect(context.pageContext.nextSuggestedStep).toHaveLength(200);
    expect(context.pageContext.formDraft.smartGoalTitle).toHaveLength(200);
    expect(context.pageContext.formDraft.missingSmartGoalFields).toHaveLength(8);
    expect(context.pageContext.formDraft.feasibilityAnsweredCount).toBe(50);
    expect(context.pageContext.formDraft.goalCount).toBe(100);
    expect(context.pageContext.formDraft.goalsWithoutTwelveWeekPlan).toBe(100);
    expect(context.pageContext.formDraft.twelveWeekDraftSummary?.leadIndicatorCount).toBe(20);
    expect(context.pageContext.formDraft.twelveWeekDraftSummary?.personalConstraint).toHaveLength(200);
  });
});
