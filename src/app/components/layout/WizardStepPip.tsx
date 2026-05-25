import { Check } from "lucide-react";
import { cn } from "../ui/utils";

interface WizardStep {
  id: string;
  label?: string;
  shortLabel?: string;
}

export interface WizardStepPipProps {
  steps: ReadonlyArray<WizardStep>;
  currentStep: number;
  onJumpToStep?: (index: number) => void;
  ariaLabel?: string;
  /** Mobile breakpoint behavior. "full" = render all pips; "compact" = render progress bar + label. */
  mobileMode?: "full" | "compact";
  className?: string;
}

const getStepLabel = (step: WizardStep, index: number) => step.label ?? step.shortLabel ?? `Bước ${index + 1}`;
const getStepShortLabel = (step: WizardStep, index: number) => step.shortLabel ?? step.label ?? `${index + 1}`;

export function WizardStepPip({
  steps,
  currentStep,
  onJumpToStep,
  ariaLabel = "Tiến độ các bước",
  mobileMode = "full",
  className,
}: WizardStepPipProps) {
  if (steps.length === 0) {
    return null;
  }

  const currentIndex = Math.min(Math.max(currentStep, 0), steps.length - 1);
  const currentStepLabel = getStepLabel(steps[currentIndex], currentIndex);
  const progressPercent = ((currentIndex + 1) / steps.length) * 100;

  const renderStepList = (listClassName?: string) => (
    <ol aria-label={ariaLabel} className={cn("flex gap-2 overflow-x-auto", listClassName)}>
      {steps.map((step, index) => {
        const isActive = index === currentIndex;
        const isDone = index < currentIndex;
        const canJump = Boolean(onJumpToStep && isDone);
        const label = getStepLabel(step, index);
        const shortLabel = getStepShortLabel(step, index);

        return (
          <li key={step.id} aria-current={isActive ? "step" : undefined} className="min-w-fit flex-1">
            <button
              type="button"
              disabled={!canJump}
              onClick={() => {
                if (canJump) {
                  onJumpToStep?.(index);
                }
              }}
              className={cn(
                "flex h-full w-full items-center gap-2 rounded-[var(--r-control)] px-3 py-2 text-left text-xs font-semibold tracking-normal transition-colors",
                isActive && "bg-slate-50 text-slate-900 ring-2 ring-primary/40",
                isDone && !isActive && "text-slate-600 hover:bg-app-bg",
                !isDone && !isActive && "text-slate-400",
                !canJump && "cursor-default",
              )}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-[var(--r-pill)] border text-xs font-bold",
                  isActive && "border-primary bg-primary text-white",
                  isDone && !isActive && "border-primary/30 bg-primary/10 text-primary",
                  !isDone && !isActive && "border-slate-300 bg-app-surface text-slate-400",
                )}
                aria-hidden="true"
              >
                {isDone ? <Check className="size-3.5" /> : index + 1}
              </span>
              <span className="sm:hidden">{shortLabel}</span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );

  return (
    <div className={cn("rounded-[var(--r-tile)] border border-slate-200/80 bg-slate-50/72 p-2", className)}>
      {mobileMode === "compact" && (
        <div className="space-y-2 sm:hidden">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Bước {currentIndex + 1}/{steps.length}
            </span>
            <span className="truncate text-xs font-semibold text-slate-900">{currentStepLabel}</span>
          </div>
          <div
            role="progressbar"
            aria-label="Tiến độ wizard"
            aria-valuemin={1}
            aria-valuemax={steps.length}
            aria-valuenow={currentIndex + 1}
            className="h-2 overflow-hidden rounded-[var(--r-pill)] bg-app-surface ring-1 ring-slate-200"
          >
            <div className="h-full rounded-[var(--r-pill)] bg-primary" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      )}
      {renderStepList(mobileMode === "compact" ? "hidden sm:flex" : undefined)}
    </div>
  );
}
