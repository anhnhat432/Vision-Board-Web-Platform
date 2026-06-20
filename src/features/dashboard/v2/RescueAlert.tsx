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
      className="rounded-[18px] border border-[#D6B228]/40 bg-[#FFFCE8] p-4 px-5 dark:border-[#D6B228]/30 dark:bg-[#2A2410]"
      aria-label="Cảnh báo tuần này"
      onAnimationStart={onVisible}
    >
      <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <span
            className="flex size-[38px] shrink-0 items-center justify-center rounded-[11px] bg-[#F4E2A0] text-[#9A7B00]"
            aria-hidden="true"
          >
            <AlertTriangle className="h-[19px] w-[19px]" />
          </span>
          <div className="min-w-0">
            <p className="text-[13.5px] font-bold text-[#5B4E1E] dark:text-[#F4E2A0]">{trigger.headline}</p>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-[#9A7B00] dark:text-[#D6B228]">{trigger.detail}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={onAction}
            className="inline-flex min-h-11 items-center rounded-full bg-[#9A7B00] px-4 py-2.5 text-[13px] font-bold text-white transition-all duration-200 hover:-translate-y-px active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9A7B00]/40"
          >
            {ctaLabel}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex size-[34px] items-center justify-center rounded-[9px] border border-[#9A7B00]/25 text-[#9A7B00] transition-colors duration-150 hover:bg-[#9A7B00]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9A7B00]/30"
            aria-label="Đóng thông báo"
          >
            <X className="h-[15px] w-[15px]" />
          </button>
        </div>
      </div>
    </section>
  );
}
