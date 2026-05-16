import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, CircleAlert, Info } from "lucide-react";

import { cn } from "@/app/components/ui/utils";

export type InlineStatusTone = "info" | "warning" | "error" | "success";

interface InlineStatusMessageProps {
  /**
   * Tone controls color and default icon. Pick "error" only for states the
   * user needs to react to; prefer "warning" for soft nudges.
   */
  tone: InlineStatusTone;
  /**
   * Short message body. For multi-line context, use a parent card instead.
   */
  children: ReactNode;
  /**
   * ARIA live-region role.
   * - "status" (default) for non-urgent info/warning.
   * - "alert" for errors that should be announced immediately.
   */
  role?: "status" | "alert";
  /**
   * Override the default icon.
   */
  icon?: ReactNode;
  /**
   * Optional leading prefix such as "Cảnh báo:" for audit-compliant copy.
   */
  prefix?: ReactNode;
  className?: string;
  testId?: string;
}

const TONE_CLASS: Record<InlineStatusTone, string> = {
  info: "border-[color:var(--color-info-border)] bg-[color:var(--color-info-bg)] text-[color:var(--color-info-fg)]",
  warning:
    "border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-bg)] text-[color:var(--color-warning-fg)]",
  error:
    "border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] text-[color:var(--color-danger-fg)]",
  success:
    "border-[color:var(--color-success-border)] bg-[color:var(--color-success-bg)] text-[color:var(--color-success-fg)]",
};

const TONE_ICON_CLASS: Record<InlineStatusTone, string> = {
  info: "text-[color:var(--color-info-fg)]",
  warning: "text-[color:var(--color-warning-fg)]",
  error: "text-[color:var(--color-danger-fg)]",
  success: "text-[color:var(--color-success-fg)]",
};

const DEFAULT_ICONS: Record<InlineStatusTone, ReactNode> = {
  info: <Info className="h-4 w-4" aria-hidden="true" />,
  warning: <CircleAlert className="h-4 w-4" aria-hidden="true" />,
  error: <AlertTriangle className="h-4 w-4" aria-hidden="true" />,
  success: <CheckCircle2 className="h-4 w-4" aria-hidden="true" />,
};

export function InlineStatusMessage({
  tone,
  children,
  role = tone === "error" ? "alert" : "status",
  icon,
  prefix,
  className,
  testId,
}: InlineStatusMessageProps) {
  const resolvedIcon = icon ?? DEFAULT_ICONS[tone];

  return (
    <div
      role={role}
      data-testid={testId}
      className={cn(
        "flex items-start gap-2.5 rounded-[var(--r-control)] border px-3.5 py-2.5 text-[13px] leading-5 font-medium tracking-tight shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        TONE_CLASS[tone],
        className,
      )}
    >
      <span className={cn("mt-0.5 shrink-0", TONE_ICON_CLASS[tone])}>{resolvedIcon}</span>
      <div className="min-w-0 flex-1">
        {prefix ? <span className="font-semibold">{prefix} </span> : null}
        {children}
      </div>
    </div>
  );
}
