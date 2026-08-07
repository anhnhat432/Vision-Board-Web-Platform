import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getScopedUserDataStorageKey } from "./storage-auth-scope";
import { AUTH_OWNER_STORAGE_KEY, USER_DATA_STORAGE_KEY } from "./storage-constants";
import { getUserData, replaceUserData, resetUserDataCache, saveUserData } from "./storage";
import type { Goal, UserData } from "./storage-types";

function createGoal(completed: boolean, updatedAt: string): Goal {
  return {
    id: "goal_import_replace",
    category: "career",
    title: "Safe restore",
    description: "Restore exactly",
    deadline: "2026-12-31",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt,
    tasks: [
      {
        id: "task_import_replace",
        title: "Imported task",
        completed,
        updatedAt,
      },
    ],
  };
}

function withGoal(base: UserData, goal: Goal): UserData {
  return { ...base, goals: [goal] };
}

describe("replaceUserData", () => {
  beforeEach(() => {
    localStorage.clear();
    resetUserDataCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("replaces older imported task state instead of merging the newer local task", () => {
    const base = getUserData();
    saveUserData(withGoal(base, createGoal(true, "2026-08-07T10:00:00.000Z")));

    const imported = withGoal(base, createGoal(false, "2026-08-01T10:00:00.000Z"));

    expect(replaceUserData(imported)).toBe(true);
    expect(getUserData().goals[0]?.tasks[0]?.completed).toBe(false);
  });

  it("mirrors the exact serialized data only to the active auth owner", () => {
    const base = getUserData();
    localStorage.setItem(AUTH_OWNER_STORAGE_KEY, "owner_a");
    localStorage.setItem(getScopedUserDataStorageKey("owner_b"), JSON.stringify({ owner: "b" }));

    expect(replaceUserData({ ...base, userId: "current_local_identity" })).toBe(true);

    expect(localStorage.getItem(getScopedUserDataStorageKey("owner_a"))).toBe(
      localStorage.getItem(USER_DATA_STORAGE_KEY),
    );
    expect(localStorage.getItem(getScopedUserDataStorageKey("owner_b"))).toBe(JSON.stringify({ owner: "b" }));
  });

  it("rolls active and scoped storage back when exact replacement cannot finish", () => {
    const base = getUserData();
    localStorage.setItem(AUTH_OWNER_STORAGE_KEY, "owner_a");
    const scopedKey = getScopedUserDataStorageKey("owner_a");
    const activeBefore = localStorage.getItem(USER_DATA_STORAGE_KEY);
    localStorage.setItem(scopedKey, activeBefore ?? "");
    const originalSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key: string, value: string) {
      if (key === scopedKey && value.includes("replacement_identity")) {
        throw new DOMException("quota", "QuotaExceededError");
      }
      return originalSetItem.call(this, key, value);
    });

    expect(replaceUserData({ ...base, userId: "replacement_identity" })).toBe(false);
    expect(localStorage.getItem(USER_DATA_STORAGE_KEY)).toBe(activeBefore);
    expect(localStorage.getItem(scopedKey)).toBe(activeBefore);
  });
});
