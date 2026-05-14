import { useEffect, useState } from "react";
import { Check, Cloud } from "lucide-react";

interface AutoSaveIndicatorProps {
  lastSavedAt: Date | null;
  className?: string;
}

const RECENT_SAVE_WINDOW_MS = 5_000;
const TICK_INTERVAL_MS = 1_000;

function formatTimeLabel(date: Date): string {
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export function AutoSaveIndicator({ lastSavedAt, className = "" }: AutoSaveIndicatorProps) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!lastSavedAt) return;
    const elapsed = Date.now() - lastSavedAt.getTime();
    if (elapsed >= RECENT_SAVE_WINDOW_MS) return;
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, TICK_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [lastSavedAt]);

  if (!lastSavedAt) return null;

  const isRecent = now - lastSavedAt.getTime() < RECENT_SAVE_WINDOW_MS;
  const label = isRecent ? "Đã tự lưu" : `Đã lưu lúc ${formatTimeLabel(lastSavedAt)}`;
  const tone = isRecent ? "text-emerald-700" : "text-slate-500";
  const Icon = isRecent ? Check : Cloud;

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
