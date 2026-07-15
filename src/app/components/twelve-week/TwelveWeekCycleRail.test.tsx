import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { buildCycleRailWeeks, TwelveWeekCycleRail } from "./TwelveWeekCycleRail";

describe("TwelveWeekCycleRail", () => {
  it("builds reviewed, current, checkpoint, and upcoming states", () => {
    const weeks = buildCycleRailWeeks({
      totalWeeks: 12,
      currentWeek: 5,
      reviewedWeeks: [1, 2, 3],
      scoreByWeek: { 1: 80, 2: 70, 3: 90, 5: 40 },
      checkpoints: [4, 8, 12],
    });

    expect(weeks[0]).toMatchObject({ weekNumber: 1, state: "reviewed", score: 80 });
    expect(weeks[3]).toMatchObject({ weekNumber: 4, checkpoint: true });
    expect(weeks[4]).toMatchObject({ weekNumber: 5, state: "current", score: 40 });
    expect(weeks[5]).toMatchObject({ weekNumber: 6, state: "upcoming" });
  });

  it("announces state and selects a week", async () => {
    const user = userEvent.setup();
    const onSelectWeek = vi.fn();
    const weeks = buildCycleRailWeeks({
      totalWeeks: 3,
      currentWeek: 2,
      reviewedWeeks: [1],
      scoreByWeek: { 1: 80, 2: 50 },
      checkpoints: [],
    });

    render(
      <TwelveWeekCycleRail
        weeks={weeks}
        selectedWeek={2}
        onSelectWeek={onSelectWeek}
        label="Nhịp độ chu kỳ 12 tuần"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Tuần 1, đã chốt review, 80%" }));
    expect(onSelectWeek).toHaveBeenCalledWith(1);
    expect(screen.getByRole("button", { name: "Tuần 2, tuần hiện tại, 50%" })).toHaveAttribute(
      "aria-current",
      "step",
    );
  });
});
