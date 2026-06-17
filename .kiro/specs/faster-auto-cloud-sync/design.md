# Design Document

## Overview

Tính năng `faster-auto-cloud-sync` thêm một cơ chế "trailing flush" vào hook `useAutoCloudSync`
(`src/features/plan12week/hooks/useAutoCloudSync.ts`). Mục tiêu: khi một lượt drain bị van rate-limit
(`Sync_Floor`) bỏ qua trong lúc vẫn còn mutation chờ, hook tự hẹn lại đúng thời điểm floor hết hiệu lực
để chạy lại drain, thay vì để pill `pending` kẹt cho tới mutation kế tiếp hoặc chu kỳ định kỳ 5 phút
(`DEFAULT_INTERVAL_MS`).

Thay đổi tuân thủ AGENTS.md: nhỏ, có kiểu (typed), tập trung vào một file, local-first, và không nới
lỏng van chống-spam backend (`DEFAULT_MIN_SYNC_INTERVAL_MS = 5000`).

### Nguyên nhân gốc

Trong `drainPendingMutations`, nhánh rate-limit thoát sớm mà không lên lịch lại:

```typescript
if (!drainOptions.bypassRateLimit && !hasElapsedSince(lastDrainStartedAtRef.current, minSyncIntervalMs)) {
  return null; // <-- thoát mà không hẹn lại lượt drain nào
}
```

Hệ quả: nếu người dùng tạo mutation rồi ngừng thao tác ngay trong cửa sổ 5 giây sau lần drain trước,
lượt drain do debounce kích hoạt bị bỏ qua và không có gì đẩy nó chạy lại cho tới sự kiện tiếp theo.

### Phạm vi

- **Trong phạm vi:** logic timer trong `useAutoCloudSync.ts`, dọn dẹp timer, test Vitest.
- **Ngoài phạm vi:** thay đổi `SyncStatusPill`, `mutationQueueSender`, hằng số sync, hay bất kỳ
  hành vi backend nào. Không đổi shape lưu trữ.

## Architecture

```text
USER_DATA_UPDATED_EVENT
        |
        v
  mutationDebounceTimerRef (1000ms)  ──► triggerDrainOnly() ──► drainPendingMutations()
                                                                      |
                                          ┌───────────────────────────┤
                                          | rate-limit chặn?          |
                                          | (chưa đủ Sync_Floor)      |
                                          v                           v
                            scheduleTrailingFlush()            chạy drain bình thường
                                          |                    (set lastDrainStartedAtRef)
                                          v
                          trailingFlushTimerRef (delay = floor - elapsed, clamp >= 0)
                                          |
                                          v  (khi timer nổ)
                          clear ref ──► triggerDrainOnly() ──► drainPendingMutations()
                                                                      |
                                          (floor đã hết) ─────────────┘──► chạy drain thật
```

Cơ chế trailing flush bám theo đúng mẫu đã có trong file:
`mutationDebounceTimerRef` và `visibilityDebounceTimerRef` — dùng `useRef<number | null>`,
lên lịch bằng `window.setTimeout`, và dọn dẹp trong cleanup của `useEffect`.

## Components and Interfaces

### 1. Ref mới

```typescript
const trailingFlushTimerRef = useRef<number | null>(null);
```

Lưu id của timer trailing flush đang chờ (hoặc `null` nếu không có). Đặt cạnh các ref timer hiện có
(`mutationDebounceTimerRef`, `visibilityDebounceTimerRef`).

### 2. Hàm helper dọn timer

```typescript
const clearTrailingFlushTimer = useCallback(() => {
  if (trailingFlushTimerRef.current !== null) {
    window.clearTimeout(trailingFlushTimerRef.current);
    trailingFlushTimerRef.current = null;
  }
}, []);
```

### 3. Hàm lên lịch trailing flush

```typescript
const scheduleTrailingFlush = useCallback(() => {
  // R5.3: không lên lịch khi chưa có user.
  if (!ownerUid) return;

  // R2.4 / R4.4: tránh timer trùng lặp — đã có timer pending thì không tạo thêm.
  if (trailingFlushTimerRef.current !== null) return;

  // R1.2 / R1.3: delay = phần còn lại của Sync_Floor, clamp >= 0.
  const elapsed = lastDrainStartedAtRef.current === null
    ? minSyncIntervalMs
    : Date.now() - lastDrainStartedAtRef.current;
  const delay = Math.max(0, minSyncIntervalMs - elapsed);

  trailingFlushTimerRef.current = window.setTimeout(() => {
    // R4.3: xóa ref khi timer nổ để cho phép lên lịch lại sau này.
    trailingFlushTimerRef.current = null;
    // R1.4 / R5.x: đi qua đúng đường dẫn drain hiện có (đã chứa mọi guard).
    void triggerDrainOnly();
  }, delay);
}, [minSyncIntervalMs, ownerUid, triggerDrainOnly]);
```

Lưu ý về `triggerDrainOnly`: nó là `useCallback(() => drainPendingMutations(), [drainPendingMutations])`.
Để tránh phụ thuộc vòng (drain → schedule → drain) trong dependency array, lệnh gọi lại bên trong timer
sẽ dùng một ref ổn định cho `triggerDrainOnly` (giống mẫu `triggerSyncNowRef` đã có):

```typescript
const triggerDrainOnlyRef = useRef<(() => Promise<MutationQueueSyncResult | null>) | null>(null);
triggerDrainOnlyRef.current = triggerDrainOnly;
```

và trong timer gọi `void triggerDrainOnlyRef.current?.();`. Cách này giữ `scheduleTrailingFlush`
không phải khai báo `triggerDrainOnly` trong deps, tránh tạo lại closure mỗi lần và đơn giản hóa cleanup.

### 4. Móc vào nhánh rate-limit của `drainPendingMutations`

```typescript
if (!drainOptions.bypassRateLimit && !hasElapsedSince(lastDrainStartedAtRef.current, minSyncIntervalMs)) {
  // R1.1: còn mutation chờ nhưng bị floor chặn → hẹn lại đúng lúc floor hết hiệu lực.
  if (currentPendingCount > 0) {
    scheduleTrailingFlush();
  }
  return null;
}
```

`currentPendingCount` đã được tính ngay phía trên trong hàm hiện tại, nên không cần đọc lại hàng chờ.
Vì các guard `drainSyncBaseReady`, `isDocumentVisible()`, `ownerUid` được kiểm ở đầu
`drainPendingMutations`, nhánh rate-limit chỉ đạt tới khi các điều kiện đó đã thỏa — và khi timer nổ,
`triggerDrainOnly` lại đi qua chính các guard đó một lần nữa (xử lý trường hợp trạng thái đổi giữa chừng,
ví dụ document chuyển hidden — R5.2).

### 5. Dọn dẹp timer

Thêm dọn dẹp vào `useEffect` quản lý vòng đời drain (effect đang lắng nghe `USER_DATA_UPDATED_EVENT_NAME`,
phụ thuộc `ownerUid`), để timer bị hủy khi unmount và khi `ownerUid` đổi:

```typescript
return () => {
  window.removeEventListener(USER_DATA_UPDATED_EVENT_NAME, handleUserDataUpdated);
  clearMutationDebounceTimer();
  clearTrailingFlushTimer(); // R4.1 (unmount), R4.2 (đổi ownerUid)
};
```

Vì effect này có `ownerUid` trong dependency array, cleanup chạy khi `ownerUid` thay đổi — thỏa R4.2.
Khi unmount, cleanup cũng chạy — thỏa R4.1.

## Data Models

Không có thay đổi shape lưu trữ. Trạng thái mới chỉ là một ref timer trong vòng đời React,
cùng kiểu với các ref timer hiện có:

```typescript
type TimerRef = React.MutableRefObject<number | null>; // id từ window.setTimeout, hoặc null
```

Các hằng số được giữ nguyên (R2.1, R5.4):

| Hằng số | Giá trị | Vai trò |
| --- | --- | --- |
| `DEFAULT_INTERVAL_MS` | `5 * 60_000` | Chu kỳ full-sync định kỳ |
| `DEFAULT_MIN_SYNC_INTERVAL_MS` | `5_000` | `Sync_Floor` — khoảng tối thiểu giữa hai lần drain |
| `DEFAULT_MUTATION_DEBOUNCE_MS` | `1_000` | Debounce sau mutation |
| `RECONNECT_DEBOUNCE_MS` | `3_000` | Debounce khi reconnect |
| `VISIBILITY_SYNC_STALE_MS` | `60_000` | Ngưỡng stale khi tab hiện lại |

## Error Handling

- **Trạng thái đổi giữa lúc hẹn và lúc nổ:** timer luôn gọi qua `triggerDrainOnly` →
  `drainPendingMutations`, nơi đã kiểm `drainSyncBaseReady`, `isDocumentVisible()`, `ownerUid`,
  và `currentPendingCount <= 0`. Nếu điều kiện không còn thỏa, drain trả `null` an toàn (R5.1, R5.2).
- **Floor vẫn chưa hết khi timer nổ (sai số timer):** kiểm tra `hasElapsedSince` trong
  `drainPendingMutations` vẫn áp dụng; nếu chưa đủ floor, drain lại bị bỏ qua và (nếu còn pending)
  hẹn lại một trailing flush mới (R2.3).
- **Nhiều lần rate-limit liên tiếp:** guard `trailingFlushTimerRef.current !== null` đảm bảo tối đa
  một timer pending (R2.4), nên không tạo ra bùng nổ timer hay drain trùng (R4.4).
- **Rò rỉ bộ nhứ:** cleanup hủy timer khi unmount/đổi user (R4.1, R4.2); timer tự xóa ref khi nổ (R4.3).

## Testing Strategy

### Cách tiếp cận kép

- **Property test:** kiểm các invariant phổ quát qua nhiều mốc thời gian/chuỗi trigger sinh ngẫu nhiên.
- **Unit/example test:** kiểm các hành vi cụ thể, edge case, cleanup và hằng số.

Test dùng **Vitest với fake timers** (`vi.useFakeTimers()`), mock `sendPending12WeekMutations`
để ghi lại thời điểm và số lần gọi backend mà không chạm mạng thật, đúng tinh thần
"không spam backend" và "mock cho PBT" trong AGENTS.md.

### Cấu hình property test

- Tối thiểu 100 vòng lặp mỗi property (do sinh ngẫu nhiên).
- Mỗi property test tham chiếu property tương ứng trong tài liệu này.
- Định dạng tag: **Feature: faster-auto-cloud-sync, Property {number}: {property_text}**.

### Unit/example test cần có

- Timer nổ gọi đúng đường dẫn `triggerDrainOnly` (R1.4).
- `pendingCount` về 0 sau khi trailing flush gửi thành công (R3.1, R3.3).
- Cleanup khi unmount không để drain chạy (R4.1).
- Cleanup khi đổi `ownerUid` không drain nhầm cho user cũ (R4.2).
- Các hằng số giữ nguyên giá trị (R2.1, R5.4) — smoke assert.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Trailing flush chạy đúng tại thời điểm floor hết hiệu lực

*For any* trạng thái mà một lượt drain bị rate-limit bỏ qua trong khi `pendingCount > 0`, với mọi
khoảng thời gian đã trôi `elapsed` kể từ lần drain trước (`0 <= elapsed < minSyncIntervalMs`), hook
SHALL lên lịch một trailing flush sao cho khi đồng hồ tiến thêm đúng `max(0, minSyncIntervalMs - elapsed)`
ms thì drain được chạy lại; tiến ít hơn lượng đó thì drain chưa chạy lại.

**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: Bất biến van chống-spam backend (Sync_Floor)

*For any* chuỗi sự kiện mutation và trigger drain phát sinh tại các mốc thời gian bất kỳ, hai lần gọi
backend (`sendPending12WeekMutations`) liên tiếp do hook tạo ra SHALL luôn cách nhau ít nhất
`minSyncIntervalMs` ms — kể cả khi lần drain được kích hoạt bởi trailing flush timer.

**Validates: Requirements 2.2, 2.3**

### Property 3: Tối đa một trailing timer và có thể lên lịch lại qua các chu kỳ

*For any* số lần drain bị rate-limit liên tiếp trong cùng một cửa sổ floor, tại mọi thời điểm hook SHALL
có tối đa một trailing flush timer đang chờ (chỉ sinh ra một lượt drain bổ sung, không phải nhiều lượt);
và sau khi một trailing flush đã nổ, một lần rate-limit ở chu kỳ floor kế tiếp SHALL lại lên lịch được
một timer mới.

**Validates: Requirements 2.4, 4.3, 4.4**

### Property 4: Bất biến điều kiện sẵn sàng (guard)

*For any* trạng thái mà `drainSyncBaseReady` không thỏa, hoặc document đang ẩn, hoặc `ownerUid` là null,
trailing flush SHALL không bao giờ gọi `sendPending12WeekMutations`; và khi `ownerUid` là null, hook
SHALL không lên lịch trailing flush timer.

**Validates: Requirements 5.1, 5.2, 5.3**
