import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PendingSMARTGoal } from "@/lib/smart-goal";
import type { PendingFeasibilityResult, TwelveWeekSetupDraft } from "../types";
import { OutcomeStepLab } from "./OutcomeStepLab";

const smartGoal: PendingSMARTGoal = {
  focusArea: "Career",
  specific: "Ra mắt flow 12 tuần dễ dùng hơn",
  measurable: "Một flow hoàn chỉnh",
  achievable: "Ship theo từng màn",
  relevant: "Đây là luồng chính",
  timeBound: "Trong 12 tuần tới",
};

const feasibility: PendingFeasibilityResult = {
  resultType: "realistic",
  resultTitle: "Khả thi",
  resultSummary: "Có thể bắt đầu với tải cân bằng.",
  recommendation: "Giữ tuần đầu gọn.",
  readinessScore: 16,
  adjustedScore: 17,
  wheelScore: 7,
};

const draft: TwelveWeekSetupDraft = {
  templateId: "",
  goalType: "Project Completion",
  vision12Week: "",
  week12Outcome: "",
  lagMetricName: "",
  lagMetricTarget: "",
  lagMetricUnit: "",
  leadIndicators: [],
  startDate: "2026-07-20",
  reviewDay: "Sunday",
  tacticLoadPreference: "balanced",
  week4Milestone: "",
  week8Milestone: "",
  successEvidence: "",
  dailyTimeBudget: "",
  preferredDays: [],
  personalConstraint: "",
};

describe("OutcomeStepLab Guided Canvas", () => {
  it("starts with the 12-week destination instead of a framework recap", () => {
    render(
      <OutcomeStepLab
        draft={draft}
        onChange={vi.fn()}
        smartGoal={smartGoal}
        feasibility={feasibility}
        currentPlan="FREE"
        selectedTemplate={null}
        recommendedTemplate={null}
        onTemplateSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Bạn muốn thấy điều gì sau 12 tuần?" })).toBeInTheDocument();
    expect(screen.getByText(/không phải danh sách việc cần làm mỗi ngày/i)).toBeInTheDocument();
  });
});
