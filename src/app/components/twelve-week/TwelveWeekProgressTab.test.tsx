import type { ComponentProps } from "react";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { TwelveWeekSystem } from "@/app/utils/storage-types";

import { getProgressNextActionSuggestion, TwelveWeekProgressTab } from "./TwelveWeekProgressTab";

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
      {
        weekNumber: 1,
        leadCompletionPercent: 90,
        mainMetricProgress: "",
        outputDone: "",
        reviewDone: true,
        weeklyScore: 90,
      },
      {
        weekNumber: 2,
        leadCompletionPercent: 70,
        mainMetricProgress: "",
        outputDone: "",
        reviewDone: true,
        weeklyScore: 70,
      },
      {
        weekNumber: 3,
        leadCompletionPercent: 0,
        mainMetricProgress: "",
        outputDone: "",
        reviewDone: false,
        weeklyScore: 0,
      },
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

function mockReducedMotion(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)" ? matches : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

describe("TwelveWeekProgressTab", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows average lead score and completed week count separately", () => {
    render(<TwelveWeekProgressTab {...makeProps()} />);

    expect(screen.getAllByText("80%").length).toBeGreaterThan(0);
    expect(screen.getAllByText("trung bình").length).toBeGreaterThan(0);
    expect(screen.getByText("2/12")).toBeInTheDocument();
    expect(screen.getAllByText("tuần").length).toBeGreaterThan(0);
    const targetHelp = screen.getByRole("button", { name: "Tại sao 85%?" });
    expect(targetHelp).not.toHaveAttribute("title");
    expect(targetHelp).toHaveClass("h-11", "w-11", "sm:h-8", "sm:w-8");
  });

  it("renders one narrative h2 and no nested page h1", () => {
    render(<TwelveWeekProgressTab {...makeProps()} />);

    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(/nhịp|tuần/i);
  });

  it("shows exactly three primary metrics and the shared cycle rail", () => {
    render(<TwelveWeekProgressTab {...makeProps()} />);

    expect(screen.getAllByTestId("progress-primary-metric")).toHaveLength(3);
    expect(screen.getByTestId("twelve-week-cycle-rail")).toBeInTheDocument();
  });

  it("keeps advanced analytics collapsed until requested", async () => {
    const user = userEvent.setup();
    render(
      <TwelveWeekProgressTab
        {...makeProps({
          executionHeatmap: [
            { weekNumber: 1, dayOfWeek: 0, dateKey: "2026-05-04", total: 2, completed: 1, percent: 50 },
          ],
        })}
      />,
    );

    expect(screen.queryByRole("button", { name: "2026-05-04: hoàn thành 1 trên 2 việc" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Mở phân tích nâng cao" }));
    expect(screen.getByRole("button", { name: "2026-05-04: hoàn thành 1 trên 2 việc" })).toBeInTheDocument();
  });

  it("renders execution heatmap cells as accessible touch targets", async () => {
    const user = userEvent.setup();
    render(
      <TwelveWeekProgressTab
        {...makeProps({
          executionHeatmap: [
            {
              weekNumber: 1,
              dayOfWeek: 0,
              dateKey: "2026-05-04",
              total: 2,
              completed: 1,
              percent: 50,
            },
          ],
        })}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Mở phân tích nâng cao" }));
    const cell = screen.getByRole("button", { name: "2026-05-04: hoàn thành 1 trên 2 việc" });
    expect(cell).toHaveClass("h-11", "w-11", "sm:h-9", "sm:w-9");
    expect(cell).not.toHaveAttribute("title");
    expect(screen.getByText(/Chạm hoặc rê chuột lên từng ô/i)).toBeInTheDocument();
  });

  it("lets journey metric progress wrap instead of clipping it", () => {
    const longMetricProgress =
      "Completed 14 deep work sessions, published two case studies, and kept notes for every review checkpoint";
    const system = makeSystem();
    system.scoreboard = system.scoreboard.map((week) =>
      week.weekNumber === 3 ? { ...week, mainMetricProgress: longMetricProgress } : week,
    );

    render(<TwelveWeekProgressTab {...makeProps({ system })} />);

    const metricProgress = screen.getByText(longMetricProgress, { selector: "p.break-words" });
    expect(metricProgress).toHaveClass("break-words");
    expect(metricProgress).not.toHaveClass("line-clamp-2");
  });

  it("removes decorative journey map animation when reduced motion is requested", () => {
    mockReducedMotion(true);

    render(<TwelveWeekProgressTab {...makeProps()} />);

    const map = screen.getByTestId("zen-journey-map");
    expect(map.querySelector('[class*="animate-"]')).toBeNull();
    expect(map.querySelector("animate")).toBeNull();
    expect(screen.getByRole("img", { name: "Bản đồ hành trình 12 tuần" })).toBeInTheDocument();
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
