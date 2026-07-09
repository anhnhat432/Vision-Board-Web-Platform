import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { TwelveWeekSetupDraft } from "../types";
import { ScheduleStep } from "./ScheduleStep";
import { ScheduleStepLab } from "./ScheduleStepLab";

function makeDraft(overrides: Partial<TwelveWeekSetupDraft> = {}): TwelveWeekSetupDraft {
  return {
    templateId: "",
    goalType: "Project Completion",
    vision12Week: "Ship a focused project",
    week12Outcome: "Launch beta",
    lagMetricName: "Published releases",
    lagMetricTarget: "1",
    lagMetricUnit: "release",
    leadIndicators: [],
    startDate: "2026-05-08",
    reviewDay: "Sunday",
    tacticLoadPreference: "balanced",
    week4Milestone: "",
    week8Milestone: "",
    successEvidence: "",
    dailyTimeBudget: "",
    preferredDays: [],
    personalConstraint: "",
    ...overrides,
  };
}

describe("ScheduleStep validation", () => {
  it("sets today as the minimum start date and marks a past start date invalid", () => {
    render(
      <ScheduleStep
        draft={makeDraft()}
        cycleStartDate="2026-05-04"
        cycleEndDate="2026-07-26"
        setupGuideSupport={null}
        setupGuideTemplate={null}
        hasPreviewTasks={false}
        weekOneTaskPreview={[]}
        weekOneTaskWarning={null}
        onChange={vi.fn()}
        todayDateKey="2026-05-09"
      />,
    );

    const startInput = screen.getByLabelText("Ngày bắt đầu chu kỳ");
    expect(startInput).toHaveAttribute("min", "2026-05-09");
    expect(startInput).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Ngày bắt đầu không được ở quá khứ")).toBeInTheDocument();
  });

  it("warns when the start date is more than 30 days in the future", () => {
    render(
      <ScheduleStep
        draft={makeDraft({ startDate: "2026-06-15" })}
        cycleStartDate="2026-06-15"
        cycleEndDate="2026-09-06"
        setupGuideSupport={null}
        setupGuideTemplate={null}
        hasPreviewTasks={false}
        weekOneTaskPreview={[]}
        weekOneTaskWarning={null}
        onChange={vi.fn()}
        todayDateKey="2026-05-09"
      />,
    );

    expect(screen.getByText("Ngày bắt đầu cách hiện tại hơn 30 ngày. Hãy chắc chắn đây là chủ ý.")).toBeInTheDocument();
  });
  it("keeps schedule labels readable and touch targets large in lab mode", () => {
    render(
      <ScheduleStepLab
        draft={makeDraft({
          reviewDay: "Monday",
          preferredDays: [0],
          leadIndicators: [
            {
              id: "indicator_1",
              name: "Viet outline phan mo dau that ro de khong bi cat chu tren mobile",
              target: "1",
              unit: "phien",
              type: "core",
              cadence: "spread",
            },
          ],
        })}
        cycleStartDate="2026-05-05"
        cycleEndDate="2026-07-27"
        setupGuideSupport={null}
        setupGuideTemplate={null}
        hasPreviewTasks
        weekOneTaskPreview={[]}
        weekOneTaskWarning={null}
        onChange={vi.fn()}
        todayDateKey="2026-05-09"
      />,
    );

    const pinButton = screen.getByRole("button", { name: /ghim/i });
    expect(pinButton).toHaveClass("min-h-11");

    const tacticLabels = screen.getAllByText(/khong bi cat chu tren mobile/i);
    const mobileTactic = tacticLabels.find((element) => element.tagName === "SPAN");
    const desktopChip = tacticLabels.find((element) => element.tagName === "DIV");

    expect(mobileTactic).toHaveClass("break-words", "leading-relaxed");
    expect(mobileTactic).not.toHaveClass("truncate");
    expect(desktopChip).toHaveClass("break-words", "leading-relaxed");
    expect(desktopChip).not.toHaveClass("truncate");
  });

  it("exposes pressed state for lab schedule selections", async () => {
    const user = userEvent.setup();

    render(
      <ScheduleStepLab
        draft={makeDraft({
          dailyTimeBudget: "30min",
          tacticLoadPreference: "balanced",
          reviewDay: "Monday",
          preferredDays: [0],
          leadIndicators: [
            {
              id: "indicator_1",
              name: "Viet outline",
              target: "1",
              unit: "phien",
              type: "core",
              cadence: "spread",
            },
          ],
        })}
        cycleStartDate="2026-05-05"
        cycleEndDate="2026-07-27"
        setupGuideSupport={null}
        setupGuideTemplate={null}
        hasPreviewTasks
        weekOneTaskPreview={[]}
        weekOneTaskWarning={null}
        onChange={vi.fn()}
        todayDateKey="2026-05-09"
      />,
    );

    expect(screen.getByRole("button", { name: /Đã ghim ưu tiên/i })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: /Tùy chỉnh nâng cao/i }));

    expect(screen.getByRole("button", { name: /30 phút/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Cân bằng/i })).toHaveAttribute("aria-pressed", "true");
  });
});
