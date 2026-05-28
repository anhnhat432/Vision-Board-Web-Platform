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
import { STEPS } from "../constants";

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
  { icon: ListChecks, eyebrow: "Lead", caption: "Chọn 1-3 việc lặp lại tạo ra kết quả." },
  { icon: CalendarDays, eyebrow: "Lịch", caption: "Đặt ngày bắt đầu và nhịp nhìn lại tuần." },
  { icon: Flag, eyebrow: "Hoàn tất", caption: "Rà soát toàn bộ trước khi kích hoạt chu kỳ." },
];

export function SetupStepShell({
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
      className="surface-raised rounded-2xl border border-app-line bg-app-surface p-5 sm:p-6 shadow-sm"
      aria-labelledby="twelve-week-step-title"
    >
      <div>
        <div className="mb-2 flex items-center gap-2">
          <StepIcon className="h-4 w-4 text-app-accent" aria-hidden="true" />
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-accent">
            Bước {currentStep + 1} / {stepCount} · {stepMeta.eyebrow.toUpperCase()}
          </p>
        </div>
        <h2
          id="twelve-week-step-title"
          ref={titleFocusRef}
          tabIndex={-1}
          className="mt-2 font-serif text-2xl font-medium leading-7 text-app-ink focus:outline-none"
        >
          {title}
        </h2>
        <div className="mt-2 text-sm leading-6 text-app-ink-soft">{description}</div>

        {/* Connected stepper timeline */}
        <div className="relative my-8 flex items-center justify-between px-2">
          {/* Stepper background track line */}
          <div className="absolute left-4 right-4 top-1/2 h-0.5 -translate-y-1/2 bg-app-line/60" aria-hidden="true" />
          
          {/* Stepper active track line */}
          <div
            className="absolute left-4 top-1/2 h-0.5 -translate-y-1/2 bg-app-accent transition-all duration-300"
            style={{ width: `calc(${(currentStep / (stepCount - 1)) * 100}% - ${currentStep === stepCount - 1 ? '32px' : '16px'})` }}
            aria-hidden="true"
          />

          <ol aria-label={`Bước ${currentStep + 1} trên ${stepCount}`} className="relative flex w-full justify-between">
            {stepDefinitions.map((step, index) => {
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              const canJump = Boolean(onJumpToStep && isCompleted);
              const StepMetaIcon = STEP_META[index]?.icon ?? Target;

              return (
                <li
                  key={step.id}
                  className="flex flex-col items-center"
                  aria-current={isActive ? "step" : undefined}
                >
                  <button
                    type="button"
                    className={cn(
                      "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold shadow-sm transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30",
                      isActive
                        ? "border-app-accent bg-app-accent text-white scale-110 ring-4 ring-app-accent-soft"
                        : isCompleted
                        ? "border-app-accent bg-app-accent-soft text-app-accent hover:bg-app-accent hover:text-white"
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
                      <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <StepMetaIcon className="h-4.5 w-4.5" aria-hidden="true" />
                    )}
                    
                    {/* Step label for desktop */}
                    <span className={cn(
                      "absolute -bottom-7 hidden whitespace-nowrap text-xs font-semibold sm:block transition-colors duration-200",
                      isActive ? "text-app-accent font-bold" : isCompleted ? "text-app-ink" : "text-app-ink-muted"
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

        <p className="mt-4 text-xs font-medium leading-relaxed text-app-ink-muted/90 sm:mt-6 bg-app-bg px-3.5 py-2 rounded-lg border border-app-line/40 italic">
          💡 Ý nghĩa: {stepMeta.caption}
        </p>

        {whyThisMatters ? (
          <div className="mt-5 overflow-hidden rounded-xl border border-app-accent/20 bg-gradient-to-br from-app-accent-soft/20 to-app-accent-soft/5 transition-all duration-200">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 p-4 text-left text-xs font-semibold text-app-accent transition-colors duration-150 hover:bg-app-accent-soft/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
              onClick={() => setIsWhyOpen((isOpen) => !isOpen)}
              aria-expanded={isWhyOpen}
              aria-controls="twelve-week-step-why"
            >
              <span className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-app-accent/10">
                  <span className="text-xs">💡</span>
                </span>
                Tại sao bước này quan trọng?
              </span>
              <ChevronDown
                className={cn("h-4 w-4 text-app-accent transition-transform duration-200", isWhyOpen && "rotate-180")}
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
                  transition={{ duration: 0.2 }}
                  className="border-t border-app-accent/10 bg-app-surface/50 p-4 text-sm leading-relaxed text-app-ink-soft"
                >
                  {whyThisMatters}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : null}
      </div>

      <div className="mt-6">
        {children}
        {stepError ? (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] p-3 text-[color:var(--color-danger-fg)]"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p className="text-sm font-medium leading-5">{stepError}</p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-8 flex flex-col-reverse gap-3 border-t border-app-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-app-ink-muted">
          Bước {currentStep + 1} / {stepCount}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-app-line bg-app-surface px-4 py-2 text-sm font-medium text-app-ink transition-colors duration-150 hover:bg-app-bg disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 sm:w-auto"
            onClick={onBack}
            disabled={isSubmitting}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Quay lại
          </button>
          {isLastStep ? (
            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-app-accent px-5 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-app-accent disabled:cursor-not-allowed disabled:bg-app-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 sm:w-auto"
              onClick={handleSubmitClick}
              disabled={isSubmitting || isSubmitDisabled}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className={prefersReducedMotion ? "h-4 w-4" : "h-4 w-4 animate-spin"} aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              )}
              {isSubmitting ? "Đang lưu..." : "Lưu kế hoạch"}
            </button>
          ) : (
            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-app-accent px-5 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-app-accent disabled:cursor-not-allowed disabled:bg-app-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 sm:w-auto"
              onClick={onNext}
              disabled={isNextDisabled}
            >
              Tiếp →
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
