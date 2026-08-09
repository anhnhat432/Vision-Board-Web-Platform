import { describe, expect, it } from "vitest";
import type { PersonalCoachContext } from "@shared/personalCoachSchema";
import { getDeterministicCoachFallback } from "./getDeterministicCoachFallback";

function makeContext(overrides: Partial<PersonalCoachContext> = {}): PersonalCoachContext {
  const base: PersonalCoachContext = {
    goal: { id: "goal_1", title: "Ra mắt portfolio", outcome: "Portfolio đủ tốt để ứng tuyển" },
    cycle: { currentWeek: 3, totalWeeks: 12, phase: "active" },
    today: {
      date: "2026-08-09",
      primaryTask: {
        id: "task_primary",
        title: "Chốt case study",
        scheduledDate: "2026-08-09",
        isCore: true,
      },
      openTasks: [
        {
          id: "task_primary",
          title: "Chốt case study",
          scheduledDate: "2026-08-09",
          isCore: true,
        },
      ],
      scheduledCount: 2,
      completedCount: 1,
      allScheduledComplete: false,
    },
    week: {
      focus: "Hoàn thiện portfolio",
      completionToDate: 50,
      wholeWeekCompletion: 33,
      coreCompletionToDate: 50,
      overdueCount: 0,
      overdueTasks: [],
      carryOverCount: 0,
      checkInDays: 3,
      possibleCheckInDays: 7,
      reviewDueToday: false,
    },
    reflection: {
      weekNumber: 2,
      mainObstacle: "Deadline ở trường",
      reduceTactic: "Việc chỉnh màu không bắt buộc",
      workloadDecision: "reduce slightly",
    },
    deterministicInsights: [],
  };

  return {
    ...base,
    ...overrides,
    goal: { ...base.goal, ...overrides.goal },
    cycle: { ...base.cycle, ...overrides.cycle },
    today: { ...base.today, ...overrides.today },
    week: { ...base.week, ...overrides.week },
  };
}

describe("getDeterministicCoachFallback", () => {
  it("uses the canonical Daily Home primary task and respects workload reduction", () => {
    const recommendation = getDeterministicCoachFallback(makeContext());

    expect(recommendation.primaryAction).toEqual({ type: "open_task", taskId: "task_primary" });
    expect(recommendation.recommendation).toContain("Chốt case study");
    expect(recommendation.rationale.join(" ")).toMatch(/cốt lõi|ưu tiên tuần/i);
    expect(recommendation.rationale.join(" ")).toMatch(/giảm tải/i);
  });

  it("closes the day instead of inventing more work when all scheduled tasks are done", () => {
    const recommendation = getDeterministicCoachFallback(
      makeContext({
        today: {
          date: "2026-08-09",
          primaryTask: undefined,
          openTasks: [],
          scheduledCount: 2,
          completedCount: 2,
          allScheduledComplete: true,
        },
      }),
    );

    expect(recommendation.primaryAction).toEqual({ type: "open_today" });
    expect(recommendation.recommendation).toMatch(/không cần thêm việc mới/i);
  });

  it("offers one core overdue recovery action when today has no scheduled work", () => {
    const recommendation = getDeterministicCoachFallback(
      makeContext({
        today: {
          date: "2026-08-09",
          primaryTask: undefined,
          openTasks: [],
          scheduledCount: 0,
          completedCount: 0,
          allScheduledComplete: false,
        },
        week: {
          ...makeContext().week,
          overdueCount: 2,
          overdueTasks: [
            {
              id: "optional_late",
              title: "Chỉnh màu phụ",
              scheduledDate: "2026-08-07",
              isCore: false,
            },
            {
              id: "core_late",
              title: "Chốt phần mở đầu",
              scheduledDate: "2026-08-08",
              isCore: true,
            },
          ],
        },
      }),
    );

    expect(recommendation.primaryAction).toEqual({ type: "open_task", taskId: "core_late" });
    expect(recommendation.recommendation).toContain("Chốt phần mở đầu");
    expect(recommendation.recommendation).not.toContain("Chỉnh màu phụ");
  });

  it("promotes a due Weekly Review when no task needs recovery", () => {
    const recommendation = getDeterministicCoachFallback(
      makeContext({
        today: {
          date: "2026-08-09",
          primaryTask: undefined,
          openTasks: [],
          scheduledCount: 0,
          completedCount: 0,
          allScheduledComplete: false,
        },
        week: { ...makeContext().week, reviewDueToday: true },
      }),
    );

    expect(recommendation.primaryAction).toEqual({ type: "open_week_review" });
    expect(recommendation.recommendation).toMatch(/review/i);
  });

  it("routes to the current week plan when no actionable task or review exists", () => {
    const recommendation = getDeterministicCoachFallback(
      makeContext({
        today: {
          date: "2026-08-09",
          primaryTask: undefined,
          openTasks: [],
          scheduledCount: 0,
          completedCount: 0,
          allScheduledComplete: false,
        },
      }),
    );

    expect(recommendation.primaryAction).toEqual({ type: "open_week_plan" });
    expect(recommendation.recommendation).toMatch(/kế hoạch tuần/i);
  });

  it("keeps every fallback within the compact recommendation contract", () => {
    const recommendation = getDeterministicCoachFallback(makeContext());

    expect(recommendation.title.length).toBeLessThanOrEqual(80);
    expect(recommendation.recommendation.length).toBeLessThanOrEqual(320);
    expect(recommendation.rationale.length).toBeGreaterThanOrEqual(1);
    expect(recommendation.rationale.length).toBeLessThanOrEqual(3);
    expect(recommendation.rationale.every((item) => item.length <= 180)).toBe(true);
  });
});
