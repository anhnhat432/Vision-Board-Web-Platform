import { Compass, Loader2 } from "lucide-react";

import { CoreFlowProgress, type CoreFlowStepId } from "./CoreFlowProgress";

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
    <div className="min-h-screen px-4 pb-8 pt-12 text-app-ink sm:px-6">
      <div className="mx-auto w-full max-w-2xl">
        <CoreFlowProgress currentStepId={currentStepId} />

        <section className="rounded-card border border-app-line bg-app-surface p-8 text-center">
          {loading ? (
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-app-accent" aria-hidden="true" />
          ) : (
            <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-app-accent-soft text-app-accent">
              <Compass className="h-5 w-5" aria-hidden="true" />
            </div>
          )}

          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-app-ink-muted">{eyebrow}</p>
          <h1 className="mx-auto mt-2 max-w-xl font-serif text-3xl font-medium leading-tight tracking-[-0.01em] text-app-ink">
            {title}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-app-ink-soft" role="status">
            {description}
          </p>

          {(actionLabel && onAction) || (secondaryActionLabel && onSecondaryAction) ? (
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              {actionLabel && onAction ? (
                <button
                  type="button"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-app-accent px-5 py-2.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-[#284f45] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 sm:w-auto"
                  onClick={onAction}
                >
                  {actionLabel}
                </button>
              ) : null}
              {secondaryActionLabel && onSecondaryAction ? (
                <button
                  type="button"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-app-line bg-app-surface px-5 py-2.5 text-sm font-medium text-app-ink transition-colors duration-150 hover:bg-app-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 sm:w-auto"
                  onClick={onSecondaryAction}
                >
                  {secondaryActionLabel}
                </button>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
