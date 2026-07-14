import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { cn } from "@/app/components/ui/utils";

interface MobileActionBarProps {
  stepIndex: number;
  totalSteps: number;
  isCurrentStepValid: boolean;
  isFinalStep: boolean;
  primaryCtaLabel: string;
  showFinalSecondaryCta: boolean;
  finalSecondaryCtaLabel?: string;
  progressLabel: string;
  showStickyMini: boolean;
  onBack: () => void;
  onNext: () => void;
  onFinalSecondaryAction?: () => void;
}

export function MobileActionBar({
  stepIndex: _stepIndex,
  totalSteps: _totalSteps,
  isCurrentStepValid,
  isFinalStep,
  primaryCtaLabel,
  showFinalSecondaryCta,
  finalSecondaryCtaLabel,
  progressLabel,
  showStickyMini,
  onBack,
  onNext,
  onFinalSecondaryAction,
}: MobileActionBarProps) {
  const readinessLabel = isCurrentStepValid ? (isFinalStep ? "Đủ rõ" : "Sẵn sàng") : "Cần hoàn thiện";

  return (
    <div
      data-smart-mobile-action-bar
      className={cn(
        "fixed right-0 bottom-0 left-0 z-40 border-t border-app-line bg-app-surface/96 px-4 pt-2.5 pb-[calc(env(safe-area-inset-bottom)+0.85rem)] shadow-[0_-20px_48px_-34px_rgba(23,21,15,0.55)] backdrop-blur-md transition-transform duration-200 motion-reduce:transition-none lg:hidden",
        showStickyMini ? "translate-y-0" : "translate-y-full",
      )}
    >
      <div className="mx-auto flex w-full max-w-[42rem] flex-col gap-2.5">
        <div
          className="flex items-center justify-between gap-3 text-[11px] font-bold leading-tight"
          aria-live="polite"
        >
          <span className="min-w-0 flex-1 truncate pr-1 leading-snug text-app-ink-muted">
            {progressLabel}
          </span>
          <span
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-extrabold leading-tight",
              isCurrentStepValid
                ? "border-app-accent/20 bg-app-accent-subtle text-app-accent"
                : "border-app-status-warning/25 bg-app-status-warning/10 text-app-status-warning",
            )}
          >
            {readinessLabel}
          </span>
        </div>
        <button
          type="button"
          className="inline-flex min-h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-card bg-app-accent px-5 py-3 text-[15px] font-extrabold leading-tight text-white shadow-app-md transition-all duration-200 hover:bg-app-accent-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/35 focus-visible:ring-offset-2"
          onClick={onNext}
        >
          {primaryCtaLabel}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={cn(
              "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-card px-3 py-2 text-[12px] font-bold leading-tight text-app-ink-muted transition-all duration-200 hover:bg-app-bg-subtle hover:text-app-ink active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/35",
              !showFinalSecondaryCta && "col-span-2",
            )}
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Quay lại
          </button>
          {showFinalSecondaryCta ? (
            <button
              type="button"
              className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-card border border-app-line bg-app-surface px-3 py-2 text-[12px] font-bold leading-tight text-app-ink-soft transition-all duration-200 hover:bg-app-bg-subtle active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/35"
              onClick={onFinalSecondaryAction}
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              {finalSecondaryCtaLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
