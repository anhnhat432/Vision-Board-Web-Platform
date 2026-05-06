import type { ReactNode, RefObject } from "react";
import { motion } from "motion/react";
import { useReducedMotion } from "../../../components/ui/use-reduced-motion";
import { ArrowLeft, ArrowRight, CircleAlert, CheckCircle2, Lightbulb, Sparkles } from "lucide-react";

import type { QualityLevel } from "@/lib/smart-goal/quality";

import { Alert, AlertDescription, AlertTitle } from "../../../components/ui/alert";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Progress } from "../../../components/ui/progress";
import { QualityFeedbackPanel } from "./QualityFeedbackPanel";
import { ReviewStep } from "./ReviewStep";
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

  return (
    <motion.div
      key={step.key}
      initial={prefersReducedMotion ? false : { opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flow-muted p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-500">{step.label}</p>
          <span className="text-xs font-medium text-slate-500">
            Bu?c {stepIndex + 1}/{totalSteps}
          </span>
        </div>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="mt-2 text-2xl font-bold leading-tight text-slate-900 focus:outline-none sm:mt-3 sm:text-3xl"
        >
          {step.title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 sm:mt-3 sm:text-base sm:leading-7">{step.description}</p>
        <div className="flow-panel mt-3 px-4 py-3 text-sm text-slate-600 sm:mt-4">{step.coaching}</div>
      </div>

      {children}

      <div className="rounded-[24px] border border-violet-100 bg-violet-50/80 p-4 shadow-[0_10px_28px_-28px_rgba(109,40,217,0.20)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-violet-700">
              <Sparkles className="h-4 w-4" />
              Gợi ý điền nhanh
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{starterPreview}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Dùng làm bản nháp rồi sửa cho đúng đời sống bạn.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full shrink-0 border-violet-200 bg-white text-violet-700 hover:bg-violet-50 sm:w-auto"
            onClick={onApplyStarter}
            aria-label={`Dùng gợi ý cho bước ${step.label}`}
          >
            Dùng gợi ý
          </Button>
        </div>
      </div>

      <div className="rounded-[24px] border border-slate-200 bg-white/82 p-4 shadow-[0_16px_36px_-34px_rgba(15,23,42,0.22)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-950">Độ rõ của mục tiêu</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Hoàn thành để mục tiêu sẵn sàng cho kế hoạch 12 tuần.
            </p>
          </div>
          <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
            {clarityDoneCount}/{clarityItems.length}
          </Badge>
        </div>
        <Progress
          value={clarityProgress}
          className="mt-4 h-2"
          aria-label={`Độ rõ của mục tiêu: ${clarityDoneCount}/${clarityItems.length}`}
        />
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {clarityItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onJumpToStep(item.stepKey)}
              className={`rounded-2xl border px-3 py-3 text-left transition-colors ${
                item.done
                  ? "border-emerald-200 bg-emerald-50/80 hover:border-emerald-300"
                  : "border-amber-200 bg-amber-50/80 hover:border-amber-300"
              }`}
            >
              <div className="flex items-start gap-2">
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                    item.done ? "bg-emerald-600 text-white" : "bg-amber-50 text-amber-500"
                  }`}
                >
                  {item.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleAlert className="h-3.5 w-3.5" />}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-slate-900">{item.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">{item.detail}</span>
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

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
        <Alert className="border-amber-200 bg-amber-50/85 text-rose-700">
          <CircleAlert className="h-4 w-4" />
          <AlertTitle>Cần hoàn tất bước này</AlertTitle>
          <AlertDescription className="text-amber-700/90">{currentStepError}</AlertDescription>
        </Alert>
      ) : null}
      {currentStepSoftWarning ? (
        <Alert className="border-amber-200 bg-amber-50/85 text-amber-700">
          <Lightbulb className="h-4 w-4" />
          <AlertTitle>Gợi ý để mục tiêu rõ hơn</AlertTitle>
          <AlertDescription className="text-amber-700/90">{currentStepSoftWarning}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flow-muted p-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Tiếp tục viết mục tiêu
          </p>
          <p className="text-sm text-slate-600">{step.completionHint}</p>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" className="flex-1" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Button>
          <Button className="flex-1 gradient-brand text-white shadow-[0_14px_34px_-20px_rgba(109,40,217,0.38)] hover:shadow-[0_18px_40px_-22px_rgba(109,40,217,0.44)] hover:scale-[1.01]" onClick={onNext} disabled={!isCurrentStepValid}>
            {stepIndex < totalSteps - 1 ? "Tiếp theo" : "Tiếp theo: kiểm tra tính thực tế"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
