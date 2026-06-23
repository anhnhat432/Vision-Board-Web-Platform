import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WeeklyTimeBlocksPanel } from "./WeeklyTimeBlocksPanel";

describe("WeeklyTimeBlocksPanel", () => {
  it("keeps time block edit controls touch-sized on mobile", () => {
    render(
      <WeeklyTimeBlocksPanel
        value={[
          {
            id: "block_1",
            type: "strategic",
            dayOfWeek: "Monday",
            startTime: "09:00",
            durationMinutes: 180,
            note: "",
          },
        ]}
        onChange={vi.fn()}
      />,
    );

    const chip = screen.getByTestId("weekly-time-block-chip");
    const editButton = within(chip).getByRole("button");

    expect(editButton).toHaveClass("min-h-11", "sm:min-h-8");
  });
});
