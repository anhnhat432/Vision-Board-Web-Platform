export type AppMode = "demo" | "real";

function normalizeAppMode(value: string | undefined): AppMode {
  const trimmed = value?.trim().toLowerCase();
  if (trimmed === "demo") return "demo";
  if (trimmed === "real") return "real";

  // Missing or malformed → default to "real" so production deployments
  // never silently downgrade to demo mode.
  if (trimmed !== undefined && trimmed !== "") {
    console.error(`[app-mode] Invalid VITE_APP_MODE="${value}". Expected "real" or "demo". Falling back to "real".`);
  }
  return "real";
}

const APP_MODE = normalizeAppMode(import.meta.env.VITE_APP_MODE);
const SHOW_BILLING_DEBUG_UI = import.meta.env.VITE_SHOW_BILLING_DEBUG === "true";
const SHOW_SYNC_DEBUG_UI = import.meta.env.VITE_SHOW_SYNC_DEBUG === "true";

function normalizeBoolFlag(value: string | undefined): boolean {
  if (typeof value !== "string") return false;
  const trimmed = value.trim().toLowerCase();
  return trimmed === "1" || trimmed === "true" || trimmed === "yes" || trimmed === "on";
}

const PAID_CHECKOUT_DISABLED = normalizeBoolFlag(import.meta.env.VITE_BILLING_PAID_CHECKOUT_DISABLED);
const ENABLE_12_WEEK_MUTATION_SYNC = import.meta.env.VITE_ENABLE_12_WEEK_MUTATION_SYNC === "true";
const ENABLE_12_WEEK_PULL_SYNC = import.meta.env.VITE_ENABLE_12_WEEK_PULL_SYNC === "true";
const ENABLE_12_WEEK_GOAL_TOMBSTONE_SYNC = import.meta.env.VITE_ENABLE_12_WEEK_GOAL_TOMBSTONE_SYNC !== "false";
const ENABLE_12_WEEK_IMPORT_DRY_RUN = import.meta.env.VITE_ENABLE_12_WEEK_IMPORT_DRY_RUN === "true";
const ENABLE_12_WEEK_CLOUD_IMPORT = import.meta.env.VITE_ENABLE_12_WEEK_CLOUD_IMPORT === "true";

export function getAppMode(): AppMode {
  return APP_MODE;
}

export function isDemoMode(): boolean {
  return APP_MODE === "demo";
}

export function isRealMode(): boolean {
  return APP_MODE === "real";
}

export function shouldSeedDemoData(): boolean {
  return isDemoMode();
}

export function shouldShowBillingDebugUi(): boolean {
  return SHOW_BILLING_DEBUG_UI;
}

/**
 * Whether paid checkout is administratively disabled via env kill-switch.
 *
 * When `VITE_BILLING_PAID_CHECKOUT_DISABLED=1` (or `true`/`yes`/`on`):
 * - Upgrade CTAs must not start a checkout session.
 * - `/billing/confirm` must not POST to checkout-session endpoints.
 * - The UI must show clear support-fallback copy instead.
 *
 * This guards against unsafe payment when the active payment provider is
 * expired (e.g. Casso Standard) or migrating (e.g. PayOS adapter not ready).
 * Independent of `isRealMode()` so demo previews can be flipped too if needed.
 */
export function isPaidCheckoutDisabled(): boolean {
  return PAID_CHECKOUT_DISABLED;
}

export function shouldShowSyncDebugUi(): boolean {
  return SHOW_SYNC_DEBUG_UI;
}

export function shouldEnable12WeekMutationSync(): boolean {
  return ENABLE_12_WEEK_MUTATION_SYNC;
}

export function shouldEnable12WeekPullSync(): boolean {
  return ENABLE_12_WEEK_PULL_SYNC;
}

export function shouldEnable12WeekGoalTombstoneSync(): boolean {
  return ENABLE_12_WEEK_GOAL_TOMBSTONE_SYNC;
}

export function shouldEnable12WeekImportDryRun(): boolean {
  return ENABLE_12_WEEK_IMPORT_DRY_RUN;
}

export function shouldEnable12WeekCloudImport(): boolean {
  return ENABLE_12_WEEK_CLOUD_IMPORT;
}
