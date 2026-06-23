import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TwelveWeekPremiumInsightSection } from "./TwelveWeekPremiumInsightSection";

function makeProps() {
  return {
    currentPlanCode: "FREE" as const,
    hasPremiumInsights: false,
    premiumInsight: {
      status: "watch" as const,
      headline:
        "Weekly review insight with a long headline that should stay readable on narrow mobile cards without clipping",
      summary:
        "This premium summary stays readable in the locked state so users can understand what kind of review depth they unlock next.",
      recommendedAdjustment: "Keep the load stable",
      coachNote: "Protect one priority",
      badgeLabel: "Plus",
    },
    suggestedNextWeekPlan: null,
    onApplySuggestedPlan: vi.fn(),
    onOpenPremiumInsights: vi.fn(),
  };
}

describe("TwelveWeekPremiumInsightSection", () => {
  it("keeps long locked-state insight copy readable instead of truncating it", async () => {
    const user = userEvent.setup();
    render(<TwelveWeekPremiumInsightSection {...makeProps()} />);

    const trigger = screen.getByRole("button", {
      name: /Weekly review insight with a long headline that should stay readable/i,
    });
    expect(trigger).toHaveClass("items-start");
    expect(screen.getByText(/Weekly review insight with a long headline/i)).toHaveClass("break-words");

    await user.click(trigger);

    expect(screen.getByText(/This premium summary stays readable/i, { selector: "p.break-words" })).toHaveClass(
      "break-words",
    );
  });
});
