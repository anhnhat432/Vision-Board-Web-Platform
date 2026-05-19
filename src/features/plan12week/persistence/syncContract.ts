import type { DataMutationStatus } from "./mutationQueue";

export type TwelveWeekSyncBlockedReason =
  | "demo_mode"
  | "mutation_sync_disabled"
  | "pull_sync_disabled"
  | "api_unconfigured"
  | "unauthenticated"
  | "profile_not_ready"
  | "offline"
  | "document_hidden";

export type TwelveWeekLocalWriteOutcome = "local_saved" | "queue_failed_local_saved";
export type TwelveWeekRemoteSyncOutcome = "queued" | "syncing" | "synced" | "conflict" | "failed" | "skipped";

export interface TwelveWeekSyncFeatureInput {
  realMode: boolean;
  mutationSyncEnabled: boolean;
  pullSyncEnabled: boolean;
  apiConfigured: boolean;
}

export interface TwelveWeekSyncReadinessInput extends TwelveWeekSyncFeatureInput {
  ownerUid: string | null;
  userProfileReady: boolean;
  online: boolean;
  documentVisible: boolean;
}

export interface TwelveWeekSyncFeatureFlags {
  fullSyncEnabled: boolean;
  drainSyncEnabled: boolean;
  fullSyncBlockedReason: TwelveWeekSyncBlockedReason | null;
  drainSyncBlockedReason: TwelveWeekSyncBlockedReason | null;
}

export interface TwelveWeekSyncReadiness extends TwelveWeekSyncFeatureFlags {
  fullSyncBaseReady: boolean;
  drainSyncBaseReady: boolean;
  drainSyncReady: boolean;
}

export const TWELVE_WEEK_SOURCE_OF_TRUTH_CONTRACT = {
  demoMode: "localStorage is the only source of truth; backend API calls stay disabled.",
  realModeLocalFirst: "Local writes happen before remote sync so user progress survives offline or backend failure.",
  mutationQueue: "Remote writes are represented by per-user mutation queue items until backend applies them.",
  pullSync:
    "Cloud pull may hydrate localStorage only after auth, profile bootstrap, API config, and conflict checks pass.",
  conflictPolicy: "Conflict or unsafe sync blocks automatic overwrite until user action chooses local or cloud.",
} as const;

export const TWELVE_WEEK_SYNC_STATUS_FLOW: readonly (TwelveWeekLocalWriteOutcome | TwelveWeekRemoteSyncOutcome)[] = [
  "local_saved",
  "queued",
  "syncing",
  "synced",
  "conflict",
  "failed",
  "skipped",
  "queue_failed_local_saved",
];

export const RETRYABLE_MUTATION_STATUSES: ReadonlySet<DataMutationStatus> = new Set([
  "pending",
  "retry_scheduled",
  "blocked_auth",
  "blocked_config",
]);

function getSharedBlockReason(input: TwelveWeekSyncFeatureInput): TwelveWeekSyncBlockedReason | null {
  if (!input.realMode) return "demo_mode";
  if (!input.mutationSyncEnabled) return "mutation_sync_disabled";
  if (!input.apiConfigured) return "api_unconfigured";
  return null;
}

function getFullSyncBlockedReason(input: TwelveWeekSyncFeatureInput): TwelveWeekSyncBlockedReason | null {
  const sharedReason = getSharedBlockReason(input);
  if (sharedReason) return sharedReason;
  if (!input.pullSyncEnabled) return "pull_sync_disabled";
  return null;
}

function getRuntimeBlockedReason(
  input: Pick<TwelveWeekSyncReadinessInput, "ownerUid" | "userProfileReady" | "online">,
): TwelveWeekSyncBlockedReason | null {
  if (!input.ownerUid) return "unauthenticated";
  if (!input.userProfileReady) return "profile_not_ready";
  if (!input.online) return "offline";
  return null;
}

export function getTwelveWeekSyncFeatureFlags(input: TwelveWeekSyncFeatureInput): TwelveWeekSyncFeatureFlags {
  const fullSyncBlockedReason = getFullSyncBlockedReason(input);
  const drainSyncBlockedReason = getSharedBlockReason(input);

  return {
    fullSyncEnabled: fullSyncBlockedReason === null,
    drainSyncEnabled: drainSyncBlockedReason === null,
    fullSyncBlockedReason,
    drainSyncBlockedReason,
  };
}

export function getTwelveWeekSyncReadiness(input: TwelveWeekSyncReadinessInput): TwelveWeekSyncReadiness {
  const featureFlags = getTwelveWeekSyncFeatureFlags(input);
  const fullRuntimeReason = featureFlags.fullSyncBlockedReason ?? getRuntimeBlockedReason(input);
  const drainRuntimeReason = featureFlags.drainSyncBlockedReason ?? getRuntimeBlockedReason(input);
  const drainSyncBlockedReason = drainRuntimeReason ?? (input.documentVisible ? null : "document_hidden");

  return {
    ...featureFlags,
    fullSyncBlockedReason: fullRuntimeReason,
    drainSyncBlockedReason,
    fullSyncBaseReady: fullRuntimeReason === null,
    drainSyncBaseReady: drainRuntimeReason === null,
    drainSyncReady: drainSyncBlockedReason === null,
  };
}
