import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { CheckCircle2, Clock3, Loader2, Upload, WifiOff } from "lucide-react";

import { SyncIdleDot, SyncOkDot, SyncSyncingDot } from "@/app/components/illustrations";
import { useAutoCloudSyncContext } from "@/features/plan12week/hooks/AutoCloudSyncProvider";

export const AUTO_CLOUD_CONFLICT_DIALOG_OPEN_EVENT_NAME = "visionboard:auto-cloud-conflict-dialog-open";

type SyncPillState = "conflict" | "syncing" | "offline" | "pending" | "ok" | "idle";

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
  conflictPending: boolean;
}): SyncPillState {
  if (input.conflictPending) return "conflict";
  if (input.syncing) return "syncing";
  if (!input.online) return "offline";
  if (input.pendingCount > 0) return "pending";
  if (input.lastSyncedAt) return "ok";
  return "idle";
}

function getPendingCopy(count: number): string {
  return count > 0 ? `${count} thay đổi đã lưu trên thiết bị, chờ gửi lên tài khoản` : "không có thay đổi chờ gửi";
}

function getTooltip(state: SyncPillState, relativeTime: string | null, pendingCount: number): string {
  if (state === "conflict") return "Dữ liệu trên thiết bị và tài khoản đang khác nhau. Bấm để chọn phiên bản an toàn.";
  if (state === "syncing") return `Đã lưu trên thiết bị. Đang đồng bộ lên tài khoản; ${getPendingCopy(pendingCount)}.`;
  if (state === "offline") return `Đã lưu trên thiết bị. Sẽ đồng bộ tài khoản khi có mạng; ${getPendingCopy(pendingCount)}.`;
  if (state === "pending") return `Đã lưu trên thiết bị. ${getPendingCopy(pendingCount)}.`;

  const timeCopy = relativeTime ? `Đã đồng bộ tài khoản ${relativeTime}` : "Chưa có lần đồng bộ tài khoản";
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
    conflictPending: syncState.conflictPending,
  });
  const tooltip = getTooltip(state, relativeTime, syncState.pendingCount);
  const baseClass =
    "inline-flex max-w-full items-center gap-1.5 rounded-[var(--r-pill)] border px-2 py-0.5 text-[11px] font-medium leading-none transition-colors";
  const sizeClass = compact ? "mt-1" : "mt-2";

  const config = {
    conflict: {
      dot: <SyncIdleDot className="h-4 w-4" />,
      icon: <Upload className="h-3 w-3" />,
      label: "Cần xử lý đồng bộ",
      tone: "border-amber-300 bg-amber-100 text-amber-800",
    },
    syncing: {
      dot: <SyncSyncingDot className="h-4 w-4" />,
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      label: "Đang đồng bộ tài khoản",
      tone: "border-sky-200 bg-sky-50 text-sky-700",
    },
    offline: {
      dot: <SyncIdleDot className="h-4 w-4" />,
      icon: <WifiOff className="h-3 w-3" />,
      label: "Đã lưu trên thiết bị",
      tone: "border-slate-200 bg-slate-100 text-slate-600",
    },
    pending: {
      dot: <SyncSyncingDot className="h-4 w-4" />,
      icon: <Upload className="h-3 w-3" />,
      label: `${syncState.pendingCount} chờ đồng bộ`,
      tone: "border-amber-200 bg-amber-50 text-amber-700",
    },
    ok: {
      dot: <SyncOkDot className="h-4 w-4" />,
      icon: <CheckCircle2 className="h-3 w-3" />,
      label: `Đã đồng bộ tài khoản ${relativeTime ?? "vừa xong"}`,
      tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
    },
    idle: {
      dot: <SyncIdleDot className="h-4 w-4" />,
      icon: <Clock3 className="h-3 w-3" />,
      label: "Chưa đồng bộ",
      tone: "border-slate-200 bg-slate-50 text-slate-600",
    },
  } satisfies Record<SyncPillState, { dot: ReactNode; icon: ReactNode; label: string; tone: string }>;

  const handleClick = () => {
    if (state === "conflict") {
      window.dispatchEvent(new CustomEvent(AUTO_CLOUD_CONFLICT_DIALOG_OPEN_EVENT_NAME));
      return;
    }
    navigate("/settings#account-sync");
  };

  return (
    <button
      type="button"
      className={`${baseClass} ${sizeClass} ${config[state].tone} cursor-pointer`}
      title={tooltip}
      aria-label={config[state].label}
      onClick={handleClick}
    >
      {config[state].dot}
      {config[state].icon}
      <span className="truncate">{config[state].label}</span>
    </button>
  );
}
