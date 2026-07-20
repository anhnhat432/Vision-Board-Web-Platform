import { CheckCircle2, Target } from "lucide-react";

import { getLifeAreaLabel } from "@/app/utils/storage";

interface SetupSummaryCardProps {
  focusArea: string;
  goalTitle: string;
  isSavingDraft: boolean;
  aspirationalVisionSummary?: string;
}

export function SetupSummaryCard({
  focusArea,
  goalTitle,
  isSavingDraft,
  aspirationalVisionSummary,
}: SetupSummaryCardProps) {
  return (
    <section aria-labelledby="twelve-week-setup-title" className="space-y-3 sm:space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-ink-muted">
            {getLifeAreaLabel(focusArea)} · Thiết lập kế hoạch 12 tuần
          </p>
          <h1
            id="twelve-week-setup-title"
            className="mt-2 max-w-3xl font-serif text-[27px] font-medium leading-[1.06] tracking-tight text-app-ink sm:text-4xl sm:leading-tight"
          >
            Tạo kế hoạch 12 tuần
          </h1>
        </div>

        <p
          className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-app-ink-muted"
          role="status"
          aria-live="polite"
        >
          <span
            className={isSavingDraft ? "h-2 w-2 rounded-full bg-app-accent motion-safe:animate-pulse" : "h-2 w-2 rounded-full bg-app-status-success"}
            aria-hidden="true"
          />
          {isSavingDraft ? "Đang lưu nháp tự động..." : "Đã lưu nháp an toàn"}
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-app-line bg-app-surface p-4 shadow-app-sm sm:p-5">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-app-accent-soft text-app-accent"
          aria-hidden="true"
        >
          <Target className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-app-accent">Mục tiêu 12 tuần</p>
          <p className="mt-1 break-words text-sm font-semibold leading-relaxed text-app-ink sm:text-base">{goalTitle}</p>
          {aspirationalVisionSummary ? (
            <p className="mt-2 text-xs leading-relaxed text-app-ink-soft">
              Chu kỳ này là một bước cụ thể trong tầm nhìn dài hạn của bạn.
            </p>
          ) : null}
        </div>
        <CheckCircle2 className="ml-auto mt-0.5 size-5 shrink-0 text-app-status-success" aria-label="Đã sẵn sàng" />
      </div>
    </section>
  );
}
