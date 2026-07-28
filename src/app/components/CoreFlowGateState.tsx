import { Compass, Loader2 } from "lucide-react";

import { CoreFlowProgress, type CoreFlowStepId } from "./CoreFlowProgress";
import { Button } from "./ui/button";

interface CoreFlowGateStateProps {
  currentStepId: CoreFlowStepId;
  eyebrow: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  loading?: boolean;
}

export function CoreFlowGateState({
  currentStepId,
  eyebrow,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  loading = false,
}: CoreFlowGateStateProps) {
  return (
    <div className="min-h-screen px-4 pb-10 pt-8 text-app-ink sm:px-6 sm:pt-12">
      <div className="mx-auto w-full max-w-3xl">
        <CoreFlowProgress currentStepId={currentStepId} />

        <section className="mt-5 overflow-hidden rounded-card-lg border border-app-line bg-app-surface shadow-app-card">
          <div className="grid gap-0 md:grid-cols-[0.9fr_1.1fr]">
            <div className="flex min-h-[180px] items-center justify-center border-b border-app-line bg-app-bg-subtle p-8 md:border-b-0 md:border-r">
              <div className="relative flex h-28 w-28 items-center justify-center rounded-[28px] border border-app-line bg-app-surface shadow-app-sm">
                <div className="absolute inset-3 rounded-card-lg bg-app-accent-subtle" aria-hidden="true" />
                {loading ? (
                  <Loader2 className="relative h-8 w-8 animate-spin text-app-accent" aria-hidden="true" />
                ) : (
                  <Compass className="relative h-9 w-9 text-app-accent" aria-hidden="true" />
                )}
              </div>
            </div>

            <div className="p-6 text-left sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-accent">{eyebrow}</p>
              <h1 className="mt-3 max-w-xl font-serif text-3xl font-semibold leading-tight text-app-ink sm:text-4xl">
                {title}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-app-ink-soft" role="status">
                {description}
              </p>

              {(actionLabel && onAction) || (secondaryActionLabel && onSecondaryAction) ? (
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  {actionLabel && onAction ? (
                    <Button type="button" size="lg" className="w-full sm:w-auto" onClick={onAction} loading={loading}>
                      {actionLabel}
                    </Button>
                  ) : null}
                  {secondaryActionLabel && onSecondaryAction ? (
                    <Button type="button" variant="outline" size="lg" className="w-full sm:w-auto" onClick={onSecondaryAction}>
                      {secondaryActionLabel}
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
