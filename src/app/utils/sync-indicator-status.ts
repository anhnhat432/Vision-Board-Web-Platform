/**
 * Trạng thái đồng bộ hiển thị cho người dùng đã đăng nhập ở real mode.
 * Đúng một trong bốn giá trị loại trừ lẫn nhau (Req 6.1).
 */
export type SyncIndicatorStatus = "synced" | "syncing" | "offline" | "error";

/**
 * Input đã phân giải cho `resolveSyncIndicatorStatus`. Các trường được ánh xạ
 * từ các nguồn hiện có (`useNetworkStatus`, `useAutoCloudSync`,
 * `useBackendSyncIssueState`, `BackendConnectionStatus`, `AuthContext`,
 * `getAppMode`) — helper này chỉ đọc, không sở hữu hay thay đổi sync semantics.
 */
export interface SyncIndicatorInput {
  appMode: "real" | "demo";
  signedIn: boolean;
  networkStatus: "online" | "offline" | "unknown";
  /** từ useAutoCloudSync.syncing */
  syncing: boolean;
  /** true khi thao tác sync quá 30s chưa xong hoặc server trả lỗi. */
  timedOutOrErrored: boolean;
  /** từ BackendConnectionStatus.syncStatus === "success" */
  lastSyncSucceeded: boolean;
}

/**
 * Phân giải trạng thái Sync_Status_Indicator.
 *
 * Trả về `null` khi KHÔNG hiển thị indicator (demo mode hoặc chưa đăng nhập —
 * Req 6.8). Ngược lại trả về đúng một trạng thái loại trừ lẫn nhau (Req 6.1)
 * theo thứ tự ưu tiên `offline > error > syncing > synced`:
 * - `offline` khi `networkStatus === "offline"` (Req 6.4)
 * - ngược lại `error` khi `timedOutOrErrored` (Req 6.5)
 * - ngược lại `syncing` khi `syncing` (Req 6.2)
 * - ngược lại `synced` (Req 6.3)
 *
 * Hàm thuần: chỉ ánh xạ từ input đã phân giải, không gọi sync, không side effect,
 * không thay đổi sync semantics (Req 9.6).
 */
export function resolveSyncIndicatorStatus(
  input: SyncIndicatorInput,
): SyncIndicatorStatus | null {
  if (input.appMode === "demo" || input.signedIn === false) {
    return null;
  }

  if (input.networkStatus === "offline") {
    return "offline";
  }

  if (input.timedOutOrErrored) {
    return "error";
  }

  if (input.syncing) {
    return "syncing";
  }

  return "synced";
}
