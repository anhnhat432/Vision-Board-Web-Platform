import { AlertCircle, CheckCircle2, Loader2, type LucideIcon } from "lucide-react";

import { SAVE_STATUS } from "../utils/user-facing-copy";

export type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

interface AutoSaveIndicatorProps {
  status?: AutoSaveStatus;
  lastSavedAt: Date | null;
  className?: string;
}

function formatTimeLabel(date: Date): string {
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export function AutoSaveIndicator({ status, lastSavedAt, className = "" }: AutoSaveIndicatorProps) {
  const effectiveStatus = status ?? (lastSavedAt ? "saved" : null);

  if (!effectiveStatus) return null;

  const stateConfig = {
    idle: {
      icon: AlertCircle,
      label: "Chưa lưu",
      tone: "text-app-ink-muted",
    },
    saving: {
      icon: Loader2,
      label: SAVE_STATUS.saving,
      tone: "text-app-ink-muted",
    },
    saved: {
      icon: CheckCircle2,
      label: lastSavedAt ? `${SAVE_STATUS.saved} lúc ${formatTimeLabel(lastSavedAt)}` : SAVE_STATUS.saved,
      tone: "text-app-ink-muted",
    },
    error: {
      icon: AlertCircle,
      label: SAVE_STATUS.error,
      tone: "text-[color:var(--color-danger-fg)]",
    },
  } satisfies Record<AutoSaveStatus, { icon: LucideIcon; label: string; tone: string }>;

  const { icon: Icon, label, tone } = stateConfig[effectiveStatus];

  return (
    <span
      role="status"
      aria-live="polite"
      data-testid="auto-save-indicator"
      className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${tone} ${className}`}
    >
      <Icon className={`h-3.5 w-3.5 ${effectiveStatus === "saving" ? "animate-spin" : ""}`} aria-hidden="true" />
      {label}
    </span>
  );
}
