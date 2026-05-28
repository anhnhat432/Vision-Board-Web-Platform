import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import type { Ref } from "react";
import { motion, AnimatePresence } from "motion/react";

import { helperTextClass } from "../../SMARTGoalSetup/components/formStyles";
import { Label } from "../../../components/ui/label";
import { RadioGroup, RadioGroupItem } from "../../../components/ui/radio-group";
import type { Question } from "../types";
import { cn } from "../../../components/ui/utils";

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
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <section
      ref={targetRef}
      className="mt-6 surface-raised rounded-2xl border border-app-line bg-app-surface p-5 sm:p-6 shadow-sm transition-all duration-300"
      aria-labelledby={`feasibility-question-${currentQuestion.id}`}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
          className="space-y-6"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-accent">
                Câu {currentStep + 1} / {totalSteps}
              </p>
              <h2
                ref={headingRef}
                id={`feasibility-question-${currentQuestion.id}`}
                tabIndex={-1}
                className="mt-2 font-serif text-2xl font-medium leading-7 text-app-ink focus:outline-none"
              >
                {currentQuestion.question}
              </h2>
              <p
                id={`feasibility-question-${currentQuestion.id}-helper`}
                className="mt-2 text-sm leading-6 text-app-ink-soft"
              >
                {currentQuestion.helper}
              </p>
            </div>
            <span className="inline-flex w-fit items-center justify-center rounded-full bg-app-accent-soft px-3 py-1 text-xs font-bold text-app-accent">
              Đã trả lời {answeredQuestionCount}/{totalSteps}
            </span>
          </div>

          {/* Question progress line */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-app-line/60" aria-hidden="true">
            <div
              className="h-full rounded-full bg-gradient-to-r from-app-accent/40 via-app-accent/80 to-app-accent transition-all duration-300"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>

          <RadioGroup
            value={selectedAnswer}
            onValueChange={onAnswerChange}
            aria-labelledby={`feasibility-question-${currentQuestion.id}`}
            aria-describedby={`feasibility-question-${currentQuestion.id}-helper`}
            className="grid gap-3.5 sm:grid-cols-2"
          >
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === option.value;

              return (
                <div
                  key={option.value}
                  className="group flex w-full transition-all duration-200 transform hover:scale-[1.01] hover:-translate-y-0.5 active:scale-[0.99]"
                >
                  <Label
                    htmlFor={`feasibility-${currentQuestion.id}-${option.value}`}
                    className={cn(
                      "flex w-full min-h-[5.5rem] cursor-pointer flex-col justify-between rounded-xl border p-4 text-sm font-medium transition-all duration-200 focus-within:ring-2 focus-within:ring-app-accent/30",
                      isSelected
                        ? "border-app-accent bg-gradient-to-br from-app-accent-soft/40 to-app-accent-soft/10 text-app-accent shadow-[0_4px_12px_rgba(40,79,69,0.06)]"
                        : "border-app-line bg-app-surface text-app-ink-soft hover:border-app-ink-muted/50 hover:bg-app-bg hover:text-app-ink"
                    )}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className={cn(
                        "inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold transition-all duration-200",
                        isSelected
                          ? "border-app-accent bg-app-accent text-white"
                          : "border-app-line bg-app-bg text-app-ink-muted group-hover:border-app-ink-soft/40"
                      )}>
                        {index + 1}
                      </span>
                      <RadioGroupItem
                        value={option.value}
                        id={`feasibility-${currentQuestion.id}-${option.value}`}
                        className="sr-only"
                      />
                      {isSelected ? (
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.15 }}
                        >
                          <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-app-accent" aria-hidden="true" />
                        </motion.div>
                      ) : null}
                    </span>
                    <span className="mt-2.5 leading-relaxed text-app-ink">{option.label}</span>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>

          {!selectedAnswer ? (
            <p id={`feasibility-question-${currentQuestion.id}-next-hint`} role="status" className={helperTextClass}>
              Chọn một lựa chọn phù hợp để tiếp tục.
            </p>
          ) : null}
        </motion.div>
      </AnimatePresence>

      <div className="mt-6 flex flex-col-reverse gap-3 border-t border-app-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-app-ink-muted">
          Câu {currentStep + 1} / {totalSteps}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-app-line bg-app-surface px-4 py-2.5 text-sm font-medium text-app-ink transition-colors duration-150 hover:bg-app-bg disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 sm:w-auto"
            onClick={onBack}
            disabled={isFirstStep}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Quay lại
          </button>
          <button
            type="button"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-app-accent px-4 py-2.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-app-accent-hover disabled:cursor-not-allowed disabled:bg-app-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 sm:w-auto"
            onClick={onNext}
            disabled={!selectedAnswer}
            aria-describedby={!selectedAnswer ? `feasibility-question-${currentQuestion.id}-next-hint` : undefined}
          >
            {isLastStep ? "Xem kết quả →" : "Tiếp →"}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
