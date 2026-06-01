import { readActiveAuthOwnerUid } from "@/app/utils/storage-auth-scope";
import type { TwelveWeekSystem, UniversalDailyCheckIn, UniversalWeeklyReview } from "@/app/utils/storage-types";

export const DATA_MUTATION_QUEUE_VERSION = 1;
export const DATA_MUTATION_QUEUE_LEGACY_STORAGE_KEY = "visionboard_data_mutation_queue";
export const MUTATION_QUEUE_TRIM_RETENTION_DAYS = 14;
export const DATA_MUTATION_QUEUE_ANONYMOUS_STORAGE_KEY = `${DATA_MUTATION_QUEUE_LEGACY_STORAGE_KEY}:anonymous`;
export const DATA_MUTATION_QUEUE_AUTH_STORAGE_PREFIX = `${DATA_MUTATION_QUEUE_LEGACY_STORAGE_KEY}:auth:`;
export const DATA_MUTATION_QUEUE_DEVICE_ID_STORAGE_KEY = `${DATA_MUTATION_QUEUE_LEGACY_STORAGE_KEY}:device_id`;
export const DATA_MUTATION_QUEUE_RECOVERY_STORAGE_PREFIX = `${DATA_MUTATION_QUEUE_LEGACY_STORAGE_KEY}:recovery:`;

export type DataMutationQueueVersion = typeof DATA_MUTATION_QUEUE_VERSION;

export type DataMutationKind =
  | "task_completed_changed"
  | "daily_check_in_upserted"
  | "weekly_review_upserted"
  | "plan_snapshot_updated"
  | "lead_metric_upserted"
  | "goal_deleted"
  | "plan_deleted";

export type DataMutationStatus =
  | "pending"
  | "in_flight"
  | "retry_scheduled"
  | "blocked_auth"
  | "blocked_config"
  | "blocked_conflict"
  | "failed_validation"
  | "failed_terminal"
  | "applied"
  | "archived";

export interface DataMutationQueueStore {
  version: DataMutationQueueVersion;
  ownerUid: string | null;
  deviceId: string;
  updatedAt: string;
  lastDrainStartedAt?: string;
  lastDrainFinishedAt?: string;
  items: DataMutationItem[];
}

export interface DataMutationQueueStoreSummary {
  totalCount: number;
  pendingCount: number;
  inFlightCount: number;
  failedOrRetryableCount: number;
  succeededCount: number;
  lastDrainStartedAt: string | null;
  lastDrainFinishedAt: string | null;
}

export interface DataMutationError {
  code: string;
  message: string;
  httpStatus?: number;
  lastSeenAt: string;
  retryable: boolean;
}

export interface TaskCompletedChangedMutationPayload {
  taskId: string;
  clientTaskId?: string;
  clientPlanId?: string | null;
  clientWeekId?: string | null;
  weekNumber: number;
  completed: boolean;
  completedAt?: string;
  scheduledDate: string;
  title?: string;
  leadIndicatorName?: string;
  isCore?: boolean;
}

export interface DailyCheckInUpsertedMutationPayload {
  date: string;
  clientPlanId?: string | null;
  clientWeekId?: string | null;
  weekNumber: number;
  checkIn: UniversalDailyCheckIn;
}

export interface WeeklyReviewUpsertedMutationPayload {
  clientPlanId?: string | null;
  clientWeekId?: string | null;
  weekNumber: number;
  executionScore?: number;
  review: UniversalWeeklyReview;
}

export type PlanSnapshotMutationReason = "setup" | "reentry" | "reset" | "manual_update" | "snapshot_retry";

export type PlanSnapshotSystemPayload = Pick<
  TwelveWeekSystem,
  | "goalType"
  | "vision12Week"
  | "lagMetric"
  | "leadIndicators"
  | "milestones"
  | "successEvidence"
  | "reviewDay"
  | "week12Outcome"
  | "startDate"
  | "endDate"
  | "timezone"
  | "weekStartsOn"
  | "status"
  | "tacticLoadPreference"
  | "preferredDays"
  | "personalConstraint"
  | "reentryCount"
  | "currentWeek"
  | "totalWeeks"
  | "weeklyPlans"
>;

export interface PlanSnapshotUpdatedMutationPayload {
  reason: PlanSnapshotMutationReason;
  clientPlanId: string;
  clientGoalId?: string;
  changedAt: string;
  clientUpdatedAt: string;
  system: PlanSnapshotSystemPayload;
}

export type LeadMetricMutationReason = "setup" | "manual_update" | "task_progress" | "snapshot_retry";

export interface LeadMetricUpsertedMutationPayload {
  reason: LeadMetricMutationReason;
  clientPlanId: string;
  clientWeekId: string;
  clientMetricId: string;
  leadIndicatorId?: string;
  weekNumber: number;
  name: string;
  weeklyTarget: number;
  target?: string;
  unit?: string;
  type?: TwelveWeekSystem["leadIndicators"][number]["type"];
  priority?: number;
  schedule?: number[];
  currentValue?: number;
  changedAt: string;
  clientUpdatedAt: string;
}

export interface GoalDeletedMutationPayload {
  clientGoalId: string;
  backendGoalId?: string;
  backendPlanId?: string;
  deletedAt: string;
}

export interface PlanDeletedMutationPayload {
  clientPlanId: string;
  backendPlanId?: string;
  clientGoalId?: string;
  deletedAt: string;
}

export type DataMutationPayloadByKind = {
  task_completed_changed: TaskCompletedChangedMutationPayload;
  daily_check_in_upserted: DailyCheckInUpsertedMutationPayload;
  weekly_review_upserted: WeeklyReviewUpsertedMutationPayload;
  plan_snapshot_updated: PlanSnapshotUpdatedMutationPayload;
  lead_metric_upserted: LeadMetricUpsertedMutationPayload;
  goal_deleted: GoalDeletedMutationPayload;
  plan_deleted: PlanDeletedMutationPayload;
};

export type DataMutationPayload = DataMutationPayloadByKind[DataMutationKind];

export type DataMutationItem = {
  [Kind in DataMutationKind]: {
    id: string;
    idempotencyKey: string;
    collapseKey: string;
    kind: Kind;
    status: DataMutationStatus;
    createdAt: string;
    updatedAt: string;
    nextRetryAt?: string;
    lastAttemptAt?: string;
    attemptCount: number;
    maxAttempts: number;
    ownerUid: string | null;
    goalId: string;
    planId?: string | null;
    localRevision?: number;
    dependsOn?: string[];
    supersedes?: string[];
    error?: DataMutationError;
    payload: DataMutationPayloadByKind[Kind];
  };
}[DataMutationKind];

export type DataMutationEnqueueInput = {
  [Kind in DataMutationKind]: {
    kind: Kind;
    ownerUid?: string | null;
    goalId: string;
    planId?: string | null;
    localRevision?: number;
    dependsOn?: string[];
    payload: DataMutationPayloadByKind[Kind];
  };
}[DataMutationKind];

export interface MutationQueueOptions {
  now?: string | Date;
}

export interface EnqueueMutationOptions extends MutationQueueOptions {
  deviceId?: string;
  createId?: () => string;
  maxAttempts?: number;
}

export interface ListPendingMutationsOptions extends MutationQueueOptions {
  ownerUid?: string | null;
  includeBlockedAuth?: boolean;
  includeBlockedConfig?: boolean;
}

export interface MarkMutationFailedOptions extends MutationQueueOptions {
  nextRetryAt?: string | Date;
}

export interface ReadStoredMutationQueueOptions extends MutationQueueOptions {
  storage?: Storage | null;
  deviceId?: string;
}

export interface StoredMutationQueueOptions extends EnqueueMutationOptions {
  ownerUid?: string | null;
  storage?: Storage | null;
}

export interface StoredMutationQueueResult {
  ok: boolean;
  store: DataMutationQueueStore;
  item: DataMutationItem | null;
  error?: unknown;
}

export interface MutationFailureInput {
  code: string;
  message: string;
  httpStatus?: number;
  retryable?: boolean;
}

const COLLAPSIBLE_STATUSES = new Set<DataMutationStatus>([
  "pending",
  "retry_scheduled",
  "blocked_auth",
  "blocked_config",
]);

const TRIM_TERMINAL_STATUSES = new Set<DataMutationStatus>(["applied", "archived"]);

function toIso(value?: string | Date): string {
  if (value instanceof Date) return value.toISOString();
  if (value) return new Date(value).toISOString();
  return new Date().toISOString();
}

function compareIso(left: string, right: string): number {
  return new Date(left).getTime() - new Date(right).getTime();
}

function normalizeOwnerUid(ownerUid: string | null | undefined): string | null {
  const normalized = ownerUid?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

function resolveNow(input?: string | Date): Date {
  if (input instanceof Date) return input;
  if (typeof input === "string") return new Date(input);
  return new Date();
}

function ownerMatches(itemOwnerUid: string | null, ownerUid: string | null): boolean {
  return normalizeOwnerUid(itemOwnerUid) === normalizeOwnerUid(ownerUid);
}

function encodeOwner(ownerUid: string): string {
  return encodeURIComponent(ownerUid);
}

function getItemOwner(inputOwnerUid: string | null | undefined, storeOwnerUid: string | null): string | null {
  return normalizeOwnerUid(inputOwnerUid) ?? normalizeOwnerUid(storeOwnerUid);
}

function buildIdempotencyKey(ownerUid: string | null, deviceId: string, mutationId: string): string {
  const ownerPart = ownerUid ? encodeOwner(ownerUid) : "anonymous";
  return `${ownerPart}:${encodeURIComponent(deviceId)}:${mutationId}`;
}

function getCollapseKey(input: DataMutationEnqueueInput): string {
  switch (input.kind) {
    case "task_completed_changed":
      return `task:${input.goalId}:${input.payload.clientTaskId ?? input.payload.taskId}`;
    case "daily_check_in_upserted":
      return `daily-checkin:${input.goalId}:${input.payload.date}`;
    case "weekly_review_upserted":
      return `weekly-review:${input.goalId}:${input.payload.weekNumber}`;
    case "plan_snapshot_updated":
      return `plan-snapshot:${input.goalId}`;
    case "lead_metric_upserted":
      return `lead-metric:${input.goalId}:${input.payload.clientMetricId}`;
    case "goal_deleted":
      return `delete:goal_deleted:${input.payload.clientGoalId}`;
    case "plan_deleted":
      return `delete:plan_deleted:${input.payload.clientPlanId}`;
  }
}

function hasDueRetry(item: DataMutationItem, now: string): boolean {
  if (item.status !== "retry_scheduled") return false;
  if (!item.nextRetryAt) return true;
  return compareIso(item.nextRetryAt, now) <= 0;
}

function shouldListAsPending(item: DataMutationItem, now: string, options: ListPendingMutationsOptions): boolean {
  if (item.status === "pending") return true;
  if (hasDueRetry(item, now)) return true;
  if (options.includeBlockedAuth && item.status === "blocked_auth") return true;
  if (options.includeBlockedConfig && item.status === "blocked_config") return true;
  return false;
}

function getFailureStatus(input: MutationFailureInput): DataMutationStatus {
  if (input.httpStatus === 400) return "failed_validation";
  if (input.httpStatus === 401) return "blocked_auth";
  if (input.httpStatus === 409) return "blocked_conflict";
  return input.retryable ? "retry_scheduled" : "failed_terminal";
}

function getBrowserStorage(storage?: Storage | null): Storage | null {
  if (storage) return storage;

  try {
    return (globalThis as typeof globalThis & { localStorage?: Storage }).localStorage ?? null;
  } catch {
    return null;
  }
}

function safeGetItem(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(storage: Storage, key: string, value: string): boolean {
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function createMutationQueueDeviceId(now: Date = new Date(), random: () => number = Math.random): string {
  const suffix = Math.floor(random() * 36 ** 8)
    .toString(36)
    .padStart(6, "0")
    .slice(0, 8);
  return `dmq_device_${now.getTime()}_${suffix}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isStoredMutationItem(value: unknown): value is DataMutationItem {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.idempotencyKey === "string" &&
    typeof value.collapseKey === "string" &&
    typeof value.kind === "string" &&
    typeof value.status === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    typeof value.attemptCount === "number" &&
    typeof value.maxAttempts === "number" &&
    typeof value.goalId === "string" &&
    isRecord(value.payload)
  );
}

function parseStoredQueue(
  rawValue: string,
  ownerUid: string | null,
  deviceId: string,
  now?: string | Date,
): DataMutationQueueStore | null {
  try {
    const parsedValue = JSON.parse(rawValue) as unknown;
    if (!isRecord(parsedValue) || !Array.isArray(parsedValue.items)) return null;

    const items = parsedValue.items.filter(isStoredMutationItem).map((item) => ({
      ...item,
      ownerUid: normalizeOwnerUid(item.ownerUid) ?? ownerUid,
    })) as DataMutationItem[];

    return {
      version: DATA_MUTATION_QUEUE_VERSION,
      ownerUid,
      deviceId: typeof parsedValue.deviceId === "string" && parsedValue.deviceId ? parsedValue.deviceId : deviceId,
      updatedAt: typeof parsedValue.updatedAt === "string" ? parsedValue.updatedAt : toIso(now),
      lastDrainStartedAt:
        typeof parsedValue.lastDrainStartedAt === "string" ? parsedValue.lastDrainStartedAt : undefined,
      lastDrainFinishedAt:
        typeof parsedValue.lastDrainFinishedAt === "string" ? parsedValue.lastDrainFinishedAt : undefined,
      items,
    };
  } catch {
    return null;
  }
}

function preserveInvalidQueue(storage: Storage, sourceKey: string, rawValue: string, now?: string | Date): void {
  const recoveryKey = `${DATA_MUTATION_QUEUE_RECOVERY_STORAGE_PREFIX}${encodeURIComponent(sourceKey)}:${Date.parse(toIso(now))}`;
  safeSetItem(storage, recoveryKey, rawValue);
}

function trimTerminalMutations(
  store: DataMutationQueueStore,
  now: Date,
): { store: DataMutationQueueStore; removed: number } {
  const cutoff = now.getTime() - MUTATION_QUEUE_TRIM_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const kept: DataMutationItem[] = [];
  let removed = 0;

  for (const item of store.items) {
    if (TRIM_TERMINAL_STATUSES.has(item.status)) {
      const updatedAtMs = Date.parse(item.updatedAt);
      if (Number.isFinite(updatedAtMs) && updatedAtMs < cutoff) {
        removed += 1;
        continue;
      }
    }
    kept.push(item);
  }

  if (removed === 0) return { store, removed: 0 };
  return { store: { ...store, items: kept }, removed };
}

function getExplicitOwnerUid(input: { inputOwnerUid?: string | null; optionsOwnerUid?: string | null }): string | null {
  if (input.inputOwnerUid !== undefined) return normalizeOwnerUid(input.inputOwnerUid);
  if (input.optionsOwnerUid !== undefined) return normalizeOwnerUid(input.optionsOwnerUid);
  return readActiveAuthOwnerUid();
}

export function getOrCreateMutationQueueDeviceId(options: ReadStoredMutationQueueOptions = {}): string {
  if (options.deviceId) return options.deviceId;

  const storage = getBrowserStorage(options.storage);
  if (!storage) return createMutationQueueDeviceId(options.now ? new Date(toIso(options.now)) : undefined);

  const existingDeviceId = safeGetItem(storage, DATA_MUTATION_QUEUE_DEVICE_ID_STORAGE_KEY)?.trim() ?? "";
  if (existingDeviceId) return existingDeviceId;

  const nextDeviceId = createMutationQueueDeviceId(options.now ? new Date(toIso(options.now)) : undefined);
  safeSetItem(storage, DATA_MUTATION_QUEUE_DEVICE_ID_STORAGE_KEY, nextDeviceId);
  return nextDeviceId;
}

export function getMutationQueueStorageKey(ownerUid?: string | null): string {
  const normalizedOwnerUid = normalizeOwnerUid(ownerUid);
  return normalizedOwnerUid
    ? `${DATA_MUTATION_QUEUE_AUTH_STORAGE_PREFIX}${encodeOwner(normalizedOwnerUid)}`
    : DATA_MUTATION_QUEUE_ANONYMOUS_STORAGE_KEY;
}

export function createEmptyMutationQueueStore(input: {
  ownerUid?: string | null;
  deviceId: string;
  now?: string | Date;
}): DataMutationQueueStore {
  return {
    version: DATA_MUTATION_QUEUE_VERSION,
    ownerUid: normalizeOwnerUid(input.ownerUid),
    deviceId: input.deviceId,
    updatedAt: toIso(input.now),
    items: [],
  };
}

export function readMutationQueueStore(
  ownerUid?: string | null,
  options: ReadStoredMutationQueueOptions = {},
): DataMutationQueueStore {
  const normalizedOwnerUid = normalizeOwnerUid(ownerUid);
  const storage = getBrowserStorage(options.storage);
  const deviceId = getOrCreateMutationQueueDeviceId({ ...options, storage });
  const emptyStore = createEmptyMutationQueueStore({
    ownerUid: normalizedOwnerUid,
    deviceId,
    now: options.now,
  });

  if (!storage) return emptyStore;

  const scopedKey = getMutationQueueStorageKey(normalizedOwnerUid);
  const scopedValue = safeGetItem(storage, scopedKey);
  if (scopedValue) {
    const parsedQueue = parseStoredQueue(scopedValue, normalizedOwnerUid, deviceId, options.now);
    if (parsedQueue) return parsedQueue;

    preserveInvalidQueue(storage, scopedKey, scopedValue, options.now);
    return emptyStore;
  }

  if (normalizedOwnerUid) return emptyStore;

  const legacyValue = safeGetItem(storage, DATA_MUTATION_QUEUE_LEGACY_STORAGE_KEY);
  if (!legacyValue) return emptyStore;

  const parsedLegacyQueue = parseStoredQueue(legacyValue, null, deviceId, options.now);
  if (parsedLegacyQueue) return parsedLegacyQueue;

  preserveInvalidQueue(storage, DATA_MUTATION_QUEUE_LEGACY_STORAGE_KEY, legacyValue, options.now);
  return emptyStore;
}

export function writeMutationQueueStore(
  store: DataMutationQueueStore,
  options: Pick<ReadStoredMutationQueueOptions, "storage" | "now"> = {},
): boolean {
  const storage = getBrowserStorage(options.storage);
  if (!storage) return false;

  const trimResult = trimTerminalMutations(store, resolveNow(options.now));
  const finalStore = trimResult.store;

  if (trimResult.removed > 0) {
    console.info("[mutation-queue-reaper] trimmed", {
      ownerUid: finalStore.ownerUid,
      removed: trimResult.removed,
      kept: finalStore.items.length,
    });
  }

  return safeSetItem(storage, getMutationQueueStorageKey(finalStore.ownerUid), JSON.stringify(finalStore));
}

export function enqueueStoredMutation(
  input: DataMutationEnqueueInput,
  options: StoredMutationQueueOptions = {},
): StoredMutationQueueResult {
  const ownerUid = getExplicitOwnerUid({
    inputOwnerUid: input.ownerUid,
    optionsOwnerUid: options.ownerUid,
  });
  const deviceId = getOrCreateMutationQueueDeviceId(options);
  const store = readMutationQueueStore(ownerUid, { ...options, deviceId });
  const scopedInput = {
    ...input,
    ownerUid,
  } as DataMutationEnqueueInput;

  try {
    const nextStore = enqueueMutation(store, scopedInput, {
      ...options,
      deviceId,
    });
    const collapseKey = getCollapseKey(scopedInput);
    const item =
      nextStore.items.find(
        (candidate) => ownerMatches(candidate.ownerUid, ownerUid) && candidate.collapseKey === collapseKey,
      ) ?? null;
    const ok = writeMutationQueueStore(nextStore, options);

    return {
      ok,
      store: nextStore,
      item,
    };
  } catch (error) {
    return {
      ok: false,
      store,
      item: null,
      error,
    };
  }
}

export function listStoredPendingMutations(
  ownerUid?: string | null,
  options: ReadStoredMutationQueueOptions & ListPendingMutationsOptions = {},
): DataMutationItem[] {
  const normalizedOwnerUid =
    ownerUid !== undefined
      ? normalizeOwnerUid(ownerUid)
      : (normalizeOwnerUid(options.ownerUid) ?? readActiveAuthOwnerUid());
  const store = readMutationQueueStore(normalizedOwnerUid, options);

  return listPendingMutations(store, {
    ...options,
    ownerUid: normalizedOwnerUid,
  });
}

export function createMutationId(now: Date = new Date(), random: () => number = Math.random): string {
  const suffix = Math.floor(random() * 36 ** 8)
    .toString(36)
    .padStart(6, "0")
    .slice(0, 8);
  return `dmq_${now.getTime()}_${suffix}`;
}

export function compactMutations(
  store: DataMutationQueueStore,
  options: MutationQueueOptions = {},
): DataMutationQueueStore {
  const updatedAt = toIso(options.now ?? store.updatedAt);
  const latestByCollapseKey = new Map<string, DataMutationItem>();
  const compactedItems: DataMutationItem[] = [];

  for (const item of store.items) {
    if (!COLLAPSIBLE_STATUSES.has(item.status)) {
      compactedItems.push(item);
      continue;
    }

    const groupKey = `${item.ownerUid ?? "anonymous"}:${item.collapseKey}`;
    const previous = latestByCollapseKey.get(groupKey);
    if (!previous) {
      latestByCollapseKey.set(groupKey, item);
      continue;
    }

    const previousTime = compareIso(previous.updatedAt, item.updatedAt);
    const latest = previousTime <= 0 ? item : previous;
    const superseded = previousTime <= 0 ? previous : item;
    const mergedSupersedes = [...(latest.supersedes ?? []), superseded.id, ...(superseded.supersedes ?? [])];

    latestByCollapseKey.set(groupKey, {
      ...latest,
      updatedAt,
      supersedes: Array.from(new Set(mergedSupersedes)),
    } as DataMutationItem);
  }

  return {
    ...store,
    updatedAt,
    items: [...compactedItems, ...latestByCollapseKey.values()].sort((left, right) =>
      compareIso(left.createdAt, right.createdAt),
    ),
  };
}

export function enqueueMutation(
  store: DataMutationQueueStore,
  input: DataMutationEnqueueInput,
  options: EnqueueMutationOptions = {},
): DataMutationQueueStore {
  const now = toIso(options.now);
  const mutationId = options.createId?.() ?? createMutationId(new Date(now));
  const ownerUid = getItemOwner(input.ownerUid, store.ownerUid);
  const deviceId = options.deviceId ?? store.deviceId;
  const item = {
    id: mutationId,
    idempotencyKey: buildIdempotencyKey(ownerUid, deviceId, mutationId),
    collapseKey: getCollapseKey(input),
    kind: input.kind,
    status: "pending",
    createdAt: now,
    updatedAt: now,
    attemptCount: 0,
    maxAttempts: options.maxAttempts ?? 7,
    ownerUid,
    goalId: input.goalId,
    planId: input.planId,
    localRevision: input.localRevision,
    dependsOn: input.dependsOn,
    payload: input.payload,
  } as DataMutationItem;

  return compactMutations(
    {
      ...store,
      deviceId,
      updatedAt: now,
      items: [...store.items, item],
    },
    { now },
  );
}

export function listPendingMutations(
  store: DataMutationQueueStore,
  options: ListPendingMutationsOptions = {},
): DataMutationItem[] {
  const now = toIso(options.now);
  const ownerUid = normalizeOwnerUid(options.ownerUid) ?? store.ownerUid;
  return store.items.filter((item) => ownerMatches(item.ownerUid, ownerUid) && shouldListAsPending(item, now, options));
}

export function summarizeMutationQueueStore(store: DataMutationQueueStore): DataMutationQueueStoreSummary {
  const failedOrRetryableStatuses = new Set<DataMutationStatus>([
    "retry_scheduled",
    "blocked_auth",
    "blocked_config",
    "blocked_conflict",
    "failed_validation",
    "failed_terminal",
  ]);

  return {
    totalCount: store.items.length,
    pendingCount: store.items.filter((item) => item.status === "pending").length,
    inFlightCount: store.items.filter((item) => item.status === "in_flight").length,
    failedOrRetryableCount: store.items.filter((item) => failedOrRetryableStatuses.has(item.status)).length,
    succeededCount: store.items.filter((item) => item.status === "applied").length,
    lastDrainStartedAt: store.lastDrainStartedAt ?? null,
    lastDrainFinishedAt: store.lastDrainFinishedAt ?? null,
  };
}

export function markMutationInFlight(
  store: DataMutationQueueStore,
  mutationId: string,
  options: MutationQueueOptions = {},
): DataMutationQueueStore {
  const now = toIso(options.now);
  return {
    ...store,
    updatedAt: now,
    items: store.items.map((item) =>
      item.id === mutationId
        ? {
            ...item,
            status: "in_flight",
            lastAttemptAt: now,
            nextRetryAt: undefined,
            attemptCount: item.attemptCount + 1,
            updatedAt: now,
          }
        : item,
    ),
  };
}

export function markMutationSucceeded(
  store: DataMutationQueueStore,
  mutationId: string,
  options: MutationQueueOptions = {},
): DataMutationQueueStore {
  const now = toIso(options.now);
  return {
    ...store,
    updatedAt: now,
    items: store.items.map((item) =>
      item.id === mutationId
        ? {
            ...item,
            status: "applied",
            error: undefined,
            nextRetryAt: undefined,
            updatedAt: now,
          }
        : item,
    ),
  };
}

export function markMutationFailed(
  store: DataMutationQueueStore,
  mutationId: string,
  failure: MutationFailureInput,
  options: MarkMutationFailedOptions = {},
): DataMutationQueueStore {
  const now = toIso(options.now);
  const status = getFailureStatus(failure);
  const nextRetryAt = status === "retry_scheduled" && options.nextRetryAt ? toIso(options.nextRetryAt) : undefined;

  return {
    ...store,
    updatedAt: now,
    items: store.items.map((item) =>
      item.id === mutationId
        ? {
            ...item,
            status,
            error: {
              code: failure.code,
              message: failure.message,
              httpStatus: failure.httpStatus,
              retryable: status === "retry_scheduled",
              lastSeenAt: now,
            },
            nextRetryAt,
            updatedAt: now,
          }
        : item,
    ),
  };
}

export function clearMutationsForAuthOwner(
  store: DataMutationQueueStore,
  ownerUid?: string | null,
  options: MutationQueueOptions = {},
): DataMutationQueueStore {
  const normalizedOwnerUid = normalizeOwnerUid(ownerUid);
  const now = toIso(options.now);

  return {
    ...store,
    updatedAt: now,
    items: store.items.filter((item) => !ownerMatches(item.ownerUid, normalizedOwnerUid)),
  };
}

export function archiveMutationsByIds(
  ownerUid: string,
  ids: string[],
  options: MutationQueueOptions & { storage?: Storage | null } = {},
): boolean {
  const store = readMutationQueueStore(ownerUid, { ...options });
  const idSet = new Set(ids);
  let changed = false;
  const now = toIso(options.now);

  const items = store.items.map((item) => {
    if (item.ownerUid !== ownerUid || !idSet.has(item.id)) return item;
    changed = true;
    return {
      ...item,
      status: "archived" as const,
      error: undefined,
      nextRetryAt: undefined,
      updatedAt: now,
    };
  });

  if (!changed) return false;
  return writeMutationQueueStore(
    {
      ...store,
      updatedAt: now,
      items,
    },
    { storage: options.storage, now: options.now },
  );
}

export function requeueMutationsAsPending(
  ownerUid: string,
  ids: string[],
  options: MutationQueueOptions & { storage?: Storage | null } = {},
): boolean {
  const store = readMutationQueueStore(ownerUid, { ...options });
  const idSet = new Set(ids);
  let changed = false;
  const now = toIso(options.now);

  const items = store.items.map((item) => {
    if (item.ownerUid !== ownerUid || !idSet.has(item.id)) return item;
    changed = true;
    return {
      ...item,
      status: "pending" as const,
      error: undefined,
      nextRetryAt: undefined,
      updatedAt: now,
    };
  });

  if (!changed) return false;
  return writeMutationQueueStore(
    {
      ...store,
      updatedAt: now,
      items,
    },
    { storage: options.storage, now: options.now },
  );
}
