import { ArrowLeft, ArrowRight, CheckCircle2, Lightbulb, Target } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, type Ref } from "react";
import { soundService } from "@/app/services/soundService";
import { resolveFieldErrorDisplay } from "../../../utils/field-error-display";
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

  // Inline validation cho lựa chọn bắt buộc: phân giải qua resolveFieldValidationState
  // (Req 13.1, 13.2). Cập nhật ngay khi đổi lựa chọn, gỡ lỗi khi đã chọn hợp lệ.
  const answerError = resolveFieldErrorDisplay(selectedAnswer ?? "", [{ kind: "required" }], {
    forceShow: true,
    messages: { required: "Chọn một lựa chọn phù hợp để tiếp tục hành trình." },
  });
  const [showMobileActionBar, setShowMobileActionBar] = useState(false);
  const mobileProgressLabel = `Câu ${currentStep + 1}/${totalSteps}`;
  const mobileAnswerStatus = selectedAnswer ? "Đã chọn" : "Cần chọn đáp án";

  useEffect(() => {
    const updateMobileActionBar = () => {
      const shell = document.querySelector("[data-feasibility-step-shell]");
      const rect = shell?.getBoundingClientRect();
      const isMobile = window.innerWidth < 640;
      const isQuestionInFocus = rect
        ? rect.top < window.innerHeight * 0.72 && rect.bottom > window.innerHeight * 0.35
        : window.scrollY > 520;

      setShowMobileActionBar(isMobile && isQuestionInFocus);
    };

    updateMobileActionBar();
    window.addEventListener("scroll", updateMobileActionBar, { passive: true });
    window.addEventListener("resize", updateMobileActionBar);

    return () => {
      window.removeEventListener("scroll", updateMobileActionBar);
      window.removeEventListener("resize", updateMobileActionBar);
    };
  }, []);

  return (
    <>
      <section
        data-feasibility-step-shell
        ref={targetRef}
        className="group relative overflow-hidden rounded-card border border-app-line bg-app-surface p-3 pb-[calc(6.5rem+env(safe-area-inset-bottom))] shadow-app-card transition-colors duration-200 motion-reduce:transition-none dark:bg-app-surface sm:p-7 sm:pb-8 md:p-8 md:pb-9"
        aria-labelledby={`feasibility-question-${currentQuestion.id}`}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-app-accent via-app-status-success to-app-accent/45" />

        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.28, ease: [0.34, 1.56, 0.64, 1] }}
            className="relative z-10 space-y-3 sm:space-y-5"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-app-accent">
                  Góc nhìn khả thi {currentStep + 1} / {totalSteps}
                </p>
                <h2
                  ref={headingRef}
                  id={`feasibility-question-${currentQuestion.id}`}
                  tabIndex={-1}
                  className="mt-1 break-words font-serif text-[19px] font-bold leading-[1.12] text-app-ink focus:outline-none sm:mt-2.5 sm:text-2xl sm:leading-normal"
                >
                  {currentQuestion.question}
                </h2>
                <p
                  id={`feasibility-question-${currentQuestion.id}-helper`}
                  className="mt-1.5 break-words text-[12.5px] font-medium leading-[1.45] text-app-ink-soft sm:mt-2 sm:text-sm sm:leading-relaxed"
                >
                  {currentQuestion.helper}
                </p>
              </div>
              <span className="inline-flex min-h-8 w-fit items-center justify-center rounded-pill border border-app-line bg-app-accent-soft px-3 py-1.5 text-xs font-bold leading-tight text-app-accent shadow-app-sm select-none sm:px-4 sm:py-2">
                Đã trả lời {answeredQuestionCount}/{totalSteps}
              </span>
            </div>

            <Progress
              value={progressValue}
              aria-label={`Tiến độ câu hỏi khả thi ${currentStep + 1}/${totalSteps}`}
              className="h-1.5 bg-app-line/20 sm:h-2"
            />

            <RadioGroup
              value={selectedAnswer}
              onValueChange={handleAnswerSelect}
              aria-labelledby={`feasibility-question-${currentQuestion.id}`}
              aria-describedby={`feasibility-question-${currentQuestion.id}-helper`}
              className="mt-2.5 grid gap-2 sm:mt-5 sm:grid-cols-2 sm:gap-4"
            >
              {currentQuestion.options.map((option, index) => {
                const isSelected = selectedAnswer === option.value;

                return (
                  <motion.div
                    key={option.value}
                    whileTap={{ scale: 0.992 }}
                    className="group flex min-w-0 w-full"
                  >
                    <Label
                      htmlFor={`feasibility-${currentQuestion.id}-${option.value}`}
                      className={cn(
                        "relative flex h-auto min-h-[3.5rem] min-w-0 w-full cursor-pointer items-center justify-start gap-3 rounded-card border p-3 text-sm font-medium transition-[background-color,border-color,box-shadow,color] duration-200 focus-within:ring-2 focus-within:ring-app-accent/35 focus-visible:outline-none sm:min-h-[4.75rem] sm:flex-col sm:justify-between sm:p-4 sm:pb-5",
                        isSelected
                          ? "border-app-accent/35 bg-app-accent-soft text-app-accent shadow-app-sm"
                          : "border-app-line bg-app-surface text-app-ink-soft hover:border-app-accent/25 hover:bg-app-bg-subtle",
                      )}
                    >
                      {isSelected ? (
                        <span
                          className="pointer-events-none absolute inset-y-3 left-0 w-1 rounded-r-full bg-app-accent"
                          aria-hidden="true"
                        />
                      ) : null}

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
                        </span>
                        <RadioGroupItem
                          value={option.value}
                          id={`feasibility-${currentQuestion.id}-${option.value}`}
                          className="sr-only"
                        />
                        {isSelected ? (
                          <CheckCircle2 className="h-5.5 w-5.5 shrink-0 text-app-accent" aria-hidden="true" />
                        ) : null}
                      </span>

                      <span className="relative z-10 block min-w-0 break-words text-left text-[13.5px] font-bold leading-snug text-app-ink sm:mt-3 sm:text-[15px] sm:leading-relaxed">
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
                  className="w-full space-y-2 overflow-hidden border-t border-app-line pt-3 text-left text-xs sm:pt-4"
                >
                  {selectedOptionData.impact && (
                    <div className="flex items-start gap-2 text-app-accent font-semibold leading-relaxed">
                      <Target className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      <div>
                        <span className="uppercase text-xs font-extrabold tracking-wider mr-1.5 text-app-accent/80 block sm:inline-block">
                          Tác động:
                        </span>
                        <span className="break-words text-app-ink">{selectedOptionData.impact}</span>
                      </div>
                    </div>
                  )}
                  {selectedOptionData.example && (
                    <div className="flex items-start gap-2 text-app-ink-soft leading-relaxed italic">
                      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-app-ink-muted" aria-hidden="true" />
                      <div>
                        <span className="uppercase text-xs font-extrabold tracking-wider mr-1.5 text-app-ink-muted block sm:inline-block">
                          Ví dụ:
                        </span>
                        <span className="break-words">{selectedOptionData.example}</span>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {answerError.showError ? (
              <p
                data-feasibility-step-feedback
                id={`feasibility-question-${currentQuestion.id}-next-hint`}
                role="status"
                className="mt-1 flex items-center gap-1.5 text-[12.5px] font-semibold leading-snug text-app-accent sm:mt-3 sm:text-[13px]"
              >
                <Lightbulb className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{answerError.message}</span>
              </p>
            ) : null}
          </motion.div>
        </AnimatePresence>

        <div className="relative z-10 mt-7 hidden flex-col gap-3 border-t border-app-line pt-5 sm:flex">
          <p className="text-xs font-semibold text-app-ink-soft uppercase tracking-wider text-left">
            Tiến trình tìm hiểu: {currentStep + 1} / {totalSteps} khía cạnh
          </p>
          <div className="flex flex-row gap-3 w-full sm:w-auto justify-between sm:justify-end sm:ml-auto">
            <motion.button
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              type="button"
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-control border border-app-line bg-app-surface px-4 py-3 text-sm font-bold leading-tight text-app-ink-soft shadow-app-sm transition-all duration-200 hover:bg-app-bg-subtle disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 sm:w-auto sm:flex-none sm:px-5 sm:py-3 font-sans"
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
              className="inline-flex min-h-11 flex-[2] items-center justify-center gap-2.5 rounded-control bg-app-accent px-4 py-3 text-sm font-bold leading-tight text-white shadow-app-md transition-all duration-200 hover:bg-app-accent-hover disabled:cursor-not-allowed disabled:bg-app-line/50 disabled:text-app-ink-muted disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 sm:w-auto sm:flex-none sm:px-5 sm:py-3 font-sans"
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

      <div
        data-feasibility-mobile-action-bar
        className={cn(
          "fixed bottom-0 left-0 right-0 z-40 border-t border-app-line/80 bg-app-surface/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2 shadow-[0_-18px_40px_-30px_rgba(23,21,15,0.45)] backdrop-blur-md transition-transform duration-200 motion-reduce:transition-none sm:hidden",
          showMobileActionBar ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="mx-auto flex w-full max-w-[42rem] flex-col gap-1.5">
          <p
            className="flex items-start justify-between gap-3 text-[11px] font-semibold leading-tight"
            aria-live="polite"
          >
            <span className="min-w-0 break-words text-app-ink-muted">
              {mobileProgressLabel} · Đã trả lời {answeredQuestionCount}/{totalSteps}
            </span>
            <span
              className={cn(
                "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold leading-tight",
                selectedAnswer
                  ? "border-app-accent/20 bg-app-accent-soft text-app-accent"
                  : "border-app-status-warning/25 bg-app-status-warning/10 text-app-status-warning",
              )}
            >
              {mobileAnswerStatus}
            </span>
          </p>
          <div className="flex w-full gap-2.5">
            <motion.button
              whileTap={{ scale: 0.985 }}
              type="button"
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-control border border-app-line bg-app-surface px-4 py-2 text-xs font-bold text-app-ink transition-all duration-150 hover:bg-app-bg active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2"
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
              className="inline-flex min-h-11 flex-[2] items-center justify-center gap-1.5 rounded-control bg-app-accent px-5 py-2 text-xs font-bold text-white transition-all duration-150 hover:bg-app-accent-hover active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-app-ink-muted disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2"
              onClick={() => {
                soundService.click();
                onNext();
              }}
              disabled={!selectedAnswer}
              aria-describedby={!selectedAnswer ? `feasibility-question-${currentQuestion.id}-next-hint` : undefined}
            >
              <span className="min-w-0 break-words leading-tight">{isLastStep ? "Xem phân tích" : "Tiếp theo"}</span>
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </motion.button>
          </div>
        </div>
      </div>
    </>
  );
}
