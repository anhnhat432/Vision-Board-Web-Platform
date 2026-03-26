import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { trackAppEvent } = vi.hoisted(() => ({
  trackAppEvent: vi.fn(),
}));

vi.mock("./storage", () => ({
  trackAppEvent,
}));

import { trackCheckoutCompleted, trackPaywallViewed } from "./monetization-analytics";

describe("monetization-analytics", () => {
  beforeEach(() => {
    trackAppEvent.mockReset();
    window.dataLayer = [];
    window.gtag = vi.fn();
  });

  afterEach(() => {
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

    expect(trackAppEvent).toHaveBeenCalledWith("paywall_viewed", "goal_1", {
      context: "review",
      source: "12_week_system",
      currentPlan: "FREE",
      recommendedPlan: "PLUS",
    });
    expect(window.dataLayer).toContainEqual({
      event: "paywall_viewed",
      app: "vision_board_web",
      area: "monetization",
      context: "review",
      source: "12_week_system",
      currentPlan: "FREE",
      recommendedPlan: "PLUS",
    });
    expect(window.gtag).toHaveBeenCalledWith("event", "paywall_viewed", {
      context: "review",
      source: "12_week_system",
      currentPlan: "FREE",
      recommendedPlan: "PLUS",
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
      event: "paywall_checkout_completed",
      planCode: "PLUS",
      resultPlan: "PLUS",
      mode: "api_contract",
    });
  });
});
