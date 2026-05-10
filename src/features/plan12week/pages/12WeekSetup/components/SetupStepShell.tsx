import { useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Flag, Lightbulb, Loader2 } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { SectionBlock } from "@/app/components/layout/SectionBlock";
import { WizardStepPip } from "@/app/components/layout/WizardStepPip";
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
  stepError?: string | null;
  isNextDisabled?: boolean;
  isSubmitDisabled?: boolean;
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
  stepError,
  isNextDisabled = false,
  isSubmitDisabled = false,
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
    <div
      ref={stepShellRef}
      className={prefersReducedMotion ? "" : "animate-fade-in-up"}
    >
      <Card className="ops-surface overflow-hidden border border-slate-200/80 bg-white/94 shadow-sm ring-1 ring-white/70">
        <CardHeader className="stack-stack pb-3">
          <WizardStepPip
            steps={STEPS}
            currentStep={currentStep}
            onJumpToStep={onJumpToStep}
            ariaLabel={`Bước ${currentStep + 1} trên ${stepCount}`}
            mobileMode="full"
          />
          <div className="stack-tight">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              {STEPS[currentStep]?.label}
            </p>
            <CardTitle>
              <span ref={titleFocusRef} tabIndex={-1} className="block focus:outline-none">
                {title}
              </span>
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {whyThisMatters && (
            <div className="flex items-start gap-2 rounded-[var(--r-card)] border border-sky-200 bg-sky-50/72 px-3 py-2.5 text-sm leading-6 text-sky-900">
              <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-700" aria-hidden="true" />
              <div>
                <span className="font-semibold">Vì sao bước này quan trọng: </span>
                <span className="text-sky-900/86">{whyThisMatters}</span>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="stack-section">
          <SectionBlock title={`Nội dung bước ${currentStep + 1}`} headerVisuallyHidden density="default">
            {children}
            {stepError ? (
              <p role="alert" className="rounded-[var(--r-tile)] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {stepError}
              </p>
            ) : null}
          </SectionBlock>

          <div
            className={`flex flex-col justify-between gap-[var(--space-inline)] border-t border-white/70 pt-[var(--space-section)] sm:flex-row sm:static ${
              isLastStep
                ? "sticky bottom-0 -mx-4 -mb-6 bg-white/95 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-[var(--space-section)] sm:mx-0 sm:mb-0 sm:bg-transparent sm:px-0 sm:pb-0"
                : ""
            }`}
          >
            <Button className="w-full sm:w-auto" variant="outline" onClick={onBack} disabled={isSubmitting}>
              <ArrowLeft className="h-4 w-4" />
              Quay lại
            </Button>
            {isLastStep ? (
              <Button
                className="w-full gradient-brand text-white shadow-lg hover:shadow-xl hover:scale-[1.01] sm:w-auto"
                onClick={handleSubmitClick}
                size="lg"
                disabled={isSubmitting || isSubmitDisabled}
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
              <Button
                className="w-full sm:w-auto gradient-brand text-white shadow-lg hover:shadow-xl hover:scale-[1.02]"
                onClick={onNext}
                disabled={isNextDisabled}
              >
                Tiếp tục
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
