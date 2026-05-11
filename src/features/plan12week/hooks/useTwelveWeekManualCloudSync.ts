import { useCallback, useMemo, useRef, useState } from "react";

import { getUserData, saveUserData } from "@/app/utils/storage";
import {
  isRealMode,
  shouldEnable12WeekMutationSync,
  shouldEnable12WeekPullSync,
} from "@/app/utils/app-mode";
import { isApiBaseUrlConfigured } from "@/lib/api/apiClient";
import { useAuthContext } from "@/lib/auth/AuthContext";
import {
  type DataMutationItem,
  type DataMutationStatus,
  readMutationQueueStore,
} from "../persistence/mutationQueue";
import { applyPulledWorkspaceToUserData } from "../persistence/pulledWorkspaceApply";
import {
  createPulledWorkspaceMergeReport,
  type PulledWorkspaceMergeReport,
} from "../persistence/pulledWorkspaceMergeReport";
import {
  sendPending12WeekMutations,
  type MutationQueueSyncResult,
  type SendPending12WeekMutationsOptions,
} from "../persistence/mutationQueueSender";
import {
  pullTwelveWeekWorkspace,
  type TwelveWeekPullOptions,
  type TwelveWeekPullResponse,
} from "@/services/syncService";
import type { UserData } from "@/app/utils/storage-types";
import {
  clearPullCursor,
  readPullCursorState,
  recordConflictPull,
  recordErrorPull,
  recordSuccessfulPull,
} from "../persistence/pullCursorStore";

export type TwelveWeekManualCloudSyncSkipReason =
  | "demo_mode"
  | "unauthenticated"
  | "api_not_configured"
  | "offline"
  | "mutation_feature_disabled"
  | "pull_feature_disabled";

export type TwelveWeekManualCloudSyncStatus =
  | "skipped"
  | "drain_failed"
  | "unsafe"
  | "conflict"
  | "applied"
  | "error";

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
  drainMutations?: (
    options: SendPending12WeekMutationsOptions,
  ) => Promise<MutationQueueSyncResult>;
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

function getBlockingLocalMutations(ownerUid: string, options: Pick<RunTwelveWeekManualCloudSyncOptions, "storage" | "now">): DataMutationItem[] {
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
    return "Hàng chờ thay đổi chưa đủ điều kiện gửi. Đã dừng nhận dữ liệu để giữ bản trên thiết bị an toàn.";
  }

  if (result.status === "partial") {
    return `Queue chỉ sync được ${result.succeededCount}/${result.attemptedCount} thay đổi. Đã dừng pull để tránh ghi đè dữ liệu local.`;
  }

  return "Chưa gửi được hàng chờ thay đổi. Đã dừng nhận dữ liệu để giữ bản trên thiết bị an toàn.";
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

export async function runTwelveWeekManualCloudSync(
  options: RunTwelveWeekManualCloudSyncOptions = {},
): Promise<TwelveWeekManualCloudSyncResult> {
  const ownerUid = normalizeOwnerUid(options.ownerUid);
  const authenticated = options.authenticated ?? Boolean(ownerUid);
  const realMode = options.realMode ?? isRealMode();
  const mutationFeatureEnabled = options.mutationFeatureEnabled ?? shouldEnable12WeekMutationSync();
  const pullFeatureEnabled = options.pullFeatureEnabled ?? shouldEnable12WeekPullSync();
  const apiConfigured = options.apiConfigured ?? isApiBaseUrlConfigured();

  if (!realMode) {
    return createSkippedResult("demo_mode", "Bản dùng thử đang lưu trên trình duyệt này, chưa cần đồng bộ tài khoản.");
  }
  if (!mutationFeatureEnabled) {
    return createSkippedResult("mutation_feature_disabled", "Mutation sync đang tắt bằng feature flag.");
  }
  if (!pullFeatureEnabled) {
    return createSkippedResult("pull_feature_disabled", "Pull sync đang tắt bằng feature flag.");
  }
  if (!authenticated || !ownerUid) {
    return createSkippedResult("unauthenticated", "Cần đăng nhập để đồng bộ dữ liệu tài khoản.");
  }
  if (!apiConfigured) {
    return createSkippedResult("api_not_configured", "Chưa cấu hình kết nối tài khoản cho đồng bộ.");
  }

  if (options.online === false) {
    return createSkippedResult("offline", "Đang mất mạng. Hàng chờ thay đổi sẽ được gửi khi kết nối lại.");
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
    const readCursorFn = options.readCursor ?? ((uid: string) => readPullCursorState(uid, options.storage).lastSuccessfulPullCursor);
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
    const mergeReport = createPulledWorkspaceMergeReport(localData, pullResponse, {
      pendingMutations: unresolvedLocalMutations,
    });

    if (unresolvedLocalMutations.length > 0) {
      const recordConflictFn = options.recordConflictFn ?? ((uid: string) => recordConflictPull(uid, { now: options.now, storage: options.storage }));
      recordConflictFn(ownerUid);
      return {
        status: "conflict",
        message:
          "Vẫn còn thay đổi trên thiết bị chưa được xác nhận. Dữ liệu tài khoản đã được kiểm tra nhưng chưa áp dụng.",
        drainResult,
        pullResponse,
        mergeReport,
        unresolvedLocalMutationCount: unresolvedLocalMutations.length,
      };
    }

    if (!mergeReport.safeToApply) {
      const recordConflictFn = options.recordConflictFn ?? ((uid: string) => recordConflictPull(uid, { now: options.now, storage: options.storage }));
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

    const nextData = applyPulledWorkspaceToUserData(localData, pullResponse, { now: options.now });
    const didWrite = (options.writeUserData ?? saveUserData)(nextData);
    if (!didWrite) {
      const recordErrorFn = options.recordErrorFn ?? ((uid: string) => recordErrorPull(uid, { now: options.now, storage: options.storage }));
      recordErrorFn(ownerUid);
      return {
        status: "error",
        message: "Không thể lưu bản gộp vào trình duyệt. Dữ liệu cũ trên thiết bị vẫn được giữ.",
        drainResult,
        pullResponse,
        mergeReport,
      };
    }

    // Success: save the nextCursor
    const writeCursorFn = options.writeCursor ?? ((uid: string, cursor: string | null) => recordSuccessfulPull(uid, cursor, { now: options.now, storage: options.storage }));
    writeCursorFn(ownerUid, pullResponse.nextCursor);

    return {
      status: "applied",
      message: "Đã gửi hàng chờ, nhận dữ liệu tài khoản và gộp an toàn vào thiết bị.",
      drainResult,
      pullResponse,
      mergeReport,
      appliedGoalCount: nextData.goals.length,
    };
  } catch (error) {
    const recordErrorFn = options.recordErrorFn ?? ((uid: string) => recordErrorPull(uid, { now: options.now, storage: options.storage }));
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
