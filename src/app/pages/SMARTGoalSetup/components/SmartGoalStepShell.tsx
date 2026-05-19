import type { ReactNode, RefObject } from "react";
import { ArrowLeft, ArrowRight, Check, Circle, CircleAlert, Lightbulb, Sparkles } from "lucide-react";

import type { QualityLevel } from "@/lib/smart-goal/quality";

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
      className="rounded-card border border-app-line bg-app-surface p-6 md:p-8"
      aria-labelledby="smart-step-title"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-app-accent">
            Bước {stepIndex + 1}: {STEP_NAMES[step.key]}
          </p>
          <h2
            id="smart-step-title"
            ref={headingRef}
            tabIndex={-1}
            className="mt-2 font-serif text-[24px] font-medium leading-7 text-app-ink focus:outline-none"
          >
            {step.title}
          </h2>
          <p className="mt-2 text-[15px] leading-6 text-app-ink-soft">{step.description}</p>
        </div>
        <span className="inline-flex w-fit rounded-full bg-app-accent-soft px-3 py-1 text-[13px] font-medium text-app-accent">
          {stepIndex + 1}/{totalSteps}
        </span>
      </div>

      <ol aria-label={`Bước ${stepIndex + 1} trên ${totalSteps}`} className="mt-6 grid grid-cols-5 gap-2">
        {SMART_STEPS.map((smartStep, index) => {
          const isActive = index === stepIndex;
          const isDone = index < stepIndex;
          const canJump = index <= stepIndex;

          return (
            <li key={smartStep.key} aria-current={isActive ? "step" : undefined}>
              <button
                type="button"
                disabled={!canJump}
                onClick={() => handleWizardJump(index)}
                className={
                  isActive
                    ? "flex h-full w-full flex-col items-center gap-1 rounded-lg border border-app-accent bg-app-accent-soft px-2 py-2 text-app-accent transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
                    : isDone
                      ? "flex h-full w-full flex-col items-center gap-1 rounded-lg border border-app-accent bg-app-accent px-2 py-2 text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
                      : "flex h-full w-full flex-col items-center gap-1 rounded-lg border border-app-line bg-app-bg px-2 py-2 text-app-ink-muted transition-colors duration-150 hover:bg-app-accent-soft hover:text-app-accent disabled:cursor-default disabled:hover:bg-app-bg disabled:hover:text-app-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
                }
              >
                <span className="text-[14px] font-semibold" aria-hidden="true">
                  {STEP_LETTERS[smartStep.key]}
                </span>
                <span className="hidden truncate text-[12px] font-medium sm:block">{STEP_NAMES[smartStep.key]}</span>
                {isDone ? <span className="sr-only">đã hoàn thành</span> : null}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="my-6 h-px bg-app-line" aria-hidden="true" />

      <div className="space-y-5">
        {children}

        <div className="rounded-card border border-app-line bg-app-bg p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[14px] font-medium text-app-accent">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Gợi ý điền nhanh
              </div>
              <p className="mt-2 text-[15px] leading-6 text-app-ink">{starterPreview}</p>
              <p className="mt-1 text-[13px] leading-5 text-app-ink-muted">
                Dùng làm bản nháp rồi sửa cho đúng đời sống bạn.
              </p>
            </div>
            <button
              type="button"
              className="inline-flex w-full shrink-0 items-center justify-center rounded-full border border-app-line bg-app-surface px-3 py-1.5 text-[13px] font-medium text-app-ink-soft transition-colors duration-150 hover:border-app-accent hover:bg-app-accent-soft hover:text-app-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 sm:w-auto"
              onClick={onApplyStarter}
              aria-label={`Dùng gợi ý cho bước ${step.label}`}
            >
              Dùng gợi ý
            </button>
          </div>
        </div>

        <details className="rounded-card border border-app-line bg-app-surface p-4">
          <summary className="flex cursor-pointer list-none flex-wrap items-start justify-between gap-3 text-[15px] font-medium text-app-ink">
            <div>
              <p>Độ rõ của mục tiêu</p>
              <p className="mt-1 text-[13px] font-normal text-app-ink-muted">
                {clarityDoneCount}/{clarityItems.length} bước đã hoàn thành
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-32 overflow-hidden rounded-full bg-app-line" aria-hidden="true">
                <div className="h-full rounded-full bg-app-accent" style={{ width: `${clarityProgress}%` }} />
              </div>
            </div>
          </summary>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {clarityItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onJumpToStep(item.stepKey)}
                className="rounded-lg border border-app-line bg-app-bg px-3 py-3 text-left transition-colors duration-150 hover:border-app-accent hover:bg-app-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
              >
                <div className="flex items-start gap-2">
                  {item.done ? (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-app-accent" aria-hidden="true" />
                  ) : (
                    <Circle className="mt-0.5 h-4 w-4 shrink-0 text-app-ink-muted" aria-hidden="true" />
                  )}
                  <span>
                    <span className="block text-[14px] font-medium text-app-ink">{item.label}</span>
                    <span className="mt-1 block text-[13px] leading-5 text-app-ink-soft">{item.detail}</span>
                  </span>
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
                <p className="text-[14px] font-semibold">Cần hoàn tất bước này</p>
                <p className="mt-1 text-[14px] leading-5 opacity-90">{currentStepError}</p>
              </div>
            </div>
          </div>
        ) : null}
        {currentStepSoftWarning ? (
          <div className="rounded-lg border border-app-line bg-app-bg p-3 text-app-ink-soft" role="note">
            <div className="flex items-start gap-2">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-app-accent" aria-hidden="true" />
              <div>
                <p className="text-[14px] font-semibold text-app-ink">Gợi ý để mục tiêu rõ hơn</p>
                <p className="mt-1 text-[14px] leading-5">{currentStepSoftWarning}</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 border-t border-app-line pt-5 sm:flex-row sm:justify-between">
        <button
          type="button"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-app-line bg-app-surface px-4 py-2.5 text-[15px] font-medium text-app-ink transition-colors duration-150 hover:bg-app-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 sm:w-auto"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Quay lại
        </button>
        <button
          type="button"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-app-accent px-4 py-2.5 text-[15px] font-medium text-white transition-colors duration-150 hover:bg-[#284f45] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 sm:w-auto"
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
