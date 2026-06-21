import { Inbox } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

import { cn } from "../ui/utils";

interface AdminEmptyStateProps {
  title: string;
  description?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  action?: ReactNode;
  className?: string;
}

/**
 * Friendly empty placeholder for admin lists.
 *
 * Features: gradient icon container, refined typography, warm feel.
 */
export function AdminEmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
}: AdminEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 rounded-[var(--r-card)] border border-dashed border-app-line bg-app-bg-subtle/40 px-6 py-12 text-center",
        className,
      )}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-app-accent-soft to-app-bg-subtle text-app-accent shadow-sm">
        <Icon className="h-7 w-7" />
      </span>
      <div className="space-y-1.5">
        <p className="text-base font-semibold text-app-ink">{title}</p>
        {description ? (
          <p className="max-w-sm text-sm leading-6 text-app-ink-muted">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}