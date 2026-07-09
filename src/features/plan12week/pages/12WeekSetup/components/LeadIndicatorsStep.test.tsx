import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { LeadIndicatorDraft, TwelveWeekSetupDraft } from "../types";
import { LeadIndicatorsStep } from "./LeadIndicatorsStep";
import { LeadIndicatorsStepLab } from "./LeadIndicatorsStepLab";

function makeIndicator(overrides: Partial<LeadIndicatorDraft> = {}): LeadIndicatorDraft {
  return {
    id: overrides.id ?? "tactic_1",
    name: overrides.name ?? "Deep work",
    target: overrides.target ?? "2",
    unit: overrides.unit ?? "buổi",
    type: overrides.type ?? "core",
    cadence: overrides.cadence ?? "spread",
    commitment: overrides.commitment,
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

function StatefulLeadIndicatorsStep({
  initialDraft,
  onSubmit,
}: {
  initialDraft: TwelveWeekSetupDraft;
  onSubmit: (draft: TwelveWeekSetupDraft) => void;
}) {
  const [draft, setDraft] = useState(initialDraft);

  return (
    <>
      <LeadIndicatorsStep
        draft={draft}
        coreCount={draft.leadIndicators.filter((indicator) => indicator.type !== "optional").length}
        optionalCount={draft.leadIndicators.filter((indicator) => indicator.type === "optional").length}
        setupGuideSupport={null}
        setupGuideTemplate={null}
        selectedTemplate={null}
        weekOneTaskPreview={[]}
        weekOneTaskWarning={null}
        weekOneTaskGroups={[]}
        onAddIndicator={vi.fn()}
        onRemoveIndicator={vi.fn()}
        onIndicatorChange={(index, key, value) => {
          setDraft((previousDraft) => {
            const nextIndicators = [...previousDraft.leadIndicators];
            nextIndicators[index] = {
              ...nextIndicators[index],
              [key]: value,
            } as LeadIndicatorDraft;
            return { ...previousDraft, leadIndicators: nextIndicators };
          });
        }}
      />
      <button type="button" onClick={() => onSubmit(draft)}>
        Submit draft
      </button>
    </>
  );
}

function StatefulLeadIndicatorsStepLab({
  initialDraft,
  onSubmit,
}: {
  initialDraft: TwelveWeekSetupDraft;
  onSubmit: (draft: TwelveWeekSetupDraft) => void;
}) {
  const [draft, setDraft] = useState(initialDraft);

  return (
    <>
      <LeadIndicatorsStepLab
        draft={draft}
        showValidationErrors={false}
        coreCount={draft.leadIndicators.filter((indicator) => indicator.type !== "optional").length}
        optionalCount={draft.leadIndicators.filter((indicator) => indicator.type === "optional").length}
        setupGuideSupport={null}
        setupGuideTemplate={null}
        selectedTemplate={null}
        weekOneTaskPreview={[]}
        weekOneTaskWarning={null}
        weekOneTaskGroups={[]}
        onAddIndicator={vi.fn()}
        onRemoveIndicator={vi.fn()}
        onIndicatorChange={(index, key, value) => {
          setDraft((previousDraft) => {
            const nextIndicators = [...previousDraft.leadIndicators];
            nextIndicators[index] = {
              ...nextIndicators[index],
              [key]: value,
            } as LeadIndicatorDraft;
            return { ...previousDraft, leadIndicators: nextIndicators };
          });
        }}
      />
      <button type="button" onClick={() => onSubmit(draft)}>
        Submit lab draft
      </button>
    </>
  );
}

describe("LeadIndicatorsStep commitment model", () => {
  it("allows submitting with an empty optional commitment", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <StatefulLeadIndicatorsStep
        initialDraft={makeDraft([makeIndicator({ id: "a" }), makeIndicator({ id: "b", name: "Weekly review" })])}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getAllByText(/Để sau/).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Submit draft" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        leadIndicators: [
          expect.not.objectContaining({ commitment: expect.anything() }),
          expect.not.objectContaining({ commitment: expect.anything() }),
        ],
      }),
    );
  });

  it("saves a commitment object when one answer is filled", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <StatefulLeadIndicatorsStep
        initialDraft={makeDraft([makeIndicator({ id: "a" }), makeIndicator({ id: "b", name: "Weekly review" })])}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getAllByText("Cam kết với chính mình (tuỳ chọn)")[0]);
    await user.type(screen.getByLabelText("Tôi thực sự muốn điều này vì..."), "Tôi muốn giữ lời với chính mình.");
    await user.click(screen.getByRole("button", { name: "Submit draft" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        leadIndicators: [
          expect.objectContaining({
            commitment: expect.objectContaining({
              want: "Tôi muốn giữ lời với chính mình.",
              cost: "",
              means: "",
              tradeoff: "",
              reward: "",
              filledAt: expect.any(String),
            }),
          }),
          expect.any(Object),
        ],
      }),
    );
  });
});

describe("LeadIndicatorsStepLab Phase 1 polish", () => {
  it("associates empty tactic-name validation with the input", () => {
    const draft = makeDraft([makeIndicator({ id: "a", name: "" }), makeIndicator({ id: "b", name: "Weekly review" })]);

    render(
      <LeadIndicatorsStepLab
        draft={draft}
        showValidationErrors
        coreCount={2}
        optionalCount={0}
        setupGuideSupport={null}
        setupGuideTemplate={null}
        selectedTemplate={null}
        weekOneTaskPreview={[]}
        weekOneTaskWarning={null}
        weekOneTaskGroups={[]}
        onAddIndicator={vi.fn()}
        onRemoveIndicator={vi.fn()}
        onIndicatorChange={vi.fn()}
      />,
    );

    const nameInput = screen.getAllByLabelText("Tên việc")[0];
    expect(nameInput).toHaveAttribute("aria-invalid", "true");
    expect(nameInput).toHaveAttribute("aria-describedby", "tactic-name-error-0");
    expect(document.getElementById("tactic-name-error-0")).toHaveAttribute("role", "alert");
  });

  it("opens the first indicator commitment accordion by default and shows all commitment prompts", () => {
    const onSubmit = vi.fn();

    render(
      <StatefulLeadIndicatorsStepLab
        initialDraft={makeDraft([makeIndicator({ id: "a" }), makeIndicator({ id: "b", name: "Weekly review" })])}
        onSubmit={onSubmit}
      />,
    );

    const advancedButtons = screen.getAllByRole("button", { name: "Cài đặt nâng cao" });
    expect(advancedButtons[0]).toHaveAttribute("aria-expanded", "true");
    expect(advancedButtons[1]).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: /Thêm chỉ số/i })).toBeInTheDocument();

    expect(screen.getByLabelText("Tôi thực sự muốn điều này vì...")).toBeInTheDocument();
    expect(screen.getByLabelText("Tôi sẵn sàng trả giá gì...")).toBeInTheDocument();
    expect(screen.getByLabelText("Tôi sẽ làm thế nào (cụ thể)...")).toBeInTheDocument();
    expect(screen.getByLabelText("Tôi sẽ phải bỏ qua/giảm điều gì...")).toBeInTheDocument();
    expect(screen.getByLabelText("Tôi sẽ tự thưởng gì khi giữ được...")).toBeInTheDocument();
  });

  it("saves the selected lab commitment field without changing the draft shape", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <StatefulLeadIndicatorsStepLab
        initialDraft={makeDraft([makeIndicator({ id: "a" }), makeIndicator({ id: "b", name: "Weekly review" })])}
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByLabelText("Tôi sẽ tự thưởng gì khi giữ được..."), "Một buổi nghỉ không màn hình.");
    await user.click(screen.getByRole("button", { name: "Submit lab draft" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        leadIndicators: [
          expect.objectContaining({
            commitment: expect.objectContaining({
              want: "",
              cost: "",
              means: "",
              tradeoff: "",
              reward: "Một buổi nghỉ không màn hình.",
              filledAt: expect.any(String),
            }),
          }),
          expect.any(Object),
        ],
      }),
    );
  });
});
