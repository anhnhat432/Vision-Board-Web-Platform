import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ExecutionInsight, WeeklyReviewEvidence } from "@/features/plan12week/logic";
import { WeeklyReviewEvidencePanel } from "./WeeklyReviewEvidencePanel";

const evidence: WeeklyReviewEvidence = {
  weekNumber: 4,
  totalWeeks: 12,
  dateRange: { start: "2026-08-03", end: "2026-08-09" },
  completion: { completed: 17, total: 21, percent: 81, isEmpty: false },
  core: { completed: 12, total: 14, percent: 86 },
  optional: { completed: 5, total: 7, percent: 71 },
  checkIns: { days: 5, possibleDays: 7 },
  overdueOpenCount: 3,
  carryOverCount: 1,
  onTime: { completed: 15, total: 17 },
  previousWeek: { completed: 18, total: 25, percent: 72, deltaPoints: 9 },
};

const insights: ExecutionInsight[] = [
  {
    id: "strong_lead_metric",
    severity: "positive",
    headline: "Chỉ số dẫn dắt đang chạy mạnh",
    body: "Các chỉ số chính đang được giữ nhịp tốt.",
    nextActionId: "celebrate_keep_going",
    metrics: { recentLeadCompletionPercent: 86 },
  },
  {
    id: "overloaded_week",
    severity: "warning",
    headline: "Khối lượng tuần cần được chú ý",
    body: "Ba việc vẫn đang quá hạn.",
    nextActionId: "reduce_load",
    metrics: { taskCount: 21, completionPercent: 81 },
  },
];

describe("WeeklyReviewEvidencePanel", () => {
  it("renders one grouped factual summary followed by deterministic insights", () => {
    render(
      <WeeklyReviewEvidencePanel
        evidence={evidence}
        insights={insights}
        formatCalendarDate={(value) => value.slice(5).replace("-", "/")}
      />,
    );

    expect(screen.getByRole("region", { name: "Bằng chứng tuần 4" })).toHaveClass("overflow-hidden");
    expect(screen.getByText("17 / 21 việc")).toBeInTheDocument();
    expect(screen.getByText("81%")).toBeInTheDocument();
    expect(screen.getByText("12 / 14 · 86%")).toBeInTheDocument();
    expect(screen.getByText("5 / 7 · 71%")).toBeInTheDocument();
    expect(screen.getByText("5 / 7 ngày")).toBeInTheDocument();
    expect(screen.getByText("Đúng hạn 15 / 17")).toBeInTheDocument();
    expect(screen.getByText("3 việc quá hạn")).toBeInTheDocument();
    expect(screen.getByText("1 việc đã chuyển tuần")).toBeInTheDocument();
    expect(screen.getByText("+9 điểm so với tuần trước")).toBeInTheDocument();
    expect(screen.getByText("Chỉ số dẫn dắt đang chạy mạnh")).toBeInTheDocument();
  });

  it("renders neutral no-task and no-check-in states without a failure percentage", () => {
    render(
      <WeeklyReviewEvidencePanel
        evidence={{
          ...evidence,
          completion: { completed: 0, total: 0, percent: 0, isEmpty: true },
          core: null,
          optional: null,
          checkIns: { days: 0, possibleDays: 7 },
          overdueOpenCount: 0,
          carryOverCount: 0,
          onTime: null,
          previousWeek: null,
        }}
        insights={[]}
        formatCalendarDate={(value) => value}
      />,
    );

    expect(screen.getByText("Tuần này chưa có việc được lên lịch.")).toBeInTheDocument();
    expect(screen.getAllByText("Chưa lên lịch")).toHaveLength(2);
    expect(screen.getByText("Chưa có check-in tuần này")).toBeInTheDocument();
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
    expect(screen.queryByText("Điều đáng chú ý")).not.toBeInTheDocument();
  });

  it("renders textual semantics for insight severity", () => {
    render(
      <WeeklyReviewEvidencePanel evidence={evidence} insights={insights} formatCalendarDate={(value) => value} />,
    );

    expect(screen.getByText("Điểm đáng giữ")).toBeInTheDocument();
    expect(screen.getByText("Điểm cần chú ý")).toBeInTheDocument();
  });

  it("defensively renders no more than three insight rows", () => {
    const extraInsights: ExecutionInsight[] = [
      {
        id: "consistency_improving",
        severity: "positive",
        headline: "Nhịp tăng",
        body: "Điểm tuần tăng.",
        nextActionId: "celebrate_keep_going",
        metrics: {},
      },
      {
        id: "review_missing",
        severity: "warning",
        headline: "Thiếu review",
        body: "Tuần trước chưa chốt review.",
        nextActionId: "open_week_review",
        metrics: {},
      },
    ];

    render(
      <WeeklyReviewEvidencePanel
        evidence={evidence}
        insights={[...insights, ...extraInsights]}
        formatCalendarDate={(value) => value}
      />,
    );

    expect(screen.getAllByTestId("weekly-evidence-insight")).toHaveLength(3);
  });
});
