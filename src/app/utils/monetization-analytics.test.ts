import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { trackAppEvent } = vi.hoisted(() => ({
  trackAppEvent: vi.fn(),
}));

vi.mock("./storage", () => ({
  trackAppEvent,
}));

import {
  trackCheckoutCompleted,
  trackExperimentExposure,
  trackPaywallViewed,
  trackRescueActionTaken,
  trackRescueTriggerDismissed,
  trackRescueTriggerFired,
} from "./monetization-analytics";

describe("monetization-analytics", () => {
  beforeEach(() => {
    trackAppEvent.mockReset();
    vi.stubEnv("VITE_APP_MODE", "real");
    vi.stubEnv("VITE_ANALYTICS_MODE", "ga4");
    vi.stubEnv("VITE_GA_MEASUREMENT_ID", "G-ABC12345");
    window.dataLayer = [];
    window.gtag = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete window.dataLayer;
    delete window.gtag;
  });

  it("stores paywall views locally and mirrors them to dataLayer", () => {
    trackPaywallViewed({
      goalId: "goal_1",
      context: "review",
      source: "12_week_system",
      currentPlan: "FREE",
      recommendedPlan: "PLUS",
    });

    expect(trackAppEvent).toHaveBeenCalledWith("paywall_opened", "goal_1", {
      context: "review",
      source: "12_week_system",
      current_plan: "FREE",
      recommended_plan: "PLUS",
    });
    expect(trackAppEvent).toHaveBeenCalledWith("paywall_viewed", "goal_1", {
      context: "review",
      source: "12_week_system",
      currentPlan: "FREE",
      recommendedPlan: "PLUS",
    });
    expect(window.dataLayer).toContainEqual({
      event: "paywall_opened",
      app: "vision_board_web",
      area: "monetization",
      context: "review",
      source: "12_week_system",
      current_plan: "FREE",
      recommended_plan: "PLUS",
    });
    expect(window.gtag).toHaveBeenCalledWith("event", "paywall_opened", {
      app: "vision_board_web",
      area: "monetization",
      context: "review",
      source: "12_week_system",
      current_plan: "FREE",
      recommended_plan: "PLUS",
    });
  });

  it("emits checkout completion with normalized monetization payload", () => {
    trackCheckoutCompleted({
      goalId: "goal_2",
      context: "plan",
      source: "paywall_dialog",
      currentPlan: "FREE",
      recommendedPlan: "PLUS",
      planCode: "PLUS",
      resultPlan: "PLUS",
      mode: "api_contract",
    });

    expect(trackAppEvent).toHaveBeenCalledWith("checkout_completed", "goal_2", {
      context: "plan",
      source: "paywall_dialog",
      current_plan: "FREE",
      recommended_plan: "PLUS",
      plan_code: "PLUS",
      result_plan: "PLUS",
      provider_mode: "api_contract",
    });
    expect(trackAppEvent).toHaveBeenCalledWith("paywall_checkout_completed", "goal_2", {
      context: "plan",
      source: "paywall_dialog",
      currentPlan: "FREE",
      recommendedPlan: "PLUS",
      planCode: "PLUS",
      resultPlan: "PLUS",
      mode: "api_contract",
    });
    expect(window.dataLayer?.[0]).toMatchObject({
      event: "checkout_completed",
      plan_code: "PLUS",
      result_plan: "PLUS",
      provider_mode: "api_contract",
    });
  });

  it("emits rescue trigger lifecycle events with normalized payloads", () => {
    trackRescueTriggerFired({
      kind: "missed_checkin",
      severity: "urgent",
      currentPlan: "FREE",
    });

    expect(trackAppEvent).toHaveBeenCalledWith("rescue_trigger_fired", undefined, {
      kind: "missed_checkin",
      severity: "urgent",
      current_plan: "FREE",
    });

    trackRescueActionTaken({
      kind: "missed_checkin",
      action: "navigate_system",
      currentPlan: "FREE",
    });

    expect(trackAppEvent).toHaveBeenCalledWith("rescue_action_taken", undefined, {
      kind: "missed_checkin",
      action: "navigate_system",
      current_plan: "FREE",
    });

    trackRescueTriggerDismissed({
      kind: "missed_checkin",
      currentPlan: "FREE",
    });

    expect(trackAppEvent).toHaveBeenCalledWith("rescue_trigger_dismissed", undefined, {
      kind: "missed_checkin",
      current_plan: "FREE",
    });
  });

  it("emits experiment exposure to local log and dataLayer", () => {
    trackExperimentExposure({
      experimentId: "paywall_trial_cta",
      variantId: "trial_first",
      context: "billing_plan",
    });

    expect(trackAppEvent).toHaveBeenCalledWith("experiment_exposure", undefined, {
      experiment_id: "paywall_trial_cta",
      variant_id: "trial_first",
      context: "billing_plan",
    });

    expect(window.dataLayer).toContainEqual({
      event: "experiment_exposure",
      app: "vision_board_web",
      area: "core_funnel",
      experiment_id: "paywall_trial_cta",
      variant_id: "trial_first",
      context: "billing_plan",
    });
  });
});
