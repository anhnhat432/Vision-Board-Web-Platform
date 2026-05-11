import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import type { TwelveWeekSystem } from "@/app/utils/storage";
import { getDefaultScoreboard } from "@/app/utils/storage-twelve-week";
import { TwelveWeekCycleSettingsPanel } from "./TwelveWeekCycleSettingsPanel";

function makeSystem(overrides: Partial<TwelveWeekSystem> = {}): TwelveWeekSystem {
  return {
    goalType: "Project Completion",
    vision12Week: "Ship core flow",
    lagMetric: {
      name: "Lag",
      unit: "units",
      target: "100",
      currentValue: "",
    },
    leadIndicators: [
      {
        id: "tactic_1",
        name: "Ship tactic",
        target: "1",
        unit: "lần/tuần",
        type: "core",
        priority: 1,
        schedule: [1],
      },
    ],
    milestones: {
      week4: "",
      week8: "",
      week12: "",
    },
    successEvidence: "",
    reviewDay: "Sunday",
    week12Outcome: "",
    startDate: "2026-03-02",
    endDate: "2026-05-24",
    timezone: "Asia/Ho_Chi_Minh",
    weekStartsOn: "Monday",
    status: "active",
    currentWeek: 1,
    totalWeeks: 12,
    weeklyPlans: [],
    taskInstances: [],
    dailyCheckIns: [],
    weeklyReviews: [],
    scoreboard: getDefaultScoreboard(12),
    ...overrides,
  };
}

describe("TwelveWeekCycleSettingsPanel", () => {
  beforeAll(() => {
    if (!HTMLElement.prototype.hasPointerCapture) {
      HTMLElement.prototype.hasPointerCapture = () => false;
    }
    if (!HTMLElement.prototype.setPointerCapture) {
      HTMLElement.prototype.setPointerCapture = () => undefined;
    }
    if (!HTMLElement.prototype.scrollIntoView) {
      HTMLElement.prototype.scrollIntoView = () => undefined;
    }
  });

  it("asks for confirmation before applying a review day change", async () => {
    const onReviewDayChange = vi.fn();
    const user = userEvent.setup();

    render(
      <TwelveWeekCycleSettingsPanel
        system={makeSystem()}
        onReviewDayChange={onReviewDayChange}
        onReminderTimeChange={vi.fn()}
        onLoadPreferenceChange={vi.fn()}
        onStatusChange={vi.fn()}
        onTacticPriorityChange={vi.fn()}
        onTacticTypeChange={vi.fn()}
      />,
    );

    await user.click(screen.getByLabelText("Chọn ngày review"));
    await user.click(await screen.findByRole("option", { name: "Thứ Sáu" }));

    expect(
      await screen.findByText(
        "Đổi ngày review sẽ điều chỉnh lịch việc các tuần còn lại (tuần đã review không đổi). Tiếp tục?",
      ),
    ).toBeInTheDocument();
    expect(onReviewDayChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Huỷ" }));
    await waitFor(() => {
      expect(
        screen.queryByText(
          "Đổi ngày review sẽ điều chỉnh lịch việc các tuần còn lại (tuần đã review không đổi). Tiếp tục?",
        ),
      ).not.toBeInTheDocument();
    });
    expect(onReviewDayChange).not.toHaveBeenCalled();

    await user.click(screen.getByLabelText("Chọn ngày review"));
    await user.click(await screen.findByRole("option", { name: "Thứ Sáu" }));
    await user.click(await screen.findByRole("button", { name: "Đồng ý đổi" }));

    expect(onReviewDayChange).toHaveBeenCalledWith("Friday");
  }, 10_000);
});
