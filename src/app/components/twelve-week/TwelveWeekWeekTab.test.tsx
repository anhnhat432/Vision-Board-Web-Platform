import type { ComponentProps } from "react";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { TwelveWeekSystem } from "@/app/utils/storage-types";

import { TwelveWeekWeekTab } from "./TwelveWeekWeekTab";

type WeekTabProps = ComponentProps<typeof TwelveWeekWeekTab>;

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
    scoreboard: [],
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
      workloadDecision: "",
    },
    onWeeklyFormChange: vi.fn(),
    onApplySuggestedPlan: vi.fn(),
    onOpenPremiumInsights: vi.fn(),
    onSaveWeeklyReview: vi.fn(),
    ...overrides,
  };
}

describe("TwelveWeekWeekTab review flow", () => {
  it("shows three review steps and a readiness summary", () => {
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
            workloadDecision: "keep same",
          },
        })}
      />,
    );

    expect(screen.getByTestId("weekly-review-step-result")).toHaveAttribute("data-done", "true");
    expect(screen.getByTestId("weekly-review-step-load")).toHaveAttribute("data-done", "true");
    expect(screen.getByTestId("weekly-review-step-priority")).toHaveAttribute("data-done", "true");
    expect(screen.getByTestId("weekly-review-readiness")).toHaveTextContent("3/3");
  });

  it("keeps optional review fields collapsed by default", () => {
    render(<TwelveWeekWeekTab {...makeProps()} />);

    expect(screen.getByRole("button", { name: /chi tiết review thêm/i })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByLabelText(/^2\./i)).toBeNull();
  });

  it("keeps the mobile sticky CTA above the bottom navigation", () => {
    render(<TwelveWeekWeekTab {...makeProps()} />);

    expect(screen.getByTestId("weekly-review-mobile-sticky-cta")).toHaveClass("bottom-20");
  });
});
