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
  landing_viewed: {
    source: AnalyticsSource;
    app_mode: "demo" | "real";
    signed_in: boolean;
    auth_configured: boolean;
    has_local_12_week_system: boolean;
  };
  demo_started: {
    source: AnalyticsSource;
    app_mode: "demo" | "real";
    signed_in: boolean;
    auth_configured: boolean;
    start_destination: string;
  };
  onboarding_started: {
    source: AnalyticsSource;
    returning_user: boolean;
  };
  life_balance_started: {
    source: AnalyticsSource;
    returning_user: boolean;
    has_existing_scores: boolean;
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
    goal_archetype?: string;
    archetype_overridden?: boolean;
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
  twelve_week_setup_started: {
    source: AnalyticsSource;
    current_plan: PricingPlanCode;
    entry_mode: "smart_goal_handoff" | "draft_resume" | "direct";
    template_tier: "free" | "premium" | "none";
    has_saved_draft: boolean;
  };
  twelve_week_system_viewed: {
    source: AnalyticsSource;
    week_number: number;
    total_weeks: number;
    current_plan: PricingPlanCode;
    active_tab: string;
    has_today_tasks: boolean;
    has_weekly_review: boolean;
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
  feedback_submitted: {
    source: AnalyticsSource;
    context: "dashboard" | "12_week_settings";
    rating: number;
    feedback_category: string;
    confusing_text_length: number;
    next_help_text_length: number;
    has_next_help_text: boolean;
  };
  sync_conflict_action: {
    source: AnalyticsSource;
    action: "review_details" | "export_local_backup" | "keep_local" | "retry_sync" | "use_cloud_version";
    status: "conflict" | "unsafe";
    conflict_count: number;
    local_only_count: number;
    cloud_only_count: number;
    missing_client_id_count: number;
    unsupported_field_count: number;
    unresolved_local_mutation_count: number;
  };
}

export type AnalyticsEventName = keyof AnalyticsEventPayloads;

interface TrackAnalyticsOptions {
  goalId?: string;
  area?: string;
  legacyEventName?: string;
  legacyPayload?: AnalyticsPayload;
}

const REMOTE_ANALYTICS_FIELD_ALLOWLIST: Record<AnalyticsEventName, readonly string[]> = {
  landing_viewed: ["source", "app_mode", "signed_in", "auth_configured", "has_local_12_week_system"],
  demo_started: ["source", "app_mode", "signed_in", "auth_configured", "start_destination"],
  onboarding_started: ["source", "returning_user"],
  life_balance_started: ["source", "returning_user", "has_existing_scores"],
  life_balance_completed: ["source", "area_count", "average_score", "weakest_area", "strongest_area"],
  smart_goal_created: [
    "focus_area",
    "target_mode",
    "target_weeks",
    "has_baseline",
    "weekly_hours",
    "goal_archetype",
    "archetype_overridden",
  ],
  feasibility_completed: [
    "focus_area",
    "result_type",
    "readiness_score",
    "adjusted_score",
    "bottleneck_axis",
    "plan_load",
    "weekly_capacity",
    "answer_count",
  ],
  twelve_week_plan_created: [
    "goal_type",
    "focus_area",
    "total_weeks",
    "lead_indicator_count",
    "core_indicator_count",
    "task_count",
    "template_tier",
  ],
  twelve_week_setup_started: ["source", "current_plan", "entry_mode", "template_tier", "has_saved_draft"],
  twelve_week_system_viewed: [
    "source",
    "week_number",
    "total_weeks",
    "current_plan",
    "active_tab",
    "has_today_tasks",
    "has_weekly_review",
  ],
  today_task_completed: ["source", "week_number", "is_core"],
  weekly_review_submitted: ["source", "week_number", "lead_completion_percent", "execution_score", "workload_decision"],
  progress_viewed: ["source", "week_number", "total_weeks", "current_plan"],
  paywall_opened: ["context", "source", "current_plan", "recommended_plan"],
  checkout_started: ["context", "source", "current_plan", "recommended_plan", "plan_code"],
  checkout_completed: [
    "context",
    "source",
    "current_plan",
    "recommended_plan",
    "plan_code",
    "result_plan",
    "provider_mode",
  ],
  upgrade_restored: ["source", "status", "provider_mode", "plan_code", "entitlement_count"],
  paywall_cta_clicked: ["context", "source", "current_plan", "recommended_plan", "target_plan", "placement"],
  premium_template_unlock_prompted: ["source", "current_plan", "template_id", "required_plan"],
  premium_template_applied: ["source", "current_plan", "template_id", "template_name", "tier", "required_plan"],
  premium_insight_opened: ["source", "current_plan", "week_number"],
  rescue_trigger_fired: ["kind", "severity", "current_plan"],
  rescue_trigger_dismissed: ["kind", "current_plan"],
  rescue_action_taken: ["kind", "action", "current_plan"],
  experiment_exposure: ["experiment_id", "variant_id", "context"],
  feedback_submitted: [
    "source",
    "context",
    "rating",
    "feedback_category",
    "confusing_text_length",
    "next_help_text_length",
    "has_next_help_text",
  ],
  sync_conflict_action: [
    "source",
    "action",
    "status",
    "conflict_count",
    "local_only_count",
    "cloud_only_count",
    "missing_client_id_count",
    "unsupported_field_count",
    "unresolved_local_mutation_count",
  ],
};

const REMOTE_ANALYTICS_AREAS = new Set(["core_funnel", "12_week", "monetization"]);
const MAX_REMOTE_METADATA_VALUE_LENGTH = 120;
const EMAIL_VALUE_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ACCOUNT_ID_VALUE_PATTERN = /(?:firebase|backend|user)[_-]?(?:uid|id)[_-]?[a-z0-9]/i;
const SENSITIVE_REMOTE_METADATA_KEY_TOKENS = [
  "email",
  "firebaseuid",
  "firebaseid",
  "backenduserid",
  "backendid",
  "userid",
  "uid",
  "fullname",
  "phone",
  "address",
  "goaltitle",
  "goaltext",
  "goalname",
  "goaldescription",
  "reflection",
  "note",
  "freetext",
  "usertext",
  "content",
  "description",
];

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
  if (eventName.startsWith("premium_")) {
    return "monetization";
  }
  if (
    eventName === "progress_viewed" ||
    eventName === "sync_conflict_action" ||
    eventName.includes("twelve_week") ||
    eventName.includes("review") ||
    eventName.includes("task")
  ) {
    return "12_week";
  }
  return "core_funnel";
}

function isSensitiveRemoteMetadataKey(key: string): boolean {
  const normalizedKey = key.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return SENSITIVE_REMOTE_METADATA_KEY_TOKENS.some((token) => normalizedKey.includes(token));
}

function isSafeRemoteMetadataValue(value: string): boolean {
  const trimmedValue = value.trim();
  if (trimmedValue.length > MAX_REMOTE_METADATA_VALUE_LENGTH) return false;
  if (/[\r\n]/.test(trimmedValue)) return false;
  if (EMAIL_VALUE_PATTERN.test(trimmedValue)) return false;
  if (ACCOUNT_ID_VALUE_PATTERN.test(trimmedValue)) return false;
  return true;
}

function sanitizeRemoteMetadata(
  eventName: AnalyticsEventName,
  metadata: Record<string, string>,
): Record<string, string> {
  const allowedFields = new Set(REMOTE_ANALYTICS_FIELD_ALLOWLIST[eventName]);

  return Object.entries(metadata).reduce<Record<string, string>>((safeMetadata, [key, value]) => {
    if (!allowedFields.has(key)) return safeMetadata;
    if (isSensitiveRemoteMetadataKey(key)) return safeMetadata;
    if (!isSafeRemoteMetadataValue(value)) return safeMetadata;
    safeMetadata[key] = value;
    return safeMetadata;
  }, {});
}

function sanitizeRemoteArea(eventName: AnalyticsEventName, area: string): string {
  return REMOTE_ANALYTICS_AREAS.has(area) ? area : getDefaultArea(eventName);
}

function pushRemoteAnalytics(eventName: AnalyticsEventName, metadata: Record<string, string>, area: string): void {
  if (typeof window === "undefined" || !isRemoteAnalyticsEnabled()) return;

  const safeMetadata = sanitizeRemoteMetadata(eventName, metadata);
  const safeArea = sanitizeRemoteArea(eventName, area);
  const eventPayload = {
    event: eventName,
    app: "vision_board_web",
    area: safeArea,
    ...safeMetadata,
  };

  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(eventPayload);

  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, {
      app: "vision_board_web",
      area: safeArea,
      ...safeMetadata,
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
