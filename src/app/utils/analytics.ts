import { trackAppEvent } from "./storage";
import type { PricingPlanCode } from "./storage-types";
import type { PremiumFeatureContext } from "./twelve-week-premium";

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
  }
}

type AnalyticsPrimitive = string | number | boolean | null | undefined;
type AnalyticsPayload = Record<string, AnalyticsPrimitive>;

export type AnalyticsSource =
  | "onboarding"
  | "life_balance"
  | "smart_goal_setup"
  | "feasibility"
  | "12_week_setup"
  | "12_week_system"
  | "goal_tracker"
  | "dashboard"
  | "settings"
  | "billing_plan"
  | "paywall_dialog"
  | "mock_checkout"
  | "review_teaser"
  | "template_catalog";

export interface AnalyticsEventPayloads {
  onboarding_started: {
    source: AnalyticsSource;
    returning_user: boolean;
  };
  life_balance_completed: {
    source: AnalyticsSource;
    area_count: number;
    average_score: number;
    weakest_area: string;
    strongest_area: string;
  };
  smart_goal_created: {
    focus_area: string;
    target_mode: "date" | "weeks";
    target_weeks?: number;
    has_baseline: boolean;
    weekly_hours?: number;
  };
  feasibility_completed: {
    focus_area: string;
    result_type: string;
    readiness_score: number;
    adjusted_score: number;
    bottleneck_axis: string;
    plan_load: string;
    weekly_capacity: string;
    answer_count: number;
  };
  twelve_week_plan_created: {
    goal_type: string;
    focus_area: string;
    total_weeks: number;
    lead_indicator_count: number;
    core_indicator_count: number;
    task_count: number;
    template_tier: "free" | "premium" | "none";
  };
  today_task_completed: {
    source: AnalyticsSource;
    week_number: number;
    is_core: boolean;
  };
  weekly_review_submitted: {
    source: AnalyticsSource;
    week_number: number;
    lead_completion_percent: number;
    execution_score: number;
    workload_decision: string;
  };
  progress_viewed: {
    source: AnalyticsSource;
    week_number?: number;
    total_weeks?: number;
    current_plan?: PricingPlanCode;
  };
  paywall_opened: {
    context: PremiumFeatureContext;
    source: AnalyticsSource;
    current_plan: PricingPlanCode;
    recommended_plan: PricingPlanCode;
  };
  checkout_started: {
    context: PremiumFeatureContext;
    source: AnalyticsSource;
    current_plan: PricingPlanCode;
    recommended_plan: PricingPlanCode;
    plan_code: Exclude<PricingPlanCode, "FREE">;
  };
  checkout_completed: {
    context: PremiumFeatureContext;
    source: AnalyticsSource;
    current_plan: PricingPlanCode;
    recommended_plan: PricingPlanCode;
    plan_code: Exclude<PricingPlanCode, "FREE">;
    result_plan: PricingPlanCode;
    provider_mode: string;
  };
  upgrade_restored: {
    source: AnalyticsSource;
    status: string;
    provider_mode: string;
    plan_code: PricingPlanCode;
    entitlement_count: number;
  };
  paywall_cta_clicked: {
    context: PremiumFeatureContext;
    source: AnalyticsSource;
    current_plan: PricingPlanCode;
    recommended_plan: PricingPlanCode;
    target_plan: Exclude<PricingPlanCode, "FREE">;
    placement: string;
  };
  premium_template_unlock_prompted: {
    source: AnalyticsSource;
    current_plan: PricingPlanCode;
    template_id: string;
    required_plan: Exclude<PricingPlanCode, "FREE">;
  };
  premium_template_applied: {
    source: AnalyticsSource;
    current_plan: PricingPlanCode;
    template_id: string;
    template_name: string;
    tier: "free" | "premium";
    required_plan: PricingPlanCode | "FREE";
  };
  premium_insight_opened: {
    source: AnalyticsSource;
    current_plan: PricingPlanCode;
    week_number: number;
  };
  rescue_trigger_fired: {
    kind: string;
    severity: string;
    current_plan: PricingPlanCode;
  };
  rescue_trigger_dismissed: {
    kind: string;
    current_plan: PricingPlanCode;
  };
  rescue_action_taken: {
    kind: string;
    action: string;
    current_plan: PricingPlanCode;
  };
  experiment_exposure: {
    experiment_id: string;
    variant_id: string;
    context: string;
  };
}

export type AnalyticsEventName = keyof AnalyticsEventPayloads;

interface TrackAnalyticsOptions {
  goalId?: string;
  area?: string;
  legacyEventName?: string;
  legacyPayload?: AnalyticsPayload;
}

function getAnalyticsMode(): string {
  return import.meta.env.VITE_ANALYTICS_MODE?.trim().toLowerCase() ?? "off";
}

function getAppMode(): string {
  return import.meta.env.VITE_APP_MODE?.trim().toLowerCase() ?? "demo";
}

function getGaMeasurementId(): string {
  return import.meta.env.VITE_GA_MEASUREMENT_ID?.trim() ?? "";
}

function isGaMeasurementId(value: string): boolean {
  return /^G-[A-Z0-9]+$/i.test(value);
}

function isRemoteAnalyticsEnabled(): boolean {
  const measurementId = getGaMeasurementId();
  return getAppMode() === "real" && getAnalyticsMode() === "ga4" && isGaMeasurementId(measurementId);
}

function toMetadata(payload: AnalyticsPayload): Record<string, string> {
  return Object.entries(payload).reduce<Record<string, string>>((metadata, [key, value]) => {
    if (value === undefined || value === null) return metadata;
    metadata[key] = String(value);
    return metadata;
  }, {});
}

function getDefaultArea(eventName: AnalyticsEventName): string {
  if (eventName.startsWith("checkout") || eventName.startsWith("paywall") || eventName === "upgrade_restored") {
    return "monetization";
  }
  if (
    eventName === "progress_viewed" ||
    eventName.includes("twelve_week") ||
    eventName.includes("review") ||
    eventName.includes("task")
  ) {
    return "12_week";
  }
  return "core_funnel";
}

function pushRemoteAnalytics(eventName: AnalyticsEventName, metadata: Record<string, string>, area: string): void {
  if (typeof window === "undefined" || !isRemoteAnalyticsEnabled()) return;

  const eventPayload = {
    event: eventName,
    app: "vision_board_web",
    area,
    ...metadata,
  };

  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(eventPayload);

  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, {
      app: "vision_board_web",
      area,
      ...metadata,
    });
  }
}

export function trackAnalyticsEvent<TEventName extends AnalyticsEventName>(
  eventName: TEventName,
  payload: AnalyticsEventPayloads[TEventName],
  options: TrackAnalyticsOptions = {},
): void {
  const metadata = toMetadata(payload as AnalyticsPayload);
  trackAppEvent(eventName, options.goalId, metadata);

  if (options.legacyEventName) {
    trackAppEvent(options.legacyEventName, options.goalId, toMetadata(options.legacyPayload ?? metadata));
  }

  pushRemoteAnalytics(eventName, metadata, options.area ?? getDefaultArea(eventName));
}

export function canSendRemoteAnalytics(): boolean {
  return isRemoteAnalyticsEnabled();
}
