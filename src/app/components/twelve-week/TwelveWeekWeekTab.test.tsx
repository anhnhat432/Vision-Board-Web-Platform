import { type ComponentProps, useState } from "react";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
    keepTactic: "Deep work buổi sáng",
    reduceTactic: "Việc tùy chọn buổi tối",
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
    onSaveWeeklyReview: vi.fn().mockResolvedValue({ status: "saved" }),
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

  it("shows evidence and deterministic insights before exactly three core questions", () => {
    render(<TwelveWeekWeekTab {...makeProps()} />);

    const evidence = screen.getByTestId("weekly-evidence-panel");
    const questions = screen.getByTestId("weekly-review-three-questions");

    expect(screen.getByText("Chỉ số dẫn dắt đang chạy mạnh")).toBeInTheDocument();
    expect(evidence.compareDocumentPosition(questions) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByLabelText(/Điều gì đã giúp bạn tiến lên tuần này/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Điều gì khiến kế hoạch lệch khỏi dự kiến/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tuần sau bạn muốn thay đổi điều gì/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/góc nhìn\/điều học được/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/ưu tiên số 1/i)).not.toBeInTheDocument();
  });

  it("keeps secondary Premium and Emotion content reachable", () => {
    render(<TwelveWeekWeekTab {...makeProps()} />);

    expect(screen.getByText(/Dòng chảy Cảm xúc Tuần 3/i)).toBeInTheDocument();
    expect(screen.getByText("Upgrade insight")).toBeInTheDocument();
    expect(screen.getByTestId("weekly-review-secondary-details")).toBeInTheDocument();
    expect(screen.getByTestId("weekly-review-mobile-sticky-cta")).toBeInTheDocument();
  });

  it("adds a next-week commitment chip with Enter and clears the input", async () => {
    const user = userEvent.setup();
    render(<StatefulWeekTab />);

    const input = screen.getByLabelText(/Tuần sau bạn muốn thay đổi điều gì/i);
    await user.type(input, "Plan a{Enter}");

    const chip = screen.getByLabelText("Cam kết: Plan a");
    expect(chip).toBeInTheDocument();
    expect(within(chip).getByText("Plan a")).toHaveClass("break-words");
    expect(within(chip).getByRole("button", { name: "Xóa cam kết: Plan a" })).toBeEnabled();
    expect(input).toHaveValue("");
  });

  it("does not add a case-insensitive duplicate commitment", async () => {
    const user = userEvent.setup();
    render(<StatefulWeekTab initialCommitments={["Plan a"]} />);

    const input = screen.getByLabelText(/Tuần sau bạn muốn thay đổi điều gì/i);
    await user.type(input, "plan A{Enter}");

    expect(screen.getAllByLabelText("Cam kết: Plan a")).toHaveLength(1);
    expect(screen.getByLabelText("Cam kết: Plan a")).toHaveAttribute("data-state", "duplicate");
    expect(input).toHaveFocus();
  });

  it("removes a next-week commitment chip", async () => {
    const user = userEvent.setup();
    render(<StatefulWeekTab initialCommitments={["Plan a"]} />);

    await user.click(screen.getByRole("button", { name: "Xóa cam kết: Plan a" }));

    expect(screen.queryByLabelText("Cam kết: Plan a")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Tuần sau bạn muốn thay đổi điều gì/i)).toBeEnabled();
  });

  it("caps next-week commitments at three", () => {
    render(<StatefulWeekTab />);

    const input = screen.getByLabelText(/Tuần sau bạn muốn thay đổi điều gì/i);
    fireEvent.change(input, { target: { value: "Plan 1,Plan 2,Plan 3,Plan 4," } });

    expect(screen.getByLabelText("Cam kết: Plan 3")).toBeInTheDocument();
    expect(screen.queryByLabelText("Cam kết: Plan 4")).not.toBeInTheDocument();
    expect(input).toBeDisabled();
    expect(screen.getByText("Đã đạt tối đa 3 cam kết. Xoá bớt chip để thêm mới.")).toBeInTheDocument();
  });

  it("removes the last commitment when Backspace is pressed in an empty input", async () => {
    const user = userEvent.setup();
    render(<StatefulWeekTab initialCommitments={["Plan a", "Plan b"]} />);

    const input = screen.getByLabelText(/Tuần sau bạn muốn thay đổi điều gì/i);
    await user.click(input);
    await user.keyboard("{Backspace}");

    expect(screen.getByLabelText("Cam kết: Plan a")).toBeInTheDocument();
    expect(screen.queryByLabelText("Cam kết: Plan b")).not.toBeInTheDocument();
  });

  it("uses neutral copy when a week has no scheduled tasks", () => {
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
    expect(screen.getByLabelText(/Tuần này có điều gì đáng ghi lại/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Điều gì khiến tuần này chưa có việc được lên lịch/i)).toBeInTheDocument();
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
  });

  it("avoids failure framing for a perfect week", () => {
    const perfectEvidence: WeeklyReviewEvidence = {
      ...defaultEvidence,
      completion: { completed: 5, total: 5, percent: 100, isEmpty: false },
    };
    render(
      <TwelveWeekWeekTab
        {...makeProps({
          weekCompletion: { completed: 5, total: 5, percent: 100 },
          weeklyReviewViewModels: { 3: makeReviewViewModel({ evidence: perfectEvidence }) },
        })}
      />,
    );

    expect(screen.getByLabelText(/Có điều gì vẫn làm bạn tốn sức hoặc có thể làm gọn hơn/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/thất bại/i)).not.toBeInTheDocument();
  });

  it("keeps normal causal copy for a low-completion week", () => {
    const lowEvidence: WeeklyReviewEvidence = {
      ...defaultEvidence,
      completion: { completed: 1, total: 5, percent: 20, isEmpty: false },
    };
    render(
      <TwelveWeekWeekTab
        {...makeProps({
          weekCompletion: { completed: 1, total: 5, percent: 20 },
          weeklyReviewViewModels: { 3: makeReviewViewModel({ evidence: lowEvidence }) },
        })}
      />,
    );

    expect(screen.getByLabelText(/Điều gì khiến kế hoạch lệch khỏi dự kiến/i)).toBeInTheDocument();
  });

  it("keeps the mobile save CTA above bottom navigation with truthful three-question status", () => {
    render(<TwelveWeekWeekTab {...makeProps()} />);

    const shell = screen.getByTestId("weekly-review-shell");
    const actionBar = screen.getByTestId("weekly-review-mobile-sticky-cta");

    expect(shell).toHaveClass("pb-[calc(8.5rem+env(safe-area-inset-bottom))]", "md:pb-0");
    expect(actionBar).toHaveClass(
      "fixed",
      "bottom-[calc(5rem+env(safe-area-inset-bottom))]",
      "left-0",
      "right-0",
      "backdrop-blur-md",
      "md:hidden",
    );
    expect(within(actionBar).getByText("Đã trả lời 0/3 câu")).toBeInTheDocument();
    expect(within(actionBar).getByText("Cần hướng tuần sau")).toBeInTheDocument();
    expect(within(actionBar).getByRole("button", { name: "Lưu review" })).toHaveClass("min-h-12");
  });

  it("blocks review submit for a future week number", async () => {
    const user = userEvent.setup();
    const onSaveWeeklyReview = vi.fn().mockResolvedValue({ status: "saved" });
    const system = makeSystem({ currentWeek: 99 });

    render(
      <TwelveWeekWeekTab
        {...makeProps({
          system,
          weeklyForm: {
            ...makeProps({ system }).weeklyForm,
            nextWeekCommitments: ["Plan next week"],
            workloadDecision: "keep same",
          },
          onSaveWeeklyReview,
        })}
      />,
    );

    for (const button of screen.getAllByRole("button", { name: "Lưu review" })) {
      expect(button).toBeDisabled();
    }
    await user.click(screen.getAllByRole("button", { name: "Lưu review" })[0]);

    expect(onSaveWeeklyReview).not.toHaveBeenCalled();
    expect(screen.getByTestId("weekly-review-readiness")).toHaveTextContent(/không thể chốt tuần tương lai/i);
  });

  it("asks for confirmation before saving the current week early", async () => {
    const user = userEvent.setup();
    const onSaveWeeklyReview = vi.fn().mockResolvedValue({ status: "saved" });

    render(
      <TwelveWeekWeekTab
        {...makeProps({
          reviewDueToday: false,
          weeklyForm: {
            ...makeProps().weeklyForm,
            nextWeekCommitments: ["Plan next week"],
            workloadDecision: "keep same",
          },
          onSaveWeeklyReview,
        })}
      />,
    );

    await user.click(screen.getByRole("button", { name: /bắt đầu review sớm/i }));
    await user.click(screen.getAllByRole("button", { name: "Lưu review" })[0]);

    expect(onSaveWeeklyReview).not.toHaveBeenCalled();
    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /vẫn lưu sớm/i }));

    await waitFor(() => expect(onSaveWeeklyReview).toHaveBeenCalledWith(3));
  });

  it("shows optional previous-commitment classification without gating save", async () => {
    const user = userEvent.setup();
    const system = makeSystem({
      currentWeek: 2,
      weeklyReviews: [makeCompletedReview({ weekNumber: 1, nextWeekCommitments: ["Publish draft"] })],
    });

    render(
      <TwelveWeekWeekTab
        {...makeProps({
          system,
          weeklyForm: {
            ...makeProps({ system }).weeklyForm,
            nextWeekCommitments: ["Protect two mornings"],
            workloadDecision: "keep same",
          },
        })}
      />,
    );

    for (const button of screen.getAllByRole("button", { name: "Lưu review" })) {
      expect(button).toBeEnabled();
    }
    await user.click(screen.getByRole("button", { name: /Phân loại cam kết cũ \(không bắt buộc\)/i }));
    expect(screen.getByText("Publish draft")).toBeInTheDocument();
  });

  it("accepts a concrete reduce-only answer as Question 3 without inventing a priority", () => {
    render(
      <TwelveWeekWeekTab
        {...makeProps({
          weeklyForm: {
            ...makeProps().weeklyForm,
            reduceTactic: "Giảm việc tùy chọn buổi tối",
            workloadDecision: "keep same",
          },
        })}
      />,
    );

    expect(screen.getByTestId("weekly-review-readiness")).toHaveTextContent("1/3 câu");
    for (const button of screen.getAllByRole("button", { name: "Lưu review" })) {
      expect(button).toBeEnabled();
    }
  });

  it("counts a workload-only decision as an answered Question 3", () => {
    render(
      <TwelveWeekWeekTab
        {...makeProps({
          weeklyForm: {
            ...makeProps().weeklyForm,
            workloadDecision: "reduce slightly",
          },
        })}
      />,
    );

    expect(screen.getByTestId("weekly-review-readiness")).toHaveTextContent("1/3 câu");
    for (const button of screen.getAllByRole("button", { name: "Lưu review" })) {
      expect(button).toBeEnabled();
    }
  });

  it("uses a friendly Week 1 empty state for optional classification", () => {
    const system = makeSystem({ currentWeek: 1 });
    render(<TwelveWeekWeekTab {...makeProps({ system })} />);

    expect(screen.getByText(/tuần đầu chưa có cam kết cũ cần phân loại/i)).toBeInTheDocument();
  });

  it("allows Week 12 reflection without inventing a Week 13 plan", () => {
    const system = makeSystem({ currentWeek: 12, totalWeeks: 12 });
    render(
      <TwelveWeekWeekTab
        {...makeProps({
          system,
          weeklyForm: {
            ...makeProps({ system }).weeklyForm,
            keepTactic: "Mang nhịp deep work sang chu kỳ mới",
          },
        })}
      />,
    );

    expect(screen.getByLabelText(/Bạn muốn mang điều gì sang chu kỳ tiếp theo/i)).toBeInTheDocument();
    expect(screen.queryByText(/Mức tải bạn muốn thử/i)).not.toBeInTheDocument();
    for (const button of screen.getAllByRole("button", { name: "Lưu review" })) {
      expect(button).toBeEnabled();
    }
    expect(screen.getByTestId("weekly-review-readiness")).toHaveTextContent(/không tạo hoặc áp dụng kế hoạch Tuần 13/i);
  });

  it("renders Week 12 closure without an apply action", () => {
    const review = makeCompletedReview({ weekNumber: 12 });
    const system = makeSystem({ currentWeek: 12, totalWeeks: 12, weeklyReviews: [review] });

    render(
      <TwelveWeekWeekTab
        {...makeProps({
          system,
          currentReview: review,
        })}
      />,
    );

    expect(screen.getByText(/Đây là tuần cuối/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Xác nhận thay đổi tuần sau/i })).not.toBeInTheDocument();
  });

  it("targets the selected historical week when editing and saving", async () => {
    const user = userEvent.setup();
    const historicalReview = makeCompletedReview({
      weekNumber: 1,
      nextWeekPriority: "",
      nextWeekCommitments: [],
    });
    const system = makeSystem({ weeklyReviews: [historicalReview] });
    const onPrepareReviewEdit = vi.fn().mockReturnValue(true);
    const onSaveWeeklyReview = vi.fn().mockResolvedValue({ status: "saved" });

    render(
      <TwelveWeekWeekTab
        {...makeProps({
          system,
          weeklyReviewViewModels: {
            1: makeReviewViewModel({ evidence: { ...defaultEvidence, weekNumber: 1 } }),
            3: makeReviewViewModel(),
          },
          weeklyForm: {
            ...makeProps({ system }).weeklyForm,
            keepTactic: "Historical keep",
            nextWeekCommitments: [],
            workloadDecision: "keep same",
          },
          onPrepareReviewEdit,
          onSaveWeeklyReview,
        })}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Tuần 1, đã chốt review/i }));
    expect(screen.getByText(/Review lịch sử đã lưu/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Xác nhận thay đổi tuần sau/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Chỉnh sửa đánh giá/i }));

    expect(onPrepareReviewEdit).toHaveBeenCalledWith(1);
    expect(screen.getByTestId("weekly-review-readiness")).toHaveTextContent(/chỉ cập nhật review lịch sử/i);
    for (const button of screen.getAllByRole("button", { name: "Lưu review" })) {
      expect(button).toBeEnabled();
    }
    await user.click(screen.getAllByRole("button", { name: "Lưu review" })[0]);
    await waitFor(() => expect(onSaveWeeklyReview).toHaveBeenCalledWith(1));
  });

  it("keeps a historical edit form open when local review save fails", async () => {
    const user = userEvent.setup();
    const historicalReview = makeCompletedReview({ weekNumber: 1 });
    const system = makeSystem({ weeklyReviews: [historicalReview] });

    render(
      <TwelveWeekWeekTab
        {...makeProps({
          system,
          weeklyReviewViewModels: {
            1: makeReviewViewModel({ evidence: { ...defaultEvidence, weekNumber: 1 } }),
            3: makeReviewViewModel(),
          },
          weeklyForm: {
            ...makeProps({ system }).weeklyForm,
            nextWeekCommitments: ["Keep the existing plan"],
            workloadDecision: "keep same",
          },
          onPrepareReviewEdit: vi.fn().mockReturnValue(true),
          onSaveWeeklyReview: vi.fn().mockResolvedValue({ status: "failed" }),
        })}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Tuần 1, đã chốt review/i }));
    await user.click(screen.getByRole("button", { name: /Chỉnh sửa đánh giá/i }));
    await user.click(screen.getAllByRole("button", { name: "Lưu review" })[0]);

    expect(await screen.findByTestId("weekly-review-three-questions")).toBeInTheDocument();
    expect(screen.queryByTestId("weekly-review-summary")).not.toBeInTheDocument();
  });

  it("resets edit state when the user selects another week", async () => {
    const user = userEvent.setup();
    const week1 = makeCompletedReview({ weekNumber: 1 });
    const week2 = makeCompletedReview({ weekNumber: 2 });
    const system = makeSystem({ weeklyReviews: [week1, week2] });
    const onResetReviewForm = vi.fn().mockReturnValue(true);

    render(
      <TwelveWeekWeekTab
        {...makeProps({
          system,
          weeklyReviewViewModels: {
            1: makeReviewViewModel({ evidence: { ...defaultEvidence, weekNumber: 1 } }),
            2: makeReviewViewModel({ evidence: { ...defaultEvidence, weekNumber: 2 } }),
            3: makeReviewViewModel(),
          },
          onPrepareReviewEdit: vi.fn().mockReturnValue(true),
          onResetReviewForm,
        })}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Tuần 1, đã chốt review/i }));
    expect(onResetReviewForm).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /Chỉnh sửa đánh giá/i }));
    expect(screen.getByTestId("weekly-review-three-questions")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Tuần 2, đã chốt review/i }));

    expect(onResetReviewForm).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("weekly-review-three-questions")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Kết quả Tuần 2" })).toBeInTheDocument();
  });

  it("summarizes saved answers and presents a separate current-week handoff", () => {
    const review = makeCompletedReview();
    const system = makeSystem({
      weeklyPlans: [{ weekNumber: 4, phaseName: "Execute", focus: "Old focus", milestone: "", completed: false }],
    });

    render(
      <TwelveWeekWeekTab
        {...makeProps({
          system,
          currentReview: review,
        })}
      />,
    );

    const summary = screen.getByTestId("weekly-review-summary");
    expect(within(summary).getByTestId("weekly-evidence-panel")).toBeInTheDocument();
    expect(summary).toHaveTextContent("Deep work buổi sáng");
    expect(summary).toHaveTextContent("Việc tùy chọn buổi tối");
    expect(summary).toHaveTextContent("Protect morning focus.");
    expect(summary).toHaveTextContent("Ship next");
    expect(screen.getByText("Review đã lưu. Kế hoạch tuần sau chưa thay đổi.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Xác nhận thay đổi tuần sau/i })).toBeInTheDocument();
  });
});
