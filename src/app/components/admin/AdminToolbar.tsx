import type { ReactNode } from "react";

import { cn } from "../ui/utils";

interface AdminToolbarProps {
  label: string;
  children: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function AdminToolbar({ label, children, meta, actions, className }: AdminToolbarProps) {
  return (
    <section
      aria-label={label}
      className={cn(
        "flex flex-col gap-3 rounded-[var(--r-card)] border border-app-line bg-app-surface p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {children}
      </div>
      {meta || actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          {meta ? <div className="text-sm text-app-ink-muted">{meta}</div> : null}
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
    </section>
  );
}
