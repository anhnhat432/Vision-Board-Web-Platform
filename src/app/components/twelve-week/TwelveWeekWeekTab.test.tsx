import { type ComponentProps, useState } from "react";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { TwelveWeekSystem, UniversalWeeklyReview } from "@/app/utils/storage-types";
import type { ExecutionInsight, WeeklyReviewEvidence, WeeklyReviewViewModel } from "@/features/plan12week/logic";

import { TwelveWeekWeekTab } from "./TwelveWeekWeekTab";

type WeekTabProps = ComponentProps<typeof TwelveWeekWeekTab>;

const defaultEvidence: WeeklyReviewEvidence = {
  weekNumber: 3,
  totalWeeks: 12,
  dateRange: { start: "2026-05-18", end: "2026-05-24" },
  completion: { completed: 17, total: 21, percent: 81, isEmpty: false },
  core: { completed: 12, total: 14, percent: 86 },
  optional: { completed: 5, total: 7, percent: 71 },
  checkIns: { days: 5, possibleDays: 7 },
  overdueOpenCount: 3,
  carryOverCount: 1,
  onTime: { completed: 15, total: 17 },
  previousWeek: { completed: 18, total: 25, percent: 72, deltaPoints: 9 },
};

const defaultInsights: ExecutionInsight[] = [
  {
    id: "strong_lead_metric",
    severity: "positive",
    headline: "Chỉ số dẫn dắt đang chạy mạnh",
    body: "Các chỉ số chính đang được giữ nhịp tốt.",
    nextActionId: "celebrate_keep_going",
    metrics: { recentLeadCompletionPercent: 86 },
  },
];

function makeReviewViewModel(input?: {
  evidence?: WeeklyReviewEvidence;
  insights?: ExecutionInsight[];
}): WeeklyReviewViewModel {
  return {
    evidence: input?.evidence ?? defaultEvidence,
    insights: input?.insights ?? defaultInsights,
  };
}

function makeCompletedReview(overrides: Partial<UniversalWeeklyReview> = {}): UniversalWeeklyReview {
  return {
    weekNumber: 3,
    leadCompletionPercent: 81,
    executionScore: 81,
    lagProgressValue: "25",
    biggestOutputThisWeek: "Legacy output",
    mainObstacle: "",
    nextWeekPriority: "Ship next",
    workloadDecision: "keep same",
    reviewCompleted: true,
    commitmentsKept: ["Publish draft"],
    commitmentsMissed: ["Send update"],
    insights: "Protect morning focus.",
    nextWeekCommitments: ["Ship next"],
    ...overrides,
  };
}

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
  const system = overrides.system ?? makeSystem();
  const currentWeekEvidence = {
    ...defaultEvidence,
    weekNumber: system.currentWeek,
    totalWeeks: system.totalWeeks,
    previousWeek: system.currentWeek === 1 ? null : defaultEvidence.previousWeek,
  };

  return {
    system,
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
    weeklyReviewViewModels: {
      [system.currentWeek]: makeReviewViewModel({ evidence: currentWeekEvidence }),
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
  it("uses the shared cycle rail and flat tactic rows before review", () => {
    render(
      <TwelveWeekWeekTab
        {...makeProps({
          reviewDueToday: false,
          system: makeSystem({
            taskInstances: [
              {
                id: "task_week_3",
                weekNumber: 3,
                scheduledDate: "2026-05-08",
                title: "Viết draft",
                leadIndicatorName: "Viết blog",
                tacticId: "indicator_1",
                isCore: true,
                completed: true,
              },
            ],
          }),
          coreIndicators: [{ id: "indicator_1", name: "Viết blog", target: "2", unit: "bài" }],
        })}
      />,
    );

    expect(screen.getByTestId("twelve-week-cycle-rail")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tuần 3, tuần hiện tại/i })).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(screen.getByTestId("weekly-tactics-list")).toHaveClass("divide-y", "divide-app-line");
  });

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

  it("renders weekly evidence and supplied insights before human reflection", () => {
    render(<TwelveWeekWeekTab {...makeProps()} />);

    const evidence = screen.getByTestId("weekly-evidence-panel");
    const reflection = screen.getByLabelText(/góc nhìn\/điều học được/i);

    expect(screen.getByText("Chỉ số dẫn dắt đang chạy mạnh")).toBeInTheDocument();
    expect(evidence.compareDocumentPosition(reflection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("keeps reflection fields and secondary Premium and Emotion content reachable", () => {
    render(<TwelveWeekWeekTab {...makeProps()} />);

    expect(screen.getByLabelText(/góc nhìn\/điều học được/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cam kết của tuần tới/i)).toBeInTheDocument();
    expect(screen.getByText(/Dòng chảy Cảm xúc Tuần 3/i)).toBeInTheDocument();
    expect(screen.getByText("Upgrade insight")).toBeInTheDocument();
    expect(screen.getByTestId("weekly-review-mobile-sticky-cta")).toBeInTheDocument();
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

    const chip = screen.getByLabelText("Cam kết: Plan a");
    expect(chip).toBeInTheDocument();
    expect(within(chip).getByText("Plan a")).toHaveClass("break-words");
    expect(within(chip).getByRole("button", { name: "Xóa cam kết: Plan a" })).toHaveClass(
      "size-11",
      "sm:size-9",
      "after:h-11",
      "after:min-w-[44px]",
    );
    expect(screen.getByLabelText(/cam kết của tuần tới/i)).toHaveValue("");
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
    expect(screen.getByLabelText(/cam kết của tuần tới/i)).toBeDisabled();
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
    const emptyEvidence: WeeklyReviewEvidence = {
      ...defaultEvidence,
      completion: { completed: 0, total: 0, percent: 0, isEmpty: true },
      core: null,
      optional: null,
      checkIns: { days: 0, possibleDays: 7 },
      overdueOpenCount: 0,
      carryOverCount: 0,
      onTime: null,
      previousWeek: null,
    };
    render(
      <TwelveWeekWeekTab
        {...makeProps({
          weekCompletion: { completed: 0, total: 0, percent: 0, isEmpty: true },
          weeklyReviewViewModels: { 3: makeReviewViewModel({ evidence: emptyEvidence, insights: [] }) },
        })}
      />,
    );

    expect(screen.getByText("Tuần này chưa có việc được lên lịch.")).toBeInTheDocument();
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
    expect(within(actionBar).getByRole("button", { name: /Chốt review tuần này/i })).toHaveClass("min-h-12");
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

    await user.click(screen.getByRole("button", { name: /bắt đầu review sớm/i }));
    const saveButton = screen.getAllByRole("button", { name: /chốt review tuần này/i })[0];
    await user.click(saveButton);
    expect(onSaveWeeklyReview).not.toHaveBeenCalled();

    // Dialog opens — cancel keeps the review unsaved
    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /quay lại chỉnh sửa/i }));
    expect(onSaveWeeklyReview).not.toHaveBeenCalled();

    // Reopen and confirm — save fires
    const confirmSaveButton = screen.getAllByRole("button", { name: /chốt review tuần này/i })[0];
    await user.click(confirmSaveButton);
    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /vẫn lưu sớm/i }));
    expect(onSaveWeeklyReview).toHaveBeenCalledTimes(1);
  });

  it("shows completion evidence as the weekly hero and lag progress as secondary detail", () => {
    const evidence = {
      ...defaultEvidence,
      completion: { completed: 4, total: 5, percent: 80, isEmpty: false },
    };

    render(
      <TwelveWeekWeekTab
        {...makeProps({
          currentScoreValue: 20,
          weekCompletion: { completed: 4, total: 5, percent: 80 },
          currentLagMetricValue: "25",
          weeklyReviewViewModels: { 3: makeReviewViewModel({ evidence }) },
        })}
      />,
    );

    const evidencePanel = screen.getByTestId("weekly-evidence-panel");
    expect(within(evidencePanel).getByText("4 / 5 việc")).toBeInTheDocument();
    expect(within(evidencePanel).getByText("80%")).toBeInTheDocument();
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
      if (!button.closest('[data-testid="weekly-review-mobile-sticky-cta"]')) {
        expect(button).toHaveClass("min-h-11");
      }
    }
  });

  it("summarizes WAM answers after review submit", () => {
    render(
      <TwelveWeekWeekTab
        {...makeProps({
          currentReview: makeCompletedReview(),
        })}
      />,
    );

    const summary = screen.getByTestId("weekly-review-summary");
    expect(within(summary).getByTestId("weekly-evidence-panel")).toBeInTheDocument();
    expect(within(summary).getByText("17 / 21 việc")).toBeInTheDocument();
    expect(within(summary).getByText("Chỉ số dẫn dắt đang chạy mạnh")).toBeInTheDocument();
    expect(summary).toHaveTextContent("Đã giữ 1/2 cam kết");
    expect(summary).toHaveTextContent("Protect morning focus.");
    expect(summary).toHaveTextContent("Ship next");
  });
});
