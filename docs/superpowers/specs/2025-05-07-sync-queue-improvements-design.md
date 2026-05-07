# Thiết kế Sync Queue cho 12-Week Execution Sync

**Ngày:** 2026-05-07  
**Mục tiêu:** Cải thiện reliability của `usePlanExecutionSync` bằng cách thêm persistent queue với exponential backoff retry

---

## Tổng quan

`usePlanExecutionSync` hiện tại dùng internal memory-only queue (`enqueueSync`) - khi app crash hoặc offline, các sync operations bị mất. Mục tiêu là tạo `SyncQueue` riêng biệt, persistent, với:

- Exponential backoff retry (3-5 lần)
- Offline queuing
- Auto-retry khi online hoặc app focus
- UI status indicator
- Toast notifications cho lỗi
- Queue cleanup policy

---

## Kiến trúc

### 1. SyncQueue Store (`src/features/plan12week/persistence/syncQueueStore.ts`)

**Types:**

```typescript
type SyncStatus = 'pending' | 'in_flight' | 'retry_scheduled' | 'failed_terminal' | 'succeeded';

interface SyncQueueItem {
  id: string;
  collapseKey: string;
  status: SyncStatus;
  goalId: string;
  syncType: SyncType;
  entityId?: string;
  entityType?: 'task' | 'checkin' | 'review' | 'plan';
  payload: unknown;
  createdAt: string;
  updatedAt: string;
  nextRetryAt?: string;
  attemptCount: number;
  maxAttempts: number;
  error?: SyncError;
}

interface SyncQueueStore {
  version: number;
  goalId: string;
  updatedAt: string;
  items: SyncQueueItem[];
  lastDrainStartedAt?: string;
  lastDrainFinishedAt?: string;
}

interface SyncError {
  code: string;
  message: string;
  retryable: boolean;
  lastSeenAt: string;
}
```

**SyncType enum:**
```typescript
type SyncType =
  | 'task_completed'
  | 'daily_checkin'
  | 'weekly_review'
  | 'plan_snapshot'
  | 'metric_upsert';
```

**Constants:**
```typescript
const MAX_QUEUE_SIZE = 1000;
const RETENTION_DAYS = 7;
const DEFAULT_MAX_ATTEMPTS = 7; // Khớp với mutationQueue
const RETRY_DELAYS_MS = [2000, 5000, 10000, 30000, 60000, 86400000, 86400000]; // Thêm 24h cho lần 6-7
```

**API:**

- `readSyncQueueStore(goalId, options)` → `SyncQueueStore`
- `writeSyncQueueStore(store, options)` → `boolean`
- `enqueueSync(store, input, options)` → `{store, item}`
- `listPendingSyncs(store, options)` → `SyncQueueItem[]`
- `markSyncInFlight(store, mutationId, options)` → `SyncQueueStore`
- `markSyncSucceeded(store, mutationId, options)` → `SyncQueueStore`
- `markSyncFailed(store, mutationId, error, options)` → `SyncQueueStore`
- `compactSyncs(store, options)` → `SyncQueueStore` (dedup)
- `cleanupOldSyncs(store, cutoffDate)` → `{store, removedCount}`
- `getSyncQueueSummary(store)` → `{total, pending, inFlight, failed, succeeded}`

**Storage key:** `twelve_week_sync_queue:{goalId}`

**CollapseKey logic:**
```typescript
function getCollapseKey(input: EnqueueSyncInput): string {
  switch (input.syncType) {
    case 'task_completed':
      return `task:${input.goalId}:${input.entityId}`;
    case 'daily_checkin':
      return `checkin:${input.goalId}:${input.payload.date}`;
    case 'weekly_review':
      return `review:${input.goalId}:${input.payload.weekNumber}`;
    case 'plan_snapshot':
      return `plan:${input.goalId}`;
    case 'metric_upsert':
      return `metric:${input.goalId}:${input.payload.weekNumber}:${input.payload.metricName}`;
  }
}
```

### 2. Integration với `usePlanExecutionSync`

**Thay đổi trong `usePlanExecutionSync.ts`:**

- Remove internal `syncQueueRef` và `enqueueSync` function
- Tạo `syncQueueStore` state với `useState<SyncQueueStore>()`
- Load queue từ localStorage khi component mount
- Wrap các sync actions (`syncTaskToggle`, `syncDailyCheckIn`, `syncWeeklyReview`, `syncLocalSnapshot`) bằng `enqueueToSyncQueue()`
- `enqueueToSyncQueue(syncType, payload)` → returns `Promise<boolean>`
- `processQueue()` method: lấy pending items, thực thi theo thứ tự, update status
- Trên success → `markSyncSucceeded` và remove item
- Trên failure → `markSyncFailed` với retry logic

**Queue Processor:**

```typescript
const processQueue = useCallback(async () => {
  if (!enabled || !goalId || isDemoMode()) return;

  const store = readSyncQueueStore(goalId);
  const pending = listPendingSyncs(store);

  if (pending.length === 0) return;

  setSyncQueueLoading(true);

  for (const item of pending) {
    if (!shouldProcessNow(item)) continue;

    const newStore = markSyncInFlight(store, item.id, { now });
    writeSyncQueueStore(newStore);

    try {
      await executeSync(item); // gọi existing sync logic
      const afterSuccessStore = markSyncSucceeded(newStore, item.id, { now });
      writeSyncQueueStore(afterSuccessStore);
      setSyncQueueStore(afterSuccessStore);
    } catch (error) {
      const failure = getFailureInput(error);
      const afterFailStore = markSyncFailed(newStore, item.id, failure, {
        now,
        nextRetryAt: failure.retryable ? getNextRetryAt(now, item.attemptCount) : undefined,
      });
      writeSyncQueueStore(afterFailStore);
      setSyncQueueStore(afterFailStore);
    }
  }

  setSyncQueueLoading(false);
}, [goalId, enabled]);
```

**Auto-trigger:**
- Khi `useNetworkStatus` báo `online` (debounce 3s)
- Khi app focus (`window.addEventListener('focus')`)
- Throttle để tránh chạy quá nhiều lần

### 3. Network-aware Retry

Sử dụng `useNetworkStatus` hook có sẵn:

```typescript
const { isOnline, status } = useNetworkStatus({
  onReconnect: () => {
    // Debounce 3s, sau đó process queue
    scheduleQueueProcess(3000);
  },
  reconnectDebounceMs: 3000,
});
```

- Offline → queue operations, không gọi API
- Online → auto-process pending queue
- Focus event → schedule queue process

### 4. UI Status Indicator

**Thêm vào `TwelveWeekSettingsShared.ts`:**

```typescript
interface TwelveWeekSyncQueueStatus {
  loading: boolean;
  goalId: string | null;
  queueSummary: {
    totalCount: number;
    pendingCount: number;
    inFlightCount: number;
    failedOrRetryableCount: number;
    succeededCount: number;
    lastDrainStartedAt: string | null;
    lastDrainFinishedAt: string | null;
  };
  lastError: { message: string; code: string } | null;
  retryInSeconds: number | null;
}
```

**Trong `TwelveWeekLocalStatusSection.tsx`:**

Thêm section "Đồng bộ 12-week" sau mutation queue section:

```tsx
{goalId && (
  <div className="rounded-lg border border-slate-200 bg-white p-3">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          12-week sync queue
        </p>
        <p className="mt-1 text-sm text-slate-700">
          {getSyncStatusMessage(syncQueueStatus)}
        </p>
      </div>
      <Badge variant={getSyncStatusBadgeVariant(syncQueueStatus)}>
        {getSyncStatusLabel(syncQueueStatus)}
      </Badge>
    </div>

    {syncQueueStatus.queueSummary.pendingCount > 0 && (
      <div className="mt-3 grid grid-cols-4 gap-2">
        <StatBox label="Chờ" value={syncQueueStatus.queueSummary.pendingCount} />
        <StatBox label="Đang gửi" value={syncQueueStatus.queueSummary.inFlightCount} />
        <StatBox label="Lỗi/retry" value={syncQueueStatus.queueSummary.failedOrRetryableCount} />
        <StatBox label="Đã xong" value={syncQueueStatus.queueSummary.succeededCount} />
      </div>
    )}

    {syncQueueStatus.retryInSeconds !== null && (
      <p className="mt-2 text-xs text-slate-500">
        Thử lại trong {syncQueueStatus.retryInSeconds}s
      </p>
    )}

    <Button
      className="mt-3 w-full"
      variant="outline"
      disabled={syncQueueStatus.loading || !canProcessQueue}
      onClick={onProcessSyncQueue}
    >
      {syncQueueStatus.loading ? 'Đang đồng bộ...' : 'Đồng bộ thủ công'}
    </Button>
  </div>
)}
```

**Helper functions:**
```typescript
function getSyncStatusMessage(status: TwelveWeekSyncQueueStatus): string {
  if (status.loading) return 'Đang đồng bộ dữ liệu 12-week...';
  if (status.lastError) return `Lỗi: ${status.lastError.message}. Sẽ tự thử lại.`;
  if (status.queueSummary.pendingCount > 0) return `Có ${status.queueSummary.pendingCount} thay đổi chờ đồng bộ.`;
  if (status.queueSummary.failedOrRetryableCount > 0) return `${status.queueSummary.failedOrRetryableCount} thay đổi lỗi, sẽ thử lại.`;
  return 'Tất cả thay đổi đã đồng bộ.';
}

function getSyncStatusLabel(status: TwelveWeekSyncQueueStatus): string {
  if (status.loading) return 'Đang sync';
  if (status.lastError) return 'Lỗi';
  if (status.queueSummary.failedOrRetryableCount > 0) return 'Retrying';
  if (status.queueSummary.pendingCount > 0) return 'Có pending';
  return 'Idle'; // Không hiển thị nếu không có gì
}

function getSyncStatusBadgeVariant(status: TwelveWeekSyncQueueStatus) {
  if (status.loading) return 'default';
  if (status.lastError) return 'destructive';
  if (status.queueSummary.failedOrRetryableCount > 0) return 'outline';
  return 'secondary';
}
```

**Chỉ hiển thị khi:**
- `loading === true` OR
- `queueSummary.pendingCount > 0` OR
- `queueSummary.failedOrRetryableCount > 0` OR
- `lastError !== null`

### 5. Toast Notifications

**Dùng `sonner` có sẵn:**

```typescript
import { toast } from 'sonner';

// Trong processQueue, khi có lỗi đầu tiên trong batch:
toast.error('Sync failed, sẽ thử lại sau 30s', {
  description: error.message,
  duration: 4500, // Khớp với sonner config
});

// Khi batch hoàn thành có succeeded items (sau khi trước đó có fail):
toast.success('Đã đồng bộ dữ liệu 12-week', {
  description: `${succeededCount} thay đổi đã được đồng bộ.`,
  duration: 4500,
});
```

**Trigger points:**
- Lỗi đầu tiên trong batch → toast error
- Batch hoàn thành có succeeded items (sau khi trước đó có fail) → toast success
- Không toast cho mỗi item

### 6. Cleanup Policy

**Auto-cleanup (trigger mỗi lần read/write queue):**

- Remove `succeeded` items older than RETENTION_DAYS (7 ngày)
- Keep `failed_terminal` items indefinitely (để user debug)
- Nếu `items.length > MAX_QUEUE_SIZE`, compaction giữ lại newest 500 items

**Manual cleanup:**
- Thêm button "Xóa lịch sử sync" trong Settings
- Xóa tất cả items ngoại trừ `pending`/`in_flight` (giữ lại `failed_terminal` để debug)

**Queue size limit:**
- Compaction khi write nếu queue vượt quá MAX_QUEUE_SIZE
- Giữ lại newest items theo `updatedAt`
- Log warning khi compaction xảy ra

### 7. Race Condition Prevention

**Goal switching:**
- Mỗi goalId có queue riêng (storage key phân biệt)
- Component instance chỉ xử lý queue của `goalId` hiện tại
- Khi `goalId` thay đổi: unload queue cũ, load queue mới

**Concurrent operations:**
- `collapseKey` đảm bảo duplicate operations trên cùng entity được collapse
- `enqueueSync` check existing pending/in_flight items với cùng `collapseKey`
- Nếu có pending → update payload (latest wins)
- Nếu có in_flight → không enqueue thêm (đợi result)

**Component unmount:**
- Không auto-cleanup queue (persistence là mục tiêu)
- Chỉ xóa state local, queue vẫn trong localStorage
- Tuy nhiên, nếu component remount với cùng `goalId`, load lại queue

---

## Implementation Plan

### Phase 1: Core SyncQueue Store

1. Tạo `src/features/plan12week/persistence/syncQueueStore.ts`
   - Types & constants
   - Storage functions (read/write)
   - Queue operations (enqueue, list, mark status, compact, cleanup)
   - ID generation & collapse key

### Phase 2: Sync Processor

2. Tạo `src/features/plan12week/hooks/usePlanSyncQueue.ts`
   - Load queue cho goalId
   - `processQueue()` function với sequential execution
   - Network status integration
   - Auto-trigger on reconnect/focus

3. Update `usePlanExecutionSync.ts`
   - Replace internal queue với syncQueueStore
   - Wrap all sync actions với `enqueueAndProcess()`
   - Expose `syncQueueStatus` trong return value

### Phase 3: UI Integration

4. Update `TwelveWeekSettingsShared.ts`
   - Add `syncQueueStatus` to props

5. Update `TwelveWeekLocalStatusSection.tsx`
   - Add 12-week sync queue section
   - Status badges & stats
   - Manual trigger button

6. Add toast notifications
   - Import sonner
   - Trigger on first failure in batch
   - Trigger on batch success after failures

### Phase 4: Testing & Verification

7. Write unit tests:
   - `syncQueueStore.test.ts`: enqueue, compact, cleanup, retry delays
   - `usePlanSyncQueue.test.ts`: processor logic, network handling

8. Manual QA:
   - Go offline → make changes → come online → verify auto-retry
   - Check localStorage persistence
   - Verify collapseKey deduplication
   - Verify queue cleanup

---

## Success Criteria

✅ Exponential backoff: 2s → 5s → 10s → 30s → 60s (max 5 attempts)  
✅ Queue persisted in localStorage  
✅ Offline operations queued successfully  
✅ Auto-retry on reconnect/focus  
✅ UI status indicator shows "Đang sync" / "Lỗi" / pending counts  
✅ Toast error khi sync fail, toast success khi retry thành công  
✅ CollapseKey deduplication hoạt động  
✅ Queue cleanup: succeeded >7 ngày auto-removed, failed_terminal giữ lại  
✅ localStorage remains source of truth throughout

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Queue corruption | Versioned storage + recovery backup |
| Memory blowup | MAX_QUEUE_SIZE limit + compaction |
| Infinite retry loop | MaxAttempts = 5, then failed_terminal |
| Race with goal switch | Isolated queues per goalId |
| UI clutter | Only show when pending/failed > 0 |

---

## Migration Path

1. Backfill: Khi deploy, existing `usePlanExecutionSync` chuyển từ memory queue → syncQueueStore
2. No data migration cần thiết (queue là mới)
3. Old memory queue items sẽ mất (acceptable vì đang pending chưa sync)

---

## Open Questions

None - ready for implementation.
