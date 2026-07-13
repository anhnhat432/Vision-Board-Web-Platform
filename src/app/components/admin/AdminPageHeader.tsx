import type { ReactNode } from "react";

import { cn } from "../ui/utils";

interface AdminPageHeaderProps {
  title: string;
  description?: ReactNode;
  meta?: ReactNode;
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
  meta,
  actions,
  className,
}: AdminPageHeaderProps) {
  return (
    <header className={cn("border-b border-app-line pb-5", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-[1.6rem] font-bold leading-tight tracking-tight text-app-ink">
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-sm leading-6 text-app-ink-muted">
              {description}
            </p>
          ) : null}
          {meta ? <div className="pt-1 text-xs font-medium text-app-ink-soft">{meta}</div> : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
