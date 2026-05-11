/**
 * Accessibility smoke tests for the core funnel's patched controls.
 *
 * Scope: only the controls that received a11y fixes in the audit pass. Each
 * test renders a small subset (no routing, no storage) and asserts accessible
 * name / aria relationships via Testing Library. These tests are intentionally
 * narrow to avoid coupling to business logic.
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";

import { Card, CardHeader, CardTitle } from "../components/ui/card";
import { FeasibilityStepShell } from "./FeasibilityCheck/components/FeasibilityStepShell";
import { ResultStep } from "./FeasibilityCheck/components/ResultStep";
import { LeadIndicatorsStep } from "./12WeekSetup/components/LeadIndicatorsStep";
import { MeasurableStep } from "./SMARTGoalSetup/components/MeasurableStep";
import { SmartGoalStepShell } from "./SMARTGoalSetup/components/SmartGoalStepShell";
import { SpecificStep } from "./SMARTGoalSetup/components/SpecificStep";
import { PlanPreview } from "@/features/plan12week/components/PlanPreview";
import { ReviewStep as TwelveWeekReviewStep } from "@/features/plan12week/pages/12WeekSetup/components/ReviewStep";
import type {
  LeadIndicatorDraft as FeatureLeadIndicatorDraft,
  TwelveWeekSetupDraft as FeatureTwelveWeekSetupDraft,
} from "@/features/plan12week/pages/12WeekSetup/types";
import type { PendingSMARTGoal } from "@/lib/smart-goal";
import type { Question, ResultData } from "./FeasibilityCheck/types";
import type { LeadIndicatorDraft, TwelveWeekSetupDraft } from "./12WeekSetup/types";
import type { SMARTData, SmartStepDefinition } from "./SMARTGoalSetup/types";

function makeSmartData(overrides: Partial<SMARTData> = {}): SMARTData {
  return {
    specific: { goal_statement: "" },
    measurable: { metric_name: "", baseline_value: "", target_value: "" },
    achievable: { weekly_time_commitment_hours: "", required_skills: "", support_resources: "" },
    relevant: { motivation_reason: "", life_dimension_alignment: "" },
    timeBound: { mode: "weeks", target_date: "", target_weeks: "" },
    ...overrides,
  };
}

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
}

function makePendingSmartGoal(): PendingSMARTGoal {
  return {
    focusArea: "Career",
    specific: "Ship a focused writing portfolio",
    measurable: "Publish 6 portfolio pieces",
    achievable: "Write 5 hours each week",
    relevant: "Build a better career path",
    timeBound: "12 weeks",
  };
}

function makeFeasibilityResult(): ResultData {
  return {
    type: "realistic",
    title: "Đủ thực tế để bắt đầu",
    summary: "Bạn có đủ nền để chạy một chu kỳ 12 tuần gọn.",
    recommendation: "Giữ tuần đầu nhẹ và đo được.",
    readinessScore: 16,
    adjustedScore: 17,
    wheelScore: 7,
    diagnosticScore: 14,
    maxDiagnosticScore: 20,
    axisScores: [
      {
        axis: "time",
        label: "Thời gian",
        score: 3,
        maxScore: 4,
        percent: 75,
        diagnostic: "Có đủ khung giờ để bắt đầu.",
      },
      {
        axis: "energy",
        label: "Năng lượng",
        score: 4,
        maxScore: 4,
        percent: 100,
        diagnostic: "Năng lượng hiện tại ổn.",
      },
    ],
    bottleneck: {
      axis: "time",
      label: "Thời gian",
      score: 3,
      action: "Giữ lịch tuần đầu thật gọn.",
    },
    planLoad: "balanced",
    weeklyCapacity: "medium",
    firstWeekGuidance: "Bắt đầu bằng 2 việc lặp lại.",
    scopeRecommendation: "Chọn một kết quả chính cho chu kỳ này.",
  };
}

function makeFeatureIndicator(overrides: Partial<FeatureLeadIndicatorDraft> = {}): FeatureLeadIndicatorDraft {
  return {
    id: overrides.id ?? "lead_1",
    name: overrides.name ?? "Viết 3 phiên làm việc sâu",
    target: overrides.target ?? "3",
    unit: overrides.unit ?? "phiên/tuần",
    type: overrides.type ?? "core",
    cadence: overrides.cadence ?? "spread",
    commitment: overrides.commitment,
  };
}

function makeFeatureSetupDraft(): FeatureTwelveWeekSetupDraft {
  return {
    templateId: "",
    goalType: "Project Completion",
    vision12Week: "Tạo portfolio rõ ràng để ứng tuyển.",
    week12Outcome: "Portfolio có 6 bài chất lượng.",
    lagMetricName: "Bài portfolio",
    lagMetricTarget: "6",
    lagMetricUnit: "bài",
    leadIndicators: [makeFeatureIndicator()],
    startDate: "2026-05-04",
    reviewDay: "Sunday",
    tacticLoadPreference: "balanced",
    week4Milestone: "Có 2 bài nháp",
    week8Milestone: "Có 4 bài hoàn chỉnh",
    successEvidence: "Portfolio được public.",
    dailyTimeBudget: "45 phút",
    preferredDays: [1, 3, 5],
    personalConstraint: "time",
  };
}

function makePreviewPlan(draft = makeFeatureSetupDraft()) {
  const leadMetrics = draft.leadIndicators.map((indicator) => ({
    name: indicator.name,
    weeklyTarget: Number.parseInt(indicator.target, 10) || 1,
  }));

  return {
    vision: draft.vision12Week,
    weeks: [
      {
        weekNumber: 1,
        focus: "Báº¯t Ä‘áº§u gá»n vÃ  rÃµ.",
        expectedOutput: "Báº£n nhÃ¡p Ä‘áº§u tiÃªn.",
        leadMetrics,
        tasks: [{ id: "task_1", title: "[Cá»T Lá»–I] Viáº¿t outline", scheduledDate: "2026-05-10" }],
      },
      {
        weekNumber: 2,
        focus: "Giá»¯ nhá»‹p.",
        expectedOutput: "Báº£n nhÃ¡p thá»© hai.",
        leadMetrics,
        tasks: [],
      },
      {
        weekNumber: 3,
        focus: "Tinh chá»‰nh.",
        expectedOutput: "Feedback Ä‘áº§u tiÃªn.",
        leadMetrics,
        tasks: [],
      },
      {
        weekNumber: 4,
        focus: "Chá»‘t má»‘c 4 tuáº§n.",
        expectedOutput: "2 bÃ i nhÃ¡p.",
        leadMetrics,
        tasks: [],
      },
    ],
  };
}

describe("FeasibilityStepShell — a11y", () => {
  const question: Question = {
    id: 1,
    axis: "time",
    axisLabel: "Thời gian",
    question: "Bạn có bao nhiêu giờ mỗi tuần để tập trung vào mục tiêu này?",
    helper: "Tính giờ thực tế, không phải giờ lý tưởng.",
    options: [
      { value: "low", label: "Dưới 3 giờ", score: 1, diagnostic: "" },
      { value: "mid", label: "3-6 giờ", score: 2, diagnostic: "" },
    ],
  };

  it("binds the radio group to the question heading via aria-labelledby", () => {
    const headingRef = createRef<HTMLHeadingElement>();
    const targetRef = createRef<HTMLDivElement>();
    render(
      <FeasibilityStepShell
        currentQuestion={question}
        currentStep={0}
        totalSteps={5}
        selectedAnswer={undefined}
        onAnswerChange={() => {}}
        onBack={() => {}}
        onNext={() => {}}
        targetRef={targetRef}
        headingRef={headingRef}
      />,
    );
    const group = screen.getByRole("radiogroup");
    const labelledBy = group.getAttribute("aria-labelledby");
    expect(labelledBy).toBe("feasibility-question-1");
    const heading = document.getElementById(labelledBy ?? "");
    expect(heading?.textContent).toContain("Bạn có bao nhiêu giờ");
  });

  it("describes the radio group with the helper hint", () => {
    const headingRef = createRef<HTMLHeadingElement>();
    const targetRef = createRef<HTMLDivElement>();
    render(
      <FeasibilityStepShell
        currentQuestion={question}
        currentStep={0}
        totalSteps={5}
        selectedAnswer={undefined}
        onAnswerChange={() => {}}
        onBack={() => {}}
        onNext={() => {}}
        targetRef={targetRef}
        headingRef={headingRef}
      />,
    );
    const group = screen.getByRole("radiogroup");
    const describedBy = group.getAttribute("aria-describedby");
    expect(describedBy).toBe("feasibility-question-1-helper");
    const helper = document.getElementById(describedBy ?? "");
    expect(helper?.textContent).toContain("giờ thực tế");
  });
});

describe("Feasibility ResultStep — mobile detail disclosure", () => {
  it("keeps the result hero and primary CTA visible while mobile details are collapsed behind one CTA", () => {
    setViewportWidth(375);

    render(
      <ResultStep
        result={makeFeasibilityResult()}
        focusArea="Career"
        pendingGoal={makePendingSmartGoal()}
        onContinue={() => {}}
        onAdjustGoal={() => {}}
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Đủ thực tế để bắt đầu" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Tạo kế hoạch 12 tuần/i }).length).toBeGreaterThan(0);
    const detailsTrigger = screen.getByRole("button", { name: "Mở chi tiết" });
    expect(detailsTrigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.getAllByRole("button", { name: "Mở chi tiết" })).toHaveLength(1);
  });

  it("expands detailed feasibility analysis by default on desktop", () => {
    setViewportWidth(1024);

    render(
      <ResultStep
        result={makeFeasibilityResult()}
        focusArea="Career"
        pendingGoal={makePendingSmartGoal()}
        onContinue={() => {}}
        onAdjustGoal={() => {}}
      />,
    );

    const detailsTrigger = screen.getByRole("button", { name: "Phân tích chi tiết" });
    expect(detailsTrigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Hướng đi tiếp theo")).toBeInTheDocument();
    expect(screen.getByText("Xem 7 góc nhìn")).toBeInTheDocument();
    expect(screen.getByText("Xem nhịp triển khai gợi ý")).toBeInTheDocument();
  });
});

describe("TwelveWeekSetup ReviewStep — accordion", () => {
  it("renders the four review panels as one-at-a-time mobile accordion panels", async () => {
    setViewportWidth(375);
    const user = userEvent.setup();
    const draft = makeFeatureSetupDraft();
    const leadIndicator = makeFeatureIndicator();

    render(
      <TwelveWeekReviewStep
        smartGoal={makePendingSmartGoal()}
        draft={draft}
        focusArea="Career"
        selectedTemplate={null}
        setupGuideSupport={null}
        setupGuideTemplate={null}
        weekOneTaskPreview={["Viết outline bài đầu tiên"]}
        weekOneTaskWarning={null}
        feasibility={null}
        scheduledLeadIndicators={[{ ...leadIndicator, schedule: [1, 3, 5] }]}
        onChange={() => {}}
      />,
    );

    const outcome = screen.getByRole("button", { name: "Tóm tắt kết quả" });
    const indicators = screen.getByRole("button", { name: "Xem trước việc lặp lại" });
    const schedule = screen.getByRole("button", { name: "Xem trước lịch" });
    const tactics = screen.getByRole("button", { name: "Danh sách việc" });

    expect(outcome).toHaveAttribute("aria-expanded", "false");
    expect(indicators).toHaveAttribute("aria-expanded", "false");
    expect(schedule).toHaveAttribute("aria-expanded", "false");
    expect(tactics).toHaveAttribute("aria-expanded", "false");

    await user.click(indicators);
    expect(indicators).toHaveAttribute("aria-expanded", "true");
    expect(outcome).toHaveAttribute("aria-expanded", "false");

    await user.click(schedule);
    expect(schedule).toHaveAttribute("aria-expanded", "true");
    expect(indicators).toHaveAttribute("aria-expanded", "false");
  });

  it("opens the outcome summary panel by default on desktop", () => {
    setViewportWidth(1024);
    const draft = makeFeatureSetupDraft();
    const leadIndicator = makeFeatureIndicator();

    render(
      <TwelveWeekReviewStep
        smartGoal={makePendingSmartGoal()}
        draft={draft}
        focusArea="Career"
        selectedTemplate={null}
        setupGuideSupport={null}
        setupGuideTemplate={null}
        weekOneTaskPreview={["Viết outline bài đầu tiên"]}
        weekOneTaskWarning={null}
        feasibility={null}
        scheduledLeadIndicators={[{ ...leadIndicator, schedule: [1, 3, 5] }]}
        onChange={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "Tóm tắt kết quả" })).toHaveAttribute("aria-expanded", "true");
  });
});

describe("TwelveWeekSetup PlanPreview — accordion", () => {
  it("renders the actual setup preview as collapsed single-open accordion on mobile", async () => {
    setViewportWidth(375);
    const user = userEvent.setup();
    const draft = makeFeatureSetupDraft();

    render(
      <PlanPreview
        draft={draft}
        previewPlan={makePreviewPlan(draft)}
        onEditTactics={() => {}}
        onConfirm={() => {}}
        onBack={() => {}}
      />,
    );

    const outcome = screen.getByRole("button", { name: "Tóm tắt kết quả" });
    const indicators = screen.getByRole("button", { name: "Xem trước việc lặp lại" });
    const schedule = screen.getByRole("button", { name: "Xem trước lịch" });
    const tactics = screen.getByRole("button", { name: "Danh sách việc" });

    expect(outcome).toHaveAttribute("aria-expanded", "false");
    expect(indicators).toHaveAttribute("aria-expanded", "false");
    expect(schedule).toHaveAttribute("aria-expanded", "false");
    expect(tactics).toHaveAttribute("aria-expanded", "false");

    await user.click(indicators);
    expect(indicators).toHaveAttribute("aria-expanded", "true");

    await user.click(schedule);
    expect(schedule).toHaveAttribute("aria-expanded", "true");
    expect(indicators).toHaveAttribute("aria-expanded", "false");
  });

  it("opens the actual setup preview outcome summary by default on desktop", () => {
    setViewportWidth(1024);
    const draft = makeFeatureSetupDraft();

    render(
      <PlanPreview
        draft={draft}
        previewPlan={makePreviewPlan(draft)}
        onEditTactics={() => {}}
        onConfirm={() => {}}
        onBack={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "Tóm tắt kết quả" })).toHaveAttribute("aria-expanded", "true");
  });
});

describe("SmartGoalStepShell — a11y", () => {
  const step: SmartStepDefinition = {
    key: "specific",
    label: "Cụ thể",
    title: "Bạn muốn đạt điều gì?",
    description: "",
    coaching: "",
    placeholder: "",
    completionHint: "",
  };

  it("gives the 'Dùng gợi ý' button a step-specific accessible name", () => {
    const headingRef = createRef<HTMLHeadingElement>();
    render(
      <SmartGoalStepShell
        stepIndex={0}
        totalSteps={5}
        step={step}
        headingRef={headingRef}
        starterPreview="Một ví dụ ngắn."
        clarityItems={[]}
        clarityDoneCount={0}
        clarityProgress={0}
        summaryRows={[]}
        showReview={false}
        currentStepError={null}
        currentStepSoftWarning={null}
        isCurrentStepValid={false}
        qualityFeedback={null}
        onApplyStarter={() => {}}
        onJumpToStep={() => {}}
        onBack={() => {}}
        onNext={() => {}}
      >
        <div />
      </SmartGoalStepShell>,
    );
    const button = screen.getByRole("button", { name: /Dùng gợi ý cho bước Cụ thể/i });
    expect(button).toBeInTheDocument();
  });
});

describe("SpecificStep — a11y", () => {
  it("links textarea to the hint and counter via aria-describedby", () => {
    const setSmartData = vi.fn();
    render(
      <SpecificStep
        smartData={makeSmartData()}
        setSmartData={setSmartData}
        placeholder="Ví dụ..."
        showError={false}
      />,
    );
    const textarea = screen.getByLabelText("Câu trả lời của bạn");
    const describedBy = textarea.getAttribute("aria-describedby") ?? "";
    expect(describedBy.split(/\s+/)).toEqual(
      expect.arrayContaining(["smart-specific-hint", "smart-specific-counter"]),
    );
    expect(document.getElementById("smart-specific-hint")?.textContent).toMatch(/kiểm chứng/i);
    expect(document.getElementById("smart-specific-counter")?.textContent).toMatch(/ký tự/i);
  });
});

describe("MeasurableStep — a11y", () => {
  it("associates the metric-name hint via aria-describedby", () => {
    const setSmartData = vi.fn();
    render(
      <MeasurableStep
        smartData={makeSmartData()}
        setSmartData={setSmartData}
        currentStepHasDraftContent={false}
      />,
    );
    const input = screen.getByLabelText("Con số hoặc dấu hiệu theo dõi");
    expect(input.getAttribute("aria-describedby")).toBe("smart-metric-name-hint");
    expect(document.getElementById("smart-metric-name-hint")?.textContent).toMatch(
      /tăng hay đứng yên/i,
    );
  });
});

function makeIndicatorDraft(overrides: Partial<LeadIndicatorDraft> = {}): LeadIndicatorDraft {
  return {
    id: overrides.id ?? "tactic_1",
    name: overrides.name ?? "",
    target: overrides.target ?? "",
    unit: overrides.unit ?? "",
    type: overrides.type ?? "core",
    cadence: overrides.cadence ?? "spread",
  };
}

function makeSetupDraft(indicators: LeadIndicatorDraft[]): TwelveWeekSetupDraft {
  return {
    templateId: "",
    goalType: "Project Completion",
    vision12Week: "",
    week12Outcome: "",
    lagMetricName: "",
    lagMetricTarget: "",
    lagMetricUnit: "",
    leadIndicators: indicators,
    startDate: "2026-05-04",
    reviewDay: "Sunday",
    tacticLoadPreference: "balanced",
    week4Milestone: "",
    week8Milestone: "",
    successEvidence: "",
    dailyTimeBudget: "",
    preferredDays: [],
    personalConstraint: "",
  };
}

describe("LeadIndicatorsStep — a11y", () => {
  it("gives the per-indicator remove button an index-scoped accessible name", () => {
    const draft = makeSetupDraft([
      makeIndicatorDraft({ id: "a", name: "Viết draft" }),
      makeIndicatorDraft({ id: "b", name: "" }),
      makeIndicatorDraft({ id: "c", name: "Tập gym" }),
    ]);
    render(
      <LeadIndicatorsStep
        draft={draft}
        coreCount={3}
        optionalCount={0}
        setupGuideSupport={null}
        setupGuideTemplate={null}
        selectedTemplate={null}
        weekOneTaskPreview={[]}
        weekOneTaskWarning={null}
        weekOneTaskGroups={[]}
        onAddIndicator={() => {}}
        onRemoveIndicator={() => {}}
        onIndicatorChange={() => {}}
      />,
    );
    // Named indicator: includes name
    expect(screen.getByRole("button", { name: /Xóa việc 1: Viết draft/i })).toBeInTheDocument();
    // Unnamed indicator: just the index
    expect(screen.getByRole("button", { name: /^Xóa việc 2$/i })).toBeInTheDocument();
  });

  it("surfaces the week-1 warning with a non-color signal (role + text prefix)", () => {
    const draft = makeSetupDraft([
      makeIndicatorDraft({ id: "a", name: "Viết" }),
      makeIndicatorDraft({ id: "b", name: "Tập" }),
    ]);
    render(
      <LeadIndicatorsStep
        draft={draft}
        coreCount={2}
        optionalCount={0}
        setupGuideSupport={null}
        setupGuideTemplate={null}
        selectedTemplate={null}
        weekOneTaskPreview={[]}
        weekOneTaskWarning="Lịch tuần đầu đang quá dày."
        weekOneTaskGroups={[]}
        onAddIndicator={() => {}}
        onRemoveIndicator={() => {}}
        onIndicatorChange={() => {}}
      />,
    );
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(/Cảnh báo:/);
    expect(status).toHaveTextContent("Lịch tuần đầu đang quá dày.");
  });
});

describe("Card heading semantics — a11y", () => {
  it("renders CardTitle as h3 so it does not skip heading levels under a step h2", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Tựa thẻ mẫu</CardTitle>
        </CardHeader>
      </Card>,
    );
    const heading = screen.getByRole("heading", { name: "Tựa thẻ mẫu" });
    expect(heading.tagName).toBe("H3");
  });

  it("allows pages to promote or demote CardTitle without changing visual classes", () => {
    render(
      <>
        <CardTitle as="h2" className="text-lg">
          Page section card
        </CardTitle>
        <CardTitle as="h4" className="text-sm">
          Nested card
        </CardTitle>
      </>,
    );

    const sectionHeading = screen.getByRole("heading", { level: 2, name: "Page section card" });
    const nestedHeading = screen.getByRole("heading", { level: 4, name: "Nested card" });
    expect(sectionHeading).toHaveClass("text-lg");
    expect(nestedHeading).toHaveClass("text-sm");
  });
});
