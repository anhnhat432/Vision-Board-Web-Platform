import type { ReactNode } from "react";

import { cn } from "./ui/utils";

const PAGE_SHELL_MAX_WIDTH = {
  /** Narrow forms / single-column step. ~896px. */
  md: "max-w-4xl",
  /** Default content stage. ~1024px. */
  lg: "max-w-5xl",
  /** Two-column or wider step. ~1152px. */
  xl: "max-w-6xl",
  /** Wide hero + step composition (SMART/Feasibility/12WeekSetup). ~1280px. */
  hero: "max-w-7xl",
} as const;

export type PageShellMaxWidth = keyof typeof PAGE_SHELL_MAX_WIDTH;

interface PageShellProps {
  children: ReactNode;
  /** Content max-width tier. Default `"lg"`. */
  maxWidth?: PageShellMaxWidth;
  /** Extra classes applied to the inner content wrapper. */
  className?: string;
  /** Optional className for the outermost element. */
  outerClassName?: string;
}

export function PageShell({ children, maxWidth = "lg", className, outerClassName }: PageShellProps) {
  return (
    <div
      className={cn("min-h-screen px-4 pt-6 pb-14 sm:px-6 sm:pt-8 sm:pb-16 lg:px-10 lg:pt-10", outerClassName)}
    >
      <div className={cn("mx-auto w-full min-w-0", PAGE_SHELL_MAX_WIDTH[maxWidth], className)}>{children}</div>
    </div>
  );
}
