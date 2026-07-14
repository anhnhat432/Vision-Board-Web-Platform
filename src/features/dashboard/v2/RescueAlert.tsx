import { AlertTriangle, X } from "lucide-react";

import type { RescueTrigger } from "@/app/utils/storage-types";

interface RescueAlertProps {
  trigger: RescueTrigger;
  ctaLabel: string;
  onAction: () => void;
  onDismiss: () => void;
  onVisible?: () => void;
}

export function RescueAlert({ trigger, ctaLabel, onAction, onDismiss, onVisible }: RescueAlertProps) {
  return (
    <section
      className="rounded-card border border-app-status-warning/30 bg-app-status-warning/10 p-4 px-5"
      aria-label="Cảnh báo tuần này"
      onAnimationStart={onVisible}
    >
      <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <span
            className="flex size-[38px] shrink-0 items-center justify-center rounded-control bg-app-status-warning/15 text-app-status-warning"
            aria-hidden="true"
          >
            <AlertTriangle className="h-[19px] w-[19px]" />
          </span>
          <div className="min-w-0">
            <p className="text-[13.5px] font-bold text-app-ink">{trigger.headline}</p>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-app-status-warning">{trigger.detail}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={onAction}
            className="inline-flex min-h-11 items-center rounded-full bg-app-status-warning px-4 py-2.5 text-[13px] font-bold text-white transition-all duration-200 hover:-translate-y-px active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-status-warning/40"
          >
            {ctaLabel}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex size-[34px] items-center justify-center rounded-control border border-app-status-warning/25 text-app-status-warning transition-colors duration-150 hover:bg-app-status-warning/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-status-warning/30"
            aria-label="Đóng thông báo"
          >
            <X className="h-[15px] w-[15px]" />
          </button>
        </div>
      </div>
    </section>
  );
}
