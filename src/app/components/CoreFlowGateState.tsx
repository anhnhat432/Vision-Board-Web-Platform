import { Compass, Loader2 } from "lucide-react";

import { CoreFlowProgress, type CoreFlowStepId } from "./CoreFlowProgress";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

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
    <div className="app-shell min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <CoreFlowProgress currentStepId={currentStepId} />

        <Card className="overflow-hidden border border-slate-200/80 bg-white/92 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.34)]">
          <CardContent className="p-7 text-center sm:p-9">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
              {loading ? <Loader2 className="h-7 w-7 animate-spin" /> : <Compass className="h-7 w-7" />}
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{eyebrow}</p>
            <h1 className="mx-auto mt-2 max-w-2xl text-2xl font-bold tracking-normal text-slate-950 sm:text-3xl">
              {title}
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600" role="status">
              {description}
            </p>

            {(actionLabel && onAction) || (secondaryActionLabel && onSecondaryAction) ? (
              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                {actionLabel && onAction ? (
                  <Button type="button" className="w-full sm:w-auto" onClick={onAction}>
                    {actionLabel}
                  </Button>
                ) : null}
                {secondaryActionLabel && onSecondaryAction ? (
                  <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onSecondaryAction}>
                    {secondaryActionLabel}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
