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
import { type ReactNode, useEffect, useRef, useState } from "react";

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
  { icon: Target, eyebrow: "Đích đến", caption: "Chốt trạng thái bạn muốn thấy ở tuần 12." },
  {
    icon: Activity,
    eyebrow: "Hành động",
    caption: "Chọn những việc nhỏ bạn có thể giữ đều.",
  },
  {
    icon: CalendarDays,
    eyebrow: "Lịch tuần",
    caption: "Chọn nhịp bắt đầu và ngày xem lại.",
  },
  { icon: Flag, eyebrow: "Kích hoạt", caption: "Xem tuần đầu rồi bắt đầu hành động." },
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
  const [showMobileActionBar, setShowMobileActionBar] = useState(false);
  const stepMeta = STEP_META[currentStep] ?? STEP_META[0];
  const StepIcon = stepMeta.icon;
  const stepDefinitions = STEPS.slice(0, stepCount);
  const mobileProgressLabel = `Bước ${currentStep + 1}/${stepCount}`;
  const mobileActionStatus = isSubmitting ? "Đang lưu" : stepError ? "Cần chỉnh" : "Sẵn sàng";

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

  useEffect(() => {
    const updateMobileActionBar = () => {
      const rect = stepShellRef.current?.getBoundingClientRect();
      const isMobile = window.innerWidth < 640;
      const isStepInFocus = rect
        ? rect.top < window.innerHeight * 0.55 && rect.bottom > window.innerHeight * 0.35
        : window.scrollY > 520;

      setShowMobileActionBar(isMobile && isStepInFocus);
    };

    updateMobileActionBar();
    window.addEventListener("scroll", updateMobileActionBar, { passive: true });
    window.addEventListener("resize", updateMobileActionBar);

    return () => {
      window.removeEventListener("scroll", updateMobileActionBar);
      window.removeEventListener("resize", updateMobileActionBar);
    };
  }, []);

  return (
    <>
      <section
        data-twelve-week-setup-shell
        ref={stepShellRef}
        className="overflow-hidden surface-raised rounded-card border border-app-line bg-app-surface p-4 pb-[calc(7rem+env(safe-area-inset-bottom))] shadow-app-sm sm:p-5 sm:pb-5 md:p-6 md:pb-6"
        aria-labelledby="twelve-week-step-title"
      >
        <div>
          <div className="mb-2 flex min-w-0 items-center gap-2 sm:mb-2.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-app-accent/10">
              <StepIcon
                className={cn("h-3 w-3 text-app-accent", !prefersReducedMotion && "animate-pulse")}
                aria-hidden="true"
              />
            </div>
            <p className="min-w-0 break-words text-[10px] font-bold uppercase leading-snug tracking-wider text-app-accent/90">
              Kế hoạch 12 tuần · Bước {currentStep + 1}/{stepCount} · {stepMeta.eyebrow}
            </p>
          </div>
          <h2
            id="twelve-week-step-title"
            ref={titleFocusRef}
            tabIndex={-1}
            className="mt-1 max-w-[18ch] break-words font-serif text-[22px] font-semibold leading-[1.15] text-app-ink focus:outline-none sm:mt-1.5 sm:max-w-[24ch] sm:text-3xl sm:leading-8"
          >
            {title}
          </h2>
          <div className="mt-1.5 max-w-[70ch] break-words text-xs leading-relaxed text-app-ink-soft sm:mt-2 sm:text-sm">
            {description}
          </div>

          {/* Connected stepper timeline */}
          <div className="relative my-5 flex items-center justify-between px-1 sm:my-7">
            {/* Stepper background track line */}
            <div
              className="absolute left-4 right-4 top-[22px] h-[3px] -translate-y-1/2 rounded-full bg-app-line/40"
              aria-hidden="true"
            />

            {/* Stepper active track line */}
            <div
              className="absolute left-4 top-[22px] h-[3px] -translate-y-1/2 rounded-full bg-app-accent transition-all duration-300"
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
                        "relative z-10 flex h-11 w-11 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2",
                        isActive
                          ? "border-app-accent bg-app-accent text-white scale-110 shadow-app-md shadow-app-accent/20 ring-4 ring-app-accent-soft/35"
                          : isCompleted
                            ? "border-app-status-success bg-app-status-success/5 text-app-status-success hover:bg-app-status-success hover:text-white dark:bg-app-status-success/20 dark:text-app-status-success active:scale-[0.96]"
                            : "border-app-line bg-app-surface text-app-ink-muted",
                        canJump ? "cursor-pointer" : "cursor-default disabled:cursor-not-allowed disabled:opacity-70",
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
                          "absolute -bottom-5 max-w-20 break-words text-center text-[10px] font-bold leading-tight transition-all duration-200 sm:-bottom-6 sm:max-w-none sm:whitespace-nowrap",
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
          <div className="mt-6 flex min-w-0 items-start gap-2.5 rounded-card border border-app-line bg-app-accent-soft/30 p-3 text-xs text-app-ink-soft animate-in fade-in duration-300 sm:mt-8 sm:gap-3 sm:p-4">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-app-accent-soft text-app-accent font-bold">
              💡
            </span>
            <div className="min-w-0 space-y-1">
              <p className="font-bold text-app-accent">Ý nghĩa cốt lõi & Mẹo nhỏ:</p>
              <p className="break-words font-medium leading-relaxed opacity-90">{stepMeta.caption}</p>
              {whyThisMatters && (
                <div className="mt-1.5 hidden border-t border-app-line pt-1.5 font-semibold leading-relaxed text-app-ink-muted sm:block">
                  {whyThisMatters}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 sm:mt-5">
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
                  data-twelve-week-step-feedback
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
                    <p className="break-words text-xs font-semibold leading-relaxed text-app-ink-soft">{stepError}</p>
                  </div>
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Điều khiển các bước to rõ hơn, thumb-friendly trên mobile */}
        <div className="mt-8 hidden flex-col gap-4 border-t border-app-line pt-6 sm:flex sm:flex-row sm:items-center sm:justify-between">
          <p className="min-w-0 break-words text-xs font-semibold leading-snug text-app-ink-muted/95 sm:order-first">
            Bước {currentStep + 1} trên {stepCount} · Mọi thiết lập đều có thể tinh chỉnh lại sau này!
          </p>
          <div className="flex flex-row gap-2.5 w-full sm:w-auto">
            <motion.button
              whileHover={prefersReducedMotion ? undefined : { scale: 1.015 }}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}
              type="button"
              className="inline-flex min-h-12 flex-[1] sm:flex-none items-center justify-center gap-1.5 rounded-xl border border-app-line bg-app-surface px-4 py-2.5 text-xs font-bold text-app-ink transition-all duration-150 hover:bg-app-bg active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 sm:w-auto sm:min-h-11 sm:py-2"
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
                className="inline-flex min-h-12 flex-[2] sm:flex-none items-center justify-center gap-1.5 rounded-control bg-app-accent hover:bg-app-accent-hover px-5 py-3 text-xs font-bold text-white transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-app-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 sm:w-auto sm:min-h-11 sm:py-2"
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
                className="inline-flex min-h-12 flex-[2] sm:flex-none items-center justify-center gap-1.5 rounded-xl bg-app-accent px-5 py-3 text-xs font-bold text-white transition-all duration-150 hover:bg-app-accent-hover active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-app-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 sm:w-auto sm:min-h-11 sm:py-2"
                onClick={onNext}
                disabled={isNextDisabled}
              >
                <span className="min-w-0 whitespace-normal break-words text-center leading-tight">
                  {nextButtonLabel}
                </span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </motion.button>
            )}
          </div>
        </div>
      </section>

      <div
        data-twelve-week-mobile-action-bar
        className={cn(
          "fixed bottom-0 left-0 right-0 z-40 border-t border-app-line/80 bg-app-surface/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2 shadow-[0_-18px_40px_-30px_rgba(23,21,15,0.45)] backdrop-blur-md transition-transform duration-200 sm:hidden",
          showMobileActionBar ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="mx-auto flex w-full max-w-[42rem] flex-col gap-1.5">
          <p className="flex items-center justify-between gap-3 text-[11px] font-semibold" aria-live="polite">
            <span className="min-w-0 break-words leading-snug text-app-ink-muted">
              {mobileProgressLabel} · Có thể chỉnh lại sau
            </span>
            <span
              className={cn(
                "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold",
                stepError
                  ? "border-app-status-warning/25 bg-app-status-warning/10 text-app-status-warning"
                  : "border-app-accent/20 bg-app-accent-soft text-app-accent",
              )}
            >
              {mobileActionStatus}
            </span>
          </p>
          <div className="flex w-full gap-2.5">
            <button
              type="button"
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-app-line bg-app-surface px-4 py-2 text-xs font-bold text-app-ink transition-all duration-150 hover:bg-app-bg active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2"
              onClick={onBack}
              disabled={isSubmitting}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Quay lại
            </button>

            {isLastStep ? (
              <button
                type="button"
                aria-label="Lưu kế hoạch"
                className="inline-flex min-h-11 flex-[2] items-center justify-center gap-1.5 rounded-control bg-app-accent px-5 py-2.5 text-xs font-bold text-white transition-all duration-150 hover:bg-app-accent-hover active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-app-ink-muted disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2"
                onClick={handleSubmitClick}
                disabled={isSubmitting || isSubmitDisabled}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className={prefersReducedMotion ? "h-4 w-4" : "h-4 w-4 animate-spin"} aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                )}
                <span className="min-w-0 whitespace-normal break-words text-center leading-tight">
                  {isSubmitting ? "Đang khởi tạo..." : "Kích hoạt"}
                </span>
              </button>
            ) : (
              <button
                type="button"
                aria-label={nextButtonLabel}
                className="inline-flex min-h-11 flex-[2] items-center justify-center gap-1.5 rounded-xl bg-app-accent px-5 py-2.5 text-xs font-bold text-white transition-all duration-150 hover:bg-app-accent-hover active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-app-ink-muted disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2"
                onClick={onNext}
                disabled={isNextDisabled}
              >
                <span className="min-w-0 whitespace-normal break-words text-center leading-tight">
                  {nextButtonLabel}
                </span>
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
