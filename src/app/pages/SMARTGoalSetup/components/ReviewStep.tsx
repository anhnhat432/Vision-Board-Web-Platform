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
      className="rounded-[14px] border border-[rgba(23,21,15,0.08)] bg-white p-5 sm:p-6"
      aria-labelledby="smart-review-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[rgba(23,21,15,0.06)] pb-3">
        <div>
          <h3 id="smart-review-title" className="text-lg font-extrabold leading-7 text-[#17150F]">
            Bức tranh mục tiêu của bạn
          </h3>
          <p className="mt-1 text-[12px] leading-relaxed text-[#5C574B]">
            Dưới đây là phác thảo mục tiêu 12 tuần của bạn. Bạn có thể sửa đổi bất kỳ phần nào chưa ưng ý.
          </p>
        </div>
        <span className="rounded-full bg-[#EDF7E0] px-3 py-1 text-xs font-bold text-[#0C5E3A] border border-[#0C5E3A]/10">
          Độ rõ nét: {clarityDoneCount}/{clarityItemCount} tiêu chí
        </span>
      </div>

      <div className="mt-2 divide-y divide-[rgba(23,21,15,0.05)]">
        {summaryRows.map((row) => (
          <div key={row.key} className="py-3.5 first:pt-2 last:pb-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#0C5E3A]">{row.label}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-[#17150F] font-medium italic">
                  &ldquo;{row.value}&rdquo;
                </p>
              </div>
              <button
                type="button"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[rgba(23,21,15,0.1)] bg-white px-3 py-1.5 text-xs font-bold text-[#5C574B] transition-all duration-150 hover:bg-[#FAF8F3] hover:text-[#17150F] hover:border-[#A8A296] active:scale-[0.97] cursor-pointer"
                onClick={() => onJumpToStep(row.key)}
                aria-label={`Sửa phần ${row.label}`}
              >
                <Pencil className="h-3 w-3 text-[#A8A296]" aria-hidden="true" />
                Sửa
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-[11px] border border-[rgba(12,94,58,0.15)] bg-[#E4EEDF] p-4 text-[12px] text-[#3F4A3F] leading-relaxed space-y-1.5 animate-[fade-in_0.3s_ease-out]">
        <div className="flex items-center gap-1.5 font-extrabold uppercase tracking-wider text-[#0C5E3A]">
          <span>🚩 Bước tiếp theo:</span>
        </div>
        <p>
          Mục tiêu SMART của bạn sẽ được chuyển sang giai đoạn Kiểm tra độ khả thi. Chúng mình sẽ cùng bạn phân tích
          các rủi ro, dự phòng thời gian biểu và thiết lập nhịp điệu hành động 12 tuần thật vững chắc.
        </p>
      </div>
    </section>
  );
}
