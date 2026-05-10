import type { ReactNode } from "react";
import { CheckCircle2, Clock3, Loader2, Upload, WifiOff } from "lucide-react";

import { useAutoCloudSyncContext } from "@/features/plan12week/hooks/AutoCloudSyncProvider";

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
  return `${count} mutation chờ gửi`;
}

function getTooltip(state: SyncPillState, relativeTime: string | null, pendingCount: number): string {
  if (state === "syncing") return `Đang kiểm tra cập nhật, ${getPendingCopy(pendingCount)}.`;
  if (state === "offline") return `Đang đợi mạng, ${getPendingCopy(pendingCount)}.`;

  const timeCopy = relativeTime ? `Cập nhật ${relativeTime}` : "Chưa có lần cập nhật";
  return `${timeCopy}, ${getPendingCopy(pendingCount)}.`;
}

export function SyncStatusPill({ compact = false }: SyncStatusPillProps) {
  const syncState = useAutoCloudSyncContext();

  const relativeTime = formatRelativeSyncTime(syncState.lastSyncedAt);
  const state = getSyncState({
    syncing: syncState.syncing,
    online: syncState.online,
    pendingCount: syncState.pendingCount,
    lastSyncedAt: syncState.lastSyncedAt,
  });
  const tooltip = getTooltip(state, relativeTime, syncState.pendingCount);
  const baseClass =
    "inline-flex max-w-full items-center gap-1.5 rounded-[var(--r-pill)] border px-2 py-0.5 text-[11px] font-medium leading-none transition-colors";
  const sizeClass = compact ? "mt-1" : "mt-2";

  const config = {
    syncing: {
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      label: "Đang đồng bộ",
      tone: "border-sky-200 bg-sky-50 text-sky-700",
    },
    offline: {
      icon: <WifiOff className="h-3 w-3" />,
      label: "Đợi mạng",
      tone: "border-slate-200 bg-slate-100 text-slate-600",
    },
    pending: {
      icon: <Upload className="h-3 w-3" />,
      label: `${syncState.pendingCount} chờ gửi`,
      tone: "border-amber-200 bg-amber-50 text-amber-700",
    },
    ok: {
      icon: <CheckCircle2 className="h-3 w-3" />,
      label: `Đồng bộ ${relativeTime ?? "vừa xong"}`,
      tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
    },
    idle: {
      icon: <Clock3 className="h-3 w-3" />,
      label: "Chưa đồng bộ",
      tone: "border-slate-200 bg-slate-50 text-slate-600",
    },
  } satisfies Record<SyncPillState, { icon: ReactNode; label: string; tone: string }>;

  return (
    <button
      type="button"
      className={`${baseClass} ${sizeClass} ${config[state].tone} cursor-default`}
      title={tooltip}
      aria-label={config[state].label}
    >
      {config[state].icon}
      <span className="truncate">{config[state].label}</span>
    </button>
  );
}
