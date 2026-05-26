import { Flame, Sparkles, Trophy } from "lucide-react";
import type { ReactNode } from "react";

import { useReducedMotion } from "@/app/hooks/useReducedMotion";

export type MilestoneKind =
  | "today-complete"
  | "streak"
  | "goal"
  | "week"
  | "achievement";

interface MilestoneToastProps {
  kind: MilestoneKind;
  title: string;
  description?: string;
}

const TONE_BY_KIND: Record<MilestoneKind, { icon: typeof Sparkles; tag: string }> = {
  "today-complete": { icon: Sparkles, tag: "Hôm nay" },
  streak: { icon: Flame, tag: "Streak" },
  goal: { icon: Trophy, tag: "Mục tiêu" },
  week: { icon: Sparkles, tag: "Tuần" },
  achievement: { icon: Trophy, tag: "Thành tựu" },
};

/**
 * P2-10 Celebration Moments — milestone toast.
 *
 * Use as the body of a custom sonner toast:
 *
 * import { toast } from "sonner";
 * import { MilestoneToast } from "@/app/components/celebration";
 *
 * toast.custom(() => (
 *   <MilestoneToast
 *     kind="streak"
 *     title="Streak 7 ngày"
 *     description="1 tuần kiên trì."
 *   />
 * ), { duration: 4000 });
 *
 * Reduced motion: icon does not animate, only the toast slide is left
 * to sonner (which itself respects `prefers-reduced-motion`).
 */
export function MilestoneToast({ kind, title, description }: MilestoneToastProps): ReactNode {
  const reduce = useReducedMotion();
  const { icon: Icon, tag } = TONE_BY_KIND[kind];

  return (
    <div className="flex w-full items-start gap-3 rounded-xl border border-app-warm-border bg-app-warm-soft px-4 py-3 shadow-[0_8px_24px_-12px_rgba(217,119,87,0.45)]">
      <span
        aria-hidden="true"
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-app-surface text-app-warm ${
          reduce ? "" : "animate-in zoom-in-95 fade-in-0"
        }`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-warm-strong">{tag}</p>
        <p className="mt-0.5 font-serif text-base font-medium leading-snug text-app-warm-strong">{title}</p>
        {description ? <p className="mt-1 text-sm leading-6 text-app-warm-strong/85">{description}</p> : null}
      </div>
    </div>
  );
}
