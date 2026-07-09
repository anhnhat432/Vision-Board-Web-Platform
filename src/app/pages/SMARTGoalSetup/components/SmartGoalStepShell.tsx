import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  CircleAlert,
  Lightbulb,
  ShieldCheck,
  Target,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode, RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/app/components/ui/utils";
import type { QualityLevel } from "@/lib/smart-goal/quality";
import type { SmartGoalStarter } from "../../../utils/smart-goal-starters";
import { SMART_STEPS } from "../constants";
import { formatStepDraft } from "../helpers";
import type { GoalClarityItem, SMARTData, SmartGoalSummaryRow, SmartStepKey } from "../types";
import { AiCoachPanel } from "./AiCoachPanel";
import { ClarityCompass } from "./ClarityCompass";
import { ConfettiCanvas } from "./ConfettiCanvas";
import { FeasibilityGauge } from "./FeasibilityGauge";
import { MobileActionBar } from "./MobileActionBar";
import { PolaroidCard } from "./PolaroidCard";
import { QualityFeedbackPanel } from "./QualityFeedbackPanel";
import { ReviewStep } from "./ReviewStep";
import { StepProgressBar } from "./StepProgressBar";
import { playMindfulStepSuccess } from "../utils/mindfulAudio";

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
  step: import("../types").SmartStepDefinition;
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
  smartGoalStarter: SmartGoalStarter;
  onApplyStarter: (transformedText?: string) => void;
  onJumpToStep: (stepKey: SmartStepKey) => void;
  onBack: () => void;
  onNext: () => void;
  finalPrimaryCtaLabel?: string;
  finalSecondaryCtaLabel?: string;
  onFinalSecondaryAction?: () => void;
}

const STEP_CTA_LABELS: Record<SmartStepKey, string> = {
  specific: "Tiếp tục: thêm chỉ số",
  measurable: "Tiếp tục: kiểm tra khả thi",
  achievable: "Tiếp tục: nối với lý do",
  relevant: "Tiếp tục: chốt thời hạn",
  timeBound: "Tạo kế hoạch nhanh",
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
  smartGoalStarter,
  onApplyStarter,
  onJumpToStep,
  onBack,
  onNext,
  finalPrimaryCtaLabel,
  finalSecondaryCtaLabel,
  onFinalSecondaryAction,
}: SmartGoalStepShellProps) {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const [showStickyMini, setShowStickyMini] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isMobilePolaroidOpen, setIsMobilePolaroidOpen] = useState(false);
  const stickyTriggerRef = useRef<HTMLDivElement>(null);

  const isFinalStep = stepIndex === totalSteps - 1;
  const primaryCtaLabel = isFinalStep && finalPrimaryCtaLabel ? finalPrimaryCtaLabel : STEP_CTA_LABELS[step.key];
  const showFinalSecondaryCta = isFinalStep && !!finalSecondaryCtaLabel && !!onFinalSecondaryAction;

  useEffect(() => {
    const trigger = stickyTriggerRef.current;
    if (!trigger || typeof IntersectionObserver === "undefined") {
      setShowStickyMini(false);
      return;
    }

    const mobileQuery = window.matchMedia("(max-width: 1023px)");
    let hasPassedTrigger = false;
    const syncStickyState = () => setShowStickyMini(mobileQuery.matches && hasPassedTrigger);

    const observer = new IntersectionObserver(
      ([entry]) => {
        hasPassedTrigger = !entry.isIntersecting && entry.boundingClientRect.top < 0;
        syncStickyState();
      },
      { rootMargin: "-72px 0px 0px 0px", threshold: 0 },
    );

    observer.observe(trigger);
    mobileQuery.addEventListener("change", syncStickyState);
    syncStickyState();

    return () => {
      observer.disconnect();
      mobileQuery.removeEventListener("change", syncStickyState);
    };
  }, []);

  const prevValidRef = useRef(isCurrentStepValid);
  const prevGoldRef = useRef(false);
  const isGoldStandard = clarityDoneCount === clarityItems.length;

  useEffect(() => {
    if (!prevValidRef.current && isCurrentStepValid) {
      playMindfulStepSuccess();
    }
    prevValidRef.current = isCurrentStepValid;
  }, [isCurrentStepValid]);

  useEffect(() => {
    if (!prevGoldRef.current && isGoldStandard) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 2600);
      return () => clearTimeout(timer);
    }
    prevGoldRef.current = isGoldStandard;
  }, [isGoldStandard]);

  const focusInvalidCurrentStep = () => {
    setTimeout(() => {
      const stepInputs: Record<SmartStepKey, string> = {
        specific: "#smart-specific",
        measurable: "#smart-metric-name",
        achievable: "#smart-weekly-hours-slider, #smart-weekly-hours-input",
        relevant: "#smart-relevant-reason",
        timeBound: "#smart-target-weeks-slider, #smart-target-date",
      };

      const targetSelector = stepInputs[step.key];
      const targetElement = targetSelector ? (document.querySelector(targetSelector) as HTMLElement | null) : null;

      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth", block: "center" });

        const isMobileDevice = window.innerWidth < 1024;
        if (!isMobileDevice) {
          targetElement.focus({ preventScroll: true });
        }

        targetElement.classList.add("animate-shake");
        setTimeout(() => {
          targetElement.classList.remove("animate-shake");
        }, 450);
      }
    }, 50);
  };

  const handleValidatedAction = (action: () => void) => {
    if (!isCurrentStepValid) {
      onNext();
      focusInvalidCurrentStep();
      return;
    }
    action();
  };

  const handleNextClick = () => handleValidatedAction(onNext);
  const handleFinalSecondaryClick = () => handleValidatedAction(onFinalSecondaryAction ?? onNext);

  const handleWizardJump = (index: number) => {
    const nextStep = SMART_STEPS[index];
    if (nextStep) {
      onJumpToStep(nextStep.key);
    }
  };

  const parsedWeeklyHours = Number.parseFloat(smartData.achievable.weekly_time_commitment_hours) || 0;

  const calculateFeasibilityScore = () => {
    const hours = parsedWeeklyHours;
    if (hours === 0) return 0;
    if (hours >= 2 && hours <= 8) return 95;
    if (hours > 8 && hours <= 15) return 80;
    if (hours > 15 && hours <= 25) return 60;
    return 40;
  };

  const feasibilityScore = calculateFeasibilityScore();
  const mobileProgressLabel = showReview
    ? `Bước ${stepIndex + 1}/${totalSteps} · Độ rõ ${clarityDoneCount}/${clarityItems.length}`
    : `Bước ${stepIndex + 1}/${totalSteps}`;

  return (
    <div
      data-smart-goal-shell
      className={cn(
        "w-full animate-[fade-in_0.3s_ease-out] pb-[calc(10.25rem+env(safe-area-inset-bottom))] motion-reduce:animate-none lg:pb-0",
        showFinalSecondaryCta && "pb-[calc(11.25rem+env(safe-area-inset-bottom))]",
      )}
    >
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-4px); }
          40%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
      {showConfetti && !shouldReduceMotion && <ConfettiCanvas />}
      <div ref={stickyTriggerRef} className="pointer-events-none h-px w-px" aria-hidden="true" />

      <AnimatePresence>
        {showStickyMini && (
          <motion.div
            initial={{ y: -65, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -65, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed top-0 right-0 left-0 z-50 flex items-center justify-between gap-3 border-b border-app-line bg-app-surface/92 px-4 py-2.5 shadow-sm backdrop-blur-md motion-reduce:transition-none lg:hidden"
          >
            <div className="min-w-0 flex-1">
              <p className="mb-0.5 flex select-none items-center gap-1 text-[11px] font-extrabold text-app-accent">
                <Target className="h-3 w-3" aria-hidden="true" /> Bước {stepIndex + 1}/{totalSteps} · {step.label}
              </p>
              <p className="truncate text-xs font-semibold leading-snug text-app-ink-soft">
                {step.title}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-app-accent-subtle px-2.5 py-0.5 text-[10px] font-bold leading-tight text-app-accent">
              {clarityDoneCount}/{clarityItems.length} rõ
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)] xl:gap-7">
        <div
          className="relative min-w-0 overflow-hidden rounded-[32px] border border-app-line bg-[linear-gradient(180deg,var(--app-surface)_0%,var(--app-bg)_100%)] p-4 shadow-[0_26px_80px_-62px_rgba(23,21,15,0.5)] dark:border-app-line sm:p-6 lg:p-8"
        >
          <div className="mb-5 space-y-5 sm:mb-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex min-h-8 items-center rounded-full border border-app-accent/15 bg-app-accent-subtle px-3 py-1 text-[11px] font-extrabold text-app-accent">
                    Bước {stepIndex + 1}/{totalSteps}
                  </span>
                  <span className="inline-flex min-h-8 items-center rounded-full border border-app-line bg-app-surface/75 px-3 py-1 text-xs font-bold text-app-ink-soft">
                    {step.label}
                  </span>
                </div>
                <motion.h2
                  id="smart-step-title"
                  ref={headingRef}
                  tabIndex={-1}
                  key={`title-${stepIndex}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
                  className="mt-4 break-words text-[28px] font-extrabold leading-[1.04] tracking-[-0.045em] text-app-ink focus:outline-none sm:text-[40px]"
                  style={{ fontFamily: "'Bricolage Grotesque', serif" }}
                >
                  {step.title}
                </motion.h2>
                <motion.p
                  key={`desc-${stepIndex}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut", delay: 0.1 }}
                  className="mt-2 max-w-[50ch] break-words text-sm leading-6 text-app-ink-soft sm:text-[15px]"
                >
                  {step.description}
                </motion.p>
              </div>
              <motion.span
                key={`badge-${stepIndex}`}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="hidden min-h-10 shrink-0 items-center rounded-full border border-app-line bg-app-surface px-3 py-1 text-xs font-extrabold leading-tight text-app-ink-soft sm:inline-flex"
              >
                {clarityDoneCount}/{clarityItems.length} rõ
              </motion.span>
            </div>

            {starterPreview && step.key !== "specific" ? (
              <p className="max-w-[64ch] rounded-[18px] border border-app-line bg-app-surface/80 px-3.5 py-2.5 text-xs font-medium leading-5 text-app-ink-soft">
                <span className="font-bold text-app-ink">Gợi ý gần ô nhập: </span>
                {starterPreview}
              </p>
            ) : null}

            <StepProgressBar steps={SMART_STEPS} stepIndex={stepIndex} onJump={handleWizardJump} />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={stepIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-4 sm:space-y-5"
            >
              {children}

              <div className="grid gap-3 lg:hidden">
                <div className="grid gap-2">
                  <button
                    type="button"
                    aria-expanded={isMobilePolaroidOpen}
                    aria-controls="smart-mobile-polaroid-preview"
                    onClick={() => setIsMobilePolaroidOpen((isOpen) => !isOpen)}
                    className="flex min-h-11 w-full items-center justify-between gap-3 rounded-[18px] border border-app-line bg-app-surface/90 px-3.5 py-2.5 text-left text-[12px] font-extrabold leading-tight text-app-ink-soft shadow-none transition-colors hover:bg-app-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/35"
                  >
                    <span>Bản phác thảo Polaroid</span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-app-ink-muted transition-transform duration-200",
                        isMobilePolaroidOpen && "rotate-180",
                      )}
                      aria-hidden="true"
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isMobilePolaroidOpen ? (
                      <motion.div
                        id="smart-mobile-polaroid-preview"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        <PolaroidCard
                          smartData={smartData}
                          smartGoalStarter={smartGoalStarter}
                          isGoldStandard={isGoldStandard}
                          isMobile
                        />
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
                <ClarityCompass
                  clarityProgress={clarityProgress}
                  clarityDoneCount={clarityDoneCount}
                  totalItems={clarityItems.length}
                  items={clarityItems}
                  onJumpToStep={onJumpToStep}
                  isCompact
                />
              </div>

              {(currentStepError || currentStepSoftWarning) && (
                <div data-smart-step-feedback className="space-y-3">
                  {currentStepError && (
                    <div
                      className="flex items-center gap-2 rounded-[16px] border border-app-status-warning/30 bg-app-status-warning/10 px-4 py-2.5 text-[12px] text-app-status-warning select-none"
                      role="alert"
                    >
                      <CircleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="font-semibold">{currentStepError}</span>
                    </div>
                  )}

                  {currentStepSoftWarning && (
                    <div
                      className="rounded-[18px] border border-app-line bg-app-surface/80 p-4 text-app-ink-soft animate-[fade-in_0.3s_ease-out]"
                      role="note"
                    >
                      <div className="flex items-start gap-2.5">
                        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-app-highlight" aria-hidden="true" />
                        <div>
                          <p className="text-[13px] font-semibold text-app-ink">Gợi ý để mục tiêu rõ hơn</p>
                          <p className="mt-1 max-w-[62ch] break-words text-[12.5px] leading-relaxed">
                            {currentStepSoftWarning}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-1">
                <AiCoachPanel
                  step={step}
                  archetype="other"
                  smartGoalStarter={smartGoalStarter}
                  smartData={smartData}
                  onApplyStarter={onApplyStarter}
                />
              </div>

              <div className="mt-7 hidden items-center justify-between gap-3 rounded-[24px] border border-app-line bg-app-bg-subtle/70 p-3 lg:flex">
                <motion.button
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  type="button"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[16px] px-4 py-2.5 text-[13px] font-bold leading-tight text-app-ink-muted transition-all duration-200 active:scale-[0.97] cursor-pointer hover:bg-app-surface hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/35"
                  onClick={onBack}
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Quay lại
                </motion.button>

                {showFinalSecondaryCta ? (
                  <motion.button
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                    type="button"
                    onClick={handleFinalSecondaryClick}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[16px] border border-app-line bg-app-surface px-5 py-2.5 text-[13px] font-bold leading-tight text-app-ink-soft transition-all duration-200 active:scale-[0.97] cursor-pointer hover:bg-app-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/35"
                  >
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    {finalSecondaryCtaLabel}
                  </motion.button>
                ) : null}
                <motion.button
                  whileHover={{ scale: 1.015, y: -2 }}
                  whileTap={{ scale: 0.985 }}
                  type="button"
                  className="ml-auto inline-flex min-h-12 min-w-[220px] items-center justify-center gap-2 rounded-[18px] bg-app-accent px-6 py-3 text-[14px] font-extrabold leading-tight text-white shadow-app-md transition-all duration-200 cursor-pointer hover:bg-app-accent-hover active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/35 focus-visible:ring-offset-2"
                  onClick={handleNextClick}
                >
                  {primaryCtaLabel}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </motion.button>
              </div>

              <MobileActionBar
                stepIndex={stepIndex}
                totalSteps={totalSteps}
                isCurrentStepValid={isCurrentStepValid}
                isFinalStep={isFinalStep}
                primaryCtaLabel={primaryCtaLabel}
                showFinalSecondaryCta={showFinalSecondaryCta}
                finalSecondaryCtaLabel={finalSecondaryCtaLabel}
                progressLabel={mobileProgressLabel}
                showStickyMini={showStickyMini}
                onBack={onBack}
                onNext={handleNextClick}
                onFinalSecondaryAction={handleFinalSecondaryClick}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="hidden lg:block lg:sticky lg:top-6 space-y-6">
          <PolaroidCard smartData={smartData} smartGoalStarter={smartGoalStarter} isGoldStandard={isGoldStandard} />

          <ClarityCompass
            clarityProgress={clarityProgress}
            clarityDoneCount={clarityDoneCount}
            totalItems={clarityItems.length}
            items={clarityItems}
            onJumpToStep={onJumpToStep}
          />

          {smartData.achievable.weekly_time_commitment_hours.trim() && (
            <FeasibilityGauge score={feasibilityScore} weeklyHours={parsedWeeklyHours} />
          )}

          {showReview && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <ReviewStep
                clarityDoneCount={clarityDoneCount}
                clarityItemCount={clarityItems.length}
                summaryRows={summaryRows}
                onJumpToStep={onJumpToStep}
              />
              {qualityFeedback && (
                <QualityFeedbackPanel
                  level={qualityFeedback.level}
                  overallScore={qualityFeedback.overallScore}
                  warnings={qualityFeedback.warnings}
                  suggestions={qualityFeedback.suggestions}
                  canProceedToFeasibility={qualityFeedback.canProceedToFeasibility}
                />
              )}
            </motion.div>
          )}
        </div>
      </div>

      {!showReview && (
        <details className="group mt-4 rounded-[16px] border border-app-line bg-app-surface p-3.5 transition-all duration-200 sm:mt-6 sm:p-4">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-lg p-2 text-[13px] font-semibold leading-tight text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
            <p className="flex items-center gap-2 font-semibold">
              Xem chi tiết nội dung đang viết
              <ChevronDown className="h-4 w-4 text-app-ink-muted transition-transform duration-200 group-open:rotate-180" />
            </p>
          </summary>
          <div className="mt-4 grid gap-3 border-t border-app-line pt-4 sm:grid-cols-2 lg:grid-cols-3">
            {SMART_STEPS.map((stepItem) => (
              <div key={stepItem.key} className="rounded-[11px] border border-app-line bg-app-bg-subtle p-3.5 text-xs">
                <p className="mb-1 text-[11px] font-extrabold text-app-accent">{stepItem.label}</p>
                <p className="break-words leading-relaxed text-app-ink-soft">
                  {formatStepDraft(stepItem.key, smartData) || "Chưa có nội dung..."}
                </p>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
