import { ChevronDown, ChevronUp, Heart, Lightbulb, X } from "lucide-react";
import { type Dispatch, type SetStateAction, useState } from "react";
import { cn } from "@/app/components/ui/utils";
import type { GoalArchetype } from "@/lib/smart-goal/goalArchetypes";
import { FieldError } from "../../../components/ui/field-error";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { resolveFieldErrorDisplay } from "../../../utils/field-error-display";
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
  // Inline validation cho lý do (bắt buộc + tối thiểu 15 ký tự) phân giải qua
  // resolveFieldValidationState (Req 13.1–13.3).
  const motivationError = resolveFieldErrorDisplay(
    smartData.relevant.motivation_reason.trim(),
    [{ kind: "required" }, { kind: "minLength", value: 15 }],
    {
      touched: hasBlurredMotivation,
      hasContent: currentStepHasDraftContent,
      messages: {
        required: "Hãy viết chi tiết hơn một chút (tối thiểu 15 ký tự) để làm rõ động lực cốt lõi.",
        minLength: "Hãy viết chi tiết hơn một chút (tối thiểu 15 ký tự) để làm rõ động lực cốt lõi.",
      },
    },
  );
  const showMotivationError = motivationError.showError;

  const archetypeSuggestions = () => {
    switch (archetype) {
      case "habit_building":
        return [
          {
            reason: "Duy trì lối sống lành mạnh, năng động và tăng năng lượng mỗi ngày",
            alignment: "Sức khỏe & Thân tâm",
          },
          {
            reason: "Cải thiện sự tập trung, rèn tính nhất quán và giảm căng thẳng",
            alignment: "Phát triển bản thân",
          },
          {
            reason: "Tạo nền tảng vững chắc để các mục tiêu khác trong năm dễ thực hiện hơn",
            alignment: "Phát triển bản thân",
          },
        ];
      case "skill_learning":
        return [
          {
            reason: "Gia tăng năng lực chuyên môn, tự tin mở rộng cơ hội thăng tiến",
            alignment: "Sự nghiệp & Công việc",
          },
          {
            reason: "Làm chủ kiến thức mới, tăng tính cạnh tranh và tự tin giải quyết vấn đề",
            alignment: "Học tập & Trí tuệ",
          },
          {
            reason: "Mở ra hướng đi mới và tăng thu nhập dài hạn nhờ năng lực được công nhận",
            alignment: "Sự nghiệp & Tài chính",
          },
        ];
      case "project_completion":
        return [
          {
            reason: "Hiện thực hóa ý tưởng ấp ủ và tạo ra sản phẩm thực tế của riêng mình",
            alignment: "Dự án cá nhân",
          },
          {
            reason: "Tạo nền tảng vững chắc và khẳng định uy tín năng lực cho tương lai",
            alignment: "Sự nghiệp & uy tín",
          },
          {
            reason: "Học cách quản lý dự án từ đầu đến cuối, rèn kỹ năng thực tiễn",
            alignment: "Kỹ năng thực tiễn",
          },
        ];
      case "financial_goal":
        return [
          {
            reason: "Xây dựng quỹ dự phòng tài chính an toàn, bảo vệ bản thân trước rủi ro",
            alignment: "Tài chính & Tích lũy",
          },
          {
            reason: "Tối ưu dòng tiền, đầu tư hiệu quả phục vụ tự do tài chính dài hạn",
            alignment: "Tài chính cá nhân",
          },
          {
            reason: "Giảm lo âu về tiền bạc để tập trung vào các mục tiêu ý nghĩa hơn",
            alignment: "Tâm lý & Tài chính",
          },
        ];
      default:
        return [
          {
            reason: "Nâng cấp phiên bản bản thân tốt hơn, hoàn thành cam kết và rèn tính nhất quán",
            alignment: "Phát triển bản thân",
          },
          {
            reason: "Sắp xếp lại nhịp sống cân bằng, dọn dẹp stress và tạo không gian thư thái",
            alignment: "Cân bằng cuộc sống",
          },
          {
            reason: "Tạo động lực tích cực, giúp mình tin tưởng vào khả năng thay đổi",
            alignment: "Tinh thần & Động lực",
          },
        ];
    }
  };

  const suggestions = (() => {
    if (focusArea && FOCUS_AREA_EXAMPLES[focusArea]) {
      const examples = FOCUS_AREA_EXAMPLES[focusArea].relevant;
      return examples.length >= 3 ? examples : [...examples, ...archetypeSuggestions()].slice(0, 4);
    }
    return archetypeSuggestions();
  })();

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="smart-relevant-reason" className={cn(labelClass, "flex items-center gap-1.5")}>
          <Heart className="h-4 w-4 text-app-accent" />
          Vì sao mục tiêu này quan trọng với bạn?
          <span className={requiredMarkerClass} aria-hidden="true">
            *
          </span>
          <span className="sr-only"> bắt buộc</span>
        </label>
        <Textarea
          id="smart-relevant-reason"
          placeholder="Ví dụ: Để tích lũy quỹ dự phòng giúp gia đình an tâm trước biến cố..."
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

        {showMotivationError ? (
          <FieldError id="smart-relevant-reason-error" message={motivationError.message} role="alert" />
        ) : null}
      </div>

      <div className="rounded-card border border-app-line bg-app-accent-subtle/20 p-3.5 space-y-3">
        <div>
          <p className="text-[11px] font-semibold text-app-accent mb-2 flex items-center gap-1.5 select-none">
            <Heart className="h-3.5 w-3.5" aria-hidden="true" /> Gợi ý lý do nhanh
          </p>
          <div className="grid gap-2 select-none sm:grid-cols-2">
            {suggestions.map((suggestion) => (
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
                className="flex min-h-12 w-full items-start rounded-xl border border-app-line bg-app-surface px-3 py-2.5 text-left text-xs font-semibold leading-5 text-app-ink shadow-sm transition-all duration-150 hover:border-app-accent/20 hover:bg-app-accent-soft/30 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40 cursor-pointer"
              >
                <span className="break-words">
                  {suggestion.reason}{" "}
                  <span className="text-[10px] text-app-ink-muted">({suggestion.alignment})</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-app-line/50 pt-2.5 select-none">
          <button
            type="button"
            onClick={() => setShowTips(!showTips)}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-app-ink-muted hover:text-app-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40 focus-visible:rounded-sm"
          >
            <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
            {showTips ? "Thu gọn mẹo viết lý do" : "Mẹo viết lý do hay"}
            {showTips ? <ChevronUp className="h-3 w-3" aria-hidden="true" /> : <ChevronDown className="h-3 w-3" aria-hidden="true" />}
          </button>

          {showTips && (
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              <div className="rounded-xl border border-app-accent/10 bg-app-accent-soft/40 p-3 flex items-start gap-2.5 text-xs leading-relaxed">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-app-accent-soft text-app-accent mt-0.5">
                  <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold text-app-accent">Nên viết rõ:</p>
                  <p className="mt-0.5 text-app-ink-soft italic">
                    "Để có quỹ khẩn cấp giúp gia đình an tâm trước rủi ro."
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-rose-500/10 bg-rose-50/30 dark:bg-rose-950/5 p-3 flex items-start gap-2.5 text-xs leading-relaxed">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 mt-0.5">
                  <X className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold text-rose-750 dark:text-rose-400">Tránh chung chung:</p>
                  <p className="mt-0.5 text-app-ink-soft italic">
                    "Kiếm nhiều tiền hơn" hoặc "Vì tôi thích thế."
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="smart-life-alignment" className={labelClass}>
          Khía cạnh cuộc sống liên kết (tùy chọn)
        </label>
        <Input
          id="smart-life-alignment"
          placeholder="Ví dụ: Sự nghiệp, Tài chính, Sức khỏe..."
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
        <p className={helperTextClass}>Bạn có thể bỏ trống nếu lý do ở trên đã chỉ rõ khía cạnh liên quan.</p>
      </div>
    </div>
  );
}
