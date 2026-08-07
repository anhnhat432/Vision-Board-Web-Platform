import { createSanitizedLocalUserDataBackup } from "@/app/utils/local-data-backup";
import {
  fingerprintLocalDataImport,
  LOCAL_DATA_FILE_IMPORT_STATE_CHANGED_EVENT_NAME,
  type LocalDataImportCandidate,
  type LocalDataImportSummary,
} from "@/app/utils/local-data-import";
import { getUserData, parseStoredUserData, replaceUserData, resetUserDataCache } from "@/app/utils/storage";
import { readActiveAuthOwnerUid } from "@/app/utils/storage-auth-scope";
import {
  LOCAL_DATA_FILE_IMPORT_PENDING_AUTH_STORAGE_PREFIX,
  LOCAL_DATA_FILE_IMPORT_RECOVERY_STORAGE_PREFIX,
} from "@/app/utils/storage-constants";
import type { UserData } from "@/app/utils/storage-types";
import { getMutationQueueStorageKey } from "./mutationQueue";
import { getPullCursorStorageKey } from "./pullCursorStore";

export interface LocalDataImportPendingMarker {
  version: 1;
  importId: string;
  ownerUid: string;
  recoveryKey: string;
  candidateFingerprint: string;
  createdAt: string;
  summary: LocalDataImportSummary;
}

export interface LocalDataImportRecoverySnapshot {
  version: 1;
  importId: string;
  ownerUid: string | null;
  createdAt: string;
  expiresAt: string;
  previousData: UserData;
  mutationQueueRaw: string | null;
  pullCursorRaw: string | null;
}

export type LocalDataImportApplyResult =
  | { status: "applied"; importId: string; recoveryKey: string; pending: LocalDataImportPendingMarker | null }
  | { status: "owner_mismatch" | "fingerprint_mismatch" | "pending_exists" | "snapshot_failed" | "write_failed" };

export type LocalDataImportRestoreResult =
  | { status: "restored" }
  | { status: "missing" | "expired" | "invalid" | "owner_mismatch" | "write_failed" };

function getPendingKey(ownerUid: string): string {
  return `${LOCAL_DATA_FILE_IMPORT_PENDING_AUTH_STORAGE_PREFIX}${encodeURIComponent(ownerUid)}`;
}

function getRecoveryKey(ownerUid: string | null, importId: string): string {
  const ownerPart = ownerUid ? `auth:${encodeURIComponent(ownerUid)}` : "anonymous";
  return `${LOCAL_DATA_FILE_IMPORT_RECOVERY_STORAGE_PREFIX}${ownerPart}:${importId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isSummary(value: unknown): value is LocalDataImportSummary {
  if (!isRecord(value)) return false;
  return [
    "goalCount",
    "twelveWeekSystemCount",
    "taskCount",
    "dailyCheckInCount",
    "weeklyReviewCount",
    "wheelRecordCount",
    "reflectionCount",
    "visionBoardCount",
  ].every((key) => {
    const field = value[key];
    return typeof field === "number" && Number.isFinite(field) && field >= 0;
  });
}

function parsePendingMarker(raw: string | null): LocalDataImportPendingMarker | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (
      !isRecord(value) ||
      value.version !== 1 ||
      typeof value.importId !== "string" ||
      typeof value.ownerUid !== "string" ||
      typeof value.recoveryKey !== "string" ||
      typeof value.candidateFingerprint !== "string" ||
      typeof value.createdAt !== "string" ||
      !isSummary(value.summary)
    ) {
      return null;
    }
    return value as unknown as LocalDataImportPendingMarker;
  } catch {
    return null;
  }
}

function parseRecoverySnapshot(raw: string | null): LocalDataImportRecoverySnapshot | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (
      !isRecord(value) ||
      value.version !== 1 ||
      typeof value.importId !== "string" ||
      !(typeof value.ownerUid === "string" || value.ownerUid === null) ||
      typeof value.createdAt !== "string" ||
      typeof value.expiresAt !== "string" ||
      !(typeof value.mutationQueueRaw === "string" || value.mutationQueueRaw === null) ||
      !(typeof value.pullCursorRaw === "string" || value.pullCursorRaw === null)
    ) {
      return null;
    }
    const previousData = parseStoredUserData(JSON.stringify(value.previousData));
    if (!previousData) return null;
    return {
      version: 1,
      importId: value.importId,
      ownerUid: value.ownerUid,
      createdAt: value.createdAt,
      expiresAt: value.expiresAt,
      previousData,
      mutationQueueRaw: value.mutationQueueRaw,
      pullCursorRaw: value.pullCursorRaw,
    };
  } catch {
    return null;
  }
}

function restoreStorageItem(key: string | null, raw: string | null): void {
  if (!key) return;
  if (raw === null) localStorage.removeItem(key);
  else localStorage.setItem(key, raw);
}

function dispatchLocalDataImportStateChanged(): void {
  window.dispatchEvent(new Event(LOCAL_DATA_FILE_IMPORT_STATE_CHANGED_EVENT_NAME));
}

export function getPendingLocalDataImport(ownerUid: string | null | undefined): LocalDataImportPendingMarker | null {
  const normalized = ownerUid?.trim() ?? "";
  if (!normalized) return null;
  const marker = parsePendingMarker(localStorage.getItem(getPendingKey(normalized)));
  return marker?.ownerUid === normalized ? marker : null;
}

export function listLocalDataImportRecoverySnapshots(
  ownerUid: string | null,
): Array<LocalDataImportRecoverySnapshot & { key: string }> {
  cleanupExpiredLocalDataImportRecoveries();
  const records: Array<LocalDataImportRecoverySnapshot & { key: string }> = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith(LOCAL_DATA_FILE_IMPORT_RECOVERY_STORAGE_PREFIX)) continue;
    const snapshot = parseRecoverySnapshot(localStorage.getItem(key));
    if (snapshot?.ownerUid === ownerUid) records.push({ ...snapshot, key });
  }
  return records.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function cleanupExpiredLocalDataImportRecoveries(now: Date = new Date()): void {
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith(LOCAL_DATA_FILE_IMPORT_RECOVERY_STORAGE_PREFIX)) continue;
    const snapshot = parseRecoverySnapshot(localStorage.getItem(key));
    if (!snapshot || Date.parse(snapshot.expiresAt) < now.getTime()) localStorage.removeItem(key);
  }
}

export function applyLocalDataImportTransaction(options: {
  candidate: LocalDataImportCandidate;
  ownerUid: string | null;
  pauseCloudSync: boolean;
  now?: Date;
}): LocalDataImportApplyResult {
  cleanupExpiredLocalDataImportRecoveries(options.now);
  if ((readActiveAuthOwnerUid() ?? null) !== options.ownerUid) {
    return { status: "owner_mismatch" };
  }
  const current = getUserData();
  if (fingerprintLocalDataImport(current) !== options.candidate.currentFingerprint) {
    return { status: "fingerprint_mismatch" };
  }
  if (options.ownerUid && getPendingLocalDataImport(options.ownerUid)) {
    return { status: "pending_exists" };
  }

  const importId = `local_file_import_${(options.now ?? new Date()).getTime().toString(36)}_${options.candidate.fingerprint}`;
  const recoveryKey = getRecoveryKey(options.ownerUid, importId);
  const queueKey = options.ownerUid ? getMutationQueueStorageKey(options.ownerUid) : null;
  const cursorKey = options.ownerUid ? getPullCursorStorageKey(options.ownerUid) : null;
  const pendingKey = options.ownerUid ? getPendingKey(options.ownerUid) : null;
  const queueRaw = queueKey ? localStorage.getItem(queueKey) : null;
  const cursorRaw = cursorKey ? localStorage.getItem(cursorKey) : null;
  const pendingRaw = pendingKey ? localStorage.getItem(pendingKey) : null;
  const nowIso = (options.now ?? new Date()).toISOString();
  const snapshot: LocalDataImportRecoverySnapshot = {
    version: 1,
    importId,
    ownerUid: options.ownerUid,
    createdAt: nowIso,
    expiresAt: new Date(Date.parse(nowIso) + 7 * 24 * 60 * 60 * 1000).toISOString(),
    previousData: createSanitizedLocalUserDataBackup(current),
    mutationQueueRaw: queueRaw,
    pullCursorRaw: cursorRaw,
  };

  try {
    localStorage.setItem(recoveryKey, JSON.stringify(snapshot));
  } catch {
    return { status: "snapshot_failed" };
  }

  const pending =
    options.pauseCloudSync && options.ownerUid
      ? {
          version: 1 as const,
          importId,
          ownerUid: options.ownerUid,
          recoveryKey,
          candidateFingerprint: options.candidate.fingerprint,
          createdAt: nowIso,
          summary: options.candidate.importedSummary,
        }
      : null;

  try {
    if (pending && pendingKey) localStorage.setItem(pendingKey, JSON.stringify(pending));
    if (queueKey) localStorage.removeItem(queueKey);
    if (cursorKey) localStorage.removeItem(cursorKey);
    if (!replaceUserData(options.candidate.data)) throw new Error("replace_failed");
    dispatchLocalDataImportStateChanged();
    return { status: "applied", importId, recoveryKey, pending };
  } catch {
    try {
      restoreStorageItem(queueKey, queueRaw);
      restoreStorageItem(cursorKey, cursorRaw);
      restoreStorageItem(pendingKey, pendingRaw);
    } catch {
      // The exact UserData writer already rolled active/scoped data back; keep the result failed.
    } finally {
      try {
        localStorage.removeItem(recoveryKey);
      } catch {
        // Expiry cleanup will remove an orphaned snapshot later.
      }
      resetUserDataCache();
      dispatchLocalDataImportStateChanged();
    }
    return { status: "write_failed" };
  }
}

export function restoreLocalDataImportRecovery(options: {
  recoveryKey: string;
  ownerUid: string | null;
  now?: Date;
}): LocalDataImportRestoreResult {
  if ((readActiveAuthOwnerUid() ?? null) !== options.ownerUid) return { status: "owner_mismatch" };
  const raw = localStorage.getItem(options.recoveryKey);
  if (!raw) return { status: "missing" };
  const snapshot = parseRecoverySnapshot(raw);
  if (!snapshot) return { status: "invalid" };
  if (snapshot.ownerUid !== options.ownerUid) return { status: "owner_mismatch" };
  if (Date.parse(snapshot.expiresAt) < (options.now ?? new Date()).getTime()) {
    localStorage.removeItem(options.recoveryKey);
    return { status: "expired" };
  }

  const queueKey = options.ownerUid ? getMutationQueueStorageKey(options.ownerUid) : null;
  const cursorKey = options.ownerUid ? getPullCursorStorageKey(options.ownerUid) : null;
  const pendingKey = options.ownerUid ? getPendingKey(options.ownerUid) : null;
  const currentData = getUserData();
  const currentQueueRaw = queueKey ? localStorage.getItem(queueKey) : null;
  const currentCursorRaw = cursorKey ? localStorage.getItem(cursorKey) : null;
  const currentPendingRaw = pendingKey ? localStorage.getItem(pendingKey) : null;

  try {
    if (!replaceUserData(snapshot.previousData)) throw new Error("restore_data_failed");
    restoreStorageItem(queueKey, snapshot.mutationQueueRaw);
    restoreStorageItem(cursorKey, snapshot.pullCursorRaw);
    if (pendingKey) localStorage.removeItem(pendingKey);
    localStorage.removeItem(options.recoveryKey);
    dispatchLocalDataImportStateChanged();
    return { status: "restored" };
  } catch {
    try {
      if (!replaceUserData(currentData)) throw new Error("rollback_data_failed");
      restoreStorageItem(queueKey, currentQueueRaw);
      restoreStorageItem(cursorKey, currentCursorRaw);
      restoreStorageItem(pendingKey, currentPendingRaw);
    } catch {
      resetUserDataCache();
    }
    dispatchLocalDataImportStateChanged();
    return { status: "write_failed" };
  }
}

export function resolveLocalDataImportAfterCloud(ownerUid: string, importId: string): boolean {
  if (readActiveAuthOwnerUid() !== ownerUid) return false;
  const marker = getPendingLocalDataImport(ownerUid);
  if (!marker || marker.importId !== importId) return false;

  const cursorKey = getPullCursorStorageKey(ownerUid);
  try {
    localStorage.removeItem(cursorKey);
    localStorage.removeItem(getPendingKey(ownerUid));
    dispatchLocalDataImportStateChanged();
    return true;
  } catch {
    return false;
  }
}
