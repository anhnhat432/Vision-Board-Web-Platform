import { Inbox } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

import { cn } from "../ui/utils";
import { adminSurface } from "./tokens";

interface AdminEmptyStateProps {
  title: string;
  description?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  action?: ReactNode;
  className?: string;
}

/**
 * Friendly empty placeholder for admin lists.
 */
export function AdminEmptyState({ title, description, icon: Icon = Inbox, action, className }: AdminEmptyStateProps) {
  return (
    <div className={cn(adminSurface.card, "flex flex-col items-center gap-3 px-6 py-10 text-center", className)}>
      <span className="flex h-12 w-12 items-center justify-center rounded-[var(--r-tile)] bg-white/5 text-slate-300">
        <Icon className="h-6 w-6" />
      </span>
      <p className="text-base font-semibold text-white">{title}</p>
      {description ? <p className="max-w-sm text-sm leading-6 text-slate-400">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
