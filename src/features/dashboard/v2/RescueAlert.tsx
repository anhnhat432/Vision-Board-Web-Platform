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
      className="rounded-card border border-[#F3D9CC] bg-app-warm-soft p-4 text-[14px] text-[#5C3A2E] md:p-5"
      aria-label="Cảnh báo tuần này"
      onAnimationStart={onVisible}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-app-surface text-app-warm">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{trigger.headline}</p>
          <p className="mt-1 leading-6">{trigger.detail}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:ml-auto">
          <button
            type="button"
            onClick={onAction}
            className="inline-flex rounded-lg bg-app-warm px-3.5 py-2 text-[14px] font-medium text-white transition-colors duration-150 hover:bg-[#c56b4e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-warm/30"
          >
            {ctaLabel}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#5C3A2E] transition-colors duration-150 hover:bg-app-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-warm/30"
            aria-label="Đóng thông báo"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
