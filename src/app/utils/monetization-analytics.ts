import { trackAppEvent } from "./storage";
import type { PricingPlanCode } from "./storage-types";
import type { PremiumFeatureContext } from "./twelve-week-premium";

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
  }
}

export type MonetizationSource =
  | "dashboard"
  | "goal_tracker"
  | "12_week_setup"
  | "12_week_system"
  | "settings"
  | "review_teaser"
  | "template_catalog"
  | "paywall_dialog";

interface BaseMonetizationPayload {
  goalId?: string;
  context: PremiumFeatureContext;
  source: MonetizationSource;
  currentPlan: PricingPlanCode;
  recommendedPlan?: PricingPlanCode;
}

interface AnalyticsEventOptions {
  name: string;
  goalId?: string;
  metadata: Record<string, string>;
}

function isAnalyticsEnabled(): boolean {
  return import.meta.env.VITE_ANALYTICS_MODE?.trim().toLowerCase() !== "off";
}

function pushToDataLayer(eventName: string, payload: Record<string, string>): void {
  if (typeof window === "undefined" || !isAnalyticsEnabled()) return;

  window.dataLayer?.push({
    event: eventName,
    app: "vision_board_web",
    area: "monetization",
    ...payload,
  });

  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, payload);
  }
}

function emitAnalyticsEvent({ name, goalId, metadata }: AnalyticsEventOptions): void {
  trackAppEvent(name, goalId, metadata);
  pushToDataLayer(name, metadata);
}

export function trackPaywallViewed(payload: BaseMonetizationPayload): void {
  emitAnalyticsEvent({
    name: "paywall_viewed",
    goalId: payload.goalId,
    metadata: {
      context: payload.context,
      source: payload.source,
      currentPlan: payload.currentPlan,
      recommendedPlan: payload.recommendedPlan ?? payload.currentPlan,
    },
  });
}

export function trackPaywallCtaClicked(
  payload: BaseMonetizationPayload & {
    targetPlan: Exclude<PricingPlanCode, "FREE">;
    placement: string;
  },
): void {
  emitAnalyticsEvent({
    name: "paywall_cta_clicked",
    goalId: payload.goalId,
    metadata: {
      context: payload.context,
      source: payload.source,
      currentPlan: payload.currentPlan,
      recommendedPlan: payload.recommendedPlan ?? payload.targetPlan,
      targetPlan: payload.targetPlan,
      placement: payload.placement,
    },
  });
}

export function trackCheckoutStarted(
  payload: BaseMonetizationPayload & {
    planCode: Exclude<PricingPlanCode, "FREE">;
  },
): void {
  emitAnalyticsEvent({
    name: "paywall_checkout_started",
    goalId: payload.goalId,
    metadata: {
      context: payload.context,
      source: payload.source,
      currentPlan: payload.currentPlan,
      recommendedPlan: payload.recommendedPlan ?? payload.planCode,
      planCode: payload.planCode,
    },
  });
}

export function trackCheckoutCompleted(
  payload: BaseMonetizationPayload & {
    planCode: Exclude<PricingPlanCode, "FREE">;
    resultPlan: PricingPlanCode;
    mode?: string;
  },
): void {
  emitAnalyticsEvent({
    name: "paywall_checkout_completed",
    goalId: payload.goalId,
    metadata: {
      context: payload.context,
      source: payload.source,
      currentPlan: payload.currentPlan,
      recommendedPlan: payload.recommendedPlan ?? payload.planCode,
      planCode: payload.planCode,
      resultPlan: payload.resultPlan,
      mode: payload.mode ?? "local_test",
    },
  });
}

export function trackPremiumTemplateUnlockPrompted(input: {
  goalId?: string;
  source: MonetizationSource;
  currentPlan: PricingPlanCode;
  templateId: string;
  requiredPlan: Exclude<PricingPlanCode, "FREE">;
}): void {
  emitAnalyticsEvent({
    name: "premium_template_unlock_prompted",
    goalId: input.goalId,
    metadata: {
      source: input.source,
      currentPlan: input.currentPlan,
      templateId: input.templateId,
      requiredPlan: input.requiredPlan,
    },
  });
}

export function trackTemplateApplied(input: {
  goalId?: string;
  source: MonetizationSource;
  currentPlan: PricingPlanCode;
  templateId: string;
  templateName: string;
  tier: "free" | "premium";
  requiredPlan: PricingPlanCode | "FREE";
}): void {
  emitAnalyticsEvent({
    name: "premium_template_applied",
    goalId: input.goalId,
    metadata: {
      source: input.source,
      currentPlan: input.currentPlan,
      templateId: input.templateId,
      templateName: input.templateName,
      tier: input.tier,
      requiredPlan: input.requiredPlan,
    },
  });
}

export function trackPremiumInsightOpened(input: {
  goalId?: string;
  source: MonetizationSource;
  currentPlan: PricingPlanCode;
  weekNumber: number;
}): void {
  emitAnalyticsEvent({
    name: "premium_insight_opened",
    goalId: input.goalId,
    metadata: {
      source: input.source,
      currentPlan: input.currentPlan,
      weekNumber: String(input.weekNumber),
    },
  });
}
