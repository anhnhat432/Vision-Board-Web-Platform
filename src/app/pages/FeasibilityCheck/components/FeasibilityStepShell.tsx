import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { Ref } from "react";
import { soundService } from "@/app/services/soundService";
import { Label } from "../../../components/ui/label";
import { Progress } from "../../../components/ui/progress";
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
  const progressValue = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;

  const handleAnswerSelect = (value: string) => {
    soundService.click();
    onAnswerChange(value);
  };

  // Lấy dữ liệu của đáp án đang chọn để hiển thị box phân tích tĩnh bên dưới
  const selectedOptionData = currentQuestion.options.find((opt) => opt.value === selectedAnswer);

  return (
    <section
      data-feasibility-step-shell
      ref={targetRef}
      className="relative overflow-hidden rounded-card border border-app-line bg-app-surface/60 p-4 pb-[calc(7rem+env(safe-area-inset-bottom))] shadow-app-lg backdrop-blur-md transition-all duration-300 dark:bg-app-surface/40 sm:p-8 sm:pb-8 md:p-10 md:pb-10 group"
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
          className="relative z-10 space-y-4 sm:space-y-6"
        >
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-app-accent">
                Góc nhìn khả thi {currentStep + 1} / {totalSteps}
              </p>
              <h2
                ref={headingRef}
                id={`feasibility-question-${currentQuestion.id}`}
                tabIndex={-1}
                className="mt-2 font-serif text-[20px] font-bold leading-[1.2] text-app-ink focus:outline-none sm:mt-2.5 sm:text-2xl sm:leading-normal"
              >
                {currentQuestion.question}
              </h2>
              <p
                id={`feasibility-question-${currentQuestion.id}-helper`}
                className="mt-1.5 text-[13px] font-medium leading-[1.55] text-app-ink-soft sm:mt-2 sm:text-sm sm:leading-relaxed"
              >
                {currentQuestion.helper}
              </p>
            </div>
            <span className="inline-flex w-fit items-center justify-center rounded-pill border border-app-line bg-app-accent-soft px-3 py-1.5 text-xs font-bold text-app-accent shadow-app-sm select-none sm:px-4 sm:py-2">
              Đã trả lời {answeredQuestionCount}/{totalSteps}
            </span>
          </div>

          <Progress
            value={progressValue}
            aria-label={`Tiến độ câu hỏi khả thi ${currentStep + 1}/${totalSteps}`}
            className="h-2 bg-app-line/20"
          />

          <RadioGroup
            value={selectedAnswer}
            onValueChange={handleAnswerSelect}
            aria-labelledby={`feasibility-question-${currentQuestion.id}`}
            aria-describedby={`feasibility-question-${currentQuestion.id}-helper`}
            className="mt-4 grid gap-3 sm:mt-6 sm:grid-cols-2 sm:gap-5"
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
                      "relative flex h-auto min-h-[4.25rem] w-full cursor-pointer items-center justify-start gap-3 rounded-card border p-3.5 text-sm font-medium transition-all duration-300 focus-within:ring-2 focus-within:ring-app-accent/30 focus-visible:outline-none sm:min-h-[5.5rem] sm:flex-col sm:justify-between sm:p-5 sm:pb-6",
                      isSelected
                        ? "border-app-line-strong bg-app-accent-soft text-app-accent shadow-app-md -translate-y-0.5"
                        : "border-app-line bg-app-surface text-app-ink-soft hover:border-app-line-strong hover:bg-app-bg-subtle hover:-translate-y-1 hover:shadow-app-md",
                    )}
                  >
                    {/* Radial sheen highlight when selected */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--app-accent-subtle),transparent_70%)] pointer-events-none rounded-card" />
                    )}

                    <span className="relative z-10 flex w-auto items-center justify-between gap-2.5 sm:w-full sm:gap-3">
                      <span className="flex items-center gap-3">
                        <span
                          className={cn(
                            "inline-flex h-7 w-7 items-center justify-center rounded-full border text-[12px] font-bold transition-all duration-300 sm:h-7.5 sm:w-7.5",
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
                            "inline-flex rounded-control p-2 text-xl shadow-app-sm transition-all duration-300 sm:text-2xl",
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

                    <span className="relative z-10 block text-left text-[14px] font-bold leading-snug text-app-ink sm:mt-4 sm:text-[15px] sm:leading-relaxed">
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
              data-feasibility-step-feedback
              id={`feasibility-question-${currentQuestion.id}-next-hint`}
              role="status"
              className="mt-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-app-accent sm:mt-4 sm:text-[13px]"
            >
              <span>💡</span> Chọn một lựa chọn phù hợp để tiếp tục hành trình.
            </p>
          ) : null}
        </motion.div>
      </AnimatePresence>

      <div className="relative z-10 mt-10 hidden flex-col gap-4 border-t border-app-line pt-7 sm:flex">
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

      <div
        data-feasibility-mobile-action-bar
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-app-line/80 bg-app-surface/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2 shadow-[0_-18px_40px_-30px_rgba(23,21,15,0.45)] backdrop-blur-md sm:hidden"
      >
        <div className="mx-auto flex w-full max-w-[42rem] flex-col gap-2">
          <p className="sr-only">
            Câu {currentStep + 1}/{totalSteps} · Đã trả lời {answeredQuestionCount}/{totalSteps}
          </p>
          <div className="flex w-full gap-2.5">
            <motion.button
              whileTap={{ scale: 0.985 }}
              type="button"
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-app-line bg-app-surface px-4 py-2 text-xs font-bold text-app-ink transition-all duration-150 hover:bg-app-bg active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2"
              onClick={() => {
                soundService.click();
                onBack();
              }}
              disabled={isFirstStep}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Quay lại
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.985 }}
              type="button"
              className="inline-flex min-h-11 flex-[2] items-center justify-center gap-1.5 rounded-xl bg-app-accent px-5 py-2.5 text-xs font-bold text-white transition-all duration-150 hover:bg-app-accent-hover active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-app-ink-muted disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2"
              onClick={() => {
                soundService.click();
                onNext();
              }}
              disabled={!selectedAnswer}
              aria-describedby={!selectedAnswer ? `feasibility-question-${currentQuestion.id}-next-hint` : undefined}
            >
              <span className="truncate">{isLastStep ? "Xem phân tích" : "Tiếp theo"}</span>
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </motion.button>
          </div>
        </div>
      </div>
    </section>
  );
}
