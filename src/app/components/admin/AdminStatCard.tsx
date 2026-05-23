import type { ComponentType, ReactNode } from "react";

import { cn } from "../ui/utils";
import { adminSurface } from "./tokens";

interface AdminStatCardProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  className?: string;
}

/**
 * Stat tile used on the dashboard. Dark variant of the previous SummaryCard.
 */
export function AdminStatCard({ icon: Icon, label, value, detail, className }: AdminStatCardProps) {
  return (
    <div className={cn(adminSurface.card, adminSurface.cardHover, "flex items-start gap-4 p-5", className)}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--r-tile)] bg-cyan-500/10 text-cyan-300">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-slate-400">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-white">{value}</p>
        {detail ? <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p> : null}
      </div>
    </div>
  );
}
