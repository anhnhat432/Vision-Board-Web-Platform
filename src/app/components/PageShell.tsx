import type { ReactNode } from "react";

import { cn } from "./ui/utils";

/**
 * Canonical outer container for guided wizard pages (Onboarding, LifeInsight,
 * SMARTGoalSetup, FeasibilityCheck, 12WeekSetup). RootLayout's
 * `GUIDED_PATHS` branch bypasses the global `<main>` wrapper, so these pages
 * must provide their own padding + max-width centering. PageShell exists so
 * every wizard uses the same rhythm without each page hand-rolling a slightly
 * different `<div className="... px-4 py-? sm:px-6 lg:px-8 ...">` outer.
 *
 * Non-guided pages (Dashboard, 12WeekSystem, etc.) inherit padding from
 * `RootLayout`'s `<main>` and should NOT use PageShell — wrapping them would
 * double-pad the layout.
 *
 * Intentionally minimal: layout only. No tone/theme overrides, no animation,
 * no hero markup. Compose with `motion.div` / `Card hero-surface` / etc.
 */

const PAGE_SHELL_MAX_WIDTH = {
  /** Narrow forms / single-column step. ~768px. */
  md: "max-w-3xl",
  /** Default content stage. ~896px. */
  lg: "max-w-4xl",
  /** Two-column or wider step. ~1024px. */
  xl: "max-w-5xl",
  /** Wide hero + step composition (SMART/Feasibility/12WeekSetup). ~1280px. */
  hero: "max-w-7xl",
} as const;

export type PageShellMaxWidth = keyof typeof PAGE_SHELL_MAX_WIDTH;

interface PageShellProps {
  children: ReactNode;
  /** Content max-width tier. Default `"lg"`. */
  maxWidth?: PageShellMaxWidth;
  /**
   * Extra classes applied to the inner content wrapper — typically used to
   * pass `space-y-X` rhythm or `pb-X` adjustments. The outer padding tier is
   * fixed.
   */
  className?: string;
  /**
   * Optional className for the outermost element. Use sparingly (e.g. to set
   * a `data-*` attribute or a stable ref hook target through composition).
   */
  outerClassName?: string;
}

export function PageShell({ children, maxWidth = "lg", className, outerClassName }: PageShellProps) {
  return (
    <div className={cn("min-h-screen px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-9", outerClassName)}>
      <div className={cn("mx-auto w-full", PAGE_SHELL_MAX_WIDTH[maxWidth], className)}>{children}</div>
    </div>
  );
}
