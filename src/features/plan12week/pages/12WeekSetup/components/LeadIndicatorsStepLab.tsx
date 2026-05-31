import { Activity, Minus, Plus, Trash2, Lightbulb } from "lucide-react";

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

// Định nghĩa gợi ý hành động thông minh theo Loại mục tiêu (goalType)
const TACTIC_SUGGESTIONS: Record<string, string[]> = {
  "Skill Learning": [
    "Học khóa học chuyên môn 30 phút",
    "Luyện tập code/thiết kế thực tế",
    "Đọc tài liệu chuyên ngành",
    "Xem video hướng dẫn kỹ thuật"
  ],
  "Habit Building": [
    "Thiền định tĩnh tâm 10 phút",
    "Viết nhật ký biết ơn",
    "Uống đủ 2 Lít nước lọc",
    "Dọn dẹp góc làm việc"
  ],
  "Fitness / Health": [
    "Chạy bộ ngoài trời hoặc máy",
    "Tập gym / cardio cường độ cao",
    "Ăn đủ 2 bữa có rau xanh",
    "Ngủ sớm trước 23h00"
  ],
  "Exam / Study": [
    "Giải 1 đề thi thử trọn vẹn",
    "Học 20 từ vựng tiếng Anh mới",
    "Ôn tập kiến thức bằng Flashcard",
    "Đọc 1 chương sách giáo trình"
  ],
  "Career / Job Search": [
    "Cập nhật và tối ưu hồ sơ CV",
    "Gửi CV ứng tuyển vị trí mới",
    "Kết nối 2 người trong ngành",
    "Viết 1 bài chia sẻ chuyên môn"
  ],
  "Finance / Saving": [
    "Ghi chép chi tiêu trong ngày",
    "Xem lại ngân sách & hạn mức",
    "Chuyển 10% thu nhập tích lũy",
    "Đọc 15 phút sách tài chính"
  ],
  "Project Completion": [
    "Code phát triển tính năng mới",
    "Thiết kế bản vẽ / UI mockup",
    "Kiểm thử và sửa lỗi bug 30 phút",
    "Viết tài liệu hướng dẫn dự án"
  ],
  "Personal Growth": [
    "Đọc sách phát triển bản thân 20 trang",
    "Nghe 1 tập Podcast truyền cảm hứng",
    "Lên kế hoạch chi tiết cho ngày mới",
    "Học ngoại ngữ mới 15 phút"
  ],
  "Other": [
    "Thực hiện hành động cam kết",
    "Tập trung làm việc quan trọng",
    "Rà soát tiến trình ngày"
  ]
};

// Đơn vị đo lường phổ biến gợi ý
const QUICK_UNITS = ["lần", "buổi", "giờ", "trang", "km", "phút"];

export function LeadIndicatorsStepLab({
  draft,
  showValidationErrors,
  onAddIndicator,
  onRemoveIndicator,
  onIndicatorChange,
}: LeadIndicatorsStepProps) {
  const canAddIndicator = draft.leadIndicators.length < 4;
  const showNameError = (indicator: LeadIndicatorDraft) => showValidationErrors && !indicator.name.trim();

  // Lấy danh sách gợi ý dựa trên loại mục tiêu hiện tại (goalType)
  const currentSuggestions = TACTIC_SUGGESTIONS[draft.goalType] ?? TACTIC_SUGGESTIONS["Other"];

  return (
    <div className="space-y-5">
      {/* TIÊU ĐỀ & NÚT THÊM HÀNH ĐỘNG */}
      <div className="flex items-center justify-between border-b border-app-line pb-3">
        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-app-accent flex items-center gap-1.5">
            <Activity className="h-4 w-4 shrink-0" />
            <span>2-4 Hành động lặp lại (Lead Indicators)</span>
          </h3>
          <p className="mt-0.5 text-[11px] text-app-ink-muted leading-relaxed">
            Hành động bạn hoàn toàn tự chủ và lặp lại đều đặn mỗi tuần để dẫn dắt đến kết quả lớn.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            soundService.success();
            onAddIndicator();
          }}
          disabled={!canAddIndicator}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-app-accent text-white hover:brightness-105 disabled:opacity-50 transition-all px-3.5 py-1.5 text-xs font-bold shrink-0"
        >
          <Plus className="h-4 w-4" />
          Thêm việc
        </button>
      </div>

      {/* DANH SÁCH CARD VIỆC LẶP LẠI */}
      <div className="space-y-4">
        {draft.leadIndicators.map((indicator, index) => (
          <article
            key={indicator.id}
            className="relative overflow-hidden rounded-2xl border border-app-line bg-app-surface p-4 sm:p-4.5 shadow-sm space-y-3.5 animate-in fade-in-50 duration-200"
            aria-labelledby={`tactic-card-title-${index}`}
          >
            {/* Header card gọn gàng */}
            <div className="flex items-center justify-between border-b border-app-line/40 pb-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-extrabold border border-indigo-100/30">
                  {index + 1}
                </span>
                <h4 id={`tactic-card-title-${index}`} className="text-xs font-bold text-app-ink">
                  Hành động lặp lại tuần
                </h4>
              </div>
              {draft.leadIndicators.length > 2 && (
                <button
                  type="button"
                  onClick={() => {
                    soundService.click();
                    onRemoveIndicator(index);
                  }}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-app-ink-muted hover:text-red-500 transition-colors py-0.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Xóa bỏ
                </button>
              )}
            </div>

            {/* Biểu mẫu 3 trường cốt lõi */}
            <div className="grid gap-3.5 sm:grid-cols-12">
              {/* Mô tả hành động */}
              <div className="sm:col-span-6 space-y-1.5">
                <label htmlFor={`tactic-name-${index}`} className={cn(labelClass, "text-xs font-bold text-app-ink flex items-center gap-1")}>
                  <span>Hành động cần làm là gì?</span>
                </label>
                <Input
                  id={`tactic-name-${index}`}
                  value={indicator.name}
                  onChange={(event) => onIndicatorChange(index, "name", event.target.value)}
                  placeholder="Ví dụ: Chạy bộ 30 phút, viết bài viết chuyên môn..."
                  className="text-xs rounded-xl"
                />
                
                {/* 🎯 GỢI Ý MỘT CHẠM: Giúp điền nhanh không cần gõ phím */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[9px] font-extrabold text-indigo-500 uppercase flex items-center gap-1">
                    <Lightbulb className="h-3 w-3" /> Gợi ý nhanh (Chọn 1 chạm):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {currentSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => {
                          soundService.click();
                          onIndicatorChange(index, "name", suggestion);
                        }}
                        className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 px-2 py-0.5 text-[9px] font-semibold text-app-ink-soft hover:border-indigo-300 hover:bg-indigo-50/20 active:scale-95 transition-all"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>

                {showNameError(indicator) && (
                  <p role="alert" className="text-[10px] font-bold text-red-500">
                    Vui lòng chọn hoặc nhập mô tả hành động.
                  </p>
                )}
              </div>

              {/* Tần suất / Tuần */}
              <div className="sm:col-span-3 space-y-1.5">
                <label htmlFor={`tactic-target-${index}`} className={cn(labelClass, "text-xs font-bold text-app-ink")}>
                  Tần suất thực hiện
                </label>
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/60 border border-app-line rounded-xl p-1 w-full max-w-[125px] shadow-sm">
                  <button
                    type="button"
                    onClick={() => {
                      soundService.click();
                      const val = parseInt(indicator.target.trim(), 10);
                      const currentVal = Number.isNaN(val) ? 0 : val;
                      const newVal = Math.max(1, currentVal - 1);
                      onIndicatorChange(index, "target", newVal.toString());
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-app-surface border border-app-line text-app-ink-soft hover:text-app-accent hover:border-app-accent/30 transition-all active:scale-90"
                    aria-label="Giảm tần suất"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <Input
                    id={`tactic-target-${index}`}
                    value={indicator.target}
                    className="w-8 bg-transparent border-0 text-center font-extrabold text-app-ink text-xs focus:ring-0 focus:outline-none p-0 h-7"
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
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-app-surface border border-app-line text-app-ink-soft hover:text-app-accent hover:border-app-accent/30 transition-all active:scale-90"
                    aria-label="Tăng tần suất"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <span className="text-[10px] text-app-ink-muted italic block">* lần mỗi tuần</span>
              </div>

              {/* Đơn vị đo lường */}
              <div className="sm:col-span-3 space-y-1.5">
                <label htmlFor={`tactic-unit-${index}`} className={cn(labelClass, "text-xs font-bold text-app-ink")}>
                  Đơn vị đo
                </label>
                <Input
                  id={`tactic-unit-${index}`}
                  value={indicator.unit}
                  className="text-xs rounded-xl"
                  onChange={(event) => onIndicatorChange(index, "unit", event.target.value)}
                  placeholder="buổi, lần, trang..."
                />
                
                {/* 🎯 ĐƠN VỊ ĐO NHANH: Chọn 1 chạm nhanh gọn */}
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {QUICK_UNITS.map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => {
                        soundService.click();
                        onIndicatorChange(index, "unit", u);
                      }}
                      className={cn(
                        "inline-flex rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold transition-colors active:scale-90",
                        indicator.unit === u
                          ? "bg-app-accent text-white"
                          : "text-app-ink-soft hover:bg-slate-200"
                      )}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
