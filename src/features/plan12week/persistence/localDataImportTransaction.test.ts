import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fingerprintLocalDataImport, summarizeLocalDataImport } from "@/app/utils/local-data-import";
import * as storageModule from "@/app/utils/storage";
import { getUserData, resetUserDataCache, saveUserData } from "@/app/utils/storage";
import {
  AUTH_OWNER_STORAGE_KEY,
  LOCAL_DATA_FILE_IMPORT_PENDING_AUTH_STORAGE_PREFIX,
} from "@/app/utils/storage-constants";
import type { Goal, UserData } from "@/app/utils/storage-types";
import {
  applyLocalDataImportTransaction,
  cleanupExpiredLocalDataImportRecoveries,
  getPendingLocalDataImport,
  resolveLocalDataImportAfterCloud,
  restoreLocalDataImportRecovery,
} from "./localDataImportTransaction";
import {
  createEmptyMutationQueueStore,
  getMutationQueueStorageKey,
  readMutationQueueStore,
  writeMutationQueueStore,
} from "./mutationQueue";
import { getPullCursorStorageKey, readPullCursorState, recordSuccessfulPull } from "./pullCursorStore";

function createGoal(id: string): Goal {
  return {
    id,
    category: "career",
    title: id,
    description: "Import transaction fixture",
    deadline: "2026-12-31",
    createdAt: "2026-08-01T00:00:00.000Z",
    tasks: [],
  };
}

function createCandidate(currentUserId: string, importedGoalId: string) {
  const currentData = { ...getUserData(), userId: currentUserId };
  saveUserData(currentData);
  const importedData: UserData = {
    ...currentData,
    goals: [createGoal(importedGoalId)],
    eventLog: [],
    syncOutbox: [],
    subscription: null,
    entitlements: [],
    experimentAssignments: [],
    emailReminderSchedule: [],
    pushSubscription: null,
    privacyConsents: [],
    isHydratedFromDemo: undefined,
  };
  return {
    fileName: "restore.json",
    data: importedData,
    fingerprint: fingerprintLocalDataImport(importedData),
    currentFingerprint: fingerprintLocalDataImport(currentData),
    currentSummary: summarizeLocalDataImport(currentData),
    importedSummary: summarizeLocalDataImport(importedData),
  };
}

function seedOwnerSyncState(ownerUid: string, mutationId: string, cursor: string): void {
  const empty = createEmptyMutationQueueStore({ ownerUid, deviceId: `device_${ownerUid}` });
  writeMutationQueueStore({
    ...empty,
    items: [
      {
        id: mutationId,
        idempotencyKey: `idempotency_${mutationId}`,
        collapseKey: `task_completed_changed:goal_${ownerUid}:task_${ownerUid}`,
        ownerUid,
        goalId: `goal_${ownerUid}`,
        planId: `plan_${ownerUid}`,
        kind: "task_completed_changed",
        payload: {
          taskId: `task_${ownerUid}`,
          clientTaskId: `task_${ownerUid}`,
          clientPlanId: `plan_${ownerUid}`,
          clientWeekId: `week_${ownerUid}_1`,
          weekNumber: 1,
          completed: true,
          completedAt: "2026-08-07T09:00:00.000Z",
          scheduledDate: "2026-08-07",
          title: "Pending task",
        },
        status: "pending",
        attemptCount: 0,
        maxAttempts: 5,
        createdAt: "2026-08-07T09:00:00.000Z",
        updatedAt: "2026-08-07T09:00:00.000Z",
      },
    ],
  });
  recordSuccessfulPull(ownerUid, cursor, { now: "2026-08-07T09:00:00.000Z" });
}

function captureExpectedState(ownerUid: string) {
  return {
    data: JSON.stringify(getUserData()),
    queueRaw: localStorage.getItem(getMutationQueueStorageKey(ownerUid)),
    cursorRaw: localStorage.getItem(getPullCursorStorageKey(ownerUid)),
    pendingRaw: localStorage.getItem(
      `${LOCAL_DATA_FILE_IMPORT_PENDING_AUTH_STORAGE_PREFIX}${encodeURIComponent(ownerUid)}`,
    ),
  };
}

describe("local data file import transaction", () => {
  beforeEach(() => {
    localStorage.clear();
    resetUserDataCache();
    localStorage.setItem(AUTH_OWNER_STORAGE_KEY, "owner_a");
    saveUserData({ ...getUserData(), userId: "current_identity", goals: [createGoal("current_goal")] });
    seedOwnerSyncState("owner_a", "mutation_a", "cursor_before");
    seedOwnerSyncState("owner_b", "mutation_b", "cursor_b");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates recovery and pending state before exact replacement", () => {
    const candidate = createCandidate("current_identity", "imported_goal");
    const result = applyLocalDataImportTransaction({
      candidate,
      ownerUid: "owner_a",
      pauseCloudSync: true,
      now: new Date("2026-08-07T10:00:00.000Z"),
    });

    expect(result.status).toBe("applied");
    expect(getPendingLocalDataImport("owner_a")).toMatchObject({
      ownerUid: "owner_a",
      candidateFingerprint: candidate.fingerprint,
    });
    expect(readMutationQueueStore("owner_a").items).toEqual([]);
    expect(readPullCursorState("owner_a").lastSuccessfulPullCursor).toBeNull();
    expect(getUserData().goals[0]?.id).toBe("imported_goal");
    expect(readMutationQueueStore("owner_b").items).toHaveLength(1);
  });

  it("blocks stale previews and nested pending transactions", () => {
    const candidate = createCandidate("current_identity", "imported_goal");
    saveUserData({ ...getUserData(), goals: [createGoal("changed_after_preview")] });
    expect(
      applyLocalDataImportTransaction({ candidate, ownerUid: "owner_a", pauseCloudSync: true }),
    ).toMatchObject({ status: "fingerprint_mismatch" });

    const freshCandidate = createCandidate("current_identity", "first_import_goal");
    expect(
      applyLocalDataImportTransaction({ candidate: freshCandidate, ownerUid: "owner_a", pauseCloudSync: true }),
    ).toMatchObject({ status: "applied" });
    const nestedCandidate = createCandidate("current_identity", "second_import_goal");
    expect(
      applyLocalDataImportTransaction({ candidate: nestedCandidate, ownerUid: "owner_a", pauseCloudSync: true }),
    ).toMatchObject({ status: "pending_exists" });
  });

  it("rejects an owner that is not the active auth scope", () => {
    const candidate = createCandidate("current_identity", "imported_goal");
    expect(
      applyLocalDataImportTransaction({ candidate, ownerUid: "owner_b", pauseCloudSync: true }),
    ).toMatchObject({ status: "owner_mismatch" });
    expect(getPendingLocalDataImport("owner_b")).toBeNull();
  });

  it("restores all touched state when replacement fails", () => {
    const candidate = createCandidate("current_identity", "imported_goal");
    const before = captureExpectedState("owner_a");
    vi.spyOn(storageModule, "replaceUserData").mockReturnValue(false);

    const result = applyLocalDataImportTransaction({
      candidate,
      ownerUid: "owner_a",
      pauseCloudSync: true,
    });

    expect(result.status).toBe("write_failed");
    expect(captureExpectedState("owner_a")).toEqual(before);
  });

  it("leaves every current value unchanged when the recovery snapshot cannot be written", () => {
    const candidate = createCandidate("current_identity", "imported_goal");
    const before = captureExpectedState("owner_a");
    const originalSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key: string, value: string) {
      if (key.startsWith("visionboard_local_file_import_recovery:")) {
        throw new DOMException("quota", "QuotaExceededError");
      }
      return originalSetItem.call(this, key, value);
    });

    expect(
      applyLocalDataImportTransaction({ candidate, ownerUid: "owner_a", pauseCloudSync: true }),
    ).toMatchObject({ status: "snapshot_failed" });
    expect(captureExpectedState("owner_a")).toEqual(before);
  });

  it("restores the matching owner's data queue and cursor and rejects another owner", () => {
    const applied = applyLocalDataImportTransaction({
      candidate: createCandidate("current_identity", "imported_goal"),
      ownerUid: "owner_a",
      pauseCloudSync: true,
    });
    if (applied.status !== "applied") throw new Error("import not applied");

    expect(
      restoreLocalDataImportRecovery({ recoveryKey: applied.recoveryKey, ownerUid: "owner_b" }),
    ).toMatchObject({ status: "owner_mismatch" });
    expect(
      restoreLocalDataImportRecovery({ recoveryKey: applied.recoveryKey, ownerUid: "owner_a" }),
    ).toMatchObject({ status: "restored" });
    expect(getPendingLocalDataImport("owner_a")).toBeNull();
    expect(readMutationQueueStore("owner_a").items).toHaveLength(1);
    expect(readPullCursorState("owner_a").lastSuccessfulPullCursor).toBe("cursor_before");
  });

  it("rolls the imported state back into place when recovery cannot restore the saved queue", () => {
    const applied = applyLocalDataImportTransaction({
      candidate: createCandidate("current_identity", "imported_goal"),
      ownerUid: "owner_a",
      pauseCloudSync: true,
    });
    if (applied.status !== "applied") throw new Error("import not applied");
    const originalSetItem = Storage.prototype.setItem;
    const queueKey = getMutationQueueStorageKey("owner_a");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key: string, value: string) {
      if (key === queueKey) throw new DOMException("quota", "QuotaExceededError");
      return originalSetItem.call(this, key, value);
    });

    expect(
      restoreLocalDataImportRecovery({ recoveryKey: applied.recoveryKey, ownerUid: "owner_a" }),
    ).toEqual({ status: "write_failed" });
    expect(getUserData().goals[0]?.id).toBe("imported_goal");
    expect(getPendingLocalDataImport("owner_a")?.importId).toBe(applied.importId);
  });

  it("keeps recovery but clears pending only after applied or duplicate cloud resolution", () => {
    const applied = applyLocalDataImportTransaction({
      candidate: createCandidate("current_identity", "imported_goal"),
      ownerUid: "owner_a",
      pauseCloudSync: true,
    });
    if (applied.status !== "applied") throw new Error("import not applied");
    expect(resolveLocalDataImportAfterCloud("owner_a", "wrong_import_id")).toBe(false);
    expect(resolveLocalDataImportAfterCloud("owner_a", applied.importId)).toBe(true);
    expect(getPendingLocalDataImport("owner_a")).toBeNull();
    expect(localStorage.getItem(applied.recoveryKey)).not.toBeNull();
  });

  it("expires recovery snapshots after seven days", () => {
    const snapshot = applyLocalDataImportTransaction({
      candidate: createCandidate("current_identity", "imported_goal"),
      ownerUid: "owner_a",
      pauseCloudSync: true,
      now: new Date("2026-08-01T00:00:00.000Z"),
    });
    if (snapshot.status !== "applied") throw new Error("import not applied");
    cleanupExpiredLocalDataImportRecoveries(new Date("2026-08-08T00:00:00.001Z"));
    expect(localStorage.getItem(snapshot.recoveryKey)).toBeNull();
  });

  it("rejects missing and corrupt recovery snapshots without modifying active data", () => {
    const before = JSON.stringify(getUserData());
    expect(
      restoreLocalDataImportRecovery({ recoveryKey: "missing_recovery", ownerUid: "owner_a" }),
    ).toEqual({ status: "missing" });
    localStorage.setItem("visionboard_local_file_import_recovery:auth:owner_a:corrupt", "{bad");
    expect(
      restoreLocalDataImportRecovery({
        recoveryKey: "visionboard_local_file_import_recovery:auth:owner_a:corrupt",
        ownerUid: "owner_a",
      }),
    ).toEqual({ status: "invalid" });
    expect(JSON.stringify(getUserData())).toBe(before);
  });
});
