import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import type { Ref } from "react";

import { helperTextClass } from "../../SMARTGoalSetup/components/formStyles";
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
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <section
      ref={targetRef}
      className="mt-6 rounded-card border border-app-line bg-app-surface p-6 md:p-8"
      aria-labelledby={`feasibility-question-${currentQuestion.id}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-app-accent">
            Câu {currentStep + 1} / {totalSteps}
          </p>
          <h2
            ref={headingRef}
            id={`feasibility-question-${currentQuestion.id}`}
            tabIndex={-1}
            className="mt-2 font-serif text-[24px] font-medium leading-7 text-app-ink focus:outline-none"
          >
            {currentQuestion.question}
          </h2>
          <p
            id={`feasibility-question-${currentQuestion.id}-helper`}
            className="mt-2 text-[15px] leading-6 text-app-ink-soft"
          >
            {currentQuestion.helper}
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full bg-app-accent-soft px-3 py-1 text-[13px] font-medium text-app-accent">
          {answeredQuestionCount}/{totalSteps}
        </span>
      </div>

      <RadioGroup
        value={selectedAnswer}
        onValueChange={onAnswerChange}
        aria-labelledby={`feasibility-question-${currentQuestion.id}`}
        aria-describedby={`feasibility-question-${currentQuestion.id}-helper`}
        className="mt-6 grid gap-2 sm:grid-cols-2"
      >
        {currentQuestion.options.map((option, index) => {
          const isSelected = selectedAnswer === option.value;

          return (
            <Label
              key={option.value}
              htmlFor={`feasibility-${currentQuestion.id}-${option.value}`}
              className={
                isSelected
                  ? "flex min-h-20 cursor-pointer flex-col gap-2 rounded-lg border border-app-accent bg-app-accent-soft px-3 py-3 text-[14px] font-medium text-app-accent transition-colors duration-150 focus-within:ring-2 focus-within:ring-app-accent/30"
                  : "flex min-h-20 cursor-pointer flex-col gap-2 rounded-lg border border-app-line bg-app-surface px-3 py-3 text-[14px] font-medium text-app-ink-soft transition-colors duration-150 hover:border-app-ink-muted hover:bg-app-bg hover:text-app-ink focus-within:ring-2 focus-within:ring-app-accent/30"
              }
            >
              <span className="flex items-center justify-between gap-3">
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-current text-[13px]">
                  {index + 1}
                </span>
                <RadioGroupItem
                  value={option.value}
                  id={`feasibility-${currentQuestion.id}-${option.value}`}
                  className="sr-only"
                />
                {isSelected ? <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
              </span>
              <span className="leading-5">{option.label}</span>
            </Label>
          );
        })}
      </RadioGroup>

      {!selectedAnswer ? (
        <p id={`feasibility-question-${currentQuestion.id}-next-hint`} role="status" className={helperTextClass}>
          Chọn một lựa chọn phù hợp để tiếp tục.
        </p>
      ) : null}

      <div className="mt-6 flex flex-col-reverse gap-3 border-t border-app-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-app-ink-muted">
          Câu {currentStep + 1} / {totalSteps}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-app-line bg-app-surface px-4 py-2.5 text-[15px] font-medium text-app-ink transition-colors duration-150 hover:bg-app-bg disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 sm:w-auto"
            onClick={onBack}
            disabled={isFirstStep}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Quay lại
          </button>
          <button
            type="button"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-app-accent px-4 py-2.5 text-[15px] font-medium text-white transition-colors duration-150 hover:bg-[#284f45] disabled:cursor-not-allowed disabled:bg-app-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 sm:w-auto"
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
