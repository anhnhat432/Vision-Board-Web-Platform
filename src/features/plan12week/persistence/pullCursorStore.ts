/**
 * Auth-scoped pull cursor store for 12-week cloud sync.
 *
 * Stores the last successful pull cursor per authenticated user so that
 * subsequent manual sync calls can request a delta pull instead of a full pull.
 *
 * Anonymous/demo mode does not use cloud cursors.
 * User A's cursor is not visible to user B.
 */

export const PULL_CURSOR_STORAGE_PREFIX = "visionboard_pull_cursor:auth:";

export type PullCursorStatus = "success" | "conflict" | "error" | "full_fallback";

export interface PullCursorState {
  lastSuccessfulPullCursor: string | null;
  lastPullAt: string | null;
  lastPullStatus: PullCursorStatus | null;
}

const EMPTY_STATE: PullCursorState = {
  lastSuccessfulPullCursor: null,
  lastPullAt: null,
  lastPullStatus: null,
};

function getStorageKey(authUid: string): string {
  return `${PULL_CURSOR_STORAGE_PREFIX}${encodeURIComponent(authUid)}`;
}

function getStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Read the pull cursor state for a specific authenticated user.
 * Returns empty state if the user has no stored cursor or if authUid is invalid.
 */
export function readPullCursorState(authUid: string | null | undefined, storage?: Storage | null): PullCursorState {
  if (!isNonEmptyString(authUid)) return EMPTY_STATE;

  const store = storage ?? getStorage();
  if (!store) return EMPTY_STATE;

  try {
    const raw = store.getItem(getStorageKey(authUid));
    if (!raw) return EMPTY_STATE;

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return EMPTY_STATE;

    return {
      lastSuccessfulPullCursor: isNonEmptyString(parsed.lastSuccessfulPullCursor)
        ? parsed.lastSuccessfulPullCursor
        : null,
      lastPullAt: isNonEmptyString(parsed.lastPullAt) ? parsed.lastPullAt : null,
      lastPullStatus:
        typeof parsed.lastPullStatus === "string" &&
        ["success", "conflict", "error", "full_fallback"].includes(parsed.lastPullStatus)
          ? (parsed.lastPullStatus as PullCursorStatus)
          : null,
    };
  } catch {
    return EMPTY_STATE;
  }
}

/**
 * Save the pull cursor state for a specific authenticated user.
 * Does nothing if authUid is invalid.
 */
export function writePullCursorState(
  authUid: string | null | undefined,
  state: Partial<PullCursorState>,
  storage?: Storage | null,
): void {
  if (!isNonEmptyString(authUid)) return;

  const store = storage ?? getStorage();
  if (!store) return;

  try {
    const current = readPullCursorState(authUid, store);
    const next: PullCursorState = {
      lastSuccessfulPullCursor: state.lastSuccessfulPullCursor ?? current.lastSuccessfulPullCursor,
      lastPullAt: state.lastPullAt ?? current.lastPullAt,
      lastPullStatus: state.lastPullStatus ?? current.lastPullStatus,
    };
    store.setItem(getStorageKey(authUid), JSON.stringify(next));
  } catch {
    // best-effort storage write
  }
}

/**
 * Clear the stored pull cursor for a specific authenticated user.
 * Used when the backend reports an invalid cursor, so the next pull is a full pull.
 */
export function clearPullCursor(authUid: string | null | undefined, storage?: Storage | null): void {
  if (!isNonEmptyString(authUid)) return;

  const store = storage ?? getStorage();
  if (!store) return;

  try {
    store.removeItem(getStorageKey(authUid));
  } catch {
    // best-effort
  }
}

/**
 * Record a successful pull: save the nextCursor and timestamp.
 */
export function recordSuccessfulPull(
  authUid: string | null | undefined,
  nextCursor: string | null,
  options?: { now?: string | Date; storage?: Storage | null },
): void {
  writePullCursorState(
    authUid,
    {
      lastSuccessfulPullCursor: nextCursor,
      lastPullAt:
        options?.now instanceof Date
          ? options.now.toISOString()
          : typeof options?.now === "string"
            ? options.now
            : new Date().toISOString(),
      lastPullStatus: "success",
    },
    options?.storage,
  );
}

/**
 * Record a pull that resulted in conflict (cursor NOT updated).
 */
export function recordConflictPull(
  authUid: string | null | undefined,
  options?: { now?: string | Date; storage?: Storage | null },
): void {
  writePullCursorState(
    authUid,
    {
      lastPullAt:
        options?.now instanceof Date
          ? options.now.toISOString()
          : typeof options?.now === "string"
            ? options.now
            : new Date().toISOString(),
      lastPullStatus: "conflict",
    },
    options?.storage,
  );
}

/**
 * Record a pull error (cursor NOT updated).
 */
export function recordErrorPull(
  authUid: string | null | undefined,
  options?: { now?: string | Date; storage?: Storage | null },
): void {
  writePullCursorState(
    authUid,
    {
      lastPullAt:
        options?.now instanceof Date
          ? options.now.toISOString()
          : typeof options?.now === "string"
            ? options.now
            : new Date().toISOString(),
      lastPullStatus: "error",
    },
    options?.storage,
  );
}
