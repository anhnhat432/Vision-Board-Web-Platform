import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { TwelveWeekTaskInstance } from "@/app/utils/storage-types";
import { DailyFocusCard } from "./DailyFocusCard";

const primaryTask: TwelveWeekTaskInstance = {
  id: "task_primary",
  weekNumber: 1,
  scheduledDate: "2026-08-08",
  title: "Hoàn thành Daily Home V2",
  leadIndicatorName: "Deep work",
  isCore: true,
  completed: false,
};

function renderCard(overrides: Partial<ComponentProps<typeof DailyFocusCard>> = {}) {
  const props: ComponentProps<typeof DailyFocusCard> = {
    task: primaryTask,
    goalTitle: "Ra mắt sản phẩm",
    completedCount: 0,
    totalCount: 2,
    reviewDueToday: false,
    completing: false,
    onComplete: vi.fn(),
    ...overrides,
  };

  render(
    <MemoryRouter>
      <DailyFocusCard {...props} />
    </MemoryRouter>,
  );
  return props;
}

describe("DailyFocusCard", () => {
  it("renders one accessible primary completion action", async () => {
    const user = userEvent.setup();
    const props = renderCard();
    const button = screen.getByRole("button", { name: "Đánh dấu xong: Hoàn thành Daily Home V2" });

    expect(screen.getAllByText("Hoàn thành Daily Home V2")).toHaveLength(1);
    await user.click(button);
    expect(props.onComplete).toHaveBeenCalledWith("task_primary");
  });

  it("disables duplicate interaction while canonical completion is pending", () => {
    renderCard({ completing: true });
    expect(screen.getByTestId("dashboard-primary-mark-done")).toBeDisabled();
    expect(screen.getByTestId("dashboard-primary-mark-done")).toHaveAttribute("aria-busy", "true");
  });

  it("renders closure instead of a completed task hero", () => {
    renderCard({ task: null, completedCount: 2, totalCount: 2 });
    expect(screen.getByTestId("dashboard-daily-closure")).toHaveTextContent("Hôm nay đã hoàn thành 2/2");
    expect(screen.queryByTestId("dashboard-primary-mark-done")).not.toBeInTheDocument();
  });

  it("promotes weekly review only when no daily task remains", () => {
    renderCard({ task: null, completedCount: 2, totalCount: 2, reviewDueToday: true });
    expect(screen.getByRole("link", { name: "Review tuần" })).toHaveAttribute("href", "/12-week-system?tab=week");
  });

  it("renders the true no-schedule state", () => {
    renderCard({ task: null, completedCount: 0, totalCount: 0 });
    expect(screen.getByText("Hôm nay không có việc được lên lịch")).toBeInTheDocument();
  });
});
