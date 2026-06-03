import { Award, ClipboardCheck, Flag, Lightbulb, Target } from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { MotionFadeIn } from "@/app/components/motion";
import { useReducedMotion } from "@/app/components/ui/use-reduced-motion";

import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { cn } from "@/app/components/ui/utils";
import { soundService } from "@/app/services/soundService";
import type { PricingPlanCode } from "@/app/utils/storage";
import type {
  AdaptiveTemplateRecommendation,
  AdaptiveTemplateSupport,
  TwelveWeekTemplateDefinition,
} from "@/app/utils/twelve-week-premium";
import type { PendingSMARTGoal } from "@/lib/smart-goal";
import { inputClass, labelClass, textareaClass } from "../../../../../app/pages/SMARTGoalSetup/components/formStyles";
import { GOAL_TYPES } from "../constants";
import { getMilestoneValidationError } from "../helpers";
import type { PendingFeasibilityResult, TwelveWeekSetupDraft } from "../types";

interface OutcomeStepLabProps {
  feasibility: PendingFeasibilityResult;
  draft: TwelveWeekSetupDraft;
  currentPlan: PricingPlanCode;
  smartGoal: PendingSMARTGoal;
  selectedTemplate: TwelveWeekTemplateDefinition | null;
  recommendedTemplate: TwelveWeekTemplateDefinition | null;
  adaptiveTemplateRecommendation?: AdaptiveTemplateRecommendation | null;
  recommendedTemplateSupport?: AdaptiveTemplateSupport | null;
  onChange: <K extends keyof TwelveWeekSetupDraft>(key: K, value: TwelveWeekSetupDraft[K]) => void;
  onTemplateSelect: (template: TwelveWeekTemplateDefinition) => void;
  onTemplatePersonalizationChange?: <K extends "dailyTimeBudget" | "personalConstraint">(
    key: K,
    value: TwelveWeekSetupDraft[K],
  ) => void;
  onPreferredDayToggle?: (dayIndex: number) => void;
}

const GOAL_TYPE_EMOJIS: Record<string, string> = {
  "Skill Learning": "🎓",
  "Habit Building": "🌱",
  "Fitness / Health": "🏃",
  "Exam / Study": "📝",
  "Career / Job Search": "💼",
  "Finance / Saving": "💰",
  "Project Completion": "🚀",
  "Personal Growth": "✨",
  Other: "🎯",
};

export function OutcomeStepLab({
  draft,
  onChange,
  smartGoal,
  feasibility,
  currentPlan: _currentPlan,
  selectedTemplate: _selectedTemplate,
  recommendedTemplate: _recommendedTemplate,
  onTemplateSelect: _onTemplateSelect,
}: OutcomeStepLabProps) {
  const prefersReducedMotion = useReducedMotion();
  const [hasPlayedSuccess, setHasPlayedSuccess] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const isW4Filled = draft.week4Milestone.trim().length > 0;
  const isW8Filled = draft.week8Milestone.trim().length > 0;
  const isW12Filled = draft.week12Outcome.trim().length > 0;

  useEffect(() => {
    if (isW4Filled && isW8Filled && isW12Filled) {
      if (!hasPlayedSuccess) {
        soundService.success();
        setHasPlayedSuccess(true);
      }
    } else {
      setHasPlayedSuccess(false);
    }
  }, [isW4Filled, isW8Filled, isW12Filled, hasPlayedSuccess]);

  const milestoneError = getMilestoneValidationError({
    week4: draft.week4Milestone,
    week8: draft.week8Milestone,
    week12: draft.week12Outcome,
  });

  return (
    <>
      {/* 🎯 SMART GOAL RECAP CARD - Visual Anchor dạng ảnh Polaroid Pinterest */}
      {smartGoal && (
        <MotionFadeIn>
          <div className="relative mx-auto max-w-lg overflow-hidden rounded-card border border-app-line bg-app-bg-subtle/40 p-5 pt-7 pb-5 text-xs text-app-ink-soft select-none shadow-app-sm border-t-[3px] border-t-app-accent/60 flex flex-col items-center text-center">
            {/* Ghim giấy giả lập Notion/Pinterest */}
            <div
              className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-3 bg-app-line/40 dark:bg-app-line/20 rounded-full border border-app-line/20 shadow-3xs"
              aria-hidden="true"
            />

            <p className="font-bold text-app-accent uppercase tracking-wider text-[10px] mb-2 flex items-center gap-1">
              🎯 Mục tiêu SMART của bạn
            </p>
            <h4 className="font-serif text-base font-semibold text-app-ink leading-relaxed max-w-md italic">
              “{smartGoal.specific}”
            </h4>
            {smartGoal.measurable && (
              <p className="mt-2 text-xs text-app-ink-muted leading-relaxed font-medium">
                Thước đo thành công:{" "}
                <span className="font-bold text-app-ink-soft border-b border-dashed border-app-accent/30">
                  {smartGoal.measurable}
                </span>
              </p>
            )}

            {feasibility?.smartGoalQualityNote && (
              <div className="mt-4 pt-3.5 border-t border-app-line flex gap-2 items-start text-xs bg-app-accent-soft/20 p-3 rounded-card text-app-accent w-full text-left">
                <span className="text-sm shrink-0">✨</span>
                <div className="min-w-0">
                  <span className="font-extrabold uppercase tracking-wider text-[10px] text-app-accent block mb-0.5">
                    Trợ lý AI Copilot nhận xét:
                  </span>
                  <p className="leading-relaxed italic text-xs font-medium">“{feasibility.smartGoalQualityNote}”</p>
                </div>
              </div>
            )}
          </div>
        </MotionFadeIn>
      )}

      {/* 🎓 PHÂN LOẠI MỤC TIÊU - Đưa ra ngoài luồng chính, tương tác 1 chạm sinh động */}
      <section
        className="rounded-card border border-app-line bg-app-surface p-4.5 sm:p-5 shadow-app-sm space-y-3"
        aria-labelledby="goal-type-section-title"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-app-accent-soft text-app-accent text-xs">
            🎓
          </span>
          <div>
            <h3
              id="goal-type-section-title"
              className="text-xs font-extrabold uppercase tracking-wider text-app-accent"
            >
              Phân loại mục tiêu của bạn
            </h3>
            <p className="text-xs text-app-ink-muted">
              Chạm 1 chạm để phân loại nhanh. AI sẽ tối ưu các gợi ý hành động dựa trên phân loại này.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-1.5 justify-center sm:justify-start">
          {GOAL_TYPES.map((item) => {
            const isActive = draft.goalType === item.value;
            const emoji = GOAL_TYPE_EMOJIS[item.value] || "🎯";
            return (
              <motion.button
                whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
                key={item.value}
                type="button"
                onClick={() => {
                  soundService.click();
                  onChange("goalType", item.value);
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold transition-all duration-200 active:scale-95 font-sans focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2",
                  isActive
                    ? "border-app-accent bg-app-accent text-white shadow-sm shadow-app-accent/20 scale-105"
                    : "border-app-line bg-app-surface text-app-ink-soft hover:border-app-accent/30",
                )}
              >
                <span className="text-sm leading-none">{emoji}</span>
                <span>{item.label}</span>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* BIỂU MẪU LỘ TRÌNH CỐT LÕI (ĐÃ TỰ ĐIỀN) */}
      <section
        className="relative overflow-hidden rounded-card border border-app-line bg-app-surface p-5 sm:p-6 shadow-app-sm space-y-5"
        aria-labelledby="outcome-required-title"
      >
        <div className="flex items-center justify-between border-b border-app-line/60 pb-3">
          <div>
            <h3
              id="outcome-required-title"
              className="text-xs font-extrabold uppercase tracking-wider text-app-accent flex items-center gap-1.5"
            >
              <Award className="h-4 w-4" />
              <span>Thiết kế Lộ trình 12 tuần</span>
            </h3>
            <p className="mt-0.5 text-xs text-app-ink-muted leading-relaxed">
              Hệ thống đã tự động tính toán lộ trình 12 tuần từ mục tiêu SMART. Bạn chỉ việc rà soát và chỉnh sửa.
            </p>
          </div>
          <span className="rounded-pill bg-app-status-success/10 px-2.5 py-0.5 text-[10px] font-extrabold text-app-status-success border border-app-status-success/20 shrink-0">
            Tự điền 90%
          </span>
        </div>

        <div className="space-y-5 pt-1">
          {/* Đích đến cuối cùng Tuần 12 - BẮT BUỘC (CẦN ĐIỀN NGAY) */}
          <div className="space-y-2 p-4.5 rounded-card bg-app-accent-soft/20 border border-app-accent/10">
            <label htmlFor="week-12-outcome" className={cn(labelClass, "flex flex-col gap-1 text-app-ink font-bold")}>
              <div className="flex items-center gap-1.5">
                <Award className="h-4.5 w-4.5 text-app-accent shrink-0 animate-pulse" />
                <span className="text-app-ink">🏆 Kết quả cụ thể nào sau 12 tuần sẽ làm bạn tự hào nhất?</span>
                <span className="text-xs font-semibold text-app-accent ml-auto shrink-0">(Bắt buộc)</span>
              </div>
            </label>
            <Textarea
              id="week-12-outcome"
              rows={2}
              value={draft.week12Outcome}
              aria-invalid={Boolean(milestoneError)}
              className={cn(
                textareaClass,
                "min-h-[60px] text-sm leading-relaxed border-app-accent/30 focus-visible:ring-app-accent rounded-xl",
                milestoneError && "border-app-status-error focus-visible:border-app-status-error focus-visible:ring-app-status-error/20",
              )}
              onChange={(event) => onChange("week12Outcome", event.target.value)}
              placeholder="Nhập đích đến của bạn (Ví dụ: Chạy bộ liên tục 10km không nghỉ, học xong 12 chương tiếng Anh…)"
            />
            {/* Nút điền nhanh từ SMART goal */}
            {smartGoal && (
              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    soundService.click();
                    onChange("week12Outcome", smartGoal.measurable || smartGoal.specific);
                  }}
                  className="text-[11px] font-bold text-app-accent hover:text-app-accent-hover hover:underline flex items-center gap-1"
                >
                  ✨ Lấy từ thước đo SMART Goal
                </button>
              </div>
            )}
            {milestoneError ? (
              <p role="alert" className="text-xs font-bold text-app-status-error">
                {milestoneError}
              </p>
            ) : (
              <p className="text-xs italic text-app-ink-soft leading-relaxed">
                Kế hoạch 12 tuần thành công khi bạn cán đổ cột mốc cụ thể này.
              </p>
            )}
          </div>

          {/* ACCORDION: Tùy chỉnh thêm (Customize Later) mặc định đóng gọn gàng để tránh gây ngợp */}
          <div className="border-t border-app-line/60 pt-4">
            <button
              type="button"
              onClick={() => {
                soundService.click();
                setIsAdvancedOpen(!isAdvancedOpen);
              }}
              className="flex w-full items-center justify-between text-xs font-bold text-app-accent py-2 px-3.5 rounded-control bg-app-accent-soft/30 border border-app-line hover:bg-app-accent-soft/45 transition-all select-none"
            >
              <span className="flex items-center gap-1.5">
                <ClipboardCheck className="h-4 w-4 text-app-accent" />
                <span>⚙️ Tự chỉnh sửa thêm (Mốc chặng W4/W8 & Động lực - Tùy chọn)</span>
              </span>
              <span
                className={cn(
                  "text-[10px] px-2.5 py-0.5 rounded-pill font-bold transition-all border border-app-line bg-app-surface",
                  isAdvancedOpen ? "text-app-ink-soft" : "text-app-accent animate-pulse",
                )}
              >
                {isAdvancedOpen ? "Thu gọn ▴" : "Chỉnh sửa ▾"}
              </span>
            </button>

            {isAdvancedOpen && (
              <div className="mt-5 space-y-5 animate-in slide-in-from-top-2 duration-300">
                {/* Cột mốc Tuần 4 & Tuần 8 - Đặt cùng một hàng ngang */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="milestone-week-4"
                      className={cn(labelClass, "flex items-center gap-1.5 text-app-ink font-bold")}
                    >
                      <Target className="h-4 w-4 text-app-accent shrink-0" />
                      <span>🎯 Mốc tuần 4: Tạo đà ban đầu</span>
                    </label>
                    <Input
                      id="milestone-week-4"
                      value={draft.week4Milestone}
                      className={inputClass}
                      onChange={(event) => onChange("week4Milestone", event.target.value)}
                      placeholder="Ví dụ: Đọc xong 3 cuốn sách đầu tiên…"
                    />
                    <p className="text-xs italic text-app-ink-muted leading-relaxed">
                      Mốc tháng đầu tiên giúp bạn xây dựng thói quen và quán tính hành động.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="milestone-week-8"
                      className={cn(labelClass, "flex items-center gap-1.5 text-app-ink font-bold")}
                    >
                      <Flag className="h-4 w-4 text-app-accent shrink-0" />
                      <span>🚀 Mốc tuần 8: Bứt phá tăng tốc</span>
                    </label>
                    <Input
                      id="milestone-week-8"
                      value={draft.week8Milestone}
                      className={inputClass}
                      onChange={(event) => onChange("week8Milestone", event.target.value)}
                      placeholder="Ví dụ: Hoàn thành 60% chương trình học…"
                    />
                    <p className="text-xs italic text-app-ink-muted leading-relaxed">
                      Điểm bứt phá quan trọng, giúp tăng tốc trước khi về đích.
                    </p>
                  </div>
                </div>

                {/* Động lực cốt lõi */}
                <div className="space-y-1.5 border-t border-app-line/40 pt-4">
                  <label
                    htmlFor="vision-12-week"
                    className={cn(labelClass, "flex items-center gap-1.5 text-app-ink font-bold")}
                  >
                    <Lightbulb className="h-4 w-4 text-app-accent shrink-0" />
                    <span>💡 Động lực: Tại sao bạn nhất định phải làm điều này?</span>
                  </label>
                  <Textarea
                    id="vision-12-week"
                    rows={2}
                    value={draft.vision12Week}
                    onChange={(event) => onChange("vision12Week", event.target.value)}
                    className="min-h-[50px] text-xs leading-relaxed"
                    placeholder="Ví dụ: Giúp tôi tự tin hơn, bứt phá thu nhập và nâng tầm cuộc sống…"
                  />
                  <p className="text-xs italic text-app-ink-muted leading-relaxed">
                    Lý do đủ lớn sẽ giúp bạn duy trì kỷ luật và năng lượng vào những ngày mệt mỏi.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
