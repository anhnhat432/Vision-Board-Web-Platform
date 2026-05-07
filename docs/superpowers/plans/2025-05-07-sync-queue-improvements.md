# Sync Queue Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement persistent sync queue with exponential backoff retry for 12-week execution sync, plus conflict handling with version checking.

**Architecture:** 
- Frontend: Create SyncQueueStore (persisted to localStorage) with retry logic, integrate with usePlanExecutionSync
- Backend: Models already have revision fields; frontend needs to send baseRevision and handle 409 conflicts with last-write-wins
- UI: Add status indicator in Settings tab, toast notifications for failures/successes

**Tech Stack:**
- Frontend: React hooks, TypeScript, localStorage, sonner (toast)
- Backend: Node.js, Express, MongoDB, existing conflict handling infrastructure

---

## Phase 1: Frontend SyncQueueStore

### Task 1: Create SyncQueueStore types and constants

**Files:**
- Create: `src/features/plan12week/persistence/syncQueueStore.ts`

**Steps:**

- [ ] **Step 1: Define SyncType enum and SyncStatus type**

```typescript
export type SyncType = 'task_completed' | 'daily_checkin' | 'weekly_review' | 'plan_snapshot' | 'metric_upsert';

export type SyncStatus = 'pending' | 'in_flight' | 'retry_scheduled' | 'failed_terminal' | 'succeeded';
```

- [ ] **Step 2: Define SyncError interface**

```typescript
export interface SyncError {
  code: string;
  message: string;
  retryable: boolean;
  lastSeenAt: string;
}
```

- [ ] **Step 3: Define SyncQueueItem interface**

```typescript
export interface SyncQueueItem {
  id: string;
  collapseKey: string;
  status: SyncStatus;
  goalId: string;
  syncType: SyncType;
  entityId?: string;
  entityType?: 'task' | 'checkin' | 'review' | 'plan' | 'metric';
  payload: unknown;
  createdAt: string;
  updatedAt: string;
  nextRetryAt?: string;
  attemptCount: number;
  maxAttempts: number;
  error?: SyncError;
}
```

- [ ] **Step 4: Define SyncQueueStore interface**

```typescript
export interface SyncQueueStore {
  version: number;
  goalId: string;
  updatedAt: string;
  items: SyncQueueItem[];
  lastDrainStartedAt?: string;
  lastDrainFinishedAt?: string;
}
```

- [ ] **Step 5: Define constants**

```typescript
export const SYNC_QUEUE_VERSION = 1;
export const SYNC_QUEUE_STORAGE_PREFIX = 'twelve_week_sync_queue:';
export const MAX_QUEUE_SIZE = 1000;
export const RETENTION_DAYS = 7;
export const DEFAULT_MAX_ATTEMPTS = 7;
export const RETRY_DELAYS_MS = [2000, 5000, 10000, 30000, 60000, 86400000, 86400000]; // 2s, 5s, 10s, 30m, 1h, 24h, 24h
```

- [ ] **Step 6: Define EnqueueSyncInput type**

```typescript
export interface EnqueueSyncInput {
  goalId: string;
  syncType: SyncType;
  entityId?: string;
  entityType?: 'task' | 'checkin' | 'review' | 'plan' | 'metric';
  payload: unknown;
  maxAttempts?: number;
}
```

- [ ] **Step 7: Define helper types**

```typescript
export interface SyncQueueSummary {
  totalCount: number;
  pendingCount: number;
  inFlightCount: number;
  failedOrRetryableCount: number;
  succeededCount: number;
  lastDrainStartedAt: string | null;
  lastDrainFinishedAt: string | null;
}

export interface SyncQueueStatus {
  loading: boolean;
  goalId: string | null;
  queueSummary: SyncQueueSummary;
  lastError: { message: string; code: string } | null;
  retryInSeconds: number | null;
}
```

- [ ] **Step 8: Export storage key helper**

```typescript
export function getSyncQueueStorageKey(goalId: string): string {
  return `${SYNC_QUEUE_STORAGE_PREFIX}${goalId}`;
}
```

- [ ] **Step 9: Commit changes**

```bash
git add src/features/plan12week/persistence/syncQueueStore.ts
git commit -m "feat: add sync queue store types and constants"
```

---

### Task 2: Implement SyncQueueStore core functions

**Files:**
- Modify: `src/features/plan12week/persistence/syncQueueStore.ts`

**Steps:**

- [ ] **Step 1: Implement utility functions**

```typescript
function toIso(value?: string | Date): string {
  if (value instanceof Date) return value.toISOString();
  if (value) return new Date(value).toISOString();
  return new Date().toISOString();
}

function createMutationId(now: Date = new Date()): string {
  const suffix = Math.floor(Math.random() * 36 ** 8)
    .toString(36)
    .padStart(6, '0')
    .slice(0, 8);
  return `sync_${now.getTime()}_${suffix}`;
}

function getCollapseKey(input: EnqueueSyncInput): string {
  switch (input.syncType) {
    case 'task_completed':
      return `task:${input.goalId}:${input.entityId}`;
    case 'daily_checkin':
      return `checkin:${input.goalId}:${(input.payload as any).date}`;
    case 'weekly_review':
      return `review:${input.goalId}:${(input.payload as any).weekNumber}`;
    case 'plan_snapshot':
      return `plan:${input.goalId}`;
    case 'metric_upsert':
      return `metric:${input.goalId}:${(input.payload as any).weekNumber}:${(input.payload as any).metricName}`;
    default:
      return `unknown:${input.goalId}:${Date.now()}`;
  }
}
```

- [ ] **Step 2: Implement createEmptySyncQueueStore**

```typescript
export function createEmptySyncQueueStore(goalId: string, now?: Date): SyncQueueStore {
  return {
    version: SYNC_QUEUE_VERSION,
    goalId,
    updatedAt: toIso(now),
    items: [],
  };
}
```

- [ ] **Step 3: Implement readSyncQueueStore**

```typescript
export function readSyncQueueStore(goalId: string, now?: Date): SyncQueueStore {
  try {
    const storageKey = getSyncQueueStorageKey(goalId);
    const raw = localStorage.getItem(storageKey);
    
    if (!raw) {
      return createEmptySyncQueueStore(goalId, now);
    }

    const parsed = JSON.parse(raw) as Partial<SyncQueueStore>;
    if (!parsed.version || parsed.version !== SYNC_QUEUE_VERSION) {
      // Version mismatch, start fresh
      return createEmptySyncQueueStore(goalId, now);
    }

    return {
      version: parsed.version,
      goalId: parsed.goalId || goalId,
      updatedAt: parsed.updatedAt || toIso(now),
      items: Array.isArray(parsed.items) ? parsed.items : [],
      lastDrainStartedAt: parsed.lastDrainStartedAt,
      lastDrainFinishedAt: parsed.lastDrainFinishedAt,
    };
  } catch (error) {
    console.error('Failed to read sync queue store:', error);
    return createEmptySyncQueueStore(goalId, now);
  }
}
```

- [ ] **Step 4: Implement writeSyncQueueStore**

```typescript
export function writeSyncQueueStore(store: SyncQueueStore): boolean {
  try {
    // Check size limit
    if (store.items.length > MAX_QUEUE_SIZE) {
      console.warn(`Sync queue exceeds ${MAX_QUEUE_SIZE} items, compacting...`);
      const compacted = compactSyncs(store);
      const finalStore = maybeCleanupOldItems(compacted, new Date(store.updatedAt));
      localStorage.setItem(getSyncQueueStorageKey(finalStore.goalId), JSON.stringify(finalStore));
      return true;
    }

    localStorage.setItem(getSyncQueueStorageKey(store.goalId), JSON.stringify(store));
    return true;
  } catch (error) {
    console.error('Failed to write sync queue store:', error);
    return false;
  }
}
```

- [ ] **Step 5: Implement enqueueSync**

```typescript
export function enqueueSync(
  store: SyncQueueStore,
  input: EnqueueSyncInput
): { store: SyncQueueStore; item: SyncQueueItem | null } {
  const now = toIso();
  const collapseKey = getCollapseKey(input);
  const existingItemIndex = store.items.findIndex(
    item => item.collapseKey === collapseKey && 
    ['pending', 'in_flight', 'retry_scheduled'].includes(item.status)
  );

  // If exists, update payload (latest wins) but keep same id
  if (existingItemIndex !== -1) {
    const existing = store.items[existingItemIndex];
    const updatedItem: SyncQueueItem = {
      ...existing,
      payload: input.payload,
      updatedAt: now,
      // Reset retry if it was failed
      ...(existing.status === 'failed_terminal' ? {
        status: 'pending' as SyncStatus,
        attemptCount: 0,
        nextRetryAt: undefined,
        error: undefined,
      } : {}),
    };
    
    const nextStore = {
      ...store,
      updatedAt: now,
      items: [...store.items.slice(0, existingItemIndex), updatedItem, ...store.items.slice(existingItemIndex + 1)],
    };
    
    return { store: nextStore, item: updatedItem };
  }

  // Create new item
  const item: SyncQueueItem = {
    id: createMutationId(),
    collapseKey,
    status: 'pending',
    goalId: input.goalId,
    syncType: input.syncType,
    entityId: input.entityId,
    entityType: input.entityType,
    payload: input.payload,
    createdAt: now,
    updatedAt: now,
    attemptCount: 0,
    maxAttempts: input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
  };

  const nextStore = {
    ...store,
    updatedAt: now,
    items: [...store.items, item],
  };

  return { store: nextStore, item };
}
```

- [ ] **Step 6: Implement listPendingSyncs**

```typescript
export function listPendingSyncs(
  store: SyncQueueStore,
  now?: Date
): SyncQueueItem[] {
  const currentTime = toIso(now);
  
  return store.items.filter(item => {
    if (item.status === 'pending' || item.status === 'in_flight') return true;
    if (item.status === 'retry_scheduled' && item.nextRetryAt) {
      return item.nextRetryAt <= currentTime;
    }
    return false;
  }).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}
```

- [ ] **Step 7: Implement markSyncInFlight**

```typescript
export function markSyncInFlight(
  store: SyncQueueStore,
  mutationId: string,
  now?: Date
): SyncQueueStore {
  const currentTime = toIso(now);
  
  return {
    ...store,
    updatedAt: currentTime,
    items: store.items.map(item =>
      item.id === mutationId
        ? {
            ...item,
            status: 'in_flight',
            lastAttemptAt: currentTime,
            nextRetryAt: undefined,
            attemptCount: item.attemptCount + 1,
            updatedAt: currentTime,
          }
        : item
    ),
  };
}
```

- [ ] **Step 8: Implement markSyncSucceeded**

```typescript
export function markSyncSucceeded(
  store: SyncQueueStore,
  mutationId: string,
  now?: Date
): SyncQueueStore {
  const currentTime = toIso(now);
  
  return {
    ...store,
    updatedAt: currentTime,
    items: store.items.map(item =>
      item.id === mutationId
        ? {
            ...item,
            status: 'succeeded',
            error: undefined,
            nextRetryAt: undefined,
            updatedAt: currentTime,
          }
        : item
    ),
  };
}
```

- [ ] **Step 9: Implement getRetryDelayMs and getNextRetryAt**

```typescript
export function getRetryDelayMs(attemptCount: number): number {
  const index = Math.max(0, Math.min(attemptCount - 1, RETRY_DELAYS_MS.length - 1));
  return RETRY_DELAYS_MS[index] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
}

export function getNextRetryAt(now: string, attemptCount: number): string {
  return new Date(new Date(now).getTime() + getRetryDelayMs(attemptCount)).toISOString();
}
```

- [ ] **Step 10: Implement markSyncFailed**

```typescript
export function markSyncFailed(
  store: SyncQueueStore,
  mutationId: string,
  error: SyncError,
  options?: { now?: string | Date; nextRetryAt?: string | Date }
): SyncQueueStore {
  const currentTime = toIso(options?.now);
  const attemptCount = store.items.find(item => item.id === mutationId)?.attemptCount ?? 0;
  const isTerminal = attemptCount >= DEFAULT_MAX_ATTEMPTS || !error.retryable;
  
  return {
    ...store,
    updatedAt: currentTime,
    items: store.items.map(item =>
      item.id === mutationId
        ? {
            ...item,
            status: isTerminal ? 'failed_terminal' : 'retry_scheduled',
            error: {
              code: error.code,
              message: error.message,
              retryable: error.retryable,
              lastSeenAt: currentTime,
            },
            nextRetryAt: isTerminal ? undefined : toIso(options?.nextRetryAt),
            updatedAt: currentTime,
          }
        : item
    ),
  };
}
```

- [ ] **Step 11: Implement compactSyncs**

```typescript
export function compactSyncs(store: SyncQueueStore): SyncQueueStore {
  const updatedAt = toIso();
  const nonCollapsible: SyncQueueItem[] = [];
  const latestByCollapseKey = new Map<string, SyncQueueItem>();

  for (const item of store.items) {
    const isTerminal = item.status === 'succeeded' || item.status === 'failed_terminal';
    if (!isTerminal) {
      nonCollapsible.push(item);
      continue;
    }

    const groupKey = `${item.goalId}:${item.collapseKey}`;
    const previous = latestByCollapseKey.get(groupKey);
    if (!previous) {
      latestByCollapseKey.set(groupKey, item);
      continue;
    }

    const previousTime = new Date(previous.updatedAt).getTime();
    const currentTime = new Date(item.updatedAt).getTime();
    const latest = previousTime <= currentTime ? item : previous;
    latestByCollapseKey.set(groupKey, latest);
  }

  return {
    ...store,
    updatedAt,
    items: [...nonCollapsible, ...latestByCollapseKey.values()].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    ),
  };
}
```

- [ ] **Step 12: Implement cleanup logic**

```typescript
function removeItemsOlderThan(
  store: SyncQueueStore,
  cutoffDate: Date,
  statusesToRemove: SyncStatus[]
): number {
  let removedCount = 0;
  const nextItems = store.items.filter(item => {
    if (!statusesToRemove.includes(item.status)) return true;
    const itemDate = new Date(item.updatedAt);
    if (itemDate >= cutoffDate) return true;
    removedCount++;
    return false;
  });

  if (removedCount > 0) {
    store.items = nextItems;
  }
  return removedCount;
}

export function maybeCleanupOldItems(store: SyncQueueStore, now: Date): SyncQueueStore {
  const cutoffDate = new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const nextStore = { ...store };
  
  // Auto-remove succeeded items older than retention period
  removeItemsOlderThan(nextStore, cutoffDate, ['succeeded']);
  
  return nextStore;
}
```

- [ ] **Step 13: Implement getSyncQueueSummary**

```typescript
export function getSyncQueueSummary(store: SyncQueueStore): SyncQueueSummary {
  const failedOrRetryableStatuses = new Set<SyncStatus>([
    'retry_scheduled',
    'failed_terminal',
  ]);

  return {
    totalCount: store.items.length,
    pendingCount: store.items.filter(item => item.status === 'pending').length,
    inFlightCount: store.items.filter(item => item.status === 'in_flight').length,
    failedOrRetryableCount: store.items.filter(item => failedOrRetryableStatuses.has(item.status)).length,
    succeededCount: store.items.filter(item => item.status === 'succeeded').length,
    lastDrainStartedAt: store.lastDrainStartedAt ?? null,
    lastDrainFinishedAt: store.lastDrainFinishedAt ?? null,
  };
}
```

- [ ] **Step 14: Commit changes**

```bash
git add src/features/plan12week/persistence/syncQueueStore.ts
git commit -m "feat: implement sync queue store core functions"
```

---

### Task 3: Create usePlanSyncQueue hook

**Files:**
- Create: `src/features/plan12week/hooks/usePlanSyncQueue.ts`

**Steps:**

- [ ] **Step 1: Import dependencies and define types**

```typescript
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isDemoMode } from '@/app/utils/app-mode';
import { readSyncQueueStore, writeSyncQueueStore, type SyncQueueStatus, type SyncQueueStore } from '../persistence/syncQueueStore';
import type { TwelveWeekSystem } from '@/app/utils/storage-types';
import { getCalendarDateKey } from '@/app/utils/storage-date-utils';
import { getTwelveWeekCurrentWeek } from '@/app/utils/storage-twelve-week';
```

- [ ] **Step 2: Define usePlanSyncQueue options and return type**

```typescript
interface UsePlanSyncQueueOptions {
  goalId?: string | null;
  system?: TwelveWeekSystem | null;
  enabled?: boolean;
}

export interface UsePlanSyncQueueReturn {
  loading: boolean;
  error: Error | null;
  data: {
    goalId: string | null;
    status: SyncQueueStatus;
  };
  actions: {
    enqueue: <T>(syncType: string, payload: T, entityId?: string, entityType?: string) => Promise<boolean>;
    processQueue: () => Promise<void>;
    clearCompleted: () => void;
    clearFailed: () => void;
  };
}
```

- [ ] **Step 3: Implement hook with queue management**

```typescript
export function usePlanSyncQueue(options: UsePlanSyncQueueOptions = {}): UsePlanSyncQueueReturn {
  const { goalId: inputGoalId, system: inputSystem, enabled = true } = options;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [queueStore, setQueueStore] = useState<SyncQueueStore | null>(null);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);
  const processingRef = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const goalId = inputGoalId ?? null;
  const system = inputSystem ?? null;
  const isDemo = isDemoMode();

  // Load queue when goalId changes
  useEffect(() => {
    if (!goalId || isDemo) {
      setQueueStore(null);
      return;
    }
    
    const store = readSyncQueueStore(goalId);
    setQueueStore(store);
  }, [goalId, isDemo]);

  // Retry countdown for UI
  useEffect(() => {
    if (!queueStore) return;
    
    const inFlightOrRetrying = queueStore.items.find(
      item => item.status === 'in_flight' || 
      (item.status === 'retry_scheduled' && item.nextRetryAt)
    );
    
    if (!inFlightOrRetrying) {
      setRetryCountdown(null);
      return;
    }
    
    const updateCountdown = () => {
      const now = new Date();
      const nextRetry = queueStore.items
        .filter(item => item.status === 'retry_scheduled' && item.nextRetryAt)
        .map(item => new Date(item.nextRetryAt!).getTime() - now.getTime())
        .filter(diff => diff > 0);
      
      if (nextRetry.length === 0) {
        setRetryCountdown(null);
      } else {
        const minRetry = Math.min(...nextRetry);
        setRetryCountdown(Math.ceil(minRetry / 1000));
      }
    };
    
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(timer);
  }, [queueStore]);

  const enqueue = useCallback(async <T>(
    syncType: string,
    payload: T,
    entityId?: string,
    entityType?: string
  ): Promise<boolean> => {
    if (!enabled || !goalId || isDemo) return true;
    if (!system) {
      console.warn('Cannot enqueue sync: system not available');
      return true;
    }

    const store = readSyncQueueStore(goalId);
    const { item } = enqueueSync(store, {
      goalId,
      syncType: syncType as any,
      entityId,
      entityType: entityType as any,
      payload,
    });
    
    writeSyncQueueStore(store);
    setQueueStore(store);

    // Schedule async processing
    if (item && item.status === 'pending') {
      setTimeout(processQueue, 100);
    }

    return true;
  }, [enabled, goalId, isDemo, system]);

  const processQueue = useCallback(async (): Promise<void> => {
    if (processingRef.current || !enabled || !goalId || !system || isDemo) return;
    
    processingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      let store = readSyncQueueStore(goalId);
      const pending = listPendingSyncs(store);
      
      if (pending.length === 0) {
        setLoading(false);
        processingRef.current = false;
        return;
      }

      store = {
        ...store,
        lastDrainStartedAt: new Date().toISOString(),
      };
      writeSyncQueueStore(store);
      setQueueStore(store);

      for (const item of pending) {
        if (!shouldProcessNow(item)) continue;

        store = markSyncInFlight(store, item.id);
        writeSyncQueueStore(store);
        setQueueStore(store);

        try {
          await executeSyncAction(item, system);
          store = markSyncSucceeded(store, item.id);
          writeSyncQueueStore(store);
          setQueueStore(store);
          
          // Show success toast if we just recovered from errors
          if (store.items.some(i => i.status === 'failed_terminal')) {
            toast.success('Đã đồng bộ dữ liệu 12-week', {
              description: `${store.succeededCount} thay đổi đã được đồng bộ.`,
            });
          }
        } catch (err) {
          const syncError: SyncError = {
            code: (err as any)?.code || 'sync_error',
            message: (err as any)?.message || 'Sync failed',
            retryable: isRetryableError(err),
            lastSeenAt: new Date().toISOString(),
          };
          
          store = markSyncFailed(store, item.id, syncError, {
            now: new Date(),
            nextRetryAt: syncError.retryable 
              ? new Date(Date.now() + getRetryDelayMs(item.attemptCount + 1))
              : undefined,
          });
          writeSyncQueueStore(store);
          setQueueStore(store);
          
          // Show error toast on first failure
          if (store.items.some(i => i.status === 'retry_scheduled' || i.status === 'failed_terminal')) {
            const nextRetry = store.items
              .filter(i => i.status === 'retry_scheduled' && i.nextRetryAt)
              .map(i => Math.ceil((new Date(i.nextRetryAt!).getTime() - Date.now()) / 1000))
              .sort((a, b) => a - b)[0];
            
            toast.error('Sync failed, sẽ thử lại sau 30s', {
              description: syncError.message,
            });
          }
          
          // Continue processing other items even if one fails
        }
      }

      store = {
        ...store,
        lastDrainFinishedAt: new Date().toISOString(),
      };
      writeSyncQueueStore(store);
      setQueueStore(store);
    } catch (err) {
      setError(err as Error);
      console.error('Queue processing error:', err);
    } finally {
      setLoading(false);
      processingRef.current = false;
    }
  }, [goalId, enabled, isDemo, system]);

  const clearCompleted = useCallback(() => {
    if (!goalId) return;
    const store = readSyncQueueStore(goalId);
    store.items = store.items.filter(item => 
      item.status !== 'succeeded' && item.status !== 'failed_terminal'
    );
    writeSyncQueueStore(store);
    setQueueStore(store);
  }, [goalId]);

  const clearFailed = useCallback(() => {
    if (!goalId) return;
    const store = readSyncQueueStore(goalId);
    store.items = store.items.filter(item => item.status !== 'failed_terminal');
    writeSyncQueueStore(store);
    setQueueStore(store);
  }, [goalId]);

  // Auto-process on mount if there are pending items
  useEffect(() => {
    if (queueStore && queueStore.items.length > 0) {
      const hasPending = queueStore.items.some(item => 
        item.status === 'pending' || item.status === 'retry_scheduled'
      );
      if (hasPending) {
        setTimeout(processQueue, 500);
      }
    }
  }, [queueStore, processQueue]);

  const status = useMemo<SyncQueueStatus>(() => {
    if (!queueStore) {
      return {
        loading: false,
        goalId: null,
        queueSummary: {
          totalCount: 0,
          pendingCount: 0,
          inFlightCount: 0,
          failedOrRetryableCount: 0,
          succeededCount: 0,
          lastDrainStartedAt: null,
          lastDrainFinishedAt: null,
        },
        lastError: null,
        retryInSeconds: null,
      };
    }

    const summary = getSyncQueueSummary(queueStore);
    const failedItem = queueStore.items.find(
      item => item.status === 'retry_scheduled' || item.status === 'failed_terminal'
    );
    
    return {
      loading,
      goalId: queueStore.goalId,
      queueSummary: summary,
      lastError: failedItem?.error ? {
        message: failedItem.error.message,
        code: failedItem.error.code,
      } : null,
      retryInSeconds: retryCountdown,
    };
  }, [loading, queueStore, retryCountdown]);

  return {
    loading,
    error,
    data: { goalId, status },
    actions: {
      enqueue,
      processQueue,
      clearCompleted,
      clearFailed,
    },
  };
}
```

- [ ] **Step 4: Implement executeSyncAction helper**

```typescript
async function executeSyncAction(
  item: SyncQueueItem,
  system: TwelveWeekSystem
): Promise<void> {
  // Will be implemented in next task - uses existing sync functions
  throw new Error('executeSyncAction not implemented yet');
}
```

- [ ] **Step 5: Implement shouldProcessNow helper**

```typescript
function shouldProcessNow(item: SyncQueueItem): boolean {
  if (item.status === 'in_flight') return true;
  if (item.status === 'pending') return true;
  if (item.status === 'retry_scheduled' && item.nextRetryAt) {
    return new Date(item.nextRetryAt) <= new Date();
  }
  return false;
}
```

- [ ] **Step 6: Implement isRetryableError helper**

```typescript
function isRetryableError(error: unknown): boolean {
  const appError = error as any;
  // Network errors, 5xx, 408, 429 are retryable
  if (appError.isNetworkError) return true;
  const status = appError.status;
  return status === undefined || status === 408 || status === 429 || status >= 500;
}
```

- [ ] **Step 7: Commit skeleton**

```bash
git add src/features/plan12week/hooks/usePlanSyncQueue.ts
git commit -m "feat: add usePlanSyncQueue hook skeleton"
```

---

### Task 4: Implement sync actions for each SyncType

**Files:**
- Modify: `src/features/plan12week/hooks/usePlanSyncQueue.ts`

**Steps:**

- [ ] **Step 1: Import existing sync services**

```typescript
import { updateWeek } from '@/services/weekService';
import { updateTask, addTask } from '@/services/taskService';
import { logMetric } from '@/services/metricService';
import { savePlanDetailsLink } from '../persistence/planLinkStore';
import { getWeekIdForGoal } from '../persistence/planLinkStore';
import { toIsoDate } from '@/services/planService';
```

- [ ] **Step 2: Implement getWeekDetails helper**

```typescript
async function getWeekDetails(goalId: string, weekNumber: number, system: TwelveWeekSystem): Promise<{weekId: string} | null> {
  const weekId = getWeekIdForGoal(goalId, weekNumber);
  if (weekId) return { weekId };
  
  // Need to fetch from backend - reuse ensurePlanDetails pattern from usePlanExecutionSync
  // For now, return null - will be integrated in next task
  return null;
}
```

- [ ] **Step 3: Implement executeSyncAction for task_completed**

```typescript
case 'task_completed':
  const { taskId, completed, completedAt, scheduledDate, title, weekNumber, leadIndicatorName, isCore } = item.payload as any;
  
  // Find task in local system
  const task = system.taskInstances.find(t => t.id === taskId);
  if (!task) throw new Error(`Task ${taskId} not found`);
  
  // Get week details
  const weekRes = await getWeekDetails(goalId, weekNumber, system);
  if (!weekRes) throw new Error(`Week ${weekNumber} not found`);
  
  // Try to find existing remote task
  const remoteTaskId = getRemoteTaskIdForGoal(goalId, taskId);
  const weekDetails = await getPlanDetails(goalId, system); // Need to implement
  
  if (remoteTaskId) {
    // Update existing
    await updateTask(remoteTaskId, {
      status: completed ? 'done' : 'todo',
      title: task.title,
      scheduledDate: toIsoDate(task.scheduledDate),
    }, { baseRevision: item.payload.baseRevision });
  } else {
    // Create new
    const created = await addTask(weekRes.weekId, {
      title: task.title,
      status: completed ? 'done' : 'todo',
      scheduledDate: toIsoDate(task.scheduledDate),
    });
    setRemoteTaskIdForGoal(goalId, taskId, created.id);
  }
  
  // If completed, also log metric
  if (completed && leadIndicatorName) {
    await logMetricForCompletedTask(goalId, weekRes.weekId, weekNumber, leadIndicatorName, task);
  }
  break;
```

- [ ] **Step 4: Implement executeSyncAction for daily_checkin**

```typescript
case 'daily_checkin':
  const { date, didWorkToday, weekNumber } = item.payload as any;
  const weekRes = await getWeekDetails(goalId, weekNumber, system);
  if (!weekRes) throw new Error(`Week ${weekNumber} not found`);
  
  // Get or create metric
  const metricId = await getOrCreateMetricId(goalId, weekRes.weekId, weekNumber, 'daily_checkin');
  
  // Check if log exists for this date
  const existingLog = await findMetricLogForDate(metricId, date);
  if (existingLog) {
    await updateMetricLog(metricId, existingLog.id, {
      date: toIsoDate(date),
      value: didWorkToday ? 1 : 0,
      completed: didWorkToday,
    });
  } else {
    await logMetric(metricId, {
      date: toIsoDate(date) ?? new Date().toISOString(),
      value: didWorkToday ? 1 : 0,
      completed: didWorkToday,
    });
  }
  break;
```

- [ ] **Step 5: Implement executeSyncAction for weekly_review**

```typescript
case 'weekly_review':
  const { weekNumber: reviewWeek, executionScore, reflection, adjustments } = item.payload as any;
  const weekRes = await getWeekDetails(goalId, reviewWeek, system);
  if (!weekRes) throw new Error(`Week ${reviewWeek} not found`);
  
  await updateWeekReview(weekRes.weekId, {
    weekNumber: reviewWeek,
    executionScore,
    reflection,
    adjustments,
  }, { baseRevision: item.payload.baseRevision });
  break;
```

- [ ] **Step 6: Implement executeSyncAction for plan_snapshot**

```typescript
case 'plan_snapshot':
  const { planData } = item.payload as any;
  
  // Ensure plan exists or create
  const existingPlan = await getPlan(planData.planId);
  if (!existingPlan) {
    await createPlan({
      vision: planData.vision,
      smartGoalId: goalId,
      startDate: planData.startDate,
      initializeWeeks: true,
      totalWeeks: planData.totalWeeks,
    });
  } else {
    await updatePlan(planData.planId, {
      vision: planData.vision,
      startDate: planData.startDate,
    }, { baseRevision: item.payload.baseRevision });
  }
  break;
```

- [ ] **Step 7: Implement executeSyncAction for metric_upsert**

```typescript
case 'metric_upsert':
  const { weekNumber: metricWeek, metricName, weeklyTarget } = item.payload as any;
  const weekRes = await getWeekDetails(goalId, metricWeek, system);
  if (!weekRes) throw new Error(`Week ${metricWeek} not found`);
  
  // Create or update metric
  const existingMetric = await getMetricByName(weekRes.weekId, metricName);
  if (existingMetric) {
    await updateMetric(existingMetric.id, { weeklyTarget });
  } else {
    await createMetric(weekRes.weekId, { name: metricName, weeklyTarget });
  }
  break;
```

- [ ] **Step 8: Add default error handling**

```typescript
default:
  throw new Error(`Unknown sync type: ${(item as any).syncType}`);
```

- [ ] **Step 9: Implement ConflictError handling**

```typescript
import { ConflictError } from '@/lib/errors/ConflictError';

// In executeSyncAction, wrap API calls:
try {
  // API call
} catch (err) {
  if (err instanceof ConflictError) {
    // Conflict - retryable false, but we might want to auto-resolve with last-write-wins
    // For now, mark as failed_terminal
    throw Object.assign(new Error('Conflict detected, data changed elsewhere'), {
      code: 'conflict_detected',
      retryable: false,
      isConflict: true,
    });
  }
  throw err;
}
```

- [ ] **Step 10: Commit**

```bash
git add src/features/plan12week/hooks/usePlanSyncQueue.ts
git commit -m "feat: implement sync actions for all SyncTypes"
```

---

### Task 5: Integrate SyncQueue into usePlanExecutionSync

**Files:**
- Modify: `src/features/plan12week/hooks/usePlanExecutionSync.ts`

**Steps:**

- [ ] **Step 1: Add usePlanSyncQueue import and usage**

```typescript
import { usePlanSyncQueue } from './usePlanSyncQueue';

// Inside component:
const syncQueue = usePlanExecutionSync({
  goalId: options.goalId,
  system: options.system,
  enabled: options.enabled,
});
```

- [ ] **Step 2: Replace enqueueSync in syncTaskToggle**

```typescript
const syncTaskToggle = useCallback((taskId: string, completed: boolean): Promise<boolean> => {
  return syncQueue.actions.enqueue(
    'task_completed',
    {
      taskId,
      completed,
      completedAt: completed ? new Date().toISOString() : undefined,
      // Include baseRevision for conflict detection
      baseRevision: getTaskRevision(taskId), // TODO: get from local storage
    },
    taskId,
    'task'
  );
}, [syncQueue]);
```

- [ ] **Step 3: Replace enqueueSync in syncDailyCheckIn**

```typescript
const syncDailyCheckIn = useCallback((input: SyncDailyCheckInInput): Promise<boolean> => {
  return syncQueue.actions.enqueue(
    'daily_checkin',
    {
      date: input.date,
      didWorkToday: input.didWorkToday,
      weekNumber: input.weekNumber,
    },
    `${input.weekNumber}:${input.date}`,
    'checkin'
  );
}, [syncQueue]);
```

- [ ] **Step 4: Replace enqueueSync in syncWeeklyReview**

```typescript
const syncWeeklyReview = useCallback((input: SyncWeeklyReviewInput): Promise<boolean> => {
  return syncQueue.actions.enqueue(
    'weekly_review',
    {
      weekNumber: input.weekNumber,
      executionScore: input.executionScore,
      reflection: input.reflection,
      adjustments: input.adjustments,
      baseRevision: getWeekRevision(input.weekNumber), // TODO
    },
    `${input.weekNumber}`,
    'review'
  );
}, [syncQueue]);
```

- [ ] **Step 5: Replace enqueueSync in syncLocalSnapshot**

```typescript
const syncLocalSnapshot = useCallback((input: SyncLocalSnapshotInput = {}): Promise<PlanExecutionSyncSnapshot> => {
  return syncQueue.actions.enqueue(
    'plan_snapshot',
    {
      planData: {
        planId: currentPlanId, // get from planLinkStore
        vision: system?.vision12Week,
        startDate: system?.startDate,
        totalWeeks: system?.totalWeeks,
      },
      baseRevision: getPlanRevision(), // TODO
    }
  ).then(success => {
    // Convert to snapshot format
    if (!success) {
      return createSnapshot({ syncedCount: 0, skippedCount: 0, failedCount: 1 }, null, 'error');
    }
    return createSnapshot({ syncedCount: 1, skippedCount: 0, failedCount: 0 }, currentPlanId, 'success');
  });
}, [syncQueue, system]);
```

- [ ] **Step 6: Expose syncQueue status in return value**

```typescript
return {
  loading,
  error,
  data: {
    ...data,
    syncQueueStatus: syncQueue.data.status,
  },
  actions: {
    ...actions,
    processSyncQueue: syncQueue.actions.processQueue,
    clearCompletedSyncs: syncQueue.actions.clearCompleted,
    clearFailedSyncs: syncQueue.actions.clearFailed,
  },
};
```

- [ ] **Step 7: Remove old internal queue logic**

Remove:
- `syncQueueRef` state
- `enqueueSync` function
- `runAction` wrapper (optional - keep if still useful)

- [ ] **Step 8: Commit**

```bash
git add src/features/plan12week/hooks/usePlanExecutionSync.ts
git commit -m "feat: integrate sync queue into usePlanExecutionSync"
```

---

## Phase 2: Backend Conflict Handling (Last-Write-Wins)

### Task 6: Frontend: Send baseRevision on updates

**Files:**
- Modify: `src/services/planService.ts`
- Modify: `src/services/weekService.ts`
- Modify: `src/services/taskService.ts`

**Steps:**

- [ ] **Step 1: Update planService.ts to accept baseRevision**

```typescript
interface UpdatePlanInput {
  vision?: string;
  smartGoalId?: string;
  startDate?: string | Date;
  baseRevision?: number; // Add this
}

export async function updatePlan(
  id: string,
  updates: UpdatePlanInput
): Promise<Plan> {
  const response = await apiClient.patch<Plan>(`/plans/${id}`, {
    ...updates,
    startDate: updates.startDate ? toIsoDate(updates.startDate) : undefined,
  });
  return response;
}
```

- [ ] **Step 2: Update weekService.ts to accept baseRevision**

```typescript
interface UpdateWeekInput {
  focus?: string;
  expectedOutput?: string;
  baseRevision?: number;
}

export async function updateWeek(
  id: string,
  updates: UpdateWeekInput
): Promise<Week> {
  const response = await apiClient.patch<Week>(`/weeks/${id}`, updates);
  return response;
}

export async function updateWeekReview(
  weekId: string,
  input: { weekNumber: number; executionScore: number; reflection?: string; adjustments?: string }
): Promise<Week> {
  const response = await apiClient.patch<Week>(`/weeks/${weekId}/review`, input);
  return response;
}
```

- [ ] **Step 3: Update taskService.ts to accept baseRevision**

```typescript
interface UpdateTaskInput {
  title?: string;
  status?: TaskStatus;
  scheduledDate?: string | Date;
  baseRevision?: number;
}

export async function updateTask(
  id: string,
  updates: UpdateTaskInput
): Promise<Task> {
  const response = await apiClient.patch<Task>(`/tasks/${id}`, {
    ...updates,
    scheduledDate: updates.scheduledDate ? toIsoDate(updates.scheduledDate) : undefined,
  });
  return response;
}
```

- [ ] **Step 4: Update metricService.ts similarly (if needed)**

Check if metric updates need baseRevision.

- [ ] **Step 5: Commit**

```bash
git add src/services/planService.ts src/services/weekService.ts src/services/taskService.ts
git commit -m "feat: add baseRevision support to service updates"
```

---

### Task 7: Frontend: Store and retrieve revision from localStorage

**Files:**
- Modify: `src/features/plan12week/persistence/planLinkStore.ts`

**Steps:**

- [ ] **Step 1: Extend PlanLinkRecord to store revisions**

```typescript
interface PlanLinkRecord {
  planId: string;
  weekIdByNumber: Record<number, string>;
  metricIdByKey: Record<string, string>;
  taskIdByLocalTaskId: Record<string, string>;
  revisions?: {
    plan?: number;
    weeks?: Record<number, number>;
    tasks?: Record<string, number>;
  };
}
```

- [ ] **Step 2: Add helper functions to get/set revisions**

```typescript
export function getPlanRevision(goalId: string): number | undefined {
  const link = getPlanLink(goalId);
  return link?.revisions?.plan;
}

export function getWeekRevision(goalId: string, weekNumber: number): number | undefined {
  const link = getPlanLink(goalId);
  return link?.revisions?.weeks?.[weekNumber];
}

export function getTaskRevision(goalId: string, localTaskId: string): number | undefined {
  const link = getPlanLink(goalId);
  return link?.revisions?.tasks?.[localTaskId];
}

export function setPlanRevision(goalId: string, revision: number): void {
  upsertPlanLink(goalId, (currentLink) => ({
    ...currentLink,
    revisions: {
      ...currentLink?.revisions,
      plan: revision,
    },
  }));
}

export function setWeekRevision(goalId: string, weekNumber: number, revision: number): void {
  upsertPlanLink(goalId, (currentLink) => ({
    ...currentLink,
    revisions: {
      ...currentLink?.revisions,
      weeks: {
        ...currentLink?.revisions?.weeks,
        [weekNumber]: revision,
      },
    },
  }));
}

export function setTaskRevision(goalId: string, localTaskId: string, revision: number): void {
  upsertPlanLink(goalId, (currentLink) => ({
    ...currentLink,
    revisions: {
      ...currentLink?.revisions,
      tasks: {
        ...currentLink?.revisions?.tasks,
        [localTaskId]: revision,
      },
    },
  }));
}
```

- [ ] **Step 3: Update savePlanDetailsLink to extract revisions**

```typescript
export function savePlanDetailsLink(goalId: string, details: PlanDetails): PlanLinkRecord {
  return upsertPlanLink(goalId, (currentLink) => {
    const weekIdByNumber = details.weeks.reduce<Record<number, string>>((acc, week) => {
      acc[week.weekNumber] = week.id;
      return acc;
    }, {});

    const metricIdByKey = details.weeks.reduce<Record<string, string>>((acc, week) => {
      week.metrics.forEach(metric => {
        acc[createMetricLookupKey(week.weekNumber, metric.name)] = metric.id;
      });
      return acc;
    }, {});

    return {
      planId: details.plan.id,
      weekIdByNumber,
      metricIdByKey: {
        ...(currentLink?.metricIdByKey ?? {}),
        ...metricIdByKey,
      },
      taskIdByLocalTaskId: currentLink?.taskIdByLocalTaskId ?? {},
      revisions: {
        plan: details.plan.revision,
        weeks: details.weeks.reduce((acc, week) => ({
          ...acc,
          [week.weekNumber]: week.revision,
        }), {}),
        tasks: currentLink?.revisions?.tasks ?? {},
      },
    };
  });
}
```

- [ ] **Step 4: Update revision when sync succeeds**

Add to `usePlanExecutionSync` after successful operations:

```typescript
// After updatePlan succeeds:
setPlanRevision(goalId, updatedPlan.revision);

// After updateWeek succeeds:
setWeekRevision(goalId, weekNumber, updatedWeek.revision);

// After updateTask succeeds:
setTaskRevision(goalId, localTaskId, updatedTask.revision);
```

- [ ] **Step 5: Commit**

```bash
git add src/features/plan12week/persistence/planLinkStore.ts
git commit -m "feat: store revisions in plan link store"
```

---

### Task 8: Handle 409 Conflict with last-write-wins

**Files:**
- Modify: `src/features/plan12week/hooks/usePlanSyncQueue.ts`

**Steps:**

- [ ] **Step 1: Detect conflict errors**

```typescript
function isConflictError(error: unknown): boolean {
  const appError = error as any;
  return appError.code === 'conflict_detected' || 
         appError.httpStatus === 409 ||
         (appError.code && appError.code.includes('conflict'));
}
```

- [ ] **Step 2: Auto-refresh on conflict**

In `executeSyncAction`, when conflict detected:

```typescript
if (isConflictError(err)) {
  // Auto-refresh: fetch latest from backend and retry once
  console.warn(`Conflict on ${item.syncType}, auto-refreshing...`);
  
  // Fetch latest data and update localStorage
  if (item.syncType === 'task_completed') {
    const freshTask = await fetchFreshTask(item.payload.taskId);
    // Update local system with fresh data
  }
  // Similar for other types
  
  // Retry once with updated revision
  throw Object.assign(new Error('Conflict, refreshed data'), {
    code: 'conflict_refreshed',
    retryable: true,
    shouldRetryImmediately: true,
  });
}
```

- [ ] **Step 3: Show notification to user**

```typescript
// In processQueue, catch block:
if (isConflictError(err)) {
  toast.info('Data đã thay đổi ở thiết bị khác', {
    description: 'Đã tải bản mới nhất từ cloud. Thay đổi của bạn sẽ được gửi lại.',
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/features/plan12week/hooks/usePlanSyncQueue.ts
git commit -m "feat: handle 409 conflicts with auto-refresh"
```

---

## Phase 3: UI Integration

### Task 9: Add sync queue status to Settings types

**Files:**
- Modify: `src/app/components/twelve-week/TwelveWeekSettingsShared.ts`

**Steps:**

- [ ] **Step 1: Add SyncQueueStatus import type**

```typescript
import type { SyncQueueStatus } from '../../features/plan12week/hooks/usePlanSyncQueue';
```

- [ ] **Step 2: Add to TwelveWeekSettingsTabProps**

```typescript
export interface TwelveWeekSettingsTabProps {
  // ... existing fields ...
  syncQueueStatus: SyncQueueStatus | null;
  onProcessSyncQueue: () => void;
  onClearCompletedSyncs: () => void;
  onClearFailedSyncs: () => void;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/components/twelve-week/TwelveWeekSettingsShared.ts
git commit -m "feat: add sync queue status to settings props"
```

---

### Task 10: Add sync queue UI section

**Files:**
- Modify: `src/app/components/twelve-week/TwelveWeekLocalStatusSection.tsx`

**Steps:**

- [ ] **Step 1: Import usePlanSyncQueue status props**

The section already receives `pendingOutboxCount`. Add similar for sync queue.

- [ ] **Step 2: Add sync queue panel after mutation queue**

```tsx
{props.syncQueueStatus && (
  <div className="rounded-lg border border-slate-200 bg-white p-3">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          12-week sync queue
        </p>
        <p className="mt-1 text-sm text-slate-700">
          {getSyncStatusMessage(props.syncQueueStatus)}
        </p>
      </div>
      <Badge variant={getSyncStatusBadgeVariant(props.syncQueueStatus)}>
        {getSyncStatusLabel(props.syncQueueStatus)}
      </Badge>
    </div>

    {props.syncQueueStatus.queueSummary.pendingCount > 0 && (
      <div className="mt-3 grid grid-cols-4 gap-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Chờ</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">{props.syncQueueStatus.queueSummary.pendingCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Đang gửi</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">{props.syncQueueStatus.queueSummary.inFlightCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Lỗi/retry</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">{props.syncQueueStatus.queueSummary.failedOrRetryableCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Đã xong</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">{props.syncQueueStatus.queueSummary.succeededCount}</p>
        </div>
      </div>
    )}

    {props.syncQueueStatus.retryInSeconds !== null && (
      <p className="mt-2 text-xs text-slate-500">
        Thử lại trong {props.syncQueueStatus.retryInSeconds}s
      </p>
    )}

    <div className="mt-3 flex gap-2">
      <Button
        className="flex-1"
        variant="outline"
        disabled={props.syncQueueStatus.loading || props.syncQueueStatus.queueSummary.pendingCount === 0}
        onClick={props.onProcessSyncQueue}
      >
        {props.syncQueueStatus.loading ? 'Đang đồng bộ...' : 'Đồng bộ thủ công'}
      </Button>
      {props.syncQueueStatus.queueSummary.succeededCount > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={props.onClearCompletedSyncs}
        >
          Xóa đã xong
        </Button>
      )}
      {props.syncQueueStatus.queueSummary.failedOrRetryableCount > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={props.onClearFailedSyncs}
        >
          Xóa lỗi
        </Button>
      )}
    </div>
  </div>
)}
```

- [ ] **Step 3: Add helper functions**

```typescript
function getSyncStatusMessage(status: SyncQueueStatus): string {
  if (status.loading) return 'Đang đồng bộ dữ liệu 12-week...';
  if (status.lastError) return `Lỗi: ${status.lastError.message}. Sẽ tự thử lại.`;
  if (status.queueSummary.pendingCount > 0) return `Có ${status.queueSummary.pendingCount} thay đổi chờ đồng bộ.`;
  if (status.queueSummary.failedOrRetryableCount > 0) return `${status.queueSummary.failedOrRetryableCount} thay đổi lỗi, sẽ thử lại.`;
  return 'Tất cả thay đổi đã đồng bộ.';
}

function getSyncStatusLabel(status: SyncQueueStatus): string {
  if (status.loading) return 'Đang sync';
  if (status.lastError) return 'Lỗi';
  if (status.queueSummary.failedOrRetryableCount > 0) return 'Retrying';
  if (status.queueSummary.pendingCount > 0) return 'Có pending';
  return 'Idle';
}

function getSyncStatusBadgeVariant(status: SyncQueueStatus) {
  if (status.loading) return 'default';
  if (status.lastError) return 'destructive';
  if (status.queueSummary.failedOrRetryableCount > 0) return 'outline';
  return 'secondary';
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/components/twelve-week/TwelveWeekLocalStatusSection.tsx
git commit -m "feat: add sync queue UI panel to settings"
```

---

### Task 11: Wire up parent component

**Files:**
- Modify: `src/app/pages/12WeekSystemSettings.tsx` (or wherever TwelveWeekSettingsTab is used)

**Steps:**

- [ ] **Step 1: Import and use usePlanSyncQueue**

```typescript
import { usePlanSyncQueue } from '@/features/plan12week/hooks/usePlanSyncQueue';

// In component:
const syncQueue = usePlanSyncQueue({
  goalId: activeGoalId,
  system: system,
  enabled: true,
});
```

- [ ] **Step 2: Pass props to TwelveWeekSettingsTab**

```tsx
<TwelveWeekSettingsTab
  {...otherProps}
  syncQueueStatus={syncQueue.data.status}
  onProcessSyncQueue={syncQueue.actions.processQueue}
  onClearCompletedSyncs={syncQueue.actions.clearCompleted}
  onClearFailedSyncs={syncQueue.actions.clearFailed}
/>
```

- [ ] **Step 3: Commit**

```bash
git add src/app/pages/12WeekSystemSettings.tsx
git commit -m "feat: wire up sync queue to settings page"
```

---

## Phase 4: Testing & Verification

### Task 12: Run type checking

**Commands:**

```bash
npm run typecheck
```

Expected: No type errors

- [ ] **Verify typecheck passes**

---

### Task 13: Run lint

**Commands:**

```bash
npm run lint
```

Expected: No lint errors

- [ ] **Verify lint passes**

---

### Task 14: Write unit tests for syncQueueStore

**Files:**
- Create: `src/features/plan12week/persistence/syncQueueStore.test.ts`

**Steps:**

- [ ] **Step 1: Test enqueue and listPending**

```typescript
describe('syncQueueStore', () => {
  describe('enqueueSync', () => {
    it('should add new item to empty store', () => {
      const store = createEmptySyncQueueStore('goal1');
      const { item } = enqueueSync(store, {
        goalId: 'goal1',
        syncType: 'task_completed',
        payload: { taskId: 't1', completed: true },
      });
      
      expect(item).not.toBeNull();
      expect(store.items).toHaveLength(1);
      expect(store.items[0].status).toBe('pending');
    });

    it('should collapse duplicate items', () => {
      const store = createEmptySyncQueueStore('goal1');
      enqueueSync(store, {
        goalId: 'goal1',
        syncType: 'task_completed',
        entityId: 't1',
        payload: { taskId: 't1', completed: true },
      });
      enqueueSync(store, {
        goalId: 'goal1',
        syncType: 'task_completed',
        entityId: 't1',
        payload: { taskId: 't1', completed: false },
      });
      
      expect(store.items).toHaveLength(1);
      expect(store.items[0].payload).toEqual({ taskId: 't1', completed: false });
    });
  });

  describe('markSyncSucceeded', () => {
    it('should mark item as succeeded', () => {
      const store = createEmptySyncQueueStore('goal1');
      const { item } = enqueueSync(store, {
        goalId: 'goal1',
        syncType: 'task_completed',
        payload: {},
      });
      
      const nextStore = markSyncSucceeded(store, item!.id);
      const succeeded = nextStore.items.find(i => i.id === item!.id);
      
      expect(succeeded?.status).toBe('succeeded');
    });
  });

  describe('markSyncFailed', () => {
    it('should mark as retry_scheduled for retryable errors', () => {
      const store = createEmptySyncQueueStore('goal1');
      const { item } = enqueueSync(store, {
        goalId: 'goal1',
        syncType: 'task_completed',
        payload: {},
      });
      
      const nextStore = markSyncFailed(store, item!.id, {
        code: 'network_error',
        message: 'Network failed',
        retryable: true,
        lastSeenAt: new Date().toISOString(),
      });
      
      const failed = nextStore.items.find(i => i.id === item!.id);
      expect(failed?.status).toBe('retry_scheduled');
      expect(failed?.attemptCount).toBe(1);
      expect(failed?.nextRetryAt).toBeDefined();
    });

    it('should mark as failed_terminal after max attempts', () => {
      const store = createEmptySyncQueueStore('goal1');
      const { item } = enqueueSync(store, {
        goalId: 'goal1',
        syncType: 'task_completed',
        payload: {},
        maxAttempts: 3,
      });
      
      let nextStore = store;
      for (let i = 0; i < 3; i++) {
        nextStore = markSyncFailed(nextStore, item!.id, {
          code: 'error',
          message: 'Failed',
          retryable: true,
          lastSeenAt: new Date().toISOString(),
        });
      }
      
      const failed = nextStore.items.find(i => i.id === item!.id);
      expect(failed?.status).toBe('failed_terminal');
    });
  });

  describe('getRetryDelayMs', () => {
    it('should return correct delays', () => {
      expect(getRetryDelayMs(1)).toBe(2000);
      expect(getRetryDelayMs(2)).toBe(5000);
      expect(getRetryDelayMs(3)).toBe(10000);
      expect(getRetryDelayMs(4)).toBe(30000);
      expect(getRetryDelayMs(5)).toBe(60000);
    });
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm run test:run -- src/features/plan12week/persistence/syncQueueStore.test.ts
```

- [ ] **Step 3: Commit**

```bash
git add src/features/plan12week/persistence/syncQueueStore.test.ts
git commit -m "test: add syncQueueStore unit tests"
```

---

### Task 15: Manual QA verification

**Steps:**

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Go offline test**
  1. Open app, navigate to 12-week system
  2. Complete a task (should enqueue)
  3. Go offline (Chrome DevTools → Network → Offline)
  4. Complete another task
  5. Check localStorage: `localStorage.getItem('twelve_week_sync_queue:goalId')` should have items
  6. Go back online
  7. Verify queue processes automatically
  8. Verify toast appears

- [ ] **Step 3: Verify exponential backoff**
  1. Simulate server error (return 500 from API)
  2. Verify retry with increasing delays
  3. Check localStorage shows `retry_scheduled` status with `nextRetryAt`

- [ ] **Step 4: Verify conflict handling**
  1. Open same goal in two browser windows
  2. Edit same task in both
  3. Second save should get 409
  4. Verify notification appears
  5. Verify auto-refresh and retry

- [ ] **Step 5: Verify UI indicator**
  1. Check Settings tab shows sync queue section when pending > 0
  2. Verify status badges update correctly
  3. Verify "Đồng bộ thủ công" button works

- [ ] **Step 6: Test queue cleanup**
  1. Complete several syncs (status = succeeded)
  2. Manually modify `updatedAt` to be >7 days ago
  3. Reload page
  4. Verify old succeeded items cleaned up

- [ ] **Step 7: Commit any fixes**

```bash
git add .
git commit -m "fix: address QA findings"
```

---

## Final Commits

### Task 16: Final typecheck and build

**Commands:**

```bash
npm run typecheck
npm run build
```

Expected: No errors, build succeeds

- [ ] **Verify both pass**

```bash
git add .
git commit -m "chore: final typecheck and build"
```

---

### Task 17: Write changelog entry

**Files:**
- Create or update: `CHANGELOG.md` or `docs/CHANGELOG.md`

**Steps:**

- [ ] **Step 1: Add entry for sync queue improvements**

```markdown
## [Unreleased]

### Added
- Persistent sync queue with exponential backoff retry for 12-week execution sync
- Offline queuing - operations queue when offline, auto-process when online
- Sync status indicator in Settings tab showing pending/failed/succeeded counts
- Toast notifications for sync failures and successes
- Conflict detection with 409 handling and last-write-wins auto-resolution
- Queue cleanup: auto-remove succeeded items older than 7 days
- Manual sync trigger button in Settings

### Changed
- usePlanExecutionSync now uses persistent queue instead of memory-only
- All sync operations now include baseRevision for optimistic concurrency control
```

- [ ] **Step 2: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: add changelog for sync queue improvements"
```

---

## Summary

This plan implements:
1. **SyncQueueStore** - persistent queue with exponential backoff (7 attempts, up to 24h delays)
2. **usePlanSyncQueue** - React hook for queue management with auto-processing
3. **Integration** - usePlanExecutionSync now uses the queue instead of memory-only
4. **Conflict handling** - Frontend sends baseRevision, backend returns 409 on conflict, frontend auto-refreshes
5. **UI indicator** - Settings tab shows sync queue status, counts, manual trigger
6. **Toast notifications** - Non-blocking feedback for failures and recoveries
7. **Cleanup policy** - Auto-remove succeeded items >7 days, manual clear for failed

All while keeping localStorage as source of truth and non-blocking UX.

---

**Plan complete and saved to `docs/superpowers/plans/2025-05-07-sync-queue-improvements.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**