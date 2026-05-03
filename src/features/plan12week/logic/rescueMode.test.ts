import { describe, expect, it } from "vitest";

import {
  getRescueActionSuggestion,
  getRescueModeMessage,
  getRescueModeStatus,
  type RescueModeInput,
} from "./rescueMode";

const TODAY = "2026-05-10";

function makeInput(overrides: Partial<RescueModeInput> = {}): RescueModeInput {
  return {
    todayDateKey: overrides.todayDateKey ?? TODAY,
    currentWeek: overrides.currentWeek ?? 3,
    currentWeekRange: overrides.currentWeekRange ?? { start: "2026-05-04", end: "2026-05-10" },
    weekCompletionPercent: overrides.weekCompletionPercent ?? 80,
    overdueOpenCount: overrides.overdueOpenCount ?? 0,
    todayQueueCount: overrides.todayQueueCount,
    reviewDueToday: overrides.reviewDueToday ?? false,
    dailyCheckIns: overrides.dailyCheckIns ?? [{ date: TODAY }],
    weeklyReviews:
      overrides.weeklyReviews ??
      [
        { weekNumber: 1, reviewCompleted: true },
        { weekNumber: 2, reviewCompleted: true },
      ],
    taskInstances:
      overrides.taskInstances ??
      [
        { scheduledDate: "2026-05-08", completed: true, completedAt: TODAY },
        { scheduledDate: "2026-05-09", completed: false },
      ],
    startDate: overrides.startDate ?? "2026-04-26",
  };
}

describe("getRescueModeStatus — no rescue when on track", () => {
  it("returns severity 'none' and no triggers when all signals are healthy", () => {
    const status = getRescueModeStatus(makeInput());
    expect(status.severity).toBe("none");
    expect(status.triggers).toEqual([]);
  });

  it("does not trigger on a freshly created plan (cold start)", () => {
    const status = getRescueModeStatus(
      makeInput({
        todayDateKey: "2026-05-02",
        startDate: "2026-05-01",
        currentWeek: 1,
        weeklyReviews: [],
        weekCompletionPercent: 10,
        currentWeekRange: { start: "2026-05-01", end: "2026-05-07" },
        dailyCheckIns: [],
        taskInstances: [],
        overdueOpenCount: 0,
      }),
    );
    expect(status.severity).toBe("none");
  });
});

describe("getRescueModeStatus — overdue tasks trigger", () => {
  it("triggers gentle when 3-4 overdue tasks", () => {
    const status = getRescueModeStatus(makeInput({ overdueOpenCount: 3 }));
    expect(status.triggers).toContain("overdue-tasks");
    expect(status.severity).toBe("gentle");
  });

  it("triggers active when 5+ overdue tasks", () => {
    const status = getRescueModeStatus(makeInput({ overdueOpenCount: 6 }));
    expect(status.triggers).toContain("overdue-tasks");
    expect(status.severity).toBe("active");
  });

  it("does not trigger when only 2 overdue tasks", () => {
    const status = getRescueModeStatus(makeInput({ overdueOpenCount: 2 }));
    expect(status.triggers).not.toContain("overdue-tasks");
  });
});

describe("getRescueModeStatus — no-completion streak", () => {
  it("triggers gentle after 3 days without a completion", () => {
    const status = getRescueModeStatus(
      makeInput({
        taskInstances: [
          { scheduledDate: "2026-05-06", completed: true, completedAt: "2026-05-06" },
          { scheduledDate: "2026-05-09", completed: false },
        ],
      }),
    );
    expect(status.triggers).toContain("no-completion-streak");
    expect(status.daysSinceLastCompletion).toBe(4);
  });

  it("triggers active after 5+ days without a completion", () => {
    const status = getRescueModeStatus(
      makeInput({
        taskInstances: [
          { scheduledDate: "2026-05-04", completed: true, completedAt: "2026-05-04" },
        ],
      }),
    );
    expect(status.triggers).toContain("no-completion-streak");
    expect(status.daysSinceLastCompletion).toBe(6);
    expect(status.severity).toBe("active");
  });

  it("does not trigger if last completion is within 2 days", () => {
    const status = getRescueModeStatus(
      makeInput({
        taskInstances: [
          { scheduledDate: "2026-05-09", completed: true, completedAt: "2026-05-09" },
        ],
      }),
    );
    expect(status.triggers).not.toContain("no-completion-streak");
  });

  it("triggers gentle when no completion ever and plan is past cold start", () => {
    const status = getRescueModeStatus(
      makeInput({
        taskInstances: [{ scheduledDate: "2026-05-09", completed: false }],
        startDate: "2026-04-26",
      }),
    );
    expect(status.triggers).toContain("no-completion-streak");
  });
});

describe("getRescueModeStatus — missed daily check-ins", () => {
  it("triggers gentle prompt when 3+ days without a check-in", () => {
    const status = getRescueModeStatus(
      makeInput({
        dailyCheckIns: [{ date: "2026-05-06" }],
      }),
    );
    expect(status.triggers).toContain("missed-checkins");
    expect(status.severity).toBe("gentle");
    expect(status.daysSinceLastCheckIn).toBe(4);
  });

  it("does not trigger when last check-in is within 2 days", () => {
    const status = getRescueModeStatus(
      makeInput({
        dailyCheckIns: [{ date: "2026-05-09" }],
      }),
    );
    expect(status.triggers).not.toContain("missed-checkins");
  });

  it("triggers when no check-ins ever and plan is past cold start", () => {
    const status = getRescueModeStatus(
      makeInput({
        dailyCheckIns: [],
      }),
    );
    expect(status.triggers).toContain("missed-checkins");
  });
});

describe("getRescueModeStatus — low week completion near end", () => {
  it("triggers active when week is < 50% with ≤ 2 days remaining", () => {
    const status = getRescueModeStatus(
      makeInput({
        weekCompletionPercent: 40,
        currentWeekRange: { start: "2026-05-04", end: "2026-05-11" },
        todayDateKey: "2026-05-10", // 1 day remaining
      }),
    );
    expect(status.triggers).toContain("low-week-completion-near-end");
    expect(status.severity).toBe("active");
    expect(status.daysRemainingInWeek).toBe(1);
  });

  it("does not trigger early in the week even if completion is low", () => {
    const status = getRescueModeStatus(
      makeInput({
        weekCompletionPercent: 20,
        currentWeekRange: { start: "2026-05-04", end: "2026-05-11" },
        todayDateKey: "2026-05-05", // 6 days remaining
      }),
    );
    expect(status.triggers).not.toContain("low-week-completion-near-end");
  });

  it("does not trigger near end when week completion is healthy", () => {
    const status = getRescueModeStatus(
      makeInput({
        weekCompletionPercent: 70,
        currentWeekRange: { start: "2026-05-04", end: "2026-05-11" },
        todayDateKey: "2026-05-10",
      }),
    );
    expect(status.triggers).not.toContain("low-week-completion-near-end");
  });
});

describe("getRescueModeStatus — weekly review missed", () => {
  it("triggers gentle when previous week has no completed review", () => {
    const status = getRescueModeStatus(
      makeInput({
        currentWeek: 3,
        weeklyReviews: [{ weekNumber: 1, reviewCompleted: true }],
      }),
    );
    expect(status.triggers).toContain("weekly-review-missed");
  });

  it("does not trigger when on week 1", () => {
    const status = getRescueModeStatus(
      makeInput({
        currentWeek: 1,
        weeklyReviews: [],
      }),
    );
    expect(status.triggers).not.toContain("weekly-review-missed");
  });

  it("does not trigger when previous week review is completed", () => {
    const status = getRescueModeStatus(
      makeInput({
        currentWeek: 3,
        weeklyReviews: [
          { weekNumber: 1, reviewCompleted: true },
          { weekNumber: 2, reviewCompleted: true },
        ],
      }),
    );
    expect(status.triggers).not.toContain("weekly-review-missed");
  });
});

describe("getRescueModeStatus — severity escalation", () => {
  it("escalates to urgent when 3+ active/gentle triggers fire together", () => {
    const status = getRescueModeStatus(
      makeInput({
        overdueOpenCount: 6, // active
        weekCompletionPercent: 30, // active
        currentWeekRange: { start: "2026-05-04", end: "2026-05-11" },
        todayDateKey: "2026-05-10",
        dailyCheckIns: [{ date: "2026-05-05" }], // gentle
        weeklyReviews: [{ weekNumber: 1, reviewCompleted: true }], // missed week 2 → gentle
        taskInstances: [{ scheduledDate: "2026-05-04", completed: true, completedAt: "2026-05-04" }], // 6d → active
      }),
    );
    expect(status.severity).toBe("urgent");
    expect(status.triggers.length).toBeGreaterThanOrEqual(3);
  });
});

describe("getRescueModeMessage", () => {
  it("returns empty subtext when severity is none", () => {
    const status = getRescueModeStatus(makeInput());
    const message = getRescueModeMessage(status);
    expect(message.subtext).toBe("");
    expect(message.headline).toMatch(/giữ nhịp tốt/i);
  });

  it("returns non-judgmental gentle copy when severity is gentle", () => {
    const status = getRescueModeStatus(makeInput({ overdueOpenCount: 3 }));
    const message = getRescueModeMessage(status);
    expect(message.headline).toMatch(/tín hiệu nhỏ|một bước nhẹ/i);
    expect(message.subtext.length).toBeGreaterThan(0);
    // No raw task text should leak — just status/counters
    expect(message.subtext).not.toContain("task_");
  });

  it("returns active copy with day delta interpolated for no-completion-streak", () => {
    const status = getRescueModeStatus(
      makeInput({
        taskInstances: [
          { scheduledDate: "2026-05-04", completed: true, completedAt: "2026-05-04" },
        ],
      }),
    );
    const message = getRescueModeMessage(status);
    expect(message.subtext).toMatch(/6 ngày/);
  });
});

describe("getRescueActionSuggestion", () => {
  it("returns no suggestions when severity is none", () => {
    const status = getRescueModeStatus(makeInput());
    expect(getRescueActionSuggestion(status)).toEqual([]);
  });

  it("suggests at least one action when triggered", () => {
    const status = getRescueModeStatus(makeInput({ overdueOpenCount: 4 }));
    const suggestions = getRescueActionSuggestion(status);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.length).toBeLessThanOrEqual(3);
  });

  it("suggests 'pick-one-tiny-task' for overdue trigger", () => {
    const status = getRescueModeStatus(makeInput({ overdueOpenCount: 4 }));
    const suggestions = getRescueActionSuggestion(status);
    expect(suggestions.map((s) => s.id)).toContain("pick-one-tiny-task");
  });

  it("suggests 'quick-check-in' for missed-checkins trigger", () => {
    const status = getRescueModeStatus(
      makeInput({ dailyCheckIns: [{ date: "2026-05-06" }] }),
    );
    const suggestions = getRescueActionSuggestion(status);
    expect(suggestions.map((s) => s.id)).toContain("quick-check-in");
  });

  it("suggests 'review-plan' (don't abandon goal) for active+ severity", () => {
    const status = getRescueModeStatus(
      makeInput({
        overdueOpenCount: 6,
        weekCompletionPercent: 20,
        currentWeekRange: { start: "2026-05-04", end: "2026-05-11" },
        todayDateKey: "2026-05-10",
      }),
    );
    const suggestions = getRescueActionSuggestion(status);
    expect(suggestions.map((s) => s.id)).toContain("review-plan");
  });

  it("never returns more than 3 suggestions", () => {
    const status = getRescueModeStatus(
      makeInput({
        overdueOpenCount: 6,
        weekCompletionPercent: 20,
        currentWeekRange: { start: "2026-05-04", end: "2026-05-11" },
        todayDateKey: "2026-05-10",
        dailyCheckIns: [{ date: "2026-05-05" }],
        weeklyReviews: [{ weekNumber: 1, reviewCompleted: true }],
        taskInstances: [{ scheduledDate: "2026-05-04", completed: true, completedAt: "2026-05-04" }],
      }),
    );
    const suggestions = getRescueActionSuggestion(status);
    expect(suggestions.length).toBeLessThanOrEqual(3);
  });

  it("dedups suggestions when multiple triggers map to the same id", () => {
    const status = getRescueModeStatus(
      makeInput({
        overdueOpenCount: 4,
        weekCompletionPercent: 30,
        currentWeekRange: { start: "2026-05-04", end: "2026-05-11" },
        todayDateKey: "2026-05-10",
      }),
    );
    const suggestions = getRescueActionSuggestion(status);
    const ids = suggestions.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("Rescue mode — analytics safety", () => {
  it("does not surface any task title or check-in note in status output", () => {
    const status = getRescueModeStatus(
      makeInput({
        overdueOpenCount: 4,
        taskInstances: [
          { scheduledDate: "2026-05-04", completed: true, completedAt: "2026-05-04" },
        ],
        dailyCheckIns: [{ date: "2026-05-06" }],
      }),
    );
    const serialized = JSON.stringify(status);
    // Status should only contain enumerable id strings + counters.
    expect(serialized).not.toMatch(/task_|check_/);
    expect(serialized).not.toMatch(/scheduled|reflection|note/i);
  });

  it("message and suggestions only contain canned Vietnamese strings, no user content", () => {
    const status = getRescueModeStatus(
      makeInput({
        overdueOpenCount: 4,
        taskInstances: [
          { scheduledDate: "2026-05-04", completed: true, completedAt: "2026-05-04", },
        ],
      }),
    );
    const message = getRescueModeMessage(status);
    const suggestions = getRescueActionSuggestion(status);
    const combined = `${message.headline} ${message.subtext} ${suggestions
      .map((s) => `${s.title} ${s.hint}`)
      .join(" ")}`;
    // Sanity: outputs should not contain any of the test fixture identifiers.
    expect(combined).not.toMatch(/task_|2026-05-04/);
  });
});
