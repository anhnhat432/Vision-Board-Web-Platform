import { X } from "lucide-react";
import type { ReactNode } from "react";

import { InlineStatusMessage, type InlineStatusTone } from "../states";
import { Button } from "../ui/button";
import { cn } from "../ui/utils";

export interface AdminFeedbackBannerProps {
  tone: InlineStatusTone;
  summary: ReactNode;
  action?: ReactNode;
  detailsLabel?: ReactNode;
  details?: ReactNode;
  onDismiss?: () => void;
  dismissLabel?: string;
  className?: string;
}

export function AdminFeedbackBanner({
  tone,
  summary,
  action,
  detailsLabel,
  details,
  onDismiss,
  dismissLabel = "Đóng thông báo",
  className,
}: AdminFeedbackBannerProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <InlineStatusMessage tone={tone}>
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">{summary}</div>
          {action || onDismiss ? (
            <div className="flex shrink-0 items-center gap-2">
              {action}
              {onDismiss ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-label={dismissLabel}
                  onClick={onDismiss}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </InlineStatusMessage>
      {details ? (
        <details className="rounded-[var(--r-control)] border border-app-line bg-app-surface px-3.5 py-2.5 text-sm text-app-ink-soft">
          <summary className="cursor-pointer font-medium text-app-ink">
            {detailsLabel ?? "Xem chi tiết"}
          </summary>
          <div className="mt-2">{details}</div>
        </details>
      ) : null}
    </div>
  );
}
