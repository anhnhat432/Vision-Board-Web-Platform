import type { ReactNode } from "react";

import { cn } from "./ui/utils";

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
  /** Extra classes applied to the inner content wrapper. */
  className?: string;
  /** Optional className for the outermost element. */
  outerClassName?: string;
}

export function PageShell({ children, maxWidth = "lg", className, outerClassName }: PageShellProps) {
  return (
    <div className={cn("min-h-screen px-4 pb-12 pt-8 sm:px-6", outerClassName)}>
      <div className={cn("mx-auto w-full", PAGE_SHELL_MAX_WIDTH[maxWidth], className)}>{children}</div>
    </div>
  );
}
