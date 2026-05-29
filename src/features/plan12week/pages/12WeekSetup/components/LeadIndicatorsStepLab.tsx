import { Activity, Minus, Plus, Trash2 } from "lucide-react";

import { Input } from "@/app/components/ui/input";
import { cn } from "@/app/components/ui/utils";
import { soundService } from "@/app/services/soundService";
import type { AdaptiveTemplateSupport, TwelveWeekTemplateDefinition } from "@/app/utils/twelve-week-premium";
import { labelClass } from "../../../../../app/pages/SMARTGoalSetup/components/formStyles";
import type { IndicatorPreviewGroup } from "../helpers";
import type { LeadIndicatorDraft, TwelveWeekSetupDraft } from "../types";

interface LeadIndicatorsStepProps {
  draft: TwelveWeekSetupDraft;
  showValidationErrors: boolean;
  coreCount: number;
  optionalCount: number;
  setupGuideSupport: AdaptiveTemplateSupport | null;
  setupGuideTemplate: TwelveWeekTemplateDefinition | null;
  selectedTemplate: TwelveWeekTemplateDefinition | null;
  weekOneTaskPreview: string[];
  weekOneTaskWarning: string | null;
  weekOneTaskGroups: IndicatorPreviewGroup[];
  onAddIndicator: () => void;
  onRemoveIndicator: (index: number) => void;
  onIndicatorChange: <K extends keyof LeadIndicatorDraft>(index: number, key: K, value: LeadIndicatorDraft[K]) => void;
}

export function LeadIndicatorsStepLab({
  draft,
  showValidationErrors,
  onAddIndicator,
  onRemoveIndicator,
  onIndicatorChange,
}: LeadIndicatorsStepProps) {
  const canAddIndicator = draft.leadIndicators.length < 4;

  const showNameError = (indicator: LeadIndicatorDraft) => showValidationErrors && !indicator.name.trim();

  return (
    <div className="space-y-5">
      {/* TIÊU ĐỀ & NÚT THÊM HÀNH ĐỘNG */}
      <div className="flex items-center justify-between border-b border-app-line pb-3">
        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-app-accent flex items-center gap-1.5">
            <Activity className="h-4 w-4" />
            <span>Thiết lập hành động lặp lại (Lead Indicators)</span>
          </h3>
          <p className="mt-0.5 text-[11px] text-app-ink-muted">
            Hành động lặp lại là việc bạn hoàn toàn kiểm soát được. Chúng tôi đã tự động đề xuất dựa trên mục tiêu của
            bạn.
          </p>
        </div>
        <button
          type="button"
          onClick={onAddIndicator}
          disabled={!canAddIndicator}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-app-accent text-white hover:brightness-105 disabled:opacity-50 transition-all px-3 py-1.5 text-xs font-bold"
        >
          <Plus className="h-4 w-4" />
          Thêm việc mới
        </button>
      </div>

      {/* DANH SÁCH CARD VIỆC LẶP LẠI */}
      <div className="space-y-4">
        {draft.leadIndicators.map((indicator, index) => (
          <article
            key={indicator.id}
            className="relative overflow-hidden rounded-2xl border border-app-line bg-app-surface p-4 sm:p-5 shadow-sm space-y-4 animate-in fade-in-50 duration-200"
            aria-labelledby={`tactic-card-title-${index}`}
          >
            {/* Header card */}
            <div className="flex items-center justify-between border-b border-app-line/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-app-accent-soft text-app-accent text-[10px] font-extrabold">
                  {index + 1}
                </span>
                <h4 id={`tactic-card-title-${index}`} className="text-xs font-bold text-app-ink">
                  Việc cần làm lặp lại hằng tuần
                </h4>
              </div>
              {draft.leadIndicators.length > 2 && (
                <button
                  type="button"
                  onClick={() => onRemoveIndicator(index)}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-app-ink-muted hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Xóa
                </button>
              )}
            </div>

            {/* Biểu mẫu 3 trường cốt lõi */}
            <div className="grid gap-4 sm:grid-cols-12">
              {/* Mô tả hành động */}
              <div className="sm:col-span-6 space-y-1.5">
                <label htmlFor={`tactic-name-${index}`} className={cn(labelClass, "text-xs font-bold text-app-ink")}>
                  Mô tả hành động lặp lại
                </label>
                <Input
                  id={`tactic-name-${index}`}
                  value={indicator.name}
                  onChange={(event) => onIndicatorChange(index, "name", event.target.value)}
                  placeholder="Ví dụ: Chạy bộ 30 phút, viết 1 bài viết chuyên môn..."
                  className="text-xs"
                />
                {showNameError(indicator) && (
                  <p role="alert" className="text-[10px] font-bold text-red-500">
                    Vui lòng nhập mô tả hành động.
                  </p>
                )}
              </div>

              {/* Tần suất / Tuần */}
              <div className="sm:col-span-3 space-y-1.5">
                <label htmlFor={`tactic-target-${index}`} className={cn(labelClass, "text-xs font-bold text-app-ink")}>
                  Tần suất / Tuần
                </label>
                <div className="flex items-center bg-slate-100/70 dark:bg-slate-900/60 border border-app-line rounded-full p-1 w-full max-w-[140px] shadow-inner focus-within:ring-2 focus-within:ring-app-accent/20">
                  <button
                    type="button"
                    onClick={() => {
                      soundService.click();
                      const val = parseInt(indicator.target.trim(), 10);
                      const currentVal = Number.isNaN(val) ? 0 : val;
                      const newVal = Math.max(1, currentVal - 1);
                      onIndicatorChange(index, "target", newVal.toString());
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-app-surface border border-app-line text-app-ink-soft hover:text-app-accent transition-all active:scale-90"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <Input
                    id={`tactic-target-${index}`}
                    value={indicator.target}
                    className="w-10 bg-transparent border-0 text-center font-bold text-app-ink text-xs focus:ring-0 focus:outline-none p-0 h-7"
                    onChange={(event) => onIndicatorChange(index, "target", event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      soundService.click();
                      const val = parseInt(indicator.target.trim(), 10);
                      const currentVal = Number.isNaN(val) ? 0 : val;
                      const newVal = Math.min(21, currentVal + 1);
                      onIndicatorChange(index, "target", newVal.toString());
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-app-surface border border-app-line text-app-ink-soft hover:text-app-accent transition-all active:scale-90"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Đơn vị đo lường */}
              <div className="sm:col-span-3 space-y-1.5">
                <label htmlFor={`tactic-unit-${index}`} className={cn(labelClass, "text-xs font-bold text-app-ink")}>
                  Đơn vị đo
                </label>
                <Input
                  id={`tactic-unit-${index}`}
                  value={indicator.unit}
                  className="text-xs"
                  onChange={(event) => onIndicatorChange(index, "unit", event.target.value)}
                  placeholder="buổi, bài, trang..."
                />
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
