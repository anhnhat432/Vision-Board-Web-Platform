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
 * Keeps title / description / actions consistent across routes.
 */
export function AdminPageHeader({ title, description, actions, className }: AdminPageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-3 border-b border-app-line pb-5 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-app-ink">{title}</h1>
        {description ? <p className="max-w-2xl text-sm leading-6 text-app-ink-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
