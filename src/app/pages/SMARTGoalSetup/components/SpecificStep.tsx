import { X } from "lucide-react";
import { type Dispatch, type SetStateAction, useState } from "react";
import { cn } from "@/app/components/ui/utils";

import type { GoalArchetype } from "@/lib/smart-goal";
import { GoalArchetypeExamples } from "../../../components/GoalArchetypeExamples";
import { FieldError } from "../../../components/ui/field-error";
import { Textarea } from "../../../components/ui/textarea";
import { FOCUS_AREA_EXAMPLES } from "../constants";
import type { SMARTData } from "../types";
import { ArchetypeHint } from "./ArchetypeHint";
import { ArchetypePicker } from "./ArchetypePicker";
import { labelClass, requiredMarkerClass, textareaClass } from "./formStyles";

interface SpecificStepProps {
  smartData: SMARTData;
  setSmartData: Dispatch<SetStateAction<SMARTData>>;
  placeholder?: string;
  showError: boolean;
  archetype?: GoalArchetype;
  inferredArchetype?: GoalArchetype;
  isArchetypeOverridden?: boolean;
  onArchetypeChange?: (archetype: GoalArchetype) => void;
  onArchetypeResetToInferred?: () => void;
  /**
   * Optional archetype derived from the user's onboarding intent. When set
   * to a concrete archetype, the step renders a small collapsible "weak vs
   * stronger goal" example panel under the input. Renders nothing for null,
   * undefined, or `"other"`.
   */
  intentArchetype?: GoalArchetype | null;
  focusArea?: string;
}

export function SpecificStep({
  smartData,
  setSmartData,
  showError,
  archetype,
  inferredArchetype,
  isArchetypeOverridden,
  onArchetypeChange,
  onArchetypeResetToInferred,
  intentArchetype,
  focusArea,
}: SpecificStepProps) {
  const [hasBlurredGoalStatement, setHasBlurredGoalStatement] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const specificLength = smartData.specific.goal_statement.trim().length;
  const activeArchetype = archetype ?? intentArchetype ?? "other";
  const goalStatementInvalid = specificLength < 10;
  const showInlineError = goalStatementInvalid && (hasBlurredGoalStatement || showError || specificLength > 0);
  const specificDescribedBy = [
    "smart-specific-hint",
    "smart-specific-counter",
    showInlineError ? "smart-specific-error" : null,
  ]
    .filter(Boolean)
    .join(" ");
  const activeInferredArchetype = inferredArchetype ?? activeArchetype;

  return (
    <div className="space-y-4 min-w-0">
      <div>
        <label htmlFor="smart-specific" className={labelClass}>
          Mục tiêu cụ thể của bạn (Hành động hoặc Dự án)
          <span className={requiredMarkerClass} aria-hidden="true">
            *
          </span>
          <span className="sr-only"> bắt buộc</span>
        </label>
        <Textarea
          id="smart-specific"
          placeholder="Ví dụ: Hoàn thành khóa học IELTS và đạt mục tiêu điểm số, hoặc Xây dựng ứng dụng di động cá nhân đầu tiên..."
          value={smartData.specific.goal_statement}
          onChange={(event) =>
            setSmartData((previous) => ({
              ...previous,
              specific: {
                goal_statement: event.target.value,
              },
            }))
          }
          onBlur={() => setHasBlurredGoalStatement(true)}
          className={`${textareaClass} min-h-[120px] focus:ring-2 focus:ring-app-accent/20 transition-all`}
          aria-invalid={showInlineError}
          aria-describedby={specificDescribedBy}
        />

        {/* Mẹo viết mục tiêu sụp mở */}
        <div className="mt-2.5 select-none">
          <button
            type="button"
            onClick={() => setShowTips(!showTips)}
            className="inline-flex items-center gap-1 text-xs text-app-accent hover:underline font-bold cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40 focus-visible:rounded-sm"
          >
            <span>💡</span> {showTips ? "Thu gọn mẹo viết mục tiêu tốt ▲" : "Xem mẹo viết mục tiêu tốt ▼"}
          </button>

          <div
            className={cn(
              "transition-all duration-300 ease-in-out overflow-hidden origin-top",
              showTips ? "mt-3 max-h-[300px] opacity-100" : "max-h-0 opacity-0",
            )}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-app-accent/10 bg-app-accent-soft dark:bg-app-accent-soft/10 p-3.5 flex items-start gap-2.5 text-xs leading-relaxed transition-all duration-300 hover:shadow-sm">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-app-accent-soft text-app-accent dark:text-app-accent mt-0.5">
                  💡
                </span>
                <div>
                  <p className="font-bold text-app-accent dark:text-app-accent">Nên viết cụ thể (Rõ việc):</p>
                  <p className="text-app-ink-soft mt-0.5 font-serif italic">
                    "Hoàn thành khóa học React và tự làm 1 trang web cá nhân."
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-rose-500/10 bg-rose-50/20 dark:bg-rose-950/5 p-3.5 flex items-start gap-2.5 text-xs leading-relaxed transition-all duration-305 hover:shadow-sm">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-450 mt-0.5">
                  <X className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                </span>
                <div>
                  <p className="font-bold text-rose-750 dark:text-rose-400">Tránh viết mơ hồ (Chung chung):</p>
                  <p className="text-app-ink-soft mt-0.5 font-serif italic">
                    "Học lập trình tốt hơn" hoặc "Trở thành coder giỏi."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-2.5 flex justify-between items-center text-[11px] text-app-ink-muted font-bold px-1 select-none">
          <span id="smart-specific-hint">Viết rõ kết quả bạn muốn đạt.</span>
          <span
            id="smart-specific-counter"
            className={specificLength >= 10 ? "text-app-accent font-bold" : "text-app-ink-muted"}
          >
            {specificLength}/10 ký tự tối thiểu
          </span>
        </div>

        {/* 1-Click Suggestions trượt ngang */}
        <div className="mt-4 bg-app-bg-subtle/30 dark:bg-app-bg-subtle/15 p-3.5 rounded-xl border border-dashed border-app-line/80">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-app-accent mb-2 flex items-center gap-1.5 select-none">
            <span>💡</span> Gợi ý điền nhanh:
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin select-none snap-x">
            {(() => {
              const suggestions = (() => {
                if (focusArea && FOCUS_AREA_EXAMPLES[focusArea]) {
                  return FOCUS_AREA_EXAMPLES[focusArea].specific;
                }
                switch (activeArchetype) {
                  case "habit_building":
                    return [
                      "Thiết lập thói quen chạy bộ buổi sáng hàng ngày để nâng cao thể lực",
                      "Thực hiện thói quen đọc sách 30 trang mỗi tối trước khi đi ngủ",
                      "Thiết lập thói quen ghi chép chi tiêu cá nhân mỗi ngày để tối ưu ngân sách",
                    ];
                  case "skill_learning":
                    return [
                      "Học và làm chủ kiến thức nền tảng về lập trình web với React và Tailwind",
                      "Luyện tập kỹ năng giao tiếp tiếng Anh trôi chảy trong môi trường công sở",
                      "Master kỹ năng thiết kế slide chuyên nghiệp phục vụ thuyết trình dự án",
                    ];
                  case "project_completion":
                    return [
                      "Hoàn thành thiết kế và phát triển ứng dụng di động cá nhân đầu tiên",
                      "Hoàn thành việc cải tạo, trang trí lại toàn bộ phòng làm việc tại nhà",
                      "Viết và xuất bản 3 bài viết chuyên sâu chia sẻ kiến thức trên blog cá nhân",
                    ];
                  case "financial_goal":
                    return [
                      "Thiết lập thêm một nguồn thu nhập thụ động mới từ viết lách tự do",
                      "Cắt giảm 15% các khoản chi tiêu không cần thiết để tối ưu hóa tiết kiệm",
                      "Hoàn thành việc tìm hiểu và bắt đầu đầu tư tích lũy định kỳ hàng tháng",
                    ];
                  default:
                    return [
                      "Thiết lập thói quen thiền định chánh niệm 15 phút mỗi ngày để giảm stress",
                      "Hoàn thành khóa học trực tuyến nâng cao kiến thức chuyên ngành",
                      "Xây dựng kế hoạch dọn dẹp và tối giản hóa không gian sống mỗi tuần",
                    ];
                }
              })();

              return suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    setSmartData((previous) => ({
                      ...previous,
                      specific: { goal_statement: suggestion },
                    }));
                    setHasBlurredGoalStatement(true);
                  }}
                  className="inline-flex min-h-11 items-center text-xs text-left bg-app-surface hover:bg-app-accent-soft/30 text-app-ink px-3.5 sm:px-3 py-2.5 sm:py-2 rounded-xl border border-app-line hover:border-app-accent/20 transition-all duration-150 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-app-accent/40 focus-visible:outline-none whitespace-nowrap snap-start shadow-sm flex-shrink-0 cursor-pointer"
                >
                  ✨ <span className="font-medium">{suggestion}</span>
                </button>
              ));
            })()}
          </div>
        </div>

        {showInlineError ? (
          <FieldError id="smart-specific-error" message="Mục tiêu cụ thể cần ít nhất 10 ký tự có nghĩa." role="alert" />
        ) : null}
      </div>

      <ArchetypePicker
        archetype={activeArchetype}
        inferredArchetype={activeInferredArchetype}
        isUserOverridden={Boolean(isArchetypeOverridden)}
        onChange={onArchetypeChange ?? (() => {})}
        onResetToInferred={onArchetypeResetToInferred ?? (() => {})}
      />

      <ArchetypeHint archetype={activeArchetype} variant="antiPattern" showArchetypeTag={false} />
      <GoalArchetypeExamples archetype={intentArchetype} variant="goal" />
    </div>
  );
}
