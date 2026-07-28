import { ArrowLeft, Target } from "lucide-react";
import type { ReactNode } from "react";

import { InlineGoalTitleEdit } from "@/app/components/twelve-week/InlineGoalTitleEdit";
import { Button } from "@/app/components/ui/button";
import type { Goal, PricingPlanCode, TwelveWeekSystem } from "@/app/utils/storage-types";
import { getPlanLabel } from "@/app/utils/twelve-week-premium";

export interface TwelveWeekCommandBarProps {
  activeGoal: Goal;
  system: TwelveWeekSystem;
  activePlanCode: PricingPlanCode;
  currentWeek: number;
  syncBadgeClassName: string;
  syncBadgeLabel: string;
  weekCompletion: { completed: number; total: number; percent: number };
  todayCompletedCount: number;
  todayRemainingCount: number;
  reviewDueToday: boolean;
  onPrimaryAction: () => void;
  onOpenGoals: () => void;
  onExit: () => void;
  onRenameGoal?: (title: string) => void | Promise<void>;
  goalSwitcher?: ReactNode;
  guideControl?: ReactNode;
}

function CommandMetric({
  label,
  value,
  accessibleLabel,
  accent = false,
}: {
  label: string;
  value: string;
  accessibleLabel: string;
  accent?: boolean;
}) {
  return (
    <section
      aria-label={accessibleLabel}
      className="min-w-0 rounded-control border border-app-line/70 bg-app-bg-subtle px-2.5 py-2 text-center sm:px-3"
    >
      <strong
        className={`block font-serif text-lg font-extrabold leading-none tabular-nums ${accent ? "text-app-accent" : "text-app-ink"}`}
      >
        {value}
      </strong>
      <span className="mt-1 block truncate text-[11px] font-semibold text-app-ink-muted sm:text-xs">{label}</span>
    </section>
  );
}

export function TwelveWeekCommandBar({
  activeGoal,
  system,
  activePlanCode,
  currentWeek,
  syncBadgeClassName,
  syncBadgeLabel,
  weekCompletion,
  todayCompletedCount,
  todayRemainingCount,
  reviewDueToday,
  onPrimaryAction,
  onOpenGoals,
  onExit,
  onRenameGoal,
  goalSwitcher,
  guideControl,
}: TwelveWeekCommandBarProps) {
  const boundedCurrentWeek = Math.min(Math.max(currentWeek, 1), Math.max(system.totalWeeks, 1));
  const cyclePercent = Math.round((boundedCurrentWeek / Math.max(system.totalWeeks, 1)) * 100);
  const todayTotal = todayCompletedCount + todayRemainingCount;

  return (
    <header
      data-testid="twelve-week-command-bar"
      id="twelve-week-header-card"
      className="rounded-[22px] border border-app-line/70 bg-app-surface px-4 py-4 shadow-app-sm sm:px-6 sm:py-5"
    >
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,auto)] lg:items-center">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-app-ink-soft">
            <span className="font-mono tabular-nums">
              Tuần {boundedCurrentWeek}/{system.totalWeeks}
            </span>
            <span aria-hidden="true" className="text-app-line-strong">
              ·
            </span>
            <span className="tabular-nums">{cyclePercent}% chu kỳ</span>
            <span aria-hidden="true" className="text-app-line-strong">
              ·
            </span>
            <span>Gói {getPlanLabel(activePlanCode)}</span>
          </div>

          <InlineGoalTitleEdit
            title={activeGoal.title}
            fallbackTitle="Kế hoạch hiện tại"
            onSave={onRenameGoal}
            headingLevel={1}
            titleClassName="max-w-[34ch] break-words text-balance font-serif text-2xl font-extrabold leading-tight tracking-[-0.025em] text-app-ink sm:text-3xl"
            inputClassName="h-auto min-h-11 rounded-control border-app-line-strong bg-app-surface px-3 py-2 font-serif text-base font-bold text-app-ink sm:text-2xl"
          />

          <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
            <span
              className={`inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-semibold ${syncBadgeClassName}`}
              role="status"
              aria-live="polite"
            >
              {syncBadgeLabel}
            </span>
            {goalSwitcher}
          </div>
        </div>

        <div className="grid min-w-0 gap-3">
          <div className="grid min-w-0 grid-cols-3 gap-2">
            <CommandMetric
              label="chu kỳ"
              value={`${boundedCurrentWeek}/${system.totalWeeks}`}
              accessibleLabel={`Tiến độ chu kỳ: tuần ${boundedCurrentWeek} trên ${system.totalWeeks}`}
            />
            <CommandMetric
              label="tuần này"
              value={`${weekCompletion.percent}%`}
              accessibleLabel={`Tiến độ tuần này: ${weekCompletion.percent}%`}
              accent
            />
            <CommandMetric
              label="việc hôm nay"
              value={`${todayCompletedCount}/${todayTotal}`}
              accessibleLabel={`Việc hôm nay: hoàn thành ${todayCompletedCount} trên ${todayTotal}`}
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" className="min-h-11 flex-1 sm:flex-none" onClick={onPrimaryAction}>
              <Target className="h-4 w-4" aria-hidden="true" />
              {reviewDueToday ? "Review tuần này" : "Xem việc hôm nay"}
            </Button>
            <Button type="button" variant="outline" className="min-h-11 flex-1 sm:flex-none" onClick={onOpenGoals}>
              Mở mục tiêu
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-app-line/80 pt-3">
        <Button type="button" variant="ghost" onClick={onExit} aria-label="Thoát cockpit" className="min-h-11 px-3">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Thoát
        </Button>
        {guideControl}
      </div>
    </header>
  );
}
