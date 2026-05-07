export type AppMode = "demo" | "real";

function normalizeAppMode(value: string | undefined): AppMode {
  return value?.trim().toLowerCase() === "real" ? "real" : "demo";
}

const APP_MODE = normalizeAppMode(import.meta.env.VITE_APP_MODE);
const SHOW_BILLING_DEBUG_UI = import.meta.env.VITE_SHOW_BILLING_DEBUG === "true";
const SHOW_SYNC_DEBUG_UI = import.meta.env.VITE_SHOW_SYNC_DEBUG === "true";
const ENABLE_12_WEEK_MUTATION_SYNC = import.meta.env.VITE_ENABLE_12_WEEK_MUTATION_SYNC === "true";
const ENABLE_12_WEEK_PULL_SYNC = import.meta.env.VITE_ENABLE_12_WEEK_PULL_SYNC === "true";
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

export function shouldShowSyncDebugUi(): boolean {
  return SHOW_SYNC_DEBUG_UI;
}

export function shouldEnable12WeekMutationSync(): boolean {
  return ENABLE_12_WEEK_MUTATION_SYNC;
}

export function shouldEnable12WeekPullSync(): boolean {
  return ENABLE_12_WEEK_PULL_SYNC;
}

export function shouldEnable12WeekImportDryRun(): boolean {
  return ENABLE_12_WEEK_IMPORT_DRY_RUN;
}

export function shouldEnable12WeekCloudImport(): boolean {
  return ENABLE_12_WEEK_CLOUD_IMPORT;
}
