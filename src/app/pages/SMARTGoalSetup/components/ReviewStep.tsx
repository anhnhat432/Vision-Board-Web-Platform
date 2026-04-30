import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import type { SmartGoalSummaryRow, SmartStepKey } from "../types";

interface ReviewStepProps {
  clarityDoneCount: number;
  clarityItemCount: number;
  summaryRows: SmartGoalSummaryRow[];
  onJumpToStep: (stepKey: SmartStepKey) => void;
}

export function ReviewStep({ clarityDoneCount, clarityItemCount, summaryRows, onJumpToStep }: ReviewStepProps) {
  return (
    <div className="rounded-[24px] border border-emerald-200 bg-emerald-50/80 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">Tóm tắt trước khi kiểm tra</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Xem lại nhanh các phần chính trước khi sang bước kiểm tra tính thực tế.
          </p>
        </div>
        <Badge variant="outline" className="border-emerald-200 bg-white text-emerald-700">
          Sẵn sàng: {clarityDoneCount}/{clarityItemCount}
        </Badge>
      </div>
      <div className="mt-4 space-y-3">
        {summaryRows.map((row) => (
          <div key={row.key} className="rounded-2xl border border-white/80 bg-white/82 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{row.label}</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{row.value}</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => onJumpToStep(row.key)}>
                Sửa
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
