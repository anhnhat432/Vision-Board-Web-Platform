import { type ReactNode, useId } from "react";

import { cn } from "../ui/utils";
import { adminSurface } from "./tokens";

interface AdminDataPanelProps {
  title?: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  busy?: boolean;
  className?: string;
  contentClassName?: string;
}

export function AdminDataPanel({
  title,
  description,
  actions,
  children,
  footer,
  busy = false,
  className,
  contentClassName,
}: AdminDataPanelProps) {
  const headingId = useId();

  return (
    <section
      aria-labelledby={title ? headingId : undefined}
      aria-busy={busy || undefined}
      className={cn(adminSurface.card, "overflow-hidden", className)}
    >
      {title || description || actions ? (
        <header className="flex flex-col gap-3 border-b border-app-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0">
            {title ? (
              <h2 id={headingId} className="text-sm font-semibold text-app-ink">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-xs leading-5 text-app-ink-muted">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={cn("min-w-0", contentClassName)}>{children}</div>
      {footer ? (
        <footer className="border-t border-app-line px-4 py-3 sm:px-5">{footer}</footer>
      ) : null}
    </section>
  );
}
