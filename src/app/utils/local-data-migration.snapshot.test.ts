import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanupExpiredMigrationBackups,
  getAnonymousLocalDataMigrationCandidate,
  importAnonymousLocalDataToAccountScope,
  restoreMigrationBackupSnapshot,
} from "./local-data-migration";
import { getScopedUserDataStorageKey } from "./storage-auth-scope";
import {
  AUTH_OWNER_STORAGE_KEY,
  CURRENT_STORAGE_VERSION,
  DEFAULT_APP_PREFERENCES,
  MOTIVATIONAL_QUOTES,
  STORAGE_KEY,
} from "./storage-constants";
import { createEmptyUserData } from "./storage-demo-data";
import type { Goal, UserData } from "./storage-types";

function createFreshUserData(): UserData {
  return createEmptyUserData({
    currentStorageVersion: CURRENT_STORAGE_VERSION,
    defaultAppPreferences: DEFAULT_APP_PREFERENCES,
    motivationalQuotes: MOTIVATIONAL_QUOTES,
  });
}

function createRealGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: "goal_snapshot_1",
    category: "Career",
    title: "Giữ dữ liệu cũ an toàn",
    description: "",
    deadline: "2026-12-31",
    tasks: [],
    createdAt: "2026-05-15T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("migration backup snapshots", () => {
  it("keeps the snapshot when account-scope import hits quota on the second write", () => {
    const anonymousData = createFreshUserData();
    anonymousData.goals.push(createRealGoal());
    const anonymousRaw = JSON.stringify(anonymousData);
    const freshAccountRaw = JSON.stringify(createFreshUserData());
    const scopedKey = getScopedUserDataStorageKey("auth_user_1");

    localStorage.setItem("visionboard_user_data:anonymous", anonymousRaw);
    localStorage.setItem(AUTH_OWNER_STORAGE_KEY, "auth_user_1");
    localStorage.setItem(STORAGE_KEY, freshAccountRaw);
    localStorage.setItem(scopedKey, freshAccountRaw);

    const candidate = getAnonymousLocalDataMigrationCandidate();
    if (!candidate) throw new Error("Expected migration candidate");

    const originalSetItem = Storage.prototype.setItem;
    let importWriteCount = 0;
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key.startsWith("migration_backup_") || key.startsWith("visionboard_local_data_import_backup:")) {
        importWriteCount += 1;
      }
      if (importWriteCount === 2 && key.startsWith("visionboard_local_data_import_backup:")) {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      }
      return originalSetItem.call(this, key, value);
    });

    try {
      const result = importAnonymousLocalDataToAccountScope("auth_user_1", candidate.fingerprint);

      expect(result.status).toBe("write_failed");
      expect(result.snapshotKey).toMatch(/^migration_backup_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);
      expect(result.snapshotKey ? localStorage.getItem(result.snapshotKey) : null).toBe(anonymousRaw);
      expect(localStorage.getItem("visionboard_user_data:anonymous")).toBe(anonymousRaw);
    } finally {
      setItemSpy.mockRestore();
    }
  });

  it("restores user data from a snapshot", () => {
    const snapshotData = createFreshUserData();
    snapshotData.goals.push(createRealGoal({ title: "Dữ liệu đã khôi phục" }));
    const snapshotRaw = JSON.stringify(snapshotData);
    const snapshotKey = "migration_backup_2026-05-15T10-30-00";
    const currentRaw = JSON.stringify(createFreshUserData());

    localStorage.setItem(snapshotKey, snapshotRaw);
    localStorage.setItem(STORAGE_KEY, currentRaw);
    localStorage.setItem(AUTH_OWNER_STORAGE_KEY, "auth_user_1");

    expect(restoreMigrationBackupSnapshot(snapshotKey)).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(snapshotRaw);
    expect(localStorage.getItem(getScopedUserDataStorageKey("auth_user_1"))).toBe(snapshotRaw);
    expect(localStorage.getItem(snapshotKey)).toBeNull();
  });

  it("removes snapshots older than seven days", () => {
    const data = createFreshUserData();
    const raw = JSON.stringify(data);
    const expiredKey = "migration_backup_2026-05-01T10-30-00";
    const freshKey = "migration_backup_2026-05-12T10-30-00";

    localStorage.setItem(expiredKey, raw);
    localStorage.setItem(freshKey, raw);

    cleanupExpiredMigrationBackups(new Date("2026-05-15T10:30:01.000Z").getTime());

    expect(localStorage.getItem(expiredKey)).toBeNull();
    expect(localStorage.getItem(freshKey)).toBe(raw);
  });
});
