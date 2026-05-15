import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import type { Ref } from "react";

import { Button } from "../../../components/ui/button";
import { useReducedMotion } from "../../../components/ui/use-reduced-motion";
import { Card, CardContent } from "../../../components/ui/card";
import { SectionBlock } from "../../../components/layout/SectionBlock";
import { WizardStepPip } from "../../../components/layout/WizardStepPip";
import { Label } from "../../../components/ui/label";
import { RadioGroup, RadioGroupItem } from "../../../components/ui/radio-group";
import type { Question } from "../types";

interface FeasibilityStepShellProps {
  currentQuestion: Question;
  currentStep: number;
  totalSteps: number;
  answeredQuestionCount?: number;
  selectedAnswer: string | undefined;
  onAnswerChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
  targetRef: Ref<HTMLDivElement>;
  headingRef: Ref<HTMLHeadingElement>;
}

export function FeasibilityStepShell({
  currentQuestion,
  currentStep,
  totalSteps,
  answeredQuestionCount = 0,
  selectedAnswer,
  onAnswerChange,
  onBack,
  onNext,
  targetRef,
  headingRef,
}: FeasibilityStepShellProps) {
  const prefersReducedMotion = useReducedMotion();
  const wizardStepCount = totalSteps + 1;
  const feasibilityStepPips = Array.from({ length: wizardStepCount }, (_, index) =>
    index < totalSteps
      ? { id: `question-${index + 1}`, label: `Câu ${index + 1}`, shortLabel: `Q${index + 1}` }
      : { id: "result", label: "Kết quả", shortLabel: "KQ" },
  );

  return (
    <div ref={targetRef} className="mx-auto max-w-4xl">
      <Card className="overflow-hidden">
        <CardContent className="p-5 sm:p-6 lg:p-7">
          <motion.div
            key={currentQuestion.id}
            initial={prefersReducedMotion ? false : { opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }}
            className="stack-section"
          >
            <SectionBlock title={`Nội dung câu hỏi ${currentStep + 1}`} headerVisuallyHidden density="default">
              <div className="rounded-[var(--r-card)] gradient-violet-pink p-4 sm:p-6">
                <WizardStepPip
                  steps={feasibilityStepPips}
                  currentStep={currentStep}
                  ariaLabel={`Bước ${currentStep + 1} trên ${wizardStepCount}`}
                  mobileMode="compact"
                  className="mb-[var(--space-stack)]"
                />
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-500">
                  {currentQuestion.axisLabel}
                </p>
                <p className="mt-2 text-xs font-medium text-violet-700">
                  {answeredQuestionCount}/{totalSteps} câu đã trả lời
                </p>
                <h2
                  ref={headingRef}
                  id={`feasibility-question-${currentQuestion.id}`}
                  tabIndex={-1}
                  className="mt-2 text-xl font-bold leading-tight text-slate-900 focus:outline-none sm:mt-[var(--space-inline)] sm:text-3xl"
                >
                  {currentQuestion.question}
                </h2>
                <p
                  id={`feasibility-question-${currentQuestion.id}-helper`}
                  className="mt-2 text-sm leading-6 text-slate-600 sm:mt-[var(--space-inline)] sm:leading-7"
                >
                  {currentQuestion.helper}
                </p>
              </div>

              <RadioGroup
                value={selectedAnswer}
                onValueChange={onAnswerChange}
                aria-labelledby={`feasibility-question-${currentQuestion.id}`}
                aria-describedby={`feasibility-question-${currentQuestion.id}-helper`}
                className="stack-tight"
              >
                {currentQuestion.options.map((option) => (
                  <div key={option.value}>
                    <Label
                      htmlFor={option.value}
                      className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-[var(--r-card)] border px-4 py-3 transition-colors transition-shadow duration-150 sm:gap-4 sm:px-5 sm:py-4 ${
                        selectedAnswer === option.value
                          ? "border-violet-300 bg-violet-50/90 shadow-lg"
                          : "border-white/70 bg-white/72 hover:border-violet-200"
                      }`}
                    >
                      <RadioGroupItem value={option.value} id={option.value} />
                      <div className="flex-1">
                        <p className="text-sm font-medium leading-6 text-slate-800 sm:text-base">{option.label}</p>
                      </div>
                      {selectedAnswer === option.value && <CheckCircle2 className="h-5 w-5 shrink-0 text-violet-600" />}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </SectionBlock>

            <div className="stack-tight">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button variant="outline" className="flex-1" onClick={onBack}>
                  <ArrowLeft className="h-4 w-4" />
                  Quay lại
                </Button>
                <Button
                  glow={Boolean(selectedAnswer)}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/25 hover:from-violet-700 hover:to-fuchsia-700"
                  onClick={onNext}
                  disabled={!selectedAnswer}
                  aria-describedby={!selectedAnswer ? `feasibility-question-${currentQuestion.id}-next-hint` : undefined}
                >
                  {currentStep < totalSteps - 1 ? "Tiếp theo" : "Hoàn thành đánh giá"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
              {!selectedAnswer && (
                <p
                  id={`feasibility-question-${currentQuestion.id}-next-hint`}
                  role="status"
                  className="text-center text-xs text-slate-500 sm:text-right"
                >
                  Chọn một lựa chọn phù hợp để tiếp tục.
                </p>
              )}
            </div>
          </motion.div>
        </CardContent>
      </Card>
    </div>
  );
}
