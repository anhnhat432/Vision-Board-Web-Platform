/**
 * Integration smoke for the archetype example panel rendered by
 * `LeadIndicatorsStep` based on the user's stored onboarding intent.
 */

import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { LeadIndicatorsStep } from "./LeadIndicatorsStep";
import { setUserIntent } from "@/app/utils/user-intent";
import type { LeadIndicatorDraft, TwelveWeekSetupDraft } from "../types";

function makeIndicator(overrides: Partial<LeadIndicatorDraft> = {}): LeadIndicatorDraft {
  return {
    id: overrides.id ?? "tactic_1",
    name: overrides.name ?? "",
    target: overrides.target ?? "",
    unit: overrides.unit ?? "",
    type: overrides.type ?? "core",
    cadence: overrides.cadence ?? "spread",
  };
}

function makeDraft(indicators: LeadIndicatorDraft[]): TwelveWeekSetupDraft {
  return {
    templateId: "",
    goalType: "Project Completion",
    vision12Week: "",
    week12Outcome: "",
    lagMetricName: "",
    lagMetricTarget: "",
    lagMetricUnit: "",
    leadIndicators: indicators,
    startDate: "2026-05-04",
    reviewDay: "Sunday",
    tacticLoadPreference: "balanced",
    week4Milestone: "",
    week8Milestone: "",
    successEvidence: "",
    dailyTimeBudget: "",
    preferredDays: [],
    personalConstraint: "",
  };
}

const noop = () => {};

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe("LeadIndicatorsStep — archetype example panel", () => {
  it("renders the lead_indicator example panel when a concrete intent is stored", () => {
    setUserIntent("learn_skill");
    render(
      <LeadIndicatorsStep
        draft={makeDraft([makeIndicator({ id: "a", name: "" }), makeIndicator({ id: "b", name: "" })])}
        coreCount={2}
        optionalCount={0}
        setupGuideSupport={null}
        setupGuideTemplate={null}
        selectedTemplate={null}
        weekOneTaskPreview={[]}
        weekOneTaskWarning={null}
        weekOneTaskGroups={[]}
        onAddIndicator={noop}
        onRemoveIndicator={noop}
        onIndicatorChange={noop}
      />,
    );
    const panel = screen.getByTestId("goal-archetype-examples");
    expect(panel.getAttribute("data-variant")).toBe("lead_indicator");
    expect(panel.getAttribute("data-archetype")).toBe("skill_learning");
    expect(screen.getByTestId("goal-archetype-week1-starter")).toBeInTheDocument();
  });

  it("renders nothing when no intent has been stored (backwards compat)", () => {
    render(
      <LeadIndicatorsStep
        draft={makeDraft([makeIndicator({ id: "a", name: "" }), makeIndicator({ id: "b", name: "" })])}
        coreCount={2}
        optionalCount={0}
        setupGuideSupport={null}
        setupGuideTemplate={null}
        selectedTemplate={null}
        weekOneTaskPreview={[]}
        weekOneTaskWarning={null}
        weekOneTaskGroups={[]}
        onAddIndicator={noop}
        onRemoveIndicator={noop}
        onIndicatorChange={noop}
      />,
    );
    expect(screen.queryByTestId("goal-archetype-examples")).toBeNull();
  });

  it("renders nothing when stored intent is 'unsure' (no actionable archetype)", () => {
    setUserIntent("unsure");
    render(
      <LeadIndicatorsStep
        draft={makeDraft([makeIndicator({ id: "a", name: "" }), makeIndicator({ id: "b", name: "" })])}
        coreCount={2}
        optionalCount={0}
        setupGuideSupport={null}
        setupGuideTemplate={null}
        selectedTemplate={null}
        weekOneTaskPreview={[]}
        weekOneTaskWarning={null}
        weekOneTaskGroups={[]}
        onAddIndicator={noop}
        onRemoveIndicator={noop}
        onIndicatorChange={noop}
      />,
    );
    expect(screen.queryByTestId("goal-archetype-examples")).toBeNull();
  });

  it("marks the unit field invalid when a lead indicator has no unit", () => {
    render(
      <LeadIndicatorsStep
        draft={makeDraft([
          makeIndicator({ id: "a", name: "Deep work", target: "2", unit: "" }),
          makeIndicator({ id: "b", name: "Weekly review", target: "1", unit: "buổi" }),
        ])}
        coreCount={2}
        optionalCount={0}
        setupGuideSupport={null}
        setupGuideTemplate={null}
        selectedTemplate={null}
        weekOneTaskPreview={[]}
        weekOneTaskWarning={null}
        weekOneTaskGroups={[]}
        onAddIndicator={noop}
        onRemoveIndicator={noop}
        onIndicatorChange={noop}
      />,
    );

    expect(screen.getAllByLabelText("Đơn vị")[0]).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(/Gợi ý: lần, phút, trang, buổi/)).toBeInTheDocument();
  });
});
