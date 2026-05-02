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
    return "Trình duyệt đang offline. Đã dừng pull để giữ dữ liệu local an toàn.";
  }

  if (result.status === "skipped") {
    return "Mutation queue chưa đủ điều kiện gửi. Đã dừng pull để giữ dữ liệu local an toàn.";
  }

  if (result.status === "partial") {
    return `Queue chỉ sync được ${result.succeededCount}/${result.attemptedCount} thay đổi. Đã dừng pull để tránh ghi đè dữ liệu local.`;
  }

  return "Chưa gửi được mutation queue. Đã dừng pull để giữ dữ liệu local an toàn.";
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
    return createSkippedResult("demo_mode", "Bản demo lưu trên trình duyệt này, không cần cloud sync.");
  }
  if (!mutationFeatureEnabled) {
    return createSkippedResult("mutation_feature_disabled", "Mutation sync đang tắt bằng feature flag.");
  }
  if (!pullFeatureEnabled) {
    return createSkippedResult("pull_feature_disabled", "Pull sync đang tắt bằng feature flag.");
  }
  if (!authenticated || !ownerUid) {
    return createSkippedResult("unauthenticated", "Cần đăng nhập để chạy manual cloud sync.");
  }
  if (!apiConfigured) {
    return createSkippedResult("api_not_configured", "Chưa cấu hình backend API cho cloud sync.");
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

    // First pull attempt: use stored cursor if available
    let pullResponse = await pullWorkspace(storedCursor ? { cursor: storedCursor } : undefined);

    // If backend reports invalid cursor, clear it and retry once with full pull
    const isInvalidCursor =
      pullResponse.cursorStatus === "invalid" ||
      pullResponse.warnings?.some((w) => w.code === "cursor_invalid");
    if (isInvalidCursor && storedCursor) {
      const clearCursorFn = options.clearCursorFn ?? ((uid: string) => clearPullCursor(uid, options.storage));
      clearCursorFn(ownerUid);
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
          "Vẫn còn thay đổi local chưa được backend xác nhận. Cloud pull đã được kiểm tra nhưng chưa áp dụng vào local.",
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
            ? "Cloud và local đang có conflict. Chưa ghi đè dữ liệu local."
            : "Cloud pull có dữ liệu chưa thể merge tự động. Chưa ghi đè dữ liệu local.",
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
        message: "Không thể lưu bản merge vào localStorage. Dữ liệu local cũ vẫn được giữ.",
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
      message: "Đã gửi queue, pull cloud workspace và áp dụng merge an toàn vào local.",
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
      message: "Manual cloud sync gặp lỗi. Dữ liệu local không bị xóa.",
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
