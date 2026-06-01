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
      className="rounded-2xl border border-app-line bg-app-surface p-5 sm:p-6 shadow-sm"
      aria-labelledby="smart-review-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-app-line/60 pb-3">
        <div>
          <h3 id="smart-review-title" className="font-serif text-xl font-bold leading-7 text-app-ink">
            Bức tranh mục tiêu của bạn
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-app-ink-soft">
            Dưới đây là phác thảo mục tiêu 12 tuần của bạn. Bạn có thể sửa đổi bất kỳ phần nào chưa ưng ý.
          </p>
        </div>
        <span className="rounded-full bg-app-accent-soft/30 px-3 py-1 text-xs font-bold text-app-accent border border-app-accent/10">
          Độ rõ nét: {clarityDoneCount}/{clarityItemCount} tiêu chí
        </span>
      </div>

      <div className="mt-2 divide-y divide-app-line/50">
        {summaryRows.map((row) => (
          <div key={row.key} className="py-3.5 first:pt-2 last:pb-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-app-accent">{row.label}</p>
                <p className="mt-1 text-sm leading-relaxed text-app-ink font-medium font-serif italic">“{row.value}”</p>
              </div>
              <button
                type="button"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-app-line bg-app-surface px-3 py-1.5 text-xs font-bold text-app-ink-soft transition-all duration-150 hover:bg-app-bg hover:text-app-ink hover:border-app-ink-muted active:scale-[0.97] cursor-pointer shadow-sm"
                onClick={() => onJumpToStep(row.key)}
                aria-label={`Sửa phần ${row.label}`}
              >
                <Pencil className="h-3 w-3 text-app-ink-muted" aria-hidden="true" />
                Sửa
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-teal-500/10 bg-teal-500/[0.015] p-4 text-xs text-slate-500 dark:text-slate-400 leading-relaxed space-y-1.5 select-none animate-[fade-in_0.3s_ease-out]">
        <div className="flex items-center gap-1.5 font-extrabold uppercase tracking-wider text-teal-600 dark:text-teal-400">
          <span>📌 Bước tiếp theo:</span>
        </div>
        <p>
          Mục tiêu SMART của bạn sẽ được chuyển sang giai đoạn **Kiểm tra độ khả thi**. Chúng mình sẽ cùng bạn phân tích các rủi ro, dự phòng thời gian biểu và thiết lập nhịp điệu hành động 12 tuần thật vững chắc.
        </p>
      </div>
    </section>
  );
}
