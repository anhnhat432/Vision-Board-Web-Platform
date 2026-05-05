import { useRef, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, CheckCircle2, Flag, Lightbulb, Loader2 } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { useReducedMotion } from "@/app/components/ui/use-reduced-motion";
import { useScrollToTopOnChange } from "@/app/hooks/useScrollToTopOnChange";
import { STEPS } from "../constants";

interface SetupStepShellProps {
  title: string;
  description: ReactNode;
  whyThisMatters?: ReactNode;
  currentStep: number;
  stepCount: number;
  children: ReactNode;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  onJumpToStep?: (stepIndex: number) => void;
}

export function SetupStepShell({
  title,
  description,
  whyThisMatters,
  currentStep,
  stepCount,
  children,
  onBack,
  onNext,
  onSubmit,
  onJumpToStep,
}: SetupStepShellProps) {
  const isLastStep = currentStep >= stepCount - 1;
  const stepShellRef = useRef<HTMLDivElement | null>(null);
  const titleFocusRef = useRef<HTMLSpanElement | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitClick = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await Promise.resolve(onSubmit());
    } finally {
      setIsSubmitting(false);
    }
  };

  useScrollToTopOnChange(currentStep, {
    targetRef: stepShellRef,
    focusRef: titleFocusRef,
  });

  return (
    <motion.div
      ref={stepShellRef}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.45 }}
    >
      <Card>
        <CardHeader className="space-y-4">
          <ol
            className="flex flex-wrap items-center gap-1.5 text-xs"
            aria-label={`Bước ${currentStep + 1} trên ${stepCount}`}
          >
            {STEPS.map((step, index) => {
              const active = index === currentStep;
              const done = index < currentStep;
              return (
                <li
                  key={step.id}
                  aria-current={active ? "step" : undefined}
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors ${
                    active
                      ? "border-violet-500 bg-violet-500 text-white"
                      : done
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800 cursor-pointer hover:bg-emerald-100"
                        : "border-slate-200 bg-white text-slate-500"
                  }`}
                  onClick={done && onJumpToStep ? () => onJumpToStep(index) : undefined}
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold ${
                      active
                        ? "bg-white text-violet-500"
                        : done
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {done ? <CheckCircle2 className="h-3 w-3" /> : index + 1}
                  </span>
                  <span className="font-medium">{step.label}</span>
                </li>
              );
            })}
          </ol>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Bước {currentStep + 1} / {stepCount}
            </p>
            <CardTitle>
              <span ref={titleFocusRef} tabIndex={-1} className="block focus:outline-none">
                {title}
              </span>
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {whyThisMatters && (
            <div className="flex items-start gap-2 rounded-2xl border border-sky-200 bg-sky-50/72 px-3 py-2.5 text-sm leading-6 text-sky-900">
              <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-700" aria-hidden="true" />
              <div>
                <span className="font-semibold">Vì sao bước này quan trọng: </span>
                <span className="text-sky-900/86">{whyThisMatters}</span>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {children}

          <div
            className={`flex flex-col justify-between gap-3 border-t border-white/70 pt-4 sm:flex-row sm:static ${
              isLastStep
                ? "sticky bottom-0 -mx-4 -mb-6 bg-white/95 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 backdrop-blur-md sm:mx-0 sm:mb-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-4 sm:backdrop-blur-none"
                : ""
            }`}
          >
            <Button className="w-full sm:w-auto" variant="outline" onClick={onBack} disabled={isSubmitting}>
              <ArrowLeft className="h-4 w-4" />
              Quay lại
            </Button>
            {isLastStep ? (
              <Button
                className="w-full gradient-brand text-white shadow-[0_14px_34px_-20px_rgba(109,40,217,0.38)] hover:shadow-[0_18px_40px_-22px_rgba(109,40,217,0.44)] hover:scale-[1.01] sm:w-auto"
                onClick={handleSubmitClick}
                size="lg"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Flag className="h-4 w-4" />
                )}
                {isSubmitting ? "Đang tạo kế hoạch..." : "Tạo kế hoạch 12 tuần"}
              </Button>
            ) : (
              <Button className="w-full sm:w-auto gradient-brand text-white shadow-[0_18px_38px_-24px_rgba(109,40,217,0.52)] hover:shadow-[0_22px_44px_-24px_rgba(109,40,217,0.58)] hover:scale-[1.02]" onClick={onNext}>
                Tiếp tục
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
