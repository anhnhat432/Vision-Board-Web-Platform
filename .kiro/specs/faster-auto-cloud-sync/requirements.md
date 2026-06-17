# Requirements Document

## Introduction

Tính năng `faster-auto-cloud-sync` cải thiện độ trễ hiển thị trạng thái sao lưu của `useAutoCloudSync` trong luồng 12-Week Plan. Hiện tại khi người dùng ngừng thao tác, pill trạng thái `pending` ("Đã lưu trên thiết bị này. Chưa sao lưu") có thể kẹt cho tới mutation kế tiếp hoặc tới chu kỳ định kỳ 5 phút (`DEFAULT_INTERVAL_MS`), vì `drainPendingMutations` trả về `null` mà không lên lịch lại khi bị van rate-limit (`DEFAULT_MIN_SYNC_INTERVAL_MS = 5000`) chặn.

Giải pháp đã chốt là thêm một "trailing flush" timer: khi một lượt drain bị rate-limit bỏ qua, hook tự hẹn lại đúng thời điểm hết floor để chạy lại drain. Van chống-spam 5 giây giữa hai lần gọi backend được giữ nguyên. Thay đổi phải nhỏ, có kiểu (typed), tập trung vào file `src/features/plan12week/hooks/useAutoCloudSync.ts`, kèm test Vitest, và không phá cơ chế chống quá tải backend.

## Glossary

- **AutoCloudSync_Hook**: Hook `useAutoCloudSync` tại `src/features/plan12week/hooks/useAutoCloudSync.ts` quản lý đồng bộ tự động lên cloud.
- **Drain_Operation**: Hàm `drainPendingMutations` (và `triggerDrainOnly`) gửi các mutation đang chờ trong hàng chờ lên backend.
- **Sync_Floor**: Khoảng thời gian tối thiểu giữa hai lần bắt đầu drain, định nghĩa bởi `minSyncIntervalMs` (mặc định `DEFAULT_MIN_SYNC_INTERVAL_MS = 5000` ms).
- **Trailing_Flush_Timer**: Bộ hẹn giờ mới được thêm vào, dùng để chạy lại Drain_Operation ngay khi Sync_Floor hết hiệu lực sau một lượt bị rate-limit bỏ qua.
- **Pending_Count**: Giá trị `pendingCount` của AutoCloudSync_Hook, là số mutation đang chờ gửi lên backend.
- **Status_Pill**: Thành phần `SyncStatusPill` hiển thị trạng thái `pending` khi `Pending_Count > 0`.
- **Owner_Uid**: Giá trị `ownerUid` (uid người dùng đã đăng nhập) mà AutoCloudSync_Hook đang phục vụ.
- **Mutation_Debounce**: Khoảng debounce sau khi dữ liệu thay đổi trước khi gọi drain, định nghĩa bởi `mutationDebounceMs` (mặc định `DEFAULT_MUTATION_DEBOUNCE_MS = 1000` ms).
- **Rate_Limited_Drain**: Lượt Drain_Operation bị bỏ qua vì `hasElapsedSince(lastDrainStartedAtRef.current, minSyncIntervalMs)` trả về false.

## Requirements

### Requirement 1: Tự lên lịch lại drain sau khi bị rate-limit

**User Story:** Là người dùng đã đăng nhập đang chỉnh sửa kế hoạch 12 tuần, tôi muốn các thay đổi của mình tự động được sao lưu ngay sau khi tôi ngừng thao tác, để tôi không phải bấm "Sao lưu ngay".

#### Acceptance Criteria

1. WHEN một lượt Drain_Operation bị bỏ qua do Rate_Limited_Drain trong khi Pending_Count lớn hơn 0, THE AutoCloudSync_Hook SHALL lên lịch một Trailing_Flush_Timer để chạy lại Drain_Operation.
2. THE Trailing_Flush_Timer SHALL được đặt để kích hoạt tại thời điểm Sync_Floor hết hiệu lực, tính bằng `minSyncIntervalMs - (Date.now() - lastDrainStartedAtRef.current)` ms kể từ thời điểm bị rate-limit.
3. IF giá trị độ trễ tính được cho Trailing_Flush_Timer nhỏ hơn hoặc bằng 0, THEN THE AutoCloudSync_Hook SHALL lên lịch Trailing_Flush_Timer với độ trễ 0 ms.
4. WHEN Trailing_Flush_Timer kích hoạt, THE AutoCloudSync_Hook SHALL gọi lại Drain_Operation thông qua đường dẫn `triggerDrainOnly` hiện có.

### Requirement 2: Giữ nguyên van chống-spam backend

**User Story:** Là người vận hành hệ thống, tôi muốn cơ chế chống quá tải backend được giữ nguyên, để việc sao lưu nhanh hơn không tạo ra spam request lên backend.

#### Acceptance Criteria

1. THE AutoCloudSync_Hook SHALL giữ nguyên giá trị `DEFAULT_MIN_SYNC_INTERVAL_MS` bằng 5000 ms.
2. THE AutoCloudSync_Hook SHALL duy trì khoảng cách tối thiểu bằng Sync_Floor giữa hai lần bắt đầu Drain_Operation gọi tới backend.
3. WHEN Trailing_Flush_Timer kích hoạt trước khi Sync_Floor hết hiệu lực, THE Drain_Operation SHALL tiếp tục bị bỏ qua theo kiểm tra rate-limit hiện có.
4. WHILE đã có một Trailing_Flush_Timer đang chờ kích hoạt, THE AutoCloudSync_Hook SHALL tránh tạo thêm một Trailing_Flush_Timer trùng lặp.

### Requirement 3: Ẩn pill pending nhanh sau khi ngừng thao tác

**User Story:** Là người dùng đã đăng nhập, tôi muốn pill trạng thái pending biến mất nhanh sau khi tôi ngừng thao tác, để tôi yên tâm rằng dữ liệu đã được sao lưu.

#### Acceptance Criteria

1. WHEN tất cả mutation đang chờ được gửi thành công lên backend, THE AutoCloudSync_Hook SHALL cập nhật Pending_Count về 0.
2. WHILE Pending_Count bằng 0, THE Status_Pill SHALL không hiển thị trạng thái pending.
3. WHEN người dùng ngừng thao tác và không có mutation mới phát sinh, THE AutoCloudSync_Hook SHALL hoàn tất việc gửi các mutation đang chờ mà không cần người dùng kích hoạt thủ công `triggerSyncNow`.

### Requirement 4: Dọn dẹp timer khi unmount hoặc đổi người dùng

**User Story:** Là lập trình viên bảo trì hook, tôi muốn các timer được dọn dẹp đúng cách, để tránh rò rỉ bộ nhớ và tránh chạy drain trùng lặp khi đổi tài khoản.

#### Acceptance Criteria

1. WHEN AutoCloudSync_Hook bị unmount, THE AutoCloudSync_Hook SHALL hủy Trailing_Flush_Timer đang chờ kích hoạt.
2. WHEN giá trị Owner_Uid thay đổi, THE AutoCloudSync_Hook SHALL hủy Trailing_Flush_Timer đang chờ kích hoạt thuộc về Owner_Uid trước đó.
3. WHEN một Trailing_Flush_Timer kích hoạt, THE AutoCloudSync_Hook SHALL xóa tham chiếu tới timer đó để cho phép lên lịch một timer mới sau này.
4. IF AutoCloudSync_Hook lên lịch một Trailing_Flush_Timer mới trong khi đã tồn tại một timer đang chờ, THEN THE AutoCloudSync_Hook SHALL hủy timer cũ trước khi lưu tham chiếu tới timer mới.

### Requirement 5: Tôn trọng điều kiện sẵn sàng đồng bộ hiện có

**User Story:** Là người dùng ở chế độ demo hoặc đang offline, tôi muốn hành vi trailing flush không phá vỡ các điều kiện an toàn đồng bộ hiện có, để hệ thống không gọi backend khi chưa đủ điều kiện.

#### Acceptance Criteria

1. IF điều kiện `drainSyncBaseReady` không thỏa mãn, THEN THE AutoCloudSync_Hook SHALL không chạy Drain_Operation từ Trailing_Flush_Timer.
2. IF tài liệu đang ở trạng thái ẩn (document hidden), THEN THE Drain_Operation kích hoạt bởi Trailing_Flush_Timer SHALL bị bỏ qua theo kiểm tra hiển thị hiện có.
3. IF Owner_Uid là null, THEN THE AutoCloudSync_Hook SHALL không lên lịch Trailing_Flush_Timer.
4. THE AutoCloudSync_Hook SHALL giữ nguyên giá trị các hằng số `DEFAULT_MUTATION_DEBOUNCE_MS`, `RECONNECT_DEBOUNCE_MS`, và `VISIBILITY_SYNC_STALE_MS`.
