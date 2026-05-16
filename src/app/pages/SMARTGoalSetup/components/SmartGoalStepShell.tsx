import type { ReactNode, RefObject } from "react";
import { motion } from "motion/react";
import { useReducedMotion } from "../../../components/ui/use-reduced-motion";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  ChevronDown,
  CircleAlert,
  Clock,
  Compass,
  Heart,
  HelpCircle,
  Lightbulb,
  Sparkles,
  Target,
  type LucideIcon,
} from "lucide-react";

import type { QualityLevel } from "@/lib/smart-goal/quality";

import { Alert, AlertDescription, AlertTitle } from "../../../components/ui/alert";
import { Button } from "../../../components/ui/button";
import { SectionBlock } from "../../../components/layout/SectionBlock";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../components/ui/tooltip";
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

const SMART_STEP_VISUALS: Record<
  SmartStepKey,
  {
    letter: string;
    icon: LucideIcon;
    tone: string;
    activeTone: string;
    iconTone: string;
  }
> = {
  specific: {
    letter: "S",
    icon: Target,
    tone:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-950/30 dark:text-violet-200",
    activeTone:
      "border-violet-500 bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/20",
    iconTone:
      "bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-700 dark:from-violet-950/70 dark:to-fuchsia-950/50 dark:text-violet-200",
  },
  measurable: {
    letter: "M",
    icon: BarChart3,
    tone:
      "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-950/30 dark:text-cyan-200",
    activeTone:
      "border-cyan-500 bg-gradient-to-br from-cyan-600 to-sky-600 text-white shadow-lg shadow-cyan-500/20",
    iconTone:
      "bg-gradient-to-br from-cyan-100 to-sky-100 text-cyan-700 dark:from-cyan-950/70 dark:to-sky-950/50 dark:text-cyan-200",
  },
  achievable: {
    letter: "A",
    icon: Compass,
    tone:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-200",
    activeTone:
      "border-emerald-500 bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/20",
    iconTone:
      "bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700 dark:from-emerald-950/70 dark:to-teal-950/50 dark:text-emerald-200",
  },
  relevant: {
    letter: "R",
    icon: Heart,
    tone:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-200",
    activeTone:
      "border-rose-500 bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/20",
    iconTone:
      "bg-gradient-to-br from-rose-100 to-pink-100 text-rose-700 dark:from-rose-950/70 dark:to-pink-950/50 dark:text-rose-200",
  },
  timeBound: {
    letter: "T",
    icon: Clock,
    tone:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-200",
    activeTone:
      "border-amber-500 bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20",
    iconTone:
      "bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700 dark:from-amber-950/70 dark:to-orange-950/50 dark:text-amber-200",
  },
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
  const prefersReducedMotion = useReducedMotion();
  const handleWizardJump = (index: number) => {
    const nextStep = SMART_STEPS[index];
    if (nextStep) {
      onJumpToStep(nextStep.key);
    }
  };
  const currentStepVisual = SMART_STEP_VISUALS[step.key];
  const CurrentStepIcon = currentStepVisual.icon;

  return (
    <motion.div
      key={step.key}
      initial={prefersReducedMotion ? false : { opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }}
      className="stack-section"
    >
      <SectionBlock title={`Nội dung bước ${stepIndex + 1}`} headerVisuallyHidden density="default">
        <div className="rounded-[var(--r-card)] border border-[color:var(--border)] bg-[color:var(--muted)] p-4 sm:p-6">
          <div className="sticky top-3 z-20 rounded-[var(--r-card)] border border-[color:var(--border)] bg-card/95 p-2 shadow-[var(--shadow-1)] backdrop-blur">
            <div className="mb-2 flex items-center justify-between gap-3 px-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Bước {stepIndex + 1}/{totalSteps}
              </span>
              <span className="truncate text-xs font-semibold text-foreground">{step.label}</span>
            </div>
            <ol aria-label={`Bước ${stepIndex + 1} trên ${totalSteps}`} className="grid grid-cols-5 gap-2">
              {SMART_STEPS.map((smartStep, index) => {
                const visual = SMART_STEP_VISUALS[smartStep.key];
                const Icon = visual.icon;
                const isActive = index === stepIndex;
                const isDone = index < stepIndex;
                const canJump = index <= stepIndex;

                return (
                  <li key={smartStep.key} aria-current={isActive ? "step" : undefined}>
                    <button
                      type="button"
                      disabled={!canJump}
                      onClick={() => handleWizardJump(index)}
                      className={`flex h-full w-full flex-col items-center gap-1 rounded-[var(--r-control)] border px-2 py-2 text-xs font-semibold transition-colors ${
                        isActive ? visual.activeTone : visual.tone
                      } ${!canJump ? "cursor-default opacity-60" : "hover:border-violet-300"}`}
                    >
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-[var(--r-tile)] ${
                          isActive ? "bg-white/18 text-white" : visual.iconTone
                        }`}
                        aria-hidden="true"
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-bold">{visual.letter}</span>
                      <span className="hidden truncate text-[11px] sm:block">{smartStep.label}</span>
                      {isDone ? <span className="sr-only">đã hoàn thành</span> : null}
                    </button>
                  </li>
                );
              })}
            </ol>
            <div
              role="progressbar"
              aria-label="Tiến độ mục tiêu SMART"
              aria-valuemin={1}
              aria-valuemax={totalSteps}
              aria-valuenow={stepIndex + 1}
              className="mt-2 h-1.5 overflow-hidden rounded-[var(--r-pill)] bg-[color:var(--muted)]"
            >
              <div
                className="h-full rounded-[var(--r-pill)] gradient-brand transition-[width] duration-300 ease-out"
                style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
              />
            </div>
          </div>
          <div className="mt-[var(--space-stack)] grid gap-[var(--space-stack)] lg:grid-cols-[minmax(0,1fr)_200px]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--tone-shell-primary)]">
                {step.label}
              </p>
              <h2
                ref={headingRef}
                tabIndex={-1}
                className="mt-2 text-2xl font-bold leading-[1.1] tracking-[-0.014em] text-foreground focus:outline-none sm:mt-[var(--space-inline)] sm:text-3xl"
              >
                {step.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground sm:mt-[var(--space-inline)] sm:text-base sm:leading-7">
                {step.description}
              </p>
            </div>
            <div className={`rounded-[var(--r-card)] border p-4 ${currentStepVisual.tone}`}>
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-[var(--r-tile)] ${currentStepVisual.iconTone}`}
              >
                <CurrentStepIcon className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.12em] opacity-70">
                SMART · {currentStepVisual.letter}
              </p>
              <p className="mt-1 text-sm font-semibold leading-6">{step.completionHint}</p>
            </div>
          </div>
          <div className="mt-[var(--space-inline)] flex items-center justify-between gap-3 rounded-[var(--r-tile)] border border-[color:var(--color-info-border)] bg-[color:var(--color-info-bg)] px-3 py-2.5 text-sm leading-6 text-[color:var(--color-info-fg)] sm:mt-4">
            <span className="font-semibold">Gợi ý nhanh</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--r-pill)] border border-[color:var(--color-info-border)] bg-card text-[color:var(--color-info-fg)] hover:bg-[color:var(--color-info-bg)]"
                  aria-label={`Xem gợi ý cho bước ${step.label}`}
                >
                  <HelpCircle className="h-4 w-4" aria-hidden="true" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-sm leading-6">{step.coaching}</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {children}

        <div className="rounded-[var(--r-card)] border border-[color:var(--border)] bg-[color:var(--muted)] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--tone-shell-primary)]">
                <Sparkles className="h-4 w-4" />
                Gợi ý điền nhanh
              </div>
              <p className="mt-2 text-sm leading-6 text-foreground">{starterPreview}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Dùng làm bản nháp rồi sửa cho đúng đời sống bạn.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full shrink-0 sm:w-auto"
              onClick={onApplyStarter}
              aria-label={`Dùng gợi ý cho bước ${step.label}`}
            >
              Dùng gợi ý
            </Button>
          </div>
        </div>

        <details className="rounded-[var(--r-card)] border border-[color:var(--border)] bg-card p-4 shadow-[var(--shadow-1)]">
          <summary className="flex cursor-pointer list-none flex-wrap items-start justify-between gap-3 text-sm font-semibold text-foreground">
            <div>
              <p className="font-semibold text-foreground">Độ rõ của mục tiêu</p>
              <p className="mt-1 font-normal text-muted-foreground">
                {clarityDoneCount}/{clarityItems.length} bước đã hoàn thành
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2 w-32 overflow-hidden rounded-[var(--r-pill)] bg-[color:var(--muted)]">
                <div
                  className="h-full rounded-[var(--r-pill)] bg-[color:var(--color-success-fg)] transition-all"
                  style={{ width: `${clarityProgress}%` }}
                />
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
            </div>
          </summary>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {clarityItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onJumpToStep(item.stepKey)}
                className={`rounded-[var(--r-card)] border px-3 py-3 text-left transition-colors ${
                  item.done
                    ? "border-[color:var(--color-success-border)] bg-[color:var(--color-success-bg)] hover:border-[color:var(--color-success-fg)]"
                    : "border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-bg)] hover:border-[color:var(--color-warning-fg)]"
                }`}
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[var(--r-pill)] text-xs font-bold ${
                      item.done
                        ? "bg-[color:var(--color-success-fg)] text-[color:var(--color-success-bg)]"
                        : "bg-[color:var(--color-warning-fg)] text-[color:var(--color-warning-bg)]"
                    }`}
                  >
                    {item.done ? "✓" : "!"}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-foreground">{item.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">{item.detail}</span>
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
          <Alert
            className="border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-bg)] text-[color:var(--color-warning-fg)]"
          >
            <CircleAlert className="h-4 w-4" />
            <AlertTitle>Cần hoàn tất bước này</AlertTitle>
            <AlertDescription className="opacity-90">{currentStepError}</AlertDescription>
          </Alert>
        ) : null}
        {currentStepSoftWarning ? (
          <Alert
            className="border-[color:var(--color-info-border)] bg-[color:var(--color-info-bg)] text-[color:var(--color-info-fg)]"
          >
            <Lightbulb className="h-4 w-4" />
            <AlertTitle>Gợi ý để mục tiêu rõ hơn</AlertTitle>
            <AlertDescription className="opacity-90">{currentStepSoftWarning}</AlertDescription>
          </Alert>
        ) : null}
      </SectionBlock>

      <div className="rounded-[var(--r-card)] border border-[color:var(--border)] bg-[color:var(--muted)] p-4">
        <div className="stack-tight">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Tiếp tục viết mục tiêu
          </p>
          <p className="text-sm text-muted-foreground">{step.completionHint}</p>
        </div>

        <div className="mt-[var(--space-section)] flex flex-col gap-[var(--space-inline)] sm:flex-row">
          <Button variant="outline" className="flex-1" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Button>
          <Button
            glow={isCurrentStepValid}
            className="flex-1"
            onClick={onNext}
            disabled={!isCurrentStepValid}
          >
            {stepIndex < totalSteps - 1 ? "Tiếp theo" : "Tiếp theo: kiểm tra tính thực tế"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
