import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { TwelveWeekSystem } from "@/app/utils/storage-types";
import { ProgressSummaryCard } from "./ProgressSummaryCard";

function makeSystem(overrides: Partial<TwelveWeekSystem> = {}): TwelveWeekSystem {
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
    currentWeek: 5,
    totalWeeks: 12,
    weeklyPlans: [],
    taskInstances: [
      {
        id: "task_1",
        weekNumber: 5,
        scheduledDate: "2026-06-01",
        title: "Ship",
        leadIndicatorName: "Work",
        isCore: true,
        completed: false,
      },
    ],
    dailyCheckIns: [],
    weeklyReviews: [
      {
        weekNumber: 1,
        leadCompletionPercent: 80,
        lagProgressValue: "10%",
        biggestOutputThisWeek: "Started",
        mainObstacle: "",
        nextWeekPriority: "Continue",
        workloadDecision: "keep same",
        reviewCompleted: true,
        progressScore: 7,
        disciplineScore: 7,
        focusScore: 7,
        improvementScore: 7,
        outputQualityScore: 7,
      },
    ],
    scoreboard: [
      {
        weekNumber: 1,
        leadCompletionPercent: 80,
        weeklyScore: 72,
        mainMetricProgress: "10%",
        outputDone: "Started",
        reviewDone: true,
      },
    ],
    ...overrides,
  };
}

describe("ProgressSummaryCard cycle timeline", () => {
  it("renders a compact cycle timeline with current, reviewed, and milestone weeks", () => {
    render(
      <ProgressSummaryCard
        system={makeSystem()}
        currentWeek={5}
        currentWeekRange={{ start: "2026-06-01", end: "2026-06-07" }}
        currentWeekScoreValue={62}
        averageScore={70}
        reviewDoneCount={1}
        weekCompletion={{ completed: 2, total: 5, percent: 40 }}
      />,
    );

    const timeline = screen.getByTestId("progress-12-week-timeline");
    expect(within(timeline).getByTestId("progress-week-5")).toHaveAttribute("aria-current", "step");
    expect(within(timeline).getByTestId("progress-week-1")).toHaveAttribute("data-reviewed", "true");
    expect(within(timeline).getByTestId("progress-week-4")).toHaveAttribute("data-milestone", "true");
    expect(screen.getByTestId("progress-current-milestone")).toHaveTextContent("Week 4");
    expect(screen.getByTestId("progress-current-milestone")).toHaveTextContent("Week 8");
    expect(screen.getByTestId("progress-next-milestone")).toHaveTextContent("Week 8");
  });

  it("bounds timeline display to the configured cycle length", () => {
    render(
      <ProgressSummaryCard
        system={makeSystem({ totalWeeks: 8, currentWeek: 13, weeklyReviews: [] })}
        currentWeek={13}
        currentWeekRange={null}
        currentWeekScoreValue={62}
        averageScore={70}
        reviewDoneCount={0}
        weekCompletion={{ completed: 0, total: 0, percent: 0 }}
      />,
    );

    const timeline = screen.getByTestId("progress-12-week-timeline");
    expect(screen.getByText(/8 tuần/)).toBeInTheDocument();
    expect(within(timeline).getByTestId("progress-week-8")).toHaveAttribute("aria-current", "step");
    expect(within(timeline).getByTestId("progress-week-8")).toHaveAccessibleName(/tuần hiện tại/);
    expect(within(timeline).getByTestId("progress-week-1")).toHaveAttribute("data-reviewed", "false");
    expect(within(timeline).queryByTestId("progress-week-12")).not.toBeInTheDocument();
  });

  it("routes the progress next action to Week when review is due", async () => {
    const onOpenWeekTab = vi.fn();
    render(
      <ProgressSummaryCard
        system={makeSystem()}
        currentWeek={5}
        currentWeekRange={{ start: "2026-06-01", end: "2026-06-07" }}
        currentWeekScoreValue={62}
        averageScore={70}
        reviewDoneCount={1}
        weekCompletion={{ completed: 5, total: 5, percent: 100 }}
        reviewDueToday
        onOpenWeekTab={onOpenWeekTab}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /tab/i }));
    expect(onOpenWeekTab).toHaveBeenCalledTimes(1);
  });
});
