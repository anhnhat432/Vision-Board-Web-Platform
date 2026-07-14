import { ChevronDown, ChevronUp, Lightbulb, X } from "lucide-react";
import { type Dispatch, type SetStateAction, useState } from "react";

import type { GoalArchetype } from "@/lib/smart-goal";
import { GoalArchetypeExamples } from "../../../components/GoalArchetypeExamples";
import { FieldError } from "../../../components/ui/field-error";
import { Textarea } from "../../../components/ui/textarea";
import { resolveFieldErrorDisplay } from "../../../utils/field-error-display";
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
  const [showGoalExamples, setShowGoalExamples] = useState(false);
  const specificLength = smartData.specific.goal_statement.trim().length;
  const activeArchetype = archetype ?? intentArchetype ?? "other";
  // Inline validation phân giải qua resolveFieldValidationState (Req 13.1–13.3).
  const specificError = resolveFieldErrorDisplay(
    smartData.specific.goal_statement.trim(),
    [{ kind: "required" }, { kind: "minLength", value: 10 }],
    {
      touched: hasBlurredGoalStatement,
      hasContent: specificLength > 0,
      forceShow: showError,
      messages: {
        required: "Mục tiêu cụ thể cần ít nhất 10 ký tự có nghĩa.",
        minLength: "Mục tiêu cụ thể cần ít nhất 10 ký tự có nghĩa.",
      },
    },
  );
  const showInlineError = specificError.showError;
  const specificDescribedBy = [
    "smart-specific-hint",
    "smart-specific-counter",
    showInlineError ? "smart-specific-error" : null,
  ]
    .filter(Boolean)
    .join(" ");
  const activeInferredArchetype = inferredArchetype ?? activeArchetype;

  const suggestions = (() => {
    if (focusArea && FOCUS_AREA_EXAMPLES[focusArea]) {
      return FOCUS_AREA_EXAMPLES[focusArea].specific;
    }
    const text = smartData.specific.goal_statement.toLowerCase();
    if (text.includes("chạy") || text.includes("gym") || text.includes("tập") || text.includes("thể dục")) {
      return [
        "Chạy bộ 3 buổi/tuần để tăng thể lực và cải thiện giấc ngủ",
        "Tập gym 4 buổi/tuần tập trung vào sức mạnh và thể lực",
        "Dậy sớm 30 phút để tập thể dục nhẹ nhàng mỗi ngày",
      ];
    }
    if (text.includes("ielts") || text.includes("tiếng anh") || text.includes("từ vựng")) {
      return [
        "Đạt 7.0 IELTS sau 12 tuần ôn luyện có hệ thống",
        "Học 20 từ vựng tiếng Anh mỗi ngày trong 3 tháng",
        "Luyện nói tiếng Anh 15 phút mỗi ngày với app đối thoại",
      ];
    }
    if (text.includes("tiền") || text.includes("tài chính") || text.includes("tiết kiệm")) {
      return [
        "Tích lũy 20 triệu đồng quỹ khẩn cấp trong 3 tháng",
        "Cắt giảm 15% chi tiêu không cần thiết mỗi tháng",
        "Đầu tư 10% thu nhập vào quỹ dài hạn tự động",
      ];
    }
    if (text.includes("code") || text.includes("lập trình") || text.includes("react")) {
      return [
        "Hoàn thành khóa học React và xây 2 dự án cá nhân",
        "Làm chủ JavaScript nâng cao qua 30 bài tập thực tế",
        "Xây dựng portfolio lập trình với 3 case study",
      ];
    }
    if (text.includes("viết") || text.includes("blog") || text.includes("sách")) {
      return [
        "Viết 6 bài blog chuyên sâu về chủ đề mình am hiểu",
        "Hoàn thành bản thảo 20.000 từ cho cuốn sách đầu tay",
        "Xuất bản 1 bài viết mỗi tuần trên nền tảng cá nhân",
      ];
    }
    if (text.includes("đọc") || text.includes("sách")) {
      return [
        "Đọc 12 cuốn sách trong năm, 1 cuốn mỗi tháng",
        "Dành 30 phút đọc sách mỗi tối trước khi ngủ",
        "Hoàn thành 1 cuốn sách phát triển bản thân mỗi tháng",
      ];
    }
    switch (activeArchetype) {
      case "habit_building":
        return [
          "Thói quen chạy bộ buổi sáng hàng ngày để nâng cao thể lực",
          "Đọc sách 30 trang mỗi tối trước khi đi ngủ",
          "Ghi chép chi tiêu cá nhân mỗi ngày để tối ưu ngân sách",
          "Dậy sớm 1 tiếng để tập trung cho mục tiêu quan trọng",
        ];
      case "skill_learning":
        return [
          "Làm chủ kiến thức nền tảng về lập trình web với React và Tailwind",
          "Luyện tập kỹ năng giao tiếp tiếng Anh trong môi trường công sở",
          "Master kỹ năng thiết kế slide chuyên nghiệp",
          "Hoàn thành chứng chỉ chuyên môn trong lĩnh vực của mình",
        ];
      case "project_completion":
        return [
          "Hoàn thành thiết kế và phát triển ứng dụng di động cá nhân đầu tiên",
          "Cải tạo, trang trí lại toàn bộ phòng làm việc tại nhà",
          "Viết và xuất bản 3 bài viết chuyên sâu trên blog cá nhân",
          "Tổ chức 1 sự kiện hoặc workshop nhỏ cho cộng đồng",
        ];
      case "financial_goal":
        return [
          "Thiết lập thêm một nguồn thu nhập thụ động từ viết lách tự do",
          "Cắt giảm 15% các khoản chi tiêu không cần thiết",
          "Bắt đầu đầu tư tích lũy định kỳ hàng tháng",
          "Tích lũy quỹ khẩn cấp 3-6 tháng chi tiêu cần thiết",
        ];
      default:
        return [
          "Thiền định chánh niệm 15 phút mỗi ngày để giảm stress",
          "Hoàn thành khóa học trực tuyến nâng cao kiến thức chuyên ngành",
          "Dọn dẹp và tối giản hóa không gian sống mỗi tuần",
          "Dành 30 phút mỗi ngày để học một kỹ năng mới",
        ];
    }
  })();
  const primarySuggestion = suggestions[0];
  const secondarySuggestions = suggestions.slice(1, 4);

  return (
    <div className="min-w-0 space-y-4">
      <div className="rounded-[24px] border border-app-line bg-app-surface/85 p-3.5 shadow-[0_18px_55px_-48px_rgba(23,21,15,0.45)] sm:p-4">
        <label htmlFor="smart-specific" className={`${labelClass} text-[12px] text-app-ink-muted`}>
          Mục tiêu cụ thể của bạn
          <span className={requiredMarkerClass} aria-hidden="true">
            *
          </span>
          <span className="sr-only"> bắt buộc</span>
        </label>
        <Textarea
          id="smart-specific"
          placeholder="Ví dụ: Hoàn thành một dự án nổi bật có thể đưa vào portfolio..."
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
          className={`${textareaClass} min-h-[170px] rounded-[20px] border-app-line bg-app-bg px-4 py-4 text-[15px] leading-7 shadow-none transition-all focus:ring-2 focus:ring-app-accent/20 sm:min-h-[190px]`}
          aria-invalid={showInlineError}
          aria-describedby={specificDescribedBy}
        />

        <div className="mt-2.5 flex items-center justify-between gap-3 px-1 text-[11px] font-medium text-app-ink-muted select-none">
          <span id="smart-specific-hint">Viết bằng một câu có kết quả bạn muốn đạt và nhìn thấy được.</span>
          <span
            id="smart-specific-counter"
            className={specificLength >= 10 ? "text-app-accent font-semibold" : "text-app-ink-muted"}
          >
            {specificLength}/10 ký tự
          </span>
        </div>

        {showInlineError ? (
          <FieldError id="smart-specific-error" message={specificError.message} role="alert" />
        ) : null}
      </div>

      <div className="rounded-card-lg border border-app-line bg-app-bg-subtle/70 p-3.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-app-accent">Câu mẫu gần ô nhập</p>
            <p className="mt-1 text-xs leading-5 text-app-ink-muted">Bấm để dùng rồi chỉnh lại theo đời sống của bạn.</p>
          </div>
          {primarySuggestion ? (
            <button
              type="button"
              onClick={() => {
                setSmartData((previous) => ({
                  ...previous,
                  specific: { goal_statement: primarySuggestion },
                }));
                setHasBlurredGoalStatement(true);
              }}
              className="inline-flex min-h-11 max-w-full items-center justify-center rounded-[16px] border border-app-accent/20 bg-app-surface px-3.5 py-2.5 text-left text-xs font-bold leading-5 text-app-ink transition-all duration-150 hover:border-app-accent/35 hover:bg-app-accent-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/35 sm:max-w-[320px]"
            >
              <span className="line-clamp-2">{primarySuggestion}</span>
            </button>
          ) : null}
        </div>

        {secondarySuggestions.length > 0 ? (
          <details className="group mt-3 border-t border-app-line/60 pt-3">
            <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 rounded-control text-[12px] font-bold text-app-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/35 [&::-webkit-details-marker]:hidden">
              <span>Xem thêm câu mở đầu</span>
              <ChevronDown className="h-4 w-4 text-app-ink-muted transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {secondarySuggestions.map((suggestion) => (
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
                  className="min-h-11 rounded-card border border-app-line bg-app-surface px-3 py-2 text-left text-xs font-semibold leading-5 text-app-ink-soft transition-all duration-150 hover:border-app-accent/30 hover:bg-app-surface hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/35"
              >
                  {suggestion}
              </button>
              ))}
            </div>
          </details>
        ) : null}

        <div className="mt-3 border-t border-app-line/60 pt-3 select-none">
          <button
            type="button"
            onClick={() => setShowTips(!showTips)}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-control text-[12px] font-bold text-app-ink-muted transition-colors hover:text-app-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40"
          >
            <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
            {showTips ? "Thu gọn gợi ý viết mục tiêu" : "Mẹo viết mục tiêu hay"}
            {showTips ? <ChevronUp className="h-3 w-3" aria-hidden="true" /> : <ChevronDown className="h-3 w-3" aria-hidden="true" />}
          </button>

          {showTips && (
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              <div className="rounded-[16px] border border-app-accent/15 bg-app-accent-soft/30 p-3 flex items-start gap-2.5 text-xs leading-relaxed">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-app-accent-soft text-app-accent mt-0.5">
                  <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold text-app-accent">Nên viết cụ thể:</p>
                  <p className="mt-0.5 text-app-ink-soft italic">
                    "Hoàn thành khóa học React và tự làm 1 trang web cá nhân."
                  </p>
                </div>
              </div>
              <div className="rounded-[16px] border border-rose-500/15 bg-rose-50/30 dark:bg-rose-950/10 p-3 flex items-start gap-2.5 text-xs leading-relaxed">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-600 mt-0.5">
                  <X className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold text-rose-750 dark:text-rose-400">Tránh viết mơ hồ:</p>
                  <p className="mt-0.5 text-app-ink-soft italic">
                    "Học lập trình tốt hơn" hoặc "Trở thành coder giỏi."
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <details className="group rounded-card border border-app-line bg-app-surface/75 p-3.5">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-[12px] font-bold text-app-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/35 [&::-webkit-details-marker]:hidden">
          <span>Tùy chỉnh loại mục tiêu</span>
          <ChevronDown
            className="h-4 w-4 text-app-ink-muted transition-transform duration-200 group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <div className="mt-3 space-y-3 border-t border-app-line pt-3">
          <ArchetypePicker
            archetype={activeArchetype}
            inferredArchetype={activeInferredArchetype}
            isUserOverridden={Boolean(isArchetypeOverridden)}
            onChange={onArchetypeChange ?? (() => {})}
            onResetToInferred={onArchetypeResetToInferred ?? (() => {})}
          />
          <ArchetypeHint archetype={activeArchetype} variant="antiPattern" showArchetypeTag={false} />
        </div>
      </details>

      {intentArchetype && intentArchetype !== "other" ? (
        <div className="rounded-card border border-app-line bg-app-surface p-3.5">
          <button
            type="button"
            onClick={() => setShowGoalExamples(!showGoalExamples)}
            className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 text-left text-[12px] font-bold text-app-ink-soft transition-colors hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/35"
          >
            <span>Xem ví dụ yếu và mạnh</span>
            {showGoalExamples ? (
              <ChevronUp className="h-4 w-4 text-app-ink-muted" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4 text-app-ink-muted" aria-hidden="true" />
            )}
          </button>
          {showGoalExamples ? <div className="mt-3 border-t border-app-line pt-3"><GoalArchetypeExamples archetype={intentArchetype} variant="goal" /></div> : null}
        </div>
      ) : null}
    </div>
  );
}
