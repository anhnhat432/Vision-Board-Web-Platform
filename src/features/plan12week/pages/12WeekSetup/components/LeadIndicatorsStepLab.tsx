import { Activity, AlertTriangle, Lightbulb, Minus, Plus, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { useReducedMotion } from "@/app/components/ui/use-reduced-motion";
import { cn } from "@/app/components/ui/utils";
import { soundService } from "@/app/services/soundService";
import type { AdaptiveTemplateSupport, TwelveWeekTemplateDefinition } from "@/app/utils/twelve-week-premium";
import { labelClass, textareaClass } from "../../../../../app/pages/SMARTGoalSetup/components/formStyles";
import type { IndicatorPreviewGroup } from "../helpers";
import type { LeadIndicatorDraft, TwelveWeekSetupDraft } from "../types";

const COMMITMENT_FIELDS = [
  {
    key: "want",
    label: "Tôi thực sự muốn điều này vì...",
  },
  {
    key: "cost",
    label: "Tôi sẵn sàng trả giá gì...",
  },
  {
    key: "means",
    label: "Tôi sẽ làm thế nào (cụ thể)...",
  },
  {
    key: "tradeoff",
    label: "Tôi sẽ phải bỏ qua/giảm điều gì...",
  },
  {
    key: "reward",
    label: "Tôi sẽ tự thưởng gì khi giữ được...",
  },
] as const;

function normalizeCommitmentChange(
  current: LeadIndicatorDraft["commitment"],
  key: (typeof COMMITMENT_FIELDS)[number]["key"],
  value: string,
): LeadIndicatorDraft["commitment"] {
  const next = {
    want: current?.want ?? "",
    cost: current?.cost ?? "",
    means: current?.means ?? "",
    tradeoff: current?.tradeoff ?? "",
    reward: current?.reward ?? "",
    [key]: value,
  };

  const hasAnyAnswer = COMMITMENT_FIELDS.some((field) => next[field.key].trim().length > 0);
  return hasAnyAnswer ? { ...next, filledAt: new Date().toISOString() } : undefined;
}

interface LeadIndicatorsStepProps {
  draft: TwelveWeekSetupDraft;
  showValidationErrors: boolean;
  coreCount?: number;
  optionalCount?: number;
  setupGuideSupport?: AdaptiveTemplateSupport | null;
  setupGuideTemplate?: TwelveWeekTemplateDefinition | null;
  selectedTemplate?: TwelveWeekTemplateDefinition | null;
  weekOneTaskPreview?: string[];
  weekOneTaskWarning?: string | null;
  weekOneTaskGroups?: IndicatorPreviewGroup[];
  onAddIndicator: () => void;
  onRemoveIndicator: (index: number) => void;
  onIndicatorChange: <K extends keyof LeadIndicatorDraft>(index: number, key: K, value: LeadIndicatorDraft[K]) => void;
  onPreferredDayToggle?: (dayIndex: number) => void;
}

// Định nghĩa gợi ý hành động thông minh theo Loại mục tiêu (goalType)
const TACTIC_SUGGESTIONS: Record<string, string[]> = {
  "Skill Learning": [
    "Học khóa học chuyên môn 30 phút",
    "Luyện tập code/thiết kế thực tế",
    "Đọc tài liệu chuyên ngành",
    "Xem video hướng dẫn kỹ thuật",
  ],
  "Habit Building": [
    "Thiền định tĩnh tâm 10 phút",
    "Viết nhật ký biết ơn",
    "Uống đủ 2 Lít nước lọc",
    "Dọn dẹp góc làm việc",
  ],
  "Fitness / Health": [
    "Chạy bộ ngoài trời hoặc máy",
    "Tập gym / cardio cường độ cao",
    "Ăn đủ 2 bữa có rau xanh",
    "Ngủ sớm trước 23h00",
  ],
  "Exam / Study": [
    "Giải 1 đề thi thử trọn vẹn",
    "Học 20 từ vựng tiếng Anh mới",
    "Ôn tập kiến thức bằng Flashcard",
    "Đọc 1 chương sách giáo trình",
  ],
  "Career / Job Search": [
    "Cập nhật và tối ưu hồ sơ CV",
    "Gửi CV ứng tuyển vị trí mới",
    "Kết nối 2 người trong ngành",
    "Viết 1 bài chia sẻ chuyên môn",
  ],
  "Finance / Saving": [
    "Ghi chép chi tiêu trong ngày",
    "Xem lại ngân sách & hạn mức",
    "Chuyển 10% thu nhập tích lũy",
    "Đọc 15 phút sách tài chính",
  ],
  "Project Completion": [
    "Code phát triển tính năng mới",
    "Thiết kế bản vẽ / phác thảo UI",
    "Kiểm thử và sửa lỗi bug 30 phút",
    "Viết tài liệu hướng dẫn dự án",
  ],
  "Personal Growth": [
    "Đọc sách phát triển bản thân 20 trang",
    "Nghe 1 tập Podcast truyền cảm hứng",
    "Lên kế hoạch chi tiết cho ngày mới",
    "Học ngoại ngữ mới 15 phút",
  ],
  Other: ["Thực hiện hành động cam kết", "Tập trung làm việc quan trọng", "Rà soát tiến trình ngày"],
};

// Đơn vị đo lường phổ biến gợi ý
const QUICK_UNITS = ["lần", "buổi", "giờ", "trang", "km", "phút"];

export function LeadIndicatorsStepLab({
  draft,
  showValidationErrors,
  weekOneTaskPreview: _weekOneTaskPreview,
  weekOneTaskWarning,
  onAddIndicator,
  onRemoveIndicator,
  onIndicatorChange,
}: LeadIndicatorsStepProps) {
  const prefersReducedMotion = useReducedMotion();
  const canAddIndicator = draft.leadIndicators.length < 4;
  const showNameError = (indicator: LeadIndicatorDraft) => showValidationErrors && !indicator.name.trim();

  // Lấy danh sách gợi ý dựa trên loại mục tiêu hiện tại (goalType)
  const currentSuggestions = TACTIC_SUGGESTIONS[draft.goalType] ?? TACTIC_SUGGESTIONS.Other;

  const [expandedCommitments, setExpandedCommitments] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (draft.leadIndicators[0]) {
      initial[draft.leadIndicators[0].id] = true;
    }
    return initial;
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
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
        <motion.button
          whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
          whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
          type="button"
          aria-label="Thêm chỉ số"
          onClick={() => {
            soundService.success();
            onAddIndicator();
          }}
          disabled={!canAddIndicator}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-app-accent text-white hover:bg-app-accent-hover disabled:opacity-50 transition-all px-3.5 py-1.5 text-xs font-bold shrink-0 focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus:outline-none font-sans"
        >
          <Plus className="h-4 w-4" />
          Thêm việc
        </motion.button>
      </div>

      {/* 💡 Chỉ dẫn phân biệt Lead vs Lag ngắn gọn trực quan */}
      <div className="rounded-2xl border border-app-line bg-app-accent-soft/20 p-4 text-xs text-app-ink-soft flex gap-3 items-start select-none">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-app-accent-soft text-app-accent font-bold">
          💡
        </span>
        <div className="space-y-1">
          <p className="font-bold text-app-accent">Cách chọn hành động tốt nhất (Lead Indicators):</p>
          <p className="leading-relaxed opacity-95">
            Chọn việc nhỏ nằm trong tầm kiểm soát hoàn toàn của bạn và lặp lại đều đặn mỗi tuần.
          </p>
          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 pt-1.5">
            <div className="text-[11px] leading-relaxed text-app-status-error font-medium">
              ❌ <strong>Tránh ghi (Kết quả):</strong> Giảm 5kg, đọc hết 10 cuốn sách, đạt IELTS 7.0…
            </div>
            <div className="text-[11px] leading-relaxed text-app-status-success font-medium">
              ✅ <strong>Nên ghi (Hành động):</strong> Tập gym 3 buổi, đọc sách 30 trang/ngày, làm 5 đề thi/tuần…
            </div>
          </div>
        </div>
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
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-app-accent-soft text-app-accent text-[10px] font-extrabold border border-app-accent/20">
                  {index + 1}
                </span>
                <h4 id={`tactic-card-title-${index}`} className="text-xs font-bold text-app-ink">
                  Hành động lặp lại tuần
                </h4>
              </div>
              {draft.leadIndicators.length > 2 && (
                <motion.button
                  whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
                  type="button"
                  onClick={() => {
                    soundService.click();
                    onRemoveIndicator(index);
                  }}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-app-ink-muted hover:text-app-status-error transition-colors py-0.5 rounded focus-visible:ring-2 focus-visible:ring-app-status-error focus-visible:ring-offset-1 focus:outline-none font-sans"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Xóa bỏ
                </motion.button>
              )}
            </div>

            {/* Biểu mẫu 3 trường cốt lõi */}
            <div className="grid gap-3.5 sm:grid-cols-12">
              {/* Mô tả hành động */}
              <div className="sm:col-span-6 space-y-1.5">
                <label
                  htmlFor={`tactic-name-${index}`}
                  className={cn(labelClass, "text-xs font-bold text-app-ink flex items-center gap-1")}
                >
                  <span>Hành động cần làm là gì?</span>
                </label>
                <Input
                  id={`tactic-name-${index}`}
                  aria-label="Tên việc"
                  value={indicator.name}
                  onChange={(event) => onIndicatorChange(index, "name", event.target.value)}
                  placeholder="Ví dụ: Chạy bộ 30 phút, viết bài viết chuyên môn…"
                  className="text-xs rounded-xl"
                />

                {/* 🎯 GỢI Ý MỘT CHẠM: Giúp điền nhanh không cần gõ phím */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[9px] font-extrabold text-app-accent uppercase flex items-center gap-1">
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
                        className="inline-flex rounded-lg border border-app-line bg-app-bg-subtle/50 px-2 py-0.5 text-[9px] font-semibold text-app-ink-soft hover:border-app-accent hover:bg-app-accent-soft/20 active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-1 focus:outline-none"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>

                {showNameError(indicator) && (
                  <p role="alert" className="text-[10px] font-bold text-app-status-error">
                    Vui lòng chọn hoặc nhập mô tả hành động.
                  </p>
                )}
              </div>

              {/* Tần suất / Tuần */}
              <div className="sm:col-span-3 space-y-1.5">
                <label htmlFor={`tactic-target-${index}`} className={cn(labelClass, "text-xs font-bold text-app-ink")}>
                  Tần suất thực hiện
                </label>
                <div className="flex items-center justify-between bg-app-bg-subtle/50 border border-app-line rounded-xl p-1.5 w-full max-w-[140px] shadow-sm">
                  <button
                    type="button"
                    onClick={() => {
                      soundService.click();
                      const val = parseInt(indicator.target.trim(), 10);
                      const currentVal = Number.isNaN(val) ? 0 : val;
                      const newVal = Math.max(1, currentVal - 1);
                      onIndicatorChange(index, "target", newVal.toString());
                    }}
                    className="flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-app-surface border border-app-line text-app-ink-soft hover:text-app-accent hover:border-app-accent/30 transition-all active:scale-90 focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-1 focus:outline-none"
                    aria-label="Giảm tần suất"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <Input
                    id={`tactic-target-${index}`}
                    value={indicator.target}
                    className="w-8 bg-transparent border-0 text-center font-extrabold text-app-ink text-sm focus:ring-0 focus:outline-none p-0 h-9"
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
                    className="flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-app-surface border border-app-line text-app-ink-soft hover:text-app-accent hover:border-app-accent/30 transition-all active:scale-90 focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-1 focus:outline-none"
                    aria-label="Tăng tần suất"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <span className="text-[10px] text-app-ink-muted italic block">lần mỗi tuần</span>
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
                  placeholder="buổi, lần, trang…"
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
                        "inline-flex rounded bg-app-bg-subtle border border-app-line px-1.5 py-0.5 text-[9px] font-bold transition-colors active:scale-90 focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-1 focus:outline-none",
                        indicator.unit === u
                          ? "bg-app-accent text-white border-app-accent"
                          : "text-app-ink-soft hover:bg-app-accent-soft/40",
                      )}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Accordion Cam kết với chính mình (Cài đặt nâng cao) */}
            <div className="mt-4 rounded-xl bg-app-bg-subtle/50 p-3.5 space-y-2 border border-app-line/45">
              <button
                type="button"
                aria-label="Cài đặt nâng cao"
                aria-expanded={Boolean(expandedCommitments[indicator.id])}
                onClick={() => {
                  soundService.click();
                  setExpandedCommitments((prev) => ({
                    ...prev,
                    [indicator.id]: !prev[indicator.id],
                  }));
                }}
                className="flex w-full items-center justify-between text-xs font-bold text-app-accent py-1 px-2 rounded hover:bg-app-accent-soft/30 transition-all select-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-1 focus:outline-none"
              >
                <span>Cài đặt nâng cao</span>
                <span className="text-[10px] opacity-80">
                  {expandedCommitments[indicator.id] ? "Thu gọn ▴" : "Chỉnh sửa ▾"}
                </span>
              </button>

              {expandedCommitments[indicator.id] && (
                <div className="mt-3.5 space-y-3.5 animate-in slide-in-from-top-1 duration-200">
                  {COMMITMENT_FIELDS.map((field) => (
                    <div key={field.key} className="space-y-1.5">
                      <label
                        htmlFor={`tactic-commitment-${field.key}-${index}`}
                        className={cn(labelClass, "text-xs font-semibold text-app-ink-soft")}
                      >
                        {field.label}
                      </label>
                      <Textarea
                        id={`tactic-commitment-${field.key}-${index}`}
                        rows={2}
                        value={indicator.commitment?.[field.key] ?? ""}
                        onChange={(event) =>
                          onIndicatorChange(
                            index,
                            "commitment",
                            normalizeCommitmentChange(indicator.commitment, field.key, event.target.value),
                          )
                        }
                        className={cn(textareaClass, "min-h-[50px] text-xs rounded-xl")}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>

      {/* ⚠️ CẢNH BÁO TẢI TRỌNG (Gọn gàng dưới dạng lời khuyên AI) */}
      {weekOneTaskWarning && (
        <div className="rounded-xl border border-app-status-warning/30 bg-app-status-warning/5 p-3.5 flex gap-2.5 shadow-3xs animate-in slide-in-from-bottom-2 duration-200">
          <AlertTriangle className="h-4.5 w-4.5 text-app-status-warning shrink-0 mt-0.5" />
          <div>
            <span className="font-extrabold text-[9px] uppercase tracking-wider text-app-status-warning block mb-0.5">
              Lời khuyên về tải trọng hành động:
            </span>
            <p className="text-xs font-semibold text-app-ink-soft leading-relaxed">{weekOneTaskWarning}</p>
          </div>
        </div>
      )}
    </div>
  );
}
