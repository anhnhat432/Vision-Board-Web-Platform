import type { ComponentProps } from "react";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { TwelveWeekSystem } from "@/app/utils/storage-types";

import { TwelveWeekProgressTab, getProgressNextActionSuggestion } from "./TwelveWeekProgressTab";

type ProgressTabProps = ComponentProps<typeof TwelveWeekProgressTab>;

function makeSystem(): TwelveWeekSystem {
  return {
    goalType: "Project Completion",
    vision12Week: "Ship execution UX",
    lagMetric: { name: "Completion", unit: "%", target: "100", currentValue: "25" },
    leadIndicators: [],
    milestones: { week4: "First checkpoint", week8: "Second checkpoint", week12: "Final outcome" },
    successEvidence: "",
    reviewDay: "Sunday",
    week12Outcome: "",
    startDate: "2026-05-04",
    endDate: "2026-07-26",
    timezone: "Asia/Ho_Chi_Minh",
    weekStartsOn: "Monday",
    status: "active",
    currentWeek: 3,
    totalWeeks: 12,
    weeklyPlans: [],
    taskInstances: [],
    dailyCheckIns: [],
    weeklyReviews: [],
    scoreboard: [
      { weekNumber: 1, leadCompletionPercent: 90, mainMetricProgress: "", outputDone: "", reviewDone: true, weeklyScore: 90 },
      { weekNumber: 2, leadCompletionPercent: 70, mainMetricProgress: "", outputDone: "", reviewDone: true, weeklyScore: 70 },
      { weekNumber: 3, leadCompletionPercent: 0, mainMetricProgress: "", outputDone: "", reviewDone: false, weeklyScore: 0 },
    ],
  };
}

function makeProps(overrides: Partial<ProgressTabProps> = {}): ProgressTabProps {
  return {
    system: makeSystem(),
    currentWeek: 3,
    currentWeekRange: { start: "2026-05-18", end: "2026-05-24" },
    currentWeekScoreValue: 80,
    averageScore: 53,
    reviewDoneCount: 2,
    weekCompletion: { completed: 4, total: 5, percent: 80 },
    milestoneItems: [],
    hasAdvancedAnalytics: true,
    executionHeatmap: [],
    weeklyTrend: [],
    tacticBreakdown: [],
    ...overrides,
  };
}

describe("TwelveWeekProgressTab", () => {
  it("shows average lead score and completed week count separately", () => {
    render(<TwelveWeekProgressTab {...makeProps()} />);

    expect(screen.getByText("Việc lặp lại trung bình 80%")).toBeInTheDocument();
    expect(screen.getByText("Đã hoàn thành 2/12 tuần")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tại sao 85%?" })).not.toHaveAttribute("title");
  });
  it.each([
    [
      "cycle review phase",
      {
        currentWeek: 13,
        totalWeeks: 12,
        hasOpenTasksThisWeek: false,
        reviewDueToday: false,
        hasReviewedCurrentWeek: false,
        hasAnyTasks: true,
      },
      "Mở Cycle Review",
    ],
    [
      "open work this week",
      {
        currentWeek: 4,
        totalWeeks: 12,
        hasOpenTasksThisWeek: true,
        reviewDueToday: true,
        hasReviewedCurrentWeek: false,
        hasAnyTasks: true,
      },
      "Hoàn thành việc cốt lõi hôm nay",
    ],
    [
      "review due",
      {
        currentWeek: 4,
        totalWeeks: 12,
        hasOpenTasksThisWeek: false,
        reviewDueToday: true,
        hasReviewedCurrentWeek: false,
        hasAnyTasks: true,
      },
      "Mở review tuần",
    ],
    [
      "review completed",
      {
        currentWeek: 4,
        totalWeeks: 12,
        hasOpenTasksThisWeek: false,
        reviewDueToday: false,
        hasReviewedCurrentWeek: true,
        hasAnyTasks: true,
      },
      "Chuẩn bị tuần sau",
    ],
    [
      "review due but already completed",
      {
        currentWeek: 4,
        totalWeeks: 12,
        hasOpenTasksThisWeek: false,
        reviewDueToday: true,
        hasReviewedCurrentWeek: true,
        hasAnyTasks: true,
      },
      "Chuẩn bị tuần sau",
    ],
    [
      "no tasks",
      {
        currentWeek: 4,
        totalWeeks: 12,
        hasOpenTasksThisWeek: false,
        reviewDueToday: false,
        hasReviewedCurrentWeek: false,
        hasAnyTasks: false,
      },
      "Hoàn tất setup trong Cài đặt",
    ],
  ])("maps next action for %s", (_caseName, input, expectedLabel) => {
    expect(getProgressNextActionSuggestion(input).label).toBe(expectedLabel);
  });
});
