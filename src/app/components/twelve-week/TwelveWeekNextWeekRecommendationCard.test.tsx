import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TwelveWeekNextWeekRecommendationCard } from "./TwelveWeekNextWeekRecommendationCard";
import type { NextWeekRecommendation } from "@/features/plan12week/logic";

function makeRecommendation(
  overrides: Partial<NextWeekRecommendation> = {},
): NextWeekRecommendation {
  return {
    recommendation: overrides.recommendation ?? "lighter",
    confidence: overrides.confidence ?? "medium",
    reasonCodes: overrides.reasonCodes ?? ["low_week_completion"],
    headline: overrides.headline ?? "Tuần sau nên nhẹ hơn",
    body: overrides.body ?? "Tuần này có vài chỗ chưa trơn. Nhẹ tải tuần sau giúp giữ nhịp dài hạn.",
    suggestedNextWeekPriority:
      overrides.suggestedNextWeekPriority ?? "Chọn 1-2 việc cốt lõi cho tuần sau.",
  };
}

describe("TwelveWeekNextWeekRecommendationCard", () => {
  it("renders the headline, body, and priority hint", () => {
    render(<TwelveWeekNextWeekRecommendationCard recommendation={makeRecommendation()} />);
    expect(screen.getByTestId("next-week-recommendation")).toBeInTheDocument();
    expect(screen.getByTestId("next-week-recommendation-headline")).toHaveTextContent(
      /Tuần sau nên nhẹ hơn/i,
    );
    expect(screen.getByTestId("next-week-recommendation-priority")).toHaveTextContent(
      /việc cốt lõi/i,
    );
  });

  it("shows the 'Bạn vẫn kiểm soát kế hoạch' control note", () => {
    render(<TwelveWeekNextWeekRecommendationCard recommendation={makeRecommendation()} />);
    expect(screen.getByTestId("next-week-recommendation-control-note")).toHaveTextContent(
      /Bạn vẫn kiểm soát kế hoạch/i,
    );
  });

  it("exposes recommendation + confidence as data attributes", () => {
    render(
      <TwelveWeekNextWeekRecommendationCard
        recommendation={makeRecommendation({ recommendation: "push", confidence: "high" })}
      />,
    );
    const card = screen.getByTestId("next-week-recommendation");
    expect(card).toHaveAttribute("data-recommendation", "push");
    expect(card).toHaveAttribute("data-confidence", "high");
  });

  it("invokes onAcceptRecommendation only when the user clicks the apply button (no auto-apply)", async () => {
    const onAccept = vi.fn();
    render(
      <TwelveWeekNextWeekRecommendationCard
        recommendation={makeRecommendation()}
        onAcceptRecommendation={onAccept}
      />,
    );
    expect(onAccept).not.toHaveBeenCalled();
    const button = screen.getByRole("button", { name: /Áp dụng cho tuần sau/i });
    await userEvent.click(button);
    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  it("hides the apply button when no callback is provided", () => {
    render(<TwelveWeekNextWeekRecommendationCard recommendation={makeRecommendation()} />);
    expect(screen.queryByRole("button", { name: /Áp dụng cho tuần sau/i })).toBeNull();
  });

  it("invokes onOpenTodayTab when 'Mở Today' is clicked", async () => {
    const onOpenTodayTab = vi.fn();
    render(
      <TwelveWeekNextWeekRecommendationCard
        recommendation={makeRecommendation()}
        onOpenTodayTab={onOpenTodayTab}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Mở Today/i }));
    expect(onOpenTodayTab).toHaveBeenCalledTimes(1);
  });

  it("renders 'reset' variant with the right copy and badge", () => {
    render(
      <TwelveWeekNextWeekRecommendationCard
        recommendation={makeRecommendation({
          recommendation: "reset",
          headline: "Tuần sau cần restart nhẹ",
        })}
      />,
    );
    const card = screen.getByTestId("next-week-recommendation");
    expect(card).toHaveAttribute("data-recommendation", "reset");
    expect(screen.getByTestId("next-week-recommendation-headline")).toHaveTextContent(
      /restart nhẹ/i,
    );
  });
});
