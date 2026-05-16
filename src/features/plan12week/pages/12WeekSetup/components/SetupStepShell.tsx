import { useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Flag,
  HelpCircle,
  Lightbulb,
  ListChecks,
  Loader2,
  Target,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { SectionBlock } from "@/app/components/layout/SectionBlock";
import { WizardStepPip } from "@/app/components/layout/WizardStepPip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/app/components/ui/tooltip";
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

const STEP_VISUALS: Array<{
  icon: LucideIcon;
  eyebrow: string;
  caption: string;
  panelClassName: string;
  iconClassName: string;
}> = [
  {
    icon: Target,
    eyebrow: "Kết quả",
    caption: "Chốt kết quả đủ rõ để 12 tuần có điểm đến.",
    panelClassName:
      "border-violet-200/80 bg-gradient-to-br from-violet-50 to-fuchsia-50 text-violet-900 dark:border-violet-500/30 dark:from-violet-950/50 dark:to-fuchsia-950/30 dark:text-violet-100",
    iconClassName:
      "bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/20 dark:shadow-violet-950/30",
  },
  {
    icon: ListChecks,
    eyebrow: "Lead",
    caption: "Giữ vài việc lặp lại mà bạn thật sự kiểm soát được.",
    panelClassName:
      "border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50 text-amber-900 dark:border-amber-500/30 dark:from-amber-950/45 dark:to-orange-950/30 dark:text-amber-100",
    iconClassName:
      "bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20 dark:shadow-amber-950/30",
  },
  {
    icon: CalendarDays,
    eyebrow: "Rhythm",
    caption: "Đặt ngày bắt đầu, nhịp tuần và lịch nhìn lại cố định.",
    panelClassName:
      "border-teal-200/80 bg-gradient-to-br from-teal-50 to-cyan-50 text-teal-900 dark:border-teal-500/30 dark:from-teal-950/45 dark:to-cyan-950/30 dark:text-teal-100",
    iconClassName:
      "bg-gradient-to-br from-teal-600 to-cyan-600 text-white shadow-lg shadow-teal-500/20 dark:shadow-teal-950/30",
  },
  {
    icon: CheckCircle2,
    eyebrow: "Confirm",
    caption: "Soát lần cuối để bước vào tuần đầu không bị mơ hồ.",
    panelClassName:
      "border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-900 dark:border-emerald-500/30 dark:from-emerald-950/45 dark:to-teal-950/30 dark:text-emerald-100",
    iconClassName:
      "bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/20 dark:shadow-emerald-950/30",
  },
];

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
  const progressPercent = ((currentStep + 1) / stepCount) * 100;
  const visual = STEP_VISUALS[currentStep] ?? STEP_VISUALS[0];
  const StepIcon = visual.icon;

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
      <Card className="relative overflow-hidden">
        <CardHeader className="stack-stack pb-3">
          <div className="sticky top-3 z-20 rounded-[var(--r-card)] border border-[color:var(--border)] bg-card/95 p-2 shadow-[var(--shadow-1)] backdrop-blur">
            <div className="sm:hidden">
              <Select
                value={String(currentStep)}
                onValueChange={(value) => {
                  const nextStep = Number(value);
                  if (Number.isInteger(nextStep) && nextStep < currentStep) {
                    onJumpToStep?.(nextStep);
                  }
                }}
              >
                <SelectTrigger aria-label="Chọn bước đã hoàn thành">
                  <SelectValue placeholder="Chọn bước" />
                </SelectTrigger>
                <SelectContent>
                  {STEPS.map((step, index) => (
                    <SelectItem
                      key={step.id}
                      value={String(index)}
                      disabled={index > currentStep || (!onJumpToStep && index !== currentStep)}
                    >
                      Bước {index + 1}: {step.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <WizardStepPip
              steps={STEPS}
              currentStep={currentStep}
              onJumpToStep={onJumpToStep}
              ariaLabel={`Bước ${currentStep + 1} trên ${stepCount}`}
              mobileMode="full"
              className="hidden sm:block"
            />
            <div
              role="progressbar"
              aria-label="Tiến độ thiết lập 12 tuần"
              aria-valuemin={1}
              aria-valuemax={stepCount}
              aria-valuenow={currentStep + 1}
              className="mt-2 h-1.5 overflow-hidden rounded-[var(--r-pill)] bg-[color:var(--muted)]"
            >
              <div
                className="h-full rounded-[var(--r-pill)] gradient-brand transition-[width] duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <div className="grid gap-[var(--space-stack)] lg:grid-cols-[minmax(0,1fr)_220px] lg:items-stretch">
            <div className="stack-tight">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--tone-shell-primary)]">
                {STEPS[currentStep]?.label}
              </p>
              <CardTitle>
                <span ref={titleFocusRef} tabIndex={-1} className="block focus:outline-none">
                  {title}
                </span>
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <div className={`rounded-[var(--r-card)] border p-4 ${visual.panelClassName}`}>
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-[var(--r-tile)] ${visual.iconClassName}`}
              >
                <StepIcon className="h-6 w-6" aria-hidden="true" />
              </div>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] opacity-70">{visual.eyebrow}</p>
              <p className="mt-1 text-sm font-semibold leading-6">{visual.caption}</p>
            </div>
          </div>
          {whyThisMatters && (
            <div className="flex items-center justify-between gap-3 rounded-[var(--r-tile)] border border-[color:var(--color-info-border)] bg-[color:var(--color-info-bg)] px-3 py-2.5 text-sm leading-6 text-[color:var(--color-info-fg)]">
              <Lightbulb
                className="mt-0.5 h-4 w-4 flex-shrink-0 text-[color:var(--color-info-fg)]"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <span className="font-semibold">Gợi ý nhanh: </span>
                <span className="opacity-90">giữ câu trả lời cụ thể, đo được và vừa sức.</span>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--r-pill)] border border-[color:var(--color-info-border)] bg-card text-[color:var(--color-info-fg)] hover:bg-[color:var(--color-info-bg)]"
                    aria-label="Xem vì sao bước này quan trọng"
                  >
                    <HelpCircle className="h-4 w-4" aria-hidden="true" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-sm leading-6">
                  <span className="font-semibold">Vì sao bước này quan trọng: </span>
                  {whyThisMatters}
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </CardHeader>
        <CardContent className="stack-section">
          <SectionBlock title={`Nội dung bước ${currentStep + 1}`} headerVisuallyHidden density="default">
            {children}
            {stepError ? (
              <p
                role="alert"
                className="rounded-[var(--r-tile)] border border-[color:var(--color-error-border)] bg-[color:var(--color-error-bg)] px-4 py-3 text-sm font-medium text-[color:var(--color-error-fg)]"
              >
                {stepError}
              </p>
            ) : null}
          </SectionBlock>

          <div
            className={`flex flex-col justify-between gap-[var(--space-inline)] border-t border-[color:var(--border)] pt-[var(--space-section)] sm:flex-row sm:static ${
              isLastStep
                ? "sticky bottom-0 -mx-4 -mb-6 bg-card/95 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-[var(--space-section)] backdrop-blur sm:mx-0 sm:mb-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:backdrop-blur-none"
                : ""
            }`}
          >
            <Button className="w-full sm:w-auto" variant="outline" onClick={onBack} disabled={isSubmitting}>
              <ArrowLeft className="h-4 w-4" />
              Quay lại
            </Button>
            {isLastStep ? (
              <Button
                glow={!isSubmitting && !isSubmitDisabled}
                className="w-full sm:w-auto"
                onClick={handleSubmitClick}
                size="lg"
                disabled={isSubmitting || isSubmitDisabled}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className={prefersReducedMotion ? "h-4 w-4" : "h-4 w-4 animate-spin"} aria-hidden="true" />
                ) : (
                  <Flag className="h-4 w-4" />
                )}
                {isSubmitting ? "Đang tạo kế hoạch..." : "Tạo kế hoạch 12 tuần"}
              </Button>
            ) : (
              <Button glow={!isNextDisabled} className="w-full sm:w-auto" onClick={onNext} disabled={isNextDisabled}>
                Tiếp tục
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
        {isSubmitting ? (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-card/90 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-[var(--r-card)] border border-[color:var(--color-success-border)] bg-card p-5 text-center shadow-[var(--shadow-3)]">
              <div className="shimmer mb-4 h-2 rounded-[var(--r-pill)] bg-[color:var(--color-success-bg)]" />
              <Loader2
                className={`mx-auto h-8 w-8 text-[color:var(--color-success-fg)] ${
                  prefersReducedMotion ? "" : "animate-spin"
                }`}
                aria-hidden="true"
              />
              <p className="mt-3 text-base font-semibold text-foreground">Đang chuẩn bị 12 tuần của bạn...</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Hệ thống đang chốt tuần đầu, việc lặp lại và nhịp review.
              </p>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
