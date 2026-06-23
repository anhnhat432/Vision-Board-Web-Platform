import { type ComponentProps, useState } from "react";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { TwelveWeekSystem } from "@/app/utils/storage-types";

import { TwelveWeekWeekTab } from "./TwelveWeekWeekTab";

type WeekTabProps = ComponentProps<typeof TwelveWeekWeekTab>;

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
    currentWeek: 3,
    totalWeeks: 12,
    weeklyPlans: [],
    taskInstances: [],
    dailyCheckIns: [],
    weeklyReviews: [],
    scoreboard: [],
    ...overrides,
  };
}

function makeProps(overrides: Partial<WeekTabProps> = {}): WeekTabProps {
  return {
    system: makeSystem(),
    currentWeekRange: { start: "2026-05-04", end: "2026-05-10" },
    currentPlanFocus: "Ship the command center",
    currentPlanMilestone: "Week 4 checkpoint",
    reviewDueToday: true,
    reviewStatusLabel: "Review due",
    currentScoreValue: 60,
    weekCompletion: { completed: 3, total: 5, percent: 60 },
    currentLagMetricValue: "25%",
    coreIndicators: [],
    optionalIndicators: [],
    currentPlanCode: "FREE",
    hasPremiumInsights: false,
    premiumInsight: {
      status: "watch",
      headline: "Upgrade insight",
      summary: "Premium summary",
      recommendedAdjustment: "Keep the load stable",
      coachNote: "Protect one priority",
      badgeLabel: "Plus",
    },
    suggestedNextWeekPlan: {
      focus: "Protect the first priority",
      rationale: "The current load is workable.",
      workloadDecision: "keep same",
      protectTactics: ["Deep work"],
      secondaryTrackLabel: "Optional",
      secondaryTrackItems: ["Stretch task"],
      firstMove: "Open Today",
    },
    weeklyForm: {
      lagProgressValue: "",
      biggestOutputThisWeek: "",
      mainObstacle: "",
      keepTactic: "",
      reduceTactic: "",
      nextWeekPriority: "",
      commitmentStatuses: {},
      insights: "",
      nextWeekCommitments: [],
      workloadDecision: "",
    },
    onWeeklyFormChange: vi.fn(),
    onApplySuggestedPlan: vi.fn(),
    onOpenPremiumInsights: vi.fn(),
    onSaveWeeklyReview: vi.fn(),
    ...overrides,
  };
}

function StatefulWeekTab({ initialCommitments = [] }: { initialCommitments?: string[] }) {
  const baseProps = makeProps();
  const [weeklyForm, setWeeklyForm] = useState({
    ...baseProps.weeklyForm,
    nextWeekCommitments: initialCommitments,
  });

  return (
    <TwelveWeekWeekTab
      {...baseProps}
      weeklyForm={weeklyForm}
      onWeeklyFormChange={(field, value) =>
        setWeeklyForm((previousForm) => ({
          ...previousForm,
          [field]: value,
        }))
      }
    />
  );
}

describe("TwelveWeekWeekTab review flow", () => {
  it("shows four WAM review steps and a readiness summary", () => {
    render(
      <TwelveWeekWeekTab
        {...makeProps({
          weeklyForm: {
            lagProgressValue: "",
            biggestOutputThisWeek: "Shipped a usable Today tab.",
            mainObstacle: "",
            keepTactic: "",
            reduceTactic: "",
            nextWeekPriority: "Keep the core loop simple.",
            commitmentStatuses: {},
            insights: "Keep the loop visible.",
            nextWeekCommitments: ["Keep the core loop simple."],
            workloadDecision: "keep same",
          },
        })}
      />,
    );

    expect(screen.getByTestId("weekly-review-step-score")).toHaveAttribute("data-done", "true");
    expect(screen.getByTestId("weekly-review-step-commitments")).toHaveAttribute("data-done", "true");
    expect(screen.getByTestId("weekly-review-step-insights")).toHaveAttribute("data-done", "true");
    expect(screen.getByTestId("weekly-review-step-next")).toHaveAttribute("data-done", "true");
    expect(screen.getByTestId("weekly-review-readiness")).toHaveTextContent("4/4");
    expect(screen.getByTestId("weekly-review-check-commitments")).toHaveTextContent(/cam/i);
    expect(screen.getByTestId("weekly-review-check-next")).toHaveTextContent(/tuần/i);
  });

  it("renders WAM answer fields directly", () => {
    render(<TwelveWeekWeekTab {...makeProps()} />);

    expect(screen.getByLabelText(/góc nhìn\/điều học được/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cam kết của tuần tới/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/ưu tiên số 1/i)).toBeNull();
  });

  it("adds a next-week commitment chip with Enter and clears the input", async () => {
    const user = userEvent.setup();
    render(<StatefulWeekTab />);

    const input = screen.getByLabelText(/cam kết của tuần tới/i);
    await user.type(input, "Plan a{Enter}");

    expect(screen.getByLabelText("Cam kết: Plan a")).toBeInTheDocument();
    expect(input).toHaveValue("");
  });

  it("does not add a case-insensitive duplicate commitment and flags the existing chip", async () => {
    const user = userEvent.setup();
    render(<StatefulWeekTab initialCommitments={["Plan a"]} />);

    const input = screen.getByLabelText(/cam kết của tuần tới/i);
    await user.type(input, "plan A{Enter}");

    expect(screen.getAllByLabelText("Cam kết: Plan a")).toHaveLength(1);
    expect(screen.getByLabelText("Cam kết: Plan a")).toHaveAttribute("data-state", "duplicate");
    expect(input).toHaveFocus();
  });

  it("removes a next-week commitment chip from the editor", async () => {
    const user = userEvent.setup();
    render(<StatefulWeekTab initialCommitments={["Plan a"]} />);

    await user.click(screen.getByRole("button", { name: "Xóa cam kết: Plan a" }));

    expect(screen.queryByLabelText("Cam kết: Plan a")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/cam kết của tuần tới/i)).toBeEnabled();
  });

  it("caps next-week commitments at five and shows the max-items hint", async () => {
    render(<StatefulWeekTab />);

    const input = screen.getByLabelText(/cam kết của tuần tới/i);
    fireEvent.change(input, { target: { value: "Plan 1,Plan 2,Plan 3,Plan 4,Plan 5,Plan 6," } });

    expect(screen.getByLabelText("Cam kết: Plan 5")).toBeInTheDocument();
    expect(screen.queryByLabelText("Cam kết: Plan 6")).not.toBeInTheDocument();
    expect(input).toBeDisabled();
    expect(screen.getByText("Đã đạt tối đa 5 cam kết. Xoá bớt chip để thêm mới.")).toBeInTheDocument();
  });

  it("removes the last next-week commitment when Backspace is pressed in an empty input", async () => {
    const user = userEvent.setup();
    render(<StatefulWeekTab initialCommitments={["Plan a", "Plan b"]} />);

    const input = screen.getByLabelText(/cam kết của tuần tới/i);
    await user.click(input);
    await user.keyboard("{Backspace}");

    expect(screen.getByLabelText("Cam kết: Plan a")).toBeInTheDocument();
    expect(screen.queryByLabelText("Cam kết: Plan b")).not.toBeInTheDocument();
  });

  it("shows an empty-week message instead of a percent when there are no tasks", () => {
    render(
      <TwelveWeekWeekTab
        {...makeProps({
          weekCompletion: { completed: 0, total: 0, percent: 0, isEmpty: true },
        })}
      />,
    );

    expect(screen.getAllByText("Chưa có việc trong tuần này").length).toBeGreaterThan(0);
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
  });

  it("keeps the mobile sticky CTA above the bottom navigation", () => {
    render(<TwelveWeekWeekTab {...makeProps()} />);

    const shell = screen.getByTestId("weekly-review-shell");
    const actionBar = screen.getByTestId("weekly-review-mobile-sticky-cta");

    expect(shell).toHaveClass("pb-[calc(8.5rem+env(safe-area-inset-bottom))]", "md:pb-0");
    expect(actionBar).toHaveClass(
      "fixed",
      "bottom-[calc(5rem+env(safe-area-inset-bottom))]",
      "left-0",
      "right-0",
      "border-app-line/80",
      "bg-app-surface/95",
      "px-4",
      "pb-4",
      "pt-3",
      "backdrop-blur-md",
      "md:hidden",
    );
    expect(within(actionBar).getByText("Tiến độ review 2/4")).toBeInTheDocument();
    expect(within(actionBar).getByText(/Thiếu 2 mục/i)).toBeInTheDocument();
  });

  it("blocks weekly review submit for a future week number", async () => {
    const user = userEvent.setup();
    const onSaveWeeklyReview = vi.fn();

    render(
      <TwelveWeekWeekTab
        {...makeProps({
          system: makeSystem({ currentWeek: 99 }),
          weeklyForm: {
            lagProgressValue: "",
            biggestOutputThisWeek: "",
            mainObstacle: "",
            keepTactic: "",
            reduceTactic: "",
            nextWeekPriority: "",
            commitmentStatuses: {},
            insights: "Keep the review small.",
            nextWeekCommitments: ["Plan next week"],
            workloadDecision: "keep same",
          },
          onSaveWeeklyReview,
        })}
      />,
    );

    await user.click(screen.getAllByRole("button", { name: /chốt review tuần này/i })[0]);

    expect(onSaveWeeklyReview).not.toHaveBeenCalled();
    expect(screen.getByTestId("weekly-review-readiness")).toHaveTextContent(/không thể chốt tuần tương lai/i);
  });

  it("asks for confirmation before saving the current week early", async () => {
    const user = userEvent.setup();
    const onSaveWeeklyReview = vi.fn();

    render(
      <TwelveWeekWeekTab
        {...makeProps({
          reviewDueToday: false,
          weeklyForm: {
            lagProgressValue: "",
            biggestOutputThisWeek: "",
            mainObstacle: "",
            keepTactic: "",
            reduceTactic: "",
            nextWeekPriority: "",
            commitmentStatuses: {},
            insights: "Keep the review small.",
            nextWeekCommitments: ["Plan next week"],
            workloadDecision: "keep same",
          },
          onSaveWeeklyReview,
        })}
      />,
    );

    const saveButton = screen.getAllByRole("button", { name: /chốt review tuần này/i })[0];
    await user.click(saveButton);
    expect(onSaveWeeklyReview).not.toHaveBeenCalled();

    // Dialog opens — cancel keeps the review unsaved
    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /quay lại chỉnh sửa/i }));
    expect(onSaveWeeklyReview).not.toHaveBeenCalled();

    // Reopen and confirm — save fires
    await user.click(saveButton);
    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /vẫn lưu sớm/i }));
    expect(onSaveWeeklyReview).toHaveBeenCalledTimes(1);
  });

  it("shows lead as the weekly hero score and lag progress beside it", () => {
    render(
      <TwelveWeekWeekTab
        {...makeProps({
          currentScoreValue: 20,
          weekCompletion: { completed: 4, total: 5, percent: 80 },
          currentLagMetricValue: "25",
        })}
      />,
    );

    expect(screen.getByTestId("weekly-lead-score")).toHaveTextContent("80%");
    expect(screen.getByTestId("weekly-lag-score")).toHaveTextContent("100%");
  });

  it("renders the 4-question WAM form and a friendly first-week empty state", () => {
    render(<TwelveWeekWeekTab {...makeProps({ system: makeSystem({ currentWeek: 1 }) })} />);

    expect(screen.getByTestId("wam-section-score")).toBeInTheDocument();
    expect(screen.getByTestId("wam-section-commitments")).toBeInTheDocument();
    expect(screen.getByTestId("wam-section-insights")).toBeInTheDocument();
    expect(screen.getByTestId("wam-section-next-commitments")).toBeInTheDocument();
    expect(screen.getByText(/tuần đầu chưa có cam kết tuần trước/i)).toBeInTheDocument();
  });

  it("requires every previous commitment to be classified before submit", () => {
    const system = makeSystem({
      currentWeek: 2,
      weeklyReviews: [
        {
          weekNumber: 1,
          leadCompletionPercent: 80,
          lagProgressValue: "25",
          biggestOutputThisWeek: "Week 1 output",
          mainObstacle: "",
          nextWeekPriority: "Publish draft",
          workloadDecision: "keep same",
          reviewCompleted: true,
          progressScore: 4,
          disciplineScore: 4,
          focusScore: 6,
          improvementScore: 6,
          outputQualityScore: 6,
          commitmentsKept: [],
          commitmentsMissed: [],
          insights: "Ship smaller.",
          nextWeekCommitments: ["Publish draft"],
        },
      ],
    });

    render(<TwelveWeekWeekTab {...makeProps({ system })} />);

    expect(screen.getByText("Publish draft")).toBeInTheDocument();
    for (const button of screen.getAllByRole("button", { name: /chốt review tuần này/i })) {
      expect(button).toBeDisabled();
    }
  });

  it("summarizes WAM answers after review submit", () => {
    render(
      <TwelveWeekWeekTab
        {...makeProps({
          currentReview: {
            weekNumber: 2,
            leadCompletionPercent: 80,
            lagProgressValue: "25",
            biggestOutputThisWeek: "Legacy output",
            mainObstacle: "",
            nextWeekPriority: "Ship next",
            workloadDecision: "keep same",
            reviewCompleted: true,
            progressScore: 4,
            disciplineScore: 4,
            focusScore: 6,
            improvementScore: 6,
            outputQualityScore: 6,
            commitmentsKept: ["Publish draft"],
            commitmentsMissed: ["Send update"],
            insights: "Protect morning focus.",
            nextWeekCommitments: ["Ship next"],
          },
        })}
      />,
    );

    const summary = screen.getByTestId("weekly-review-summary");
    expect(summary).toHaveTextContent("Score");
    expect(summary).toHaveTextContent("Đã giữ 1/2 cam kết");
    expect(summary).toHaveTextContent("Protect morning focus.");
    expect(summary).toHaveTextContent("Ship next");
  });
});
