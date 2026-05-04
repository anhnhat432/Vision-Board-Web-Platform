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
  info: "border-sky-200 bg-sky-50 text-sky-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  error: "border-rose-200 bg-rose-50 text-rose-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
};

const TONE_ICON_CLASS: Record<InlineStatusTone, string> = {
  info: "text-sky-700",
  warning: "text-amber-700",
  error: "text-rose-700",
  success: "text-emerald-700",
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
        "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm leading-6",
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
