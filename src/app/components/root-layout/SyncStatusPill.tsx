import { CheckCircle2, Clock3, Loader2, Upload, WifiOff } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";

import { SyncIdleDot, SyncOkDot, SyncSyncingDot } from "@/app/components/illustrations";
import { useAutoCloudSyncContext } from "@/features/plan12week/hooks/AutoCloudSyncProvider";

// Chỉ dùng cho test/harness (twoDeviceSync.e2e, AutoCloudConflictDialog.test).
// App production tự đồng bộ + auto-resolve LWW, không còn render dialog chọn bản
// nên không có đường dẫn nào dispatch event này trong runtime thực.
export const AUTO_CLOUD_CONFLICT_DIALOG_OPEN_EVENT_NAME = "visionboard:auto-cloud-conflict-dialog-open";

type SyncPillState = "syncing" | "offline" | "pending" | "ok" | "idle";

interface SyncStatusPillProps {
  compact?: boolean;
}

function formatRelativeSyncTime(value: string | null): string | null {
  if (!value) return null;

  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return null;

  const diffMs = Math.max(0, Date.now() - timestamp);
  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 1) return "vừa xong";
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;

  const diffHours = Math.floor(diffMinutes / 60);
  return `${diffHours} giờ trước`;
}

function getSyncState(input: {
  syncing: boolean;
  online: boolean;
  pendingCount: number;
  lastSyncedAt: string | null;
}): SyncPillState {
  if (input.syncing) return "syncing";
  if (!input.online) return "offline";
  if (input.pendingCount > 0) return "pending";
  if (input.lastSyncedAt) return "ok";
  return "idle";
}

function getPendingCopy(count: number): string {
  return count > 0 ? `${count} thay đổi chưa sao lưu` : "không có thay đổi chờ đồng bộ";
}

function getTooltip(state: SyncPillState, relativeTime: string | null, pendingCount: number): string {
  if (state === "syncing")
    return `Đã lưu trên thiết bị này. Đang sao lưu vào tài khoản; ${getPendingCopy(pendingCount)}.`;
  if (state === "offline")
    return `Đã lưu trên thiết bị này. Chưa sao lưu. Sẽ sao lưu vào tài khoản khi có mạng; ${getPendingCopy(
      pendingCount,
    )}.`;
  if (state === "pending")
    return `Đã lưu trên thiết bị này. Chưa sao lưu. Bấm để sao lưu ngay; ${getPendingCopy(pendingCount)}.`;

  const timeCopy = relativeTime ? `Đã sao lưu ${relativeTime}` : "Chưa có lần sao lưu";
  return `${timeCopy}; ${getPendingCopy(pendingCount)}.`;
}

export function SyncStatusPill({ compact = false }: SyncStatusPillProps) {
  const syncState = useAutoCloudSyncContext();
  const navigate = useNavigate();

  const relativeTime = formatRelativeSyncTime(syncState.lastSyncedAt);
  const state = getSyncState({
    syncing: syncState.syncing,
    online: syncState.online,
    pendingCount: syncState.pendingCount,
    lastSyncedAt: syncState.lastSyncedAt,
  });

  const [showSuccess, setShowSuccess] = useState(false);
  const prevSyncStateRef = useRef<SyncPillState | null>(null);
  const successTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const prevState = prevSyncStateRef.current;
    if ((prevState === "syncing" || prevState === "pending") && state === "ok") {
      setShowSuccess(true);
      if (successTimeoutRef.current !== null) {
        window.clearTimeout(successTimeoutRef.current);
      }
      successTimeoutRef.current = window.setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    }
    prevSyncStateRef.current = state;
  }, [state]);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current !== null) {
        window.clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  const effectiveState = (state === "ok" || state === "idle") && showSuccess ? "ok" : state;

  if (effectiveState === "ok" || effectiveState === "idle") {
    if (effectiveState === "ok" && showSuccess) {
      // Allow rendering the success state
    } else {
      return null;
    }
  }

  const tooltip = getTooltip(effectiveState, relativeTime, syncState.pendingCount);
  const baseClass =
    "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-medium leading-none transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 animate-in fade-in zoom-in-95 duration-200";
  const sizeClass = compact ? "" : "mt-2";

  const config = {
    syncing: {
      dot: <SyncSyncingDot className="h-4 w-4" />,
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      label: "Đang sao lưu",
      tone: "border-app-line bg-app-accent-soft text-app-accent",
    },
    offline: {
      dot: <SyncIdleDot className="h-4 w-4" />,
      icon: <WifiOff className="h-3 w-3" />,
      label: "Đã lưu trên thiết bị này. Chưa sao lưu",
      tone: "border-app-line bg-app-surface text-app-ink-soft",
    },
    pending: {
      dot: <SyncSyncingDot className="h-4 w-4" />,
      icon: <Upload className="h-3 w-3" />,
      label: "Đã lưu trên thiết bị này. Chưa sao lưu",
      tone: "border-app-warm-border bg-app-warm-soft text-app-warm",
    },
    ok: {
      dot: <SyncOkDot className="h-4 w-4" />,
      icon: <CheckCircle2 className="h-3 w-3" />,
      label: `Đã sao lưu ${relativeTime ?? "vừa xong"}`,
      tone: "border-app-line bg-app-accent-soft text-app-accent",
    },
    idle: {
      dot: <SyncIdleDot className="h-4 w-4" />,
      icon: <Clock3 className="h-3 w-3" />,
      label: "Chưa sao lưu",
      tone: "border-app-line bg-app-surface text-app-ink-soft",
    },
  } satisfies Record<SyncPillState, { dot: ReactNode; icon: ReactNode; label: string; tone: string }>;

  const handleClick = () => {
    if (effectiveState === "pending" && syncState.online) {
      void syncState.triggerSyncNow();
      return;
    }
    navigate("/settings#account-sync");
  };

  return (
    <button
      type="button"
      className={`${baseClass} ${sizeClass} ${config[effectiveState].tone} cursor-pointer`}
      title={tooltip}
      aria-label={config[effectiveState].label}
      onClick={handleClick}
    >
      {config[effectiveState].dot}
      {config[effectiveState].icon}
      <span className="truncate">{config[effectiveState].label}</span>
      {effectiveState === "pending" && syncState.pendingCount > 0 ? (
        <span className="ml-1 rounded-full bg-app-surface/80 px-1.5 py-0.5 text-xs font-semibold text-app-warm">
          Sao lưu ngay
        </span>
      ) : null}
    </button>
  );
}
