import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WeeklyPulseCard } from "./WeeklyPulseCard";

describe("WeeklyPulseCard", () => {
  it("shows factual completion without inventing an on-track label", () => {
    render(
      <WeeklyPulseCard
        currentWeek={4}
        totalWeeks={12}
        completedCount={6}
        totalCount={9}
        percent={67}
        overdueOpenCount={0}
        reviewDueToday={false}
      />,
    );

    expect(screen.getByText("6/9 việc")).toBeInTheDocument();
    expect(screen.getByText("67%")).toBeInTheDocument();
    expect(screen.queryByText(/Đúng nhịp|Đang chậm|Cần chú ý/)).not.toBeInTheDocument();
    expect(screen.queryByText(/việc đang trễ/)).not.toBeInTheDocument();
  });

  it("shows overdue and review context only from true sources", () => {
    render(
      <WeeklyPulseCard
        currentWeek={4}
        totalWeeks={12}
        completedCount={6}
        totalCount={9}
        percent={67}
        overdueOpenCount={2}
        reviewDueToday
      />,
    );

    expect(screen.getByText("2 việc đang trễ")).toBeInTheDocument();
    expect(screen.getByText("Review tuần đến hạn")).toBeInTheDocument();
  });
});
