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
  return count > 0 ? `${count} thay đổi chưa sao lưu` : "không có thay đổi chờ đồng bộ";
}

function getTooltip(state: SyncPillState, relativeTime: string | null, pendingCount: number): string {
  if (state === "conflict") return "Dữ liệu trên thiết bị và tài khoản đang khác nhau. Bấm để chọn phiên bản an toàn.";
  if (state === "syncing") return `Đã lưu trên thiết bị này. Đang sao lưu vào tài khoản; ${getPendingCopy(pendingCount)}.`;
  if (state === "offline")
    return `Đã lưu trên thiết bị này. Chưa sao lưu. Sẽ sao lưu vào tài khoản khi có mạng; ${getPendingCopy(
      pendingCount,
    )}.`;
  if (state === "pending") return `Đã lưu trên thiết bị này. Chưa sao lưu. Bấm để sao lưu ngay; ${getPendingCopy(pendingCount)}.`;

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
    conflictPending: syncState.conflictPending,
  });

  if (state === "ok" || state === "idle") {
    return null;
  }

  // Demo workaround (verify probe 2026-05-26): nếu state="conflict" do legacy
  // data thiếu clientXxxId (missingClientIdCount > 0) chứ không phải user
  // value-diff conflict thật, ẩn pill khỏi header. User vẫn có thể vào
  // /settings#account-sync để xem chi tiết. Tracked riêng:
  // docs/superpowers/prompts/2026-05-26-b2-missing-client-id-backfill.md
  if (state === "conflict") {
    const lastResult = syncState.lastResult;
    const summary = lastResult?.mergeReport?.summary;
    const isLegacyMissingClientId =
      summary != null &&
      (summary.missingClientIdCount ?? 0) > 0 &&
      summary.conflictCount === 0;
    if (isLegacyMissingClientId) {
      return null;
    }
  }

  const tooltip = getTooltip(state, relativeTime, syncState.pendingCount);
  const baseClass =
    "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-medium leading-none transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30";
  const sizeClass = compact ? "" : "mt-2";

  const config = {
    conflict: {
      dot: <SyncIdleDot className="h-4 w-4" />,
      icon: <Upload className="h-3 w-3" />,
      label: "Cần chọn bản dữ liệu",
      tone: "border-app-warm-border bg-app-warm-soft text-app-warm",
    },
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
    if (state === "conflict") {
      window.dispatchEvent(new CustomEvent(AUTO_CLOUD_CONFLICT_DIALOG_OPEN_EVENT_NAME));
      return;
    }
    if (state === "pending" && syncState.online) {
      void syncState.triggerSyncNow();
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
      {state === "pending" && syncState.pendingCount > 0 ? (
        <span className="ml-1 rounded-full bg-app-surface/80 px-1.5 py-0.5 text-xs font-semibold text-app-warm">
          Sao lưu ngay
        </span>
      ) : null}
    </button>
  );
}
