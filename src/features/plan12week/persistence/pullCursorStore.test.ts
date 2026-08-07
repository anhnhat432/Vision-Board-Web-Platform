import { beforeEach, describe, expect, it } from "vitest";

import {
  clearPullCursor,
  getPullCursorStorageKey,
  PULL_CURSOR_STORAGE_PREFIX,
  readPullCursorState,
  recordConflictPull,
  recordErrorPull,
  recordSuccessfulPull,
  writePullCursorState,
} from "../persistence/pullCursorStore";

const userA = "user_a_uid";
const userB = "user_b_uid";
const now = "2026-05-01T00:00:00.000Z";

describe("pullCursorStore", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns empty state when no cursor is stored", () => {
    const state = readPullCursorState(userA);
    expect(state.lastSuccessfulPullCursor).toBeNull();
    expect(state.lastPullAt).toBeNull();
    expect(state.lastPullStatus).toBeNull();
  });

  it("saves and reads a successful pull cursor", () => {
    recordSuccessfulPull(userA, "cursor_abc", { now });
    const state = readPullCursorState(userA);
    expect(state.lastSuccessfulPullCursor).toBe("cursor_abc");
    expect(state.lastPullAt).toBe(now);
    expect(state.lastPullStatus).toBe("success");
  });

  it("scopes cursors per authenticated user", () => {
    recordSuccessfulPull(userA, "cursor_A", { now });
    recordSuccessfulPull(userB, "cursor_B", { now });

    const stateA = readPullCursorState(userA);
    const stateB = readPullCursorState(userB);

    expect(stateA.lastSuccessfulPullCursor).toBe("cursor_A");
    expect(stateB.lastSuccessfulPullCursor).toBe("cursor_B");
    expect(stateA.lastSuccessfulPullCursor).not.toBe(stateB.lastSuccessfulPullCursor);
  });

  it("does not store cursor for null or empty authUid", () => {
    recordSuccessfulPull(null, "cursor_anon", { now });
    recordSuccessfulPull("", "cursor_empty", { now });

    expect(readPullCursorState(null).lastSuccessfulPullCursor).toBeNull();
    expect(readPullCursorState("").lastSuccessfulPullCursor).toBeNull();

    // Nothing should be in storage
    expect(localStorage.length).toBe(0);
  });

  it("clears the stored cursor", () => {
    recordSuccessfulPull(userA, "cursor_to_clear", { now });
    expect(readPullCursorState(userA).lastSuccessfulPullCursor).toBe("cursor_to_clear");

    clearPullCursor(userA);
    const state = readPullCursorState(userA);
    expect(state.lastSuccessfulPullCursor).toBeNull();
    expect(state.lastPullAt).toBeNull();
  });

  it("clears cursor for one user without affecting another", () => {
    recordSuccessfulPull(userA, "cursor_A", { now });
    recordSuccessfulPull(userB, "cursor_B", { now });

    clearPullCursor(userA);

    expect(readPullCursorState(userA).lastSuccessfulPullCursor).toBeNull();
    expect(readPullCursorState(userB).lastSuccessfulPullCursor).toBe("cursor_B");
  });

  it("records conflict without updating the cursor", () => {
    recordSuccessfulPull(userA, "cursor_before", { now: "2026-05-01T00:00:00.000Z" });
    recordConflictPull(userA, { now: "2026-05-01T01:00:00.000Z" });

    const state = readPullCursorState(userA);
    expect(state.lastSuccessfulPullCursor).toBe("cursor_before");
    expect(state.lastPullAt).toBe("2026-05-01T01:00:00.000Z");
    expect(state.lastPullStatus).toBe("conflict");
  });

  it("records error without updating the cursor", () => {
    recordSuccessfulPull(userA, "cursor_before", { now: "2026-05-01T00:00:00.000Z" });
    recordErrorPull(userA, { now: "2026-05-01T02:00:00.000Z" });

    const state = readPullCursorState(userA);
    expect(state.lastSuccessfulPullCursor).toBe("cursor_before");
    expect(state.lastPullAt).toBe("2026-05-01T02:00:00.000Z");
    expect(state.lastPullStatus).toBe("error");
  });

  it("uses the correct storage key prefix with encoded UID", () => {
    recordSuccessfulPull(userA, "cursor_1", { now });
    const expectedKey = `${PULL_CURSOR_STORAGE_PREFIX}${encodeURIComponent(userA)}`;
    expect(localStorage.getItem(expectedKey)).not.toBeNull();
  });

  it("exports the encoded auth-scoped storage key", () => {
    expect(getPullCursorStorageKey("user/a")).toBe(
      `${PULL_CURSOR_STORAGE_PREFIX}${encodeURIComponent("user/a")}`,
    );
  });

  it("handles corrupt JSON gracefully", () => {
    const key = `${PULL_CURSOR_STORAGE_PREFIX}${encodeURIComponent(userA)}`;
    localStorage.setItem(key, "{corrupt json");

    const state = readPullCursorState(userA);
    expect(state.lastSuccessfulPullCursor).toBeNull();
    expect(state.lastPullAt).toBeNull();
    expect(state.lastPullStatus).toBeNull();
  });

  it("handles null cursor value (full pull completed with no nextCursor)", () => {
    recordSuccessfulPull(userA, null, { now });
    const state = readPullCursorState(userA);
    expect(state.lastSuccessfulPullCursor).toBeNull();
    expect(state.lastPullStatus).toBe("success");
  });

  it("overwrites previous cursor on second successful pull", () => {
    recordSuccessfulPull(userA, "cursor_v1", { now: "2026-05-01T00:00:00.000Z" });
    recordSuccessfulPull(userA, "cursor_v2", { now: "2026-05-01T01:00:00.000Z" });

    const state = readPullCursorState(userA);
    expect(state.lastSuccessfulPullCursor).toBe("cursor_v2");
    expect(state.lastPullAt).toBe("2026-05-01T01:00:00.000Z");
  });

  it("accepts explicit storage parameter", () => {
    const customStorage = localStorage;
    writePullCursorState(
      userA,
      {
        lastSuccessfulPullCursor: "cursor_custom",
        lastPullAt: now,
        lastPullStatus: "success",
      },
      customStorage,
    );

    const state = readPullCursorState(userA, customStorage);
    expect(state.lastSuccessfulPullCursor).toBe("cursor_custom");
  });
});
