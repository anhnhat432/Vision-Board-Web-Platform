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

    // Làm dịu hiệu ứng: giới hạn góc xoay tối đa chỉ 3 độ để tạo cảm giác tinh tế, sang trọng
    const maxRotation = 3.0; 
    const angleX = Math.min(Math.max((yc - y) / 22, -maxRotation), maxRotation);
    const angleY = Math.min(Math.max((x - xc) / 80, -maxRotation), maxRotation);

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
          transition: "transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.3s ease-out",
        } as React.CSSProperties}
        className="group relative mb-6 rounded-2xl border border-white/30 dark:border-white/10 bg-white/40 dark:bg-slate-900/45 p-6 sm:p-7 shadow-lg overflow-hidden backdrop-blur-xl transition-all duration-300"
      >
        {/* Vòng tròn màu trừu tượng tạo chiều sâu kính mờ Glassmorphism */}
        <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-10 -right-10 w-44 h-44 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Lớp bóng chiếu sáng 3D Glare */}
        <div
          className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: "radial-gradient(circle at var(--glare-x, 50%) var(--glare-y, 50%), rgba(255,255,255,0.22) 0%, transparent 65%)",
          } as React.CSSProperties}
        />
        
        <div className="absolute top-4 right-5 flex items-center gap-1.5 text-xs text-app-accent/80 font-bold select-none pointer-events-none">
          <span>🔮 Thẻ Bài Tương Lai</span>
        </div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-app-accent/70 mb-4 flex items-center gap-1.5 select-none pointer-events-none">
          <span>✨</span> MỤC TIÊU CỦA BẠN (LIVE PREVIEW)
        </p>

        <div className="text-base sm:text-[17px] leading-loose text-slate-800 dark:text-slate-200 font-serif tracking-wide select-text">
          Tôi quyết tâm{" "}
          <span className={cn("transition-all duration-300 pb-0.5",
            isSpecFilled
              ? "text-emerald-600 dark:text-emerald-400 font-bold drop-shadow-[0_0_8px_rgba(16,185,129,0.25)] border-b-2 border-emerald-500/40"
              : "text-app-ink-muted/50 italic border-b border-dashed border-app-line"
          )}>
            {isSpecFilled ? specText : "[hành động cụ thể]"}
          </span>
          <span className="text-xs opacity-75 ml-1 select-none">🎯</span>. 
          Tôi sẽ đo lường tiến bộ bằng cách đạt mốc{" "}
          <span className={cn("transition-all duration-300 pb-0.5",
            isMeasFilled
              ? "text-blue-600 dark:text-blue-400 font-bold drop-shadow-[0_0_8px_rgba(59,130,246,0.25)] border-b-2 border-blue-500/40"
              : "text-app-ink-muted/50 italic border-b border-dashed border-app-line"
          )}>
            {isMeasFilled ? `${measTarget} ${measUnit}` : "[chỉ số mục tiêu]"}
          </span>
          <span className="text-xs opacity-75 ml-1 select-none">📊</span>. 
          Tôi cam kết dành ra{" "}
          <span className={cn("transition-all duration-300 pb-0.5",
            isAchFilled
              ? "text-amber-600 dark:text-amber-500 font-bold drop-shadow-[0_0_8px_rgba(245,158,11,0.25)] border-b-2 border-amber-500/40"
              : "text-app-ink-muted/50 italic border-b border-dashed border-app-line"
          )}>
            {isAchFilled ? `${achHours} giờ mỗi tuần` : "[thời gian cam kết]"}
          </span>
          <span className="text-xs opacity-75 ml-1 select-none">⚡</span> để hành động. 
          Việc này rất quan trọng vì{" "}
          <span className={cn("transition-all duration-300 pb-0.5",
            isRelFilled
              ? "text-rose-600 dark:text-rose-400 font-bold drop-shadow-[0_0_8px_rgba(244,63,94,0.25)] border-b-2 border-rose-500/40"
              : "text-app-ink-muted/50 italic border-b border-dashed border-app-line"
          )}>
            {isRelFilled ? relReason : "[lý do sâu sắc của bạn]"}
          </span>
          <span className="text-xs opacity-75 ml-1 select-none">❤️</span> và thời hạn hoàn thành trước{" "}
          <span className={cn("transition-all duration-300 pb-0.5",
            isTimeFilled
              ? "text-purple-600 dark:text-purple-400 font-bold drop-shadow-[0_0_8px_rgba(168,85,247,0.25)] border-b-2 border-purple-500/40"
              : "text-app-ink-muted/50 italic border-b border-dashed border-app-line"
          )}>
            {isTimeFilled ? timeDate : "[ngày hoàn thành]"}
          </span>
          <span className="text-xs opacity-75 ml-1 select-none">📅</span>.
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
          <div className="relative overflow-hidden rounded-[24px] border border-teal-100/80 dark:border-teal-900/30 bg-gradient-to-br from-teal-50/30 via-app-surface/90 to-emerald-50/20 dark:from-teal-950/10 dark:via-slate-900/80 dark:to-emerald-950/10 p-5 sm:p-6 shadow-[0_12px_40px_rgba(13,148,136,0.03)] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(13,148,136,0.06)] hover:border-teal-500/20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-4 items-start min-w-0">
                {/* Icon trợ lý AI lấp lánh sinh động */}
                <div className="flex-shrink-0 relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-400 via-emerald-500 to-indigo-500 text-white shadow-lg shadow-teal-500/20 transition-transform duration-300 hover:scale-105 group/avatar">
                    <Sparkles className="h-5.5 w-5.5 animate-[spin_8s_linear_infinite]" />
                  </div>
                  {/* Vạch chỉ báo Online nhấp nháy tinh xảo đè lên ở góc dưới phải */}
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white dark:bg-slate-900 shadow-sm" aria-hidden="true">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  </span>
                </div>

                {/* Bong bóng thoại */}
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-teal-600 dark:text-teal-400">
                      Cố vấn mục tiêu AI
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 dark:bg-emerald-400/5 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/10">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                      Trực tuyến
                    </span>
                  </div>

                  <div className="relative bg-white/70 dark:bg-slate-900/60 border border-teal-500/10 rounded-2xl rounded-tl-none p-4 shadow-sm text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                    {/* Đuôi bong bóng thoại */}
                    <div className="absolute -left-2 top-0 w-2 h-2 bg-white/70 dark:bg-slate-900/60 border-l border-t border-teal-500/10 rotate-45 transform origin-top-right hidden sm:block" />
                    
                    <p className="font-serif italic text-[14.5px] leading-relaxed text-slate-700 dark:text-slate-300">
                      “{starterPreview}”
                    </p>
                    <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 select-none">
                      <Sparkles className="h-3.5 w-3.5 text-teal-500 animate-pulse" />
                      <span>Gợi ý chánh niệm giúp bạn điền nhanh biểu mẫu.</span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 px-5 py-3 text-xs font-bold text-white shadow-md shadow-teal-500/10 transition-all duration-200 hover:shadow-lg hover:shadow-teal-500/20 active:scale-[0.98] sm:w-auto"
                onClick={onApplyStarter}
                aria-label={`Dùng gợi ý cho bước ${step.label}`}
              >
                <Sparkles className="h-3.5 w-3.5 animate-[pulse_1.5s_infinite]" />
                Sử dụng gợi ý này
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

