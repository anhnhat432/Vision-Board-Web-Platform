/**
 * Integration smoke for the per-step archetype example panel inside the
 * SMART goal step components. We render each step in isolation with a
 * concrete `intentArchetype` and assert that the right example variant
 * appears, then assert the panel is *absent* when archetype is null.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MeasurableStep } from "./MeasurableStep";
import { SpecificStep } from "./SpecificStep";
import type { SMARTData } from "../types";

function makeSmartData(overrides: Partial<SMARTData> = {}): SMARTData {
  return {
    specific: { goal_statement: "" },
    measurable: { metric_name: "", baseline_value: "", target_value: "" },
    achievable: { weekly_time_commitment_hours: "", required_skills: "", support_resources: "" },
    relevant: { motivation_reason: "", life_dimension_alignment: "" },
    timeBound: { mode: "weeks", target_date: "", target_weeks: "" },
    ...overrides,
  };
}

describe("SpecificStep — archetype examples", () => {
  it("shows the goal-variant example panel when intentArchetype is concrete", () => {
    const setSmartData = vi.fn();
    render(
      <SpecificStep
        smartData={makeSmartData()}
        setSmartData={setSmartData}
        placeholder="Ví dụ..."
        showError={false}
        intentArchetype="exam_study"
      />,
    );
    const panel = screen.getByTestId("goal-archetype-examples");
    expect(panel.getAttribute("data-variant")).toBe("goal");
    expect(panel.getAttribute("data-archetype")).toBe("exam_study");
  });

  it("hides the panel when intentArchetype is null", () => {
    const setSmartData = vi.fn();
    render(
      <SpecificStep
        smartData={makeSmartData()}
        setSmartData={setSmartData}
        placeholder="Ví dụ..."
        showError={false}
        intentArchetype={null}
      />,
    );
    expect(screen.queryByTestId("goal-archetype-examples")).toBeNull();
  });

  it("hides the panel for the 'other' archetype (generic fallback)", () => {
    const setSmartData = vi.fn();
    render(
      <SpecificStep
        smartData={makeSmartData()}
        setSmartData={setSmartData}
        placeholder="Ví dụ..."
        showError={false}
        intentArchetype="other"
      />,
    );
    expect(screen.queryByTestId("goal-archetype-examples")).toBeNull();
  });
});

describe("MeasurableStep — archetype examples", () => {
  it("shows the metric-variant example panel when intentArchetype is concrete", () => {
    const setSmartData = vi.fn();
    render(
      <MeasurableStep
        smartData={makeSmartData()}
        setSmartData={setSmartData}
        currentStepHasDraftContent={false}
        intentArchetype="financial_goal"
      />,
    );
    const panel = screen.getByTestId("goal-archetype-examples");
    expect(panel.getAttribute("data-variant")).toBe("metric");
    expect(panel.getAttribute("data-archetype")).toBe("financial_goal");
  });

  it("hides the panel when intentArchetype is omitted (backwards compat)", () => {
    const setSmartData = vi.fn();
    render(
      <MeasurableStep
        smartData={makeSmartData()}
        setSmartData={setSmartData}
        currentStepHasDraftContent={false}
      />,
    );
    expect(screen.queryByTestId("goal-archetype-examples")).toBeNull();
  });
});
