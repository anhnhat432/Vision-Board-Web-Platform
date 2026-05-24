import { useRef, useState, type ReactNode } from "react";
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
      className="overflow-hidden rounded-card border border-app-line bg-app-surface p-4 shadow-sm sm:p-5 md:p-6"
      aria-labelledby="twelve-week-step-title"
    >
      <div>
        <div className="mb-2 flex items-center gap-2">
          <StepIcon className="h-4 w-4 text-app-accent" aria-hidden="true" />
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-accent">
            Thiết lập kế hoạch 12 tuần · Bước nhỏ {currentStep + 1}/{stepCount} · {stepMeta.eyebrow.toUpperCase()}
          </p>
        </div>
        <h2 id="twelve-week-step-title" ref={titleFocusRef} tabIndex={-1} className="mt-2 font-serif text-2xl font-medium leading-7 text-app-ink focus:outline-none sm:text-2xl">
          {title}
        </h2>
        <div className="mt-2 text-sm leading-6 text-app-ink-soft">{description}</div>

        <ol aria-label={`Thiết lập kế hoạch 12 tuần, bước ${currentStep + 1} trên ${stepCount}`} className="mt-5 flex w-full gap-2">
          {stepDefinitions.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            const canJump = Boolean(onJumpToStep && isCompleted);

            return (
              <li key={step.id} className="min-w-0 flex-1" aria-current={isActive ? "step" : undefined}>
                <button
                  type="button"
                  className={cn(
                    "min-h-10 w-full rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30",
                    isActive && "bg-app-accent",
                    isCompleted && !isActive && "bg-app-accent/40",
                    !isActive && !isCompleted && "bg-app-line",
                    canJump ? "cursor-pointer hover:bg-app-accent/60" : "cursor-default",
                  )}
                  disabled={!canJump}
                  onClick={() => {
                    if (canJump) onJumpToStep?.(index);
                  }}
                  aria-label={`Đi tới bước ${index + 1}: ${step.label}`}
                >
                  <span className="sr-only">
                    Bước {index + 1}: {step.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <p className="mt-2 text-sm leading-5 text-app-ink-muted">
          Wizard này có 4 bước nhỏ trong bước tổng “Kế hoạch 12 tuần”. {stepMeta.caption}
        </p>

        {whyThisMatters ? (
          <div className="mt-4 rounded-lg border border-app-line bg-app-bg p-3">
            <button type="button" className="flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-2 text-left text-xs font-medium text-app-accent transition-colors duration-150 hover:text-[#284f45] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30" onClick={() => setIsWhyOpen((isOpen) => !isOpen)} aria-expanded={isWhyOpen} aria-controls="twelve-week-step-why">
              <span>Tại sao bước này quan trọng?</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform duration-150", isWhyOpen && "rotate-180")} aria-hidden="true" />
            </button>
            {isWhyOpen ? <div id="twelve-week-step-why" className="mt-2 text-sm leading-6 text-app-ink-soft">{whyThisMatters}</div> : null}
          </div>
        ) : null}
      </div>

      <div className="mt-6">
        {children}
        {stepError ? (
          <div role="alert" className="mt-4 rounded-lg border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] p-3 text-[color:var(--color-danger-fg)]">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p className="text-sm font-medium leading-5">{stepError}</p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-8 flex flex-col-reverse gap-3 border-t border-app-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-app-ink-muted">
          4 bước nhỏ để thiết lập kế hoạch 12 tuần · Đang ở bước {currentStep + 1}/{stepCount}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-app-line bg-app-surface px-4 py-2 text-sm font-medium text-app-ink transition-colors duration-150 hover:bg-app-bg disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 sm:w-auto" onClick={onBack} disabled={isSubmitting}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Quay lại
          </button>
          {isLastStep ? (
            <button type="button" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-app-accent px-5 py-3 text-sm font-medium text-white transition-colors duration-150 hover:bg-[#284f45] disabled:cursor-not-allowed disabled:bg-app-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 sm:w-auto sm:py-2" onClick={handleSubmitClick} disabled={isSubmitting || isSubmitDisabled} aria-busy={isSubmitting}>
              {isSubmitting ? <Loader2 className={prefersReducedMotion ? "h-4 w-4" : "h-4 w-4 animate-spin"} aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
              {isSubmitting ? "Đang lưu..." : "Lưu kế hoạch"}
            </button>
          ) : (
            <button type="button" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-app-accent px-5 py-3 text-sm font-medium text-white transition-colors duration-150 hover:bg-[#284f45] disabled:cursor-not-allowed disabled:bg-app-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 sm:w-auto sm:py-2" onClick={onNext} disabled={isNextDisabled}>
              Tiếp →
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}