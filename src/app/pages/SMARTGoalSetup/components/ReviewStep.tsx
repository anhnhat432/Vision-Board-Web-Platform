import { ArrowRight, Pencil } from "lucide-react";

import type { SmartGoalSummaryRow, SmartStepKey } from "../types";

interface ReviewStepProps {
  clarityDoneCount: number;
  clarityItemCount: number;
  summaryRows: SmartGoalSummaryRow[];
  onJumpToStep: (stepKey: SmartStepKey) => void;
}

export function ReviewStep({ clarityDoneCount, clarityItemCount, summaryRows, onJumpToStep }: ReviewStepProps) {
  return (
    <section
      className="rounded-[16px] border border-app-line bg-app-surface p-4 sm:p-5"
      aria-labelledby="smart-review-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-app-line pb-3">
        <div>
          <h3 id="smart-review-title" className="text-base font-extrabold leading-6 text-app-ink">
            Bản chốt trước khi lập kế hoạch
          </h3>
          <p className="mt-1 text-[12px] leading-relaxed text-app-ink-soft">
            Quét nhanh 5 mảnh SMART. Chỗ nào chưa đúng, sửa ngay tại bước đó.
          </p>
        </div>
        <span className="rounded-full border border-app-accent/15 bg-app-accent-subtle px-3 py-1 text-xs font-bold text-app-accent">
          Rõ {clarityDoneCount}/{clarityItemCount}
        </span>
      </div>

      <div className="mt-2 divide-y divide-app-line">
        {summaryRows.map((row) => (
          <div key={row.key} className="py-3.5 first:pt-2 last:pb-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold text-app-accent">{row.label}</p>
                <p className="mt-1 text-[13px] font-medium leading-relaxed text-app-ink-soft italic">
                  &ldquo;{row.value}&rdquo;
                </p>
              </div>
              <button
                type="button"
                className="inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-app-line bg-app-bg-subtle px-3 py-1.5 text-xs font-bold text-app-ink-soft transition-all duration-150 hover:border-app-accent/30 hover:bg-app-accent-subtle hover:text-app-ink active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/35"
                onClick={() => onJumpToStep(row.key)}
                aria-label={`Sửa phần ${row.label}`}
              >
                <Pencil className="h-3 w-3" aria-hidden="true" />
                Sửa
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-[13px] border border-app-accent/15 bg-app-accent-subtle/70 p-3.5 text-[12px] leading-relaxed text-app-ink-soft animate-[fade-in_0.3s_ease-out]">
        <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-extrabold text-app-accent">
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Bước tiếp theo</span>
        </div>
        <p>Chọn tạo kế hoạch nhanh hoặc kiểm tra khả thi kỹ hơn để biến mục tiêu này thành nhịp 12 tuần.</p>
      </div>
    </section>
  );
}
