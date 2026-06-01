import { describe, expect, it } from "vitest";
import type { Task } from "../types/planTypes";
import { calculateLagScore, calculateLeadScore } from "./executionScore";

function makeTask(status: Task["status"]): Task {
  return {
    id: crypto.randomUUID(),
    title: "Weekly tactic",
    status,
  };
}

describe("calculateLeadScore", () => {
  it("returns 0 when there are no committed tasks", () => {
    expect(calculateLeadScore([])).toBe(0);
  });

  it("returns completed tasks divided by committed tasks", () => {
    const tasks = [makeTask("done"), makeTask("done"), makeTask("done"), makeTask("done"), makeTask("todo")];

    expect(calculateLeadScore(tasks)).toBe(80);
  });
});

describe("calculateLagScore", () => {
  it("compares current lag value against the expected cumulative target for the week", () => {
    expect(calculateLagScore({ target: 100, currentValue: 42 }, 6, 12)).toBe(84);
  });

  it("returns 0 when target is not positive", () => {
    expect(calculateLagScore({ target: 0, currentValue: 42 }, 6, 12)).toBe(0);
  });
});
