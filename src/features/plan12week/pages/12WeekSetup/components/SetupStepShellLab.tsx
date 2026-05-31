import { useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Flag,
  ListChecks,
  Loader2,
  Target,
  type LucideIcon,
} from "lucide-react";

import { useReducedMotion } from "@/app/components/ui/use-reduced-motion";
import { cn } from "@/app/components/ui/utils";
import { useScrollToTopOnChange } from "@/app/hooks/useScrollToTopOnChange";
import { STEPS } from "../constantsLab";

interface SetupStepShellProps {
  title: string;
  description: ReactNode;
  whyThisMatters?: ReactNode;
  currentStep: number;
  stepCount: number;
  children: ReactNode;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void | Promise<void>;
  onJumpToStep?: (stepIndex: number) => void;
  stepError?: string | null;
  isNextDisabled?: boolean;
  isSubmitDisabled?: boolean;
}

const STEP_META: Array<{
  icon: LucideIcon;
  eyebrow: string;
  caption: string;
}> = [
  { icon: Target, eyebrow: "Kết quả", caption: "Chốt kết quả đủ rõ để 12 tuần có điểm đến." },
  { icon: ListChecks, eyebrow: "Việc lặp lại", caption: "Chọn 1-3 việc lặp lại tạo ra kết quả." },
  { icon: CalendarDays, eyebrow: "Lịch", caption: "Đặt ngày bắt đầu và nhịp nhìn lại tuần." },
  { icon: Flag, eyebrow: "Hoàn tất", caption: "Rà soát toàn bộ trước khi kích hoạt chu kỳ." },
];

export function SetupStepShellLab({
  title,
  description,
  whyThisMatters,
  currentStep,
  stepCount,
  children,
  onBack,
  onNext,
  onSubmit,
  onJumpToStep,
  stepError,
  isNextDisabled = false,
  isSubmitDisabled = false,
}: SetupStepShellProps) {
  const isLastStep = currentStep >= stepCount - 1;
  const stepShellRef = useRef<HTMLElement | null>(null);
  const titleFocusRef = useRef<HTMLHeadingElement | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const stepMeta = STEP_META[currentStep] ?? STEP_META[0];
  const StepIcon = stepMeta.icon;
  const stepDefinitions = STEPS.slice(0, stepCount);

  const handleSubmitClick = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await Promise.resolve(onSubmit());
    } finally {
      setIsSubmitting(false);
    }
  };

  useScrollToTopOnChange(currentStep, {
    targetRef: stepShellRef,
    focusRef: titleFocusRef,
  });

  return (
    <section
      ref={stepShellRef}
      className="overflow-hidden surface-raised rounded-xl border border-app-line bg-app-surface p-4 sm:p-5 md:p-6 shadow-sm"
      aria-labelledby="twelve-week-step-title"
    >
      <div>
        <div className="mb-2.5 flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-app-accent/10">
            <StepIcon className="h-3 w-3 text-app-accent animate-pulse" aria-hidden="true" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-app-accent/90">
            Kế hoạch 12 tuần · Bước {currentStep + 1}/{stepCount} · {stepMeta.eyebrow}
          </p>
        </div>
        <h2 id="twelve-week-step-title" ref={titleFocusRef} tabIndex={-1} className="mt-1.5 font-serif text-2xl font-semibold leading-8 text-app-ink focus:outline-none sm:text-3xl">
          {title}
        </h2>
        <div className="mt-2 text-xs sm:text-sm leading-relaxed text-app-ink-soft">{description}</div>

        {/* Connected stepper timeline */}
        <div className="relative my-7 flex items-center justify-between px-1">
          {/* Stepper background track line */}
          <div className="absolute left-4 right-4 top-5 h-[3px] -translate-y-1/2 bg-app-line/40 rounded-full" aria-hidden="true" />
          
          {/* Stepper active track line */}
          <div
            className="absolute left-4 top-5 h-[3px] -translate-y-1/2 bg-gradient-to-r from-app-accent to-emerald-500 transition-all duration-300 rounded-full"
            style={{ width: `calc(${(currentStep / (stepCount - 1)) * 100}% - ${currentStep === stepCount - 1 ? '32px' : '16px'})` }}
            aria-hidden="true"
          />

          <ol aria-label={`Thiết lập kế hoạch 12 tuần, bước ${currentStep + 1} trên ${stepCount}`} className="relative flex w-full justify-between">
            {stepDefinitions.map((step, index) => {
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              const canJump = Boolean(onJumpToStep && isCompleted);
              const StepMetaIcon = STEP_META[index]?.icon ?? Target;

              return (
                <li
                  key={step.id}
                  className="flex flex-col items-center min-w-16"
                  aria-current={isActive ? "step" : undefined}
                >
                  <button
                    type="button"
                    className={cn(
                      "relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2",
                      isActive
                        ? "border-app-accent bg-app-accent text-white scale-110 shadow-md shadow-app-accent/20 ring-4 ring-app-accent-soft/35"
                        : isCompleted
                        ? "border-emerald-500 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white dark:bg-emerald-950/20 dark:text-emerald-450 active:scale-[0.96]"
                        : "border-app-line bg-app-surface text-app-ink-muted",
                      canJump ? "cursor-pointer" : "cursor-default",
                    )}
                    disabled={!canJump}
                    onClick={() => {
                      if (canJump) onJumpToStep?.(index);
                    }}
                    aria-label={`Đi tới bước ${index + 1}: ${step.label}`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-4.5 w-4.5" aria-hidden="true" />
                    ) : (
                      <StepMetaIcon className="h-4 w-4" aria-hidden="true" />
                    )}
                    
                    {/* Step label: Luôn hiện trên desktop; trên mobile chỉ hiện cho bước active để không bị chồng chữ */}
                    <span className={cn(
                      "absolute -bottom-6 whitespace-nowrap text-[10px] font-bold transition-all duration-200",
                      isActive 
                        ? "block text-app-accent scale-105" 
                        : isCompleted 
                        ? "hidden sm:block text-emerald-600 dark:text-emerald-450" 
                        : "hidden sm:block text-app-ink-muted"
                    )}>
                      {step.label}
                    </span>

                    <span className="sr-only">
                      Bước {index + 1}: {step.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        {/* 💡 Mẹo nhỏ trực quan - Không dùng Accordion giấu kín, đưa trực tiếp ra ngoài cực kỳ ngắn gọn và sinh động */}
        <div className="mt-8 rounded-2xl border border-indigo-100 dark:border-indigo-950/50 bg-indigo-50/30 dark:bg-indigo-950/10 p-4 text-xs text-app-ink-soft flex gap-3 items-start animate-in fade-in duration-300">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold">💡</span>
          <div className="space-y-1">
            <p className="font-bold text-indigo-700 dark:text-indigo-400">Ý nghĩa cốt lõi & Mẹo nhỏ:</p>
            <p className="leading-relaxed font-medium opacity-90">{stepMeta.caption}</p>
            {whyThisMatters && (
              <div className="mt-1.5 leading-relaxed font-semibold text-app-ink-muted border-t border-indigo-100/40 pt-1.5 dark:border-indigo-950/30">
                {whyThisMatters}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
          >
            {children}
            {stepError ? (
              <div role="alert" className="mt-4 rounded-xl border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] p-3.5 text-[color:var(--color-danger-fg)] shadow-sm">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                  <p className="text-xs font-bold leading-5">{stepError}</p>
                </div>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Điều khiển các bước to rõ hơn, thumb-friendly trên mobile */}
      <div className="mt-8 flex flex-col-reverse gap-3 border-t border-app-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-semibold text-app-ink-muted/95">
          Bước {currentStep + 1} trên {stepCount} · Mọi thiết lập đều có thể tinh chỉnh lại sau này!
        </p>
        <div className="flex flex-col gap-2.5 sm:flex-row w-full sm:w-auto">
          <button 
            type="button" 
            className="inline-flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl border border-app-line bg-app-surface px-4 py-2.5 text-xs font-bold text-app-ink transition-all duration-150 hover:bg-app-bg active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 sm:w-auto sm:min-h-10 sm:py-2" 
            onClick={onBack} 
            disabled={isSubmitting}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Quay lại
          </button>
          
          {isLastStep ? (
            <button 
              type="button" 
              className="inline-flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-app-accent to-emerald-500 px-5 py-3 text-xs font-bold text-white transition-all duration-150 hover:brightness-105 active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-app-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 sm:w-auto sm:min-h-10 sm:py-2" 
              onClick={handleSubmitClick} 
              disabled={isSubmitting || isSubmitDisabled} 
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className={prefersReducedMotion ? "h-4 w-4" : "h-4 w-4 animate-spin"} aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              )}
              {isSubmitting ? "Đang khởi tạo..." : "Kích hoạt kế hoạch ngay 🚀"}
            </button>
          ) : (
            <button 
              type="button" 
              className="inline-flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-app-accent px-5 py-3 text-xs font-bold text-white transition-all duration-150 hover:brightness-105 active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-app-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 sm:w-auto sm:min-h-10 sm:py-2" 
              onClick={onNext} 
              disabled={isNextDisabled}
            >
              Tiếp tục
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}