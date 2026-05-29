import type { ReactNode, RefObject } from "react";
import { useRef } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  Lightbulb,
  Sparkles,
  ChevronDown,
  Target,
  BarChart3,
  ShieldCheck,
  Heart,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import type { QualityLevel } from "@/lib/smart-goal/quality";
import { cn } from "@/app/components/ui/utils";

import { QualityFeedbackPanel } from "./QualityFeedbackPanel";
import { ReviewStep } from "./ReviewStep";
import { SMART_STEPS } from "../constants";
import type { GoalClarityItem, SMARTData, SmartGoalSummaryRow, SmartStepDefinition, SmartStepKey } from "../types";

interface QualityFeedbackData {
  level: QualityLevel;
  overallScore: number;
  warnings: string[];
  suggestions: string[];
  canProceedToFeasibility: boolean;
}

interface SmartGoalStepShellProps {
  stepIndex: number;
  totalSteps: number;
  step: SmartStepDefinition;
  headingRef: RefObject<HTMLHeadingElement | null>;
  children: ReactNode;
  starterPreview: string;
  clarityItems: GoalClarityItem[];
  clarityDoneCount: number;
  clarityProgress: number;
  summaryRows: SmartGoalSummaryRow[];
  showReview: boolean;
  currentStepError: string | null;
  currentStepSoftWarning: string | null;
  isCurrentStepValid: boolean;
  qualityFeedback: QualityFeedbackData | null;
  smartData: SMARTData;
  onApplyStarter: () => void;
  onJumpToStep: (stepKey: SmartStepKey) => void;
  onBack: () => void;
  onNext: () => void;
}

const STEP_NAMES: Record<SmartStepKey, string> = {
  specific: "Specific",
  measurable: "Measurable",
  achievable: "Achievable",
  relevant: "Relevant",
  timeBound: "Time-bound",
};

const STEP_LETTERS: Record<SmartStepKey, string> = {
  specific: "S",
  measurable: "M",
  achievable: "A",
  relevant: "R",
  timeBound: "T",
};

const STEP_ICONS: Record<SmartStepKey, typeof Target> = {
  specific: Target,
  measurable: BarChart3,
  achievable: ShieldCheck,
  relevant: Heart,
  timeBound: Clock,
};

export function SmartGoalStepShell({
  stepIndex,
  totalSteps,
  step,
  headingRef,
  children,
  starterPreview,
  clarityItems,
  clarityDoneCount,
  clarityProgress,
  summaryRows,
  showReview,
  currentStepError,
  currentStepSoftWarning,
  isCurrentStepValid,
  qualityFeedback,
  smartData,
  onApplyStarter,
  onJumpToStep,
  onBack,
  onNext,
}: SmartGoalStepShellProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);

  const handleWizardJump = (index: number) => {
    const nextStep = SMART_STEPS[index];
    if (nextStep) {
      onJumpToStep(nextStep.key);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const xc = rect.width / 2;
    const yc = rect.height / 2;

    const angleX = (yc - y) / 12; // Xoay tối đa ~15 độ xung quanh trục X
    const angleY = (x - xc) / 12; // Xoay tối đa ~15 độ xung quanh trục Y

    card.style.setProperty("--rotate-x", `${angleX}deg`);
    card.style.setProperty("--rotate-y", `${angleY}deg`);
    card.style.setProperty("--glare-x", `${(x / rect.width) * 100}%`);
    card.style.setProperty("--glare-y", `${(y / rect.height) * 100}%`);
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.setProperty("--rotate-x", "0deg");
    card.style.setProperty("--rotate-y", "0deg");
    card.style.setProperty("--glare-x", "50%");
    card.style.setProperty("--glare-y", "50%");
  };

  const specText = smartData.specific.goal_statement.trim();
  const measTarget = smartData.measurable.target_value.trim();
  const measUnit = smartData.measurable.metric_name.includes("/")
    ? smartData.measurable.metric_name.split("/")[1].trim()
    : "đơn vị";
  const achHours = smartData.achievable.weekly_time_commitment_hours.trim();
  const relReason = smartData.relevant.motivation_reason.trim();
  const timeDate =
    smartData.timeBound.mode === "date"
      ? smartData.timeBound.target_date.trim()
      : smartData.timeBound.target_weeks.trim()
        ? `trong ${smartData.timeBound.target_weeks.trim()} tuần`
        : "";

  const isSpecFilled = specText.length > 0;
  const isMeasFilled = measTarget.length > 0;
  const isAchFilled = achHours.length > 0;
  const isRelFilled = relReason.length > 0;
  const isTimeFilled = timeDate.length > 0;

  return (
    <section
      className="rounded-[20px] border border-app-line bg-app-surface p-5 sm:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.02)]"
      aria-labelledby="smart-step-title"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-app-accent flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-app-accent animate-pulse" />
            Bước {stepIndex + 1}: {STEP_NAMES[step.key]}
          </p>
          <h2
            id="smart-step-title"
            ref={headingRef}
            tabIndex={-1}
            className="mt-2 font-serif text-2xl sm:text-3xl font-medium leading-8 text-app-ink focus:outline-none"
          >
            {step.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-app-ink-soft">{step.description}</p>
        </div>
        <span className="inline-flex w-fit rounded-full bg-app-accent-soft px-3 py-1 text-xs font-bold text-app-accent shadow-sm border border-app-accent/10">
          {stepIndex + 1}/{totalSteps}
        </span>
      </div>

      {/* Stepper dòng chảy năng lượng */}
      <div className="relative mt-7">
        <div className="absolute top-[22px] left-[10%] right-[10%] h-[3px] bg-app-line rounded-full z-0 overflow-hidden" aria-hidden="true">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-app-accent transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]"
            style={{ width: `${(stepIndex / (totalSteps - 1)) * 100}%` }}
          />
        </div>

        <ol aria-label={`Bước ${stepIndex + 1} trên ${totalSteps}`} className="relative z-10 grid grid-cols-5 gap-2">
          {SMART_STEPS.map((smartStep, index) => {
            const isActive = index === stepIndex;
            const isDone = index < stepIndex;
            const canJump = index <= stepIndex;
            const StepIcon = STEP_ICONS[smartStep.key];

            return (
              <li key={smartStep.key} aria-current={isActive ? "step" : undefined}>
                <button
                  type="button"
                  disabled={!canJump}
                  onClick={() => handleWizardJump(index)}
                  className={cn(
                    "flex h-full w-full flex-col items-center gap-1.5 rounded-[16px] border p-2.5 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2",
                    isActive
                      ? "border-app-accent bg-app-accent-soft text-app-accent shadow-[0_4px_12px_rgba(var(--color-accent-rgb),0.12)] scale-[1.03]"
                      : isDone
                        ? "border-app-accent/30 bg-app-accent text-white hover:bg-app-accent hover:scale-[1.02]"
                        : "border-app-line bg-app-bg text-app-ink-muted hover:bg-app-accent-soft/30 hover:text-app-accent disabled:cursor-default"
                  )}
                >
                  <span className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300",
                    isActive
                      ? "bg-app-accent text-white shadow-[0_0_8px_rgba(var(--color-accent-rgb),0.4)]"
                      : isDone
                        ? "bg-white/20 text-white"
                        : "bg-app-surface text-app-ink-muted border border-app-line"
                  )}>
                    <StepIcon className="h-4 w-4" />
                  </span>
                  <span className="text-[10px] font-bold tracking-widest uppercase">{STEP_LETTERS[smartStep.key]}</span>
                  <span className="hidden truncate text-xs font-semibold sm:block">{STEP_NAMES[smartStep.key]}</span>
                  {isDone ? <span className="sr-only">đã hoàn thành</span> : null}
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="my-6 h-px bg-app-line" aria-hidden="true" />

      {/* Tấm thẻ Live Preview 3D Glassmorphism */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: Xoay 3D bằng di chuột tạo hiệu ứng lấp lánh */}
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: "perspective(1000px) rotateX(var(--rotate-x, 0deg)) rotateY(var(--rotate-y, 0deg)) scale3d(1, 1, 1)",
          transition: "transform 0.15s ease-out, box-shadow 0.15s ease-out",
        } as React.CSSProperties}
        className="group relative mb-6 rounded-2xl border border-white/20 dark:border-white/10 bg-gradient-to-br from-indigo-500/10 via-app-surface to-emerald-500/10 p-5 sm:p-6 shadow-md overflow-hidden backdrop-blur-md"
      >
        {/* Lớp bóng chiếu sáng 3D Glare */}
        <div
          className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: "radial-gradient(circle at var(--glare-x, 50%) var(--glare-y, 50%), rgba(255,255,255,0.18) 0%, transparent 60%)",
          } as React.CSSProperties}
        />
        <div className="absolute top-3 right-4 flex items-center gap-1.5 text-xs text-app-accent/80 font-medium select-none pointer-events-none">
          <span>🔮 Thẻ Bài Tương Lai</span>
        </div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-app-accent mb-3.5 flex items-center gap-1.5">
          <span>✨</span> MỤC TIÊU CỦA BẠN (LIVE PREVIEW)
        </p>
        <div className="text-base sm:text-lg leading-relaxed text-app-ink/90 font-serif">
          Tôi quyết tâm{" "}
          <span className={cn("px-1.5 py-0.5 rounded font-bold transition-all duration-300",
            isSpecFilled
              ? "bg-emerald-100/90 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
              : "text-app-ink-muted bg-app-bg/50 italic border-b border-dashed border-app-ink-muted/30"
          )}>
            {isSpecFilled ? specText : "[làm việc cụ thể này]"}
          </span>{" "}
          🎯. Tôi sẽ đo lường tiến bộ bằng cách đạt mốc{" "}
          <span className={cn("px-1.5 py-0.5 rounded font-bold transition-all duration-300",
            isMeasFilled
              ? "bg-blue-100/90 text-blue-900 dark:bg-blue-950/70 dark:text-blue-300 shadow-[0_0_8px_rgba(59,130,246,0.2)]"
              : "text-app-ink-muted bg-app-bg/50 italic border-b border-dashed border-app-ink-muted/30"
          )}>
            {isMeasFilled ? `${measTarget} ${measUnit}` : "[chỉ số mục tiêu]"}
          </span>{" "}
          📊. Tôi cam kết dành ra{" "}
          <span className={cn("px-1.5 py-0.5 rounded font-bold transition-all duration-300",
            isAchFilled
              ? "bg-amber-100/90 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.2)]"
              : "text-app-ink-muted bg-app-bg/50 italic border-b border-dashed border-app-ink-muted/30"
          )}>
            {isAchFilled ? `${achHours} giờ mỗi tuần` : "[số tiếng/tuần]"}
          </span>{" "}
          ⚡ để hành động. Việc này rất quan trọng vì{" "}
          <span className={cn("px-1.5 py-0.5 rounded font-bold transition-all duration-300",
            isRelFilled
              ? "bg-rose-100/90 text-rose-900 dark:bg-rose-950/70 dark:text-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.2)]"
              : "text-app-ink-muted bg-app-bg/50 italic border-b border-dashed border-app-ink-muted/30"
          )}>
            {isRelFilled ? relReason : "[lý do sâu sắc của bạn]"}
          </span>{" "}
          ❤️ và thời hạn hoàn thành trước{" "}
          <span className={cn("px-1.5 py-0.5 rounded font-bold transition-all duration-300",
            isTimeFilled
              ? "bg-purple-100/90 text-purple-900 dark:bg-purple-950/70 dark:text-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.2)]"
              : "text-app-ink-muted bg-app-bg/50 italic border-b border-dashed border-app-ink-muted/30"
          )}>
            {isTimeFilled ? timeDate : "[thời gian đích]"}
          </span>{" "}
          📅.
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={stepIndex}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-5"
        >
          {children}

          {/* AI Coach Bubble sinh động */}
          <div className="relative overflow-hidden rounded-2xl border border-teal-200/50 dark:border-teal-900/30 bg-gradient-to-r from-teal-50/40 to-emerald-50/30 dark:from-teal-950/20 dark:to-emerald-950/10 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition-all duration-300 hover:shadow-md">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-4 items-start min-w-0">
                {/* Icon trợ lý AI lấp lánh sinh động */}
                <div className="flex-shrink-0 relative">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20 animate-[pulse_2s_infinite]">
                    <Sparkles className="h-5 w-5 animate-[spin_6s_linear_infinite]" />
                  </div>
                  <span className="absolute -bottom-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900 border border-white text-[10px]" aria-hidden="true">🤖</span>
                </div>

                {/* Bong bóng thoại */}
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Cố vấn mục tiêu SMART
                    </span>
                    <span className="inline-flex items-center rounded-md bg-teal-100/60 dark:bg-teal-900/50 px-1.5 py-0.5 text-[10px] font-medium text-teal-800 dark:text-teal-300">
                      Online
                    </span>
                  </div>

                  <div className="relative bg-app-surface border border-app-line rounded-2xl rounded-tl-none p-3.5 shadow-sm text-sm leading-relaxed text-app-ink">
                    <p className="font-serif italic text-app-ink/90">
                      “{starterPreview}”
                    </p>
                    <div className="mt-2 text-xs text-app-ink-muted flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                      <span>Bạn có thể sử dụng gợi ý này làm bản nháp và điều chỉnh lại.</span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-500/10 transition-all duration-200 hover:brightness-105 active:scale-[0.98] sm:w-auto"
                onClick={onApplyStarter}
                aria-label={`Dùng gợi ý cho bước ${step.label}`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Sử dụng ngay
              </button>
            </div>
          </div>

          <details className="group rounded-[16px] border border-app-line bg-app-surface p-4 transition-all duration-200 shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 rounded-lg p-1 [&::-webkit-details-marker]:hidden">
              <div className="space-y-1">
                <p className="flex items-center gap-2 font-semibold">
                  Kiểm tra độ rõ của mục tiêu (Clarity)
                  <ChevronDown className="h-4 w-4 text-app-ink-muted transition-transform duration-200 group-open:rotate-180" />
                </p>
                <p className="text-xs font-normal text-app-ink-muted">
                  {clarityDoneCount}/{clarityItems.length} tiêu chí đã hoàn thành
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 w-28 overflow-hidden rounded-full bg-app-line" aria-hidden="true">
                  <div className="h-full rounded-full bg-app-accent transition-all duration-300" style={{ width: `${clarityProgress}%` }} />
                </div>
                <span className="text-xs font-bold text-app-accent">{Math.round(clarityProgress)}%</span>
              </div>
            </summary>
            <div className="mt-4 grid gap-3 border-t border-app-line pt-4 sm:grid-cols-2">
              {clarityItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onJumpToStep(item.stepKey)}
                  className={cn(
                    "group/btn flex items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-all duration-200",
                    item.done
                      ? "border-app-accent/20 bg-app-accent-soft/30 hover:border-app-accent hover:bg-app-accent-soft/60 shadow-sm"
                      : "border-app-line bg-app-bg hover:border-app-ink-muted hover:bg-app-surface"
                  )}
                >
                  <div className={cn(
                    "mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border transition-all duration-200",
                    item.done
                      ? "border-app-accent bg-app-accent text-white"
                      : "border-app-ink-muted/30 text-transparent group-hover/btn:border-app-ink-muted"
                  )}>
                    {item.done ? <Check className="h-3 w-3" /> : <div className="h-1.5 w-1.5 rounded-full bg-app-ink-muted/30" />}
                  </div>
                  <div className="space-y-0.5">
                    <span className="block text-sm font-semibold text-app-ink group-hover/btn:text-app-accent transition-colors duration-150">{item.label}</span>
                    <span className="block text-xs leading-normal text-app-ink-soft">{item.detail}</span>
                  </div>
                </button>
              ))}
            </div>
          </details>

          {showReview ? (
            <>
              <ReviewStep
                clarityDoneCount={clarityDoneCount}
                clarityItemCount={clarityItems.length}
                summaryRows={summaryRows}
                onJumpToStep={onJumpToStep}
              />
              {qualityFeedback ? (
                <QualityFeedbackPanel
                  level={qualityFeedback.level}
                  overallScore={qualityFeedback.overallScore}
                  warnings={qualityFeedback.warnings}
                  suggestions={qualityFeedback.suggestions}
                  canProceedToFeasibility={qualityFeedback.canProceedToFeasibility}
                />
              ) : null}
            </>
          ) : null}

          {currentStepError ? (
            <div
              className="rounded-xl border border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-bg)] p-4 text-[color:var(--color-warning-fg)] shadow-sm animate-[shake_0.5s_ease-in-out]"
              role="alert"
            >
              <div className="flex items-start gap-2.5">
                <CircleAlert className="mt-0.5 h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold">Cần hoàn tất bước này</p>
                  <p className="mt-1 text-sm leading-5 opacity-90">{currentStepError}</p>
                </div>
              </div>
            </div>
          ) : null}
          {currentStepSoftWarning ? (
            <div className="rounded-xl border border-app-line bg-app-bg p-4 text-app-ink-soft shadow-sm" role="note">
              <div className="flex items-start gap-2.5">
                <Lightbulb className="mt-0.5 h-4.5 w-4.5 shrink-0 text-app-accent" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-app-ink">Gợi ý để mục tiêu rõ hơn</p>
                  <p className="mt-1 text-sm leading-5">{currentStepSoftWarning}</p>
                </div>
              </div>
            </div>
          ) : null}
        </motion.div>
      </AnimatePresence>

      <div className="mt-7 flex flex-col-reverse gap-3 border-t border-app-line pt-5 sm:flex-row sm:justify-between">
        <button
          type="button"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-app-line bg-app-surface px-5 py-2.5 text-sm font-medium text-app-ink transition-all duration-150 hover:bg-app-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 sm:w-auto"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Quay lại
        </button>
        <button
          type="button"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-app-accent px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-app-accent/15 transition-all duration-150 hover:brightness-105 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 sm:w-auto"
          onClick={onNext}
          disabled={!isCurrentStepValid}
        >
          {stepIndex < totalSteps - 1 ? "Tiếp" : "Hoàn thành"}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

