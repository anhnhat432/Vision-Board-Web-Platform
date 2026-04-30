import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { trackAppEvent } = vi.hoisted(() => ({
  trackAppEvent: vi.fn(),
}));

vi.mock("./storage", () => ({
  trackAppEvent,
}));

import { type AnalyticsEventPayloads, canSendRemoteAnalytics, trackAnalyticsEvent } from "./analytics";

describe("analytics", () => {
  const findRemoteEvent = (eventName: string) => window.dataLayer?.find((item) => item.event === eventName);

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

  it("does not mirror remotely in demo mode even when GA4 env is configured", () => {
    vi.stubEnv("VITE_APP_MODE", "demo");
    vi.stubEnv("VITE_ANALYTICS_MODE", "ga4");
    vi.stubEnv("VITE_GA_MEASUREMENT_ID", "G-ABC12345");

    trackAnalyticsEvent("progress_viewed", {
      source: "dashboard",
      week_number: 3,
      total_weeks: 12,
      current_plan: "PLUS",
    });

    expect(canSendRemoteAnalytics()).toBe(false);
    expect(window.dataLayer).toEqual([]);
    expect(window.gtag).not.toHaveBeenCalled();
  });

  it("mirrors MVP 1 funnel start events with only safe drop-off metadata", () => {
    vi.stubEnv("VITE_APP_MODE", "real");
    vi.stubEnv("VITE_ANALYTICS_MODE", "ga4");
    vi.stubEnv("VITE_GA_MEASUREMENT_ID", "G-ABC12345");

    trackAnalyticsEvent("landing_viewed", {
      source: "dashboard",
      app_mode: "demo",
      signed_in: false,
      auth_configured: true,
      has_local_12_week_system: false,
      email: "private@example.com",
      firebase_uid: "firebase_uid_123",
      goal_text: "Private goal text",
      reflection: "Private reflection",
    } as AnalyticsEventPayloads["landing_viewed"]);

    const remotePayload = findRemoteEvent("landing_viewed");
    expect(remotePayload).toEqual({
      event: "landing_viewed",
      app: "vision_board_web",
      area: "core_funnel",
      source: "dashboard",
      app_mode: "demo",
      signed_in: "false",
      auth_configured: "true",
      has_local_12_week_system: "false",
    });
    expect(JSON.stringify(remotePayload)).not.toContain("private@example.com");
    expect(JSON.stringify(remotePayload)).not.toContain("firebase_uid_123");
    expect(JSON.stringify(remotePayload)).not.toContain("Private goal text");
    expect(JSON.stringify(remotePayload)).not.toContain("Private reflection");
  });

  it("strips sensitive and free-form fields before mirroring to external analytics", () => {
    vi.stubEnv("VITE_APP_MODE", "real");
    vi.stubEnv("VITE_ANALYTICS_MODE", "ga4");
    vi.stubEnv("VITE_GA_MEASUREMENT_ID", "G-ABC12345");

    trackAnalyticsEvent("smart_goal_created", {
      focus_area: "Career",
      target_mode: "weeks",
      target_weeks: 12,
      has_baseline: true,
      weekly_hours: 5,
      goal_text: "Launch a private product under NDA",
      goal_title: "Private launch",
      reflection: "I am worried about funding",
      note: "Call my doctor",
      email: "private@example.com",
      firebase_uid: "firebase_uid_123",
      backend_user_id: "user_456",
      full_name: "Private Person",
      phone: "+1 555 0101",
      address: "123 Private Street",
      long_free_text:
        "This is intentionally long free-form text that should not leave the browser because it could contain private context.",
    } as AnalyticsEventPayloads["smart_goal_created"]);

    expect(trackAppEvent).toHaveBeenCalledWith(
      "smart_goal_created",
      undefined,
      expect.objectContaining({
        goal_text: "Launch a private product under NDA",
        reflection: "I am worried about funding",
        email: "private@example.com",
        backend_user_id: "user_456",
      }),
    );

    const remotePayload = findRemoteEvent("smart_goal_created");
    expect(remotePayload).toEqual({
      event: "smart_goal_created",
      app: "vision_board_web",
      area: "core_funnel",
      focus_area: "Career",
      target_mode: "weeks",
      target_weeks: "12",
      has_baseline: "true",
      weekly_hours: "5",
    });
    expect(window.gtag).toHaveBeenCalledWith("event", "smart_goal_created", {
      app: "vision_board_web",
      area: "core_funnel",
      focus_area: "Career",
      target_mode: "weeks",
      target_weeks: "12",
      has_baseline: "true",
      weekly_hours: "5",
    });
    const serializedPayload = JSON.stringify(remotePayload);
    expect(serializedPayload).not.toContain("private@example.com");
    expect(serializedPayload).not.toContain("Private launch");
    expect(serializedPayload).not.toContain("funding");
    expect(serializedPayload).not.toContain("firebase_uid_123");
    expect(serializedPayload).not.toContain("user_456");
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

  it("mirrors feedback metadata without raw free-form feedback", () => {
    vi.stubEnv("VITE_APP_MODE", "real");
    vi.stubEnv("VITE_ANALYTICS_MODE", "ga4");
    vi.stubEnv("VITE_GA_MEASUREMENT_ID", "G-ABC12345");

    trackAnalyticsEvent("feedback_submitted", {
      source: "dashboard",
      context: "dashboard",
      rating: 4,
      feedback_category: "twelve_week_setup",
      confusing_text_length: 42,
      next_help_text_length: 18,
      has_next_help_text: true,
      confusing_text: "This private raw feedback must stay local",
      next_help_text: "Also private",
      email: "private@example.com",
    } as AnalyticsEventPayloads["feedback_submitted"]);

    const remotePayload = findRemoteEvent("feedback_submitted");
    expect(remotePayload).toEqual({
      event: "feedback_submitted",
      app: "vision_board_web",
      area: "core_funnel",
      source: "dashboard",
      context: "dashboard",
      rating: "4",
      feedback_category: "twelve_week_setup",
      confusing_text_length: "42",
      next_help_text_length: "18",
      has_next_help_text: "true",
    });
    expect(JSON.stringify(remotePayload)).not.toContain("private raw feedback");
    expect(JSON.stringify(remotePayload)).not.toContain("private@example.com");
  });
});
