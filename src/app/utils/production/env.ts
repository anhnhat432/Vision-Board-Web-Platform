import type { EntitlementKey } from "../storage-types";

export const LAST_OUTBOX_SYNC_KEY = "visionboard_last_outbox_sync";
export const LAST_BROWSER_NOTIFICATION_KEY = "visionboard_last_browser_notification";
export const LAST_ENTITLEMENT_SYNC_KEY = "visionboard_last_entitlement_sync";
export const LAST_RESTORE_ACCESS_KEY = "visionboard_last_restore_access";
export const MOCK_BILLING_ACCOUNT_KEY = "visionboard_mock_billing_account";
export const MOCK_BILLING_SESSION_PREFIX = "visionboard_mock_billing_session_";

export const OUTBOX_SYNC_ENDPOINT = import.meta.env.VITE_OUTBOX_SYNC_ENDPOINT?.trim() || "";
export const BILLING_PROVIDER_MODE = import.meta.env.VITE_BILLING_PROVIDER_MODE?.trim() || "";
export const BILLING_PROVIDER_LABEL = import.meta.env.VITE_BILLING_PROVIDER_LABEL?.trim() || "";
export const BILLING_API_BASE = (import.meta.env.VITE_BILLING_API_BASE?.trim() || "").replace(/\/$/, "");
export const BILLING_CHECKOUT_ENDPOINT =
  import.meta.env.VITE_BILLING_CHECKOUT_ENDPOINT?.trim() || (BILLING_API_BASE ? `${BILLING_API_BASE}/checkout` : "");
export const BILLING_PORTAL_ENDPOINT =
  import.meta.env.VITE_BILLING_PORTAL_ENDPOINT?.trim() || (BILLING_API_BASE ? `${BILLING_API_BASE}/portal` : "");
export const BILLING_RESTORE_ENDPOINT =
  import.meta.env.VITE_BILLING_RESTORE_ENDPOINT?.trim() || (BILLING_API_BASE ? `${BILLING_API_BASE}/restore` : "");
export const BILLING_ENTITLEMENT_SYNC_ENDPOINT =
  import.meta.env.VITE_BILLING_ENTITLEMENT_SYNC_ENDPOINT?.trim() ||
  (BILLING_API_BASE ? `${BILLING_API_BASE}/entitlements` : "");

export const EMAIL_REMINDER_ENDPOINT =
  import.meta.env.VITE_EMAIL_REMINDER_ENDPOINT?.trim() ||
  (BILLING_API_BASE ? `${BILLING_API_BASE}/email-reminders` : "");

export const PUSH_VAPID_PUBLIC_KEY = import.meta.env.VITE_PUSH_VAPID_PUBLIC_KEY?.trim() || "";
export const PUSH_SUBSCRIBE_ENDPOINT =
  import.meta.env.VITE_PUSH_SUBSCRIBE_ENDPOINT?.trim() ||
  (BILLING_API_BASE ? `${BILLING_API_BASE}/push-subscribe` : "");

export const ENTITLEMENT_KEYS: EntitlementKey[] = [
  "premium_templates",
  "premium_review_insights",
  "priority_reminders",
  "advanced_analytics",
];
