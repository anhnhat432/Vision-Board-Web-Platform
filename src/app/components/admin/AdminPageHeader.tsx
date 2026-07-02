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
 * Features: restrained accent rule, refined typography, responsive layout.
 */
export function AdminPageHeader({
  title,
  description,
  actions,
  className,
}: AdminPageHeaderProps) {
  return (
    <header className={cn("relative border-b border-app-line pb-5", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="mb-2 h-1 w-10 rounded-full bg-app-accent/80" aria-hidden="true" />
          <h1 className="font-serif text-[1.65rem] font-semibold leading-tight tracking-normal text-app-ink">{title}</h1>
          {description ? (
            <p className="max-w-2xl text-sm leading-6 tracking-normal text-app-ink-muted">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
