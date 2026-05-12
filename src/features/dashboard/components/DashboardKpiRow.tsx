import { CalendarDays, Flame, TrendingUp, Zap } from "lucide-react";

import { KpiBalanceSpark, KpiFocusSpark, KpiOutputSpark, KpiStreakSpark } from "@/app/components/illustrations";
import { MotionCountUp, MotionStaggerItem, MotionStaggerList } from "@/app/components/motion";

type DashboardKpiRowProps = {
  leadAverage: number;
  currentWeek: number | null;
  totalWeeks: number;
  streak: number;
  wheelScore: number;
};

export function DashboardKpiRow({ leadAverage, currentWeek, totalWeeks, streak, wheelScore }: DashboardKpiRowProps) {
  const items = [
    {
      icon: CalendarDays,
      spark: KpiFocusSpark,
      sparkClass: "text-violet-500",
      label: "Tuần",
      value: currentWeek ? (
        <>
          <MotionCountUp value={currentWeek} />/<MotionCountUp value={totalWeeks} />
        </>
      ) : (
        "--"
      ),
      note: "trong chu kỳ",
      iconClass:
        "bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-700 dark:from-violet-950/50 dark:to-fuchsia-950/40 dark:text-violet-200",
    },
    {
      icon: TrendingUp,
      spark: KpiOutputSpark,
      sparkClass: "text-emerald-500",
      label: "Tỷ lệ tạo kết quả",
      value: <MotionCountUp value={Math.max(0, Math.round(leadAverage))} suffix="%" />,
      note: "hoàn thành việc lặp lại",
      iconClass:
        "bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700 dark:from-emerald-950/50 dark:to-teal-950/40 dark:text-emerald-200",
    },
    {
      icon: Zap,
      spark: KpiBalanceSpark,
      sparkClass: "text-amber-500",
      label: "Nhịp việc lặp lại",
      value:
        Number.isFinite(wheelScore) && wheelScore > 0 ? (
          <MotionCountUp value={Number(wheelScore.toFixed(1))} precision={1} />
        ) : (
          "--"
        ),
      note: "điểm cuộc sống",
      iconClass:
        "bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700 dark:from-amber-950/50 dark:to-orange-950/40 dark:text-amber-200",
    },
    {
      icon: Flame,
      spark: KpiStreakSpark,
      sparkClass: "text-rose-500",
      label: "Chuỗi ngày",
      value: <MotionCountUp value={streak} />,
      note: "tuần giữ nhịp",
      iconClass:
        streak >= 7
          ? "bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-lg shadow-rose-500/20"
          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
    },
  ];

  return (
    <MotionStaggerList
      data-testid="dashboard-kpi-row"
      className="grid grid-cols-2 gap-2 sm:gap-[var(--space-stack)] lg:grid-cols-4"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const Spark = item.spark;

        return (
          <MotionStaggerItem
            key={item.label}
            className="glass-surface-sm relative min-h-[100px] overflow-hidden rounded-[var(--r-tile)] p-3 ring-1 ring-slate-200/70 sm:min-h-24 sm:p-4"
          >
            <Spark className={`pointer-events-none absolute right-12 top-3 h-6 w-6 opacity-60 ${item.sparkClass}`} />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground sm:text-xs sm:tracking-[0.16em]">
                  {item.label}
                </p>
                <p className="count-up mt-1 text-xl font-bold tabular-nums text-foreground sm:mt-2 sm:text-2xl">
                  {item.value}
                </p>
              </div>
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-control)] ${item.iconClass}`}
              >
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-1.5 text-[10px] text-muted-foreground sm:mt-2 sm:text-xs">{item.note}</p>
          </MotionStaggerItem>
        );
      })}
    </MotionStaggerList>
  );
}
