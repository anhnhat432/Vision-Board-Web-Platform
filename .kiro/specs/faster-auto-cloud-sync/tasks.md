# Implementation Plan: faster-auto-cloud-sync

## Overview

Thêm cơ chế "trailing flush" vào hook `useAutoCloudSync`
(`src/features/plan12week/hooks/useAutoCloudSync.ts`): khi một lượt drain bị van rate-limit
(`Sync_Floor`) bỏ qua trong lúc vẫn còn mutation chờ, hook tự hẹn lại đúng thời điểm floor hết
hiệu lực để chạy lại drain. Toàn bộ thay đổi mã nguồn gói gọn trong một file, có kiểu (typed),
giữ nguyên mọi hằng số sync và không nới lỏng van chống-spam backend.

Ngôn ngữ triển khai: TypeScript (React 18 + Vitest), khớp với thiết kế và stack hiện có.

Các bước được sắp xếp tăng dần: dựng hạ tầng timer → lên lịch → móc vào nhánh rate-limit →
dọn dẹp → kiểm thử → checkpoint xác minh. Không trộn refactor không liên quan.

## Tasks

- [x] 1. Thêm cơ chế trailing flush vào `useAutoCloudSync.ts`
  - [x] 1.1 Thêm ref timer, helper dọn timer và ref ổn định cho drain
    - Khai báo `const trailingFlushTimerRef = useRef<number | null>(null);` đặt cạnh
      `mutationDebounceTimerRef` và `visibilityDebounceTimerRef`
    - Thêm helper `clearTrailingFlushTimer` (useCallback) hủy `window.clearTimeout` và reset ref về `null`
    - Thêm `triggerDrainOnlyRef = useRef<(() => Promise<MutationQueueSyncResult | null>) | null>(null)`
      và gán `triggerDrainOnlyRef.current = triggerDrainOnly;` ngay sau khi `triggerDrainOnly` được tạo
      (theo mẫu `triggerSyncNowRef`), để tránh phụ thuộc vòng trong dependency array
    - _Requirements: 4.3_

  - [x] 1.2 Thêm hàm `scheduleTrailingFlush`
    - Tạo `scheduleTrailingFlush` bằng `useCallback`, deps `[minSyncIntervalMs, ownerUid]`
      (gọi qua `triggerDrainOnlyRef.current`, không đưa `triggerDrainOnly` vào deps)
    - Guard `if (!ownerUid) return;` (không lên lịch khi chưa có user)
    - Guard `if (trailingFlushTimerRef.current !== null) return;` (tránh timer trùng lặp)
    - Tính `elapsed` từ `lastDrainStartedAtRef.current` (null ⇒ coi như `minSyncIntervalMs`),
      `delay = Math.max(0, minSyncIntervalMs - elapsed)`
    - `window.setTimeout`: trong callback xóa `trailingFlushTimerRef.current = null` trước,
      rồi `void triggerDrainOnlyRef.current?.();`
    - _Requirements: 1.2, 1.3, 1.4, 2.4, 4.3, 4.4, 5.3_

  - [x] 1.3 Móc `scheduleTrailingFlush` vào nhánh rate-limit của `drainPendingMutations`
    - Trong nhánh `if (!drainOptions.bypassRateLimit && !hasElapsedSince(...))`: trước `return null`,
      nếu `currentPendingCount > 0` thì gọi `scheduleTrailingFlush()`
    - Thêm `scheduleTrailingFlush` vào dependency array của `drainPendingMutations`
    - Không thay đổi các guard `drainSyncBaseReady` / `isDocumentVisible()` / `ownerUid` đã có ở đầu hàm
    - _Requirements: 1.1, 2.2, 2.3, 5.1, 5.2_

  - [x] 1.4 Dọn dẹp trailing flush timer trong `useEffect` quản lý drain
    - Trong cleanup của `useEffect` lắng nghe `USER_DATA_UPDATED_EVENT_NAME` (deps có `ownerUid`),
      gọi `clearTrailingFlushTimer()` cùng với `clearMutationDebounceTimer()`
    - Bổ sung `clearTrailingFlushTimer` vào dependency array của effect đó
    - Xác nhận hằng số `DEFAULT_MIN_SYNC_INTERVAL_MS`, `DEFAULT_MUTATION_DEBOUNCE_MS`,
      `RECONNECT_DEBOUNCE_MS`, `VISIBILITY_SYNC_STALE_MS`, `DEFAULT_INTERVAL_MS` giữ nguyên giá trị
    - _Requirements: 4.1, 4.2, 2.1, 5.4_

- [x] 2. Viết test Vitest cho trailing flush
  - [x] 2.1 Dựng harness test + Property 1
    - Tạo file test cạnh hook, dùng `vi.useFakeTimers()` và mock `sendPending12WeekMutations`
      để ghi lại thời điểm + số lần gọi backend (không chạm mạng thật)
    - **Feature: faster-auto-cloud-sync, Property 1: Trailing flush chạy đúng tại thời điểm floor hết hiệu lực**
    - Sinh ngẫu nhiên `elapsed` trong `[0, minSyncIntervalMs)` (≥100 vòng); xác nhận drain chỉ chạy
      lại sau khi đồng hồ tiến đúng `max(0, minSyncIntervalMs - elapsed)` ms, tiến ít hơn thì chưa chạy
    - **Validates: Requirements 1.1, 1.2, 1.3**

  - [x] 2.2 Property 2 — bất biến van chống-spam backend
    - **Feature: faster-auto-cloud-sync, Property 2: Bất biến van chống-spam backend (Sync_Floor)**
    - Sinh ngẫu nhiên chuỗi mutation/trigger tại các mốc thời gian (≥100 vòng); xác nhận hai lần gọi
      `sendPending12WeekMutations` liên tiếp luôn cách nhau ≥ `minSyncIntervalMs`, kể cả khi do trailing flush
    - **Validates: Requirements 2.2, 2.3**

  - [x] 2.3 Property 3 — tối đa một trailing timer và lên lịch lại được qua các chu kỳ
    - **Feature: faster-auto-cloud-sync, Property 3: Tối đa một trailing timer và có thể lên lịch lại qua các chu kỳ**
    - Sinh ngẫu nhiên số lần rate-limit liên tiếp trong cùng cửa sổ floor (≥100 vòng); xác nhận chỉ
      sinh thêm tối đa một lượt drain bổ sung, và sau khi trailing flush nổ thì chu kỳ floor kế tiếp
      lại lên lịch được timer mới
    - **Validates: Requirements 2.4, 4.3, 4.4**

  - [x] 2.4 Property 4 — bất biến điều kiện sẵn sàng (guard)
    - **Feature: faster-auto-cloud-sync, Property 4: Bất biến điều kiện sẵn sàng (guard)**
    - Sinh ngẫu nhiên trạng thái `drainSyncBaseReady` false / document hidden / `ownerUid` null (≥100 vòng);
      xác nhận trailing flush không bao giờ gọi `sendPending12WeekMutations`, và khi `ownerUid` null thì
      không lên lịch timer
    - **Validates: Requirements 5.1, 5.2, 5.3**

  - [x] 2.5 Unit test — timer nổ gọi đúng đường dẫn và pending về 0
    - Timer nổ gọi lại drain qua `triggerDrainOnly` (R1.4)
    - Sau khi trailing flush gửi thành công, `pendingCount` về 0 và không cần `triggerSyncNow` thủ công
    - _Requirements: 1.4, 3.1, 3.3_

  - [x] 2.6 Unit test — cleanup khi unmount và khi đổi `ownerUid`
    - Unmount khi đang có trailing timer chờ ⇒ không có drain chạy sau đó (R4.1)
    - Đổi `ownerUid` ⇒ hủy timer của user cũ, không drain nhầm cho user cũ (R4.2)
    - _Requirements: 4.1, 4.2_

  - [x] 2.7 Unit test — smoke assert hằng số giữ nguyên
    - Khẳng định `DEFAULT_MIN_SYNC_INTERVAL_MS === 5000` và các hằng số debounce/stale/interval không đổi
    - _Requirements: 2.1, 5.4_

- [x] 3. Checkpoint — xác minh
  - Chạy `npm run typecheck`, `npm run lint`, `npm run test:run`; đảm bảo mọi test pass,
    ask the user if questions arise.

## Notes

- Các sub-task gắn `*` là test, có thể bỏ qua cho MVP nhanh nhưng nên chạy để đảm bảo đúng đắn.
- Toàn bộ thay đổi mã nguồn chỉ nằm trong `src/features/plan12week/hooks/useAutoCloudSync.ts`;
  test nằm trong file test cạnh hook.
- Repo chưa có `fast-check`; property test dùng vòng lặp ngẫu nhiên (≥100 vòng) trong Vitest để
  tránh thêm dependency theo AGENTS.md.
- Mỗi property test tham chiếu trực tiếp một property trong design; mỗi task tham chiếu sub-requirement cụ thể.
- Checkpoint đảm bảo kiểm chứng tăng dần, không trộn refactor không liên quan.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3"] },
    { "id": 3, "tasks": ["1.4"] },
    { "id": 4, "tasks": ["2.1"] },
    { "id": 5, "tasks": ["2.2"] },
    { "id": 6, "tasks": ["2.3"] },
    { "id": 7, "tasks": ["2.4"] },
    { "id": 8, "tasks": ["2.5"] },
    { "id": 9, "tasks": ["2.6"] },
    { "id": 10, "tasks": ["2.7"] }
  ]
}
```
