import { Pencil } from "lucide-react";

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
      className="rounded-[14px] border border-app-line bg-app-surface p-5 sm:p-6"
      aria-labelledby="smart-review-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="smart-review-title" className="font-serif text-2xl font-medium leading-7 text-app-ink">
            Xác nhận mục tiêu của bạn
          </h3>
          <p className="mt-2 text-sm leading-6 text-app-ink-soft">
            Xem lại nhanh các phần chính trước khi sang bước kiểm tra tính thực tế.
          </p>
        </div>
        <span className="rounded-full bg-app-accent-soft px-3 py-1 text-xs font-medium text-app-accent">
          Sẵn sàng: {clarityDoneCount}/{clarityItemCount}
        </span>
      </div>

      <div className="mt-2">
        {summaryRows.map((row) => (
          <div key={row.key} className="border-b border-app-line py-4 last:border-b-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-ink-muted">{row.label}</p>
                <p className="mt-2 text-sm leading-6 text-app-ink">{row.value}</p>
              </div>
              <button
                type="button"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-app-line bg-app-surface px-3 py-1 text-xs font-medium text-app-ink-soft transition-all duration-150 hover:bg-app-bg hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2"
                onClick={() => onJumpToStep(row.key)}
                aria-label={`Sửa phần ${row.label}`}
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                Sửa
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-teal-500/10 bg-teal-500/[0.02] p-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed space-y-1.5 select-none animate-[fade-in_0.3s_ease-out]">
        <div className="flex items-center gap-1.5 font-bold text-teal-600 dark:text-teal-400">
          <span>📌 Bước tiếp theo:</span>
        </div>
        <p>
          Sau khi nhấn <strong>“Kiểm tra độ khả thi”</strong>, mục tiêu SMART của bạn sẽ được chẩn đoán chi tiết. Bạn sẽ bước sang giai đoạn đánh giá độ sẵn sàng, tìm ra điểm nghẽn tiềm ẩn và định hình 12 tuần hành động thực tế.
        </p>
      </div>
    </section>
  );
}
