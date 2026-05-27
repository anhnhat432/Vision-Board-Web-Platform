import { AlertCircle, CheckCircle2, Loader2, type LucideIcon } from "lucide-react";

import { SAVE_STATUS } from "../utils/user-facing-copy";

export type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

interface AutoSaveIndicatorProps {
  status?: AutoSaveStatus;
  lastSavedAt: Date | null;
  className?: string;
  variant?: "default" | "prominent";
}

function formatTimeLabel(date: Date): string {
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export function AutoSaveIndicator({
  status,
  lastSavedAt,
  className = "",
  variant = "default",
}: AutoSaveIndicatorProps) {
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
  const baseClass = "inline-flex items-center gap-1.5 text-xs font-medium transition-all duration-200";
  const prominentClass =
    variant === "prominent"
      ? "rounded-full border border-app-line bg-app-surface/95 px-3 py-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
      : "";
  const stateClass =
    variant === "prominent" && effectiveStatus === "saving"
      ? "animate-pulse border-app-accent/30 text-app-accent"
      : tone;

  return (
    <span
      role="status"
      aria-live="polite"
      data-testid="auto-save-indicator"
      className={`${baseClass} ${prominentClass} ${stateClass} ${className}`}
    >
      <Icon className={`h-3.5 w-3.5 ${effectiveStatus === "saving" ? "animate-spin" : ""}`} aria-hidden="true" />
      {label}
    </span>
  );
}
