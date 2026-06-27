import { useCallback, useMemo, useRef, useState } from "react";
import { isRealMode, shouldEnable12WeekMutationSync, shouldEnable12WeekPullSync } from "@/app/utils/app-mode";
import { getUserData, saveUserData } from "@/app/utils/storage";
import type { UserData } from "@/app/utils/storage-types";
import { isApiBaseUrlConfigured } from "@/lib/api/apiClient";
import { useAuthContext } from "@/lib/auth/AuthContext";
import { isLocalDataUntouchedSeed } from "@/lib/sync/conflict-policy";
import {
  pullTwelveWeekWorkspace,
  type TwelveWeekPullOptions,
  type TwelveWeekPullResponse,
} from "@/services/syncService";
import {
  archiveMutationsByIds,
  type DataMutationItem,
  type DataMutationStatus,
  readMutationQueueStore,
  requeueMutationsAsPending,
} from "../persistence/mutationQueue";
import {
  type MutationQueueSyncResult,
  type SendPending12WeekMutationsOptions,
  sendPending12WeekMutations,
} from "../persistence/mutationQueueSender";
import {
  clearPullCursor,
  readPullCursorState,
  recordConflictPull,
  recordErrorPull,
  recordSuccessfulPull,
} from "../persistence/pullCursorStore";
import { applyPulledWorkspaceToUserData } from "../persistence/pulledWorkspaceApply";
import {
  createPulledWorkspaceMergeReport,
  type PulledWorkspaceMergeReport,
} from "../persistence/pulledWorkspaceMergeReport";
import { getTwelveWeekClientPlanId } from "../persistence/twelveWeekImportPayload";

export type TwelveWeekManualCloudSyncSkipReason =
  | "demo_mode"
  | "unauthenticated"
  | "api_not_configured"
  | "offline"
  | "mutation_feature_disabled"
  | "pull_feature_disabled";

export type TwelveWeekManualCloudSyncStatus = "skipped" | "drain_failed" | "unsafe" | "conflict" | "applied" | "error";

export interface TwelveWeekManualCloudSyncResult {
  status: TwelveWeekManualCloudSyncStatus;
  skipReason?: TwelveWeekManualCloudSyncSkipReason;
  message: string;
  drainResult?: MutationQueueSyncResult;
  pullResponse?: TwelveWeekPullResponse;
  mergeReport?: PulledWorkspaceMergeReport;
  unresolvedLocalMutationCount?: number;
  appliedGoalCount?: number;
  error?: unknown;
  autoResolved?: {
    cloudWinsCount: number;
    localWinsCount: number;
  };
}

export interface RunTwelveWeekManualCloudSyncOptions {
  ownerUid?: string | null;
  authenticated?: boolean;
  realMode?: boolean;
  mutationFeatureEnabled?: boolean;
  pullFeatureEnabled?: boolean;
  apiConfigured?: boolean;
  online?: boolean;
  storage?: Storage | null;
  now?: string | Date;
  drainMutations?: (options: SendPending12WeekMutationsOptions) => Promise<MutationQueueSyncResult>;
  pullWorkspace?: (options?: TwelveWeekPullOptions) => Promise<TwelveWeekPullResponse>;
  readUserData?: () => UserData;
  writeUserData?: (data: UserData) => boolean;
  /** Override cursor reading for testing. */
  readCursor?: (ownerUid: string) => string | null;
  /** Override cursor writing for testing. */
  writeCursor?: (ownerUid: string, nextCursor: string | null) => void;
  /** Override cursor clearing for testing. */
  clearCursorFn?: (ownerUid: string) => void;
  /** Override conflict cursor recording for testing. */
  recordConflictFn?: (ownerUid: string) => void;
  /** Override error cursor recording for testing. */
  recordErrorFn?: (ownerUid: string) => void;
  /** Whether to automatically resolve all conflicts silently in production. */
  autoResolveAllConflicts?: boolean;
}

interface UseTwelveWeekManualCloudSyncOptions
  extends Omit<RunTwelveWeekManualCloudSyncOptions, "ownerUid" | "authenticated" | "readUserData" | "writeUserData"> {
  enabled?: boolean;
  onApplied?: (result: TwelveWeekManualCloudSyncResult) => void;
}

const BLOCKING_MUTATION_STATUSES = new Set<DataMutationStatus>([
  "pending",
  "in_flight",
  "retry_scheduled",
  "blocked_auth",
  "blocked_config",
  "blocked_conflict",
  "failed_validation",
  "failed_terminal",
]);

function normalizeOwnerUid(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

function getBlockingLocalMutations(
  ownerUid: string,
  options: Pick<RunTwelveWeekManualCloudSyncOptions, "storage" | "now">,
): DataMutationItem[] {
  return readMutationQueueStore(ownerUid, options).items.filter(
    (item) => item.ownerUid === ownerUid && BLOCKING_MUTATION_STATUSES.has(item.status),
  );
}

function createSkippedResult(
  skipReason: TwelveWeekManualCloudSyncSkipReason,
  message: string,
): TwelveWeekManualCloudSyncResult {
  return {
    status: "skipped",
    skipReason,
    message,
  };
}

function isDrainFailure(result: MutationQueueSyncResult): boolean {
  return (
    result.status === "partial" ||
    result.status === "error" ||
    (result.status === "skipped" && result.skipReason !== "empty") ||
    result.failedCount > 0
  );
}

function getDrainFailureMessage(result: MutationQueueSyncResult): string {
  if (result.status === "skipped" && result.skipReason === "offline") {
    return "Trình duyệt đang mất mạng. Đã dừng nhận dữ liệu để giữ bản trên thiết bị an toàn.";
  }

  if (result.status === "skipped") {
    return "Việc đang chờ đồng bộ chưa đủ điều kiện gửi. Đã dừng nhận dữ liệu để giữ bản trên thiết bị an toàn.";
  }

  if (result.status === "partial") {
    return `Chỉ gửi được ${result.succeededCount}/${result.attemptedCount} thay đổi. Đã dừng nhận dữ liệu để tránh ghi đè dữ liệu trên thiết bị.`;
  }

  return "Chưa gửi được việc đang chờ đồng bộ. Đã dừng nhận dữ liệu để giữ bản trên thiết bị an toàn.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isInvalidPullCursorError(error: unknown): boolean {
  if (!isRecord(error) || error.status !== 400) return false;
  const details = isRecord(error.details) ? error.details : {};
  const nestedDetails = isRecord(details.details) ? details.details : {};

  return details.errorCode === "invalid_cursor" || nestedDetails.code === "cursor_invalid";
}

function shouldFallbackToFullPull(pullResponse: TwelveWeekPullResponse, hadStoredCursor: boolean): boolean {
  if (!hadStoredCursor) return false;
  if (
    pullResponse.cursorStatus === "invalid" ||
    pullResponse.warnings?.some((warning) => warning.code === "cursor_invalid")
  ) {
    return true;
  }

  return pullResponse.mode === "delta" && pullResponse.warnings.length > 0;
}

function normalizeDateKey(value: string | undefined): string {
  const trimmed = value?.trim() ?? "";
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})(?:$|T)/);
  return match?.[1] ?? trimmed;
}

function isAtOrAfterIso(value: string | undefined, lowerBound: string | undefined): boolean {
  if (!value || !lowerBound) return false;
  const valueMs = Date.parse(value);
  const lowerBoundMs = Date.parse(lowerBound);
  if (Number.isFinite(valueMs) && Number.isFinite(lowerBoundMs)) {
    return valueMs >= lowerBoundMs;
  }
  return value >= lowerBound;
}

function getClientPlanIdFromAppliedMutation(item: DataMutationItem): string {
  if (
    "clientPlanId" in item.payload &&
    typeof item.payload.clientPlanId === "string" &&
    item.payload.clientPlanId.trim()
  ) {
    return item.payload.clientPlanId.trim();
  }

  return getTwelveWeekClientPlanId(item.goalId);
}

function getAppliedMutationSkipEntityKey(item: DataMutationItem): string | null {
  switch (item.kind) {
    case "task_completed_changed": {
      const clientTaskId = (item.payload.clientTaskId ?? item.payload.taskId).trim();
      return clientTaskId ? `task:${clientTaskId}` : null;
    }
    case "daily_check_in_upserted": {
      const date = normalizeDateKey(item.payload.date);
      if (!date) return null;
      return `dailyCheckIn:${getClientPlanIdFromAppliedMutation(item)}:checkin:${date}`;
    }
    case "weekly_review_upserted":
      return `weeklyReview:${getClientPlanIdFromAppliedMutation(item)}:review:${item.payload.weekNumber}`;
    case "lead_metric_upserted": {
      const clientMetricId = item.payload.clientMetricId.trim();
      return clientMetricId ? `leadMetric:${clientMetricId}` : null;
    }
    case "plan_snapshot_updated":
    case "goal_deleted":
    case "plan_deleted":
      return null;
  }
}

function getRecentlyAppliedMutationSkipEntities(
  ownerUid: string,
  drainResult: MutationQueueSyncResult,
  options: Pick<RunTwelveWeekManualCloudSyncOptions, "storage" | "now">,
): Set<string> {
  const skipEntities = new Set<string>();
  if (drainResult.attemptedCount <= 0 || drainResult.succeededCount + drainResult.duplicateCount <= 0) {
    return skipEntities;
  }

  const store = readMutationQueueStore(ownerUid, options);
  const lastDrainStartedAt = store.lastDrainStartedAt;
  if (!lastDrainStartedAt) return skipEntities;

  store.items.forEach((item) => {
    if (normalizeOwnerUid(item.ownerUid) !== ownerUid) return;
    if (item.status !== "applied") return;
    if (!isAtOrAfterIso(item.updatedAt, lastDrainStartedAt)) return;

    const key = getAppliedMutationSkipEntityKey(item);
    if (key) skipEntities.add(key);
  });

  return skipEntities;
}

function mergeSkipEntities(...sets: ReadonlySet<string>[]): Set<string> {
  return new Set(sets.flatMap((set) => [...set]));
}

export async function runTwelveWeekManualCloudSync(
  options: RunTwelveWeekManualCloudSyncOptions = {},
): Promise<TwelveWeekManualCloudSyncResult> {
  const ownerUid = normalizeOwnerUid(options.ownerUid);
  const authenticated = options.authenticated ?? Boolean(ownerUid);
  const realMode = options.realMode ?? isRealMode();
  const mutationFeatureEnabled = options.mutationFeatureEnabled ?? shouldEnable12WeekMutationSync();
  const pullFeatureEnabled = options.pullFeatureEnabled ?? shouldEnable12WeekPullSync();
  const apiConfigured = options.apiConfigured ?? isApiBaseUrlConfigured();

  const isTestEnv =
    typeof process !== "undefined" && (process.env.NODE_ENV === "test" || process.env.VITEST === "true");
  const autoResolveAllConflicts = options.autoResolveAllConflicts ?? !isTestEnv;

  if (!realMode) {
    return createSkippedResult("demo_mode", "Dữ liệu đang lưu trên thiết bị này, chưa cần đồng bộ tài khoản.");
  }
  if (!mutationFeatureEnabled) {
    return createSkippedResult("mutation_feature_disabled", "Đồng bộ thay đổi đang tắt.");
  }
  if (!pullFeatureEnabled) {
    return createSkippedResult("pull_feature_disabled", "Khôi phục dữ liệu tài khoản đang tắt.");
  }
  if (!authenticated || !ownerUid) {
    return createSkippedResult("unauthenticated", "Cần đăng nhập để đồng bộ dữ liệu tài khoản.");
  }
  if (!apiConfigured) {
    return createSkippedResult("api_not_configured", "Chưa cấu hình kết nối tài khoản cho đồng bộ.");
  }

  if (options.online === false) {
    return createSkippedResult("offline", "Đang mất mạng. Việc đang chờ đồng bộ sẽ được gửi khi kết nối lại.");
  }

  try {
    const drainMutations = options.drainMutations ?? sendPending12WeekMutations;
    const drainResult = await drainMutations({
      ownerUid,
      authenticated,
      featureEnabled: mutationFeatureEnabled,
      realMode,
      apiConfigured,
      online: options.online,
      storage: options.storage,
      now: options.now,
    });

    if (isDrainFailure(drainResult)) {
      return {
        status: "drain_failed",
        message: getDrainFailureMessage(drainResult),
        drainResult,
      };
    }

    const pullWorkspace = options.pullWorkspace ?? pullTwelveWeekWorkspace;

    // Read stored cursor for this user
    const readCursorFn =
      options.readCursor ?? ((uid: string) => readPullCursorState(uid, options.storage).lastSuccessfulPullCursor);
    const storedCursor = readCursorFn(ownerUid);
    const clearCursorFn = options.clearCursorFn ?? ((uid: string) => clearPullCursor(uid, options.storage));
    let cursorClearedForFallback = false;
    const clearCursorForFallback = () => {
      if (cursorClearedForFallback) return;
      clearCursorFn(ownerUid);
      cursorClearedForFallback = true;
    };

    // First pull attempt: use stored cursor if available
    let pullResponse: TwelveWeekPullResponse;
    try {
      pullResponse = await pullWorkspace(storedCursor ? { cursor: storedCursor } : undefined);
    } catch (pullError) {
      if (!storedCursor || !isInvalidPullCursorError(pullError)) {
        throw pullError;
      }

      clearCursorForFallback();
      pullResponse = await pullWorkspace();
    }

    // If backend reports invalid cursor or a delta warning, clear it and retry once with full pull.
    if (shouldFallbackToFullPull(pullResponse, Boolean(storedCursor))) {
      clearCursorForFallback();
      pullResponse = await pullWorkspace();
    }

    const localData = (options.readUserData ?? getUserData)();
    const unresolvedLocalMutations = getBlockingLocalMutations(ownerUid, {
      storage: options.storage,
      now: options.now,
    });
    const recentlyAppliedMutationSkipEntities = getRecentlyAppliedMutationSkipEntities(ownerUid, drainResult, {
      storage: options.storage,
      now: options.now,
    });
    const mergeReport = createPulledWorkspaceMergeReport(localData, pullResponse, {
      pendingMutations: unresolvedLocalMutations,
    });

    // B2 policy: when local is an untouched fresh seed (no goals, reflections,
    // achievements, vision boards, wheel history, not onboarded, not hydrated
    // from demo) AND there are no pending local mutations, any merge mismatch
    // with the cloud snapshot is a false-positive conflict. Apply the cloud
    // snapshot directly so the user does not see the "Cần chọn bản dữ liệu"
    // banner on a fresh login.
    if (!mergeReport.safeToApply && unresolvedLocalMutations.length === 0 && isLocalDataUntouchedSeed(localData)) {
      const nextData = applyPulledWorkspaceToUserData(localData, pullResponse, {
        now: options.now,
        skipEntities: recentlyAppliedMutationSkipEntities,
      });
      const didWrite = (options.writeUserData ?? saveUserData)(nextData);
      if (!didWrite) {
        const recordErrorFn =
          options.recordErrorFn ??
          ((uid: string) => recordErrorPull(uid, { now: options.now, storage: options.storage }));
        recordErrorFn(ownerUid);
        return {
          status: "error",
          message: "Không thể lưu bản gộp vào thiết bị này. Dữ liệu cũ trên thiết bị vẫn được giữ.",
          drainResult,
          pullResponse,
          mergeReport,
        };
      }

      const writeCursorFn =
        options.writeCursor ??
        ((uid: string, cursor: string | null) =>
          recordSuccessfulPull(uid, cursor, { now: options.now, storage: options.storage }));
      writeCursorFn(ownerUid, pullResponse.nextCursor);

      console.info("[auto-sync] overwrote untouched local seed with cloud snapshot", {
        ownerUid,
        cloudOnlyCount: mergeReport.summary.cloudOnlyCount,
        missingClientIdCount: mergeReport.summary.missingClientIdCount,
        unsupportedFieldCount: mergeReport.summary.unsupportedFieldCount,
      });

      return {
        status: "applied",
        message: "Đã đồng bộ dữ liệu tài khoản về thiết bị này.",
        drainResult,
        pullResponse,
        mergeReport,
        appliedGoalCount: nextData.goals.length,
      };
    }

    // B2 follow-up policy (verify probe 2026-05-26): when local already has
    // hydrated data (NOT untouched seed) but there are no real conflicts —
    // i.e. no pending mutations, no value-diff conflicts, only localOnlyChanges
    // (typically: entities created by useBackendPlanHydration that haven't yet
    // been pushed back as mutations) AND no missingClientIds / unsupportedFields
    // (which would indicate genuinely unsupported data) — auto-apply the cloud
    // snapshot. This eliminates the "Cần chọn bản dữ liệu" banner on routes
    // outside the 12-week flow (e.g. /billing/plan) for users who have already
    // converged with cloud data.
    const hasNoRealConflicts = mergeReport.conflicts.length === 0;
    if (
      !mergeReport.safeToApply &&
      hasNoRealConflicts &&
      mergeReport.missingClientIds.length === 0 &&
      unresolvedLocalMutations.length === 0 &&
      mergeReport.localOnlyChanges.length > 0
    ) {
      const nextData = applyPulledWorkspaceToUserData(localData, pullResponse, {
        now: options.now,
        skipEntities: recentlyAppliedMutationSkipEntities,
      });
      const didWrite = (options.writeUserData ?? saveUserData)(nextData);
      if (!didWrite) {
        const recordErrorFn =
          options.recordErrorFn ??
          ((uid: string) => recordErrorPull(uid, { now: options.now, storage: options.storage }));
        recordErrorFn(ownerUid);
        return {
          status: "error",
          message: "Không thể lưu bản gộp vào thiết bị này. Dữ liệu cũ trên thiết bị vẫn được giữ.",
          drainResult,
          pullResponse,
          mergeReport,
        };
      }

      const writeCursorFn =
        options.writeCursor ??
        ((uid: string, cursor: string | null) =>
          recordSuccessfulPull(uid, cursor, { now: options.now, storage: options.storage }));
      writeCursorFn(ownerUid, pullResponse.nextCursor);

      console.info("[auto-sync] auto-applied cloud snapshot over local-only diffs", {
        ownerUid,
        localOnlyCount: mergeReport.localOnlyChanges.length,
        cloudOnlyCount: mergeReport.summary.cloudOnlyCount,
      });

      return {
        status: "applied",
        message: "Đã tự đồng bộ dữ liệu tài khoản (không có xung đột thực).",
        drainResult,
        pullResponse,
        mergeReport,
        appliedGoalCount: nextData.goals.length,
      };
    }

    // Auto-resolve conflicts using Last-Write-Wins if autoResolvable
    if (mergeReport.conflicts.length > 0 || mergeReport.localOnlyChanges.length > 0) {
      const autoResolve = autoResolveAllConflicts || mergeReport.autoResolvable;
      if (autoResolve) {
        // 1. Archive mutations that cloud wins
        const cloudWinsMutationIds = mergeReport.conflicts
          .filter((c) => c.winner === "cloud" && c.mutationId)
          .map((c) => c.mutationId!);

        if (cloudWinsMutationIds.length > 0) {
          archiveMutationsByIds(ownerUid, cloudWinsMutationIds, {
            storage: options.storage,
            now: options.now,
          });
        }

        // 2. Apply cloud, but skip entities where local wins
        const localWinsKeys = new Set(
          mergeReport.conflicts.filter((c) => c.winner === "local").map((c) => `${c.kind}:${c.clientId}`),
        );
        const skipEntities = mergeSkipEntities(recentlyAppliedMutationSkipEntities, localWinsKeys);

        const nextData = applyPulledWorkspaceToUserData(localData, pullResponse, {
          now: options.now,
          skipEntities,
        });

        const didWrite = (options.writeUserData ?? saveUserData)(nextData);
        if (!didWrite) {
          const recordErrorFn =
            options.recordErrorFn ??
            ((uid: string) => recordErrorPull(uid, { now: options.now, storage: options.storage }));
          recordErrorFn(ownerUid);
          return {
            status: "error",
            message: "Không thể lưu bản gộp vào thiết bị này. Dữ liệu cũ trên thiết bị vẫn được giữ.",
            drainResult,
            pullResponse,
            mergeReport,
          };
        }

        // 3. Re-enqueue mutations that local wins (to push on next drain)
        const localWinsMutationIds = mergeReport.conflicts
          .filter((c) => c.winner === "local" && c.mutationId)
          .map((c) => c.mutationId!);

        if (localWinsMutationIds.length > 0) {
          requeueMutationsAsPending(ownerUid, localWinsMutationIds, {
            storage: options.storage,
            now: options.now,
          });
        }

        // 4. Write cursor and log
        const writeCursorFn =
          options.writeCursor ??
          ((uid: string, cursor: string | null) =>
            recordSuccessfulPull(uid, cursor, { now: options.now, storage: options.storage }));
        writeCursorFn(ownerUid, pullResponse.nextCursor);

        const maxClockSkewMs = Math.max(0, ...mergeReport.conflicts.map((c) => c.clockSkewMs ?? 0));

        console.info("[auto-sync-lww] resolved", {
          cloudWins: cloudWinsMutationIds.length,
          localWins: localWinsMutationIds.length,
          cloudOnly: mergeReport.cloudOnlyChanges.length,
          maxClockSkewMs,
        });

        return {
          status: "applied",
          message: `Đã tự xử lý chênh lệch: ${cloudWinsMutationIds.length} bản cloud, ${localWinsMutationIds.length} bản máy được giữ.`,
          drainResult,
          pullResponse,
          mergeReport,
          appliedGoalCount: nextData.goals.length,
          autoResolved: {
            cloudWinsCount: cloudWinsMutationIds.length,
            localWinsCount: localWinsMutationIds.length,
          },
        };
      }

      // Not auto-resolvable: fallback to conflict dialog
      const recordConflictFn =
        options.recordConflictFn ??
        ((uid: string) => recordConflictPull(uid, { now: options.now, storage: options.storage }));
      recordConflictFn(ownerUid);
      return {
        status: "conflict",
        message: "Có xung đột dữ liệu không thể tự động giải quyết. Vui lòng chọn phiên bản cần giữ.",
        drainResult,
        pullResponse,
        mergeReport,
        unresolvedLocalMutationCount: unresolvedLocalMutations.length,
      };
    }

    // No conflicts: check if safe to apply
    if (!mergeReport.safeToApply) {
      if (autoResolveAllConflicts) {
        const nextData = applyPulledWorkspaceToUserData(localData, pullResponse, {
          now: options.now,
          skipEntities: recentlyAppliedMutationSkipEntities,
        });
        const didWrite = (options.writeUserData ?? saveUserData)(nextData);
        if (didWrite) {
          const writeCursorFn =
            options.writeCursor ??
            ((uid: string, cursor: string | null) =>
              recordSuccessfulPull(uid, cursor, { now: options.now, storage: options.storage }));
          writeCursorFn(ownerUid, pullResponse.nextCursor);
          return {
            status: "applied",
            message: "Đã tự động đồng bộ và áp dụng dữ liệu tài khoản an toàn.",
            drainResult,
            pullResponse,
            mergeReport,
            appliedGoalCount: nextData.goals.length,
          };
        }
      }

      const recordConflictFn =
        options.recordConflictFn ??
        ((uid: string) => recordConflictPull(uid, { now: options.now, storage: options.storage }));
      recordConflictFn(ownerUid);
      return {
        status: mergeReport.conflicts.length > 0 ? "conflict" : "unsafe",
        message:
          mergeReport.conflicts.length > 0
            ? "Dữ liệu tài khoản và thiết bị đang khác nhau. Chưa ghi đè bản trên thiết bị."
            : "Có dữ liệu chưa thể gộp tự động. Chưa ghi đè bản trên thiết bị.",
        drainResult,
        pullResponse,
        mergeReport,
      };
    }

    const nextData = applyPulledWorkspaceToUserData(localData, pullResponse, {
      now: options.now,
      skipEntities: recentlyAppliedMutationSkipEntities,
    });
    const didWrite = (options.writeUserData ?? saveUserData)(nextData);
    if (!didWrite) {
      const recordErrorFn =
        options.recordErrorFn ??
        ((uid: string) => recordErrorPull(uid, { now: options.now, storage: options.storage }));
      recordErrorFn(ownerUid);
      return {
        status: "error",
        message: "Không thể lưu bản gộp vào thiết bị này. Dữ liệu cũ trên thiết bị vẫn được giữ.",
        drainResult,
        pullResponse,
        mergeReport,
      };
    }

    // Success: save the nextCursor
    const writeCursorFn =
      options.writeCursor ??
      ((uid: string, cursor: string | null) =>
        recordSuccessfulPull(uid, cursor, { now: options.now, storage: options.storage }));
    writeCursorFn(ownerUid, pullResponse.nextCursor);

    return {
      status: "applied",
      message: "Đã gửi việc đang chờ đồng bộ, nhận dữ liệu tài khoản và gộp an toàn vào thiết bị.",
      drainResult,
      pullResponse,
      mergeReport,
      appliedGoalCount: nextData.goals.length,
    };
  } catch (error) {
    const recordErrorFn =
      options.recordErrorFn ?? ((uid: string) => recordErrorPull(uid, { now: options.now, storage: options.storage }));
    recordErrorFn(ownerUid);
    return {
      status: "error",
      message: "Đồng bộ thủ công gặp lỗi. Dữ liệu trên thiết bị không bị xóa.",
      error,
    };
  }
}

export function useTwelveWeekManualCloudSync(options: UseTwelveWeekManualCloudSyncOptions = {}) {
  const { enabled = true, onApplied, ...runOptions } = options;
  const { user, userProfile, userProfileLoading } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<TwelveWeekManualCloudSyncResult | null>(null);
  const inFlightRef = useRef<Promise<TwelveWeekManualCloudSyncResult> | null>(null);

  const authenticated = Boolean(enabled && user?.uid && userProfile && !userProfileLoading);

  const syncNow = useCallback(async () => {
    if (inFlightRef.current) return inFlightRef.current;

    setLoading(true);
    const request = runTwelveWeekManualCloudSync({
      ...runOptions,
      ownerUid: user?.uid ?? null,
      authenticated,
    });
    inFlightRef.current = request;

    try {
      const result = await request;
      setLastResult(result);
      if (result.status === "applied") {
        onApplied?.(result);
      }
      return result;
    } finally {
      inFlightRef.current = null;
      setLoading(false);
    }
    // biome-ignore lint/correctness/useExhaustiveDependencies: runOptions is a rest-spread; callers pass stable objects and inFlightRef prevents duplicate calls
  }, [authenticated, onApplied, runOptions, user?.uid]);

  return useMemo(
    () => ({
      loading,
      lastResult,
      syncNow,
    }),
    [lastResult, loading, syncNow],
  );
}
