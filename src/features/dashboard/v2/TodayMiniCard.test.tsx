import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import type { TwelveWeekTaskInstance } from "@/app/utils/storage-types";
import { TodayMiniCard } from "./TodayMiniCard";

const secondaryTask: TwelveWeekTaskInstance = {
  id: "secondary",
  weekNumber: 1,
  scheduledDate: "2026-08-08",
  title: "Secondary task",
  leadIndicatorName: "Deep work",
  isCore: true,
  completed: false,
};

function renderCard(tasks: TwelveWeekTaskInstance[], completedCount: number, totalCount: number) {
  render(
    <MemoryRouter>
      <TodayMiniCard tasks={tasks} completedCount={completedCount} totalCount={totalCount} />
    </MemoryRouter>,
  );
}

describe("TodayMiniCard", () => {
  it("renders only the preview rows supplied by Dashboard", () => {
    renderCard([secondaryTask], 1, 3);

    expect(screen.getByRole("heading", { name: "Hôm nay" })).toBeInTheDocument();
    expect(screen.getByText("Secondary task")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Secondary task/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mở Today workspace" })).toHaveAttribute(
      "href",
      "/12-week-system?tab=today",
    );
  });

  it("renders the no-schedule state", () => {
    renderCard([], 0, 0);
    expect(screen.getByText("Hôm nay không có việc được lên lịch")).toBeInTheDocument();
  });

  it("renders the all-done queue state", () => {
    renderCard([], 2, 2);
    expect(screen.getByText("Không còn việc mở cho hôm nay")).toBeInTheDocument();
  });

  it("explains when only the primary task remains", () => {
    renderCard([], 0, 1);
    expect(screen.getByText("Sau việc ưu tiên này, hôm nay không còn việc nào khác")).toBeInTheDocument();
  });
});
