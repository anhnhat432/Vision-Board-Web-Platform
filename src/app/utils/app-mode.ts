export type AppMode = "demo" | "real";

function normalizeAppMode(value: string | undefined): AppMode {
  return value?.trim().toLowerCase() === "real" ? "real" : "demo";
}

const APP_MODE = normalizeAppMode(import.meta.env.VITE_APP_MODE);
const SHOW_BILLING_DEBUG_UI = import.meta.env.VITE_SHOW_BILLING_DEBUG === "true";

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
