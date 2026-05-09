import { describe, expect, it } from "vitest";

import { interpretWeeklyExecutionScore, WEEKLY_EXECUTION_TARGET } from "./weeklyExecutionInterpretation";

describe("interpretWeeklyExecutionScore", () => {
  it("uses 85 as the weekly execution target", () => {
    expect(WEEKLY_EXECUTION_TARGET).toBe(85);
  });

  it("returns 'strong' level for scores >= 85", () => {
    const result = interpretWeeklyExecutionScore(85);
    expect(result.level).toBe("strong");
    expect(result.suggestedWorkload).toBe("keep same");
    expect(result.headline).toContain("85/100");
  });

  it("returns 'okay' level for scores between 65 and 84", () => {
    const result = interpretWeeklyExecutionScore(84);
    expect(result.level).toBe("okay");
    expect(result.suggestedWorkload).toBe("keep same");
    expect(result.headline).toContain("84/100");
  });

  it("keeps 65 in the okay band", () => {
    const result = interpretWeeklyExecutionScore(65);
    expect(result.level).toBe("okay");
    expect(result.headline).toContain("65/100");
  });

  it("returns 'at_risk' level for scores below 65", () => {
    const result = interpretWeeklyExecutionScore(64);
    expect(result.level).toBe("at_risk");
    expect(result.suggestedWorkload).toBe("reduce slightly");
    expect(result.headline).toContain("64/100");
  });

  it("clamps scores below 0 to 0", () => {
    const result = interpretWeeklyExecutionScore(-50);
    expect(result.level).toBe("at_risk");
    expect(result.headline).toContain("0/100");
  });

  it("clamps scores above 100 to 100", () => {
    const result = interpretWeeklyExecutionScore(150);
    expect(result.level).toBe("strong");
    expect(result.headline).toContain("100/100");
  });

  it("handles non-finite values by treating them as 0", () => {
    const result = interpretWeeklyExecutionScore(Number.NaN);
    expect(result.level).toBe("at_risk");
    expect(result.headline).toContain("0/100");
  });

  it("provides actionable advice for at-risk weeks", () => {
    const result = interpretWeeklyExecutionScore(20);
    expect(result.advice.toLowerCase()).toContain("giảm");
  });

  it("provides momentum advice for strong weeks", () => {
    const result = interpretWeeklyExecutionScore(95);
    expect(result.advice.toLowerCase()).toMatch(/giữ nhịp|đẩy/);
  });

  it("does not include any user-supplied review text", () => {
    // Pure score-based output — verify no PII placeholders leak into copy
    const result = interpretWeeklyExecutionScore(75);
    expect(result.headline).not.toMatch(/\$\{|undefined|null/);
    expect(result.advice).not.toMatch(/\$\{|undefined|null/);
  });
});
