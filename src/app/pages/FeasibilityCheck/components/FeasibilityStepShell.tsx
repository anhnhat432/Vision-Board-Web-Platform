import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { Ref } from "react";
import { soundService } from "@/app/services/soundService";
import { Label } from "../../../components/ui/label";
import { RadioGroup, RadioGroupItem } from "../../../components/ui/radio-group";
import { cn } from "../../../components/ui/utils";
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

function getOptionEmoji(qId: number, value: string): string {
  const emojiMap: Record<number, Record<string, string>> = {
    1: { lt1: "⏳", "1to3": "🕐", "3to5": "📅", gt5: "⚡" },
    2: { energy_drained: "😭", energy_low: "🥱", energy_stable: "🙂", energy_high: "🔥" },
    3: { resources_missing: "🤷‍♂️", resources_basic: "📚", resources_mostly_ready: "🛠️", resources_ready: "🚀" },
    4: { overwhelming: "🤯", challenging: "🧗‍♂️", realistic: "🎯", very_realistic: "👑" },
    5: { motivation: "💤", time: "⏰", resources: "📦", complexity: "🌀", none: "☀️" },
    6: { rarely: "🏜️", sometimes: "⛅", mostly: "🏡", always: "⚓" },
    7: { exploring: "🤔", interested: "👀", ready: "👍", committed: "🦁" },
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

  const handleAnswerSelect = (value: string) => {
    soundService.click();
    onAnswerChange(value);
  };

  // Lấy dữ liệu của đáp án đang chọn để hiển thị box phân tích tĩnh bên dưới
  const selectedOptionData = currentQuestion.options.find(
    (opt) => opt.value === selectedAnswer
  );

  return (
    <section
      ref={targetRef}
      className="relative overflow-hidden rounded-card border border-app-line bg-app-surface/60 dark:bg-app-surface/40 backdrop-blur-md shadow-app-lg p-6 sm:p-8 md:p-10 transition-all duration-300 group"
      aria-labelledby={`feasibility-question-${currentQuestion.id}`}
    >
      {/* Background radial soft light */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-app-accent/5 rounded-full blur-3xl pointer-events-none" />

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
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-app-accent">
                Góc nhìn khả thi {currentStep + 1} / {totalSteps}
              </p>
              <h2
                ref={headingRef}
                id={`feasibility-question-${currentQuestion.id}`}
                tabIndex={-1}
                className="mt-2.5 font-sans text-xl sm:text-2xl font-bold leading-normal text-app-ink focus:outline-none"
              >
                {currentQuestion.question}
              </h2>
              <p
                id={`feasibility-question-${currentQuestion.id}-helper`}
                className="mt-2 text-sm leading-relaxed text-app-ink-soft font-medium"
              >
                {currentQuestion.helper}
              </p>
            </div>
            <span className="inline-flex w-fit items-center justify-center rounded-pill bg-app-accent-soft border border-app-line px-4 py-2 text-xs font-bold text-app-accent select-none shadow-app-sm">
              Đã trả lời {answeredQuestionCount}/{totalSteps}
            </span>
          </div>

          {/* Question progress line with gradient glow */}
          <div
            className="h-2 w-full overflow-hidden rounded-pill bg-app-line/20 border border-app-line/10"
            aria-hidden="true"
          >
            <div
              className="h-full rounded-pill bg-gradient-to-r from-app-accent to-app-accent/70 shadow-[0_0_8px_var(--app-accent)] transition-all duration-300"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>

          <RadioGroup
            value={selectedAnswer}
            onValueChange={handleAnswerSelect}
            aria-labelledby={`feasibility-question-${currentQuestion.id}`}
            aria-describedby={`feasibility-question-${currentQuestion.id}-helper`}
            className="grid gap-5 sm:grid-cols-2 mt-6"
          >
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === option.value;

              return (
                <motion.div
                  key={option.value}
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  className="group flex w-full transition-all duration-300"
                >
                  <Label
                    htmlFor={`feasibility-${currentQuestion.id}-${option.value}`}
                    className={cn(
                      "flex w-full h-auto min-h-[5.5rem] cursor-pointer flex-col justify-between rounded-card border p-5 text-sm font-medium transition-all duration-300 focus-within:ring-2 focus-within:ring-app-accent/30 relative focus-visible:outline-none pb-6",
                      isSelected
                        ? "border-app-line-strong bg-app-accent-soft text-app-accent shadow-app-md -translate-y-0.5"
                        : "border-app-line bg-app-surface text-app-ink-soft hover:border-app-line-strong hover:bg-app-bg-subtle hover:-translate-y-1 hover:shadow-app-md",
                    )}
                  >
                    {/* Radial sheen highlight when selected */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--app-accent-subtle),transparent_70%)] pointer-events-none rounded-card" />
                    )}

                    <span className="flex items-center justify-between gap-3 w-full relative z-10">
                      <span className="flex items-center gap-3">
                        <span
                          className={cn(
                            "inline-flex h-7.5 w-7.5 items-center justify-center rounded-full border text-[12px] font-bold transition-all duration-300",
                            isSelected
                              ? "border-app-line-strong bg-app-accent text-white shadow-app-sm"
                              : "border-app-line bg-app-bg-subtle text-app-ink-muted group-hover:border-app-line-strong group-hover:text-app-accent",
                          )}
                        >
                          {index + 1}
                        </span>

                        {/* Emoji container with subtle glow */}
                        <span
                          className={cn(
                            "inline-flex p-2 rounded-control text-2xl transition-all duration-300 shadow-app-sm",
                            isSelected
                              ? "bg-app-surface group-hover:rotate-12 group-hover:scale-120"
                              : "bg-app-bg-subtle group-hover:bg-app-accent-soft group-hover:rotate-6 group-hover:scale-115",
                          )}
                        >
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
                          <CheckCircle2 className="h-5.5 w-5.5 shrink-0 text-app-accent" aria-hidden="true" />
                        </motion.div>
                      ) : null}
                    </span>

                    <span className="mt-4 leading-relaxed text-app-ink font-bold text-[15px] block text-left">
                      {option.label}
                    </span>
                  </Label>
                </motion.div>
              );
            })}
          </RadioGroup>

          {/* Hộp tác động & Ví dụ động (Đã được chuyển ra ngoài các card để tránh co giãn) */}
          <AnimatePresence>
            {selectedOptionData && (selectedOptionData.impact || selectedOptionData.example) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="w-full border-t border-app-line pt-4 space-y-2 text-left text-xs overflow-hidden min-h-[50px]"
              >
                {selectedOptionData.impact && (
                  <div className="flex items-start gap-1.5 text-app-accent font-semibold leading-relaxed">
                    <span className="shrink-0 text-sm">🎯</span>
                    <div>
                      <span className="uppercase text-xs font-extrabold tracking-wider mr-1.5 text-app-accent/80 block sm:inline-block">
                        Tác động:
                      </span>
                      <span className="text-app-ink">{selectedOptionData.impact}</span>
                    </div>
                  </div>
                )}
                {selectedOptionData.example && (
                  <div className="flex items-start gap-1.5 text-app-ink-soft leading-relaxed italic">
                    <span className="shrink-0 text-sm">💡</span>
                    <div>
                      <span className="uppercase text-xs font-extrabold tracking-wider mr-1.5 text-app-ink-muted block sm:inline-block">
                        Ví dụ:
                      </span>
                      <span>{selectedOptionData.example}</span>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {!selectedAnswer ? (
            <p
              id={`feasibility-question-${currentQuestion.id}-next-hint`}
              role="status"
              className="text-app-accent font-semibold mt-4 text-[13px] flex items-center gap-1.5"
            >
              <span>💡</span> Chọn một lựa chọn phù hợp để tiếp tục hành trình.
            </p>
          ) : null}
        </motion.div>
      </AnimatePresence>

      <div className="mt-10 flex flex-col gap-4 border-t border-app-line pt-7 relative z-10">
        <p className="text-xs font-semibold text-app-ink-soft uppercase tracking-wider text-left">
          Tiến trình tìm hiểu: {currentStep + 1} / {totalSteps} khía cạnh
        </p>
        <div className="flex flex-row gap-3 w-full sm:w-auto justify-between sm:justify-end sm:ml-auto">
          <motion.button
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.985 }}
            type="button"
            className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-control border border-app-line bg-app-surface px-4 py-3 text-sm font-bold text-app-ink-soft transition-all duration-200 hover:bg-app-bg-subtle disabled:cursor-not-allowed disabled:opacity-50 shadow-app-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 sm:px-6 sm:py-3.5 sm:w-auto font-sans"
            onClick={() => {
              soundService.click();
              onBack();
            }}
            disabled={isFirstStep}
          >
            <ArrowLeft className="h-4.5 w-4.5" aria-hidden="true" />
            Quay lại
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.985 }}
            type="button"
            className="inline-flex flex-[2] sm:flex-none items-center justify-center gap-2.5 rounded-control bg-app-accent px-4 py-3 text-sm font-bold text-white transition-all duration-200 hover:bg-app-accent-hover disabled:cursor-not-allowed disabled:bg-app-line/50 disabled:text-app-ink-muted disabled:opacity-60 shadow-app-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 sm:px-6 sm:py-3.5 sm:w-auto font-sans"
            onClick={() => {
              soundService.click();
              onNext();
            }}
            disabled={!selectedAnswer}
            aria-describedby={!selectedAnswer ? `feasibility-question-${currentQuestion.id}-next-hint` : undefined}
          >
            {isLastStep ? "Xem phân tích khả thi" : "Tiếp theo"}
            <ArrowRight className="h-4.5 w-4.5" aria-hidden="true" />
          </motion.button>
        </div>
      </div>
    </section>
  );
}
