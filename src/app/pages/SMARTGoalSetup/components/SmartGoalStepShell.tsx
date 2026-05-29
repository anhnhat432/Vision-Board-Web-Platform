import type { ReactNode, RefObject } from "react";
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
import type { GoalClarityItem, SmartGoalSummaryRow, SmartStepDefinition, SmartStepKey } from "../types";

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
  onApplyStarter,
  onJumpToStep,
  onBack,
  onNext,
}: SmartGoalStepShellProps) {
  const handleWizardJump = (index: number) => {
    const nextStep = SMART_STEPS[index];
    if (nextStep) {
      onJumpToStep(nextStep.key);
    }
  };

  return (
    <section
      className="rounded-[14px] border border-app-line bg-app-surface p-5 sm:p-6"
      aria-labelledby="smart-step-title"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-accent">
            Bước {stepIndex + 1}: {STEP_NAMES[step.key]}
          </p>
          <h2
            id="smart-step-title"
            ref={headingRef}
            tabIndex={-1}
            className="mt-2 font-serif text-2xl font-medium leading-7 text-app-ink focus:outline-none"
          >
            {step.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-app-ink-soft">{step.description}</p>
        </div>
        <span className="inline-flex w-fit rounded-full bg-app-accent-soft px-3 py-1 text-xs font-medium text-app-accent">
          {stepIndex + 1}/{totalSteps}
        </span>
      </div>

      <ol aria-label={`Bước ${stepIndex + 1} trên ${totalSteps}`} className="mt-6 grid grid-cols-5 gap-2">
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
                  "flex h-full w-full flex-col items-center gap-1.5 rounded-[14px] border p-2.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2",
                  isActive
                    ? "border-app-accent bg-app-accent-soft text-app-accent"
                    : isDone
                      ? "border-app-accent/30 bg-app-accent text-white hover:bg-app-accent"
                      : "border-app-line bg-app-bg text-app-ink-muted hover:bg-app-accent-soft/30 hover:text-app-accent disabled:cursor-default"
                )}
              >
                <span className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-200",
                  isActive
                    ? "bg-app-accent text-white"
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

      <div className="my-6 h-px bg-app-line" aria-hidden="true" />

      <AnimatePresence mode="wait">
        <motion.div
          key={stepIndex}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
          className="space-y-5"
        >
        {children}

        <div className="relative overflow-hidden rounded-[14px] border border-app-accent/15 bg-app-accent-soft/30 p-5 transition-all duration-200">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-app-accent">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-app-accent/10">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                </div>
                Ý tưởng gợi ý
              </div>
              <p className="text-sm font-medium leading-relaxed text-app-ink/90 italic">“{starterPreview}”</p>
              <p className="text-xs text-app-ink-muted">
                Dùng làm bản nháp rồi sửa lại cho phù hợp với mục tiêu của bạn.
              </p>
            </div>
            <button
              type="button"
              className="inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-full border border-app-accent/30 bg-app-surface px-4 py-2 text-xs font-semibold text-app-accent transition-all duration-200 hover:bg-app-accent hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 sm:w-auto"
              onClick={onApplyStarter}
              aria-label={`Dùng gợi ý cho bước ${step.label}`}
            >
              <Sparkles className="h-3 w-3" />
              Sử dụng gợi ý này
            </button>
          </div>
        </div>

        <details className="group rounded-[14px] border border-app-line bg-app-surface p-4 transition-all duration-200">
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
          <div className="mt-4 grid gap-2.5 border-t border-app-line pt-4 sm:grid-cols-2">
            {clarityItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onJumpToStep(item.stepKey)}
                className={cn(
                  "group/btn flex items-start gap-3 rounded-lg border px-3.5 py-3 text-left transition-all duration-200",
                  item.done
                    ? "border-app-accent/20 bg-app-accent-soft/30 hover:border-app-accent hover:bg-app-accent-soft/60"
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
            className="rounded-lg border border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-bg)] p-3 text-[color:var(--color-warning-fg)]"
            role="alert"
          >
            <div className="flex items-start gap-2">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold">Cần hoàn tất bước này</p>
                <p className="mt-1 text-sm leading-5 opacity-90">{currentStepError}</p>
              </div>
            </div>
          </div>
        ) : null}
        {currentStepSoftWarning ? (
          <div className="rounded-lg border border-app-line bg-app-bg p-3 text-app-ink-soft" role="note">
            <div className="flex items-start gap-2">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-app-accent" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-app-ink">Gợi ý để mục tiêu rõ hơn</p>
                <p className="mt-1 text-sm leading-5">{currentStepSoftWarning}</p>
              </div>
            </div>
          </div>
        ) : null}
        </motion.div>
      </AnimatePresence>

      <div className="mt-6 flex flex-col-reverse gap-3 border-t border-app-line pt-5 sm:flex-row sm:justify-between">
        <button
          type="button"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-app-line bg-app-surface px-5 py-2.5 text-sm font-medium text-app-ink transition-all duration-150 hover:bg-app-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 sm:w-auto"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Quay lại
        </button>
        <button
          type="button"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-app-accent px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-app-accent/15 transition-all duration-150 hover:brightness-105 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 sm:w-auto"
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
