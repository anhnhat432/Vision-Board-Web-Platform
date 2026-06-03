import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Flag,
  Loader2,
  type LucideIcon,
  Target,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useRef, useState } from "react";

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
  nextButtonLabel?: string;
}

const STEP_META: Array<{
  icon: LucideIcon;
  eyebrow: string;
  caption: string;
}> = [
  { icon: Target, eyebrow: "Đích đến", caption: "Chốt kết quả đủ rõ và chọn bộ khung mẫu hành động phù hợp." },
  {
    icon: Activity,
    eyebrow: "Hành động",
    caption: "Chọn việc lặp lại hằng tuần và xác định mức cam kết cụ thể cho từng việc.",
  },
  {
    icon: CalendarDays,
    eyebrow: "Lịch trình",
    caption: "Sắp xếp lịch 7 ngày trực quan và điều chỉnh nhịp độ, thời gian rảnh.",
  },
  { icon: Flag, eyebrow: "Hoàn tất", caption: "Xem trước giao diện check-in Today thực tế và kích hoạt hành trình." },
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
  nextButtonLabel = "Tiếp tục",
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
      className="overflow-hidden surface-raised rounded-card border border-app-line bg-app-surface p-4 sm:p-5 md:p-6 shadow-app-sm"
      aria-labelledby="twelve-week-step-title"
    >
      <div>
        <div className="mb-2.5 flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-app-accent/10">
            <StepIcon className="h-3 w-3 text-app-accent animate-pulse" aria-hidden="true" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-app-accent/90">
            Kế hoạch 12 tuần · Bước {currentStep + 1}/{stepCount} · {stepMeta.eyebrow}
          </p>
        </div>
        <h2
          id="twelve-week-step-title"
          ref={titleFocusRef}
          tabIndex={-1}
          className="mt-1.5 font-serif text-2xl font-semibold leading-8 text-app-ink focus:outline-none sm:text-3xl"
        >
          {title}
        </h2>
        <div className="mt-2 text-xs sm:text-sm leading-relaxed text-app-ink-soft">{description}</div>

        {/* Connected stepper timeline */}
        <div className="relative my-7 flex items-center justify-between px-1">
          {/* Stepper background track line */}
          <div
            className="absolute left-4 right-4 top-5 h-[3px] -translate-y-1/2 bg-app-line/40 rounded-full"
            aria-hidden="true"
          />

          {/* Stepper active track line */}
          <div
            className="absolute left-4 top-5 h-[3px] -translate-y-1/2 bg-app-accent transition-all duration-300 rounded-full"
            style={{
              width: `calc(${(currentStep / (stepCount - 1)) * 100}% - ${currentStep === stepCount - 1 ? "32px" : "16px"})`,
            }}
            aria-hidden="true"
          />

          <ol
            aria-label={`Thiết lập kế hoạch 12 tuần, bước ${currentStep + 1} trên ${stepCount}`}
            className="relative flex w-full justify-between"
          >
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
                          ? "border-app-status-success bg-app-status-success/5 text-app-status-success hover:bg-app-status-success hover:text-white dark:bg-app-status-success/20 dark:text-app-status-success active:scale-[0.96]"
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
                    <span
                      className={cn(
                        "absolute -bottom-6 whitespace-nowrap text-[10px] font-bold transition-all duration-200",
                        isActive
                          ? "block text-app-accent scale-105"
                          : isCompleted
                            ? "hidden sm:block text-app-status-success"
                            : "hidden sm:block text-app-ink-muted",
                      )}
                    >
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
        <div className="mt-8 rounded-card border border-app-line bg-app-accent-soft/30 p-4 text-xs text-app-ink-soft flex gap-3 items-start animate-in fade-in duration-300">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-app-accent-soft text-app-accent font-bold">
            💡
          </span>
          <div className="space-y-1">
            <p className="font-bold text-app-accent">Ý nghĩa cốt lõi & Mẹo nhỏ:</p>
            <p className="leading-relaxed font-medium opacity-90">{stepMeta.caption}</p>
            {whyThisMatters && (
              <div className="mt-1.5 leading-relaxed font-semibold text-app-ink-muted border-t border-app-line pt-1.5">
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
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
          >
            {children}
            {stepError ? (
              <div
                role="alert"
                className="mt-4 rounded-card border border-app-line bg-app-bg-subtle p-3.5 text-app-ink shadow-app-sm flex items-start gap-2.5 animate-in shake duration-300"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-app-accent-soft text-app-accent text-xs font-bold">
                  💡
                </span>
                <div className="min-w-0">
                  <span className="font-bold text-[10px] uppercase tracking-wider text-app-accent block mb-0.5">
                    Trợ lý AI Copilot gợi ý
                  </span>
                  <p className="text-xs font-semibold leading-relaxed text-app-ink-soft">{stepError}</p>
                </div>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Điều khiển các bước to rõ hơn, thumb-friendly trên mobile */}
      <div className="mt-8 flex flex-col gap-4 border-t border-app-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-semibold text-app-ink-muted/95 sm:order-first">
          Bước {currentStep + 1} trên {stepCount} · Mọi thiết lập đều có thể tinh chỉnh lại sau này!
        </p>
        <div className="flex flex-row gap-2.5 w-full sm:w-auto">
          <motion.button
            whileHover={prefersReducedMotion ? undefined : { scale: 1.015 }}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}
            type="button"
            className="inline-flex min-h-12 flex-[1] sm:flex-none items-center justify-center gap-1.5 rounded-xl border border-app-line bg-app-surface px-4 py-2.5 text-xs font-bold text-app-ink transition-all duration-150 hover:bg-app-bg active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 sm:w-auto sm:min-h-10 sm:py-2 font-sans"
            onClick={onBack}
            disabled={isSubmitting}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span className="hidden xs:inline">Quay lại</span>
          </motion.button>

          {isLastStep ? (
            <motion.button
              whileHover={prefersReducedMotion ? undefined : { scale: 1.015 }}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}
              type="button"
              aria-label="Lưu kế hoạch"
              className="inline-flex min-h-12 flex-[2] sm:flex-none items-center justify-center gap-1.5 rounded-control bg-app-accent hover:bg-app-accent-hover px-5 py-3 text-xs font-bold text-white transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-app-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 sm:w-auto sm:min-h-10 sm:py-2 font-sans"
              onClick={handleSubmitClick}
              disabled={isSubmitting || isSubmitDisabled}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className={prefersReducedMotion ? "h-4 w-4" : "h-4 w-4 animate-spin"} aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              )}
              {isSubmitting ? "Đang khởi tạo..." : "Kích hoạt 🚀"}
            </motion.button>
          ) : (
            <motion.button
              whileHover={prefersReducedMotion ? undefined : { scale: 1.015 }}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}
              type="button"
              aria-label={nextButtonLabel}
              className="inline-flex min-h-12 flex-[2] sm:flex-none items-center justify-center gap-1.5 rounded-xl bg-app-accent px-5 py-3 text-xs font-bold text-white transition-all duration-150 hover:bg-app-accent-hover active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-app-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 sm:w-auto sm:min-h-10 sm:py-2 font-sans"
              onClick={onNext}
              disabled={isNextDisabled}
            >
              <span className="truncate">{nextButtonLabel}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </motion.button>
          )}
        </div>
      </div>
    </section>
  );
}
