import type { ComponentType, ReactNode } from "react";

import { cn } from "../ui/utils";
import { adminSurface, statAccentBars, statIconBg } from "./tokens";

export type StatAccentKey = "users" | "plus" | "revenue" | "orders";

interface AdminStatCardProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  className?: string;
  /** Which accent colour to use for the top bar and icon bg. */
  accent?: StatAccentKey;
}

/**
 * Stat tile used on the dashboard.
 *
 * Features: coloured top accent bar, icon with tinted background,
 * hover lift + shadow transition.
 */
export function AdminStatCard({
  icon: Icon,
  label,
  value,
  detail,
  className,
  accent,
}: AdminStatCardProps) {
  return (
    <div
      className={cn(
        adminSurface.card,
        adminSurface.cardHover,
        "relative overflow-hidden p-5",
        className,
      )}
    >
      {/* Top accent bar */}
      {accent ? (
        <span
          className={cn(
            "absolute inset-x-0 top-0 h-1 rounded-t-[var(--r-card)]",
            statAccentBars[accent],
          )}
        />
      ) : null}

      <div className="flex items-start gap-4">
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            accent
              ? statIconBg[accent]
              : "bg-app-accent-soft text-app-accent",
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-app-ink-muted">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-app-ink">
            {value}
          </p>
          {detail ? (
            <p className="mt-1 text-xs leading-5 text-app-ink-muted">
              {detail}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}