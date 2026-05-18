import { isRealMode, shouldEnable12WeekMutationSync } from "@/app/utils/app-mode";
import { isApiBaseUrlConfigured, toAppError } from "@/lib/api/apiClient";
import { deleteGoal } from "@/services/goalService";
import { deletePlan } from "@/services/planService";
import {
  post12WeekMutations,
  toTwelveWeekMutationRequestItem,
  type TwelveWeekMutationBatchResponse,
  type TwelveWeekMutationResult,
} from "@/services/syncService";
import {
  compactMutations,
  listPendingMutations,
  markMutationFailed,
  markMutationInFlight,
  markMutationSucceeded,
  readMutationQueueStore,
  writeMutationQueueStore,
  type DataMutationItem,
  type DataMutationQueueStore,
  type MutationFailureInput,
} from "./mutationQueue";

export type MutationQueueSyncSkipReason =
  | "feature_disabled"
  | "demo_mode"
  | "unauthenticated"
  | "api_not_configured"
  | "offline"
  | "empty";

export interface MutationQueueSyncResult {
  status: "skipped" | "idle" | "success" | "partial" | "error";
  skipReason?: MutationQueueSyncSkipReason;
  attemptedCount: number;
  succeededCount: number;
  duplicateCount: number;
  failedCount: number;
  pendingCount: number;
  error?: unknown;
}

export interface SendPending12WeekMutationsOptions {
  ownerUid?: string | null;
  authenticated?: boolean;
  featureEnabled?: boolean;
  realMode?: boolean;
  apiConfigured?: boolean;
  online?: boolean;
  storage?: Storage | null;
  now?: string | Date;
  batchSize?: number;
  postMutations?: typeof post12WeekMutations;
  deleteGoalFn?: typeof deleteGoal;
  deletePlanFn?: typeof deletePlan;
}

const DEFAULT_BATCH_SIZE = 25;
const RETRY_DELAYS_MS = [30_000, 120_000, 600_000, 3_600_000, 14_400_000, 86_400_000];

function toIso(value?: string | Date): string {
  if (value instanceof Date) return value.toISOString();
  if (value) return new Date(value).toISOString();
  return new Date().toISOString();
}

function normalizeOwnerUid(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

function isBrowserOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
}

function getRetryDelayMs(attemptCount: number): number {
  const index = Math.max(0, Math.min(attemptCount - 1, RETRY_DELAYS_MS.length - 1));
  return RETRY_DELAYS_MS[index] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
}

function getNextRetryAt(now: string, attemptCount: number): string {
  return new Date(new Date(now).getTime() + getRetryDelayMs(attemptCount)).toISOString();
}

function createSkippedResult(reason: MutationQueueSyncSkipReason, pendingCount = 0): MutationQueueSyncResult {
  return {
    status: reason === "empty" ? "idle" : "skipped",
    skipReason: reason,
    attemptedCount: 0,
    succeededCount: 0,
    duplicateCount: 0,
    failedCount: 0,
    pendingCount,
  };
}

function updateStoreItems(
  store: DataMutationQueueStore,
  mutationIds: string[],
  updater: (nextStore: DataMutationQueueStore, mutationId: string) => DataMutationQueueStore,
): DataMutationQueueStore {
  return mutationIds.reduce((nextStore, mutationId) => updater(nextStore, mutationId), store);
}

function buildBatchId(ownerUid: string, now: string): string {
  return `dmq_batch_${encodeURIComponent(ownerUid)}_${new Date(now).getTime()}`;
}

function isSuccessStatus(status: string | undefined): boolean {
  return status === "accepted" || status === "applied" || status === "noop" || status === "duplicate";
}

function getFailureInput(result: TwelveWeekMutationResult | null, fallbackMessage: string): MutationFailureInput {
  const status = result?.status;

  if (status === "conflict") {
    return {
      code: result?.reason ?? "sync_conflict",
      message: result?.message ?? "Phát hiện xung đột khi đồng bộ. Vui lòng thử lại.",
      httpStatus: 409,
      retryable: false,
    };
  }

  if (status === "failed_validation") {
    return {
      code: result?.reason ?? "sync_validation_failed",
      message: result?.message ?? "Dữ liệu gửi đi không hợp lệ, máy chủ từ chối.",
      httpStatus: 400,
      retryable: false,
    };
  }

  return {
    code: result?.reason ?? "sync_mutation_failed",
    message: result?.message ?? fallbackMessage,
    retryable: false,
  };
}

function getRequestFailureInput(error: unknown): MutationFailureInput {
  const appError = toAppError(error) as ReturnType<typeof toAppError> & { isNetworkError?: boolean };
  const status = appError.status;
  const retryable =
    Boolean(appError.isNetworkError) ||
    status === undefined ||
    status === 408 ||
    status === 429 ||
    status >= 500;

  return {
    code: retryable ? "sync_request_retryable" : "sync_request_failed",
    message: appError.message || "Chưa gửi được các thay đổi đang chờ.",
    httpStatus: status,
    retryable,
  };
}

function collectResponseResults(response: TwelveWeekMutationBatchResponse): Map<string, TwelveWeekMutationResult> {
  const results = new Map<string, TwelveWeekMutationResult>();

  for (const result of [
    ...(response.accepted ?? []),
    ...(response.duplicate ?? []),
    ...(response.failed ?? []),
    ...(response.results ?? []),
  ]) {
    if (result?.mutationId) results.set(result.mutationId, result);
  }

  return results;
}

function countRemainingPending(store: DataMutationQueueStore, ownerUid: string, now: string): number {
  return listPendingMutations(store, { ownerUid, now }).length;
}

function isDeleteMutation(item: DataMutationItem): item is Extract<DataMutationItem, { kind: "goal_deleted" | "plan_deleted" }> {
  return item.kind === "goal_deleted" || item.kind === "plan_deleted";
}

function isAlreadyDeletedError(error: unknown): boolean {
  return toAppError(error).status === 404;
}

async function sendDeleteMutation(
  item: Extract<DataMutationItem, { kind: "goal_deleted" | "plan_deleted" }>,
  options: Pick<SendPending12WeekMutationsOptions, "deleteGoalFn" | "deletePlanFn">,
): Promise<void> {
  if (item.kind === "goal_deleted") {
    const backendGoalId = item.payload.backendGoalId?.trim();
    if (!backendGoalId) return;
    await (options.deleteGoalFn ?? deleteGoal)(backendGoalId);
    return;
  }

  const backendPlanId = item.payload.backendPlanId?.trim();
  if (!backendPlanId) return;
  await (options.deletePlanFn ?? deletePlan)(backendPlanId);
}

function createDrainResult(input: {
  pendingMutationsLength: number;
  latestStore: DataMutationQueueStore;
  ownerUid: string;
  now: string;
  succeededCount: number;
  duplicateCount: number;
  failedCount: number;
  hadRequestError: boolean;
  error?: unknown;
}): MutationQueueSyncResult {
  return {
    status: input.failedCount > 0 ? (input.hadRequestError && input.succeededCount === 0 ? "error" : "partial") : input.hadRequestError ? "error" : "success",
    attemptedCount: input.pendingMutationsLength,
    succeededCount: input.succeededCount,
    duplicateCount: input.duplicateCount,
    failedCount: input.failedCount,
    pendingCount: countRemainingPending(input.latestStore, input.ownerUid, input.now),
    error: input.error,
  };
}

export async function sendPending12WeekMutations(
  options: SendPending12WeekMutationsOptions = {},
): Promise<MutationQueueSyncResult> {
  const ownerUid = normalizeOwnerUid(options.ownerUid);
  const featureEnabled = options.featureEnabled ?? shouldEnable12WeekMutationSync();
  const realMode = options.realMode ?? isRealMode();
  const authenticated = options.authenticated ?? Boolean(ownerUid);
  const apiConfigured = options.apiConfigured ?? isApiBaseUrlConfigured();
  const online = options.online ?? isBrowserOnline();
  const now = toIso(options.now);

  if (!featureEnabled) return createSkippedResult("feature_disabled");
  if (!realMode) return createSkippedResult("demo_mode");
  if (!authenticated || !ownerUid) return createSkippedResult("unauthenticated");
  if (!apiConfigured) return createSkippedResult("api_not_configured");
  if (!online) return createSkippedResult("offline");

  const rawStore = readMutationQueueStore(ownerUid, { storage: options.storage, now });
  const store = compactMutations(rawStore, { now });
  if (store.items.length !== rawStore.items.length) {
    writeMutationQueueStore(store, { storage: options.storage });
  }
  const pendingMutations = listPendingMutations(store, { ownerUid, now }).slice(0, options.batchSize ?? DEFAULT_BATCH_SIZE);
  if (pendingMutations.length === 0) return createSkippedResult("empty");

  const mutationIds = pendingMutations.map((item) => item.id);
  const inFlightStore = {
    ...updateStoreItems(store, mutationIds, (nextStore, mutationId) =>
      markMutationInFlight(nextStore, mutationId, { now }),
    ),
    lastDrainStartedAt: now,
  };
  writeMutationQueueStore(inFlightStore, { storage: options.storage });

  const deleteMutations = pendingMutations.filter(isDeleteMutation);
  const batchMutations = pendingMutations.filter((item) => !isDeleteMutation(item));
  let latestStore = readMutationQueueStore(ownerUid, { storage: options.storage, now });
  let succeededCount = 0;
  let duplicateCount = 0;
  let failedCount = 0;
  let hadRequestError = false;
  let latestError: unknown;

  for (const item of deleteMutations) {
    try {
      await sendDeleteMutation(item, options);
      latestStore = markMutationSucceeded(latestStore, item.id, { now });
      succeededCount += 1;
    } catch (error) {
      if (isAlreadyDeletedError(error)) {
        latestStore = markMutationSucceeded(latestStore, item.id, { now });
        succeededCount += 1;
        duplicateCount += 1;
        continue;
      }

      const failure = getRequestFailureInput(error);
      const inFlightItem = latestStore.items.find((candidate) => candidate.id === item.id);
      latestStore = markMutationFailed(latestStore, item.id, failure, {
        now,
        nextRetryAt: failure.retryable ? getNextRetryAt(now, inFlightItem?.attemptCount ?? item.attemptCount + 1) : undefined,
      });
      if (failure.httpStatus !== 429) failedCount += 1;
      hadRequestError = true;
      latestError = error;
    }
  }

  if (deleteMutations.length > 0) {
    writeMutationQueueStore(latestStore, { storage: options.storage });
  }

  if (batchMutations.length > 0) {
    const request = {
      batchId: buildBatchId(ownerUid, now),
      clientGeneratedAt: now,
      mutations: batchMutations.map(toTwelveWeekMutationRequestItem),
    };

    try {
      const response = await (options.postMutations ?? post12WeekMutations)(request);
      const results = collectResponseResults(response);
      latestStore = readMutationQueueStore(ownerUid, { storage: options.storage, now });

      for (const item of deleteMutations) {
        const appliedDelete = latestStore.items.find((candidate) => candidate.id === item.id && candidate.status === "applied");
        if (!appliedDelete) continue;
        latestStore = markMutationSucceeded(latestStore, item.id, { now });
      }

      for (const item of batchMutations) {
        const result = results.get(item.id);
        if (isSuccessStatus(result?.status)) {
          latestStore = markMutationSucceeded(latestStore, item.id, { now });
          succeededCount += 1;
          if (result?.status === "duplicate") duplicateCount += 1;
          continue;
        }

        const failure = result
          ? getFailureInput(result, "Đồng bộ thất bại, sẽ thử lại sau.")
          : {
              code: "missing_sync_result",
              message: "Máy chủ không trả về kết quả cho thay đổi này.",
              retryable: true,
            };
        const inFlightItem = latestStore.items.find((candidate) => candidate.id === item.id);
        latestStore = markMutationFailed(latestStore, item.id, failure, {
          now,
          nextRetryAt: failure.retryable ? getNextRetryAt(now, inFlightItem?.attemptCount ?? item.attemptCount + 1) : undefined,
        });
        failedCount += 1;
      }
    } catch (error) {
      const failure = getRequestFailureInput(error);
      latestStore = readMutationQueueStore(ownerUid, { storage: options.storage, now });

      for (const item of batchMutations) {
        const inFlightItem = latestStore.items.find((candidate) => candidate.id === item.id);
        latestStore = markMutationFailed(latestStore, item.id, failure, {
          now,
          nextRetryAt: failure.retryable ? getNextRetryAt(now, inFlightItem?.attemptCount ?? item.attemptCount + 1) : undefined,
        });
      }

      if (failure.httpStatus !== 429) failedCount += batchMutations.length;
      hadRequestError = true;
      latestError = error;
    }
  }

  latestStore = {
    ...latestStore,
    lastDrainFinishedAt: now,
  };
  writeMutationQueueStore(latestStore, { storage: options.storage });

  return createDrainResult({
    pendingMutationsLength: pendingMutations.length,
    latestStore,
    ownerUid,
    now,
    succeededCount,
    duplicateCount,
    failedCount,
    hadRequestError,
    error: latestError,
  });
}
