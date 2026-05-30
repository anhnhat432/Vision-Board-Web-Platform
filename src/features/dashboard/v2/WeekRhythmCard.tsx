import { CalendarDays, Clock3, Flame, TrendingUp, Zap } from "lucide-react";

import { CountUp } from "@/app/components/ui/count-up";
import {
  formatDateInputValue,
  getTwelveWeekTasksForWeek,
  getTwelveWeekWeekRange,
  parseCalendarDate,
  type TwelveWeekSystem,
} from "@/app/utils/storage";

const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const;

interface WeekDayProgress {
  key: string;
  label: string;
  completed: number;
  total: number;
  percent: number;
  isToday: boolean;
  isFuture: boolean;
}

interface WeekRhythmCardProps {
  system: TwelveWeekSystem | null;
  currentWeek: number | null;
  totalWeeks: number;
  completedCount: number;
  totalCount: number;
  leadAverage: number;
  wheelScore: number;
  streak: number;
  today?: Date;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return clamp(Math.round(value), 0, 100);
}

const KPI_CARD_STYLES = {
  Tuần: {
    bg: "bg-app-surface border-app-line hover:border-blue-300 dark:hover:border-blue-900 border-b-2 border-b-blue-400 dark:border-b-blue-600",
    iconBg: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100/50 dark:border-blue-950/30",
  },
  "Tỷ lệ lead": {
    bg: "bg-app-surface border-app-line hover:border-emerald-300 dark:hover:border-emerald-900 border-b-2 border-b-emerald-400 dark:border-b-emerald-600",
    iconBg: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-950/30",
  },
  Nhịp: {
    bg: "bg-app-surface border-app-line hover:border-amber-300 dark:hover:border-amber-900 border-b-2 border-b-amber-400 dark:border-b-amber-600",
    iconBg: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100/50 dark:border-amber-950/30",
  },
  Chuỗi: {
    bg: "bg-app-surface border-app-line hover:border-rose-300 dark:hover:border-rose-900 border-b-2 border-b-rose-400 dark:border-b-rose-600",
    iconBg: "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100/50 dark:border-rose-950/30",
  },
};

function buildEmptyWeekDays(today: Date): WeekDayProgress[] {
  const mondayBasedIndex = (today.getDay() + 6) % 7;

  return WEEKDAY_LABELS.map((label, index) => ({
    key: `empty-day-${index}`,
    label,
    completed: 0,
    total: 0,
    percent: 0,
    isToday: index === mondayBasedIndex,
    isFuture: index > mondayBasedIndex,
  }));
}

function buildWeekDays(system: TwelveWeekSystem | null, currentWeek: number | null, today: Date): WeekDayProgress[] {
  if (!system || !currentWeek) return buildEmptyWeekDays(today);

  const weekRange = getTwelveWeekWeekRange(system, currentWeek);
  const startDate = parseCalendarDate(weekRange.start);
  if (!startDate) return buildEmptyWeekDays(today);

  const todayKey = formatDateInputValue(today);
  const weekTasks = getTwelveWeekTasksForWeek(system, currentWeek).filter((task) => !task.skipped);

  return WEEKDAY_LABELS.map((label, index) => {
    const date = addDays(startDate, index);
    const dateKey = formatDateInputValue(date);
    const dayTasks = weekTasks.filter((task) => task.scheduledDate === dateKey);
    const completed = dayTasks.filter((task) => task.completed).length;
    const total = dayTasks.length;

    return {
      key: dateKey,
      label,
      completed,
      total,
      percent: total === 0 ? 0 : Math.round((completed / total) * 100),
      isToday: dateKey === todayKey,
      isFuture: dateKey > todayKey,
    };
  });
}

function WeekProgressDay({ day }: { day: WeekDayProgress }) {
  const barContent = (() => {
    if (day.isFuture) {
      return <div className="h-16 w-5.5 rounded-full bg-app-line/10 border border-transparent" aria-hidden="true" />;
    }

    if (day.isToday) {
      const fillHeight = day.total === 0 ? 0 : clamp(day.percent, 12, 100);
      return (
        <div
          className="flex h-16 w-5.5 items-end rounded-full bg-app-accent-soft/40 border border-app-accent ring-2 ring-app-accent/15 shadow-[0_0_8px_rgba(47,93,80,0.25)]"
          aria-hidden="true"
        >
          <div className="w-full rounded-full bg-app-accent" style={{ height: `${fillHeight}%` }} />
        </div>
      );
    }

    const fillHeight = day.total === 0 ? 0 : clamp(day.percent, 12, 100);
    return (
      <div className="flex h-16 w-5.5 items-end rounded-full bg-app-line/15 border border-transparent" aria-hidden="true">
        <div
          className={`w-full rounded-full transition-all duration-300 ${
            day.percent === 100
              ? "bg-app-accent/80 group-hover:bg-app-accent"
              : "bg-app-accent/40 group-hover:bg-app-accent/65"
          }`}
          style={{ height: `${fillHeight}%` }}
        />
      </div>
    );
  })();

  return (
    <div className="group flex flex-col items-center gap-1.5 text-center transition-all duration-300 hover:scale-105">
      <span className={`text-[10px] font-bold ${day.isToday ? "text-app-accent font-black" : "text-app-ink-muted"}`}>
        {day.label}
      </span>
      {barContent}
      <span
        className={`text-[9px] tabular-nums font-bold ${day.isToday ? "text-app-accent font-extrabold" : "text-app-ink-soft"}`}
      >
        {day.completed}/{day.total}
      </span>
    </div>
  );
}

export function WeekRhythmCard({
  system,
  currentWeek,
  totalWeeks,
  completedCount,
  totalCount,
  leadAverage,
  wheelScore,
  streak,
  today = new Date(),
}: WeekRhythmCardProps) {
  const days = buildWeekDays(system, currentWeek, today);
  const safeWeek = currentWeek ?? "--";
  const wheelScoreReady = Number.isFinite(wheelScore) && wheelScore > 0;
  const stats: Array<{
    icon: typeof CalendarDays;
    caption: "Tuần" | "Tỷ lệ lead" | "Nhịp" | "Chuỗi";
    value?: string;
    numericValue?: number;
    suffix?: string;
    precision?: number;
    subLine: string;
  }> = [
    {
      icon: CalendarDays,
      caption: "Tuần",
      value: `${safeWeek}/${totalWeeks}`,
      subLine: "trong chu kỳ",
    },
    {
      icon: TrendingUp,
      caption: "Tỷ lệ lead",
      numericValue: clampPercent(leadAverage),
      suffix: "%",
      subLine: "hoàn thành tuần",
    },
    {
      icon: Zap,
      caption: "Nhịp",
      ...(wheelScoreReady ? { numericValue: wheelScore, precision: 1 } : { value: "--" }),
      subLine: "điểm cuộc sống",
    },
    {
      icon: Flame,
      caption: "Chuỗi",
      numericValue: streak,
      subLine: "tuần giữ nhịp",
    },
  ];

  return (
    <section
      data-testid="dashboard-kpi-row"
      className="rounded-[18px] border border-app-line bg-app-surface p-5 md:p-6 shadow-app-sm transition-all duration-300 hover:border-app-accent/20"
      aria-labelledby="dashboard-week-rhythm-title"
    >
      <div className="flex flex-col gap-1 border-b border-app-line pb-4 mb-5">
        <h2 id="dashboard-week-rhythm-title" className="text-base font-bold text-app-ink flex items-center gap-2">
          <Zap className="h-5 w-5 text-app-accent/80" />
          Nhịp tuần {safeWeek}
        </h2>
        <p className="text-xs font-semibold tracking-wide text-app-ink-muted">
          Đã hoàn thành <span className="text-app-accent font-extrabold">{completedCount}</span> trên tổng số{" "}
          <span className="text-app-ink font-extrabold">{totalCount}</span> việc tuần này
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;
          const styles = KPI_CARD_STYLES[item.caption];

          return (
            <div
              key={item.caption}
              className={`rounded-[16px] border ${styles.bg} p-4 shadow-app-sm hover:-translate-y-0.5 hover:shadow-app-md transition-all duration-300`}
            >
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-xl ${styles.iconBg}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-app-ink-muted">
                {item.caption}
              </p>
              <p className="mt-1 font-serif text-3xl font-extrabold leading-none text-app-ink">
                {item.numericValue !== undefined ? (
                  <CountUp value={item.numericValue} suffix={item.suffix ?? ""} precision={item.precision ?? 0} />
                ) : (
                  item.value
                )}
              </p>
              <p className="mt-2 text-[10px] font-semibold text-app-ink-muted">{item.subLine}</p>
            </div>
          );
        })}
      </div>

      {/* Things 3 style consistency dots */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-[16px] border border-app-line/80 bg-app-bg/60 dark:bg-neutral-900/30 px-5 py-3.5 shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.01)]">
        <span className="text-xs font-bold text-app-ink-soft">Nhịp check-in hàng ngày:</span>
        <div className="flex items-center gap-3">
          {days.map((day) => {
            const hasCheckIn = system?.dailyCheckIns?.some((c) => c.date === day.key && c.didWorkToday) ?? false;
            let dotClass = "";
            let tooltipText = "";

            if (day.isFuture) {
              dotClass = "bg-app-line/25 border-transparent";
              tooltipText = `${day.label}: Tương lai`;
            } else if (hasCheckIn) {
              dotClass = "bg-app-accent border-transparent shadow-[0_2px_6px_rgba(47,93,80,0.25)]";
              tooltipText = `${day.label}: Đã check-in`;
            } else {
              dotClass = "bg-transparent border border-app-line/80 dark:border-neutral-700";
              tooltipText = `${day.label}: Chưa check-in`;
            }

            return (
              <div
                key={day.key}
                className="flex flex-col items-center gap-1.5"
                title={tooltipText}
              >
                <div className="relative flex items-center justify-center h-4 w-4">
                  {day.isToday && (
                    <span className="absolute inline-flex h-full w-full rounded-full bg-app-accent/20 animate-ping" />
                  )}
                  <div
                    className={`h-2.5 w-2.5 rounded-full transition-all duration-350 ${dotClass} ${
                      day.isToday ? "ring-2 ring-app-accent/30" : ""
                    }`}
                  />
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-wider ${day.isToday ? "text-app-accent font-black" : "text-app-ink-muted/80"}`}>{day.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 border-t border-app-line pt-6">
        <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-wider text-app-ink-muted">
          <Clock3 className="h-4 w-4 text-app-accent/80" />
          Nhịp độ thực thi hàng ngày
        </div>
        <div className="grid grid-cols-7 gap-2 sm:gap-4 max-w-md mx-auto pt-2">
          {days.map((day) => (
            <WeekProgressDay key={day.key} day={day} />
          ))}
        </div>
      </div>
    </section>
  );
}
