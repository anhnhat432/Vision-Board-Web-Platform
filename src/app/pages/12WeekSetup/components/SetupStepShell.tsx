import { useRef, type ReactNode } from "react";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, CheckCircle2, Flag, Lightbulb } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
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
}: SetupStepShellProps) {
  const isLastStep = currentStep >= stepCount - 1;
  const stepShellRef = useRef<HTMLDivElement | null>(null);
  const titleFocusRef = useRef<HTMLSpanElement | null>(null);

  useScrollToTopOnChange(currentStep, {
    targetRef: stepShellRef,
    focusRef: titleFocusRef,
  });

  return (
    <motion.div
      ref={stepShellRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
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
                      ? "border-slate-900 bg-slate-900 text-white"
                      : done
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-white text-slate-500"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold ${
                      active
                        ? "bg-white text-slate-900"
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

          <div className="flex flex-col justify-between gap-3 border-t border-white/70 pt-4 sm:flex-row">
            <Button className="w-full sm:w-auto" variant="outline" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
              Quay lại
            </Button>
            {isLastStep ? (
              <Button className="w-full sm:w-auto" onClick={onSubmit} size="lg">
                <Flag className="h-4 w-4" />
                Tạo kế hoạch 12 tuần
              </Button>
            ) : (
              <Button className="w-full sm:w-auto" onClick={onNext}>
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
