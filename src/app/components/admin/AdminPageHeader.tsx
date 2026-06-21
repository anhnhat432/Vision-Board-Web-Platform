import type { ReactNode } from "react";

import { cn } from "../ui/utils";

interface AdminPageHeaderProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/**
 * Standard "page chrome" header used at the top of each admin page.
 *
 * Features: gradient accent bar at top, refined typography, responsive layout.
 */
export function AdminPageHeader({
  title,
  description,
  actions,
  className,
}: AdminPageHeaderProps) {
  return (
    <header
      className={cn(
        "relative border-b border-app-line pb-5",
        className,
      )}
    >
      {/* Gradient accent line at the top edge */}
      <span className="absolute inset-x-0 -top-5 h-px bg-gradient-to-r from-transparent via-app-accent/30 to-transparent" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-[1.6rem] font-bold tracking-tight text-app-ink leading-tight">
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-sm leading-6 text-app-ink-muted">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}