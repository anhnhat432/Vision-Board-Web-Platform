import { Check, X } from "lucide-react";
import { type Dispatch, type SetStateAction, useState } from "react";
import { cn } from "@/app/components/ui/utils";
import type { GoalArchetype } from "@/lib/smart-goal/goalArchetypes";
import { FieldError } from "../../../components/ui/field-error";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { FOCUS_AREA_EXAMPLES } from "../constants";
import type { SMARTData } from "../types";
import { helperTextClass, inputClass, labelClass, requiredMarkerClass, textareaClass } from "./formStyles";

interface RelevantStepProps {
  smartData: SMARTData;
  setSmartData: Dispatch<SetStateAction<SMARTData>>;
  currentStepHasDraftContent: boolean;
  archetype?: GoalArchetype;
  focusArea?: string;
}

export function RelevantStep({
  smartData,
  setSmartData,
  currentStepHasDraftContent,
  archetype,
  focusArea,
}: RelevantStepProps) {
  const [hasBlurredMotivation, setHasBlurredMotivation] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const motivationInvalid = smartData.relevant.motivation_reason.trim().length < 15;
  const showMotivationError = motivationInvalid && (hasBlurredMotivation || currentStepHasDraftContent);

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="smart-relevant-reason" className={cn(labelClass, "text-base font-bold text-app-ink")}>
          Vì sao mục tiêu này thực sự quan trọng với bạn?
          <span className={requiredMarkerClass} aria-hidden="true">
            *
          </span>
          <span className="sr-only"> bắt buộc</span>
        </label>
        <Textarea
          id="smart-relevant-reason"
          placeholder="Ví dụ: Để tích lũy đủ quỹ dự phòng giúp gia định an tâm trước mọi biến cố, hoặc nâng cao kỹ năng giúp tự tin nhận các dự án lớn..."
          value={smartData.relevant.motivation_reason}
          onChange={(event) =>
            setSmartData((previous) => ({
              ...previous,
              relevant: {
                ...previous.relevant,
                motivation_reason: event.target.value,
              },
            }))
          }
          onBlur={() => setHasBlurredMotivation(true)}
          className={`${textareaClass} min-h-[120px] focus:ring-2 focus:ring-app-accent/20 transition-all`}
          aria-invalid={showMotivationError}
          aria-describedby={showMotivationError ? "smart-relevant-reason-error" : undefined}
        />

        {/* 1-Click Motivation Suggestions trượt ngang */}
        <div className="mt-3 bg-app-bg/40 p-3.5 rounded-xl border border-app-line/60">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-app-accent mb-2 flex items-center gap-1.5 select-none">
            <span>❤️</span> Gợi ý lý do nhanh:
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin select-none snap-x">
            {(() => {
              const suggestions = (() => {
                if (focusArea && FOCUS_AREA_EXAMPLES[focusArea]) {
                  return FOCUS_AREA_EXAMPLES[focusArea].relevant;
                }
                switch (archetype) {
                  case "habit_building":
                    return [
                      {
                        reason: "Để duy trì lối sống lành mạnh, năng động và tăng năng lượng làm việc mỗi ngày",
                        alignment: "Sức khỏe & Thân tâm",
                      },
                      {
                        reason: "Để cải thiện sự tập trung, rèn luyện tính nhất quán và giảm căng thẳng tinh thần",
                        alignment: "Phát triển bản thân",
                      },
                    ];
                  case "skill_learning":
                    return [
                      {
                        reason: "Để gia tăng năng lực chuyên môn, tự tin mở rộng cơ hội thăng tiến trong sự nghiệp",
                        alignment: "Sự nghiệp & Công việc",
                      },
                      {
                        reason: "Để làm chủ kiến thức mới, tăng tính cạnh tranh cá nhân và tự tin giải quyết vấn đề",
                        alignment: "Học tập & Trí tuệ",
                      },
                    ];
                  case "project_completion":
                    return [
                      {
                        reason: "Để hiện thực hóa ý tưởng ấp ủ bấy lâu và tạo ra sản phẩm thực tế của riêng mình",
                        alignment: "Dự án cá nhân",
                      },
                      {
                        reason: "Để tạo nền tảng vững chắc và khẳng định uy tín năng lực cho các dự án tương lai",
                        alignment: "Sự nghiệp & Đột phá",
                      },
                    ];
                  case "financial_goal":
                    return [
                      {
                        reason: "Để xây dựng quỹ dự phòng tài chính an toàn, bảo vệ bản thân trước rủi ro",
                        alignment: "Tài chính & Tích lũy",
                      },
                      {
                        reason: "Để tối ưu dòng tiền, đầu tư hiệu quả phục vụ mục tiêu tự do tài chính dài hạn",
                        alignment: "Tài chính cá nhân",
                      },
                    ];
                  default:
                    return [
                      {
                        reason: "Để nâng cấp phiên bản bản thân tốt hơn, hoàn thành cam kết và rèn tính nhất quán",
                        alignment: "Phát triển bản thân",
                      },
                      {
                        reason: "Để sắp xếp lại nhịp sống cân bằng, dọn dẹp stress và tạo không gian thư thái",
                        alignment: "Cân bằng cuộc sống",
                      },
                    ];
                }
              })();

              return suggestions.map((suggestion) => (
                <button
                  key={suggestion.reason}
                  type="button"
                  onClick={() => {
                    setSmartData((previous) => ({
                      ...previous,
                      relevant: {
                        motivation_reason: suggestion.reason,
                        life_dimension_alignment: suggestion.alignment,
                      },
                    }));
                    setHasBlurredMotivation(true);
                  }}
                  className="text-xs text-left bg-app-surface hover:bg-app-accent-soft/30 text-app-ink px-3.5 sm:px-3 py-2.5 sm:py-2 rounded-xl border border-app-line hover:border-app-accent/20 transition-all duration-150 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-app-accent/40 focus-visible:outline-none whitespace-nowrap snap-start shadow-sm flex-shrink-0 cursor-pointer"
                >
                  ✨ <span className="font-medium">{suggestion.reason}</span>{" "}
                  <span className="text-[10px] text-app-ink-muted">({suggestion.alignment})</span>
                </button>
              ));
            })()}
          </div>
        </div>

        {/* Mẹo động lực sụp mở */}
        <div className="mt-3 select-none">
          <button
            type="button"
            onClick={() => setShowTips(!showTips)}
            className="inline-flex items-center gap-1 text-xs text-app-accent hover:underline font-bold cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40 focus-visible:rounded-sm"
          >
            <span>💡</span> {showTips ? "Thu gọn mẹo viết lý do tốt ▲" : "Xem mẹo viết lý do tốt ▼"}
          </button>
          
          <div 
            className={cn(
              "transition-all duration-300 ease-in-out overflow-hidden origin-top",
              showTips ? "mt-3 max-h-[300px] opacity-100" : "max-h-0 opacity-0"
            )}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-emerald-500/10 bg-emerald-50/20 dark:bg-emerald-950/5 p-3.5 flex items-start gap-2.5 text-xs leading-relaxed transition-all duration-300 hover:shadow-sm">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mt-0.5">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                </span>
                <div>
                  <p className="font-bold text-emerald-800 dark:text-emerald-400">Nên viết rõ (Động lực thực tế):</p>
                  <p className="text-app-ink-soft mt-0.5 font-serif italic">
                    "Để có quỹ khẩn cấp giúp gia đình an tâm trước rủi ro phát sinh."
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-rose-500/10 bg-rose-50/20 dark:bg-rose-950/5 p-3.5 flex items-start gap-2.5 text-xs leading-relaxed transition-all duration-305 hover:shadow-sm">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-450 mt-0.5">
                  <X className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                </span>
                <div>
                  <p className="font-bold text-rose-750 dark:text-rose-400">Tránh viết chung chung (Mơ hồ):</p>
                  <p className="text-app-ink-soft mt-0.5 font-serif italic">
                    "Kiếm nhiều tiền hơn" hoặc "Vì tôi thích thế."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showMotivationError ? (
          <FieldError
            id="smart-relevant-reason-error"
            message="Hãy viết chi tiết hơn một chút (tối thiểu 15 ký tự) để làm rõ động lực cốt lõi."
            role="alert"
          />
        ) : null}
      </div>
      <div>
        <label htmlFor="smart-life-alignment" className={cn(labelClass, "text-base font-bold text-app-ink")}>
          Khía cạnh cuộc sống bạn muốn liên kết (Tùy chọn)
        </label>
        <Input
          id="smart-life-alignment"
          placeholder="Ví dụ: Sự nghiệp, Tài chính, Sức khỏe, Gia đình..."
          value={smartData.relevant.life_dimension_alignment}
          onChange={(event) =>
            setSmartData((previous) => ({
              ...previous,
              relevant: {
                ...previous.relevant,
                life_dimension_alignment: event.target.value,
              },
            }))
          }
          className={inputClass}
        />
        <p className={helperTextClass}>Bạn có thể bỏ trống nếu lý do động lực ở trên đã chỉ rõ khía cạnh liên quan.</p>
      </div>
    </div>
  );
}

