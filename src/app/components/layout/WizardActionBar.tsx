"use client";

import type { ReactNode } from "react";

import { cn } from "../ui/utils";

export type WizardActionBarMode = "inline" | "sticky";

interface WizardActionBarProps {
  /** Back/cancel button. Render with `<Button variant="outline">`. */
  back?: ReactNode;
  /** Primary continue/save button. Render with `<Button>` default. */
  next: ReactNode;
  /**
   * Optional secondary right-side action (e.g. "Lưu nháp" link) shown
   * between back and next on desktop and above the main row on mobile.
   */
  secondary?: ReactNode;
  /**
   * Layout mode.
   * - "inline" (default): renders as a flex row that fits in the document flow.
   * - "sticky": renders fixed near the bottom of the viewport on mobile,
   *   in-flow on `md+`. Use when wizard content is long and the action
   *   should always be visible while typing.
   */
  mode?: WizardActionBarMode;
  className?: string;
  /** Forwarded `data-testid` for stable test selectors. */
  testId?: string;
}

const STICKY_CLASS =
  "sticky bottom-20 z-30 -mx-4 mt-2 border-t border-[color:var(--border)] bg-[color-mix(in_srgb,var(--card)_92%,transparent)] px-4 py-3 backdrop-blur md:relative md:bottom-auto md:mx-0 md:mt-6 md:rounded-[var(--r-card)] md:border md:bg-card md:px-5 md:py-4 md:shadow-[var(--shadow-2)]";

const INLINE_CLASS =
  "mt-6 rounded-[var(--r-card)] border border-[color:var(--border)] bg-card px-5 py-4 shadow-[var(--shadow-2)]";

/**
 * WizardActionBar — Back/Next row used at the bottom of every wizard step.
 *
 * Replaces the bespoke action rows currently rendered inside SMARTGoalSetup,
 * FeasibilityCheck, 12WeekSetup, etc. Keeps a stable contract so global
 * focus/scroll behavior stays consistent.
 */
export function WizardActionBar({ back, next, secondary, mode = "inline", className, testId }: WizardActionBarProps) {
  const containerClass = mode === "sticky" ? STICKY_CLASS : INLINE_CLASS;

  return (
    <fieldset
      aria-label="Điều hướng bước"
      data-testid={testId}
      className={cn("border-0 p-0", containerClass, className)}
    >
      <legend className="sr-only">Điều hướng bước</legend>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="order-2 flex flex-col gap-2 sm:order-1 sm:flex-row sm:items-center">
          {back ? <span className="contents">{back}</span> : null}
        </div>
        <div className="order-1 flex flex-col gap-2 sm:order-2 sm:flex-row sm:items-center sm:justify-end">
          {secondary ? <span className="contents">{secondary}</span> : null}
          {next}
        </div>
      </div>
    </fieldset>
  );
}
