import type { PricingPlanCode, RescueTriggerKind, RescueTriggerSeverity } from "./storage-types";
import type { PremiumFeatureContext } from "./twelve-week-premium";
import { trackAnalyticsEvent, type AnalyticsSource } from "./analytics";

export type MonetizationSource =
  | "dashboard"
  | "goal_tracker"
  | "12_week_setup"
  | "12_week_system"
  | "settings"
  | "review_teaser"
  | "template_catalog"
  | "paywall_dialog"
  | "billing_plan";

interface BaseMonetizationPayload {
  goalId?: string;
  context: PremiumFeatureContext;
  source: MonetizationSource;
  currentPlan: PricingPlanCode;
  recommendedPlan?: PricingPlanCode;
}

function toAnalyticsSource(source: MonetizationSource): AnalyticsSource {
  return source;
}

export function trackPaywallViewed(payload: BaseMonetizationPayload): void {
  const canonicalPayload = {
    context: payload.context,
    source: toAnalyticsSource(payload.source),
    current_plan: payload.currentPlan,
    recommended_plan: payload.recommendedPlan ?? payload.currentPlan,
  } as const;

  trackAnalyticsEvent("paywall_opened", canonicalPayload, {
    goalId: payload.goalId,
    legacyEventName: "paywall_viewed",
    legacyPayload: {
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
  trackAnalyticsEvent(
    "paywall_cta_clicked",
    {
      context: payload.context,
      source: toAnalyticsSource(payload.source),
      current_plan: payload.currentPlan,
      recommended_plan: payload.recommendedPlan ?? payload.targetPlan,
      target_plan: payload.targetPlan,
      placement: payload.placement,
    },
    {
      goalId: payload.goalId,
      legacyPayload: {
        context: payload.context,
        source: payload.source,
        currentPlan: payload.currentPlan,
        recommendedPlan: payload.recommendedPlan ?? payload.targetPlan,
        targetPlan: payload.targetPlan,
        placement: payload.placement,
      },
    },
  );
}

export function trackCheckoutStarted(
  payload: BaseMonetizationPayload & {
    planCode: Exclude<PricingPlanCode, "FREE">;
  },
): void {
  trackAnalyticsEvent(
    "checkout_started",
    {
      context: payload.context,
      source: toAnalyticsSource(payload.source),
      current_plan: payload.currentPlan,
      recommended_plan: payload.recommendedPlan ?? payload.planCode,
      plan_code: payload.planCode,
    },
    {
      goalId: payload.goalId,
      legacyEventName: "paywall_checkout_started",
      legacyPayload: {
        context: payload.context,
        source: payload.source,
        currentPlan: payload.currentPlan,
        recommendedPlan: payload.recommendedPlan ?? payload.planCode,
        planCode: payload.planCode,
      },
    },
  );
}

export function trackCheckoutCompleted(
  payload: BaseMonetizationPayload & {
    planCode: Exclude<PricingPlanCode, "FREE">;
    resultPlan: PricingPlanCode;
    mode?: string;
  },
): void {
  trackAnalyticsEvent(
    "checkout_completed",
    {
      context: payload.context,
      source: toAnalyticsSource(payload.source),
      current_plan: payload.currentPlan,
      recommended_plan: payload.recommendedPlan ?? payload.planCode,
      plan_code: payload.planCode,
      result_plan: payload.resultPlan,
      provider_mode: payload.mode ?? "local_test",
    },
    {
      goalId: payload.goalId,
      legacyEventName: "paywall_checkout_completed",
      legacyPayload: {
        context: payload.context,
        source: payload.source,
        currentPlan: payload.currentPlan,
        recommendedPlan: payload.recommendedPlan ?? payload.planCode,
        planCode: payload.planCode,
        resultPlan: payload.resultPlan,
        mode: payload.mode ?? "local_test",
      },
    },
  );
}

export function trackUpgradeRestored(input: {
  goalId?: string;
  source: MonetizationSource;
  status: string;
  providerMode: string;
  planCode: PricingPlanCode;
  entitlementCount: number;
}): void {
  trackAnalyticsEvent(
    "upgrade_restored",
    {
      source: toAnalyticsSource(input.source),
      status: input.status,
      provider_mode: input.providerMode,
      plan_code: input.planCode,
      entitlement_count: input.entitlementCount,
    },
    {
      goalId: input.goalId,
      legacyEventName: "plan_access_restored",
      legacyPayload: {
        status: input.status,
        providerMode: input.providerMode,
        planCode: input.planCode,
        entitlementCount: String(input.entitlementCount),
      },
    },
  );
}

export function trackPremiumTemplateUnlockPrompted(input: {
  goalId?: string;
  source: MonetizationSource;
  currentPlan: PricingPlanCode;
  templateId: string;
  requiredPlan: Exclude<PricingPlanCode, "FREE">;
}): void {
  trackAnalyticsEvent(
    "premium_template_unlock_prompted",
    {
      source: toAnalyticsSource(input.source),
      current_plan: input.currentPlan,
      template_id: input.templateId,
      required_plan: input.requiredPlan,
    },
    {
      goalId: input.goalId,
      legacyPayload: {
        source: input.source,
        currentPlan: input.currentPlan,
        templateId: input.templateId,
        requiredPlan: input.requiredPlan,
      },
    },
  );
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
  trackAnalyticsEvent(
    "premium_template_applied",
    {
      source: toAnalyticsSource(input.source),
      current_plan: input.currentPlan,
      template_id: input.templateId,
      template_name: input.templateName,
      tier: input.tier,
      required_plan: input.requiredPlan,
    },
    {
      goalId: input.goalId,
      legacyPayload: {
        source: input.source,
        currentPlan: input.currentPlan,
        templateId: input.templateId,
        templateName: input.templateName,
        tier: input.tier,
        requiredPlan: input.requiredPlan,
      },
    },
  );
}

export function trackPremiumInsightOpened(input: {
  goalId?: string;
  source: MonetizationSource;
  currentPlan: PricingPlanCode;
  weekNumber: number;
}): void {
  trackAnalyticsEvent(
    "premium_insight_opened",
    {
      source: toAnalyticsSource(input.source),
      current_plan: input.currentPlan,
      week_number: input.weekNumber,
    },
    {
      goalId: input.goalId,
      legacyPayload: {
        source: input.source,
        currentPlan: input.currentPlan,
        weekNumber: String(input.weekNumber),
      },
    },
  );
}

// ─── D4: Rescue trigger events ────────────────────────────────────────────────

export function trackRescueTriggerFired(input: {
  goalId?: string;
  kind: RescueTriggerKind;
  severity: RescueTriggerSeverity;
  currentPlan: PricingPlanCode;
}): void {
  trackAnalyticsEvent(
    "rescue_trigger_fired",
    {
      kind: input.kind,
      severity: input.severity,
      current_plan: input.currentPlan,
    },
    {
      goalId: input.goalId,
      legacyPayload: {
        kind: input.kind,
        severity: input.severity,
        currentPlan: input.currentPlan,
      },
    },
  );
}

export function trackRescueTriggerDismissed(input: {
  goalId?: string;
  kind: RescueTriggerKind;
  currentPlan: PricingPlanCode;
}): void {
  trackAnalyticsEvent(
    "rescue_trigger_dismissed",
    {
      kind: input.kind,
      current_plan: input.currentPlan,
    },
    {
      goalId: input.goalId,
      legacyPayload: {
        kind: input.kind,
        currentPlan: input.currentPlan,
      },
    },
  );
}

export function trackRescueActionTaken(input: {
  goalId?: string;
  kind: RescueTriggerKind;
  action: "navigate_system" | "apply_reentry" | "upgrade";
  currentPlan: PricingPlanCode;
}): void {
  trackAnalyticsEvent(
    "rescue_action_taken",
    {
      kind: input.kind,
      action: input.action,
      current_plan: input.currentPlan,
    },
    {
      goalId: input.goalId,
      legacyPayload: {
        kind: input.kind,
        action: input.action,
        currentPlan: input.currentPlan,
      },
    },
  );
}

// ─── C3: Experiment exposure events ──────────────────────────────────────────

export function trackExperimentExposure(input: {
  experimentId: string;
  variantId: string;
  goalId?: string;
  context?: string;
}): void {
  trackAnalyticsEvent(
    "experiment_exposure",
    {
      experiment_id: input.experimentId,
      variant_id: input.variantId,
      context: input.context ?? "",
    },
    {
      goalId: input.goalId,
      legacyPayload: {
        experimentId: input.experimentId,
        variantId: input.variantId,
        context: input.context ?? "",
      },
    },
  );
}
