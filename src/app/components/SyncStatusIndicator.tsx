import { AlertTriangle, CheckCircle2, CloudOff, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/components/ui/utils";
import type { SyncIndicatorStatus } from "@/app/utils/sync-indicator-status";
import { SYNC_STATUS } from "@/app/utils/user-facing-copy";

interface SyncStatusIndicatorProps {
  /**
   * Trạng thái đã phân giải từ `resolveSyncIndicatorStatus`. Khi `null`
   * (demo mode hoặc chưa đăng nhập — Req 6.8) component không render gì.
   */
  status: SyncIndicatorStatus | null;
  /**
   * Callback cho control "Thử lại" ở trạng thái `error` (Req 6.6). Việc kích
   * hoạt sync backend do nơi gọi đảm nhiệm; component này không tự gọi sync.
   */
  onRetry?: () => void;
  className?: string;
  testId?: string;
}

/**
 * Cấu hình trình bày cho mỗi trạng thái: icon + class màu theo design token.
 * Không dùng animation loop/autoplay để tuân thủ calm style (Req 10.5).
 */
const STATUS_PRESENTATION: Record<
  SyncIndicatorStatus,
  { icon: ReactNode; toneClass: string; iconClass: string }
> = {
  synced: {
    icon: <CheckCircle2 className="h-4 w-4" aria-hidden="true" />,
    toneClass:
      "border-[color:var(--color-success-border)] bg-[color:var(--color-success-bg)] text-[color:var(--color-success-fg)]",
    iconClass: "text-[color:var(--color-success-fg)]",
  },
  syncing: {
    icon: <RefreshCw className="h-4 w-4" aria-hidden="true" />,
    toneClass:
      "border-[color:var(--color-info-border)] bg-[color:var(--color-info-bg)] text-[color:var(--color-info-fg)]",
    iconClass: "text-[color:var(--color-info-fg)]",
  },
  offline: {
    icon: <CloudOff className="h-4 w-4" aria-hidden="true" />,
    toneClass:
      "border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-bg)] text-[color:var(--color-warning-fg)]",
    iconClass: "text-[color:var(--color-warning-fg)]",
  },
  error: {
    icon: <AlertTriangle className="h-4 w-4" aria-hidden="true" />,
    toneClass:
      "border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] text-[color:var(--color-danger-fg)]",
    iconClass: "text-[color:var(--color-danger-fg)]",
  },
};

/**
 * Sync_Status_Indicator — component trình bày mỏng (Req 6.1, 6.6).
 *
 * Chỉ hiển thị trạng thái đã phân giải; KHÔNG tự gọi sync backend và không đọc
 * nguồn sync (việc đó do nơi gọi/wiring ở task 4.2 đảm nhiệm). Khi `status` là
 * `null` thì không render. Ở trạng thái `error` hiển thị control "Thử lại".
 */
export function SyncStatusIndicator({
  status,
  onRetry,
  className,
  testId,
}: SyncStatusIndicatorProps) {
  if (status === null) {
    return null;
  }

  const presentation = STATUS_PRESENTATION[status];
  const label = SYNC_STATUS[status];
  const isError = status === "error";

  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      data-testid={testId}
      data-sync-status={status}
      className={cn(
        "inline-flex items-center gap-2 rounded-[var(--r-control)] border px-3 py-1.5 text-sm font-medium leading-5 tracking-tight",
        presentation.toneClass,
        className,
      )}
    >
      <span className={cn("shrink-0", presentation.iconClass)}>{presentation.icon}</span>
      <span className="min-w-0 truncate">{label}</span>
      {isError && onRetry ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="ml-1 h-7 gap-1.5 px-2.5"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Thử lại
        </Button>
      ) : null}
    </div>
  );
}
