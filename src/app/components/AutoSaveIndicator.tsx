import { AlertCircle, Check, Cloud } from "lucide-react";

export type AutoSaveStatus = "idle" | "saving" | "saved";

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
      label: "Có thay đổi chưa lưu",
      tone: "text-amber-700",
    },
    saving: {
      icon: Cloud,
      label: "Đang lưu",
      tone: "text-sky-700",
    },
    saved: {
      icon: Check,
      label: lastSavedAt ? `Đã lưu lúc ${formatTimeLabel(lastSavedAt)}` : "Đã lưu",
      tone: "text-emerald-700",
    },
  } satisfies Record<AutoSaveStatus, { icon: typeof Check; label: string; tone: string }>;

  const { icon: Icon, label, tone } = stateConfig[effectiveStatus];

  return (
    <span
      role="status"
      aria-live="polite"
      data-testid="auto-save-indicator"
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${tone} ${className}`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {label}
    </span>
  );
}
