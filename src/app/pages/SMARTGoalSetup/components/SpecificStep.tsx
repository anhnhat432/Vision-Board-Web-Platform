import { useState, type Dispatch, type SetStateAction } from "react";

import type { GoalArchetype } from "@/lib/smart-goal";

import { FieldError } from "../../../components/ui/field-error";
import { GoalArchetypeExamples } from "../../../components/GoalArchetypeExamples";
import { Textarea } from "../../../components/ui/textarea";
import type { SMARTData } from "../types";
import { ArchetypeHint } from "./ArchetypeHint";
import { ArchetypePicker } from "./ArchetypePicker";
import { helperTextClass, labelClass, requiredMarkerClass, textareaClass } from "./formStyles";

interface SpecificStepProps {
  smartData: SMARTData;
  setSmartData: Dispatch<SetStateAction<SMARTData>>;
  placeholder: string;
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
}

export function SpecificStep({
  smartData,
  setSmartData,
  placeholder,
  showError,
  archetype,
  inferredArchetype,
  isArchetypeOverridden,
  onArchetypeChange,
  onArchetypeResetToInferred,
  intentArchetype,
}: SpecificStepProps) {
  const [hasBlurredGoalStatement, setHasBlurredGoalStatement] = useState(false);
  const specificLength = smartData.specific.goal_statement.trim().length;
  const activeArchetype = archetype ?? intentArchetype ?? "other";
  const goalStatementInvalid = specificLength < 10;
  const showInlineError = goalStatementInvalid && (hasBlurredGoalStatement || showError);
  const specificDescribedBy = ["smart-specific-hint", "smart-specific-counter", showInlineError ? "smart-specific-error" : null]
    .filter(Boolean)
    .join(" ");
  const activeInferredArchetype = inferredArchetype ?? activeArchetype;

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="smart-specific" className={labelClass}>
          Câu trả lời của bạn
          <span className={requiredMarkerClass} aria-hidden="true">*</span>
          <span className="sr-only"> bắt buộc</span>
        </label>
        <Textarea
          id="smart-specific"
          placeholder={placeholder}
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
          className={`${textareaClass} min-h-[140px]`} // Giảm nhẹ chiều cao để nhường chỗ cho suggestions
          aria-invalid={showInlineError}
          aria-describedby={specificDescribedBy}
        />
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
          <p id="smart-specific-hint" className={helperTextClass}>
            Nêu rõ hành động hoặc dự án cụ thể. 
            Ví dụ tốt: <span className="font-semibold text-app-ink">"Hoàn thành khóa học React và xây dựng 1 dự án cá nhân"</span>. 
            Ví dụ xấu: <span className="line-through text-app-ink-muted">"Giỏi lập trình hơn"</span>.
          </p>
          <p id="smart-specific-counter" className={helperTextClass}>
            {specificLength}/10 ký tự tối thiểu
          </p>
        </div>

        {/* 1-Click Suggestions */}
        <div className="mt-3 bg-app-bg/40 p-3 rounded-xl border border-app-line/60">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-app-accent mb-2 flex items-center gap-1">
            <span>💡</span> Gợi ý điền nhanh (1-Click Suggestions):
          </p>
          <div className="flex flex-col gap-1.5">
            {(() => {
              const suggestions = (() => {
                switch (activeArchetype) {
                  case "habit_building":
                    return [
                      "Thiết lập thói quen chạy bộ buổi sáng hàng ngày để nâng cao thể lực",
                      "Thực hiện thói quen đọc sách 30 trang mỗi tối trước khi đi ngủ",
                      "Thiết lập thói quen ghi chép chi tiêu cá nhân mỗi ngày để tối ưu ngân sách"
                    ];
                  case "skill_learning":
                    return [
                      "Học và làm chủ kiến thức nền tảng về lập trình web với React và Tailwind",
                      "Luyện tập kỹ năng giao tiếp tiếng Anh trôi chảy trong môi trường công sở",
                      "Master kỹ năng thiết kế slide chuyên nghiệp phục vụ thuyết trình dự án"
                    ];
                  case "project_completion":
                    return [
                      "Hoàn thành thiết kế và phát triển ứng dụng di động cá nhân đầu tiên",
                      "Hoàn thành việc cải tạo, trang trí lại toàn bộ phòng làm việc tại nhà",
                      "Viết và xuất bản 3 bài viết chuyên sâu chia sẻ kiến thức trên blog cá nhân"
                    ];
                  case "financial_goal":
                    return [
                      "Thiết lập thêm một nguồn thu nhập thụ động mới từ viết lách tự do",
                      "Cắt giảm 15% các khoản chi tiêu không cần thiết để tối ưu hóa tiết kiệm",
                      "Hoàn thành việc tìm hiểu và bắt đầu đầu tư tích lũy định kỳ hàng tháng"
                    ];
                  default:
                    return [
                      "Thiết lập thói quen thiền định chánh niệm 15 phút mỗi ngày để giảm stress",
                      "Hoàn thành khóa học trực tuyến nâng cao kiến thức chuyên ngành",
                      "Xây dựng kế hoạch dọn dẹp và tối giản hóa không gian sống mỗi tuần"
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
                  className="text-xs text-left bg-app-surface hover:bg-app-accent-soft/30 text-app-ink px-3 py-2 rounded-lg border border-app-line hover:border-app-accent/20 transition-all duration-150 active:scale-[0.99] w-full block shadow-sm"
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
