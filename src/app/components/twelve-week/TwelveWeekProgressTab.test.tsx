import type { ComponentProps } from "react";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { TwelveWeekSystem } from "@/app/utils/storage-types";

import { TwelveWeekProgressTab } from "./TwelveWeekProgressTab";

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

    expect(screen.getByText("Lead trung bình 80%")).toBeInTheDocument();
    expect(screen.getByText("Đã hoàn thành 2/12 tuần")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tại sao 85%?" })).toHaveAttribute(
      "title",
      "Theo phương pháp 12 Week Year, đạt 85% cam kết hàng tuần là chỉ số dẫn dắt mạnh nhất tới mục tiêu",
    );
  });
});
