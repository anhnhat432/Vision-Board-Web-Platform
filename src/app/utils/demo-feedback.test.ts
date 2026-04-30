import { beforeEach, describe, expect, it, vi } from "vitest";

const { trackAnalyticsEvent } = vi.hoisted(() => ({
  trackAnalyticsEvent: vi.fn(),
}));

vi.mock("./analytics", () => ({
  trackAnalyticsEvent,
}));

import { getLocalDemoFeedback, sanitizeDemoFeedbackText, submitDemoFeedback } from "./demo-feedback";
import { DEMO_FEEDBACK_STORAGE_KEY } from "./storage-constants";

describe("demo feedback", () => {
  beforeEach(() => {
    localStorage.clear();
    trackAnalyticsEvent.mockReset();
  });

  it("stores raw feedback locally but tracks only safe metadata", () => {
    const result = submitDemoFeedback({
      source: "dashboard",
      context: "dashboard",
      rating: 4,
      feedbackCategory: "twelve_week_setup",
      confusingText: "Setup is long and the next step is unclear.",
      nextHelpText: "Show the most important task first.",
    });

    expect(result.savedLocally).toBe(true);
    expect(getLocalDemoFeedback()).toHaveLength(1);
    expect(localStorage.getItem(DEMO_FEEDBACK_STORAGE_KEY)).toContain("Setup is long");
    expect(trackAnalyticsEvent).toHaveBeenCalledWith(
      "feedback_submitted",
      {
        source: "dashboard",
        context: "dashboard",
        rating: 4,
        feedback_category: "twelve_week_setup",
        confusing_text_length: "Setup is long and the next step is unclear.".length,
        next_help_text_length: "Show the most important task first.".length,
        has_next_help_text: true,
      },
      { area: "core_funnel", legacyEventName: "demo_feedback_submitted" },
    );
    expect(JSON.stringify(trackAnalyticsEvent.mock.calls[0])).not.toContain("Setup is long");
    expect(JSON.stringify(trackAnalyticsEvent.mock.calls[0])).not.toContain("important task");
  });

  it("sanitizes local free-form text before saving", () => {
    expect(sanitizeDemoFeedbackText("  Line 1\n\nLine 2\u0000  ")).toBe("Line 1 Line 2");
  });
});
