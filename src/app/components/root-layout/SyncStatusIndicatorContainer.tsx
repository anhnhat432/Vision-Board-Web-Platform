import { useCallback, useMemo } from "react";

import { useNetworkStatus } from "@/app/hooks/useNetworkStatus";
import { getAppMode } from "@/app/utils/app-mode";
import { resolveSyncIndicatorStatus } from "@/app/utils/sync-indicator-status";
import { useOptionalAutoCloudSyncContext } from "@/features/plan12week/hooks/AutoCloudSyncProvider";
import { useAuthContext } from "@/lib/auth/AuthContext";

import { SyncStatusIndicator } from "../SyncStatusIndicator";

interface SyncStatusIndicatorContainerProps {
  className?: string;
  testId?: string;
}

/**
 * Wiring cho `SyncStatusIndicator` (Req 6.2, 6.3, 6.4, 6.7, 6.8, 6.9, 9.6).
 *
 * Đọc trạng thái từ các nguồn hiện có (`getAppMode`, `AuthContext`,
 * `useNetworkStatus`, `useAutoCloudSync` qua context) và ánh xạ vào
 * `resolveSyncIndicatorStatus`. Container KHÔNG thay đổi sync semantics và
 * KHÔNG đụng dữ liệu local: control "Thử lại" chỉ gọi `triggerSyncNow()` sẵn có.
 *
 * Demo mode hoặc chưa đăng nhập → resolver trả `null` nên indicator không render
 * và không có control nào gọi đường sync backend được bảo vệ (Req 6.8). Nếu chưa
 * nằm trong `AutoCloudSyncProvider` (context null) thì cũng không render.
 */
export function SyncStatusIndicatorContainer({ className, testId }: SyncStatusIndicatorContainerProps) {
  const appMode = getAppMode();
  const { user } = useAuthContext();
  const networkStatus = useNetworkStatus();
  const syncState = useOptionalAutoCloudSyncContext();

  const signedIn = Boolean(user);
  const lastResultStatus = syncState?.lastResult?.status ?? null;
  // Timeout 30s / lỗi server đã được các hook sync phân giải sẵn; ở đây chỉ ánh xạ.
  const timedOutOrErrored = lastResultStatus === "error" || lastResultStatus === "drain_failed";
  const lastSyncSucceeded = lastResultStatus === "applied" || Boolean(syncState?.lastSyncedAt);
  const syncing = syncState?.syncing ?? false;

  const status = useMemo(
    () =>
      resolveSyncIndicatorStatus({
        appMode,
        signedIn,
        networkStatus: networkStatus.status,
        syncing,
        timedOutOrErrored,
        lastSyncSucceeded,
      }),
    [appMode, signedIn, networkStatus.status, syncing, timedOutOrErrored, lastSyncSucceeded],
  );

  const handleRetry = useCallback(() => {
    // Req 6.7: bắt đầu một thao tác đồng bộ mới; không đụng dữ liệu local.
    void syncState?.triggerSyncNow();
  }, [syncState]);

  // Không có context sync (ngoài AutoCloudSyncProvider) → không render, tránh
  // đường gọi sync không hợp lệ.
  if (!syncState) {
    return null;
  }

  return <SyncStatusIndicator status={status} onRetry={handleRetry} className={className} testId={testId} />;
}
