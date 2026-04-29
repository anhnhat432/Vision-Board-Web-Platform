import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { trackAppEvent } = vi.hoisted(() => ({
  trackAppEvent: vi.fn(),
}));

vi.mock("./storage", () => ({
  trackAppEvent,
}));

import { canSendRemoteAnalytics, trackAnalyticsEvent } from "./analytics";

describe("analytics", () => {
  beforeEach(() => {
    trackAppEvent.mockReset();
    window.dataLayer = [];
    window.gtag = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete window.dataLayer;
    delete window.gtag;
  });

  it("always writes a typed event to the local analytics log", () => {
    vi.stubEnv("VITE_APP_MODE", "demo");
    vi.stubEnv("VITE_ANALYTICS_MODE", "off");

    trackAnalyticsEvent(
      "today_task_completed",
      {
        source: "12_week_system",
        week_number: 2,
        is_core: true,
      },
      { goalId: "goal_1" },
    );

    expect(trackAppEvent).toHaveBeenCalledWith("today_task_completed", "goal_1", {
      source: "12_week_system",
      week_number: "2",
      is_core: "true",
    });
    expect(window.dataLayer).toEqual([]);
    expect(window.gtag).not.toHaveBeenCalled();
  });

  it("mirrors to dataLayer and gtag only when real GA4 analytics is configured", () => {
    vi.stubEnv("VITE_APP_MODE", "real");
    vi.stubEnv("VITE_ANALYTICS_MODE", "ga4");
    vi.stubEnv("VITE_GA_MEASUREMENT_ID", "G-ABC12345");

    trackAnalyticsEvent("progress_viewed", {
      source: "dashboard",
      week_number: 3,
      total_weeks: 12,
      current_plan: "PLUS",
    });

    expect(canSendRemoteAnalytics()).toBe(true);
    expect(window.dataLayer).toContainEqual({
      event: "progress_viewed",
      app: "vision_board_web",
      area: "12_week",
      source: "dashboard",
      week_number: "3",
      total_weeks: "12",
      current_plan: "PLUS",
    });
    expect(window.gtag).toHaveBeenCalledWith("event", "progress_viewed", {
      app: "vision_board_web",
      area: "12_week",
      source: "dashboard",
      week_number: "3",
      total_weeks: "12",
      current_plan: "PLUS",
    });
  });

  it("can write a legacy local event without sending the legacy name remotely", () => {
    vi.stubEnv("VITE_APP_MODE", "real");
    vi.stubEnv("VITE_ANALYTICS_MODE", "ga4");
    vi.stubEnv("VITE_GA_MEASUREMENT_ID", "G-ABC12345");

    trackAnalyticsEvent(
      "checkout_started",
      {
        context: "plan",
        source: "paywall_dialog",
        current_plan: "FREE",
        recommended_plan: "PLUS",
        plan_code: "PLUS",
      },
      {
        goalId: "goal_2",
        legacyEventName: "paywall_checkout_started",
        legacyPayload: {
          context: "plan",
          source: "paywall_dialog",
          currentPlan: "FREE",
          recommendedPlan: "PLUS",
          planCode: "PLUS",
        },
      },
    );

    expect(trackAppEvent).toHaveBeenCalledWith("checkout_started", "goal_2", {
      context: "plan",
      source: "paywall_dialog",
      current_plan: "FREE",
      recommended_plan: "PLUS",
      plan_code: "PLUS",
    });
    expect(trackAppEvent).toHaveBeenCalledWith("paywall_checkout_started", "goal_2", {
      context: "plan",
      source: "paywall_dialog",
      currentPlan: "FREE",
      recommendedPlan: "PLUS",
      planCode: "PLUS",
    });
    expect(window.dataLayer?.some((item) => item.event === "paywall_checkout_started")).toBe(false);
  });
});
