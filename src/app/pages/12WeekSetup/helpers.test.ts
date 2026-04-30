import { describe, expect, it } from "vitest";

import { TWELVE_WEEK_TEMPLATE_CATALOG } from "@/app/utils/twelve-week-premium";
import { buildLeadIndicatorSchedules, getPreviewTasks } from "./helpers";
import type { LeadIndicatorDraft, TwelveWeekSetupDraft } from "./types";

function makeIndicator(
  name: string,
  target = "4",
  type: LeadIndicatorDraft["type"] = "core",
  cadence: LeadIndicatorDraft["cadence"] = "spread",
): LeadIndicatorDraft {
  return {
    id: `indicator_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
    name,
    target,
    unit: "times/week",
    type,
    cadence,
  };
}

function getTotalScheduledTasks(indicators: Array<LeadIndicatorDraft & { schedule: number[] }>): number {
  return indicators.reduce((total, indicator) => total + indicator.schedule.length, 0);
}

function buildOptions(
  tacticLoadPreference: TwelveWeekSetupDraft["tacticLoadPreference"],
  dailyTimeBudget: string,
  preferredDays: number[] = [],
) {
  return {
    tacticLoadPreference,
    dailyTimeBudget,
    preferredDays,
  };
}

describe("12-week setup plan load guards", () => {
  it("keeps lighter plus low time budget to one weekly task per tactic", () => {
    const indicators = [
      makeIndicator("Focus block"),
      makeIndicator("Review"),
      makeIndicator("Outreach", "3", "optional"),
      makeIndicator("Recovery", "3", "optional"),
    ];

    const options = buildOptions("lighter", "30min");
    const scheduled = buildLeadIndicatorSchedules(indicators, options);

    expect(getTotalScheduledTasks(scheduled)).toBeLessThanOrEqual(4);
    expect(scheduled.every((indicator) => indicator.schedule.length <= 1)).toBe(true);
    expect(getPreviewTasks(indicators, options)).toHaveLength(4);
  });

  it("keeps balanced plans inside a reasonable weekly task count", () => {
    const indicators = [
      makeIndicator("Deep work", "3"),
      makeIndicator("Review loop", "3"),
      makeIndicator("Publish", "3", "optional"),
    ];

    const scheduled = buildLeadIndicatorSchedules(indicators, buildOptions("balanced", "1h"));

    expect(getTotalScheduledTasks(scheduled)).toBeLessThanOrEqual(5);
    expect(getTotalScheduledTasks(scheduled)).toBeGreaterThanOrEqual(indicators.length);
    expect(scheduled.every((indicator) => indicator.schedule.length <= 2)).toBe(true);
  });

  it("lets push plans stretch without creating extreme weekly overload", () => {
    const indicators = [
      makeIndicator("Draft", "7"),
      makeIndicator("Ship", "7"),
      makeIndicator("Follow up", "7", "optional"),
      makeIndicator("Measure", "7", "optional"),
    ];

    const scheduled = buildLeadIndicatorSchedules(indicators, buildOptions("push", "2h+"));

    expect(getTotalScheduledTasks(scheduled)).toBeLessThanOrEqual(6);
    expect(scheduled.every((indicator) => indicator.schedule.length <= 3)).toBe(true);
  });

  it("still creates usable schedules when preferred days are empty", () => {
    const scheduled = buildLeadIndicatorSchedules(
      [makeIndicator("Main work", "2"), makeIndicator("Review", "1")],
      buildOptions("balanced", "1h"),
    );

    expect(getTotalScheduledTasks(scheduled)).toBeGreaterThan(0);
    expect(scheduled.flatMap((indicator) => indicator.schedule).every((day) => day >= 0 && day <= 6)).toBe(true);
  });

  it("respects preferred days when the user selects them", () => {
    const scheduled = buildLeadIndicatorSchedules(
      [makeIndicator("Main work", "3"), makeIndicator("Review", "2")],
      buildOptions("push", "2h+", [1, 3]),
    );

    expect(scheduled.flatMap((indicator) => indicator.schedule).every((day) => day === 1 || day === 3)).toBe(true);
  });

  it("keeps both free and premium template tactics usable", () => {
    const freeTemplate = TWELVE_WEEK_TEMPLATE_CATALOG.find((template) => !template.requiredPlan);
    const premiumTemplate = TWELVE_WEEK_TEMPLATE_CATALOG.find((template) => template.requiredPlan);

    expect(freeTemplate).toBeDefined();
    expect(premiumTemplate).toBeDefined();

    for (const template of [freeTemplate, premiumTemplate]) {
      if (!template) continue;

      const indicators: LeadIndicatorDraft[] =
        template.tactics.map((tactic, index) => ({
          id: `${template.id}_${index}`,
          name: tactic.name,
          target: tactic.target,
          unit: tactic.unit,
          type: tactic.type,
          cadence: tactic.cadence,
        }));

      const scheduled = buildLeadIndicatorSchedules(indicators, buildOptions("balanced", "1h"));

      expect(getTotalScheduledTasks(scheduled)).toBeGreaterThan(0);
      expect(getTotalScheduledTasks(scheduled)).toBeLessThanOrEqual(5);
      expect(getPreviewTasks(indicators, buildOptions("balanced", "1h")).length).toBeGreaterThan(0);
    }
  });
});
