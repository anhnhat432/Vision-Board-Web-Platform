import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import type { Ref } from "react";

import { Button } from "../../../components/ui/button";
import { useReducedMotion } from "../../../components/ui/use-reduced-motion";
import { Card, CardContent } from "../../../components/ui/card";
import { Label } from "../../../components/ui/label";
import { RadioGroup, RadioGroupItem } from "../../../components/ui/radio-group";
import type { Question } from "../types";

interface FeasibilityStepShellProps {
  currentQuestion: Question;
  currentStep: number;
  totalSteps: number;
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
  selectedAnswer,
  onAnswerChange,
  onBack,
  onNext,
  targetRef,
  headingRef,
}: FeasibilityStepShellProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div ref={targetRef} className="mx-auto max-w-4xl">
      <Card className="overflow-hidden">
        <CardContent className="p-5 sm:p-6 lg:p-7">
          <motion.div
            key={currentQuestion.id}
            initial={prefersReducedMotion ? false : { opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }}
            className="space-y-6"
          >
            <div className="rounded-[28px] gradient-violet-pink p-4 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-500">
                {currentQuestion.axisLabel} · Câu hỏi {currentStep + 1}/{totalSteps}
              </p>
              <h2
                ref={headingRef}
                id={`feasibility-question-${currentQuestion.id}`}
                tabIndex={-1}
                className="mt-2 text-xl font-bold leading-tight text-slate-900 focus:outline-none sm:mt-3 sm:text-3xl"
              >
                {currentQuestion.question}
              </h2>
              <p
                id={`feasibility-question-${currentQuestion.id}-helper`}
                className="mt-2 text-sm leading-6 text-slate-600 sm:mt-3 sm:leading-7"
              >
                {currentQuestion.helper}
              </p>
            </div>

            <RadioGroup
              value={selectedAnswer}
              onValueChange={onAnswerChange}
              aria-labelledby={`feasibility-question-${currentQuestion.id}`}
              aria-describedby={`feasibility-question-${currentQuestion.id}-helper`}
              className="space-y-3"
            >
              {currentQuestion.options.map((option, index) => (
                <motion.div
                  key={option.value}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={prefersReducedMotion ? { duration: 0 } : { delay: index * 0.05 }}
                >
                  <Label
                    htmlFor={option.value}
                    className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-[24px] border px-4 py-3 transition-all sm:gap-4 sm:px-5 sm:py-4 ${
                      selectedAnswer === option.value
                        ? "border-violet-300 bg-violet-50/90 shadow-[0_18px_36px_-28px_rgba(109,40,217,0.35)]"
                        : "border-white/70 bg-white/72 hover:border-violet-200"
                    }`}
                  >
                    <RadioGroupItem value={option.value} id={option.value} />
                    <div className="flex-1">
                      <p className="text-sm font-medium leading-6 text-slate-800 sm:text-base">{option.label}</p>
                    </div>
                    {selectedAnswer === option.value && <CheckCircle2 className="h-5 w-5 shrink-0 text-violet-600" />}
                  </Label>
                </motion.div>
              ))}
            </RadioGroup>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" className="flex-1" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
                Quay lại
              </Button>
              <Button className="flex-1" onClick={onNext} disabled={!selectedAnswer}>
                {currentStep < totalSteps - 1 ? "Tiếp theo" : "Hoàn thành đánh giá"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </CardContent>
      </Card>

      <div className="hidden">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Mục đích của bài này</p>
            <div className="mt-5 space-y-3">
              {[
                "Trả lời theo lịch sống thật, không theo phiên bản lý tưởng.",
                "Biết mục tiêu hiện tại đang vừa sức hay quá tải.",
                "Nhìn rõ độ sẵn sàng trước khi bước vào system 12 tuần.",
                "Giảm rủi ro đặt mục tiêu nghe hay nhưng khó duy trì.",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[20px] border border-white/70 bg-white/72 px-4 py-3 text-sm leading-7 text-slate-600"
                >
                  {item}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
