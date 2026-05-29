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

function getOptionEmoji(qId: number, value: string): string {
  const emojiMap: Record<number, Record<string, string>> = {
    1: { lt1: "⏳", "1to3": "🕐", "3to5": "📅", gt5: "⚡" },
    2: { energy_drained: "😭", energy_low: "🥱", energy_stable: "🙂", energy_high: "🔥" },
    3: { resources_missing: "🤷‍♂️", resources_basic: "📚", resources_mostly_ready: "🛠️", resources_ready: "🚀" },
    4: { overwhelming: "🤯", challenging: "🧗‍♂️", realistic: "🎯", very_realistic: "👑" },
    5: { motivation: "💤", time: "⏰", resources: "📦", complexity: "🌀", none: "☀️" },
    6: { rarely: "🏜️", sometimes: "⛅", mostly: "🏡", always: "⚓" },
    7: { exploring: "🤔", interested: "👀", ready: "👍", committed: "🦁" }
  };
  return emojiMap[qId]?.[value] || "✨";
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
      className="relative overflow-hidden mt-6 rounded-[20px] border border-white/20 dark:border-slate-800/40 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md shadow-2xl p-6 sm:p-8 transition-all duration-300 group"
      aria-labelledby={`feasibility-question-${currentQuestion.id}`}
    >
      {/* Background radial soft light */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -15 }}
          transition={{ duration: 0.28, ease: [0.34, 1.56, 0.64, 1] }}
          className="space-y-6 relative z-10"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-indigo-500 dark:text-indigo-400">
                Khía cạnh đánh giá {currentStep + 1} / {totalSteps}
              </p>
              <h2
                ref={headingRef}
                id={`feasibility-question-${currentQuestion.id}`}
                tabIndex={-1}
                className="mt-2 font-serif text-2xl font-semibold leading-8 text-slate-800 dark:text-slate-100 focus:outline-none"
              >
                {currentQuestion.question}
              </h2>
              <p
                id={`feasibility-question-${currentQuestion.id}-helper`}
                className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400 font-medium"
              >
                {currentQuestion.helper}
              </p>
            </div>
            <span className="inline-flex w-fit items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/30 px-3.5 py-1.5 text-xs font-extrabold text-indigo-600 dark:text-indigo-400 select-none shadow-sm">
              Đã trả lời {answeredQuestionCount}/{totalSteps}
            </span>
          </div>

          {/* Question progress line with gradient glow */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-150 dark:bg-slate-800/80 border border-slate-200/20" aria-hidden="true">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400 dark:to-cyan-400 shadow-[0_0_8px_rgba(99,102,241,0.5)] transition-all duration-300"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>

          <RadioGroup
            value={selectedAnswer}
            onValueChange={onAnswerChange}
            aria-labelledby={`feasibility-question-${currentQuestion.id}`}
            aria-describedby={`feasibility-question-${currentQuestion.id}-helper`}
            className="grid gap-4 sm:grid-cols-2"
          >
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === option.value;

              return (
                <div
                  key={option.value}
                  className="group flex w-full transition-all duration-300"
                >
                  <Label
                    htmlFor={`feasibility-${currentQuestion.id}-${option.value}`}
                    className={cn(
                      "flex w-full min-h-[5.75rem] cursor-pointer flex-col justify-between rounded-xl border p-4.5 text-sm font-medium transition-all duration-300 focus-within:ring-2 focus-within:ring-indigo-500/30 relative overflow-hidden",
                      isSelected
                        ? "border-indigo-500 bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-purple-500/10 dark:from-indigo-950/20 dark:via-indigo-950/10 dark:to-purple-950/20 text-indigo-600 dark:text-indigo-400 shadow-[0_8px_25px_rgba(99,102,241,0.12)] -translate-y-0.5"
                        : "border-slate-200/80 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 hover:border-indigo-500/40 hover:bg-white dark:hover:bg-slate-900/80 hover:-translate-y-1 hover:shadow-lg"
                    )}
                  >
                    {/* Radial sheen highlight when selected */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.06),transparent_70%)] pointer-events-none" />
                    )}

                    <span className="flex items-center justify-between gap-3 w-full relative z-10">
                      <span className="flex items-center gap-3">
                        <span className={cn(
                          "inline-flex h-6.5 w-6.5 items-center justify-center rounded-full border text-[11px] font-extrabold transition-all duration-300",
                          isSelected
                            ? "border-indigo-500 bg-indigo-500 text-white shadow-sm"
                            : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 group-hover:border-indigo-500/40 group-hover:text-indigo-500"
                        )}>
                          {index + 1}
                        </span>
                        
                        {/* Emoji container with subtle glow */}
                        <span className={cn(
                          "inline-flex p-1.5 rounded-lg text-xl transition-all duration-300 shadow-sm",
                          isSelected 
                            ? "bg-white/80 dark:bg-slate-800/80 group-hover:rotate-12 group-hover:scale-120"
                            : "bg-slate-100/60 dark:bg-slate-800/40 group-hover:bg-indigo-50/50 dark:group-hover:bg-indigo-950/20 group-hover:rotate-6 group-hover:scale-115"
                        )}>
                          {getOptionEmoji(currentQuestion.id, option.value)}
                        </span>
                      </span>
                      <RadioGroupItem
                        value={option.value}
                        id={`feasibility-${currentQuestion.id}-${option.value}`}
                        className="sr-only"
                      />
                      {isSelected ? (
                        <motion.div
                          initial={{ scale: 0.7, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-indigo-500" aria-hidden="true" />
                        </motion.div>
                      ) : null}
                    </span>
                    <span className="mt-4 leading-relaxed text-slate-700 dark:text-slate-200 font-semibold relative z-10">{option.label}</span>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>

          {!selectedAnswer ? (
            <p id={`feasibility-question-${currentQuestion.id}-next-hint`} role="status" className={cn(helperTextClass, "text-indigo-500 dark:text-indigo-400 font-medium")}>
              💡 Chọn một lựa chọn phù hợp để tiếp tục khám phá khả năng của bạn.
            </p>
          ) : null}
        </motion.div>
      </AnimatePresence>

      <div className="mt-8 flex flex-col-reverse gap-4 border-t border-slate-200/40 dark:border-slate-800/60 pt-6 sm:flex-row sm:items-center sm:justify-between relative z-10">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Tiến trình đánh giá: {currentStep + 1} / {totalSteps} khía cạnh
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 px-5 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:bg-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 sm:w-auto"
            onClick={onBack}
            disabled={isFirstStep}
          >
            <ArrowLeft className="h-4.5 w-4.5" aria-hidden="true" />
            Quay lại
          </button>
          <button
            type="button"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition-all duration-200 hover:bg-indigo-500 hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:opacity-60 disabled:hover:translate-y-0 shadow-md shadow-indigo-600/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 sm:w-auto"
            onClick={onNext}
            disabled={!selectedAnswer}
            aria-describedby={!selectedAnswer ? `feasibility-question-${currentQuestion.id}-next-hint` : undefined}
          >
            {isLastStep ? "Xem phân tích khả thi" : "Tiếp theo"}
            <ArrowRight className="h-4.5 w-4.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
