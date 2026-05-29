import { useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
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
  themeColor: string;
  gradient: string;
}> = [
  { 
    icon: Target, 
    eyebrow: "Kết quả", 
    caption: "Chốt kết quả đủ rõ để 12 tuần có điểm đến.",
    themeColor: "text-violet-500 dark:text-violet-400",
    gradient: "from-violet-500 to-indigo-500",
  },
  { 
    icon: ListChecks, 
    eyebrow: "Việc lặp lại", 
    caption: "Chọn 1-3 việc lặp lại tạo ra kết quả.",
    themeColor: "text-sky-500 dark:text-sky-400",
    gradient: "from-sky-500 to-indigo-500",
  },
  { 
    icon: CalendarDays, 
    eyebrow: "Lịch", 
    caption: "Đặt ngày bắt đầu và nhịp nhìn lại tuần.",
    themeColor: "text-mint-600 dark:text-mint-400",
    gradient: "from-emerald-500 to-teal-500",
  },
  { 
    icon: Flag, 
    eyebrow: "Hoàn tất", 
    caption: "Rà soát toàn bộ trước khi kích hoạt chu kỳ.",
    themeColor: "text-rose-500 dark:text-rose-400",
    gradient: "from-rose-500 to-pink-500",
  },
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
  const [isWhyOpen, setIsWhyOpen] = useState(false);
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
      className="relative overflow-hidden rounded-2xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-[#26231D]/75 backdrop-blur-md p-5 sm:p-6 md:p-8 shadow-xl"
      aria-labelledby="twelve-week-step-title"
    >
      {/* Decorative blurred shapes behind card to create a dreamy Vision Board atmosphere */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-violet-200/25 dark:bg-violet-900/10 blur-[80px]" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-sky-200/20 dark:bg-sky-900/10 blur-[80px]" aria-hidden="true" />

      <div className="relative z-10">
        <div className="mb-2 flex items-center gap-2">
          <div className={cn("flex h-7 w-7 items-center justify-center rounded-full bg-white/60 dark:bg-[#1C1A15]/40 shadow-sm border border-white/40 dark:border-white/5", stepMeta.themeColor)}>
            <StepIcon className="h-4 w-4" aria-hidden="true" />
          </div>
          <p className={cn("text-xs font-semibold uppercase tracking-[0.14em]", stepMeta.themeColor)}>
            Thiết lập kế hoạch 12 tuần · Bước {currentStep + 1}/{stepCount} · {stepMeta.eyebrow}
          </p>
        </div>
        
        <h2 id="twelve-week-step-title" ref={titleFocusRef} tabIndex={-1} className="mt-3 font-serif text-2xl md:text-3xl font-medium tracking-tight text-app-ink focus:outline-none">
          {title}
        </h2>
        <div className="mt-2 text-sm md:text-base leading-relaxed text-app-ink-soft/90 max-w-3xl">{description}</div>

        {/* Connected stepper timeline */}
        <div className="relative my-10 flex items-center justify-between px-4 sm:px-6">
          {/* Stepper background track line */}
          <div className="absolute left-6 right-6 top-1/2 h-1 -translate-y-1/2 rounded-full bg-app-line/40" aria-hidden="true" />
          
          {/* Stepper active track line */}
          <div
            className="absolute left-6 top-1/2 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-violet-400 via-sky-400 to-emerald-400 dark:from-violet-600 dark:to-emerald-600 transition-all duration-500 ease-out"
            style={{ width: `calc(${(currentStep / (stepCount - 1)) * 100}% - ${currentStep === stepCount - 1 ? '48px' : '24px'})` }}
            aria-hidden="true"
          />

          <ol aria-label={`Thiết lập kế hoạch 12 tuần, bước ${currentStep + 1} trên ${stepCount}`} className="relative flex w-full justify-between">
            {stepDefinitions.map((step, index) => {
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              const canJump = Boolean(onJumpToStep && isCompleted);
              const stepConfig = STEP_META[index] ?? STEP_META[0];
              const StepMetaIcon = stepConfig.icon;

              return (
                <li
                  key={step.id}
                  className="flex flex-col items-center"
                  aria-current={isActive ? "step" : undefined}
                >
                  <button
                    type="button"
                    className={cn(
                      "relative z-10 flex h-11 w-11 items-center justify-center rounded-full border-2 text-sm font-bold shadow-sm transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2",
                      isActive
                        ? "border-none bg-gradient-to-r from-violet-500 to-indigo-500 dark:from-violet-600 dark:to-indigo-600 text-white scale-115 shadow-md shadow-violet-300/40 dark:shadow-violet-950/20 ring-[5px] ring-violet-100 dark:ring-violet-900/30"
                        : isCompleted
                        ? "border-emerald-300 bg-emerald-50 text-emerald-600 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-400 hover:bg-emerald-100/70 hover:scale-105 active:scale-[0.96]"
                        : "border-app-line bg-white/80 dark:bg-[#1C1A15]/80 text-app-ink-muted",
                      canJump ? "cursor-pointer" : "cursor-default",
                    )}
                    disabled={!canJump}
                    onClick={() => {
                      if (canJump) onJumpToStep?.(index);
                    }}
                    aria-label={`Đi tới bước ${index + 1}: ${step.label}`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 stroke-[2.5]" aria-hidden="true" />
                    ) : (
                      <StepMetaIcon className="h-4.5 w-4.5" aria-hidden="true" />
                    )}
                    
                    {/* Step label for desktop */}
                    <span className={cn(
                      "absolute -bottom-8 hidden whitespace-nowrap text-xs font-semibold sm:block transition-all duration-300",
                      isActive 
                        ? "text-violet-600 dark:text-violet-400 font-bold tracking-wide scale-105 translate-y-0.5" 
                        : isCompleted 
                        ? "text-emerald-600 dark:text-emerald-400 font-medium" 
                        : "text-app-ink-muted/80"
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

        {/* Caption Box - soft, styled pastel border */}
        <div className="mt-6 flex gap-2.5 rounded-2xl border border-amber-200/60 dark:border-amber-900/30 bg-gradient-to-r from-amber-50/50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10 p-4 shadow-sm text-sm italic text-amber-800 dark:text-amber-300/90">
          <span className="text-base leading-none">💡</span>
          <p className="leading-relaxed">
            <span className="font-semibold not-italic">Gợi ý cho bước này:</span> {stepMeta.caption}
          </p>
        </div>

        {whyThisMatters ? (
          <div className="mt-5 overflow-hidden rounded-2xl border border-violet-100 dark:border-violet-900/40 bg-gradient-to-br from-violet-50/30 to-indigo-50/20 dark:from-violet-950/10 dark:to-indigo-950/5 transition-all duration-300 hover:border-violet-200 dark:hover:border-violet-800/40 shadow-sm">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 p-4 text-left text-sm font-semibold text-violet-700 dark:text-violet-300 transition-all duration-150 hover:bg-violet-100/10 active:scale-[0.99] focus-visible:outline-none"
              onClick={() => setIsWhyOpen((isOpen) => !isOpen)}
              aria-expanded={isWhyOpen}
              aria-controls="twelve-week-step-why"
            >
              <span className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/50 text-xs">
                  ✨
                </span>
                Tại sao bước này quan trọng?
              </span>
              <ChevronDown
                className={cn("h-4 w-4 text-violet-500 transition-transform duration-300", isWhyOpen && "rotate-180")}
                aria-hidden="true"
              />
            </button>
            <AnimatePresence>
              {isWhyOpen && (
                <motion.div
                  id="twelve-week-step-why"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="border-t border-violet-100/50 dark:border-violet-900/20 bg-white/40 dark:bg-black/10 p-4 text-sm leading-relaxed text-app-ink-soft/90"
                >
                  {whyThisMatters}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : null}
      </div>

      <div className="mt-8 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
          >
            {children}
            {stepError ? (
              <div role="alert" className="mt-5 rounded-xl border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] p-4 text-[color:var(--color-danger-fg)] shadow-sm">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <p className="text-sm font-medium leading-relaxed">{stepError}</p>
                </div>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-10 relative z-10 flex flex-col-reverse gap-4 border-t border-app-line/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-medium text-app-ink-muted/80">
          Chương trình thiết lập 12 tuần · Đang ở bước {currentStep + 1}/{stepCount}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button 
            type="button" 
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-app-line bg-white dark:bg-[#1C1A15] px-5 py-2 text-sm font-semibold text-app-ink transition-all duration-200 hover:bg-app-bg active:scale-[0.98] focus-visible:outline-none sm:w-auto" 
            onClick={onBack} 
            disabled={isSubmitting}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Quay lại
          </button>
          
          {isLastStep ? (
            <button 
              type="button" 
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-500 dark:to-indigo-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200 dark:shadow-none transition-all duration-200 hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:from-app-ink-muted disabled:to-app-ink-muted focus-visible:outline-none sm:w-auto" 
              onClick={handleSubmitClick} 
              disabled={isSubmitting || isSubmitDisabled} 
              aria-busy={isSubmitting}
            >
              {isSubmitting ? <Loader2 className={prefersReducedMotion ? "h-4 w-4" : "h-4 w-4 animate-spin"} aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
              {isSubmitting ? "Đang kích hoạt..." : "Kích hoạt kế hoạch 12 tuần ✨"}
            </button>
          ) : (
            <button 
              type="button" 
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-500 dark:to-indigo-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200 dark:shadow-none transition-all duration-200 hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:from-app-ink-muted disabled:to-app-ink-muted focus-visible:outline-none sm:w-auto" 
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