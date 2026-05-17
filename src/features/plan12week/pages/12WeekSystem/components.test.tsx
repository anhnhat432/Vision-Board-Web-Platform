import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TwelveWeekDashboardHeader } from "./components";
import type { Goal, TwelveWeekSystem, TwelveWeekTaskInstance } from "@/app/utils/storage-types";

function makeGoal(): Goal {
  return {
    id: "goal_1",
    category: "Career",
    focusArea: "Career",
    title: "Ship the mobile 12-week execution flow",
    description: "",
    deadline: "2026-07-19",
    tasks: [],
    createdAt: "2026-05-08T00:00:00.000Z",
  };
}

function makeSystem(): TwelveWeekSystem {
  return {
    goalType: "Project Completion",
    vision12Week: "Make Today usable on mobile.",
    lagMetric: { name: "Completion", unit: "%", target: "100", currentValue: "0" },
    leadIndicators: [],
    milestones: { week4: "", week8: "", week12: "" },
    successEvidence: "",
    reviewDay: "Sunday",
    week12Outcome: "",
    startDate: "2026-05-04",
    endDate: "2026-07-26",
    timezone: "Asia/Ho_Chi_Minh",
    weekStartsOn: "Monday",
    status: "active",
    currentWeek: 1,
    totalWeeks: 12,
    weeklyPlans: [],
    taskInstances: [],
    dailyCheckIns: [],
    weeklyReviews: [],
    scoreboard: [],
  };
}

function makeTask(): TwelveWeekTaskInstance {
  return {
    id: "task_1",
    weekNumber: 1,
    scheduledDate: "2026-05-08",
    title: "Finish the first priority task",
    leadIndicatorName: "Focused work",
    isCore: true,
    completed: false,
  };
}

describe("TwelveWeekDashboardHeader", () => {
  it("uses a compact mobile header layout above the Today tab", () => {
    render(
      <TwelveWeekDashboardHeader
        activeGoal={makeGoal()}
        system={makeSystem()}
        activePlanCode="FREE"
        currentWeek={1}
        syncBadgeClass="border-app-line bg-app-bg text-app-ink-soft"
        syncBadgeLabel="Local"
        reviewDueToday={false}
        todayRemainingCount={2}
        todayCompletedCount={1}
        weekCompletion={{ completed: 1, total: 5, percent: 20 }}
        reviewStatusLabel="Sunday"
        firstPriorityTask={makeTask()}
        onOpenFocusTab={vi.fn()}
        onOpenGoals={vi.fn()}
      />,
    );

    expect(screen.getByTestId("twelve-week-header-description")).toHaveTextContent("Tuần 1 / 12");
    expect(screen.getByTestId("twelve-week-header-actions")).toHaveClass("flex", "flex-col");
    expect(screen.getByText("HỆ THỐNG 12 TUẦN")).toBeInTheDocument();
    expect(screen.getByText("Khởi động")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Xem việc hôm nay/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Mở mục tiêu/ })).toBeInTheDocument();
  });
});
