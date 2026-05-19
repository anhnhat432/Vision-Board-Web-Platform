// Sync Queue Store for 12-Week Execution Sync
// Persistent queue with exponential backoff retry

// ============== Storage Helpers ==============

function getBrowserStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function safeGetItem(key: string): string | null {
  const storage = getBrowserStorage();
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: unknown): boolean {
  const storage = getBrowserStorage();
  if (!storage) return false;
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

// ============== Types ==============

export type SyncStatus = "pending" | "in_flight" | "retry_scheduled" | "failed_terminal" | "succeeded";

export type SyncType = "task_completed" | "daily_checkin" | "weekly_review" | "plan_snapshot" | "metric_upsert";

export interface SyncError {
  code: string;
  message: string;
  retryable: boolean;
  lastSeenAt: string;
}

export interface SyncQueueItem {
  id: string;
  collapseKey: string;
  status: SyncStatus;
  goalId: string;
  syncType: SyncType;
  entityId?: string;
  entityType?: "task" | "checkin" | "review" | "plan";
  payload: unknown;
  createdAt: string;
  updatedAt: string;
  nextRetryAt?: string;
  attemptCount: number;
  maxAttempts: number;
  error?: SyncError;
}

export interface SyncQueueStore {
  version: number;
  goalId: string;
  updatedAt: string;
  items: SyncQueueItem[];
  lastDrainStartedAt?: string;
  lastDrainFinishedAt?: string;
}

export interface SyncQueueStoreSummary {
  totalCount: number;
  pendingCount: number;
  inFlightCount: number;
  failedOrRetryableCount: number;
  succeededCount: number;
  lastDrainStartedAt: string | null;
  lastDrainFinishedAt: string | null;
}

// ============== Constants ==============

export const SYNC_QUEUE_VERSION = 1;
export const SYNC_QUEUE_MAX_SIZE = 1000;
export const SYNC_QUEUE_RETENTION_DAYS = 7;
export const SYNC_QUEUE_DEFAULT_MAX_ATTEMPTS = 5;
export const SYNC_QUEUE_RETRY_DELAYS_MS = [2000, 5000, 10000, 30000, 60000]; // 2s, 5s, 10s, 30s, 60s

function getStorageKey(goalId: string): string {
  return `twelve_week_sync_queue:${goalId}`;
}

// ============== Storage Functions ==============

export function readSyncQueueStore(goalId: string): SyncQueueStore {
  const key = getStorageKey(goalId);
  const raw = safeGetItem(key);

  if (!raw) {
    return {
      version: SYNC_QUEUE_VERSION,
      goalId,
      updatedAt: new Date().toISOString(),
      items: [],
    };
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null || !Array.isArray((parsed as Record<string, unknown>).items)) {
      return {
        version: SYNC_QUEUE_VERSION,
        goalId,
        updatedAt: new Date().toISOString(),
        items: [],
      };
    }
    return {
      ...parsed,
      items: (parsed as SyncQueueStore).items || [],
    } as SyncQueueStore;
  } catch {
    return {
      version: SYNC_QUEUE_VERSION,
      goalId,
      updatedAt: new Date().toISOString(),
      items: [],
    };
  }
}

export function writeSyncQueueStore(store: SyncQueueStore): boolean {
  const key = getStorageKey(store.goalId);

  // Auto-cleanup on write
  const cleanedStore = cleanupOldSyncs(store, getRetentionCutoffDate());

  try {
    return safeSetItem(key, cleanedStore);
  } catch (error) {
    console.error("Failed to write sync queue store:", error);
    return false;
  }
}

// ============== Queue Operations ==============

export function generateSyncItemId(): string {
  return `sync_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getCollapseKey(
  goalId: string,
  syncType: SyncType,
  entityId?: string,
  _entityType?: string,
  payload?: unknown,
): string {
  switch (syncType) {
    case "task_completed":
      return `task:${goalId}:${entityId ?? "unknown"}`;
    case "daily_checkin": {
      const date = (payload as { date?: string })?.date ?? "";
      return `checkin:${goalId}:${date}`;
    }
    case "weekly_review": {
      const weekNumber = (payload as { weekNumber?: number })?.weekNumber ?? 0;
      return `review:${goalId}:${weekNumber}`;
    }
    case "plan_snapshot":
      return `plan:${goalId}`;
    case "metric_upsert": {
      const metricPayload = payload as { weekNumber?: number; metricName?: string } | null;
      return `metric:${goalId}:${metricPayload?.weekNumber ?? 0}:${metricPayload?.metricName ?? ""}`;
    }
    default:
      return `${syncType}:${goalId}:${Date.now()}`;
  }
}

export function enqueueSync(
  store: SyncQueueStore,
  input: {
    goalId: string;
    syncType: SyncType;
    payload: unknown;
    entityId?: string;
    entityType?: "task" | "checkin" | "review" | "plan";
    maxAttempts?: number;
  },
): { store: SyncQueueStore; item: SyncQueueItem } {
  const now = new Date().toISOString();
  const collapseKey = getCollapseKey(input.goalId, input.syncType, input.entityId, input.entityType, input.payload);

  // Check for existing pending or in_flight items with same collapseKey
  const existingIndex = store.items.findIndex(
    (item) => item.collapseKey === collapseKey && (item.status === "pending" || item.status === "in_flight"),
  );

  let newStore = { ...store };
  let item: SyncQueueItem;

  if (existingIndex >= 0) {
    // Update existing item (latest wins)
    const existing = store.items[existingIndex];
    item = {
      ...existing,
      payload: input.payload,
      updatedAt: now,
    };
    newStore.items = [...store.items];
    newStore.items[existingIndex] = item;
  } else {
    // Create new item
    item = {
      id: generateSyncItemId(),
      collapseKey,
      status: "pending",
      goalId: input.goalId,
      syncType: input.syncType,
      entityId: input.entityId,
      entityType: input.entityType,
      payload: input.payload,
      createdAt: now,
      updatedAt: now,
      attemptCount: 0,
      maxAttempts: input.maxAttempts ?? SYNC_QUEUE_DEFAULT_MAX_ATTEMPTS,
    };
    newStore = {
      ...store,
      items: [...store.items, item],
    };
  }

  // Enforce size limit
  newStore = enforceSizeLimit(newStore);

  newStore.updatedAt = now;
  return { store: newStore, item };
}

export function listPendingSyncs(store: SyncQueueStore): SyncQueueItem[] {
  return store.items.filter((item) => item.status === "pending" || item.status === "retry_scheduled");
}

export function markSyncInFlight(
  store: SyncQueueStore,
  itemId: string,
  options: { now?: string } = {},
): SyncQueueStore {
  const now = options.now ?? new Date().toISOString();
  const index = store.items.findIndex((item) => item.id === itemId);
  if (index < 0) return store;

  const item = store.items[index];
  const updatedItem: SyncQueueItem = {
    ...item,
    status: "in_flight",
    updatedAt: now,
    attemptCount: item.attemptCount + 1,
  };

  return {
    ...store,
    items: [...store.items.slice(0, index), updatedItem, ...store.items.slice(index + 1)],
    updatedAt: now,
  };
}

export function markSyncSucceeded(
  store: SyncQueueStore,
  itemId: string,
  options: { now?: string } = {},
): SyncQueueStore {
  const now = options.now ?? new Date().toISOString();
  const index = store.items.findIndex((item) => item.id === itemId);
  if (index < 0) return store;

  const updatedItem: SyncQueueItem = {
    ...store.items[index],
    status: "succeeded",
    updatedAt: now,
    error: undefined,
    nextRetryAt: undefined,
  };

  return {
    ...store,
    items: [...store.items.slice(0, index), updatedItem, ...store.items.slice(index + 1)],
    updatedAt: now,
  };
}

export function markSyncFailed(
  store: SyncQueueStore,
  itemId: string,
  error: SyncError,
  options: {
    now?: string;
    nextRetryAt?: string;
  } = {},
): SyncQueueStore {
  const now = options.now ?? new Date().toISOString();
  const index = store.items.findIndex((item) => item.id === itemId);
  if (index < 0) return store;

  const item = store.items[index];
  const shouldRetry = error.retryable && item.attemptCount < item.maxAttempts;

  const updatedItem: SyncQueueItem = {
    ...item,
    status: shouldRetry ? "retry_scheduled" : "failed_terminal",
    updatedAt: now,
    error: {
      ...error,
      lastSeenAt: now,
    },
    nextRetryAt: shouldRetry ? options.nextRetryAt : undefined,
  };

  return {
    ...store,
    items: [...store.items.slice(0, index), updatedItem, ...store.items.slice(index + 1)],
    updatedAt: now,
  };
}

export function compactSyncs(store: SyncQueueStore): SyncQueueStore {
  // Deduplicate by collapseKey, keeping the newest (by updatedAt)
  const deduped = new Map<string, SyncQueueItem>();

  for (const item of store.items) {
    const existing = deduped.get(item.collapseKey);
    if (!existing || new Date(item.updatedAt) > new Date(existing.updatedAt)) {
      deduped.set(item.collapseKey, item);
    }
  }

  return {
    ...store,
    items: Array.from(deduped.values()).sort(
      (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
    ),
  };
}

export function cleanupOldSyncs(
  store: SyncQueueStore,
  cutoffDate: Date,
): { store: SyncQueueStore; removedCount: number } {
  const retentionTime = cutoffDate.getTime() - SYNC_QUEUE_RETENTION_DAYS * 24 * 60 * 60 * 1000;

  let removedCount = 0;
  const newItems = store.items.filter((item) => {
    // Always keep failed_terminal items for debugging
    if (item.status === "failed_terminal") return true;

    const createdAt = new Date(item.createdAt).getTime();
    if (createdAt < retentionTime) {
      removedCount += 1;
      return false;
    }
    return true;
  });

  if (removedCount > 0) {
    return {
      store: { ...store, items: newItems, updatedAt: new Date().toISOString() },
      removedCount,
    };
  }

  return { store, removedCount: 0 };
}

export function getRetentionCutoffDate(): Date {
  return new Date();
}

export function getNextRetryAt(now: Date, attemptCount: number): Date {
  const delayMs = SYNC_QUEUE_RETRY_DELAYS_MS[Math.min(attemptCount, SYNC_QUEUE_RETRY_DELAYS_MS.length - 1)];
  return new Date(now.getTime() + delayMs);
}

export function shouldProcessNow(item: SyncQueueItem, now: Date = new Date()): boolean {
  if (item.status !== "pending" && item.status !== "retry_scheduled") {
    return false;
  }

  if (item.status === "pending") return true;

  // retry_scheduled: check if nextRetryAt has passed
  if (!item.nextRetryAt) return true;
  return new Date(item.nextRetryAt) <= now;
}

export function getSyncQueueSummary(store: SyncQueueStore): SyncQueueStoreSummary {
  const items = store.items;
  return {
    totalCount: items.length,
    pendingCount: items.filter((i) => i.status === "pending").length,
    inFlightCount: items.filter((i) => i.status === "in_flight").length,
    failedOrRetryableCount: items.filter((i) => i.status === "retry_scheduled" || i.status === "failed_terminal")
      .length,
    succeededCount: items.filter((i) => i.status === "succeeded").length,
    lastDrainStartedAt: store.lastDrainStartedAt ?? null,
    lastDrainFinishedAt: store.lastDrainFinishedAt ?? null,
  };
}

function enforceSizeLimit(store: SyncQueueStore): SyncQueueStore {
  if (store.items.length <= SYNC_QUEUE_MAX_SIZE) {
    return store;
  }

  // Keep newest 500 items based on updatedAt
  const sorted = [...store.items].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const kept = sorted.slice(0, 500);

  console.warn(
    `[SyncQueue] Size limit exceeded (${store.items.length} > ${SYNC_QUEUE_MAX_SIZE}). ` +
      `Compacted to ${kept.length} newest items.`,
  );

  return {
    ...store,
    items: kept,
  };
}
