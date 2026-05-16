"use client";

import type { ReactNode } from "react";

import { cn } from "../ui/utils";
import { Card, CardContent } from "../ui/card";
import { WizardStepPip } from "./WizardStepPip";

interface WizardStep {
  id: string;
  label?: string;
  shortLabel?: string;
}

interface WizardHeroProps {
  /** Short uppercase label, e.g. "Bước SMART" or "Cân bằng cuộc sống". */
  eyebrow?: ReactNode;
  /** Optional icon left of eyebrow (lucide-react node). */
  eyebrowIcon?: ReactNode;
  /** Main heading. Always renders as `h1` so each wizard route has a stable outline. */
  title: ReactNode;
  /** Short description (1 sentence) — keep under 140 characters. */
  description?: ReactNode;
  /**
   * Optional list of steps. When provided, a calm pip + label progress bar
   * renders below the description (uses the existing `WizardStepPip`).
   */
  steps?: ReadonlyArray<WizardStep>;
  /** Index of the active step (0-based). */
  currentStep?: number;
  /** Click handler when a completed step pip is selected. */
  onJumpToStep?: (index: number) => void;
  /** Optional aside slot (illustration). Hidden on mobile to save space. */
  aside?: ReactNode;
  /** Container className passed to the outer `<Card>` element. */
  className?: string;
  /** Forwarded `data-testid`. */
  testId?: string;
}

/**
 * WizardHero — light, calm hero for guided wizard pages (Onboarding,
 * LifeBalance, LifeInsight, SMARTGoalSetup, FeasibilityCheck, 12WeekSetup,
 * AspirationalVision).
 *
 * Pairs with `PageShell maxWidth="lg"` and the existing `WizardStepPip` so
 * every funnel screen shares the same eyebrow + title + step indicator
 * vocabulary.
 */
export function WizardHero({
  eyebrow,
  eyebrowIcon,
  title,
  description,
  steps,
  currentStep = 0,
  onJumpToStep,
  aside,
  className,
  testId,
}: WizardHeroProps) {
  const showSteps = Array.isArray(steps) && steps.length > 1;
  const heroExtraProps: Record<string, string> = {};
  if (testId) heroExtraProps["data-testid"] = testId;

  return (
    <Card
      className={cn(
        "relative overflow-hidden border border-[color:var(--border)] bg-card",
        className,
      )}
      {...heroExtraProps}
    >
      <CardContent className="relative p-5 sm:p-7 lg:p-8">
        <div
          className={cn(
            "grid items-start gap-5",
            aside ? "xl:grid-cols-[minmax(0,1fr)_minmax(260px,340px)]" : "",
          )}
        >
          <div className="min-w-0 space-y-3">
            {eyebrow ? (
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {eyebrowIcon ? (
                  <span aria-hidden="true" className="text-[color:var(--tone-shell-secondary)]">
                    {eyebrowIcon}
                  </span>
                ) : (
                  <span
                    aria-hidden="true"
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--tone-shell-primary), var(--tone-shell-secondary))",
                    }}
                  />
                )}
                {eyebrow}
              </p>
            ) : null}
            <h1
              data-slot="wizard-hero-title"
              className="text-2xl font-bold leading-[1.1] tracking-[-0.018em] text-foreground sm:text-3xl lg:text-4xl"
            >
              {title}
            </h1>
            {description ? (
              <p className="max-w-prose text-[15px] leading-relaxed tracking-tight text-muted-foreground sm:text-base">
                {description}
              </p>
            ) : null}
          </div>
          {aside ? <div className="hidden min-w-0 sm:block">{aside}</div> : null}
        </div>
        {showSteps ? (
          <div className="mt-5">
            <WizardStepPip
              steps={steps}
              currentStep={currentStep}
              onJumpToStep={onJumpToStep}
              mobileMode="compact"
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
