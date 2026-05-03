import { describe, expect, it } from "vitest";

import { interpretProgressTrend, type ProgressTrendInput } from "./progressNarrative";

function makeInput(overrides: Partial<ProgressTrendInput> = {}): ProgressTrendInput {
  return {
    currentWeek: overrides.currentWeek ?? 5,
    totalWeeks: overrides.totalWeeks ?? 12,
    currentWeekScore: overrides.currentWeekScore ?? 70,
    previousWeekScore: "previousWeekScore" in overrides ? (overrides.previousWeekScore ?? null) : 65,
    averageScore: overrides.averageScore ?? 68,
    reviewDoneCount: overrides.reviewDoneCount ?? 3,
    reviewDueToday: overrides.reviewDueToday ?? false,
    hasAnyTasks: overrides.hasAnyTasks ?? true,
  };
}

describe("interpretProgressTrend - no data state", () => {
  it("returns 'no_data' helpful copy when there are no tasks", () => {
    const result = interpretProgressTrend(
      makeInput({ hasAnyTasks: false, currentWeekScore: 0, reviewDoneCount: 0 }),
    );
    expect(result.level).toBe("no_data");
    expect(result.headline.toLowerCase()).toContain("chưa có dữ liệu");
    expect(result.advice.toLowerCase()).toContain("việc lặp lại");
    expect(result.nextAction.toLowerCase()).toContain("setup");
  });
});

describe("interpretProgressTrend - early state (week 1)", () => {
  it("does not shame the user when there is no review yet at week 1", () => {
    const result = interpretProgressTrend(
      makeInput({ currentWeek: 1, currentWeekScore: 0, previousWeekScore: null, reviewDoneCount: 0 }),
    );
    expect(result.level).toBe("early");
    expect(result.headline.toLowerCase()).toMatch(/mới bắt đầu|tập trung tuần này/);
    expect(result.advice.toLowerCase()).not.toContain("đuối");
    expect(result.nextAction.toLowerCase()).toContain("hôm nay");
  });
});

describe("interpretProgressTrend - low progress / at risk", () => {
  it("shows rescue guidance for low scores without judgment", () => {
    const result = interpretProgressTrend(makeInput({ currentWeekScore: 20, previousWeekScore: 40 }));
    expect(result.level).toBe("at_risk");
    expect(result.headline.toLowerCase()).toContain("đuối");
    expect(result.advice.toLowerCase()).toContain("đừng ép");
    expect(result.advice.toLowerCase()).toContain("cốt lõi");
  });

  it("recommends opening the Week tab when review is due and score is low", () => {
    const result = interpretProgressTrend(
      makeInput({ currentWeekScore: 20, reviewDueToday: true }),
    );
    expect(result.nextAction.toLowerCase()).toContain("review");
  });
});

describe("interpretProgressTrend - slowing", () => {
  it("flags 'slowing' headline when score drops vs last week", () => {
    const result = interpretProgressTrend(makeInput({ currentWeekScore: 55, previousWeekScore: 75 }));
    expect(result.level).toBe("slowing");
    expect(result.trendDirection).toBe("down");
    expect(result.headline.toLowerCase()).toContain("chậm");
  });

  it("flags 'slowing' for mid-tier score even without a previous week", () => {
    const result = interpretProgressTrend(
      makeInput({ currentWeekScore: 45, previousWeekScore: null }),
    );
    expect(result.level).toBe("slowing");
    expect(result.weekOverWeekDelta).toBeNull();
  });
});

describe("interpretProgressTrend - on track / reinforcement", () => {
  it("reinforces when score is high and improving", () => {
    const result = interpretProgressTrend(makeInput({ currentWeekScore: 85, previousWeekScore: 70 }));
    expect(result.level).toBe("on_track");
    expect(result.trendDirection).toBe("up");
    expect(result.headline.toLowerCase()).toContain("khá hơn");
    expect(result.advice.toLowerCase()).toContain("giữ");
  });

  it("reinforces when score is high and steady", () => {
    const result = interpretProgressTrend(makeInput({ currentWeekScore: 80, previousWeekScore: 78 }));
    expect(result.level).toBe("on_track");
    expect(result.trendDirection).toBe("flat");
    expect(result.headline.toLowerCase()).toContain("giữ nhịp tốt");
  });
});

describe("interpretProgressTrend - week-over-week delta", () => {
  it("computes positive delta correctly", () => {
    const result = interpretProgressTrend(makeInput({ currentWeekScore: 80, previousWeekScore: 60 }));
    expect(result.weekOverWeekDelta).toBe(20);
    expect(result.trendDirection).toBe("up");
  });

  it("computes negative delta correctly", () => {
    const result = interpretProgressTrend(makeInput({ currentWeekScore: 50, previousWeekScore: 70 }));
    expect(result.weekOverWeekDelta).toBe(-20);
    expect(result.trendDirection).toBe("down");
  });

  it("returns 'flat' for small delta within threshold", () => {
    const result = interpretProgressTrend(makeInput({ currentWeekScore: 70, previousWeekScore: 68 }));
    expect(result.trendDirection).toBe("flat");
    expect(result.weekOverWeekDelta).toBe(2);
  });

  it("returns null delta and 'n/a' direction when no previous week", () => {
    const result = interpretProgressTrend(makeInput({ currentWeekScore: 80, previousWeekScore: null }));
    expect(result.weekOverWeekDelta).toBeNull();
    expect(result.trendDirection).toBe("n/a");
  });
});

describe("interpretProgressTrend - score clamping", () => {
  it("clamps scores below 0 to 0", () => {
    const result = interpretProgressTrend(makeInput({ currentWeekScore: -50 }));
    expect(result.level).toBe("at_risk");
  });

  it("clamps scores above 100 to 100", () => {
    const result = interpretProgressTrend(makeInput({ currentWeekScore: 200 }));
    expect(result.level).toBe("on_track");
  });

  it("handles non-finite scores by treating them as 0", () => {
    const result = interpretProgressTrend(makeInput({ currentWeekScore: Number.NaN }));
    expect(result.level).toBe("at_risk");
  });
});

describe("interpretProgressTrend - analytics safety", () => {
  it("output strings never reference user-supplied review/task text", () => {
    const result = interpretProgressTrend(makeInput());
    // Defensive: ensure no template-string leakage and no "undefined" placeholders
    expect(result.headline).not.toMatch(/\$\{|undefined|null/);
    expect(result.advice).not.toMatch(/\$\{|undefined|null/);
    expect(result.nextAction).not.toMatch(/\$\{|undefined|null/);
  });

  it("level is always a recognised enum value", () => {
    const recognised = ["no_data", "early", "on_track", "slowing", "at_risk"] as const;
    for (const score of [0, 25, 45, 65, 85, 100]) {
      const result = interpretProgressTrend(makeInput({ currentWeekScore: score }));
      expect(recognised).toContain(result.level);
    }
  });
});
