import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { cn } from "@/app/components/ui/utils";

type DashboardInsightTone = "sky" | "violet" | "emerald" | "amber" | "blue";

const TONE_CLASS: Record<
  DashboardInsightTone,
  {
    card: string;
    icon: string;
  }
> = {
  amber: {
    card: "border-amber-100/80 bg-gradient-to-br from-white via-white to-amber-50/72",
    icon: "bg-amber-50 text-amber-700 ring-amber-100",
  },
  blue: {
    card: "border-blue-100/80 bg-gradient-to-br from-white via-white to-blue-50/72",
    icon: "bg-blue-50 text-blue-700 ring-blue-100",
  },
  emerald: {
    card: "border-emerald-100/80 bg-gradient-to-br from-white via-white to-emerald-50/72",
    icon: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  },
  sky: {
    card: "border-sky-100/80 bg-gradient-to-br from-white via-white to-sky-50/72",
    icon: "bg-sky-50 text-sky-700 ring-sky-100",
  },
  violet: {
    card: "border-violet-100/80 bg-gradient-to-br from-white via-white to-violet-50/72",
    icon: "bg-violet-50 text-violet-700 ring-violet-100",
  },
};

interface DashboardInsightCardProps {
  icon: LucideIcon;
  eyebrow: ReactNode;
  title: ReactNode;
  tone: DashboardInsightTone;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function DashboardInsightCard({
  icon: Icon,
  eyebrow,
  title,
  tone,
  children,
  className,
  contentClassName,
}: DashboardInsightCardProps) {
  const toneClass = TONE_CLASS[tone];

  return (
    <Card className={cn("ops-surface h-full overflow-hidden shadow-sm ring-1 ring-white/70", toneClass.card, className)}>
      <CardHeader className="space-y-3 pb-2">
        <div className="flex min-w-0 items-center gap-3">
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--r-tile)] ring-1", toneClass.icon)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <CardDescription className="text-xs uppercase tracking-[0.14em] text-slate-500">{eyebrow}</CardDescription>
            <CardTitle className="mt-1 text-base font-semibold text-slate-950">{title}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn("pt-1", contentClassName)}>{children}</CardContent>
    </Card>
  );
}
