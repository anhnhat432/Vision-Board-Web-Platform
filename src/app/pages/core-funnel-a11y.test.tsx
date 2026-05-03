/**
 * Accessibility smoke tests for the core funnel's patched controls.
 *
 * Scope: only the controls that received a11y fixes in the audit pass. Each
 * test renders a small subset (no routing, no storage) and asserts accessible
 * name / aria relationships via Testing Library. These tests are intentionally
 * narrow to avoid coupling to business logic.
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createRef } from "react";

import { Card, CardHeader, CardTitle } from "../components/ui/card";
import { FeasibilityStepShell } from "./FeasibilityCheck/components/FeasibilityStepShell";
import { LeadIndicatorsStep } from "./12WeekSetup/components/LeadIndicatorsStep";
import { MeasurableStep } from "./SMARTGoalSetup/components/MeasurableStep";
import { SmartGoalStepShell } from "./SMARTGoalSetup/components/SmartGoalStepShell";
import { SpecificStep } from "./SMARTGoalSetup/components/SpecificStep";
import type { Question } from "./FeasibilityCheck/types";
import type { LeadIndicatorDraft, TwelveWeekSetupDraft } from "./12WeekSetup/types";
import type { SMARTData, SmartStepDefinition } from "./SMARTGoalSetup/types";

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

describe("FeasibilityStepShell — a11y", () => {
  const question: Question = {
    id: 1,
    axis: "time",
    axisLabel: "Thời gian",
    question: "Bạn có bao nhiêu giờ mỗi tuần để tập trung vào mục tiêu này?",
    helper: "Tính giờ thực tế, không phải giờ lý tưởng.",
    options: [
      { value: "low", label: "Dưới 3 giờ", score: 1, diagnostic: "" },
      { value: "mid", label: "3-6 giờ", score: 2, diagnostic: "" },
    ],
  };

  it("binds the radio group to the question heading via aria-labelledby", () => {
    const headingRef = createRef<HTMLHeadingElement>();
    const targetRef = createRef<HTMLDivElement>();
    render(
      <FeasibilityStepShell
        currentQuestion={question}
        currentStep={0}
        totalSteps={5}
        selectedAnswer={undefined}
        onAnswerChange={() => {}}
        onBack={() => {}}
        onNext={() => {}}
        targetRef={targetRef}
        headingRef={headingRef}
      />,
    );
    const group = screen.getByRole("radiogroup");
    const labelledBy = group.getAttribute("aria-labelledby");
    expect(labelledBy).toBe("feasibility-question-1");
    const heading = document.getElementById(labelledBy ?? "");
    expect(heading?.textContent).toContain("Bạn có bao nhiêu giờ");
  });

  it("describes the radio group with the helper hint", () => {
    const headingRef = createRef<HTMLHeadingElement>();
    const targetRef = createRef<HTMLDivElement>();
    render(
      <FeasibilityStepShell
        currentQuestion={question}
        currentStep={0}
        totalSteps={5}
        selectedAnswer={undefined}
        onAnswerChange={() => {}}
        onBack={() => {}}
        onNext={() => {}}
        targetRef={targetRef}
        headingRef={headingRef}
      />,
    );
    const group = screen.getByRole("radiogroup");
    const describedBy = group.getAttribute("aria-describedby");
    expect(describedBy).toBe("feasibility-question-1-helper");
    const helper = document.getElementById(describedBy ?? "");
    expect(helper?.textContent).toContain("giờ thực tế");
  });
});

describe("SmartGoalStepShell — a11y", () => {
  const step: SmartStepDefinition = {
    key: "specific",
    label: "Cụ thể",
    title: "Bạn muốn đạt điều gì?",
    description: "",
    coaching: "",
    placeholder: "",
    completionHint: "",
  };

  it("gives the 'Dùng gợi ý' button a step-specific accessible name", () => {
    const headingRef = createRef<HTMLHeadingElement>();
    render(
      <SmartGoalStepShell
        stepIndex={0}
        totalSteps={5}
        step={step}
        headingRef={headingRef}
        starterPreview="Một ví dụ ngắn."
        clarityItems={[]}
        clarityDoneCount={0}
        clarityProgress={0}
        summaryRows={[]}
        showReview={false}
        currentStepError={null}
        currentStepSoftWarning={null}
        isCurrentStepValid={false}
        qualityFeedback={null}
        onApplyStarter={() => {}}
        onJumpToStep={() => {}}
        onBack={() => {}}
        onNext={() => {}}
      >
        <div />
      </SmartGoalStepShell>,
    );
    const button = screen.getByRole("button", { name: /Dùng gợi ý cho bước Cụ thể/i });
    expect(button).toBeInTheDocument();
  });
});

describe("SpecificStep — a11y", () => {
  it("links textarea to the hint and counter via aria-describedby", () => {
    const setSmartData = vi.fn();
    render(
      <SpecificStep
        smartData={makeSmartData()}
        setSmartData={setSmartData}
        placeholder="Ví dụ..."
        showError={false}
      />,
    );
    const textarea = screen.getByLabelText("Câu trả lời của bạn");
    const describedBy = textarea.getAttribute("aria-describedby") ?? "";
    expect(describedBy.split(/\s+/)).toEqual(
      expect.arrayContaining(["smart-specific-hint", "smart-specific-counter"]),
    );
    expect(document.getElementById("smart-specific-hint")?.textContent).toMatch(/kiểm chứng/i);
    expect(document.getElementById("smart-specific-counter")?.textContent).toMatch(/ký tự/i);
  });
});

describe("MeasurableStep — a11y", () => {
  it("associates the metric-name hint via aria-describedby", () => {
    const setSmartData = vi.fn();
    render(
      <MeasurableStep
        smartData={makeSmartData()}
        setSmartData={setSmartData}
        currentStepHasDraftContent={false}
      />,
    );
    const input = screen.getByLabelText("Con số hoặc dấu hiệu theo dõi");
    expect(input.getAttribute("aria-describedby")).toBe("smart-metric-name-hint");
    expect(document.getElementById("smart-metric-name-hint")?.textContent).toMatch(
      /tiến lên hay đứng yên/i,
    );
  });
});

function makeIndicatorDraft(overrides: Partial<LeadIndicatorDraft> = {}): LeadIndicatorDraft {
  return {
    id: overrides.id ?? "tactic_1",
    name: overrides.name ?? "",
    target: overrides.target ?? "",
    unit: overrides.unit ?? "",
    type: overrides.type ?? "core",
    cadence: overrides.cadence ?? "spread",
  };
}

function makeSetupDraft(indicators: LeadIndicatorDraft[]): TwelveWeekSetupDraft {
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

describe("LeadIndicatorsStep — a11y", () => {
  it("gives the per-indicator remove button an index-scoped accessible name", () => {
    const draft = makeSetupDraft([
      makeIndicatorDraft({ id: "a", name: "Viết draft" }),
      makeIndicatorDraft({ id: "b", name: "" }),
      makeIndicatorDraft({ id: "c", name: "Tập gym" }),
    ]);
    render(
      <LeadIndicatorsStep
        draft={draft}
        coreCount={3}
        optionalCount={0}
        setupGuideSupport={null}
        setupGuideTemplate={null}
        selectedTemplate={null}
        weekOneTaskPreview={[]}
        weekOneTaskWarning={null}
        weekOneTaskGroups={[]}
        onAddIndicator={() => {}}
        onRemoveIndicator={() => {}}
        onIndicatorChange={() => {}}
      />,
    );
    // Named indicator: includes name
    expect(screen.getByRole("button", { name: /Xóa việc 1: Viết draft/i })).toBeInTheDocument();
    // Unnamed indicator: just the index
    expect(screen.getByRole("button", { name: /^Xóa việc 2$/i })).toBeInTheDocument();
  });

  it("surfaces the week-1 warning with a non-color signal (role + text prefix)", () => {
    const draft = makeSetupDraft([
      makeIndicatorDraft({ id: "a", name: "Viết" }),
      makeIndicatorDraft({ id: "b", name: "Tập" }),
    ]);
    render(
      <LeadIndicatorsStep
        draft={draft}
        coreCount={2}
        optionalCount={0}
        setupGuideSupport={null}
        setupGuideTemplate={null}
        selectedTemplate={null}
        weekOneTaskPreview={[]}
        weekOneTaskWarning="Lịch tuần đầu đang quá dày."
        weekOneTaskGroups={[]}
        onAddIndicator={() => {}}
        onRemoveIndicator={() => {}}
        onIndicatorChange={() => {}}
      />,
    );
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(/Cảnh báo:/);
    expect(status).toHaveTextContent("Lịch tuần đầu đang quá dày.");
  });
});

describe("Card heading semantics — a11y", () => {
  it("renders CardTitle as h3 so it does not skip heading levels under a step h2", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Tựa thẻ mẫu</CardTitle>
        </CardHeader>
      </Card>,
    );
    const heading = screen.getByRole("heading", { name: "Tựa thẻ mẫu" });
    expect(heading.tagName).toBe("H3");
  });
});
